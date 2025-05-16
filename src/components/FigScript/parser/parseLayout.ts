// src/components/FigScript/parser/parseLayout.ts
import { FigScriptToken, FigScriptParseResult, LayoutMode } from './types';
import { tokenizeFigScriptString, createParseResult, parseNumericValue, isKeyValuePair } from './utils';

/**
 * Parses the FigScript Layout prop string into Tailwind CSS classes and validation messages.
 * This parser handles both "Standard Layout" and "Auto Layout" modes.
 *
 * --- Standard Layout Syntax (Simplified Example) ---
 * Layout={
 * dimensions={w-100px, h-50px},
 * spacing={v-10px}, // -> space-y-[10px]
 * clip-content={TRUE(✂️)}
 * }
 * Collapsed: Layout={w-100px, h-50px, v-10px, ✂️}
 *
 * --- Auto Layout Syntax (Simplified Example) ---
 * Layout=Auto{
 * flow={horizontal(↔️), wrap(↩️)},
 * dimensions={w-fill, h-hug},
 * alignment={center(🔯)},
 * gap={10px},
 * padding={all-5px},
 * clip-content={TRUE(✂️)}
 * }
 * Collapsed: Layout=Auto{↔️, ↩️, w-fill, h-hug, 🔯, gap-10px, p-5px, ✂️}
 *
 * @param {string | undefined} layoutString - The Layout prop value from FigScript.
 * @returns {FigScriptParseResult} An object containing Tailwind classes, errors, and warnings.
 */
export const parseLayout = (layoutString?: string): FigScriptParseResult => {
  const result = createParseResult();
  if (!layoutString?.trim()) {
    result.errors.push('Layout property string is empty or missing. It is required.');
    return result;
  }

  let mode: LayoutMode = 'UNKNOWN';
  let processedLayoutString = layoutString;

  // Mode Detection: Check if "Auto" is specified
  if (layoutString.startsWith('Auto{') && layoutString.endsWith('}')) {
    mode = 'AUTO';
    processedLayoutString = layoutString.substring(5, layoutString.length - 1); // Get content within Auto{...}
  } else if (layoutString.includes('Auto')) { // Simpler check for "Auto" token if not using Auto{...}
      const tempTokens = tokenizeFigScriptString(layoutString);
      if(tempTokens.some(t => t === 'Auto' || (isKeyValuePair(t) && t.key.toLowerCase() === 'mode' && t.value.toLowerCase() === 'auto'))) {
          mode = 'AUTO';
          // TODO: Refine how to strip 'Auto' token if it's mixed with other props for Auto layout
          // For now, assume if 'Auto' is present, all tokens are for auto layout.
      }
  }


  const tokens = tokenizeFigScriptString(processedLayoutString);

  if (mode === 'UNKNOWN') {
    // If mode is still unknown, try to infer. If flex-related properties are found, assume AUTO.
    // Otherwise, assume STANDARD. This is a basic inference.
    const hasAutoLayoutKeywords = tokens.some(token => {
        const val = isKeyValuePair(token) ? token.key : token;
        return typeof val === 'string' && (val.includes('flow') || val.includes('gap') || val.includes('fill') || val.includes('hug') || val.includes('↕️') || val.includes('↔️') || val.includes('↩️') || val.includes('🔯') );
    });
    mode = hasAutoLayoutKeywords ? 'AUTO' : 'STANDARD';
    if (hasAutoLayoutKeywords) {
        result.warnings.push(`Layout mode inferred as "AUTO" due to presence of Auto Layout keywords. For clarity, explicitly use "Layout=Auto{...}".`);
    } else {
         result.warnings.push(`Layout mode inferred as "STANDARD". For Auto Layout, use "Layout=Auto{...}".`);
    }
  }

  // --- State flags and accumulators ---
  // Common
  let clipContent = false;
  const dimensionClasses: string[] = [];
  const paddingClasses: string[] = [];

  // Standard Layout specific
  const spacingClasses: string[] = [];

  // Auto Layout specific
  const flowClasses: string[] = [];
  const alignmentClasses: string[] = [];
  let gapClass: string | null = null;
  let settingsAlignBaseline = false;


  // --- Helper to manage dimension classes (w, h, min-w, etc.) ---
  const addDimensionClass = (cls: string) => {
    // Prevent redundant/conflicting width/height classes if possible (e.g. w-full vs w-[100px])
    // This simple add is a start; more complex conflict resolution could be added.
    dimensionClasses.push(cls);
  };

  tokens.forEach(token => {
    let key: string | null = null;
    let value: string | null = null;
    let isShorthand = false;

    if (isKeyValuePair(token)) {
      key = token.key.toLowerCase();
      value = token.value;
    } else {
      value = token;
      isShorthand = true;
    }

    if (value === null) {
      result.errors.push(`Invalid token format in Layout: ${JSON.stringify(token)}`);
      return;
    }

    // --- Common Properties (Dimensions, Clip Content) ---
    if (key === 'dimensions' || (isShorthand && (value.startsWith('w-') || value.startsWith('h-') || value.startsWith('min-w-') || value.startsWith('max-w-') || value.startsWith('min-h-') || value.startsWith('max-h-')))) {
        const processDimension = (dimVal: string) => {
            if (dimVal.startsWith('w-')) {
                if (dimVal === 'w-fill' && mode === 'AUTO') addDimensionClass('w-full');
                else if (dimVal === 'w-hug' && mode === 'AUTO') addDimensionClass('w-auto');
                else if (dimVal.startsWith('w-') && parseNumericValue(dimVal.substring(2))?.unit === 'px') addDimensionClass(`w-[${dimVal.substring(2)}]`);
                else if (dimVal.startsWith('w-') && /^\d+\/\d+$/.test(dimVal.substring(2))) addDimensionClass(dimVal); // fractions like w-1/2
                else if (mode === 'STANDARD' && (dimVal === 'w-fill' || dimVal === 'w-hug')) result.errors.push(`"w-fill" and "w-hug" are only for Auto Layout mode. Use "w-#px" for Standard Layout.`);
                else if (isShorthand) addDimensionClass(dimVal); // Allow direct Tailwind classes like w-screen
                else result.errors.push(`Invalid width dimension: "${dimVal}".`);
            } else if (dimVal.startsWith('h-')) {
                if (dimVal === 'h-fill' && mode === 'AUTO') addDimensionClass('h-full');
                else if (dimVal === 'h-hug' && mode === 'AUTO') addDimensionClass('h-auto');
                else if (dimVal.startsWith('h-') && parseNumericValue(dimVal.substring(2))?.unit === 'px') addDimensionClass(`h-[${dimVal.substring(2)}]`);
                else if (dimVal.startsWith('h-') && /^\d+\/\d+$/.test(dimVal.substring(2))) addDimensionClass(dimVal); // fractions
                else if (mode === 'STANDARD' && (dimVal === 'h-fill' || dimVal === 'h-hug')) result.errors.push(`"h-fill" and "h-hug" are only for Auto Layout mode. Use "h-#px" for Standard Layout.`);
                else if (isShorthand) addDimensionClass(dimVal);
                else result.errors.push(`Invalid height dimension: "${dimVal}".`);
            }
            // Min/Max for Auto Layout
            else if (mode === 'AUTO') {
                if (dimVal.startsWith('min-w-')) addDimensionClass(`min-w-[${dimVal.substring(6)}]`); // Assuming #px
                else if (dimVal.startsWith('max-w-')) addDimensionClass(`max-w-[${dimVal.substring(6)}]`);
                else if (dimVal.startsWith('min-h-')) addDimensionClass(`min-h-[${dimVal.substring(6)}]`);
                else if (dimVal.startsWith('max-h-')) addDimensionClass(`max-h-[${dimVal.substring(6)}]`);
                else result.errors.push(`Invalid Auto Layout dimension token: "${dimVal}".`);
            } else {
                 result.errors.push(`Min/max dimensions are only for Auto Layout. Invalid token: "${dimVal}".`);
            }
        };
        if (key === 'dimensions') value.split(',').map(v => v.trim()).forEach(processDimension);
        else processDimension(value);
    }
    else if (key === 'clip-content' || (isShorthand && (value === '✂️' || value === 'TRUE' || value === 'FALSE'))) {
        if (value === 'TRUE(✂️)' || value === 'TRUE' || value === '✂️') clipContent = true;
        else if (value === 'FALSE') clipContent = false; // Explicitly false
        else result.errors.push(`Invalid clip-content value: "${value}". Use TRUE(✂️) or FALSE.`);
    }

    // --- Standard Layout Specific ---
    else if (mode === 'STANDARD' && (key === 'spacing' || (isShorthand && (value.startsWith('v-') || value.startsWith('h-'))))) {
        const processSpacing = (spaceVal: string) => {
            if (spaceVal.startsWith('v-')) {
                const num = parseNumericValue(spaceVal.substring(2));
                if (num && num.unit === 'px') spacingClasses.push(`space-y-[${num.value}px]`);
                else result.errors.push(`Invalid vertical spacing: "${spaceVal}". Use "v-#px".`);
            } else if (spaceVal.startsWith('h-')) {
                const num = parseNumericValue(spaceVal.substring(2));
                if (num && num.unit === 'px') spacingClasses.push(`space-x-[${num.value}px]`);
                else result.errors.push(`Invalid horizontal spacing: "${spaceVal}". Use "h-#px".`);
            } else {
                result.errors.push(`Unknown spacing token: "${spaceVal}".`);
            }
        };
        if (key === 'spacing') value.split(',').map(v => v.trim()).forEach(processSpacing);
        else processSpacing(value);
    }

    // --- Auto Layout Specific ---
    else if (mode === 'AUTO') {
        if (key === 'flow' || (isShorthand && (value === 'vertical' || value === '↕️' || value === 'horizontal' || value === '↔️' || value === 'wrap' || value === '↩️'))) {
            const processFlow = (flowVal: string) => {
                if (flowVal === 'vertical' || flowVal === '↕️') flowClasses.push('flex-col');
                else if (flowVal === 'horizontal' || flowVal === '↔️') flowClasses.push('flex-row');
                else if (flowVal === 'wrap' || flowVal === '↩️') {
                    if (flowClasses.includes('flex-row')) flowClasses.push('flex-wrap');
                    else result.errors.push('"wrap(↩️)" can only be used with "horizontal(↔️)" flow.');
                } else {
                    result.errors.push(`Unknown flow token: "${flowVal}".`);
                }
            };
            if (key === 'flow') value.split(',').map(v => v.trim()).forEach(processFlow);
            else processFlow(value);
        }
        else if (key === 'alignment' || (isShorthand && ['↖️', '⬆️', '↗️', '⬅️', '🔯', '➡️', '↙️', '⬇️', '↘️'].includes(value) )) {
            // Clear previous alignment if any
            alignmentClasses.length = 0;
            switch (value) {
                case '↖️': alignmentClasses.push('justify-start', 'items-start'); break;
                case '⬆️': alignmentClasses.push('justify-center', 'items-start'); break;
                case '↗️': alignmentClasses.push('justify-end', 'items-start'); break;
                case '⬅️': alignmentClasses.push('justify-start', 'items-center'); break;
                case '🔯': alignmentClasses.push('justify-center', 'items-center'); break;
                case '➡️': alignmentClasses.push('justify-end', 'items-center'); break;
                case '↙️': alignmentClasses.push('justify-start', 'items-end'); break;
                case '⬇️': alignmentClasses.push('justify-center', 'items-end'); break;
                case '↘️': alignmentClasses.push('justify-end', 'items-end'); break;
                default: result.errors.push(`Invalid alignment emoji: "${value}".`);
            }
        }
        else if (key === 'gap' || (isShorthand && (value.startsWith('gap-') || parseNumericValue(value)?.unit === 'px' || value === 'auto'))) {
            let gapVal = value;
            if (isShorthand && value.startsWith('gap-')) gapVal = value.substring(4);

            if (gapVal === 'auto') gapClass = 'justify-between'; // Special case for auto gap
            else {
                const num = parseNumericValue(gapVal);
                if (num && num.unit === 'px') gapClass = `gap-[${num.value}px]`;
                else result.errors.push(`Invalid gap value: "${value}". Use "#px" or "auto".`);
            }
        }
        else if (key === 'padding' || (isShorthand && (value.startsWith('p-') || value.startsWith('px-') || value.startsWith('py-') || value.startsWith('pt-') || value.startsWith('pb-') || value.startsWith('pl-') || value.startsWith('pr-') || value.startsWith('all-')))) {
            // Example: padding={all-10px, l-5px, r-4px} or p-10px, pl-5px
            // This needs careful parsing to respect precedence (all < h/v < individual)
            // For simplicity, this example will just add classes. A more robust system would manage overrides.
            const processPadding = (padVal: string) => {
                let cls = '';
                if (padVal.startsWith('all-')) cls = `p-[${padVal.substring(4)}]`; // Assuming #px
                else if (padVal.startsWith('h-')) cls = `px-[${padVal.substring(2)}]`;
                else if (padVal.startsWith('v-')) cls = `py-[${padVal.substring(2)}]`;
                else if (padVal.startsWith('l-')) cls = `pl-[${padVal.substring(2)}]`;
                else if (padVal.startsWith('r-')) cls = `pr-[${padVal.substring(2)}]`;
                else if (padVal.startsWith('t-')) cls = `pt-[${padVal.substring(2)}]`;
                else if (padVal.startsWith('b-')) cls = `pb-[${padVal.substring(2)}]`;
                // Shorthand Tailwind direct classes
                else if (padVal.startsWith('p-') || padVal.startsWith('px-') || padVal.startsWith('py-') || padVal.startsWith('pt-') || padVal.startsWith('pb-') || padVal.startsWith('pl-') || padVal.startsWith('pr-')) {
                    cls = padVal; // e.g. p-4, px-2
                } else {
                    result.errors.push(`Invalid padding token: "${padVal}".`);
                    return;
                }
                // Add with basic conflict check (e.g. remove 'p-X' if 'px-Y' is added)
                // This is highly simplified. True precedence is complex.
                if (cls.startsWith('p-') && !cls.startsWith('px-') && !cls.startsWith('py-') && !cls.startsWith('pl-') && !cls.startsWith('pr-') && !cls.startsWith('pt-') && !cls.startsWith('pb-')) { // e.g. p-[10px]
                    paddingClasses.filter(pc => !pc.startsWith('p')).forEach(existing => paddingClasses.splice(paddingClasses.indexOf(existing), 1));
                } else if (cls.startsWith('px-')) {
                    paddingClasses.filter(pc => pc.startsWith('pl-') || pc.startsWith('pr-') || (pc.startsWith('p-') && !pc.startsWith('px-') && !pc.startsWith('py-'))).forEach(existing => paddingClasses.splice(paddingClasses.indexOf(existing), 1));
                } else if (cls.startsWith('py-')) {
                     paddingClasses.filter(pc => pc.startsWith('pt-') || pc.startsWith('pb-') || (pc.startsWith('p-') && !pc.startsWith('px-') && !pc.startsWith('py-'))).forEach(existing => paddingClasses.splice(paddingClasses.indexOf(existing), 1));
                }
                paddingClasses.push(cls);
            };

            if (key === 'padding') value.split(',').map(v => v.trim()).forEach(processPadding);
            else processPadding(value);

        }
        else if (key === 'settings' || (isShorthand && value.includes('align-text-baseline'))) {
            if (value.includes('align-text-baseline') || value === '✅') {
                settingsAlignBaseline = true;
            }
            if (value.includes('strokes-included') || value.includes('canvas-stacking')) {
                result.warnings.push(`Layout settings "${value}" (strokes-included, canvas-stacking) are not currently supported and will be ignored.`);
            }
        }
        else if (isShorthand && mode === 'AUTO') { // Catch-all for unknown Auto Layout shorthands
             result.warnings.push(`Unknown or misplaced Auto Layout token: "${value}".`);
        }
    }
    // Catch-all for unknown tokens if mode is Standard or if it didn't fit Auto
    else if (isShorthand) {
         result.warnings.push(`Unknown or misplaced Layout token: "${value}" for ${mode} mode.`);
    }
  });

  // --- Assemble classes ---
  result.classes.push(...dimensionClasses);

  if (clipContent) {
    result.classes.push('overflow-hidden');
  }

  if (mode === 'STANDARD') {
    result.classes.push(...spacingClasses);
    if (flowClasses.length > 0 || alignmentClasses.length > 0 || gapClass || paddingClasses.length >0 || settingsAlignBaseline) {
        result.errors.push("Auto Layout properties (flow, alignment, gap, padding, settings) were found in Standard Layout mode. These will be ignored. Use Layout=Auto{...} for Auto Layout.");
    }
  } else { // AUTO mode
    if (flowClasses.length > 0 || alignmentClasses.length > 0 || gapClass || settingsAlignBaseline) {
      if (!result.classes.includes('flex')) result.classes.unshift('flex'); // Ensure flex is present
    }
    result.classes.push(...flowClasses);
    result.classes.push(...alignmentClasses);
    if (gapClass) result.classes.push(gapClass);
    if (settingsAlignBaseline) {
        if (!alignmentClasses.some(c => c.startsWith('items-'))) result.classes.push('items-baseline');
        else result.warnings.push("align-text-baseline setting was provided, but an items-* alignment was also set. align-text-baseline might be overridden.");
    }
    result.classes.push(...paddingClasses); // Padding can be used in both, but handled here for Auto
     if (spacingClasses.length > 0) {
        result.errors.push("Standard Layout 'spacing' properties (v-#px, h-#px for space-x/y) are not applicable in Auto Layout mode. Use 'gap' and 'padding' instead.");
    }
  }


  // Validation for required fields based on mode
  if (mode === 'AUTO') {
    if (!flowClasses.some(fc => fc === 'flex-col' || fc === 'flex-row')) {
        result.errors.push('Auto Layout "flow" (vertical/horizontal) is required.');
    }
    if (alignmentClasses.length === 0) {
        result.warnings.push('Auto Layout "alignment" is not specified. Defaulting to browser/flex defaults (usually justify-start, items-stretch). Consider setting an explicit alignment.');
    }
     if (!gapClass) {
        result.warnings.push('Auto Layout "gap" is not specified. Defaulting to no gap. Consider setting "gap-0px" or "gap-auto".');
    }
  }
  if (dimensionClasses.length === 0) {
      result.errors.push('Layout "dimensions" (w, h) are required.');
  }


  result.classes = Array.from(new Set(result.classes));
  return result;
};
