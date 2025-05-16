// src/components/FigScript/parser/utils.ts
/**
 * Tokenizes a FigScript prop string into an array of individual values.
 * Splits by comma and trims whitespace.
 * @param {string | undefined} inputString - The string to tokenize.
 * @returns {string[]} An array of tokens.
 */
export const tokenizeFigScriptString = (inputString?: string): string[] => {
  if (!inputString) {
    return [];
  }
  return inputString.split(',').map(token => token.trim()).filter(token => token.length > 0);
};