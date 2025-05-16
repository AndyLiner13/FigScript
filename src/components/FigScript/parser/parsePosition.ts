// src/components/FigScript/parser/parsePosition.ts
import { FigScriptToken, FigScriptParseResult } from './types';
import { tokenizeFigScriptString, createParseResult, parseNumericValue, isKeyValuePair } from './utils';

/**
 * Parses the FigScript Position prop string into Tailwind CSS classes, validation messages,
 * and determines if fixed positioning is used.
 *
 * FigScript Syntax for Position (from FigScript Mappings document):
 * Position={
 * ignore-auto-layout=TRUE(✅) / FALSE(❌) // required
 * alignment={align-left(⬅️), align-right(➡️), align-top(⬆️), align-bottom(⬇️)}, // only when ignore-auto-layout=true
 * position={x-#px, y-#px},                                                   // only when ignore-auto-layout=true
 * constraints={h-(left, right, left-right, center, scale), v-(left, right, left-right, center, scale)}, // only when ignore-auto-layout=true
 * rotation={r-#, flip-h, flip-v}                                             // required
 * }
 * Also supports direct z-index like z-10.
 *
 * Collapsed examples:
 * Position={✅, ➡️, ⬇️, x-1px, y-1px, h-center, v-right, r-25, flip-h, flip-v}
 * Position={❌, r-45}
 *
 * @param {string | undefined} positionString - The Position prop value from FigScript.
 * @returns {FigScriptParseResult & { isFixed: boolean }}
 * An object containing Tailwind classes, errors, warnings, and an isFixed flag.
 */
export const parsePosition = (positionString?: string): FigScriptParseResult & { isFixed: boolean } => {
  const baseResult = createParseResult();
  let isFixed = false; // This will be part of the extended result

  if (!positionString?.trim()) {
    baseResult.errors.push('Position property string is empty or missing. It is required.');
    return { ...baseResult, isFixed };
  }

  const tokens = tokenizeFigScriptString(positionString);

  // --- State Flags ---
  let ignoreAutoLayout: boolean | null = null;
  let rotationDefined = false;
  const alignmentValues: { h?: string, v?: string } = {};
  const positionValues: { x?: string, y?: string } = {};
  const constraintValues: { h?: string, v?: string } = {};
  const transformClasses: string[] = []; // For rotate/scale
  const positionOffsetClasses: string[] = []; // For top/left/right/bottom offsets
  const explicitPositionClasses: string[] = []; // For 'fixed', 'relative' etc.
  let zIndexClass: string | null = null;


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
      baseResult.errors.push(`Invalid token format in Position: ${JSON.stringify(token)}`);
      return;
    }

    // 1. Parse ignore-auto-layout
    if (key === 'ignore-auto-layout' || (isShorthand && (value === '✅' || value === 'TRUE' || value === '❌' || value === 'FALSE'))) {
      if (ignoreAutoLayout !== null) {
        baseResult.warnings.push(`"ignore-auto-layout" defined multiple times. Last definition used: "${value}".`);
      }
      if (value === 'TRUE(✅)' || value === 'TRUE' || value === '✅') {
        ignoreAutoLayout = true;
        isFixed = true; // Set the flag for the component
        if (!explicitPositionClasses.includes('fixed')) explicitPositionClasses.push('fixed');
      } else if (value === 'FALSE(❌)' || value === 'FALSE' || value === '❌') {
        ignoreAutoLayout = false;
        isFixed = false;
      } else {
        baseResult.errors.push(`Invalid value for "ignore-auto-layout": "${value}". Use TRUE(✅) or FALSE(❌).`);
      }
    }
    // 2. Parse rotation
    else if (key === 'rotation' || (isShorthand && (value.startsWith('r-') || value === 'flip-h' || value === 'flip-v'))) {
        const processRotation = (rotVal: string) => {
            if (rotVal.startsWith('r-')) {
                if (rotVal === 'r-90') transformClasses.push('rotate-90');
                else if (rotVal === 'r-180') transformClasses.push('rotate-180');
                else if (rotVal === 'r-270') transformClasses.push('-rotate-90'); // Tailwind uses -rotate-90 for 270
                else {
                    const angle = parseNumericValue(rotVal.substring(2));
                    if (angle && (angle.unit === 'deg' || angle.unit === null)) { // Allow unitless for degrees
                        transformClasses.push(`rotate-[${angle.value}deg]`);
                    } else {
                        baseResult.errors.push(`Invalid rotation angle: "${rotVal}". Use "r-#deg" or "r-#".`);
                    }
                }
            } else if (rotVal === 'flip-h') {
                transformClasses.push('scale-x-[-1]');
            } else if (rotVal === 'flip-v') {
                transformClasses.push('scale-y-[-1]');
            } else {
                 baseResult.errors.push(`Unknown rotation token: "${rotVal}".`);
            }
            rotationDefined = true;
        };

        if (key === 'rotation') value.split(',').map(v => v.trim()).forEach(processRotation);
        else processRotation(value);
    }
    // 3. Parse alignment (only if ignore-auto-layout=TRUE)
    else if (key === 'alignment' || (isShorthand && value.startsWith('align-'))) {
        const processAlignment = (alignVal: string) => {
            if (alignVal === 'align-left' || alignVal === '⬅️') alignmentValues.h = 'left';
            else if (alignVal === 'align-right' || alignVal === '➡️') alignmentValues.h = 'right';
            else if (alignVal === 'align-top' || alignVal === '⬆️') alignmentValues.v = 'top';
            else if (alignVal === 'align-bottom' || alignVal === '⬇️') alignmentValues.v = 'bottom';
            // No h-center/v-center in spec for alignment, constraints handle centering
            else baseResult.errors.push(`Invalid alignment token: "${alignVal}".`);
        };
        if (key === 'alignment') value.split(',').map(v => v.trim()).forEach(processAlignment);
        else processAlignment(value);
    }
    // 4. Parse position (x, y) (only if ignore-auto-layout=TRUE)
    else if (key === 'position' || (isShorthand && (value.startsWith('x-') || value.startsWith('y-')))) {
        const processXY = (xyVal: string) => {
            if (xyVal.startsWith('x-')) {
                const num = parseNumericValue(xyVal.substring(2));
                if (num && num.unit === 'px') positionValues.x = `${num.value}px`;
                else baseResult.errors.push(`Invalid x position: "${xyVal}". Use "x-#px".`);
            } else if (xyVal.startsWith('y-')) {
                const num = parseNumericValue(xyVal.substring(2));
                if (num && num.unit === 'px') positionValues.y = `${num.value}px`;
                else baseResult.errors.push(`Invalid y position: "${xyVal}". Use "y-#px".`);
            } else baseResult.errors.push(`Invalid x/y position token: "${xyVal}".`);
        };
        if (key === 'position') value.split(',').map(v => v.trim()).forEach(processXY);
        else processXY(value);
    }
    // 5. Parse constraints (only if ignore-auto-layout=TRUE)
    else if (key === 'constraints' || (isShorthand && (value.startsWith('h-') || value.startsWith('v-')))) {
        const processConstraint = (conVal: string) => {
            if (conVal.startsWith('h-')) constraintValues.h = conVal.substring(2);
            else if (conVal.startsWith('v-')) constraintValues.v = conVal.substring(2);
            else baseResult.errors.push(`Invalid constraint token: "${conVal}".`);
        };
        if (key === 'constraints') value.split(',').map(v => v.trim()).forEach(processConstraint);
        else processConstraint(value);
    }
    // 6. Parse z-index
    else if (isShorthand && value.startsWith('z-')) {
        const zNum = value.substring(2);
        if (/^\d+$/.test(zNum) && Number(zNum) % 10 === 0 && Number(zNum) >=0 && Number(zNum) <=50) { // Standard Tailwind z-indexes
            if (zIndexClass) baseResult.warnings.push(`Z-index defined multiple times. Last used: "${value}".`);
            zIndexClass = value;
        } else if (/^\d+$/.test(zNum)) { // Arbitrary z-index
             if (zIndexClass) baseResult.warnings.push(`Z-index defined multiple times. Last used: "${value}".`);
            zIndexClass = `z-[${zNum}]`;
        }
        else {
            baseResult.errors.push(`Invalid z-index value: "${value}". Use "z-10", "z-20", etc., or "z-[custom]".`);
        }
    }
    // Unknown
    else if (isShorthand) {
        baseResult.warnings.push(`Unknown or misplaced Position token: "${value}".`);
    }
  });

  // --- Post-Parsing Validation and Class Generation ---
  if (ignoreAutoLayout === null) {
    baseResult.errors.push('"ignore-auto-layout" is required in Position. Defaulting to FALSE.');
    ignoreAutoLayout = false; // Default to false if not specified
    isFixed = false;
  }
  if (!rotationDefined) {
    baseResult.errors.push('"rotation" is required in Position.');
  }

  if (ignoreAutoLayout) { // isFixed will be true
    // Apply alignment
    if (alignmentValues.h === 'left') positionOffsetClasses.push('left-0');
    if (alignmentValues.h === 'right') positionOffsetClasses.push('right-0');
    if (alignmentValues.v === 'top') positionOffsetClasses.push('top-0');
    if (alignmentValues.v === 'bottom') positionOffsetClasses.push('bottom-0');
    // Note: The spec for alignment doesn't include center. Centering is via constraints.

    // Apply position (x, y) - these will override alignment if both point to same edge
    if (positionValues.x) positionOffsetClasses.push(`left-[${positionValues.x}]`);
    if (positionValues.y) positionOffsetClasses.push(`top-[${positionValues.y}]`);

    // Apply constraints
    // Horizontal
    if (constraintValues.h === 'left') { /* If not combined with right, this is like align-left */ if (!positionOffsetClasses.includes('right-0')) positionOffsetClasses.push('left-0');}
    else if (constraintValues.h === 'right') { /* If not combined with left, this is like align-right */ if (!positionOffsetClasses.includes('left-0')) positionOffsetClasses.push('right-0');}
    else if (constraintValues.h === 'left-right') { positionOffsetClasses.push('left-0', 'right-0'); }
    else if (constraintValues.h === 'center') { positionOffsetClasses.push('left-1/2'); transformClasses.push('-translate-x-1/2'); }
    else if (constraintValues.h === 'scale') { baseResult.classes.push('w-full'); } // w-full relative to viewport for fixed
    // Vertical
    if (constraintValues.v === 'top') { if (!positionOffsetClasses.includes('bottom-0')) positionOffsetClasses.push('top-0');}
    else if (constraintValues.v === 'bottom') { if (!positionOffsetClasses.includes('top-0')) positionOffsetClasses.push('bottom-0');}
    else if (constraintValues.v === 'top-bottom') { positionOffsetClasses.push('top-0', 'bottom-0'); }
    else if (constraintValues.v === 'center') { positionOffsetClasses.push('top-1/2'); transformClasses.push('-translate-y-1/2'); }
    else if (constraintValues.v === 'scale') { baseResult.classes.push('h-full'); } // h-full relative to viewport for fixed

    if (!zIndexClass && explicitPositionClasses.includes('fixed')) { // Default z-index for fixed elements if not specified
        zIndexClass = 'z-50';
    }

  } else { // ignoreAutoLayout is FALSE
    // Check if alignment, position, or constraints were erroneously defined
    if (Object.keys(alignmentValues).length > 0) baseResult.errors.push('Alignment properties (align-left, etc.) are only available when "ignore-auto-layout" is TRUE.');
    if (Object.keys(positionValues).length > 0) baseResult.errors.push('Position properties (x-#px, y-#px) are only available when "ignore-auto-layout" is TRUE.');
    if (Object.keys(constraintValues).length > 0) baseResult.errors.push('Constraint properties (h-..., v-...) are only available when "ignore-auto-layout" is TRUE.');
    // If any x,y, or z-index was specified without ignore-auto-layout=TRUE, it might imply 'relative'
    // However, the spec says x,y are only for ignore-auto-layout=TRUE.
    // Rotation is always allowed. If rotation or z-index is present, and element is not fixed, it might need 'relative'.
    if ((transformClasses.length > 0 || zIndexClass) && !explicitPositionClasses.includes('fixed')) {
        // if (!explicitPositionClasses.includes('relative')) explicitPositionClasses.push('relative');
        // Decided against auto-adding 'relative' to strictly follow that x,y,constraints are for fixed only.
        // Rotation itself doesn't always require 'relative' but often used with it.
        // Z-index needs a positioning context.
        if(zIndexClass && !explicitPositionClasses.includes('relative') && !isFixed) {
            explicitPositionClasses.push('relative');
            baseResult.warnings.push("Added 'relative' positioning because z-index was specified without 'ignore-auto-layout=TRUE'.");
        }

    }
  }

  if (zIndexClass) baseResult.classes.push(zIndexClass);
  baseResult.classes.push(...explicitPositionClasses, ...positionOffsetClasses, ...transformClasses);
  baseResult.classes = Array.from(new Set(baseResult.classes));

  return { ...baseResult, isFixed };
};
