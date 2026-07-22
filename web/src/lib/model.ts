"use client";


import * as ort from 'onnxruntime-web';

let inferenceSession: ort.InferenceSession | null = null;

export async function getModelSession() {
  if (inferenceSession) return inferenceSession;

  // Configure WASM paths safely for client browser runtime
  ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.version}/dist/`;

  // Initialize your ONNX model session here
  // inferenceSession = await ort.InferenceSession.create('/model.onnx');
  return inferenceSession;
}

const LOCAL_BASE = "/model";
export const MODEL_BASE = LOCAL_BASE;


// Completely safe base URL helper that avoids any server-side evaluation errors
function getBaseUrl(): string {
  return "/model";
}
type InferenceConfig = {
  img_size: number;
  n_tta_views: number;
  normalize_mean: number[];
  normalize_std: number[];
  best_alpha: number;
  best_k: number;
  num_classes: number;
};


type ReferenceBank = {
  ref_aug_embeddings: number[][];
  ref_lora_embeddings: number[][];
  ref_label_idx: number[];
  embedding_dim: number;
  num_reference_images: number;
};


type LabelMap = Record<string, { label_str: string; ndc?: string; drug_name?: string }>;
type DrugNameMap = Record<string, { name?: string }>;


export type PillMatch = {
  label_idx: number;
  label_str: string;
  drug_name?: string;
  ndc?: string;
  score: number;
};


let backboneSession: ort.InferenceSession | null = null;
let headAugSession: ort.InferenceSession | null = null;
let headLoraSession: ort.InferenceSession | null = null;
let config: InferenceConfig | null = null;
let refBank: ReferenceBank | null = null;
let labelMap: LabelMap | null = null;
let refFilenames: Record<string, string> | null = null;
let drugNameMap: DrugNameMap | null = null;
let loadingPromise: Promise<void> | null = null;
let loadTimings: Record<string, number> = {};


async function fetchJson<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Failed to fetch ${url} after 3 attempts`);
}


export function loadModel(onProgress?: (msg: string) => void): Promise<void> {
  if (loadingPromise) return loadingPromise;


  loadingPromise = (async () => {
    const startAll = performance.now();
    try {
      const hw = (navigator as any)?.hardwareConcurrency || 4;
      ort.env.wasm.numThreads = Math.max(1, Math.floor(hw - 1));
    } catch (e) {
      ort.env.wasm.numThreads = 2;
    }


    onProgress?.("Downloading inference config...");
    const t0 = performance.now();
    config = await fetchJson<InferenceConfig>(`${getBaseUrl()}/inference_config.json`);
   
    // Force fast default TTA views to keep latency under 15 seconds
    if (config && (!config.n_tta_views || config.n_tta_views > 1)) {
      config.n_tta_views = 1;
    }
    loadTimings["inference_config_ms"] = Math.round(performance.now() - t0);


    onProgress?.("Downloading label map...");
    const t1 = performance.now();
    labelMap = await fetchJson<LabelMap>(`${getBaseUrl()}/labels.json`);
    loadTimings["labels_ms"] = Math.round(performance.now() - t1);


    onProgress?.("Downloading reference embeddings...");
    const t3 = performance.now();
    refBank = await fetchJson<ReferenceBank>(`${getBaseUrl()}/reference_embeddings.json`);
    loadTimings["reference_embeddings_ms"] = Math.round(performance.now() - t3);


    try {
      refFilenames = await fetchJson<Record<string, string>>(`${LOCAL_BASE}/reference_filenames.json`);
    } catch (e) {
      refFilenames = {};
    }


    try {
      drugNameMap = await fetchJson<DrugNameMap>(`${LOCAL_BASE}/ndc_names.json`);
    } catch (e) {
      drugNameMap = {};
    }


    onProgress?.("Loading vision backbone...");
    const t5 = performance.now();
    try {
      backboneSession = await ort.InferenceSession.create(`${getBaseUrl()}/backbone.onnx`);
      loadTimings["backbone_load_ms"] = Math.round(performance.now() - t5);
    } catch (err) {
      console.error("Failed to load backbone:", err);
      loadTimings["backbone_load_ms"] = -1;
      throw err;
    }


    onProgress?.("Loading projection heads...");
    const t6 = performance.now();
    headAugSession = await ort.InferenceSession.create(`${getBaseUrl()}/head_aug.onnx`);
    headLoraSession = await ort.InferenceSession.create(`${getBaseUrl()}/head_lora.onnx`);
    loadTimings["heads_load_ms"] = Math.round(performance.now() - t6);


    loadTimings["total_load_ms"] = Math.round(performance.now() - startAll);
    onProgress?.("Model ready.");
  })();


  return loadingPromise;
}


export function isModelReady(): boolean {
  return !!(backboneSession && headAugSession && headLoraSession && config && refBank && labelMap);
}


function drawTTAView(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  view: number,
  size: number
): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;


  const shortSide = Math.min(srcW, srcH);
  const zoom = view === 0 ? 1.0 : 1.08;
  const cropSize = shortSide / zoom;
  const maxOffset = (shortSide - cropSize) / 2;
  const offsets: [number, number][] = [
    [0, 0],
    [maxOffset, -maxOffset],
    [-maxOffset, maxOffset],
  ];
  const [ox, oy] = offsets[view % 3];


  const sx = (srcW - cropSize) / 2 + ox;
  const sy = (srcH - cropSize) / 2 + oy;


  ctx.drawImage(source, sx, sy, cropSize, cropSize, 0, 0, size, size);


  const { data } = ctx.getImageData(0, 0, size, size);
  const mean = config!.normalize_mean;
  const std = config!.normalize_std;
  const chw = new Float32Array(3 * size * size);
  const plane = size * size;
  for (let i = 0; i < plane; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    chw[i] = (r - mean[0]) / std[0];
    chw[plane + i] = (g - mean[1]) / std[1];
    chw[2 * plane + i] = (b - mean[2]) / std[2];
  }
  return chw;
}


function cosineSimMatrix(query: Float32Array, refs: number[][]): Float32Array {
  const out = new Float32Array(refs.length);
  let qNorm = 0;
  for (let i = 0; i < query.length; i++) qNorm += query[i] * query[i];
  qNorm = Math.sqrt(qNorm) || 1e-8;
  for (let r = 0; r < refs.length; r++) {
    let dot = 0,
      rNorm = 0;
    const ref = refs[r];
    for (let i = 0; i < ref.length; i++) {
      dot += query[i] * ref[i];
      rNorm += ref[i] * ref[i];
    }
    out[r] = dot / (qNorm * (Math.sqrt(rNorm) || 1e-8));
  }
  return out;
}


function topkPerClass(
  sims: Float32Array,
  refLabels: number[],
  numClasses: number,
  k: number
): Float32Array {
  const byClass: number[][] = Array.from({ length: numClasses }, () => []);
  for (let i = 0; i < sims.length; i++) byClass[refLabels[i]].push(sims[i]);
  const scores = new Float32Array(numClasses).fill(-1e9);
  for (let c = 0; c < numClasses; c++) {
    const arr = byClass[c];
    if (arr.length === 0) continue;
    arr.sort((a, b) => b - a);
    const kEff = Math.min(k, arr.length);
    let sum = 0;
    for (let i = 0; i < kEff; i++) sum += arr[i];
    scores[c] = sum / kEff;
  }
  return scores;
}


export async function identifyPill(
  imageSource: CanvasImageSource,
  srcW: number,
  srcH: number,
  topN = 5
): Promise<PillMatch[]> {
  if (!isModelReady()) throw new Error("Model not loaded yet — call loadModel() first.");
  const cfg = config!;


  let backboneAvg: Float32Array | null = null;
  let retriedForDimension = false;
  async function runBackboneWithSize(size: number) {
    backboneAvg = null;
    for (let v = 0; v < cfg.n_tta_views; v++) {
      const chw = drawTTAView(imageSource, srcW, srcH, v, size);
      const tensor = new ort.Tensor("float32", chw, [1, 3, size, size]);
      const result = await backboneSession!.run({ pixel_values: tensor });
      const emb = result.embedding.data as Float32Array;
      if (!backboneAvg) backboneAvg = new Float32Array(emb.length);
      for (let i = 0; i < emb.length; i++) backboneAvg[i] += emb[i] / cfg.n_tta_views;
    }
  }


  try {
    await runBackboneWithSize(cfg.img_size);
  } catch (err: any) {
    const msg = err?.message || String(err);
    const m = msg.match(/Expected:\s*(\d+)/);
    if (m && !retriedForDimension) {
      const expected = Number(m[1]);
      (config as any).img_size = expected;
      retriedForDimension = true;
      try {
        await runBackboneWithSize(expected);
      } catch (err2) {
        throw new Error("Backbone inference failed after retry: " + (err2 instanceof Error ? err2.message : String(err2)));
      }
    } else {
      throw new Error("Backbone inference failed: " + msg);
    }
  }


  try {
    const backboneTensor = new ort.Tensor("float32", backboneAvg!, [1, backboneAvg!.length]);
    const augOut = await headAugSession!.run({ backbone_embedding: backboneTensor });
    const loraOut = await headLoraSession!.run({ backbone_embedding: backboneTensor });
    const augEmb = augOut.projected_embedding.data as Float32Array;
    const loraEmb = loraOut.projected_embedding.data as Float32Array;


    const augSims = cosineSimMatrix(augEmb, refBank!.ref_aug_embeddings);
    const loraSims = cosineSimMatrix(loraEmb, refBank!.ref_lora_embeddings);
    const augScores = topkPerClass(augSims, refBank!.ref_label_idx, cfg.num_classes, cfg.best_k);
    const loraScores = topkPerClass(loraSims, refBank!.ref_label_idx, cfg.num_classes, cfg.best_k);


    const alpha = cfg.best_alpha;
    const finalScores = new Float32Array(cfg.num_classes);
    for (let c = 0; c < cfg.num_classes; c++) {
      finalScores[c] = alpha * augScores[c] + (1 - alpha) * loraScores[c];
    }


    const ranked = Array.from(finalScores)
      .map((score, label_idx) => ({ label_idx, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);


    return ranked.map(({ label_idx, score }) => {
      const meta = labelMap![String(label_idx)] || { label_str: "Unknown" };
      const labelStr = meta.label_str || "";
      const ndcFromLabel = (labelStr.match(/\d{4,5}-\d{3,4}-\d{1,2}/) || labelStr.match(/\d{4,5}-\d{3,4}/))?.[0];
      const ndcFromSplit = labelStr.split("_")[0];
      const ndc = meta.ndc || ndcFromLabel || (ndcFromSplit && /\d/.test(ndcFromSplit) ? ndcFromSplit : undefined);
      const drug_name = meta.drug_name || (ndc && drugNameMap?.[ndc]?.name) || labelStr.replace(/_/g, " ");


      return { label_idx, score, label_str: meta.label_str, ndc, drug_name } as PillMatch;
    });
  } catch (err) {
    throw new Error("Head/projection inference failed: " + (err instanceof Error ? err.message : String(err)));
  }
}


export function getReferenceUrl(label_idx: number, label_str?: string) {
  if (label_str && (label_str.includes(".jpg") || label_str.includes(".png") || label_str.includes("/"))) {
    return `${getBaseUrl()}/${label_str}`;
  }


  const filename = refFilenames?.[String(label_idx)];
  if (filename) {
    return `${LOCAL_BASE}/reference_images/${filename}`;
  }
  return `${LOCAL_BASE}/reference_images/${label_idx}.jpg`;
}


export function getLoadTimings() {
  return { ...loadTimings };
}


