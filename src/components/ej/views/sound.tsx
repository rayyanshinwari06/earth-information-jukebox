"use client";

import { useEJStore } from "@/lib/ej/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Music,
  Play,
  Pause,
  StopCircle,
  Volume2,
  Download,
  Loader2,
  AlertTriangle,
  Info,
  Radio,
  VolumeX,
  Layers,
  Waves,
  Disc3,
  Database,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DatasetEntry, LayerSetting } from "@/lib/ej/types";
import { cn } from "@/lib/utils";
import { downsampleToGrid } from "@/lib/ej/downsample";

// Human-readable labels + sonic description for each of the five backend
// music layers. The layer names match DEFAULT_MUSIC_CONFIG in functions.py.
const LAYER_META: Record<
  string,
  { label: string; sonic: string; color: string }
> = {
  vegetation: {
    label: "Vegetation",
    sonic:
      "Pitched tones whose frequency follows vegetation greenness change (NDVI-derived).",
    color: "oklch(0.74 0.17 150)",
  },
  water: {
    label: "Water",
    sonic: "Lower-pitched notes tied to the moisture/water spectral band.",
    color: "oklch(0.72 0.13 195)",
  },
  snow: {
    label: "Snow",
    sonic: "High shimmering tones for positive snow values; low tone for loss.",
    color: "oklch(0.9 0.04 220)",
  },
  burned_area: {
    label: "Burned area",
    sonic: "Low drones whose presence reflects burn-related spectral change.",
    color: "oklch(0.7 0.19 45)",
  },
  temperature: {
    label: "Temperature",
    sonic: "Harmonic tones modulated by temperature band values.",
    color: "oklch(0.81 0.15 78)",
  },
};

function layerOrder(layers: Record<string, LayerSetting>): string[] {
  // Stable display order matching the backend's DEFAULT_MUSIC_CONFIG.
  const preferred = ["vegetation", "water", "snow", "burned_area", "temperature"];
  const known = preferred.filter((k) => k in layers);
  const extra = Object.keys(layers).filter((k) => !preferred.includes(k));
  return [...known, ...extra];
}

export function SoundView() {
  const {
    musicConfig,
    controls,
    controlsError,
    controlsSaving,
    updateLayerControl,
    datasets,
    datasetsError,
    loadDatasets,
    loadControls,
    changeResult,
    raster,
    location,
    hlsConnection,
    audioUrl,
    audioMeta,
    audioError,
    audioLoading,
    audioKind,
    sonifyNdviFromHls,
    generateMusicFromDataset,
  } = useEJStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioOnlyMode, setAudioOnlyMode] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  // Derive the effective selected dataset: prefer the user's choice, fall back
  // to the first available dataset — computed during render, no effect needed.
  const selectedDataset: DatasetEntry | null =
    datasets.find((d) => d.id === selectedDatasetId) ??
    datasets[0] ??
    null;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    setCurrentTime(0);
  }, [volume, audioUrl]);

  const handlePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  };
  const handleStop = () => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setCurrentTime(0);
    setPlaying(false);
  };

  const hasHlsNdvi =
    !!raster &&
    !!changeResult &&
    raster.bands.some((b) => b.name.toUpperCase().startsWith("NDVI"));

  const layerKeys = controls ? layerOrder(controls) : [];
  const ndviBand = raster?.bands.find((b) => b.name.toUpperCase().startsWith("NDVI"));
  const ndviGrid = ndviBand ? downsampleToGrid(ndviBand, musicConfig?.grid_size ?? 16).grid : null;
  const gridSize = ndviGrid?.length ?? 16;
  // The backend emits each cell as a 0.12 s tone + 0.02 s gap, then a 0.25 s row pause.
  // This timing follows backend/app/functions.py:sonify_ndvi_change_grid.
  const rowDuration = gridSize * 0.14 + 0.25;
  const rowAtTime = Math.min(gridSize - 1, Math.floor(currentTime / rowDuration));
  const withinRow = Math.max(0, currentTime - rowAtTime * rowDuration);
  const colAtTime = Math.min(gridSize - 1, Math.floor(withinRow / 0.14));
  const activeCell = rowAtTime * gridSize + colAtTime;
  const activeValue = ndviGrid?.[rowAtTime]?.[colAtTime] ?? null;
  const activeMeaning = activeValue === null ? "NoData: no valid observation is available for this cell." : activeValue > 0.05 ? `Positive NDVI change (${activeValue.toFixed(3)}): vegetation greenness increased in this cell.` : activeValue < -0.05 ? `Negative NDVI change (${activeValue.toFixed(3)}): vegetation greenness decreased in this cell.` : `Near-stable NDVI change (${activeValue.toFixed(3)}): change is within the backend's -0.05 to +0.05 stability threshold.`;

  return (
    <div className="mx-auto flex max-w-screen-xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Sound Experience
          </h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Two sonification paths connect to the real backend. Path A sonifies
          the NDVI change band from your HLS analysis; Path B generates the
          original Earth Jukebox ambient music from a prepared four-layer
          dataset. Five sound layers with enable / intensity controls drive
          Path B.
        </p>
      </header>

      {/* What does the sound represent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-primary" aria-hidden />
            What the sound represents
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            <strong>Path A — NDVI sonification.</strong> The decoded NDVI_change
            band from the HLS raster is downsampled to a {musicConfig?.grid_size ?? 16}×{musicConfig?.grid_size ?? 16}{" "}
            grid and posted to <code className="font-mono text-foreground/80">/api/sonification/ndvi</code>.
            Each cell becomes a short tone: increases rise in pitch, decreases
            fall, stable cells play a neutral tone, NoData is silent.
          </p>
          <p>
            <strong>Path B — Earth Jukebox music.</strong> A prepared
            four-layer raster (vegetation, water, snow, burned area) plus an
            optional temperature band drive five independent layers of a chord
            progression at {musicConfig?.bpm ?? 72} BPM over {musicConfig?.beats ?? 64} beats.
            The enable / intensity controls below shape the next generation.
          </p>
        </CardContent>
      </Card>

      {/* Sound-layer controls (drive Path B) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-primary" aria-hidden />
            Sound-layer controls
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">
              {controls ? `${layerKeys.length} layers` : "—"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {controlsError ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="flex flex-col gap-1">
                <span>{controlsError}</span>
                <Button size="sm" variant="outline" onClick={() => loadControls()} className="self-start">
                  Reload controls
                </Button>
              </div>
            </div>
          ) : !controls ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading sound controls…
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {layerKeys.map((layer) => {
                const setting = controls[layer];
                const meta = LAYER_META[layer] ?? {
                  label: layer,
                  sonic: "Custom layer from the backend.",
                  color: "oklch(0.7 0.1 160)",
                };
                return (
                  <li
                    key={layer}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/40 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3 sm:w-56 sm:shrink-0">
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: meta.color }}
                      />
                      <div className="flex flex-1 flex-col">
                        <Label
                          htmlFor={`ej-layer-enabled-${layer}`}
                          className="text-sm font-medium"
                        >
                          {meta.label}
                        </Label>
                        <span className="text-[10px] leading-tight text-muted-foreground">
                          {meta.sonic}
                        </span>
                      </div>
                      <Switch
                        id={`ej-layer-enabled-${layer}`}
                        checked={setting.enabled}
                        onCheckedChange={(v) =>
                          updateLayerControl(layer, { enabled: v })
                        }
                        aria-label={`${meta.label} layer enabled`}
                      />
                    </div>
                    <div className="flex flex-1 items-center gap-3">
                      <Label
                        htmlFor={`ej-layer-intensity-${layer}`}
                        className="sr-only"
                      >
                        {meta.label} intensity
                      </Label>
                      <Slider
                        id={`ej-layer-intensity-${layer}`}
                        value={[Math.round(setting.intensity * 100)]}
                        onValueChange={(v) =>
                          updateLayerControl(layer, { intensity: v[0] / 100 })
                        }
                        min={0}
                        max={100}
                        step={1}
                        disabled={!setting.enabled}
                        aria-label={`${meta.label} intensity`}
                        className="flex-1"
                      />
                      <span className="w-10 text-right font-mono text-[11px] text-muted-foreground">
                        {Math.round(setting.intensity * 100)}% audio intensity
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {controlsSaving && (
            <p className="text-[11px] text-muted-foreground" aria-live="polite">
              Saving controls…
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            The percentages below are audio-mix intensity controls, not environmental coverage or measured percentages. Controls are persisted on the backend via{" "}
            <code className="font-mono text-foreground/80">PUT /api/controls</code>{" "}
            and shape the next music generation. They do not affect NDVI
            sonification (Path A).
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Path A: NDVI sonification from HLS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Waves className="h-4 w-4 text-primary" aria-hidden />
              Path A — Sonify NDVI change
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {changeResult ? (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <dt className="text-muted-foreground">Source</dt>
                <dd className="font-mono text-foreground/80">
                  {location?.name ?? "selected location"}
                </dd>
                <dt className="text-muted-foreground">Years</dt>
                <dd className="text-foreground/80">
                  {changeResult.year_1} → {changeResult.year_2}
                </dd>
                <dt className="text-muted-foreground">NDVI band</dt>
                <dd className="text-foreground/80">
                  {raster?.bands.find((b) =>
                    b.name.toUpperCase().startsWith("NDVI")
                  )
                    ? `${raster.bands[0].width}×${raster.bands[0].height} → ${musicConfig?.grid_size ?? 16}×${musicConfig?.grid_size ?? 16} grid`
                    : "not decoded"}
                </dd>
              </dl>
            ) : (
              <p className="text-xs text-muted-foreground">
                Run an HLS analysis in the Explore view. Once the NDVI change
                band is decoded, it will be downsampled and sonified here.
              </p>
            )}
            <Button
              onClick={() => sonifyNdviFromHls()}
              disabled={!hasHlsNdvi || audioLoading || hlsConnection !== "connected"}
              className="gap-2"
              aria-busy={audioLoading && audioKind === "ndvi"}
            >
              {audioLoading && audioKind === "ndvi" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Waves className="h-4 w-4" aria-hidden />
              )}
              Sonify NDVI change
            </Button>
            {!hasHlsNdvi && changeResult && (
              <p className="text-[11px] text-amber-300">
                The HLS analysis completed but no NDVI band is available to
                sonify. Re-run the analysis or check the decoded raster.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Path B: Music generation from prepared dataset */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Disc3 className="h-4 w-4 text-primary" aria-hidden />
              Path B — Generate Earth Jukebox music
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {datasetsError ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="flex flex-col gap-1">
                  <span>{datasetsError}</span>
                  <Button size="sm" variant="outline" onClick={() => loadDatasets()} className="self-start">
                    Reload datasets
                  </Button>
                </div>
              </div>
            ) : datasets.length === 0 ? (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                No prepared datasets are available on the backend. Place a
                four-layer raster at{" "}
                <code className="font-mono text-foreground/80">
                  data/&lt;region&gt;/EarthJukebox_&lt;y1&gt;_&lt;y2&gt;_Four_Layers_30m.tif
                </code>{" "}
                to enable music generation.
              </p>
            ) : (
              <>
                <Label htmlFor="ej-dataset" className="sr-only">
                  Prepared dataset
                </Label>
                <select
                  id="ej-dataset"
                  value={selectedDataset?.id ?? ""}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Prepared dataset"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.region} — {d.year_1} vs {d.year_2}
                      {d.temperature_available ? " (with temperature)" : ""}
                    </option>
                  ))}
                </select>
                {selectedDataset && (
                  <p className="text-[11px] text-muted-foreground">
                    File:{" "}
                    <code className="font-mono text-foreground/80">
                      {selectedDataset.four_layer_file}
                    </code>
                  </p>
                )}
                <Button
                  onClick={() => selectedDataset && generateMusicFromDataset(selectedDataset)}
                  disabled={!selectedDataset || audioLoading}
                  className="gap-2"
                  aria-busy={audioLoading && audioKind === "music"}
                >
                  {audioLoading && audioKind === "music" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Music className="h-4 w-4" aria-hidden />
                  )}
                  Generate music
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generation status / errors */}
      {(audioError || audioLoading) && !audioUrl && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 rounded-md border p-3 text-xs",
            audioError
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-primary/30 bg-primary/8 text-muted-foreground"
          )}
        >
          {audioLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          ) : (
            <AlertTriangle className="h-4 w-4" aria-hidden />
          )}
          <span>
            {audioLoading ? "Generating audio — this can take a few seconds…" : audioError}
          </span>
        </div>
      )}

      {/* Audio player + metadata */}
      {audioUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Volume2 className="h-4 w-4 text-primary" aria-hidden />
              Playback
              <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary">
                {audioKind}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setCurrentTime(0); }}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setCurrentTime(e.currentTarget.currentTime)}
              preload="metadata"
              className="hidden"
            >
              <track kind="captions" />
              Your browser does not support the audio element.
            </audio>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handlePlay} className="gap-2" aria-label={playing ? "Pause" : "Play"}>
                {playing ? (
                  <>
                    <Pause className="h-4 w-4" aria-hidden />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" aria-hidden />
                    Play
                  </>
                )}
              </Button>
              <Button onClick={handleStop} variant="outline" className="gap-2" aria-label="Stop">
                <StopCircle className="h-4 w-4" aria-hidden />
                Stop
              </Button>
              <a
                href={audioUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download WAV
              </a>
            </div>

            <div className="flex items-center gap-3">
              {volume === 0 ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" aria-hidden />
              ) : (
                <Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden />
              )}
              <Label htmlFor="ej-volume" className="sr-only">
                Volume
              </Label>
              <Slider
                id="ej-volume"
                value={[Math.round(volume * 100)]}
                onValueChange={(v) => setVolume(v[0] / 100)}
                min={0}
                max={100}
                step={1}
                aria-label="Volume"
                className="max-w-xs"
              />
              <span className="w-10 text-right font-mono text-xs text-muted-foreground">
                {Math.round(volume * 100)}%
              </span>
            </div>

            {audioMeta && <AudioMeta meta={audioMeta} kind={audioKind} />}

            {audioKind === "ndvi" && ndviGrid && (
              <section className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3" aria-labelledby="ndvi-listen-title">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 id="ndvi-listen-title" className="text-sm font-semibold">Follow the NDVI raster while listening</h3>
                    <p className="text-[11px] text-muted-foreground">The highlighted cell follows the backend's row-major playback order.</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={audioOnlyMode} onChange={(e) => setAudioOnlyMode(e.target.checked)} /> Audio-first descriptions</label>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }} role="img" aria-label={`${gridSize} by ${gridSize} downsampled NDVI change grid. The highlighted cell is currently being sonified.`}>
                    {ndviGrid.flatMap((row, r) => row.map((value, c) => {
                      const index = r * gridSize + c;
                      const color = value === null ? "#475569" : value > 0.05 ? "#23965B" : value < -0.05 ? "#C65A54" : "#A58C42";
                      return <span key={index} title={`Row ${r + 1}, column ${c + 1}: ${value === null ? "NoData" : value.toFixed(3)}`} className="aspect-square rounded-[2px]" style={{ backgroundColor: color, outline: index === activeCell ? "2px solid white" : "none", outlineOffset: "1px", opacity: index === activeCell ? 1 : 0.78 }} />;
                    }))}
                  </div>
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="rounded-md border border-border/60 p-3">
                      <p className="text-muted-foreground">Currently sonified cell</p>
                      <p className="mt-1 font-mono text-lg">{rowAtTime + 1}, {colAtTime + 1}</p>
                      <p className="text-muted-foreground">Grid position · {activeCell + 1} / {gridSize * gridSize}</p>
                      <p className="mt-2 font-mono text-base">{activeValue === null ? "NoData" : activeValue.toFixed(4)}</p>
                      <p className="mt-1 leading-relaxed">{activeMeaning}</p>
                    </div>
                    <ul className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                      <li className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-emerald-600"/> Increase</li>
                      <li className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-red-500"/> Decrease</li>
                      <li className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-amber-600"/> Stable</li>
                      <li className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-slate-600"/> NoData</li>
                    </ul>
                  </div>
                </div>
                <p className="sr-only" aria-live={audioOnlyMode ? "polite" : "off"}>{`Cell ${rowAtTime + 1}, ${colAtTime + 1}. ${activeMeaning}`}</p>
                <p className="text-[10px] leading-relaxed text-muted-foreground">The backend maps values greater than +0.05 to an increasing tone, values below -0.05 to a decreasing tone, values between those thresholds to a neutral tone, and missing values to silence. This grid is a downsampled overview, not individual 30 m source pixels.</p>
              </section>
            )}
          </CardContent>
        </Card>
      )}

      {/* OpenAPI discovery (kept for transparency) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Radio className="h-4 w-4 text-primary" aria-hidden />
            Backend API discovery
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <p>
            The Sound view calls the concrete backend endpoints{" "}
            <code className="font-mono text-foreground/80">/api/sonification/ndvi</code>,{" "}
            <code className="font-mono text-foreground/80">/api/music/generate</code>,{" "}
            <code className="font-mono text-foreground/80">/api/controls</code> and{" "}
            <code className="font-mono text-foreground/80">/api/datasets</code>{" "}
            directly. The full OpenAPI spec is also loaded at boot for
            transparency. No audio endpoints are invented.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AudioMeta({
  meta,
  kind,
}: {
  meta: Record<string, unknown>;
  kind: "ndvi" | "music" | null;
}) {
  if (kind === "ndvi") {
    const inc = Number(meta.increase_cells ?? 0);
    const dec = Number(meta.decrease_cells ?? 0);
    const stable = Number(meta.stable_cells ?? 0);
    const invalid = Number(meta.invalid_cells ?? 0);
    const total = inc + dec + stable + invalid;
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <dl className="rounded-md border border-border/60 bg-muted/30 p-3 text-[11px]">
          <div className="flex justify-between"><dt className="text-muted-foreground">Duration</dt><dd className="font-mono text-foreground/80">{Number(meta.duration_seconds ?? 0).toFixed(2)}s</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Sample rate</dt><dd className="font-mono text-foreground/80">{String(meta.sample_rate ?? "—")} Hz</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Source</dt><dd className="text-foreground/80">{String(meta.source ?? "—")}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Years</dt><dd className="text-foreground/80">{String(meta.year_1 ?? "—")} → {String(meta.year_2 ?? "—")}</dd></div>
        </dl>
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-[11px]">
          <div className="mb-1 font-medium text-foreground/90">NDVI cell breakdown</div>
          <ul className="flex flex-col gap-1">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />Increase</span>
              <span className="font-mono">{inc.toLocaleString()} ({pct(inc, total)}%)</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-red-300"><span className="h-2 w-2 rounded-full bg-red-400" aria-hidden />Decrease</span>
              <span className="font-mono">{dec.toLocaleString()} ({pct(dec, total)}%)</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-muted-foreground" aria-hidden />Stable</span>
              <span className="font-mono">{stable.toLocaleString()} ({pct(stable, total)}%)</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground/70"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" aria-hidden />No data</span>
              <span className="font-mono">{invalid.toLocaleString()} ({pct(invalid, total)}%)</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }
  // music
  const active = Array.isArray(meta.active_layers) ? meta.active_layers : [];
  const config = (meta.config as Record<string, LayerSetting> | undefined) ?? undefined;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <dl className="rounded-md border border-border/60 bg-muted/30 p-3 text-[11px]">
        <div className="flex justify-between"><dt className="text-muted-foreground">Duration</dt><dd className="font-mono text-foreground/80">{Number(meta.duration_seconds ?? 0).toFixed(2)}s</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Sample rate</dt><dd className="font-mono text-foreground/80">{String(meta.sample_rate ?? "—")} Hz</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">BPM</dt><dd className="font-mono text-foreground/80">{String(meta.bpm ?? "—")}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Beats</dt><dd className="font-mono text-foreground/80">{String(meta.beats ?? "—")}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Source</dt><dd className="text-foreground/80">{String(meta.source ?? "—")}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Years</dt><dd className="text-foreground/80">{String(meta.year_1 ?? "—")} → {String(meta.year_2 ?? "—")}</dd></div>
      </dl>
      <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-[11px]">
        <div className="mb-1 font-medium text-foreground/90">Active layers</div>
        {active.length === 0 ? (
          <p className="text-muted-foreground">None.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {active.map((l) => {
              const metaL = LAYER_META[String(l)] ?? { label: String(l), color: "oklch(0.7 0.1 160)" };
              const setting = config?.[String(l)];
              return (
                <li key={String(l)} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: metaL.color }} aria-hidden />
                    {metaL.label}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {setting ? `${Math.round(setting.intensity * 100)}% audio intensity` : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function pct(n: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((n / total) * 100);
}
