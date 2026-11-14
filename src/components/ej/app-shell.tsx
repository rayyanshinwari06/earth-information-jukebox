"use client";

import { useEffect } from "react";
import { useEJStore } from "@/lib/ej/store";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { Footer } from "./footer";
import { Sidebar } from "./sidebar";
import { HomeView } from "./views/home";
import { EICView } from "./views/eic";
import { ExploreView } from "./views/explore";
import { AnalysisView } from "./views/analysis";
import { SoundView } from "./views/sound";
import { AboutView } from "./views/about";

export function AppShell() {
  const view = useEJStore((s) => s.view);
  const collapsed = useEJStore((s) => s.sidebarCollapsed);
  const loadHlsStatus = useEJStore((s) => s.loadHlsStatus);
  const loadHlsConfig = useEJStore((s) => s.loadHlsConfig);
  const loadOpenApi = useEJStore((s) => s.loadOpenApi);
  const loadMusicConfig = useEJStore((s) => s.loadMusicConfig);
  const loadControls = useEJStore((s) => s.loadControls);
  const loadDatasets = useEJStore((s) => s.loadDatasets);
  const loadAiStatus = useEJStore((s) => s.loadAiStatus);
  const hydrateSidebar = useEJStore((s) => s.hydrateSidebar);

  // Boot: probe the real FastAPI backend. HLS status + config + OpenAPI for
  // the analysis flow; music config, sound controls, datasets and AI status
  // for the Sound experience — all discovered from the live backend, none
  // invented. Also hydrate the persisted sidebar collapse preference.
  useEffect(() => {
    void loadHlsStatus();
    void loadHlsConfig();
    void loadOpenApi();
    void loadMusicConfig();
    void loadControls();
    void loadDatasets();
    void loadAiStatus();
    hydrateSidebar();
  }, [
    loadHlsStatus,
    loadHlsConfig,
    loadOpenApi,
    loadMusicConfig,
    loadControls,
    loadDatasets,
    loadAiStatus,
    hydrateSidebar,
  ]);

  // Keep re-checking HLS status periodically so the header reflects the true
  // backend state, but never claim Earth Engine is connected just because the
  // frontend loaded.
  useEffect(() => {
    const id = window.setInterval(() => {
      void loadHlsStatus();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [loadHlsStatus]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            "hidden shrink-0 border-r border-border/50 transition-[width] duration-200 ease-out lg:block",
            collapsed ? "w-16" : "w-72"
          )}
        >
          <Sidebar />
        </aside>
        <main
          id="main-content"
          className="ej-scroll ej-main-content relative flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          {view === "home" && <HomeView />}
          {view === "eic" && <EICView />}
          {view === "explore" && <ExploreView />}
          {view === "analysis" && <AnalysisView />}
          {view === "sound" && <SoundView />}
          {view === "about" && <AboutView />}
        </main>
      </div>
      <Footer />
    </div>
  );
}
