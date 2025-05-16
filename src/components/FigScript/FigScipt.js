import { jsx as _jsx } from "react/jsx-runtime";
import { parseAutoLayout } from './parser/parseAutoLayout';
import { parsePosition } from './parser/parsePosition';
import { parseAppearance } from './parser/parseAppearance';
import { parseFill } from './parser/parseFill';
export const FigScript = ({ children, AutoLayout: autoLayoutString, Position: positionString, Appearance: appearanceString, Fill: fillString, as: Component = 'div', className: additionalClasses = '', ...restProps }) => {
    const autoLayoutClasses = parseAutoLayout(autoLayoutString);
    const positionClasses = parsePosition(positionString);
    const appearanceClasses = parseAppearance(appearanceString);
    const fillClasses = parseFill(fillString);
    const allFigScriptClasses = [
        ...autoLayoutClasses,
        ...positionClasses,
        ...appearanceClasses,
        ...fillClasses,
    ];
    const uniqueClasses = Array.from(new Set(allFigScriptClasses));
    const finalClassName = [...uniqueClasses, ...additionalClasses.split(' ').filter(Boolean)].join(' ');
    return (_jsx(Component, { className: finalClassName, ...restProps, children: children }));
};
