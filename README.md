# Pill ID — Phase 2

Everything in this repo turns your trained model (88/95/99 top-5/top-5-2side/top-10)
into the Phase 2 app described in your plan: fully local edge-inference vision,
Fitts's-Law geriatric scheduler, local Beers/interaction safety layer, audio
verification, and a QR Health Passport — with **zero PHI ever leaving the device**.

**Start here → [`SETUP_GUIDE.md`](./SETUP_GUIDE.md)**. It is the full,
no-assumptions, step-by-step walkthrough (the "book for dummies" you asked
for). Read it top to bottom once; after that you'll only ever touch a few
commands.

## Repo map

```
pill-id-v2/
├── SETUP_GUIDE.md          <- READ THIS FIRST. Full step-by-step instructions.
├── model_export/
│   ├── export_to_onnx.py   <- paste into your Colab notebook as a new cell
│   └── quantize_onnx.py    <- optional, shrinks the model ~3x
└── web/                    <- the Next.js app you deploy to Vercel
    ├── src/app/             <- pages
    ├── src/components/      <- Scanner, Scheduler, SafetyReport, QRPassport
    ├── src/lib/              <- model.ts (ONNX inference), db.ts (IndexedDB),
    │                            safety.ts, pdf.ts, telemetry.ts
    └── public/data/          <- sample Beers/interaction JSON (replace before
                                  your physician audit day)
```

## The one big architectural change from Phase 1

Phase 1 had a Python/FastAPI backend + Cloudflare Tunnel + Vercel frontend,
because the model ran on your machine. **Phase 2 needs none of that.** The
model runs *inside the user's browser* via ONNX Runtime Web. You are deleting
the backend, the tunnel, and the "relaunch in 5 minutes" dance entirely. Once
deployed, the Vercel app works with your laptop turned off.
