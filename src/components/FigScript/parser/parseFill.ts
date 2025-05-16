// src/components/FigScript/parser/parseFill.ts
import { tokenizeFigScriptString } from './utils';

/**
 * Parses the Fill prop string into Tailwind CSS classes for background.
 * @param {string | undefined} fillString - The Fill prop value.
 * @returns {string[]} An array of Tailwind classes.
 */
export const parseFill = (fillString?: string): string[] => {
  const tokens = tokenizeFigScriptString(fillString);
  const classes: string[] = [];

  tokens.forEach(token => {
    if (token.startsWith('layer-')) {
      classes.push(`bg-${token}`);
    } else if (token.startsWith('bg-')) {
      classes.push(token);
    } else if (token.startsWith('#')) {
      // Ensure it's a valid hex color, basic check
      if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(token)) {
         classes.push(`bg-[${token}]`);
      }
    }
    // Add support for text color if desired, e.g. text-layer-1, text-[#FFF]
    // else if (token.startsWith('text-layer-')) classes.push(`text-${token.substring(5)}`);
    // else if (token.startsWith('text-#')) classes.push(`text-[${token.substring(5)}]`);
  });
  return classes;
};