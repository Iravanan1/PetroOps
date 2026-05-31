/**
 * LearnedPhraseRepository.ts
 * 
 * Provides sub-string token matching and auto-fill suggestions for multi-word phrases.
 * Enhances handwriting auto-fills when operators type partial names or terms.
 */

import { HandwritingGlossary, GlossaryEntry } from './HandwritingGlossary';

export class LearnedPhraseRepository {
  /**
   * Search for multi-word or partial phrase suggestions
   */
  public static suggestPhrases(partialInput: string, stationTemplate: string): GlossaryEntry[] {
    if (!partialInput || partialInput.trim().length < 2) return [];

    const cleanInput = partialInput.trim().toLowerCase();
    const cleanTemplate = stationTemplate.trim().toUpperCase();
    const entries = HandwritingGlossary.getAllEntries();

    // Filter entries by station template matching and rawOCR or correctedValue sub-string match
    return entries.filter(e => {
      const matchesTemplate = e.stationTemplate.toUpperCase() === cleanTemplate || e.stationTemplate === 'custom';
      if (!matchesTemplate) return false;

      const rawMatch = e.rawOCR.toLowerCase().includes(cleanInput);
      const correctedMatch = e.correctedValue.toLowerCase().includes(cleanInput);
      const meaningMatch = e.normalizedMeaning.toLowerCase().includes(cleanInput);

      return rawMatch || correctedMatch || meaningMatch;
    });
  }

  /**
   * Evaluates if a word is part of a high-frequency phrase block
   */
  public static getHighFrequencyPhrases(stationTemplate: string, limit = 5): GlossaryEntry[] {
    const cleanTemplate = stationTemplate.trim().toUpperCase();
    const entries = HandwritingGlossary.getAllEntries();

    return entries
      .filter(e => e.stationTemplate.toUpperCase() === cleanTemplate || e.stationTemplate === 'custom')
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, limit);
  }
}
