import * as React from "react";
import { Topbar } from "@/components/shell/Topbar";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Topbar title={title} subtitle={subtitle} />
      <div className="animate-fade-in space-y-5 p-5">{children}</div>
    </>
  );
}
