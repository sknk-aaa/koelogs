import type { ReactNode } from "react";

import "./ui.css";

type CardTitleProps = {
  children: ReactNode;
  className?: string;
};

export function CardTitle({ children, className }: CardTitleProps) {
  return <div className={className ? `uiCardTitle ${className}` : "uiCardTitle"}>{children}</div>;
}
