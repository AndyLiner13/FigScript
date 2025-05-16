// src/components/FigScript/parser/parseFill.ts
import { FigScriptToken, FigScriptParseResult } from './types';
import { tokenizeFigScriptString, createParseResult, parseNumericValue, isKeyValuePair } from './utils';

/**
 * Parses the FigScript Fill prop string into Tailwind CSS classes and validation messages.
 *
 * FigScript Syntax for Fill (from FigScript Mappings document):
 * Fill={
 * type={solid, image},        // required
 * color={tailwind-color/#HEX}, // optional (only if type=solid)
 * opacity={0-100}              // required
 * }
 *
 * Collapsed examples:
 * Fill={solid, tailwind-color, 100%}
 * Fill={image, url(...), 50%} // Assuming url(...) for image type
 *
 * @param {string | undefined} fillString - The Fill prop value from FigScript.
 * @returns {FigScriptParseResult} An object containing Tailwind classes, errors, and warnings.
 */
export const parseFill = (fillString?: string): FigScriptParseResult => {
  const result = createParseResult();

  if (!fillString?.trim()) {
    // Fill is optional. If not provided, no classes or errors.
    return result;
  }

  const tokens = tokenizeFigScriptString(fillString);

  let typeDefined: 'solid' | 'image' | null = null;
  let colorDefined = false;
  let opacityDefined = false;
  let imageUrl: string | null = null;

  tokens.forEach(token => {
    let key: string | null = null;
    let value: string | null = null;
    let isShorthand = false;

    if (isKeyValuePair(token)) {
      key = token.key.toLowerCase();
      value = token.value;
    } else {
      value = token; // The token itself is the value for shorthand
      isShorthand = true;
    }

    if (value === null) {
      result.errors.push(`Invalid token format in Fill: ${JSON.stringify(token)}`);
      return;
    }

    // 1. Parse Type
    if (key === 'type' || (isShorthand && (value === 'solid' || value === 'image'))) {
      if (value === 'solid') {
        typeDefined = 'solid';
      } else if (value === 'image') {
        typeDefined = 'image';
        // If type is image, subsequent color tokens should be ignored or treated as error
        if (colorDefined) {
            result.warnings.push('Color was defined before type=image; color will be ignored for image fill.');
            result.classes = result.classes.filter(c => !c.startsWith('bg-') || c.startsWith('bg-opacity-') || c.startsWith('bg-[url('));
            colorDefined = false;
        }
      } else {
        result.errors.push(`Invalid fill type: "${value}". Must be "solid" or "image".`);
      }
    }
    // 2. Parse Color (only if type is solid or not yet defined as image)
    else if (key === 'color' || (isShorthand && (value.startsWith('#') || value.startsWith('tailwind-') || value.startsWith('layer-') || value.startsWith('bg-')))) {
      if (typeDefined === 'image') {
        result.warnings.push(`Fill color token "${value}" ignored because fill type is "image".`);
        return;
      }
      if (colorDefined) {
        result.warnings.push(`Fill color defined multiple times. Last definition used: "${value}".`);
        result.classes = result.classes.filter(c => !c.startsWith('bg-') || c.startsWith('bg-opacity-') || c.startsWith('bg-[url('));
      }

      if (value.startsWith('#')) {
        if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
          result.classes.push(`bg-[${value}]`);
          colorDefined = true;
        } else {
          result.errors.push(`Invalid hex color format for fill: "${value}".`);
        }
      } else if (value.startsWith('tailwind-')) {
        result.classes.push(`bg-${value.substring('tailwind-'.length)}`);
        colorDefined = true;
      } else if (value.startsWith('layer-')) { // From original parseFill
        result.classes.push(`bg-${value}`);
        colorDefined = true;
      } else if (value.startsWith('bg-')) { // Direct Tailwind bg color
        result.classes.push(value);
        colorDefined = true;
      } else {
         result.errors.push(`Unsupported fill color token: "${value}". Use #HEX, tailwind-color, layer-color, or bg-color.`);
      }
      if (colorDefined && !typeDefined) typeDefined = 'solid'; // Infer type solid if color is set
    }
    // 3. Parse Opacity
    else if (key === 'opacity' || (isShorthand && (value.endsWith('%') || /^\d+$/.test(value) || value.startsWith('opacity-')))) {
      let opacityValueStr = value;
      if (key === 'opacity') {
        opacityValueStr = value;
      } else if (isShorthand && value.startsWith('opacity-')) { // e.g. opacity-50 (general opacity, not bg-opacity)
        opacityValueStr = value.substring('opacity-'.length);
      } else if (isShorthand && value.endsWith('%')) {
        opacityValueStr = value.slice(0, -1);
      }

      const numeric = parseNumericValue(opacityValueStr);
      if (numeric && numeric.unit === null && numeric.value >= 0 && numeric.value <= 100) {
        if (opacityDefined) {
            result.warnings.push(`Fill opacity defined multiple times. Last definition used: "${value}".`);
            result.classes = result.classes.filter(c => !c.startsWith('bg-opacity-'));
        }
        // For background opacity, Tailwind uses bg-opacity-
        result.classes.push(`bg-opacity-${numeric.value}`);
        opacityDefined = true;
      } else {
        result.errors.push(`Invalid fill opacity value: "${value}". Must be 0-100 or a percentage like "50%".`);
      }
    }
    // 4. Parse Image URL (if type is image)
    // Assuming a simple `url(...)` or just the URL string for shorthand.
    else if (key === 'url' || (isShorthand && (value.startsWith('url(') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')))) {
        if (typeDefined !== 'image') {
            result.warnings.push(`Image URL "${value}" provided, but fill type is not "image". Set type to "image" to use this URL.`);
            // Optionally, auto-set type to image if a URL is given and type isn't solid
            if (typeDefined !== 'solid') {
                typeDefined = 'image';
                result.warnings.push('Fill type automatically set to "image" due to URL presence.');
            } else {
                return; // if type is explicitly solid, ignore URL
            }
        }
        let parsedUrl = value;
        if (value.startsWith('url(') && value.endsWith(')')) {
            parsedUrl = value.substring(4, value.length - 1);
        }
        // Basic check for quotes and remove them if present
        if ((parsedUrl.startsWith("'") && parsedUrl.endsWith("'")) || (parsedUrl.startsWith('"') && parsedUrl.endsWith('"'))) {
            parsedUrl = parsedUrl.substring(1, parsedUrl.length - 1);
        }
        imageUrl = parsedUrl;
        result.classes = result.classes.filter(c => !c.startsWith('bg-[url(')); // Remove previous
        result.classes.push(`bg-[url('${imageUrl}')]`); // Using arbitrary value for bg image
        // Common background properties for images:
        if (!result.classes.some(c => c.startsWith('bg-cover') || c.startsWith('bg-contain') || c.startsWith('bg-center') || c.startsWith('bg-no-repeat'))) {
            result.classes.push('bg-cover', 'bg-center', 'bg-no-repeat'); // Sensible defaults
            result.warnings.push('Added default bg-cover, bg-center, bg-no-repeat for image fill. Customize as needed.');
        }
    }
    // Unknown token
    else if (isShorthand) {
      result.warnings.push(`Unknown or misplaced Fill token: "${value}".`);
    }
  });

  // --- Post-Parsing Validation & Defaults ---
  if (!typeDefined) {
    result.errors.push('Fill "type" (solid/image) is required.');
  }
  if (typeDefined === 'solid' && !colorDefined) {
    result.errors.push('Fill "color" is required when type is "solid".');
  }
  if (typeDefined === 'image' && !imageUrl) {
    result.errors.push('An image URL is required when fill type is "image".');
  }
  if (!opacityDefined) {
    result.errors.push('Fill "opacity" is required. Defaulting to 100% (bg-opacity-100).');
    result.classes.push('bg-opacity-100'); // Add default if not specified
  }

  // Remove duplicates
  result.classes = Array.from(new Set(result.classes));

  return result;
};
