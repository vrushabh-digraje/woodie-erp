import { brandColors } from "../../theme/tokens/brandColors";

type WoodieLogoTextProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "text-base tracking-wide",
  md: "text-xl tracking-wide",
  lg: "text-2xl tracking-wider",
} as const;

/** Stylized WOODIE wordmark: W + DIE in amber, OO in white */
export default function WoodieLogoText({ className = "", size = "md" }: WoodieLogoTextProps) {
  return (
    <span
      className={`inline-flex items-baseline font-bold ${sizeClass[size]} ${className}`}
      aria-label="Woodie"
    >
      <span style={{ color: brandColors.amber }}>W</span>
      <span className="text-white">OO</span>
      <span style={{ color: brandColors.amber }}>DIE</span>
    </span>
  );
}
