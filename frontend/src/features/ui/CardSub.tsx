import type { ReactNode } from "react";

import "./ui.css";

type CardSubProps = {
  children: ReactNode;
  className?: string;
};

export function CardSub({ children, className }: CardSubProps) {
  return <div className={className ? `uiCardSub ${className}` : "uiCardSub"}>{children}</div>;
}
