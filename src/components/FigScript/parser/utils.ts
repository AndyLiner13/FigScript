// src/components/FigScript/parser/utils.ts
import { FigScriptParseResult, FigScriptToken } from './types';

/**
 * Tokenizes a FigScript prop string into an array of individual values or key-value pairs.
 * Splits by comma and trims whitespace.
 * Identifies key-value pairs separated by '='.
 *
 * @param {string | undefined} inputString - The string to tokenize.
 * @returns {FigScriptToken[]} An array of tokens (string or {key: string, value: string}).
 *
 * Example:
 * "prop1=value1, simpleToken, prop2 = value2 , 👁️"
 * becomes:
 * [
 * { key: 'prop1', value: 'value1' },
 * 'simpleToken',
 * { key: 'prop2', value: 'value2' },
 * '👁️'
 * ]
 */
export const tokenizeFigScriptString = (inputString?: string): FigScriptToken[] => {
  if (!inputString?.trim()) {
    return [];
  }

  // Split by comma, but not if the comma is inside parentheses (e.g., for collapsed corner radius)
  // This regex splits by commas that are not enclosed in parentheses.
  const tokens = inputString.split(/,(?![^()]*\))/g).map(token => token.trim()).filter(token => token.length > 0);

  return tokens.map(token => {
    const parts = token.split('=');
    if (parts.length === 2) {
      const key = parts[0].trim();
      const value = parts[1].trim();
      // Further processing for values that might be wrapped in {} (though the spec implies {} are for the overall prop)
      // For now, assume simple key=value or just value.
      return { key, value };
    }
    return token; // It's a simple value token
  });
};

/**
 * Helper function to create a standardized FigScriptParseResult object.
 * @param {string[]} [classes=[]] - Initial classes.
 * @param {string[]} [errors=[]] - Initial errors.
 * @param {string[]} [warnings=[]] - Initial warnings.
 * @returns {FigScriptParseResult} A new parse result object.
 */
export const createParseResult = (
  classes: string[] = [],
  errors: string[] = [],
  warnings: string[] = []
): FigScriptParseResult => ({
  classes,
  errors,
  warnings,
});

/**
 * Extracts a numerical value and unit (if any) from a string.
 * Primarily designed for 'px', 'deg', '%'.
 * @param {string} valueString - The string to parse (e.g., "10px", "90deg", "50%").
 * @returns {{ value: number; unit: string | null } | null} The parsed value and unit, or null if not parsable.
 */
export const parseNumericValue = (valueString: string): { value: number; unit: string | null } | null => {
  if (!valueString) return null;

  const match = valueString.match(/^(\d+(?:\.\d+)?)(px|deg|%)?$/);
  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: match[2] || null, // unit might be undefined if only a number is passed
    };
  }
  // Handle case for plain numbers (no unit)
  if (/^\d+(?:\.\d+)?$/.test(valueString)) {
      return {
          value: parseFloat(valueString),
          unit: null,
      };
  }
  return null;
};


/**
 * Checks if a token is a key-value pair.
 * Type guard for FigScriptToken.
 * @param token The token to check.
 * @returns True if the token is a key-value pair, false otherwise.
 */
export const isKeyValuePair = (token: FigScriptToken): token is { key: string; value: string } => {
  return typeof token === 'object' && token !== null && 'key' in token && 'value' in token;
};
