import type { ReactNode } from "react";

import "./ui.css";

type SectionTitleProps = {
  children: ReactNode;
  className?: string;
};

export function SectionTitle({ children, className }: SectionTitleProps) {
  return <h2 className={className ? `uiSectionTitle ${className}` : "uiSectionTitle"}>{children}</h2>;
}
