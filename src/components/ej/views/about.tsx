"use client";

import { useEJStore } from "@/lib/ej/store";
import { INDICES, INDEX_ORDER } from "@/lib/ej/indices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Satellite, Leaf, Droplets, Flame, Music, Accessibility, TriangleAlert, Cpu } from "lucide-react";

export function AboutView() {
  const aiStatus = useEJStore((s) => s.aiStatus);
  return (
    <div className="mx-auto flex max-w-screen-lg flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            About Earth Jukebox
          </h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Earth Jukebox is an Earth observation and accessibility platform. It
          turns HLS Sentinel-2 imagery into environmental change indicators and
          connects those observations to sound — preserving the existing
          scientific pipeline rather than rebuilding it.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Accessibility className="h-4 w-4 text-primary" aria-hidden />
            NASA Earth Information Center pairing
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
          <p>The Earth Information Jukebox challenge asks teams to pair Earth Information Center visual frames with dynamic sonification. NASA Space Apps Navigator guidance dated November 12, 2026 confirms that teams may sonify visual-frame features or associated underlying numerical datasets, provided the sound remains meaningfully connected to the EIC visualization and the science it represents.</p>
          <p>Use the EIC Visualization Studio to attach the exact NASA visualization asset and its source. The current HLS NDVI sonifier is a separate custom-data path; it must only be described as the matching EIC sonification when its variable, geographic scope and time period have been verified against the selected EIC visualization.</p>
          <a className="text-primary underline underline-offset-4" href="https://github.com/nasa/spaceapps/discussions/1844" target="_blank" rel="noreferrer">Read the NASA Space Apps clarification</a>
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Satellite className="h-4 w-4 text-primary" aria-hidden />
            Earth observation methodology
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
          <ol className="flex flex-col gap-1.5 pl-0">
            {[
              "Receive the selected latitude and longitude from the location search.",
              "Generate a circular study area of the requested radius (max 10 km).",
              "Discover the relevant Sentinel-2 MGRS tiles using COPERNICUS/S2_HARMONIZED.",
              "Find the matching HLS scenes using MGRS_TILE_ID in NASA/HLS/HLSS30/v002.",
              "Restrict image selection to the requested area and comparison years.",
              "Download bands B4 (Red), B8A (NIR), B11 (SWIR1), B12 (SWIR2) and the Fmask.",
              "Apply Fmask cloud filtering (bits 1–4 excluded).",
              "Build seasonal median composites for both years (June 1 – October 1).",
              "Calculate NDVI, NDMI and NBR for each year, then the difference.",
              "Write a 3-band Float32 GeoTIFF at 30 m resolution.",
            ].map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-primary">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2">
            Tile IDs and CRS are <strong>not</strong> hardcoded. The Kaghan
            Valley test resolves to tile <code className="font-mono">43SCU</code>{" "}
            with CRS <code className="font-mono">EPSG:32643</code>; other
            locations produce different valid projections.
          </p>
        </CardContent>
      </Card>

      {/* AI model status — honest about what is and isn't connected */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cpu className="h-4 w-4 text-primary" aria-hidden />
            AI / ML model status
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
          {aiStatus ? (
            <>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex justify-between gap-2 border-b border-border/40 py-1">
                  <dt>Random Forest model</dt>
                  <dd className={aiStatus.random_forest_model_present ? "text-emerald-400" : "text-amber-400"}>
                    {aiStatus.random_forest_model_present ? "present" : "not present"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-b border-border/40 py-1">
                  <dt>Prediction API</dt>
                  <dd className="text-amber-400">{aiStatus.prediction_api}</dd>
                </div>
              </dl>
              {aiStatus.model_files.length > 0 && (
                <p>
                  <span className="text-foreground/80">Model files:</span>{" "}
                  <code className="font-mono">{aiStatus.model_files.join(", ")}</code>
                </p>
              )}
              <p>{aiStatus.note}</p>
            </>
          ) : (
            <p>AI status not yet loaded from the backend.</p>
          )}
        </CardContent>
      </Card>

      {/* Indices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Environmental indicators</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {INDEX_ORDER.map((key) => {
            const info = INDICES[key];
            const Icon =
              key === "NDVI" ? Leaf : key === "NDMI" ? Droplets : Flame;
            const CmpIcon = Icon;
            return (
              <div
                key={key}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
              >
                <div className="flex items-center gap-2">
                  <CmpIcon className="h-4 w-4 text-primary" aria-hidden />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{info.shortName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {info.fullName}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  <span className="text-foreground/80">Formula:</span>{" "}
                  <code className="font-mono">{info.formula}</code>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {info.whatItMeasures}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Sonification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Music className="h-4 w-4 text-primary" aria-hidden />
            Sonification approach
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Environmental indicators are connected to the existing sonification
            backend rather than re-implemented in the browser. The frontend
            discovers the available audio endpoints from the live OpenAPI
            specification and offers the connected HLS analysis context to them.
          </p>
          <p>
            The intended mapping — defined by the backend sonification
            functions, not by the frontend — is that vegetation, moisture and
            burn-related change each contribute to a distinct sonic dimension.
            Playback is always a deliberate user action; audio never autoplays.
          </p>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Accessibility className="h-4 w-4 text-primary" aria-hidden />
            Accessibility goals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
          <ul className="flex flex-col gap-1.5">
            {[
              "Semantic HTML, ARIA labels and keyboard navigation throughout.",
              "Maps and rasters always ship with a textual alternative.",
              "Results summaries are screen-reader friendly and announce processing state.",
              "Audio controls are labelled and never autoplay without consent.",
              "Visual indicators are never color-only — numerical values and qualitative labels accompany every chart.",
              "Target: WCAG 2.2 AA contrast and focus states.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Limitations */}
      <Card className="border-amber-500/40 bg-amber-500/8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-amber-300">
            <TriangleAlert className="h-4 w-4" aria-hidden />
            Current limitations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
          <ul className="flex flex-col gap-1.5">
            {[
              "Index changes are spectral indicators, not direct land-cover classifications. NDVI decrease is not necessarily deforestation; NBR change is not necessarily fire.",
              "Cloud masking reduces but does not eliminate atmospheric contamination.",
              "30 m resolution limits detection of sub-pixel features.",
              "The HLS backend uses synchronous processing with a serialized lock — large requests take time.",
              "The direct connection between HLS change data and the sonification engine is coordinated with the backend developer; the frontend surfaces the contract but does not invent it.",
              "Roads, industrial features and comprehensive land-cover classification are not currently exposed — keep the interface focused on environmental indicators.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-amber-400" aria-hidden>
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
