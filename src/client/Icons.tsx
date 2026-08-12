import type { SVGProps } from "react";

type IconProps = Omit<
  SVGProps<SVGSVGElement>,
  | "viewBox"
  | "fill"
  | "stroke"
  | "strokeWidth"
  | "color"
  | "focusable"
  | "aria-hidden"
>;

const Icon = ({ children, className, ...rest }: IconProps) => (
  <svg
    {...rest}
    aria-hidden
    focusable="false"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`h-[1em] w-[1em] shrink-0 ${className ?? ""}`.trimEnd()}
  >
    {children}
  </svg>
);

export const ShareIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2" />
    <path d="M12 15V3" />
    <path d="M8.5 6.5 12 3l3.5 3.5" />
  </Icon>
);

const cogTeeth = [0, 60, 120, 180, 240, 300].map((degrees) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x1: 12 + 6.5 * Math.cos(radians),
    y1: 12 + 6.5 * Math.sin(radians),
    x2: 12 + 9.5 * Math.cos(radians),
    y2: 12 + 9.5 * Math.sin(radians),
  };
});

export const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2.5" />
    {cogTeeth.map(({ x1, y1, x2, y2 }) => (
      <line key={`${x1},${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
    ))}
  </Icon>
);

export const SourceIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
  </Icon>
);

export const MethodIcon = (props: IconProps) => (
  <Icon {...props}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="13" y2="17" />
  </Icon>
);
