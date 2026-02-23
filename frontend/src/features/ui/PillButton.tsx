import type { ButtonHTMLAttributes } from "react";

import "./ui.css";

type PillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

export function PillButton({ className, ...props }: PillButtonProps) {
  return <button {...props} className={className ? `uiPillButton ${className}` : "uiPillButton"} />;
}
