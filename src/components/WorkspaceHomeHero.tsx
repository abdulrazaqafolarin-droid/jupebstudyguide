import type { ReactNode } from "react";

/** Shared animated hero frame for JUPEB and JAMB home dashboards. */
export function WorkspaceHomeHero({ children }: { children: ReactNode }) {
  return (
    <header className="relative overflow-hidden min-h-[60vh] flex items-center">
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/10 animate-mesh bg-[length:200%_200%]"
        style={{ willChange: "transform" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20" />
      <div className="absolute inset-0 chalk-texture opacity-30" style={{ willChange: "transform" }} />
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-float" style={{ willChange: "transform" }} />
      <div
        className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl animate-float"
        style={{ willChange: "transform", animationDelay: "-3s" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="relative w-full max-w-4xl mx-auto px-4 py-16 md:py-24">
        {children}
      </div>
    </header>
  );
}

export default WorkspaceHomeHero;
