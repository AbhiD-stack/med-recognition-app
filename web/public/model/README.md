Do NOT commit backbone.onnx / head_aug.onnx / head_lora.onnx / reference_embeddings.json here.
They are too large for a normal git push (backbone.onnx alone is ~350MB-1.2GB).

Host the whole `web_export/` folder produced by model_export/export_to_onnx.py
on Hugging Face Hub (free, unlimited model-file size), Cloudflare R2, or
Supabase Storage, then set NEXT_PUBLIC_MODEL_BASE_URL in .env.local to the
public base URL. src/lib/model.ts fetches everything from there at runtime
and the browser caches it after the first load.

For local dev only, you can drop small test files here and leave
NEXT_PUBLIC_MODEL_BASE_URL empty — model.ts will fall back to "/model".
