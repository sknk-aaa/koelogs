import type { ReactNode } from "react";

import "./ui.css";

type CardHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={className ? `uiCardHeader ${className}` : "uiCardHeader"}>{children}</div>;
}
