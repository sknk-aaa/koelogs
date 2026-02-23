import type { ReactNode } from "react";

import "./ui.css";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={className ? `pageContainer ${className}` : "pageContainer"}>{children}</div>;
}
