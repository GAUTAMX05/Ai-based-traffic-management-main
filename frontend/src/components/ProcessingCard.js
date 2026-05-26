import React from 'react';

function clampPercent(value) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.min(100, Math.max(0, n));
}

export default function ProcessingCard({ percent = 0, title = 'Analyzing traffic...' }) {
  const p = clampPercent(percent);

  return (
    <div className="glass-card processing-card processing-card--inline" role="status" aria-live="polite">
      <div className="processing-title">{title}</div>
      <div className="processing-spinner processing-spinner--modern" aria-hidden="true" />

      <div className="processing-progress-row">
        <div className="processing-progress-track" aria-hidden="true">
          <div className="processing-progress-fill" style={{ width: `${p}%` }} />
        </div>
        <div className="processing-percent">{Math.round(p)}%</div>
      </div>

      <div className="processing-lights" aria-label="Traffic lights">
        🚦🚦🚦🚦
      </div>
    </div>
  );
}

