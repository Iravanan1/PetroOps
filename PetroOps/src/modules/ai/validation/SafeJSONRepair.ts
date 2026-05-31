export class SafeJSONRepair {
  /**
   * Cleans raw text containing JSON or malformed JSON and attempts to repair it.
   */
  public static repair(raw: string): string {
    if (!raw) return "{}";

    let cleaned = raw.trim();

    // 1. Strip Markdown code blocks and backticks if present
    cleaned = cleaned.replace(/```(?:json)?/gi, "");
    cleaned = cleaned.replace(/``/g, "");
    cleaned = cleaned.trim();

    // 2. Remove leading/trailing non-JSON text before and after the outer braces
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1) {
      if (lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      } else {
        cleaned = cleaned.substring(firstBrace);
      }
    }

    // 3. Convert single quotes to double quotes for keys and string values
    cleaned = cleaned.replace(/([{,]\s*)'([a-zA-Z0-9_]+)'\s*:/g, '$1"$2":');
    cleaned = cleaned.replace(/:\s*'([^']*)'/g, ':"$1"');

    // 4. Fix unquoted keys (e.g. { openingCash: 12000 } -> { "openingCash": 12000 })
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, prefix, key) => {
      return `${prefix}"${key}":`;
    });

    // 5. Clean up trailing commas inside incomplete objects and arrays
    cleaned = cleaned.replace(/,\s*}/g, "}");
    cleaned = cleaned.replace(/,\s*\]/g, "]");
    
    // Strip trailing comma if it is at the very end of a cut-off string
    cleaned = cleaned.replace(/,\s*$/g, "");

    // 6. Balance trailing braces or brackets if incomplete
    let openBraces = 0;
    let openBrackets = 0;
    
    // Track if we are inside a string to avoid counting braces inside quotes
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '"' && !escape) {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === "{") openBraces++;
        else if (char === "}") openBraces = Math.max(0, openBraces - 1);
        else if (char === "[") openBrackets++;
        else if (char === "]") openBrackets = Math.max(0, openBrackets - 1);
      }
      
      escape = char === "\\" && !escape;
    }

    // Append missing closures
    while (openBraces > 0) {
      cleaned += "}";
      openBraces--;
    }
    while (openBrackets > 0) {
      cleaned += "]";
      openBrackets--;
    }

    return cleaned;
  }

  /**
   * Attempts to parse raw text as JSON, performing aggressive repairs if necessary.
   * If parsing still fails, returns a fallback object instead of throwing.
   */
  public static safeParse<T>(raw: string, fallback: T): T {
    if (!raw || !raw.trim()) {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn("[SafeJSONRepair] Standard parse failed, attempting regex/brace repair...");
      try {
        const repaired = this.repair(raw);
        return JSON.parse(repaired) as T;
      } catch (err) {
        console.error("[SafeJSONRepair] Critical parsing recovery failure, applying structural default fallback:", err);
        return fallback;
      }
    }
  }
}
