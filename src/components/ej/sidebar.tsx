"use client";

import { useEJStore } from "@/lib/ej/store";
import type { EJView } from "@/lib/ej/types";
import {
  Home,
  Earth,
  Compass,
  LineChart,
  Music,
  Info,
  MapPin,
  Loader2,
  CheckCircle2,
  CircleSlash,
  Waves,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Connection, ProcessingStage } from "@/lib/ej/types";

interface NavItem {
  id: EJView;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { id: "home", label: "Home", description: "Introduction & starting point", icon: Home },
      { id: "eic", label: "EIC Visualizations", description: "Pair NASA visuals with sound", icon: Earth },
      { id: "explore", label: "Explore Earth", description: "Location, study area, years", icon: Compass },
      { id: "analysis", label: "Environmental Analysis", description: "HLS results & band rasters", icon: LineChart },
    ],
  },
  {
    title: "Studio",
    items: [
      { id: "sound", label: "Sound Experience", description: "Sonification & audio layers", icon: Music },
    ],
  },
  {
    title: "Reference",
    items: [
      { id: "about", label: "About", description: "Methodology & limitations", icon: Info },
    ],
  },
];

const CONNECTION_DOT: Record<Connection, { color: string; label: string }> = {
  checking: { color: "bg-muted-foreground", label: "Checking" },
  connected: { color: "bg-emerald-400", label: "Online" },
  unavailable: { color: "bg-amber-400", label: "HLS off" },
  error: { color: "bg-red-400", label: "Offline" },
};

function StageIcon({ stage }: { stage: ProcessingStage }) {
  if (stage === "idle") return <CircleSlash className="h-3 w-3 text-muted-foreground/60" aria-hidden />;
  if (stage === "done") return <CheckCircle2 className="h-3 w-3 text-emerald-400" aria-hidden />;
  if (stage === "error") return <CircleSlash className="h-3 w-3 text-red-400" aria-hidden />;
  return <Loader2 className="h-3 w-3 animate-spin text-primary" aria-hidden />;
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const view = useEJStore((s) => s.view);
  const setView = useEJStore((s) => s.setView);
  const location = useEJStore((s) => s.location);
  const connection = useEJStore((s) => s.hlsConnection);
  const stage = useEJStore((s) => s.processingStage);
  const hasResult = useEJStore((s) => !!s.changeResult);
  const audioKind = useEJStore((s) => s.audioKind);
  const collapsed = useEJStore((s) => s.sidebarCollapsed);
  const toggle = useEJStore((s) => s.toggleSidebar);

  const conn = CONNECTION_DOT[connection];

  const go = (id: EJView) => {
    setView(id);
    onNavigate?.();
  };

  // ---------- Collapsed (icon rail) ----------
  if (collapsed) {
    return (
      <div className="flex h-full flex-col bg-sidebar/60">
        <div className="flex flex-col items-center gap-2 border-b border-border/40 py-3">
          <button
            type="button"
            onClick={toggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          </button>
          <div className="ej-brand-mark grid h-9 w-9 place-items-center rounded-lg ring-1 ring-primary/30">
            <img src="/logo.png" alt="Earth Jukebox" className="h-5 w-5 object-contain" />
          </div>
        </div>

        <nav aria-label="Primary" className="ej-scroll flex flex-1 flex-col items-center gap-1 overflow-y-auto px-2 py-3">
          {NAV_SECTIONS.map((section) =>
            section.items.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  title={item.label}
                  className={cn(
                    "ej-nav-item grid h-9 w-9 place-items-center rounded-lg transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </button>
              );
            })
          )}
        </nav>

        <div className="border-t border-border/40 p-2">
          <span
            className={cn(
              "mx-auto block h-1.5 w-1.5 rounded-full",
              conn.color,
              connection === "connected" && "ej-status-dot"
            )}
            style={{ color: connection === "connected" ? "oklch(0.74 0.17 150)" : undefined }}
            title={conn.label}
            aria-label={`Backend: ${conn.label}`}
            role="status"
          />
        </div>
      </div>
    );
  }

  // ---------- Expanded ----------
  return (
    <div className="flex h-full flex-col bg-sidebar/60">
      {/* Brand header + collapse toggle */}
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-4">
        <div className="ej-brand-mark grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-primary/30 ej-glow">
          <img src="/logo.png" alt="" className="h-6 w-6 object-contain" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold tracking-tight">
              Earth Jukebox
            </span>
            <span className="rounded bg-primary/15 px-1 py-px font-mono text-[9px] uppercase tracking-wider text-primary">
              v1.0
            </span>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            Environmental Sonification
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PanelLeftClose className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Primary" className="ej-scroll flex-1 overflow-y-auto px-3 py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <div className="mb-1 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              {section.title}
            </div>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "ej-nav-item group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                        aria-hidden
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[13px] font-medium leading-tight">
                          {item.label}
                        </span>
                        <span className="truncate text-[10px] leading-tight text-muted-foreground/70">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Workflow status card */}
      <div className="border-t border-border/40 p-3">
        <div className="rounded-lg border border-border/50 bg-background/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Workflow
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", conn.color, connection === "connected" && "ej-status-dot")}
                style={{ color: connection === "connected" ? "oklch(0.74 0.17 150)" : undefined }}
                aria-hidden
              />
              {conn.label}
            </span>
          </div>

          <dl className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden />
                Location
              </dt>
              <dd className="truncate text-right text-foreground/80" title={location?.name ?? "None"}>
                {location ? location.name.split(",")[0] : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <LineChart className="h-3 w-3" aria-hidden />
                Analysis
              </dt>
              <dd className="flex items-center gap-1 text-foreground/80">
                <StageIcon stage={stage} />
                {hasResult ? "Ready" : stage === "idle" ? "Idle" : stage === "error" ? "Failed" : "Running"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Waves className="h-3 w-3" aria-hidden />
                Audio
              </dt>
              <dd className="text-foreground/80">
                {audioKind ? (audioKind === "ndvi" ? "NDVI" : "Music") : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-2 px-1 text-[10px] leading-relaxed text-muted-foreground/60">
          NASA/HLS/HLSS30/v002 · 30 m seasonal composites
        </div>
      </div>
    </div>
  );
}
