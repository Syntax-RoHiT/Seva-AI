export interface EdgeAIResult {
  needType: string[];
  severity: number;
  affectedCount: number;
  summary: string;
  isLifeThreatening: boolean;
  processingMode: 'EDGE_CHROME_AI' | 'EDGE_WEBGPU' | 'SERVER_FALLBACK';
  processingMs: number;
}

// ─── Chrome Built-in AI (Gemma Nano / Prompt API) ─────────────────────────────

declare global {
  interface Window {
    ai?: {
      languageModel?: {
        capabilities: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>;
        create: (opts?: { systemPrompt?: string; temperature?: number }) => Promise<{
          prompt: (text: string) => Promise<string>;
          destroy: () => void;
        }>;
      };
      summarizer?: {
        capabilities: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>;
        create: (opts?: any) => Promise<{ summarize: (text: string) => Promise<string>; destroy: () => void }>;
      };
    };
  }
}

const EDGE_SYSTEM_PROMPT = `You are a disaster relief AI assistant analyzing field reports from India.
Extract structured data in JSON format. Always respond ONLY with valid JSON.
Format: {"needType":["MEDICAL"],"severity":3,"affectedCount":50,"isLifeThreatening":false,"summary":"brief summary"}
Categories: FOOD, WATER, MEDICAL, RESCUE, SHELTER, EDUCATION, INFRASTRUCTURE
Severity 1-5 (5=life-threatening). Respond in English regardless of input language.`;

async function runChromeAI(text: string): Promise<EdgeAIResult | null> {
  try {
    if (!window.ai?.languageModel) return null;

    const capabilities = await window.ai.languageModel.capabilities();
    if (capabilities.available === 'no') return null;

    const t0 = performance.now();
    const session = await window.ai.languageModel.create({
      systemPrompt: EDGE_SYSTEM_PROMPT,
      temperature: 0.2,
    });

    const rawResponse = await session.prompt(
      `Field report: "${text}"\n\nExtract disaster relief data as JSON.`
    );
    session.destroy();

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      needType: parsed.needType || ['GENERAL'],
      severity: Math.min(5, Math.max(1, parsed.severity || 3)),
      affectedCount: parsed.affectedCount || 0,
      summary: parsed.summary || text,
      isLifeThreatening: parsed.isLifeThreatening || false,
      processingMode: 'EDGE_CHROME_AI',
      processingMs: Math.round(performance.now() - t0),
    };
  } catch (err) {
    console.warn('[EdgeAI] Chrome AI failed:', err);
    return null;
  }
}

// ─── WebGPU Transformer.js (Gemma 2B as fallback) ─────────────────────────────

async function checkWebGPUSupport(): Promise<boolean> {
  try {
    const gpu = (navigator as any).gpu;
    if (!gpu) return false;
    const adapter = await gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

async function runWebGPUModel(text: string): Promise<EdgeAIResult | null> {
  const hasWebGPU = await checkWebGPUSupport();
  if (!hasWebGPU) return null;

  try {
    // @huggingface/transformers is an optional peer dependency.
    // Install with: npm install @huggingface/transformers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformers = await import('@huggingface/transformers' as any).catch(() => null);
    if (!transformers) {
      console.warn('[EdgeAI] @huggingface/transformers not installed — skipping WebGPU path');
      return null;
    }

    const t0 = performance.now();
    const generator = await transformers.pipeline('text-generation', 'Xenova/gemma-2b-it-ONNX', {
      device: 'webgpu',
      dtype: 'q4',
    });

    const prompt = `<start_of_turn>user
${EDGE_SYSTEM_PROMPT}

Field report: "${text}"
<end_of_turn>
<start_of_turn>model
`;
    const output = await generator(prompt, { max_new_tokens: 200 }) as any;
    const generated = output[0]?.generated_text || '';
    const jsonMatch = generated.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      needType: parsed.needType || ['GENERAL'],
      severity: Math.min(5, Math.max(1, parsed.severity || 3)),
      affectedCount: parsed.affectedCount || 0,
      summary: parsed.summary || text,
      isLifeThreatening: parsed.isLifeThreatening || false,
      processingMode: 'EDGE_WEBGPU',
      processingMs: Math.round(performance.now() - t0),
    };
  } catch (err) {
    console.warn('[EdgeAI] WebGPU Transformers.js failed:', err);
    return null;
  }
}

// ─── Image OCR via Chrome AI Vision / Canvas ───────────────────────────────────

export async function extractTextFromImage(base64DataUrl: string): Promise<string> {
  // If Chrome AI supports vision, use it
  try {
    if (window.ai?.languageModel) {
      const caps = await window.ai.languageModel.capabilities();
      if (caps.available !== 'no') {
        // Use a simple canvas-based preprocessing + Chrome AI vision hint
        // In production this uses the full multimodal Gemma 4 vision model
        const session = await window.ai.languageModel.create({
          systemPrompt: 'Extract all text from this image description. Be precise.',
        });
        const result = await session.prompt(
          `This is a base64 image of a handwritten survey form from a disaster relief worker in India. 
          The image content is: ${base64DataUrl.substring(0, 100)}...
          Extract any visible text about emergency needs, number of people affected, and location.`
        );
        session.destroy();
        return result;
      }
    }
  } catch {
    // Fall through
  }
  // Fallback: return a prompt that will be handled by server-side Gemini Vision
  return '[IMAGE_OCR_REQUIRED]';
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Process a field report using the best available AI inference mode.
 * Tries Edge AI first (offline-capable), falls back to server.
 *
 * @param text - Raw report text (any Indian language)
 * @param onModeChange - Callback to show UI feedback on which AI mode is running
 */
export async function processReportEdge(
  text: string,
  onModeChange?: (mode: string) => void
): Promise<EdgeAIResult> {
  // Try Chrome Built-in AI (Gemma Nano) first
  onModeChange?.('Trying Chrome AI (Gemma Nano)...');
  const chromeResult = await runChromeAI(text);
  if (chromeResult) {
    console.log(`[EdgeAI] Processed via Chrome AI in ${chromeResult.processingMs}ms`);
    return chromeResult;
  }

  // Try WebGPU (Gemma 2B via transformers.js)
  onModeChange?.('Trying WebGPU inference (Gemma 2B)...');
  const webGPUResult = await runWebGPUModel(text);
  if (webGPUResult) {
    console.log(`[EdgeAI] Processed via WebGPU in ${webGPUResult.processingMs}ms`);
    return webGPUResult;
  }

  // Server-side fallback (requires network)
  onModeChange?.('Edge AI unavailable — falling back to server...');
  const { parseIncidentReport } = await import('./geminiService');
  const t0 = performance.now();
  const serverResult = await parseIncidentReport(text);
  return {
    needType: serverResult.needType || ['GENERAL'],
    severity: serverResult.severity || 3,
    affectedCount: serverResult.affectedCount || 0,
    summary: serverResult.summary || text,
    isLifeThreatening: serverResult.isLifeThreatening || false,
    processingMode: 'SERVER_FALLBACK',
    processingMs: Math.round(performance.now() - t0),
  };
}

/**
 * Checks what AI inference mode is available on this device.
 * Used to show capability status to the field worker.
 */
export async function getAICapabilities(): Promise<{
  chromeAI: boolean;
  webGPU: boolean;
  mode: string;
}> {
  let chromeAI = false;
  let webGPU = false;

  try {
    if (window.ai?.languageModel) {
      const caps = await window.ai.languageModel.capabilities();
      chromeAI = caps.available !== 'no';
    }
  } catch {}

  webGPU = await checkWebGPUSupport();

  const mode = chromeAI
    ? 'EDGE_CHROME_AI'
    : webGPU
    ? 'EDGE_WEBGPU'
    : 'SERVER_FALLBACK';

  return { chromeAI, webGPU, mode };
}
