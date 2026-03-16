import React, { useState } from 'react';

interface Props {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function CalendarPicker({ selectedDates, onChange }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const days = daysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();
  const selected = new Set(selectedDates);

  const toggle = (dateStr: string) => {
    const next = new Set(selected);
    if (next.has(dateStr)) next.delete(dateStr);
    else next.add(dateStr);
    onChange(Array.from(next).sort());
  };

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

  return (
    <div className="calendar">
      <div className="calendar__nav">
        <button onClick={prevMonth}>‹</button>
        <span>{monthName} {year}</span>
        <button onClick={nextMonth}>›</button>
      </div>
      <div className="calendar__grid">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="calendar__day-label">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isSelected = selected.has(dateStr);
          return (
            <button
              key={day}
              className={`calendar__day ${isSelected ? 'calendar__day--selected' : ''}`}
              onClick={() => toggle(dateStr)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
