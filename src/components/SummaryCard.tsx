import React from 'react';

interface Props {
  label: string;
  value: string | number;
}

export function SummaryCard({ label, value }: Props) {
  return (
    <div className="summary-card">
      <div className="summary-card__value">{value}</div>
      <div className="summary-card__label">{label}</div>
    </div>
  );
}
