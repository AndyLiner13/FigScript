// src/components/FigScript/parser/parsePosition.ts
import { tokenizeFigScriptString } from './utils';
/**
 * Parses the Position prop string into Tailwind CSS classes.
 * @param {string | undefined} positionString - The Position prop value.
 * @returns {string[]} An array of Tailwind classes.
 */
export const parsePosition = (positionString) => {
    const tokens = tokenizeFigScriptString(positionString);
    const classes = [];
    let isPositioned = false; // Tracks if 'absolute', 'relative', etc. is explicitly set by '↔️' or other tokens
    tokens.forEach(token => {
        if (token === '↔️') { // Explicit absolute positioning
            classes.push('absolute');
            isPositioned = true;
        }
        else if (token.startsWith('x-')) {
            const value = token.substring(2);
            if (value)
                classes.push(`left-[${value}px]`);
            // If x- is used and no explicit position set, default to relative
            if (!isPositioned && !classes.some(c => ['absolute', 'relative', 'fixed', 'sticky'].includes(c))) {
                classes.push('relative');
            }
        }
        else if (token.startsWith('y-')) {
            const value = token.substring(2);
            if (value)
                classes.push(`top-[${value}px]`);
            // If y- is used and no explicit position set, default to relative
            if (!isPositioned && !classes.some(c => ['absolute', 'relative', 'fixed', 'sticky'].includes(c))) {
                classes.push('relative');
            }
        }
        else if (token.startsWith('r-')) {
            const value = token.substring(2);
            if (value)
                classes.push(`rotate-[${value}deg]`);
        }
        // Add other position properties like z-index, bottom, right, fixed, sticky etc. as needed
        // e.g. if (token === 'fixed') { classes.push('fixed'); isPositioned = true; }
    });
    return classes;
};
