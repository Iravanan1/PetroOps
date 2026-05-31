/**
 * LocalAIOfflineProxy.ts
 * ───────────────────────
 * Routes AI inference requests to:
 *  1. Local Ollama server (preferred when available, fully offline)
 *  2. Local Qwen / GGUF model via LM Studio HTTP API
 *  3. PumpAI backend API (when online)
 *  4. Graceful degradation: returns cached result or null
 *
 * This ensures OCR extraction and AI advice remain available without internet.
 */

// ─── TYPES ───────────────────────────────────────────────────────────────────────

export type AIEndpointType = 'ollama' | 'lm_studio' | 'backend' | 'none';

export interface AIEndpointStatus {
  type:       AIEndpointType;
  url:        string;
  available:  boolean;
  modelName?: string;
  latencyMs?: number;
}

export interface LocalAIRequest {
  prompt:       string;
  systemPrompt?: string;
  model?:        string;
  maxTokens?:    number;
  temperature?:  number;
  imageBase64?:  string; // For multimodal / OCR requests
  context?:      Record<string, any>;
}

export interface LocalAIResponse {
  text:           string;
  model:          string;
  endpointUsed:   AIEndpointType;
  latencyMs:      number;
  cached:         boolean;
  error?:         string;
}

// ─── CONFIGURATION ────────────────────────────────────────────────────────────────

const DEFAULT_OLLAMA_URL    = 'http://127.0.0.1:11434';
const DEFAULT_LMSTUDIO_URL  = 'http://127.0.0.1:1234';
const DEFAULT_BACKEND_URL   = 'http://localhost:3001';
const DEFAULT_OLLAMA_MODEL  = 'qwen2.5:7b';
const PROBE_TIMEOUT_MS      = 3000;  // How long to wait when probing local endpoints
const CACHE_KEY_PREFIX      = 'pumpai_ai_cache_';
const CACHE_MAX_ENTRIES     = 50;

// ─── RESPONSE CACHE ──────────────────────────────────────────────────────────────

function getCacheKey(req: LocalAIRequest): string {
  const raw = `${req.prompt}|${req.model}|${req.imageBase64?.slice(0, 100)}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${CACHE_KEY_PREFIX}${(h >>> 0).toString(16)}`;
}

function getCachedResponse(key: string): string | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { text, ts } = JSON.parse(raw);
    // Cache valid for 30 minutes
    if (Date.now() - ts > 30 * 60_000) { sessionStorage.removeItem(key); return null; }
    return text;
  } catch { return null; }
}

function setCachedResponse(key: string, text: string): void {
  try {
    // Prune oldest if over limit
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    if (keys.length >= CACHE_MAX_ENTRIES) {
      sessionStorage.removeItem(keys[0]);
    }
    sessionStorage.setItem(key, JSON.stringify({ text, ts: Date.now() }));
  } catch {}
}

// ─── MAIN SERVICE ────────────────────────────────────────────────────────────────

export class LocalAIOfflineProxy {
  private static ollamaUrl   = DEFAULT_OLLAMA_URL;
  private static lmStudioUrl = DEFAULT_LMSTUDIO_URL;
  private static backendUrl  = DEFAULT_BACKEND_URL;
  private static defaultModel= DEFAULT_OLLAMA_MODEL;

  private static lastProbeResults: Map<AIEndpointType, AIEndpointStatus> = new Map();
  private static probeInProgress = false;

  // ─── CONFIGURATION ────────────────────────────────────────────────────────────

  static configure(config: {
    ollamaUrl?:   string;
    lmStudioUrl?: string;
    backendUrl?:  string;
    defaultModel?:string;
  }): void {
    if (config.ollamaUrl)    this.ollamaUrl    = config.ollamaUrl;
    if (config.lmStudioUrl)  this.lmStudioUrl  = config.lmStudioUrl;
    if (config.backendUrl)   this.backendUrl   = config.backendUrl;
    if (config.defaultModel) this.defaultModel = config.defaultModel;
  }

  // ─── PROBE ALL ENDPOINTS ──────────────────────────────────────────────────────

  static async probeAllEndpoints(): Promise<AIEndpointStatus[]> {
    if (this.probeInProgress) return Array.from(this.lastProbeResults.values());
    this.probeInProgress = true;

    const results = await Promise.allSettled([
      this.probeOllama(),
      this.probeLMStudio(),
      this.probeBackend()
    ]);

    results.forEach(r => {
      if (r.status === 'fulfilled') {
        this.lastProbeResults.set(r.value.type, r.value);
      }
    });

    this.probeInProgress = false;
    return Array.from(this.lastProbeResults.values());
  }

  private static async probeOllama(): Promise<AIEndpointStatus> {
    const start = Date.now();
    try {
      const resp = await fetch(`${this.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
      });
      if (!resp.ok) throw new Error('Bad status');
      const data = await resp.json();
      const models: string[] = (data.models || []).map((m: any) => m.name);
      return {
        type:       'ollama',
        url:        this.ollamaUrl,
        available:  true,
        modelName:  models[0] || this.defaultModel,
        latencyMs:  Date.now() - start
      };
    } catch {
      return { type: 'ollama', url: this.ollamaUrl, available: false };
    }
  }

  private static async probeLMStudio(): Promise<AIEndpointStatus> {
    const start = Date.now();
    try {
      const resp = await fetch(`${this.lmStudioUrl}/v1/models`, {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
      });
      if (!resp.ok) throw new Error('Bad status');
      const data = await resp.json();
      const model = data.data?.[0]?.id || 'lm-studio-model';
      return {
        type:       'lm_studio',
        url:        this.lmStudioUrl,
        available:  true,
        modelName:  model,
        latencyMs:  Date.now() - start
      };
    } catch {
      return { type: 'lm_studio', url: this.lmStudioUrl, available: false };
    }
  }

  private static async probeBackend(): Promise<AIEndpointStatus> {
    const start = Date.now();
    try {
      const resp = await fetch(`${this.backendUrl}/api/health`, {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
      });
      if (!resp.ok) throw new Error('Bad status');
      return {
        type:       'backend',
        url:        this.backendUrl,
        available:  true,
        latencyMs:  Date.now() - start
      };
    } catch {
      return { type: 'backend', url: this.backendUrl, available: false };
    }
  }

  // ─── MAIN INFERENCE METHOD ───────────────────────────────────────────────────

  /**
   * Send an AI request, routing to the best available local or remote endpoint.
   * Falls back through: Ollama → LM Studio → Backend → cache → null.
   */
  static async complete(request: LocalAIRequest): Promise<LocalAIResponse> {
    const cacheKey = getCacheKey(request);
    const cached   = getCachedResponse(cacheKey);

    if (cached) {
      return {
        text:         cached,
        model:        'cached',
        endpointUsed: 'none',
        latencyMs:    0,
        cached:       true
      };
    }

    // Try endpoints in priority order
    const attempts: Array<() => Promise<LocalAIResponse>> = [
      () => this.callOllama(request),
      () => this.callLMStudio(request),
      () => this.callBackend(request)
    ];

    for (const attempt of attempts) {
      try {
        const result = await attempt();
        if (result.text) {
          setCachedResponse(cacheKey, result.text);
          return result;
        }
      } catch (err) {
        // Try next endpoint
        console.warn('[LocalAIOfflineProxy] Endpoint failed, trying next:', err);
      }
    }

    return {
      text:         '',
      model:        'none',
      endpointUsed: 'none',
      latencyMs:    0,
      cached:       false,
      error:        'All AI endpoints unavailable. Check Ollama or network connection.'
    };
  }

  // ─── OLLAMA ENDPOINT ──────────────────────────────────────────────────────────

  private static async callOllama(request: LocalAIRequest): Promise<LocalAIResponse> {
    const start = Date.now();
    const model = request.model || this.defaultModel;

    const body: Record<string, any> = {
      model,
      prompt:  request.prompt,
      stream:  false,
      options: {
        num_predict: request.maxTokens || 1024,
        temperature: request.temperature ?? 0.1
      }
    };

    if (request.systemPrompt) {
      body.system = request.systemPrompt;
    }

    // Multimodal: include base64 image for Qwen-VL / LLaVA models
    if (request.imageBase64) {
      body.images = [request.imageBase64];
    }

    const resp = await fetch(`${this.ollamaUrl}/api/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(60_000)
    });

    if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
    const data = await resp.json();

    return {
      text:         data.response || '',
      model:        `ollama/${model}`,
      endpointUsed: 'ollama',
      latencyMs:    Date.now() - start,
      cached:       false
    };
  }

  // ─── LM STUDIO ENDPOINT ───────────────────────────────────────────────────────

  private static async callLMStudio(request: LocalAIRequest): Promise<LocalAIResponse> {
    const start = Date.now();

    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    const userContent: any = request.imageBase64
      ? [
          { type: 'text',      text: request.prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${request.imageBase64}` } }
        ]
      : request.prompt;

    messages.push({ role: 'user', content: userContent });

    const resp = await fetch(`${this.lmStudioUrl}/v1/chat/completions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        messages,
        max_tokens:  request.maxTokens || 1024,
        temperature: request.temperature ?? 0.1,
        stream:      false
      }),
      signal: AbortSignal.timeout(60_000)
    });

    if (!resp.ok) throw new Error(`LM Studio HTTP ${resp.status}`);
    const data = await resp.json();

    return {
      text:         data.choices?.[0]?.message?.content || '',
      model:        data.model || 'lm-studio',
      endpointUsed: 'lm_studio',
      latencyMs:    Date.now() - start,
      cached:       false
    };
  }

  // ─── BACKEND API ENDPOINT ─────────────────────────────────────────────────────

  private static async callBackend(request: LocalAIRequest): Promise<LocalAIResponse> {
    const start = Date.now();

    const resp = await fetch(`${this.backendUrl}/api/v1/ai/complete`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        prompt:       request.prompt,
        systemPrompt: request.systemPrompt,
        model:        request.model,
        maxTokens:    request.maxTokens,
        temperature:  request.temperature,
        imageBase64:  request.imageBase64,
        context:      request.context
      }),
      signal: AbortSignal.timeout(45_000)
    });

    if (!resp.ok) throw new Error(`Backend API HTTP ${resp.status}`);
    const data = await resp.json();

    return {
      text:         data.text || data.result || '',
      model:        data.model || 'backend',
      endpointUsed: 'backend',
      latencyMs:    Date.now() - start,
      cached:       false
    };
  }

  // ─── CACHED STATUS ────────────────────────────────────────────────────────────

  static getLastProbeResults(): AIEndpointStatus[] {
    return Array.from(this.lastProbeResults.values());
  }

  static getBestAvailableEndpoint(): AIEndpointType {
    const results = this.getLastProbeResults();
    const available = results.filter(r => r.available).sort((a, b) => (a.latencyMs || 9999) - (b.latencyMs || 9999));
    return available[0]?.type || 'none';
  }

  static clearCache(): void {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(CACHE_KEY_PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
    console.log('[LocalAIOfflineProxy] AI response cache cleared.');
  }
}

export default LocalAIOfflineProxy;
