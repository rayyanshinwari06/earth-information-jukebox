"use client";

import { useEJStore } from "@/lib/ej/store";
import { BackendStatus } from "../backend-status";
import { Button } from "@/components/ui/button";
import { Compass, Music, Accessibility, ArrowRight, Earth } from "lucide-react";

export function HomeView() {
  const setView = useEJStore((s) => s.setView);

  return (
    <div className="mx-auto flex max-w-screen-lg flex-col gap-8 px-4 py-8 sm:py-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 sm:p-10 ej-glow">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(40rem 24rem at 80% -20%, oklch(0.78 0.15 78 / 0.16), transparent 60%), radial-gradient(30rem 20rem at -10% 120%, oklch(0.72 0.16 150 / 0.16), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="ej-brand-mark grid h-11 w-11 place-items-center rounded-xl ring-1 ring-primary/30">
              <img src="/logo.png" alt="" className="h-7 w-7 object-contain" aria-hidden />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Earth observation · Sonification · Accessibility
              </span>
              <span className="text-[11px] text-muted-foreground/70">
                NASA/HLS/HLSS30/v002 · 30 m seasonal composites
              </span>
            </div>
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Explore Earth through satellite observations{" "}
            <span className="text-primary">and listen to its changes.</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Earth Jukebox turns HLS Sentinel-2 imagery into environmental change
            indicators — NDVI, NDMI and NBR — across two comparison years, and
            connects those observations to sound. Search any supported location,
            define a study area, retrieve seasonal composites from Google Earth
            Engine, and experience the results visually and audibly.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button size="lg" onClick={() => setView("eic")} variant="outline" className="gap-2">
              <Earth className="h-4 w-4" />
              EIC visualization studio
            </Button>
            <Button size="lg" onClick={() => setView("explore")} className="gap-2">
              <Compass className="h-4 w-4" />
              Start exploring
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView("sound")}
              className="gap-2"
            >
              <Music className="h-4 w-4" />
              Sound experience
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => setView("about")}
              className="gap-2"
            >
              How it works
            </Button>
          </div>
        </div>
      </section>

      <BackendStatus />

      {/* The journey */}
      <section aria-labelledby="ej-home-journey-title">
        <h2 id="ej-home-journey-title" className="mb-3 text-lg font-semibold">
          The journey
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              n: "1",
              title: "Choose an EIC visualization",
              body: "Start with a real NASA Earth Information Center visualization and identify the scientific variable and time period it represents.",
            },
            {
              n: "2",
              title: "Connect matching science data",
              body: "Identify the variable, geography and period behind the EIC frame. Use an associated numerical dataset where available; do not pair unrelated data.",
            },
            {
              n: "3",
              title: "Explore custom HLS data",
              body: "Optionally use the HLS Earth Explorer to select a location, study radius and comparison years for your own regional analysis.",
            },
            {
              n: "4",
              title: "Analyze change",
              body: "The backend computes NDVI, NDMI and NBR differences and returns a 30 m GeoTIFF. Visualize each band with a diverging colormap.",
            },
            {
              n: "5",
              title: "Experience it as sound",
              body: "Environmental indicators are connected to the existing sonification backend, with accessible explanations of what the sound represents.",
            },
          ].map((step) => (
            <li
              key={step.n}
              className="rounded-lg border border-border/60 bg-card/40 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 font-mono text-xs text-primary">
                  {step.n}
                </span>
                <span className="text-sm font-medium">{step.title}</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Accessibility note */}
      <section
        aria-labelledby="ej-home-a11y-title"
        className="rounded-lg border border-border/60 bg-card/40 p-5"
      >
        <div className="flex items-start gap-3">
          <Accessibility className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-col gap-1">
            <h2 id="ej-home-a11y-title" className="text-sm font-semibold">
              Built for accessibility
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Earth Jukebox targets WCAG 2.2 AA. Maps and rasters always ship
              with a textual alternative so blind and low-vision users can
              follow the analysis. Audio never autoplays — playback is always a
              deliberate user action.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
