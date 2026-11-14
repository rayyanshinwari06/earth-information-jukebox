"use client";

import { useMemo, useRef, useState } from "react";
import { useEJStore } from "@/lib/ej/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ExternalLink, Earth, Image as ImageIcon, Link2, Music, ShieldCheck } from "lucide-react";

const NASA_EIC = "https://svs.gsfc.nasa.gov/gallery/earth-information-center/";
const CHALLENGE = "https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/";

function isSafeHttps(value: string) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function mediaKind(url: string): "image" | "video" | "embed" | "unknown" {
  const clean = url.split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(clean)) return "image";
  if (/\.(mp4|webm|ogg)$/.test(clean)) return "video";
  if (/youtube\.com\/embed\/|youtu\.be\/|vimeo\.com\/video\//.test(url)) return "embed";
  return "unknown";
}


async function sonifyUploadedFrame(imageUrl: string): Promise<Blob> {
  const image = new Image();
  image.src = imageUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The uploaded image could not be decoded."));
  });
  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas processing is unavailable in this browser.");
  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const sampleRate = 22050;
  const noteSeconds = 0.10;
  const gapSeconds = 0.02;
  const rowPauseSeconds = 0.18;
  const noteSamples = Math.floor(sampleRate * noteSeconds);
  const gapSamples = Math.floor(sampleRate * gapSeconds);
  const rowPauseSamples = Math.floor(sampleRate * rowPauseSeconds);
  const output: number[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const offset = (row * size + col) * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const alpha = pixels[offset + 3] / 255;
      const brightness = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
      const saturation = (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255;
      const frequency = 220 + brightness * 660;
      for (let i = 0; i < noteSamples; i++) {
        const t = i / sampleRate;
        const envelope = Math.min(1, i / 220, (noteSamples - i) / 330);
        const fundamental = Math.sin(2 * Math.PI * frequency * t);
        const harmonic = Math.sin(2 * Math.PI * frequency * 2 * t);
        output.push((fundamental * (1 - saturation * 0.35) + harmonic * saturation * 0.35) * envelope * alpha * 0.22);
      }
      for (let i = 0; i < gapSamples; i++) output.push(0);
    }
    for (let i = 0; i < rowPauseSamples; i++) output.push(0);
  }
  const wav = new ArrayBuffer(44 + output.length * 2);
  const view = new DataView(wav);
  const write = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  write(0, "RIFF"); view.setUint32(4, 36 + output.length * 2, true); write(8, "WAVE");
  write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, output.length * 2, true);
  for (let i = 0; i < output.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, output[i])) * 32767, true);
  return new Blob([wav], { type: "audio/wav" });
}

export function EICView() {
  const { setView, raster, changeResult, location, sonifyNdviFromHls, audioLoading, audioKind, audioUrl, audioMeta } = useEJStore();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [title, setTitle] = useState("");
  const [visualUrl, setVisualUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState(NASA_EIC);
  const [variable, setVariable] = useState("NDVI / vegetation change");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [frameImageUrl, setFrameImageUrl] = useState<string | null>(null);
  const [frameAudioUrl, setFrameAudioUrl] = useState<string | null>(null);
  const [frameAudioBusy, setFrameAudioBusy] = useState(false);
  const [frameAudioError, setFrameAudioError] = useState("");
  const kind = useMemo(() => mediaKind(visualUrl), [visualUrl]);
  const hasNdvi = !!raster?.bands.some((b) => b.name.toUpperCase().startsWith("NDVI")) && !!changeResult;
  const canPairHls = hasNdvi && variable === "NDVI / vegetation change";

  const generateFrameSound = async () => {
    if (!frameImageUrl) return;
    setFrameAudioBusy(true);
    setFrameAudioError("");
    try {
      const blob = await sonifyUploadedFrame(frameImageUrl);
      if (frameAudioUrl) URL.revokeObjectURL(frameAudioUrl);
      setFrameAudioUrl(URL.createObjectURL(blob));
    } catch (err) {
      setFrameAudioError(err instanceof Error ? err.message : "Frame sonification failed.");
    } finally {
      setFrameAudioBusy(false);
    }
  };

  const loadVisualization = () => {
    setError("");
    if (!title.trim()) return setError("Enter the title of the NASA EIC visualization.");
    if (!isSafeHttps(sourceUrl)) return setError("The source page must be a valid HTTPS URL.");
    if (!isSafeHttps(visualUrl)) return setError("Enter a valid HTTPS image, video, or supported video-embed URL.");
    if (kind === "unknown") return setError("Use a direct image/video URL, or a YouTube/Vimeo embed URL. A normal webpage URL cannot be previewed as a media frame.");
    setLoaded(true);
  };

  return (
    <div className="mx-auto flex max-w-screen-xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><Earth className="h-5 w-5 text-primary" aria-hidden /><h1 className="text-xl font-semibold tracking-tight sm:text-2xl">NASA EIC Visualization Studio</h1></div>
        <p className="max-w-3xl text-sm text-muted-foreground">Pair a real Earth Information Center visual with a data-driven soundscape. Add the specific NASA visualization asset and its source; then connect it to a matching scientific dataset.</p>
      </header>

      <Card className="border-primary/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-primary"/> Challenge alignment and source</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 text-xs leading-relaxed text-muted-foreground">
          <p>The challenge asks for EIC visual frames paired with dynamic sonification. The NASA Space Apps Navigator confirmed that either visual-frame feature extraction or the underlying numerical dataset can be used, provided the sound remains meaningfully connected to the EIC visualization and its science.</p>
          <div className="flex flex-wrap gap-3"><a className="inline-flex items-center gap-1 text-primary underline underline-offset-4" href={NASA_EIC} target="_blank" rel="noreferrer">NASA Earth Information Center <ExternalLink className="h-3 w-3"/></a><a className="inline-flex items-center gap-1 text-primary underline underline-offset-4" href={CHALLENGE} target="_blank" rel="noreferrer">Official challenge <ExternalLink className="h-3 w-3"/></a></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Start with an official EIC visualization</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "GEDI Forest Height", url: "https://svs.gsfc.nasa.gov/4950/", variable: "Forest canopy height (GEDI)" },
            { title: "Spread of the Dixie Fire", url: "https://svs.gsfc.nasa.gov/4993/", variable: "Wildfire / burned area" },
            { title: "Atmospheric River", url: "https://svs.gsfc.nasa.gov/4960/", variable: "Water / hydrology" },
            { title: "Global CO₂ visualization", url: "https://svs.gsfc.nasa.gov/5196/", variable: "Other — see source description" },
          ].map((item) => <button key={item.url} type="button" onClick={() => { setTitle(item.title); setSourceUrl(item.url); setVariable(item.variable); setLoaded(false); }} className="rounded-md border border-border/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block text-xs font-medium">{item.title}</span><span className="mt-1 block text-[10px] text-muted-foreground">Load source details</span></button>)}
          <a href={NASA_EIC} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border border-dashed border-border/60 p-3 text-xs text-primary hover:bg-muted/30">Browse full NASA EIC content database <ExternalLink className="h-3.5 w-3.5"/></a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Link2 className="h-4 w-4 text-primary"/> Add an EIC visualization</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5"><Label htmlFor="eic-title">Visualization title</Label><Input id="eic-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Global vegetation change"/></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="eic-source">Official source page URL</Label><Input id="eic-source" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..."/></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="eic-media">Direct visual frame / video URL</Label><Input id="eic-media" type="url" value={visualUrl} onChange={(e) => {setVisualUrl(e.target.value); setLoaded(false);}} placeholder="https://...mp4 or .jpg or YouTube/Vimeo embed"/></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="eic-variable">Environmental variable</Label><select id="eic-variable" value={variable} onChange={(e) => setVariable(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option>NDVI / vegetation change</option><option>Forest canopy height (GEDI)</option><option>Land surface temperature</option><option>Water / hydrology</option><option>Wildfire / burned area</option><option>Snow / ice</option><option>Other — see source description</option></select></div>
            <Button onClick={loadVisualization} className="gap-2"><ImageIcon className="h-4 w-4"/> Load visualization</Button>
            {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
          </div>
          <div className="min-h-64 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
            {loaded ? <div className="flex h-full min-h-64 flex-col">
              {kind === "image" && <img src={visualUrl} alt={title} className="max-h-[420px] w-full flex-1 object-contain"/>}
              {kind === "video" && <video ref={videoRef} src={visualUrl} controls playsInline className="max-h-[420px] w-full flex-1" aria-label={title}/>}
              {kind === "embed" && <iframe src={visualUrl.includes("youtu.be/") ? `https://www.youtube-nocookie.com/embed/${visualUrl.split("youtu.be/")[1].split(/[?&]/)[0]}` : visualUrl} title={title} className="min-h-64 w-full flex-1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}
              <div className="border-t border-border/50 p-3 text-xs"><strong>{title}</strong><p className="text-muted-foreground">{variable} · Source: <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-primary underline">open source</a></p></div>
            </div> : <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground"><ImageIcon className="h-8 w-8"/><p className="text-sm font-medium">Visualization preview</p><p className="max-w-xs text-xs">Add a direct NASA image/video asset or supported video embed URL. The source page alone is not treated as a frame.</p></div>}
          </div>
        </CardContent>
      </Card>

      {loaded && audioUrl && audioKind === "ndvi" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Music className="h-4 w-4 text-primary"/> Paired visualization and sonification</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">Play the selected EIC visual and its generated NDVI sound together. For video sources, the video position is kept proportional to the audio timeline. For image sources, the image remains visible throughout playback.</p>
            <audio
              controls
              className="w-full"
              src={audioUrl}
              onPlay={() => { if (kind === "video") void videoRef.current?.play().catch(() => undefined); }}
              onPause={() => { if (kind === "video") videoRef.current?.pause(); }}
              onEnded={() => { if (kind === "video" && videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } }}
              onTimeUpdate={(event) => {
                const audio = event.currentTarget;
                const video = videoRef.current;
                if (kind === "video" && video && Number.isFinite(video.duration) && video.duration > 0 && Number.isFinite(audio.duration) && audio.duration > 0) {
                  const target = (audio.currentTime / audio.duration) * video.duration;
                  if (Math.abs(video.currentTime - target) > 0.35) video.currentTime = target;
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">{title} · {String(audioMeta?.source ?? location?.name ?? "Selected region")} · {String(audioMeta?.year_1 ?? changeResult?.year_1 ?? "")}–{String(audioMeta?.year_2 ?? changeResult?.year_2 ?? "")}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Music className="h-4 w-4 text-primary"/> Sonify an EIC visual frame directly</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-muted-foreground">This path implements the visual-frame approach described in the NASA Space Apps clarification. Upload a still frame extracted from the selected NASA EIC visualization. Processing happens locally in your browser: the frame is reduced to a 16 × 16 grid, brightness controls pitch, and color saturation controls harmonic timbre.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5"><Label htmlFor="eic-frame-upload">Upload a still frame from the selected EIC visual</Label><Input id="eic-frame-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (!file.type.startsWith("image/")) { setFrameAudioError("Choose a PNG, JPEG or WebP image."); return; }
              if (file.size > 15 * 1024 * 1024) { setFrameAudioError("Choose an image smaller than 15 MB."); return; }
              if (frameImageUrl) URL.revokeObjectURL(frameImageUrl);
              if (frameAudioUrl) URL.revokeObjectURL(frameAudioUrl);
              setFrameImageUrl(URL.createObjectURL(file)); setFrameAudioUrl(null); setFrameAudioError("");
            }}/></div>
            <Button onClick={generateFrameSound} disabled={!frameImageUrl || frameAudioBusy} className="gap-2">{frameAudioBusy ? "Generating…" : "Sonify uploaded frame"}</Button>
          </div>
          {frameImageUrl && <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-md border border-border/60 bg-muted/20"><img src={frameImageUrl} alt="Uploaded NASA EIC visualization frame" className="max-h-64 w-full object-contain"/><p className="border-t border-border/50 p-2 text-[10px] text-muted-foreground">Uploaded frame · local browser processing</p></div>
            <div className="flex flex-col justify-center gap-2 rounded-md border border-border/60 p-3">
              <p className="text-xs font-medium">Visual-to-sound mapping</p>
              <p className="text-xs text-muted-foreground">Dark pixels → lower pitch. Bright pixels → higher pitch. More saturated colors → stronger harmonic component. Cells are played left-to-right, top-to-bottom, with a short pause between rows.</p>
              {frameAudioUrl && <audio controls src={frameAudioUrl} className="w-full" aria-label="Sonification of uploaded EIC image frame"/>}
              {frameAudioUrl && <a href={frameAudioUrl} download="eic-frame-sonification.wav" className="text-xs text-primary underline underline-offset-4">Download frame sonification WAV</a>}
            </div>
          </div>}
          {frameAudioError && <p role="alert" className="text-xs text-red-400">{frameAudioError}</p>}
          <p className="text-[10px] leading-relaxed text-muted-foreground">This is an artistic sonification of visual pixel features, not a direct measurement of the underlying environmental variable. Keep the NASA source, title, date and frame context with the sound. Use the numerical-data path below when the matching scientific dataset is available.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Connect the visualization to scientific data</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 text-xs leading-relaxed text-muted-foreground">
          <p>{hasNdvi ? <>An HLS NDVI change analysis is available for <strong className="text-foreground">{location?.name ?? "the selected location"}</strong> ({changeResult?.year_1}–{changeResult?.year_2}). You can sonify that measured raster below, but it is only a valid EIC pairing if it represents the same variable, region and period as the selected EIC visualization.</> : <>No HLS NDVI analysis is currently available. Run an analysis in Explore Earth first, then return here to sonify the resulting NDVI change raster.</>}</p>
          <label className="flex items-start gap-2 rounded-md border border-border/60 p-3 text-foreground"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="mt-0.5"/><span>I have verified that the selected HLS dataset corresponds to the variable, geographic scope and time period represented by this EIC visualization.</span></label>
          <div className="flex flex-wrap gap-2"><Button disabled={!loaded || !canPairHls || !verified || audioLoading} onClick={() => sonifyNdviFromHls()} className="gap-2"><Music className="h-4 w-4"/> Generate paired NDVI sound</Button><Button variant="outline" onClick={() => setView("explore")}>Open HLS Explorer</Button><Button variant="ghost" onClick={() => setView("sound")}>Open Sound Experience</Button></div>
          {hasNdvi && !canPairHls && <p className="text-amber-400">The selected visualization variable is not NDVI. The existing HLS NDVI sonifier is disabled for this selection to prevent an incorrect scientific pairing. Use the uploaded-frame sonification above or connect the matching numerical dataset.</p>}
          {!verified && <p className="flex items-start gap-2 text-amber-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/> Do not claim a scientific pairing until the source dataset is verified. Selecting the checkbox is your team's confirmation, not an automatic data match.</p>}
          {audioKind === "ndvi" && <p className="text-emerald-400">NDVI audio generated. The paired player is available above; the detailed cell-by-cell interpretation is in Sound Experience.</p>}
        </CardContent>
      </Card>
      <p className="text-[11px] leading-relaxed text-muted-foreground">Important: this studio does not scrape NASA pages or infer an underlying EIC dataset. It previews the exact media URL you supply and keeps source attribution visible. Use official EIC assets and the associated dataset; do not substitute an unrelated HLS raster.</p>
    </div>
  );
}
