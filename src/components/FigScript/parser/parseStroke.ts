// src/components/FigScript/parser/parseStroke.ts
import { FigScriptToken, FigScriptParseResult } from './types';
import { tokenizeFigScriptString, createParseResult, parseNumericValue, isKeyValuePair } from './utils';

// Define specific stroke-related types/interfaces if needed, or use general ones.

/**
 * Parses the FigScript Stroke prop string into Tailwind CSS classes and validation messages.
 *
 * FigScript Syntax for Stroke (from FigScript Mappings document):
 * Stroke={
 * color={tailwind-color, #HEX}, // required
 * opacity={0-100},             // required (default is 100)
 * position={center},           // optional (default is center)
 * weight={all-#px, t-#px(⬆️), b-#px(⬇️), l-#px(⬅️), r-#px(➡️)}, // required
 * }
 *
 * Collapsed examples:
 * Stroke={tailwind-color, 100%, center, ⬆️1px, ⬇️2px, ➡️3px, ⬅️4px}
 * Stroke={#HEX, 50%, all-2px}
 *
 * @param {string | undefined} strokeString - The Stroke prop value from FigScript.
 * @returns {FigScriptParseResult} An object containing Tailwind classes, errors, and warnings.
 */
export const parseStroke = (strokeString?: string): FigScriptParseResult => {
  const result = createParseResult();
  if (!strokeString?.trim()) {
    // Stroke is optional, so not providing it is not an error.
    // However, if it's an empty string, we might consider it an attempt to define an empty stroke.
    // For now, just return empty if nothing is provided.
    return result;
  }

  const tokens = tokenizeFigScriptString(strokeString);

  // --- Validation Flags ---
  let colorDefined = false;
  let opacityDefined = false; // Though it has a default, explicit definition can be tracked.
  let weightDefined = false;
  // `position` is optional with a default, so no strict validation flag needed unless an invalid value is given.

  // --- Helper to add border classes ---
  // Ensures a base 'border' class is added if any border property is set.
  const addBorderClass = () => {
    if (!result.classes.includes('border') && !result.classes.some(c => c.startsWith('border-'))) {
        // Only add 'border' if specific side borders aren't already defining it.
        // For example, 'border-t-2' implies 'border-t', not necessarily 'border'.
        // Tailwind typically requires a base 'border' or specific side like 'border-t' for width to apply.
        // Let's refine this: if any weight is applied, a border style is needed.
        // Tailwind's default border style is solid.
    }
  };


  tokens.forEach(token => {
    let key: string | null = null;
    let value: string | null = null;

    if (isKeyValuePair(token)) {
      key = token.key.toLowerCase();
      value = token.value;
    } else {
      // This is a collapsed/shorthand token
      // We need to infer its type (color, opacity, weight, position)
      // For now, we'll try to match patterns.
      value = token; // The token itself is the value.
    }

    if (value === null) {
        result.errors.push(`Invalid token format: ${JSON.stringify(token)}`);
        return;
    }

    // 1. Parse Color
    if (key === 'color' || (!key && (value.startsWith('#') || value.startsWith('tailwind-') || value.startsWith('bg-') || value.startsWith('border-')))) {
      if (colorDefined) {
        result.warnings.push(`Stroke color defined multiple times. Last definition used: "${value}".`);
        // Remove previous color classes if any
        result.classes = result.classes.filter(c => !c.startsWith('border-') || c.startsWith('border-opacity-') || c.startsWith('border-w-') || c.startsWith('border-t-') || c.startsWith('border-b-') || c.startsWith('border-l-') || c.startsWith('border-r-') || c.match(/^border-\[\d+px\]$/) || c.match(/^border-(t|b|l|r)-\[\d+px\]$/) );
      }
      if (value.startsWith('#')) {
        if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
          result.classes.push(`border-[${value}]`);
          colorDefined = true;
        } else {
          result.errors.push(`Invalid hex color format for stroke: "${value}".`);
        }
      } else if (value.startsWith('tailwind-')) { // Assuming 'tailwind-red-500' maps to 'border-red-500'
        result.classes.push(`border-${value.substring('tailwind-'.length)}`);
        colorDefined = true;
      } else if (value.startsWith('border-')) { // Direct Tailwind border color
          result.classes.push(value);
          colorDefined = true;
      } else if (value.startsWith('bg-')) { // Allow using bg- for border color for convenience
          result.classes.push(`border-${value.substring('bg-'.length)}`);
          colorDefined = true;
      }
      else {
        result.errors.push(`Unsupported stroke color token: "${value}". Use #HEX, tailwind-color, or border-color.`);
      }
    }
    // 2. Parse Opacity
    else if (key === 'opacity' || (!key && (value.endsWith('%') || /^(0|100)$/.test(value) || value.startsWith('opacity-')) ) ) {
      let opacityValueStr = value;
      if (key === 'opacity') {
        opacityValueStr = value;
      } else if (value.startsWith('opacity-')) {
        opacityValueStr = value.substring('opacity-'.length);
      } else if (value.endsWith('%')) {
        opacityValueStr = value.slice(0, -1);
      }

      const numeric = parseNumericValue(opacityValueStr);
      if (numeric && numeric.unit === null && numeric.value >= 0 && numeric.value <= 100) {
        result.classes = result.classes.filter(c => !c.startsWith('border-opacity-')); // Remove previous
        result.classes.push(`border-opacity-${numeric.value}`);
        opacityDefined = true;
      } else {
        result.errors.push(`Invalid stroke opacity value: "${value}". Must be 0-100 or a percentage like "50%".`);
      }
    }
    // 3. Parse Position
    else if (key === 'position' || value === 'center') {
      if (value.toLowerCase() === 'center') {
        // Standard CSS borders are 'center' by default (or 'inside' with border-box).
        // No specific Tailwind class is typically needed for 'center'.
        // We can add a comment or a validation note if desired.
        // For now, we just acknowledge it.
      } else {
        result.errors.push(`Invalid stroke position: "${value}". Only "center" is supported.`);
      }
    }
    // 4. Parse Weight
    else if (
        key === 'weight' ||
        (!key && (
            value.startsWith('all-') ||
            value.startsWith('t-') || value.startsWith('⬆️') ||
            value.startsWith('b-') || value.startsWith('⬇️') ||
            value.startsWith('l-') || value.startsWith('⬅️') ||
            value.startsWith('r-') || value.startsWith('➡️')
        ))
    ) {
        const processWeight = (weightToken: string) => {
            if (weightToken.startsWith('all-')) {
                const valStr = weightToken.substring('all-'.length);
                const numeric = parseNumericValue(valStr);
                if (numeric && numeric.unit === 'px') {
                    result.classes = result.classes.filter(c => !(/^border-\[\d+px\]$/.test(c) || /^border-(t|b|l|r)-\[\d+px\]$/.test(c) || /^border-(t|b|l|r)$/.test(c) || c === 'border' || c.startsWith('border-w-')));
                    result.classes.push(`border-[${numeric.value}px]`);
                    weightDefined = true;
                } else {
                    result.errors.push(`Invalid stroke weight format for "all": "${weightToken}". Use "all-#px".`);
                }
            } else {
                let side: 't' | 'b' | 'l' | 'r' | null = null;
                let valStr: string | null = null;

                if (weightToken.startsWith('t-') || weightToken.startsWith('⬆️')) {
                    side = 't';
                    valStr = weightToken.startsWith('t-') ? weightToken.substring('t-'.length) : weightToken.substring('⬆️'.length);
                } else if (weightToken.startsWith('b-') || weightToken.startsWith('⬇️')) {
                    side = 'b';
                    valStr = weightToken.startsWith('b-') ? weightToken.substring('b-'.length) : weightToken.substring('⬇️'.length);
                } else if (weightToken.startsWith('l-') || weightToken.startsWith('⬅️')) {
                    side = 'l';
                    valStr = weightToken.startsWith('l-') ? weightToken.substring('l-'.length) : weightToken.substring('⬅️'.length);
                } else if (weightToken.startsWith('r-') || weightToken.startsWith('➡️')) {
                    side = 'r';
                    valStr = weightToken.startsWith('r-') ? weightToken.substring('r-'.length) : weightToken.substring('➡️'.length);
                }

                if (side && valStr) {
                    const numeric = parseNumericValue(valStr);
                    if (numeric && numeric.unit === 'px') {
                        // Remove general border width if specific side is set
                        result.classes = result.classes.filter(c => !(/^border-\[\d+px\]$/.test(c) || c.startsWith('border-w-') ));
                        // Remove potentially conflicting specific side
                        result.classes = result.classes.filter(c => !c.startsWith(`border-${side}-`) && !c.startsWith(`border-${side}-[`) );
                        result.classes.push(`border-${side}-[${numeric.value}px]`);
                        weightDefined = true;
                    } else {
                        result.errors.push(`Invalid stroke weight format for side "${side}": "${weightToken}". Use "side-#px" or "EMOJI#px".`);
                    }
                } else if (!side && key !== 'weight') { // Only error if it's a shorthand that didn't match
                     result.errors.push(`Unknown stroke weight token: "${weightToken}".`);
                }
            }
        };

        if (key === 'weight' && value.includes(',')) { // e.g. weight={t-1px, b-2px}
            value.split(',').map(v => v.trim()).forEach(processWeight);
        } else {
            processWeight(value);
        }
    }
    // Unknown token
    else if (key === null) { // Only consider it unknown if it's a shorthand that didn't match any category
        result.warnings.push(`Unknown or misplaced stroke token: "${value}".`);
    }
  });

  // --- Post-Parsing Validation ---
  if (!colorDefined) {
    result.errors.push('Stroke "color" is required.');
  }
  if (!weightDefined) {
    result.errors.push('Stroke "weight" is required.');
  }
  // Opacity has a default of 100, so not defining it is fine.
  // If opacity was not defined, and we want to ensure Tailwind's default (which is 100% via border-opacity-100 if not set, or just direct color),
  // we might not need to add anything unless a non-100 default was desired.
  // For now, if not defined, it implies 100% opacity for the color.

  // Ensure base border class if any stroke property was applied
  if (result.classes.length > 0 && !result.classes.some(c => c.startsWith('border-') || c === 'border')) {
      // If specific sides are used (e.g. border-t-2), they imply a border on that side.
      // If a general border width (border-[2px]) or color (border-red-500) is used,
      // Tailwind might need a 'border' or 'border-solid' for it to show.
      // Modern Tailwind often infers this, but being explicit can be safer.
      // Let's add 'border-solid' as a default style if any border attributes are present.
      // This is safer than just 'border' which might conflict with individual side settings.
      if (result.classes.some(c => c.startsWith("border-["))) { // e.g. border-[#HEX], border-[10px]
          // Check if any specific side border is defined, or general width/color
          if (!result.classes.some(c => c.startsWith("border-t-") || c.startsWith("border-b-") || c.startsWith("border-l-") || c.startsWith("border-r-"))){
                // If no specific side is set, but a general width/color is, add `border` to apply it to all sides.
                result.classes.unshift('border');
          }
      }
       // If individual sides are styled (e.g., border-t-[2px]), they inherently apply.
       // If a color like `border-red-500` is set, it needs a width to apply.
       // If a width like `border-[2px]` is set, it needs a color (defaults to current text color or a theme color).
       // Tailwind's preflight usually sets border-style: solid and border-color: currentColor.
       // So, `border-[2px]` would show up. `border-red-500` would need a width.

       // If color AND weight are defined, the border should appear.
       // No need to add 'border' or 'border-solid' explicitly unless Tailwind version requires it.
       // Let's assume modern Tailwind handles this well.
  }


  // Remove duplicates
  result.classes = Array.from(new Set(result.classes));

  return result;
};
