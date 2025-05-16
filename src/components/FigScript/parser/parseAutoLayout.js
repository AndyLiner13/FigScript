// src/components/FigScript/parser/parseAutoLayout.ts
import { tokenizeFigScriptString } from './utils';
/**
 * Parses the AutoLayout prop string into Tailwind CSS classes.
 * @param {string | undefined} autoLayoutString - The AutoLayout prop value.
 * @returns {string[]} An array of Tailwind classes.
 */
export const parseAutoLayout = (autoLayoutString) => {
    const tokens = tokenizeFigScriptString(autoLayoutString);
    const classes = [];
    let isFlex = false; // Flag to ensure flex is added if layout properties are present
    tokens.forEach(token => {
        if (token.startsWith('w-')) {
            if (token === 'w-hug')
                classes.push('w-auto');
            else if (token === 'w-fill')
                classes.push('w-full');
            // Example: w-100 -> w-[100px], w-1/2 -> w-1/2
            else if (/w-\d+(\/\d+)?$/.test(token) && !token.includes('[')) { // handles w-100, w-1/2
                const valuePart = token.split('-')[1];
                if (valuePart.includes('/'))
                    classes.push(token); // w-1/2
                else
                    classes.push(`w-[${valuePart}px]`); // w-100
            }
            else
                classes.push(token); // For pre-defined like w-screen or arbitrary w-[value]
        }
        else if (token.startsWith('h-')) {
            if (token === 'h-hug')
                classes.push('h-auto');
            else if (token === 'h-fill')
                classes.push('h-full');
            // Example: h-80 -> h-[80px], h-1/3 -> h-1/3
            else if (/h-\d+(\/\d+)?$/.test(token) && !token.includes('[')) { // handles h-80, h-1/3
                const valuePart = token.split('-')[1];
                if (valuePart.includes('/'))
                    classes.push(token); // h-1/3
                else
                    classes.push(`h-[${valuePart}px]`); // h-80
            }
            else
                classes.push(token);
        }
        else if (token.startsWith('gap-')) {
            const value = token.split('-')[1];
            if (value)
                classes.push(`gap-[${value}px]`);
            isFlex = true;
        }
        else if (token === 'vertical') {
            classes.push('flex-col');
            isFlex = true;
        }
        else if (token === 'horizontal') {
            classes.push('flex-row');
            isFlex = true;
        }
        else if (token.startsWith('h-pad-')) {
            const value = token.split('-')[2];
            if (value)
                classes.push(`px-[${value}px]`);
        }
        else if (token.startsWith('v-pad-')) {
            const value = token.split('-')[2];
            if (value)
                classes.push(`py-[${value}px]`);
        }
        else {
            // Alignment emojis
            isFlex = true; // Alignment implies flex
            switch (token) {
                case '↖️':
                    classes.push('justify-start', 'items-start');
                    break;
                case '⬆️':
                    classes.push('justify-center', 'items-start');
                    break;
                case '↗️':
                    classes.push('justify-end', 'items-start');
                    break;
                case '⬅️':
                    classes.push('justify-start', 'items-center');
                    break;
                case '⏺️':
                    classes.push('justify-center', 'items-center');
                    break;
                case '➡️':
                    classes.push('justify-end', 'items-center');
                    break;
                case '↙️':
                    classes.push('justify-start', 'items-end');
                    break;
                case '⬇️':
                    classes.push('justify-center', 'items-end');
                    break;
                case '↘️':
                    classes.push('justify-end', 'items-end');
                    break;
                default:
                    // console.warn(`FigScript AutoLayout: Unknown token "${token}"`);
                    break;
            }
        }
    });
    if (isFlex && !classes.some(c => c.startsWith('flex') || c === 'flex')) {
        classes.unshift('flex');
    }
    return classes;
};
