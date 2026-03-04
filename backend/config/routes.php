<?php
return [
    'public' => ['health', 'csrf', 'session', 'login'],
    'auth_required' => [
        'list',
        'list_merged',
        'add',
        'bill_update',
        'upload_bill',
        'property_record_list',
        'property_record_create',
        'property_record_update',
        'property_record_delete',
        'account_lookup_search',
        'account_lookup_import',
    ],
];
