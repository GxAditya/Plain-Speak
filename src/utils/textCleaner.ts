/**
 * Text cleaning utilities for AI responses
 * Removes markdown formatting characters while preserving bullet points and content structure
 */

/**
 * Clean AI response text by removing only markdown formatting asterisks and underscores
 * while preserving bullet points, hyphens, and underscores within words
 */
export function cleanAIResponse(text: string): string {
  if (!text) return '';
  
  return text
    // Remove markdown bold formatting (**text**)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove markdown italic formatting (*text*) but preserve bullet points
    // Only remove asterisks that are surrounded by word characters or spaces for emphasis
    .replace(/(\s)\*([^*\n]+)\*(\s|$)/g, '$1$2$3')
    // Remove markdown bold with underscores (__text__)
    .replace(/__([^_]+)__/g, '$1')
    // Remove markdown italic with underscores (_text_) but preserve underscores in words
    // Only remove underscores that are used for emphasis (surrounded by spaces or word boundaries)
    .replace(/(\s|^)_([^_\n]+)_(\s|$)/g, '$1$2$3')
    // Clean up any remaining standalone asterisks that aren't bullet points
    // This preserves "* item" but removes standalone "*"
    .replace(/(?<!^|\s)\*(?!\s)/g, '')
    // Trim whitespace from start and end
    .trim();
}

/**
 * Alternative function for more aggressive cleaning if needed
 */
export function cleanAIResponseAggressive(text: string): string {
  if (!text) return '';
  
  return text
    // Remove all asterisks except those used as bullet points
    .replace(/\*+/g, '')
    // Remove double underscores
    .replace(/_{2,}/g, '')
    .trim();
}