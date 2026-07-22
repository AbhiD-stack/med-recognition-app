# Pill ID v2 — Complete Setup Guide (for dummies)

This walks through every substep from "I have a trained model in Colab" to
"live app on Vercel with all Phase 2 features." Do the sections in order.
Nothing here assumes prior web-dev experience.

---

## Part 0 — What's actually changing

- **Old (Phase 1):** browser → your PC's FastAPI server (via Cloudflare
  Tunnel) → model runs on your machine → result sent back to browser.
  You had to relaunch PowerShell windows every session.
- **New (Phase 2):** browser downloads the model **once**, caches it, and
  runs everything locally with ONNX Runtime Web. No backend server exists
  anymore. No PowerShell, no tunnel, no "5 minute relaunch."

You still use Vercel, just for hosting static files (the website), not for
running your model.

---

## Part 1 — Export your trained model out of Colab

1. Open the Colab notebook where `head_aug`, `head_lora`, `ref_feat_448`,
   `BEST_ALPHA`, `BEST_K`, `N_CLASSES`, `CFG`, `DEVICE`, `OUT_DIR`, and
   `ref_df` already exist in memory (i.e., you've already run your normal
   cells 0–12).
2. Open `model_export/export_to_onnx.py` from this repo. Copy its entire
   contents into a **new cell at the bottom** of that same notebook.
3. **Edit one thing before running it:** in the "label_map" section near
   the bottom, if your `ref_df` has columns for the actual drug name or NDC
   (not just `label_str`), uncomment and fix those two lines so the app can
   show a real drug name instead of a raw class label.
4. Run the cell. It takes a few minutes (exporting DINOv2 to ONNX is the
   slow part). When it finishes you'll see a file list ending in something
   like:
   ```
   backbone.onnx: 1183.4 MB
   head_aug.onnx: 2.1 MB
   head_lora.onnx: 2.1 MB
   reference_embeddings.json: 45.2 MB
   labels.json: 0.1 MB
   inference_config.json: 0.0 MB
   ```
5. In the Colab file browser (left sidebar, folder icon), navigate to
   `OUT_DIR/web_export.zip` and download it to your computer. Unzip it — you
   now have all 6 files in one folder.

### Optional but recommended: shrink the model (Part 1b)

`backbone.onnx` at ~1.2GB will be slow to download on a phone. Quantizing it
to int8 cuts it to roughly 300-400MB with minimal accuracy loss.

1. On your own computer (needs Python): `pip install onnxruntime onnx`
2. Put `model_export/quantize_onnx.py` in the same folder as your unzipped
   `web_export/` folder (rename that folder to just `web_export` if needed).
3. Run `python quantize_onnx.py`. It creates `web_export_quantized/` with
   smaller `.onnx` files.
4. Copy `reference_embeddings.json`, `labels.json`, and `inference_config.json`
   from `web_export/` into `web_export_quantized/` too (JSON files don't need
   quantizing — the script only touches the 3 `.onnx` files).
5. Use `web_export_quantized/` as "the export folder" for the rest of this
   guide.

---

## Part 2 — Host the model files (they're too big for GitHub)

GitHub blocks any single file over 100MB, and your `backbone.onnx` is way
past that. Don't fight this — host the model files somewhere separate from
your code, and have the app fetch them at runtime. **Hugging Face Hub is
free and has no practical size limit for model files.** Steps:

1. Go to https://huggingface.co/join and make a free account (if you don't
   have one already).
2. Click your profile icon (top right) → **New Model**. Name it something
   like `pill-id-v2`. Visibility can be Public (nobody can reverse-engineer
   a usable identifier just from ONNX weights + no training data, but keep
   it Public unless you have a specific reason not to — Private repos need
   auth tokens wired into your frontend, which adds real complexity for a
   student project).
3. On the new model's page, click **Files and versions** → **Add file** →
   **Upload files**. Drag in all 6 files from your (quantized) `web_export`
   folder. Click **Commit changes to main**. Large files upload slower —
   let it finish.
4. Once uploaded, each file has a URL like:
   ```
   https://huggingface.co/YOUR_USERNAME/pill-id-v2/resolve/main/backbone.onnx
   ```
   The **base URL** you need (everything up to but not including the
   filename) is:
   ```
   https://huggingface.co/YOUR_USERNAME/pill-id-v2/resolve/main
   ```
   Write this down — you'll paste it into `.env.local` and into Vercel in
   Part 4 and Part 5.

*(Alternative if you'd rather not use Hugging Face: Cloudflare R2 or
Supabase Storage both work the same way — upload the 6 files to a public
bucket, use that bucket's public base URL instead. Hugging Face is simplest
because there's zero billing setup.)*

---

## Part 3 — Get the code running on your computer

1. Install Node.js if you don't have it: https://nodejs.org (LTS version,
   big green button). Restart your terminal after installing.
2. Copy the `web/` folder from this repo into wherever you keep projects,
   e.g. `C:\Users\kvd_\OneDrive\Documents\GitHub\pill-id-v2\web`.
3. Open a terminal **inside that `web/` folder** (`cd` into it) and run:
   ```
   npm install
   ```
   This downloads all the libraries (Next.js, onnxruntime-web, idb, jsPDF,
   qrcode). Takes 1-2 minutes.
4. Create your local environment file:
   ```
   cp .env.example .env.local
   ```
   (On Windows PowerShell: `copy .env.example .env.local`)
5. Open `.env.local` in a text editor and set:
   ```
   NEXT_PUBLIC_MODEL_BASE_URL=https://huggingface.co/YOUR_USERNAME/pill-id-v2/resolve/main
   ```
   using the base URL from Part 2. Leave the Supabase lines blank for now —
   telemetry is fully optional.
6. Run the dev server:
   ```
   npm run dev
   ```
7. Open **https://localhost:3000** — note: camera access requires either
   `localhost` (which browsers treat as secure automatically) or a real
   `https://` domain. Plain `http://` on a phone/other device will NOT be
   allowed to use the camera. For testing on your own laptop, plain
   `http://localhost:3000` also works fine because localhost is exempted.
8. First load will show "Downloading vision backbone..." — this can take a
   while the first time since it's pulling ~300MB-1.2GB from Hugging Face.
   After that, your browser caches it and reloads are instant.
9. Allow camera permission when prompted. Point at a pill, tap **Scan
   Pill**. You should see a top-5 result, hear it spoken aloud, and be able
   to drag it into Morning/Noon/Night.

### If something breaks here
See the **Troubleshooting** section at the very bottom before doing anything
else — the fixes for the most common errors are all there.

---

## Part 4 — Push the code to GitHub

You said you already have an old repo (`pill-id`) connected to Vercel. You
have two reasonable options — pick one:

**Option A — new repo (recommended, cleaner):**
1. Go to https://github.com/new, name it `pill-id-v2`, keep it Public or
   Private (your choice), don't add a README (you already have one).
2. In your terminal, from the **root** of this project (one level above
   `web/`, i.e. the folder containing `README.md`, `SETUP_GUIDE.md`,
   `model_export/`, `web/`):
   ```
   git init
   git add .
   git commit -m "Phase 2: local edge inference + geriatric safety UX"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pill-id-v2.git
   git push -u origin main
   ```

**Option B — reuse your existing `pill-id` repo:**
1. Delete the old `backend/` folder from that repo (you no longer need
   FastAPI, uvicorn, or the Cloudflare tunnel — the model doesn't run on
   your machine anymore).
2. Copy this project's `web/` folder contents into wherever your old
   frontend folder was (replacing it), and copy `model_export/` and the two
   root `README.md`/`SETUP_GUIDE.md` files into the repo root.
3. `git add . && git commit -m "Phase 2 rewrite: edge inference" && git push`

Either way: **do not** `git add` the actual `.onnx` files or
`reference_embeddings.json` — the `.gitignore` already excludes them, and
they live on Hugging Face now, not in git.

---

## Part 5 — Deploy to Vercel

1. Go to https://vercel.com/new and import your `pill-id-v2` (or `pill-id`)
   GitHub repo.
2. When it asks for the **Root Directory**, set it to `web` (since your
   Next.js app lives in the `web/` subfolder, not the repo root). There's a
   dropdown/browse button for this in the Vercel import screen.
3. Framework Preset should auto-detect as **Next.js**. Leave build command
   and output directory as defaults.
4. Before clicking Deploy, expand **Environment Variables** and add:
   - `NEXT_PUBLIC_MODEL_BASE_URL` = your Hugging Face base URL from Part 2
   - (optional) `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     if you set up telemetry — otherwise leave blank.
5. Click **Deploy**. Wait ~1-2 minutes.
6. Visit the `.vercel.app` URL it gives you, **on your phone**, over real
   HTTPS (Vercel gives you HTTPS automatically, so camera access will work
   there too, unlike a plain local network IP).

**That's it — no PowerShell windows, no tunnel, no redeploy-on-relaunch.**
The old "How to Relaunch" steps from Phase 1 are no longer needed at all.

---

## Part 6 — Replace the sample safety data before your Physician Day (7/16)

The repo ships with a **small sample** of Beers Criteria and drug
interaction entries in `web/public/data/beers_criteria.json` and
`drug_interactions.json`, just so the app runs end-to-end out of the box.
Before your real physician audit:

1. Get the full **AGS Beers Criteria®** table. It's copyrighted by the
   American Geriatrics Society — check their licensing terms for your use
   case (academic/non-commercial research use is often fine, but confirm).
   Reshape it into the same JSON structure as the sample file (`drug_name`,
   `aliases`, `category`, `risk_level`, `rationale`, `recommendation`).
2. Get the **ONCHigh** high-priority drug-drug interaction dataset (this was
   published as part of an ONC-funded interoperability initiative — search
   for "ONC High Priority Drug-Drug Interaction List" for the source table).
   Reshape into `drug_a` / `drug_b` / `severity` / `description` entries
   like the sample file.
3. Replace the two files in `web/public/data/`, keeping the exact same key
   names so `src/lib/safety.ts` doesn't need any code changes.
4. Redeploy (push to GitHub — Vercel auto-redeploys on every push to main).

---

## Part 7 — Matching your study timeline to this codebase

- **7/15 Senior Day:** Version A = have testers use the *old* Phase 1 app
  (or a build of this app with the Scanner's drag-and-drop replaced by a
  plain `<input>` text field, if you want a true apples-to-apples Version
  A). Version B = this app as-is. Both TCT and misclick counts can be timed
  by hand with a stopwatch, or you can extend `src/lib/telemetry.ts` to log
  `identify_pill` latency and a `misclick` event automatically if you wire
  up Supabase telemetry.
- **7/16 Physician Day:** use the **Safety Report** tab — it's built exactly
  for this: it cross-joins every scheduled drug and shows every Beers/
  interaction flag on one screen, which is what you'll walk each physician
  through for the CTI survey.
- **7/17 Staff Audit:** the whole UI already uses large tap targets
  (`min-h-tap` = 5rem everywhere) and 4px high-contrast borders for
  arthritic/low-vision use; this is what to point the nursing home
  professional at directly.

---

## Part 8 — Where the OCR cell (Cell 13) fits in

Your notebook already has an OCR imprint-extraction cell using
`pytesseract`. That's Python-only and can't run in the browser directly.
Two options if you want it in Phase 2:
- **Simplest:** skip it for the app; keep it as a Phase 2 paper section
  showing it as a potential tie-breaker method you evaluated offline, listed
  under "Future Work" (your outline already does this).
- **If you want it live in-browser:** Tesseract has a WebAssembly port
  called `tesseract.js` (`npm install tesseract.js` inside `web/`) that runs
  fully client-side, same "Zero-HIPAA" guarantee. This is extra work not
  included in this scaffold — flag it if you want it built out next.

---

## Troubleshooting

**"Failed to fetch backbone.onnx" / model never loads**
Almost always a Hugging Face URL typo. Open the exact URL
`.../resolve/main/backbone.onnx` in a plain browser tab — it should start
downloading a huge file. If you get a 404, re-check the username/repo name
in `NEXT_PUBLIC_MODEL_BASE_URL`.

**Camera button does nothing / permission never prompts**
You're on a non-HTTPS, non-localhost URL. Test on `localhost` locally, or on
the real `https://your-app.vercel.app` URL — never a bare LAN IP like
`http://192.168.1.5:3000`.

**Everything loads but inference is very slow (10+ seconds per scan)**
This is expected on first load (WASM JIT warmup + no GPU). It should speed
up on the 2nd-3rd scan. If it stays slow, use the quantized model from Part
1b, and confirm `next.config.mjs`'s COOP/COEP headers made it to production
(they enable multi-threaded WASM) — check via browser DevTools → Network →
click the page request → Headers, and look for `Cross-Origin-Opener-Policy`.

**"SharedArrayBuffer is not defined" in console**
Same root cause as above — the COOP/COEP headers aren't reaching the
browser (some hosting setups strip custom headers). It still works, just
single-threaded/slower. Not a blocker.

**Git push rejected because a file is too large**
You accidentally `git add`-ed an `.onnx` file. Check `web/.gitignore`
actually excludes `*.onnx` and `public/model/*.json`, then
`git rm --cached path/to/big/file` and commit again.

**Speech doesn't play on iPhone**
iOS Safari requires a user tap before the first `speechSynthesis.speak()`
call in a page's lifetime. Since our first alert always follows a "Scan
Pill" button tap, this should already be satisfied — but if you see this
issue during Senior Day, make sure the tester taps something (even just the
page) before their first scan.

**Vercel build fails with a TypeScript error**
Run `npm run build` locally first inside `web/` — it's much faster to fix
errors on your machine with full error output than waiting on Vercel's
build logs each time.
