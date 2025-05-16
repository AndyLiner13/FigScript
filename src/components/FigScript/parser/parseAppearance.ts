// src/components/FigScript/parser/parseAppearance.ts
import { FigScriptToken, FigScriptParseResult } from './types';
import { tokenizeFigScriptString, createParseResult, parseNumericValue, isKeyValuePair } from './utils';

/**
 * Parses the FigScript Appearance prop string into Tailwind CSS classes and validation messages.
 *
 * FigScript Syntax for Appearance (from FigScript Mappings document):
 * Appearance={
 * hide={FALSE(👁️)}, // required (default is FALSE)
 * opacity={0-100},   // required (default is 100)
 * corner-radius={all-#px, top-left-#px(↖️), top-right-#px(↗️), bottom-left-#px(↙️), bottom-right-#px(↘️)}, // optional
 * corner-smoothing={0-100} // To be ignored
 * }
 *
 * Collapsed examples:
 * Appearance={👁️, 100%, 🌽(↖️5px, ↗️6px, ↙️4px, ↘️3px)}
 * Appearance={HIDDEN, 50%, 🌽10px}
 *
 * @param {string | undefined} appearanceString - The Appearance prop value from FigScript.
 * @returns {FigScriptParseResult} An object containing Tailwind classes, errors, and warnings.
 */
export const parseAppearance = (appearanceString?: string): FigScriptParseResult => {
  const result = createParseResult();

  if (!appearanceString?.trim()) {
    // Appearance property itself is required. If the string is empty, it means props are missing.
    // However, individual sub-properties have defaults.
    // Let's assume defaults apply if the entire Appearance prop is missing,
    // but an empty string for Appearance means "use all defaults".
    // The main FigScript component will decide if Appearance itself is required.
    // For now, if string is empty, we add defaults.
    result.warnings.push('Appearance string is empty. Applying default appearance (visible, 100% opacity, no corner radius).');
    // Default: opacity-100 (visible is default by not adding 'hidden')
    // No error, as defaults are applied.
    // According to spec: hide is required (default FALSE), opacity is required (default 100)
    // So an empty string means these defaults are used.
    return result; // No classes for default visibility and opacity, no radius.
  }

  const tokens = tokenizeFigScriptString(appearanceString);

  let hideDefined = false;
  let opacityDefined = false;
  let cornerRadiusDefined = false;

  const cornerRegex = /^(all|top-left|↖️|top-right|↗️|bottom-left|↙️|bottom-right|↘️)-?(\d+)px$/;
  const collapsedCornerAllRegex = /^🌽(\d+)px$/; // 🌽10px
  const collapsedCornerIndividualRegex = /^🌽\((.*)\)$/; // 🌽(↖️5px, ↗️6px, ...)

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
      result.errors.push(`Invalid token format in Appearance: ${JSON.stringify(token)}`);
      return;
    }

    // 1. Parse Hide
    if (key === 'hide' || (isShorthand && (value === '👁️' || value === 'HIDDEN' || value.startsWith('FALSE') || value.startsWith('TRUE')))) {
      let isHidden = false;
      if (value === 'FALSE(👁️)' || value === 'FALSE' || value === '👁️') {
        isHidden = false;
      } else if (value === 'TRUE(✅)' || value === 'TRUE' || value === 'HIDDEN' || value === '✅') {
        isHidden = true;
      } else {
        result.errors.push(`Invalid value for hide: "${value}". Use TRUE(✅)/HIDDEN or FALSE(👁️).`);
        return;
      }

      if (hideDefined) {
        result.warnings.push(`Hide property defined multiple times. Last definition used: "${value}".`);
        result.classes = result.classes.filter(c => c !== 'hidden'); // Remove previous
      }

      if (isHidden) {
        result.classes.push('hidden');
      }
      hideDefined = true;
    }
    // 2. Parse Opacity
    else if (key === 'opacity' || (isShorthand && (value.endsWith('%') || /^\d+$/.test(value) || value.startsWith('opacity-')))) {
      let opacityValueStr = value;
      if (key === 'opacity') { // e.g. opacity={100}
        opacityValueStr = value;
      } else if (isShorthand && value.startsWith('opacity-')) { // e.g. opacity-50
        opacityValueStr = value.substring('opacity-'.length);
      } else if (isShorthand && value.endsWith('%')) { // e.g. 75%
        opacityValueStr = value.slice(0, -1);
      }
      // plain number e.g. 100 (interpreted as percentage)

      const numeric = parseNumericValue(opacityValueStr);
      if (numeric && numeric.unit === null && numeric.value >= 0 && numeric.value <= 100) {
        if (opacityDefined) {
          result.warnings.push(`Opacity property defined multiple times. Last definition used: "${value}".`);
          result.classes = result.classes.filter(c => !c.startsWith('opacity-')); // Remove previous
        }
        // Tailwind uses opacity-0, opacity-5, ..., opacity-100.
        // We should ensure the value matches one of these or use arbitrary value if needed.
        // For simplicity, direct mapping:
        result.classes.push(`opacity-${numeric.value}`);
        opacityDefined = true;
      } else {
        result.errors.push(`Invalid opacity value: "${value}". Must be 0-100 or a percentage like "50%".`);
      }
    }
    // 3. Parse Corner Radius
    else if (key === 'corner-radius' || (isShorthand && (value.startsWith('corner-') || value.startsWith('all-') || value.startsWith('🌽') || cornerRegex.test(value)))) {
      const processRadiusValue = (radiusValue: string) => {
        // Try collapsed all: 🌽10px
        const collapsedAllMatch = radiusValue.match(collapsedCornerAllRegex);
        if (collapsedAllMatch) {
          const val = collapsedAllMatch[1];
          result.classes = result.classes.filter(c => !c.startsWith('rounded-'));
          result.classes.push(`rounded-[${val}px]`);
          cornerRadiusDefined = true;
          return;
        }

        // Try collapsed individual: 🌽(↖️5px, ↗️6px)
        const collapsedIndividualMatch = radiusValue.match(collapsedCornerIndividualRegex);
        if (collapsedIndividualMatch) {
          const innerTokens = collapsedIndividualMatch[1].split(',').map(t => t.trim());
          innerTokens.forEach(processRadiusValue); // Recursive call for inner tokens
          cornerRadiusDefined = true; // Mark as defined if any inner token is processed
          return;
        }

        // Try direct values like all-10px, top-left-5px, ↖️5px
        const directMatch = radiusValue.match(cornerRegex);
        if (directMatch) {
          const type = directMatch[1];
          const val = directMatch[2];
          let cornerClass = '';

          switch (type) {
            case 'all':
              result.classes = result.classes.filter(c => !c.startsWith('rounded-')); // Clear all previous corner classes
              cornerClass = `rounded-[${val}px]`;
              break;
            case 'top-left':
            case '↖️':
              cornerClass = `rounded-tl-[${val}px]`;
              break;
            case 'top-right':
            case '↗️':
              cornerClass = `rounded-tr-[${val}px]`;
              break;
            case 'bottom-left':
            case '↙️':
              cornerClass = `rounded-bl-[${val}px]`;
              break;
            case 'bottom-right':
            case '↘️':
              cornerClass = `rounded-br-[${val}px]`;
              break;
            default:
              result.errors.push(`Unknown corner-radius type: "${type}" in "${radiusValue}".`);
              return;
          }
          // Remove potentially conflicting 'rounded-X' if setting specific corners
          if (type !== 'all' && result.classes.some(c => c.startsWith('rounded-[') && !c.includes('-'))) {
             result.classes = result.classes.filter(c => !(c.startsWith('rounded-[') && !c.includes('-')));
          }
          result.classes.push(cornerClass);
          cornerRadiusDefined = true;
        } else if (!isShorthand && key === 'corner-radius') {
            // This means the value of corner-radius={...} was not a recognized pattern
            result.errors.push(`Invalid corner-radius value format: "${radiusValue}".`);
        } else if (isShorthand && value.startsWith('corner-')) {
            // e.g. corner-5px (malformed)
            result.errors.push(`Malformed shorthand corner-radius: "${radiusValue}". Use "all-#px", "side-#px", or emoji forms.`);
        } else if (isShorthand && !value.startsWith('🌽') && !key) { // Avoid double erroring if it was already caught by other rules
            // result.warnings.push(`Potentially unhandled shorthand for corner-radius: "${radiusValue}"`);
        }
      };

      if (key === 'corner-radius') { // e.g. corner-radius={top-left-5px(↖️), top-right-6px(↗️)}
        value.split(',').map(v => v.trim()).forEach(processRadiusValue);
      } else { // Shorthand like 🌽(↖️5px), all-10px
        processRadiusValue(value);
      }
    }
    // 4. Parse Corner Smoothing (and ignore it)
    else if (key === 'corner-smoothing' || (isShorthand && value.includes('smoothing'))) {
      result.warnings.push(`FigScript "corner-smoothing" property ("${value}") is ignored as it's not supported by CSS/Tailwind.`);
    }
    // Unknown token
    else if (isShorthand) {
      result.warnings.push(`Unknown or misplaced Appearance token: "${value}".`);
    }
  });

  // --- Post-Parsing Validation & Defaults ---
  // hide: default FALSE (visible), required.
  if (!hideDefined) {
    result.errors.push('Appearance "hide" property is required. Defaulting to visible (hide=FALSE).');
    // No class needed for default visible state.
  }

  // opacity: default 100, required.
  if (!opacityDefined) {
    result.errors.push('Appearance "opacity" property is required. Defaulting to 100% (opacity-100).');
    result.classes.push('opacity-100'); // Add default if not specified
  }

  // corner-radius: optional, no default class needed if not specified.

  // Remove duplicates
  result.classes = Array.from(new Set(result.classes));

  return result;
};
