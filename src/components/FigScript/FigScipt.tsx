// src/components/FigScript/FigScript.tsx
import React, { ElementType, ReactNode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom'; // Import ReactDOM for Portals
import { parseAutoLayout } from './parser/parseAutoLayout';
import { parsePosition as parsePositionString } // Renamed to avoid conflict with the Position prop
from './parser/parsePosition';
import { parseAppearance } from './parser/parseAppearance';
import { parseFill } from './parser/parseFill';

export interface FigScriptProps {
  children?: ReactNode;
  AutoLayout?: string;
  Position?: string;
  Appearance?: string;
  Fill?: string;
  as?: ElementType;
  className?: string;
  [key: string]: any; // Allow any other HTML attributes
}

export const FigScript: React.FC<FigScriptProps> = ({
  children,
  AutoLayout: autoLayoutString,
  Position: positionStringProp, // Renamed to avoid conflict with the local variable
  Appearance: appearanceString,
  Fill: fillString,
  as: Component = 'div',
  className: additionalClasses = '',
  ...restProps
}) => {
  const autoLayoutClasses = parseAutoLayout(autoLayoutString);
  const { classes: positionClasses, isFixed } = parsePositionString(positionStringProp);
  const appearanceClasses = parseAppearance(appearanceString);
  const fillClasses = parseFill(fillString);

  // If 'isFixed' (due to 'ignore-auto-layout'), AutoLayout properties might not be desired
  // as 'fixed' removes the item from the normal flow.
  // However, width/height from AutoLayout (w-hug, h-100) could still be relevant.
  // For now, we'll allow AutoLayout classes, but be mindful of conflicts.
  // A more advanced logic could selectively filter AutoLayout classes if isFixed is true.
  const allFigScriptClasses = isFixed
    ? [...positionClasses, ...appearanceClasses, ...fillClasses, ...autoLayoutClasses] // Let's keep AutoLayout for w/h for now
    : [
        ...autoLayoutClasses,
        ...positionClasses,
        ...appearanceClasses,
        ...fillClasses,
      ];

  const uniqueClasses = Array.from(new Set(allFigScriptClasses));
  const finalClassName = [...uniqueClasses, ...additionalClasses.split(' ').filter(Boolean)].join(' ');

  const element = (
    <Component className={finalClassName} {...restProps}>
      {children}
    </Component>
  );

  // State to ensure portalTarget is only accessed on the client-side
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // document.body is only available on the client.
    // This effect runs after the component mounts on the client.
    if (isFixed) {
      setPortalTarget(document.body);
    }
  }, [isFixed]);

  // If isFixed is true AND we are on the client (portalTarget is set), render into portal.
  if (isFixed && portalTarget) {
    return ReactDOM.createPortal(element, portalTarget);
  }

  // Otherwise, render in place (SSR, or if not fixed, or before client-side effect).
  // If `position: fixed` CSS is sufficient without DOM moving for your needs,
  // the portal logic can be removed, and `isFixed` would just ensure the correct CSS classes.
  // However, "moves ... to the root of the page frame" strongly implies a DOM structure change.
  return element;
};