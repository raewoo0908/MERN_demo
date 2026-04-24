import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}

export function Section({ title, subtitle, className = '', children }: Props) {
  return (
    <section
      className={`rounded-lg border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}
