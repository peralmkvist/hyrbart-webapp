import type { SVGProps } from 'react';

const common = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

type IconProps = SVGProps<SVGSVGElement>;

export function HomeIcon(props: IconProps) { return <svg {...common} {...props}><path d="M3.5 10.6 12 3.8l8.5 6.8v9.1a.9.9 0 0 1-.9.9H4.4a.9.9 0 0 1-.9-.9z"/><path d="M9.2 20.6v-6.5h5.6v6.5"/></svg>; }
export function PersonIcon(props: IconProps) { return <svg {...common} {...props}><circle cx="12" cy="7.3" r="3.2"/><path d="M5.7 20c.55-4 2.85-6.2 6.3-6.2s5.75 2.2 6.3 6.2"/></svg>; }
export function SearchIcon(props: IconProps) { return <svg {...common} {...props}><circle cx="10.7" cy="10.7" r="6.2"/><path d="m15.4 15.4 4.5 4.5"/></svg>; }
export function HeartIcon(props: IconProps) { return <svg {...common} {...props}><path d="M20.5 8.8c0 5-8.5 10-8.5 10s-8.5-5-8.5-10a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2Z"/></svg>; }
export function MessageIcon(props: IconProps) { return <svg {...common} {...props}><path d="M4 5.5h16v11H9l-4.5 3v-3H4z"/></svg>; }
export function MailIcon(props: IconProps) { return <svg {...common} {...props}><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>; }
export function BanknoteIcon(props: IconProps) { return <svg {...common} {...props}><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5h.01M18 14.5h.01"/></svg>; }
export function CalendarIcon(props: IconProps) { return <svg {...common} {...props}><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/></svg>; }
export function ListingsIcon(props: IconProps) { return <svg {...common} {...props}><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/></svg>; }
export function BookIcon(props: IconProps) { return <svg {...common} {...props}><path d="M4.5 5.1c2.4-.8 4.7-.6 7.5.8v13c-2.8-1.4-5.1-1.6-7.5-.8z"/><path d="M19.5 5.1c-2.4-.8-4.7-.6-7.5.8v13c2.8-1.4 5.1-1.6 7.5-.8z"/></svg>; }
export function MenuIcon(props: IconProps) { return <svg {...common} {...props}><path d="M5 7h14M5 12h14M5 17h14"/></svg>; }
export function BackIcon(props: IconProps) { return <svg {...common} {...props}><path d="m14.5 18-6-6 6-6"/></svg>; }
export function ForwardIcon(props: IconProps) { return <svg {...common} {...props}><path d="m9.5 6 6 6-6 6"/></svg>; }
export function ArrowIcon(props: IconProps) { return <svg {...common} {...props}><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>; }
export function CheckIcon(props: IconProps) { return <svg {...common} {...props}><path d="m5 12 4.2 4.2L19 6.8"/></svg>; }
export function InfoIcon(props: IconProps) { return <svg {...common} {...props}><circle cx="12" cy="12" r="9"/><path d="M12 10.8v5"/><path d="M12 7.4h.01"/></svg>; }
export function ListIcon(props: IconProps) { return <svg {...common} {...props}><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>; }

export function LightingIcon(props: IconProps) { return <svg {...common} {...props}><path d="M8.4 14.6a6 6 0 1 1 7.2 0c-1.2.9-1.6 1.8-1.6 3.1h-4c0-1.3-.4-2.2-1.6-3.1Z"/><path d="M9.8 20h4.4M10.5 17.7h3"/></svg>; }
export function CarIcon(props: IconProps) { return <svg {...common} {...props}><path d="m5.2 10 1.5-4h10.6l1.5 4"/><path d="M3.8 10.2h16.4v6.3H3.8z"/><circle cx="7" cy="16.5" r="1.5"/><circle cx="17" cy="16.5" r="1.5"/><path d="M6.5 12.8h.01M17.5 12.8h.01"/></svg>; }
export function DrillIcon(props: IconProps) { return <svg {...common} {...props}><path d="M4 7.5h10.8l3 2.7v3.1H11l-1.7-2H4z"/><path d="M9 13.3v6h4l1-6M18 11.8h2M20 10.3v3"/></svg>; }
export function CameraIcon(props: IconProps) { return <svg {...common} {...props}><path d="M4 7.5h3l1.2-2h7.6l1.2 2h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg>; }
export function HouseholdIcon(props: IconProps) { return <svg {...common} {...props}><path d="M4 10.3 12 4l8 6.3v9.2H4z"/><path d="M9 19.5v-6h6v6"/></svg>; }
export function HoleMakingIcon(props: IconProps) { return <svg {...common} {...props}><circle cx="12" cy="12" r="7.2"/><circle cx="12" cy="12" r="2.1"/><path d="M12 2.5v2M21.5 12h-2M12 21.5v-2M2.5 12h2"/></svg>; }
export function OfficeIcon(props: IconProps) { return <svg {...common} {...props}><path d="M5 5h14v10H5z"/><path d="M9 19h6M12 15v4"/></svg>; }
export function MeasureIcon(props: IconProps) { return <svg {...common} {...props}><path d="m5 16 11-11 3 3-11 11z"/><path d="m9 14 1.5 1.5M12 11l1.5 1.5M15 8l1.5 1.5"/></svg>; }
export function CleaningIcon(props: IconProps) { return <svg {...common} {...props}><path d="M7 5h5l1.2 3H9.5L8 19H4.5L6 8h1z"/><path d="M13.2 8h4.3l2 3v8h-8l-2-3M16 5.5v2.5"/></svg>; }
export function SawSandIcon(props: IconProps) { return <svg {...common} {...props}><circle cx="12" cy="12" r="6"/><path d="m12 3 .8 3.2M18.4 5.6l-2.2 2.3M21 12l-3.2.8M18.4 18.4l-2.3-2.2M12 21l-.8-3.2M5.6 18.4l2.2-2.3M3 12l3.2-.8M5.6 5.6l2.3 2.2"/></svg>; }
export function GardenIcon(props: IconProps) { return <svg {...common} {...props}><path d="M12 20V9"/><path d="M12 12c-4.4 0-6.7-2-7-6 4.5-.2 6.8 1.8 7 6ZM12 15c4.4 0 6.7-2 7-6-4.5-.2-6.8 1.8-7 6Z"/></svg>; }

export const categoryIconMap = { 'Belysning': LightingIcon, 'Biltillbehör': CarIcon, 'Borra & Skruva': DrillIcon, 'Foto & Teknik': CameraIcon, 'Hem & hushåll': HouseholdIcon, 'Håltagning': HoleMakingIcon, 'Kontor': OfficeIcon, 'Mäta': MeasureIcon, 'Städa & Tvätta': CleaningIcon, 'Såga & Slipa': SawSandIcon, 'Trädgård': GardenIcon } as const;
export type HyrbartCategory = keyof typeof categoryIconMap;
export function CategoryIcon({ category, ...props }: IconProps & { category: string }) { const Icon = categoryIconMap[category as HyrbartCategory] ?? ListIcon; return <Icon {...props} />; }
