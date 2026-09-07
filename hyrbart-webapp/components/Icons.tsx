import type { SVGProps } from 'react';

const common = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...common} {...props}><path d="M3.5 10.6 12 3.8l8.5 6.8v9.1a.9.9 0 0 1-.9.9H4.4a.9.9 0 0 1-.9-.9z"/><path d="M9.2 20.6v-6.5h5.6v6.5"/></svg>;
}

export function PersonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...common} {...props}>
      <circle cx="12" cy="7.5" r="3.2" />
      <path d="M5.5 20c.5-4 2.8-6.2 6.5-6.2s6 2.2 6.5 6.2" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...common} {...props}><circle cx="10.7" cy="10.7" r="6.2"/><path d="m15.4 15.4 4.5 4.5"/></svg>;
}

export function BookIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...common} {...props}><path d="M4.5 5.1c2.4-.8 4.7-.6 7.5.8v13c-2.8-1.4-5.1-1.6-7.5-.8z"/><path d="M19.5 5.1c-2.4-.8-4.7-.6-7.5.8v13c2.8-1.4 5.1-1.6 7.5-.8z"/></svg>;
}

export function ArrowIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...common} {...props}><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>;
}

export function BackIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...common} {...props}><path d="m15 18-6-6 6-6"/></svg>;
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...common} {...props}><path d="m5 12 4.2 4.2L19 6.8"/></svg>;
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...common} {...props}><circle cx="12" cy="12" r="9"/><path d="M12 10.8v5"/><path d="M12 7.4h.01"/></svg>;
}

export function ListIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...common} {...props}><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>;
}
