// src/components/FigScript/parser/parsePosition.ts
import { tokenizeFigScriptString } from './utils';

/**
 * Parses the Position prop string into Tailwind CSS classes and determines if fixed positioning is used.
 * @param {string | undefined} positionString - The Position prop value.
 * @returns {{ classes: string[], isFixed: boolean }} An object containing Tailwind classes and a boolean for fixed positioning.
 */
export const parsePosition = (positionString?: string): { classes: string[], isFixed: boolean } => {
  const tokens = tokenizeFigScriptString(positionString);
  const baseClasses: string[] = [];
  let isFixed = false;
  let isPositionedExplicitly = false; // Tracks if fixed/absolute is set

  const positionOffsetClasses: string[] = []; // For top/left/right/bottom offsets
  const transformClasses: string[] = []; // For translate/rotate/scale

  tokens.forEach(token => {
    if (token === 'ignore-auto-layout' || token === '↔️') { // '↔️' from your FigScript Mappings
      baseClasses.push('fixed');
      // Default z-index for elements that ignore layout, can be overridden by other FigScript props if you add z-index parsing
      if (!tokens.some(t => t.startsWith('z-'))) {
        baseClasses.push('z-50');
      }
      isFixed = true;
      isPositionedExplicitly = true;
    } else if (token.startsWith('x-')) {
      const value = token.substring(2);
      if (value) positionOffsetClasses.push(`left-[${value}px]`);
    } else if (token.startsWith('y-')) {
      const value = token.substring(2);
      if (value) positionOffsetClasses.push(`top-[${value}px]`);
    } else if (token.startsWith('r-') && !isNaN(Number(token.substring(2)))) {
      const value = token.substring(2);
      if (value) transformClasses.push(`rotate-[${value}deg]`);
    } else if (token === 'r-90') {
      transformClasses.push('rotate-90');
    } else if (token === 'r-180') {
      transformClasses.push('rotate-180');
    } else if (token === 'r-270') {
      transformClasses.push('-rotate-90'); // Shorter than rotate-[270deg]
    } else if (token === 'flip-h') {
      transformClasses.push('scale-x-[-1]');
    } else if (token === 'flip-v') {
      transformClasses.push('scale-y-[-1]');
    }
    // Alignment (relative to viewport if isFixed is true)
    else if (token === 'align-left') {
      positionOffsetClasses.push('left-0');
    } else if (token === 'align-h-center') {
      positionOffsetClasses.push('left-1/2');
      transformClasses.push('-translate-x-1/2');
    } else if (token === 'align-right') {
      positionOffsetClasses.push('right-0');
    } else if (token === 'align-top') {
      positionOffsetClasses.push('top-0');
    } else if (token === 'align-v-center') {
      positionOffsetClasses.push('top-1/2');
      transformClasses.push('-translate-y-1/2');
    } else if (token === 'align-bottom') {
      positionOffsetClasses.push('bottom-0');
    }
    // Constraints (Simplified for fixed positioning)
    else if (token === 'h-stretch') { // Figma: Horizontal Left & Right
      positionOffsetClasses.push('left-0', 'right-0');
    } else if (token === 'v-stretch') { // Figma: Vertical Top & Bottom
      positionOffsetClasses.push('top-0', 'bottom-0');
    } else if (token === 'h-scale') { // Figma: Horizontal Scale
      baseClasses.push('w-full'); // Assumes full width of the viewport when fixed
    } else if (token === 'v-scale') { // Figma: Vertical Scale
      baseClasses.push('h-full'); // Assumes full height of the viewport when fixed
    } else if (token.startsWith('z-')) { // Allow direct z-index control
        baseClasses.push(token);
        isPositionedExplicitly = true; // z-index implies positioning context
    }
  });

  // Default to relative positioning if offsets (x-, y-) are used without 'ignore-auto-layout' or other explicit position.
  // This maintains part of your original parser's behavior.
  if (!isPositionedExplicitly && positionOffsetClasses.length > 0 && !baseClasses.some(c => ['absolute', 'relative', 'fixed', 'sticky'].includes(c))) {
    baseClasses.push('relative');
  }

  const allClasses = [...baseClasses, ...positionOffsetClasses, ...transformClasses];
  return { classes: Array.from(new Set(allClasses)), isFixed };
};