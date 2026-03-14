export default function StatusBanner({ feedback }) {
  if (!feedback?.message) {
    return null;
  }

  return (
    <div className={`feedback-banner feedback-banner-${feedback.tone || 'info'}`} role="status" aria-live="polite">
      <strong>{feedback.title || 'Status'}</strong>
      <span>{feedback.message}</span>
    </div>
  );
}
