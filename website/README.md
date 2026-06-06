# LLM Confidence Calibration — Website

Static Next.js 14 (App Router) site for the research benchmark comparing how
confidently and correctly 5 LLMs answer FIDE Chess vs FIA Formula 1 rules
questions.

## Stack

- Next.js 14 (App Router), configured for **static export** (`output: 'export'`)
- TypeScript, Tailwind CSS, Recharts
- All data is fetched **client-side at runtime** from `/data/` and `/benchmark/`,
  so `next build` never needs the data files to exist.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build (static export)

```bash
npm run build    # emits ./out
```

## Deploy to Vercel

```bash
vercel --prod
```

Vercel auto-detects Next.js. The static export is written to `out/`
(see `vercel.json`). No server runtime required.

## Data contracts

The pipeline must place these files under `public/` (placeholders ship with the
repo so the build works before data exists):

- `public/data/metrics.json`
- `public/data/master_results.csv`
- `public/benchmark/fide_questions.json`
- `public/benchmark/fia_questions.json`

Empty arrays/objects render a friendly "No data yet — run the pipeline" state.

## Routes

- `/` — landing (hero, animated stat strip, key-finding teaser chart)
- `/results` — interactive dashboard (7 filterable figures)
- `/benchmark` — searchable dataset explorer + downloads
- `/methodology` — research methodology & citation
