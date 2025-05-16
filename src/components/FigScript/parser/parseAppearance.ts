// src/components/FigScript/parser/parseAppearance.ts
import { tokenizeFigScriptString } from './utils';

/**
 * Parses the Appearance prop string into Tailwind CSS classes.
 * @param {string | undefined} appearanceString - The Appearance prop value.
 * @returns {string[]} An array of Tailwind classes.
 */
export const parseAppearance = (appearanceString?: string): string[] => {
  const tokens = tokenizeFigScriptString(appearanceString);
  const classes: string[] = [];

  tokens.forEach(token => {
    if (token.startsWith('opacity-')) {
      classes.push(token);
    } else if (token.startsWith('corner-')) {
      const value = token.split('-')[1];
      if (value) classes.push(`rounded-[${value}px]`);
    }
    // Add more appearance properties here, e.g., for borders, shadows
    // else if (token.startsWith('border')) classes.push(token); // e.g. border, border-2, border-blue-500
    // else if (token.startsWith('shadow')) classes.push(token); // e.g. shadow-md, shadow-lg
  });
  return classes;
};
