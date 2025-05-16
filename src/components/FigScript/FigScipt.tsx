// src/components/FigScript/FigScript.tsx
import React, { ElementType, ReactNode } from 'react';
import { parseAutoLayout } from './parser/parseAutoLayout';
import { parsePosition } from './parser/parsePosition';
import { parseAppearance } from './parser/parseAppearance';
import { parseFill } from './parser/parseFill';

export interface FigScriptProps {
  children?: ReactNode; // Made children optional as some elements might not have them
  AutoLayout?: string;
  Position?: string;
  Appearance?: string;
  Fill?: string;
  as?: ElementType;
  className?: string;
  // Allow any other HTML attributes
  [key: string]: any;
}

export const FigScript: React.FC<FigScriptProps> = ({
  children,
  AutoLayout: autoLayoutString,
  Position: positionString,
  Appearance: appearanceString,
  Fill: fillString,
  as: Component = 'div',
  className: additionalClasses = '',
  ...restProps
}) => {
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

  return (
    <Component className={finalClassName} {...restProps}>
      {children}
    </Component>
  );
};

// No default export for the component file itself if it's part of a library
// The main export will be from src/index.ts