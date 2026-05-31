"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
async function retryWithBackoff(fn, retries = 3, delay = 1000, backoff = 2) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await fn();
        }
        catch (error) {
            attempt++;
            if (attempt >= retries) {
                throw error;
            }
            console.warn(`[Retry] Attempt ${attempt} failed. Retrying in ${delay}ms...`, error);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= backoff;
        }
    }
    throw new Error("Retry failed");
}
