# Earth Jukebox implementation changes

This package contains the original project plus the changes listed below. Existing FastAPI endpoints and the HLS/NDVI/music generation pipeline are preserved.

## Added / updated

- `src/components/ej/views/eic.tsx` — new NASA EIC Visualization Studio. Includes verified NASA SVS EIC gallery presets (GEDI Forest Height, Dixie Fire, Atmospheric River and Global CO₂), accepts a direct HTTPS image/video or supported YouTube/Vimeo embed URL, previews the asset, and keeps source attribution visible. It also supports uploading a still frame and generating a local WAV sonification from pixel brightness (pitch) and saturation (harmonic timbre), an explicit visual-frame approach described in the challenge clarification. A separate gated workflow pairs existing HLS NDVI audio only when the user selects NDVI and explicitly confirms the match.
- `src/components/ej/views/sound.tsx` — adds an NDVI playback-follow mode. It uses the same client-side downsampled grid and the backend's documented row-major timing (0.12 s tone + 0.02 s gap per cell; 0.25 s row pause) to highlight the cell being sonified and explain its actual signed value. Adds a user-controlled screen-reader live announcement mode. Clarifies that layer percentages are audio-mix intensity, not environmental coverage.
- `src/components/ej/sidebar.tsx` — adds EIC Visualization Studio navigation.
- `src/components/ej/app-shell.tsx` — mounts the new view.
- `src/lib/ej/types.ts` — adds the `eic` view identifier.
- `src/components/ej/views/home.tsx` — adds a direct entry point and updates the journey.
- `src/components/ej/views/about.tsx` — documents the EIC pairing rule and links to the official Space Apps clarification.

## Important data-integrity behavior

The NASA Space Apps Navigator response to discussion #1844 says both EIC visual-frame processing and associated raw numerical datasets can be relevant, provided the data remain meaningfully connected to the EIC visualization and its science. This implementation therefore does **not** pretend to discover or infer the underlying EIC dataset. The user must provide the exact official visualization asset and source URL, and must explicitly confirm that the existing HLS dataset matches its variable, geography and time period before the EIC workflow enables NDVI sonification.

The EIC Studio previews direct media URLs; it does not scrape NASA pages. The curated NASA SVS EIC items link to their official detail pages, where the team can obtain a media file or still frame. A normal NASA webpage URL is retained as attribution but is not treated as a media frame. The uploaded-frame sonifier works locally in the browser and does not upload the image. Its brightness/saturation mapping is an artistic representation of visual features, not a calibrated environmental measurement.

## Run locally

1. Extract this project folder.
2. Install dependencies using the package manager for your environment (`npm install` or `bun install`).
3. Configure the existing backend URL and Google Earth Engine credentials as described in `backend/RUN.md` and the existing README.
4. Start the FastAPI backend using `backend/run.sh` (Linux/macOS) or `backend/run.ps1` (Windows).
5. Start the Next.js app using `npm run dev`.
6. Open **EIC Visualizations** in the sidebar, add a NASA EIC visualization asset and its source, and only confirm a data pairing after checking the scientific variable, region and time period.

## Verification status

- Backend Python syntax is checked separately with `python -m compileall backend/app`.
- A full Next.js production build could not be run in this environment because project dependencies were not installed; the package installation attempt timed out. Run `npm install` followed by `npm run build` in the target development environment before deployment.
- Live NASA Earth Engine analysis and actual NASA media playback require the project's configured credentials and the exact media URLs selected by the team.
