// Earth Jukebox — real FastAPI backend contract types.
// These mirror the actual Python backend responses documented in the project
// brief and verified against the running FastAPI application (Kaghan Valley
// 2018–2025 test). No fabricated fields.

// ---------------------------------------------------------------------------
// Location search — GET /api/location/search?q=...
// ---------------------------------------------------------------------------

export interface LocationAddress {
  city?: string;
  municipality?: string;
  state?: string;
  country?: string;
  country_code?: string;
  [k: string]: string | undefined;
}

export interface LocationSearchResult {
  success: boolean;
  name: string;
  latitude: number;
  longitude: number;
  address?: LocationAddress;
  bounding_box?: [string, string, string, string];
}

// ---------------------------------------------------------------------------
// HLS configuration — GET /api/hls/config
// ---------------------------------------------------------------------------

export interface HLSConfig {
  dataset: string;
  tile_selection_policy?: string;
  default_latitude?: number;
  default_longitude?: number;
  default_radius?: number;
  season_start?: string;
  season_end?: string;
  crs_policy?: string;
  resolution?: number;
  excluded_fmask_bits?: number[];
  max_radius_m?: number;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// HLS status — GET /api/hls/status
// ---------------------------------------------------------------------------

export interface EarthEngineStatus {
  initialized: boolean;
  connected: boolean;
  project?: string;
  message?: string;
  error?: string | null;
}

export interface HLSStatus {
  service: string;
  available: boolean;
  dataset: string;
  tile?: string;
  earth_engine: EarthEngineStatus;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// HLS change analysis — POST /api/hls/change
// ---------------------------------------------------------------------------

export interface HLSChangeRequest {
  year_1: number;
  year_2: number;
  latitude: number;
  longitude: number;
  radius_m: number;
}

export interface RasterMeta {
  width: number;
  height: number;
  bands: number;
  crs: string;
  resolution: [number, number] | number;
  bounds?: [number, number, number, number];
  nodata?: number;
}

export interface HLSChangeResponse {
  status: string;
  message?: string;
  filename: string;
  download_url: string;
  year_1: number;
  year_2: number;
  dataset: string;
  tile?: string;
  tile_ids?: string[];
  image_count_1?: number;
  image_count_2?: number;
  band_names: string[];
  crs: string;
  resolution: number | [number, number];
  raster?: RasterMeta;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// OpenAPI discovery — GET /openapi.json
// Used to introspect the existing sonification endpoints rather than
// inventing them.
// ---------------------------------------------------------------------------

export interface OpenApiPathItem {
  summary?: string;
  description?: string;
  get?: { summary?: string; description?: string; operationId?: string };
  post?: { summary?: string; description?: string; operationId?: string };
  [method: string]: unknown;
}

export interface OpenApiSpec {
  openapi: string;
  info?: { title?: string; version?: string; description?: string };
  paths: Record<string, OpenApiPathItem>;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// Decoded raster (client-side, from geotiff.js)
// ---------------------------------------------------------------------------

export interface DecodedBand {
  name: string;
  width: number;
  height: number;
  /** Float32 values, row-major, length = width * height. NoData kept as-is. */
  data: Float32Array;
  min: number;
  max: number;
  mean: number;
  std: number;
  validPixelCount: number;
  noDataValue: number | null;
}

export interface DecodedRaster {
  bands: DecodedBand[];
  width: number;
  height: number;
  crs: string;
  /** Affine transform: [a, b, c, d, e, f] — origin x, px width, 0, origin y, 0, px height (signed). */
  transform?: [number, number, number, number, number, number];
  bounds?: [number, number, number, number];
  noDataValue: number | null;
}

// ---------------------------------------------------------------------------
// Sonification endpoints discovered from /openapi.json
// ---------------------------------------------------------------------------

export interface DiscoveredEndpoint {
  path: string;
  method: string;
  summary: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Music engine configuration — GET /api/config
// The five sound layers and their default {enabled, intensity} settings.
// ---------------------------------------------------------------------------

export interface LayerSetting {
  enabled: boolean;
  intensity: number; // 0.0 – 1.0
}

export type LayerName =
  | "vegetation"
  | "water"
  | "snow"
  | "burned_area"
  | "temperature";

export interface MusicConfig {
  sample_rate: number;
  bpm: number;
  beats: number;
  grid_size: number;
  layers: Record<string, LayerSetting>;
}

export interface EngineInfo {
  title: string;
  version: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Datasets — GET /api/datasets
// Prepared region/year folders containing the four-layer raster used by the
// music generation engine.
// ---------------------------------------------------------------------------

export interface DatasetEntry {
  id: string;
  region: string;
  year_1: number;
  year_2: number;
  four_layer_file: string;
  temperature_available: boolean;
  temperature_file: string | null;
}

export interface DatasetsResponse {
  count: number;
  datasets: DatasetEntry[];
}

// ---------------------------------------------------------------------------
// Music generation — POST /api/music/generate  body {region, year_1, year_2}
// ---------------------------------------------------------------------------

export interface MusicGenerationResponse {
  status: string;
  message?: string;
  filename: string;
  audio_url: string; // relative: /api/audio/{filename}
  duration_seconds: number;
  sample_rate: number;
  bpm: number;
  beats: number;
  active_layers: string[];
  config: Record<string, LayerSetting>;
}

// ---------------------------------------------------------------------------
// NDVI change sonification — POST /api/sonification/ndvi  body {grid, filename}
// ---------------------------------------------------------------------------

export interface NDVISonificationResponse {
  status: string;
  filename: string;
  audio_url: string; // relative: /api/audio/{filename}
  sample_rate: number;
  duration_seconds: number;
  increase_cells: number;
  decrease_cells: number;
  stable_cells: number;
  invalid_cells: number;
}

// ---------------------------------------------------------------------------
// Health — GET /api/health
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: string;
  application: string;
  data_directory: string;
  output_directory: string;
  earth_engine: EarthEngineStatus;
}

// ---------------------------------------------------------------------------
// AI model status — GET /api/ai/status
// ---------------------------------------------------------------------------

export interface AIStatus {
  random_forest_model_present: boolean;
  model_files: string[];
  prediction_api: string;
  note: string;
}

// ---------------------------------------------------------------------------
// Connection / processing state
// ---------------------------------------------------------------------------

export type Connection =
  | "checking"
  | "connected"
  | "unavailable"
  | "error";

export type ProcessingStage =
  | "idle"
  | "finding-observations"
  | "downloading-scenes"
  | "preparing-composites"
  | "calculating-changes"
  | "preparing-results"
  | "done"
  | "error";

// ---------------------------------------------------------------------------
// Application views (single-route SPA navigation)
// ---------------------------------------------------------------------------

export type EJView = "home" | "eic" | "explore" | "analysis" | "sound" | "about";
