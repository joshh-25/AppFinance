<?php
/*
 * Finance App File: backend\\tests\\ApiSmokeTest.php
 * Purpose: Backend/setup source file for the Finance app.
 */
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class ApiSmokeTest extends TestCase
{
    private static $serverProcess = null;
    private static array $serverPipes = [];
    private static int $port = 0;
    private static string $baseUrl = '';

    public static function setUpBeforeClass(): void
    {
        parent::setUpBeforeClass();

        self::$port = self::findAvailablePort();
        self::$baseUrl = 'http://127.0.0.1:' . self::$port;

        $projectRoot = realpath(__DIR__ . '/../../..');
        if ($projectRoot === false) {
            self::markTestSkipped('Unable to resolve project root for API smoke tests.');
        }

        $command = escapeshellarg(PHP_BINARY)
            . ' -S 127.0.0.1:' . self::$port
            . ' -t ' . escapeshellarg($projectRoot);

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ];

        self::$serverProcess = proc_open($command, $descriptors, $pipes, $projectRoot);
        if (!is_resource(self::$serverProcess)) {
            self::markTestSkipped('Failed to start local PHP server for API smoke tests.');
        }

        self::$serverPipes = $pipes;
        stream_set_blocking(self::$serverPipes[1], false);
        stream_set_blocking(self::$serverPipes[2], false);

        $ready = false;
        for ($i = 0; $i < 40; $i++) {
            usleep(100000);
            [$status] = self::request('GET', '/api.php?action=csrf');
            if ($status > 0) {
                $ready = true;
                break;
            }
        }

        if (!$ready) {
            $stderr = is_resource(self::$serverPipes[2]) ? stream_get_contents(self::$serverPipes[2]) : '';
            self::stopServer();
            self::markTestSkipped('Local PHP server did not become ready. ' . trim((string)$stderr));
        }
    }

    public static function tearDownAfterClass(): void
    {
        self::stopServer();
        parent::tearDownAfterClass();
    }

    public function testSessionEndpointReturnsUnauthenticatedPayloadAndCsrfToken(): void
    {
        [$status, $headers, $body] = self::request('GET', '/api.php?action=session');
        $payload = json_decode($body, true);

        $this->assertSame(200, $status);
        $this->assertIsArray($payload);
        $this->assertTrue($payload['success'] ?? false);
        $this->assertFalse($payload['authenticated'] ?? true);
        $this->assertIsString($payload['csrf_token'] ?? null);
        $this->assertNotSame('', trim((string)$payload['csrf_token']));
        $headerBlob = implode("\n", $headers);
        $this->assertStringContainsString('Content-Security-Policy', $headerBlob);
        $this->assertStringContainsString('X-Frame-Options: SAMEORIGIN', $headerBlob);
    }

    public function testCsrfEndpointReturnsToken(): void
    {
        [$status, , $body] = self::request('GET', '/api.php?action=csrf');
        $payload = json_decode($body, true);

        $this->assertSame(200, $status);
        $this->assertIsArray($payload);
        $this->assertTrue($payload['success'] ?? false);
        $this->assertIsString($payload['csrf_token'] ?? null);
        $this->assertGreaterThanOrEqual(32, strlen((string)$payload['csrf_token']));
    }

    public function testLoginRejectsMissingCredentialsBeforeDatabaseLookup(): void
    {
        [$status, , $body] = self::request(
            'POST',
            '/api.php?action=login',
            json_encode(['username' => '', 'password' => '']),
            ['Content-Type: application/json']
        );
        $payload = json_decode($body, true);

        $this->assertSame(400, $status);
        $this->assertIsArray($payload);
        $this->assertFalse($payload['success'] ?? true);
        $this->assertSame('Please enter both username and password.', $payload['message'] ?? '');
    }

    /**
     * @dataProvider unauthorizedWriteActionProvider
     */
    public function testWriteActionsRequireAuthentication(string $action, array $requestBody): void
    {
        [$status, , $body] = self::request(
            'POST',
            '/api.php?action=' . urlencode($action),
            json_encode($requestBody),
            ['Content-Type: application/json']
        );
        $payload = json_decode($body, true);

        $this->assertSame(401, $status);
        $this->assertIsArray($payload);
        $this->assertFalse($payload['success'] ?? true);
        $this->assertSame('Unauthorized', $payload['message'] ?? '');
    }

    public static function unauthorizedWriteActionProvider(): array
    {
        return [
            'bill add' => [
                'add',
                [
                    'dd' => 'DD-001',
                    'property' => 'Unit A',
                    'bill_type' => 'water'
                ]
            ],
            'property create' => [
                'property_record_create',
                [
                    'dd' => 'DD-001',
                    'property' => 'Unit A',
                    'unit_owner' => 'Sample Owner'
                ]
            ],
            'review queue replace' => [
                'review_queue_replace',
                [
                    'rows' => [
                        [
                            'id' => 'row-1',
                            'status' => 'needs_review'
                        ]
                    ]
                ]
            ]
        ];
    }

    private static function request(
        string $method,
        string $path,
        ?string $body = null,
        array $headers = []
    ): array {
        $headerLines = array_merge(['Accept: application/json'], $headers);
        $context = stream_context_create([
            'http' => [
                'method' => $method,
                'header' => implode("\r\n", $headerLines),
                'content' => $body ?? '',
                'ignore_errors' => true,
                'timeout' => 5
            ]
        ]);

        $responseBody = @file_get_contents(self::$baseUrl . $path, false, $context);
        $responseHeaders = $http_response_header ?? [];
        $status = self::extractStatusCode($responseHeaders);

        return [$status, $responseHeaders, $responseBody === false ? '' : $responseBody];
    }

    private static function extractStatusCode(array $headers): int
    {
        if (!isset($headers[0])) {
            return 0;
        }

        if (preg_match('/\s(\d{3})\s/', (string)$headers[0], $matches) === 1) {
            return (int)$matches[1];
        }

        return 0;
    }

    private static function findAvailablePort(): int
    {
        for ($port = 8800; $port < 9000; $port++) {
            $socket = @stream_socket_server('tcp://127.0.0.1:' . $port, $errorNumber, $errorMessage);
            if ($socket !== false) {
                fclose($socket);
                return $port;
            }
        }

        throw new RuntimeException('No available local port for API smoke test server.');
    }

    private static function stopServer(): void
    {
        if (is_resource(self::$serverProcess)) {
            @proc_terminate(self::$serverProcess);
            @proc_close(self::$serverProcess);
        }

        foreach (self::$serverPipes as $pipe) {
            if (is_resource($pipe)) {
                @fclose($pipe);
            }
        }

        self::$serverPipes = [];
        self::$serverProcess = null;
    }
}
