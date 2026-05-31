export class OCRPromptCache {
  private static cachedPromptHash: string | null = null;
  private static sessionCacheHits: number = 0;

  /**
   * Evaluates if a system prompt block is identical to the last run, 
   * allowing the inference engine to skip prompt-processing (KV Cache reuse).
   */
  public static checkCache(promptContent: string): { isHit: boolean; cacheId: string } {
    // Generate a simple hash of the prompt string
    let hash = 0;
    for (let i = 0; i < promptContent.length; i++) {
      hash = ((hash << 5) - hash) + promptContent.charCodeAt(i);
      hash |= 0; 
    }
    const hashStr = `pt_cache_${Math.abs(hash)}`;

    if (this.cachedPromptHash === hashStr) {
      this.sessionCacheHits++;
      console.log(`[OCRPromptCache] Cache HIT! Reuse KV cache for faster Time-To-First-Token. (Total Hits: ${this.sessionCacheHits})`);
      return { isHit: true, cacheId: hashStr };
    }

    console.log(`[OCRPromptCache] Cache MISS. Tokenizing new prompt prefix.`);
    this.cachedPromptHash = hashStr;
    return { isHit: false, cacheId: hashStr };
  }

  public static getMetrics(): { hits: number } {
    return { hits: this.sessionCacheHits };
  }
}
