import type { CSSProperties } from "react";
import { useTheme } from "../features/theme/useTheme";

type Props = {
  alt?: string;
  className?: string;
  decorative?: boolean;
  style?: CSSProperties;
};

export default function BrandLogo({
  alt = "Koelogs",
  className,
  decorative = false,
  style,
}: Props) {
  const { resolvedMode } = useTheme();
  const src = resolvedMode === "dark" ? "/koelog-logo-dark.png" : "/koelog-logo.png";

  return <img src={src} alt={decorative ? "" : alt} className={className} style={style} />;
}
