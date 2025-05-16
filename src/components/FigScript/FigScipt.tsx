// src/components/FigScript/FigScipt.tsx
import React, { ElementType, ReactNode, useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { parseLayout } from './parser/parseLayout';
import { parsePosition } from './parser/parsePosition';
import { parseAppearance } from './parser/parseAppearance';
import { parseFill } from './parser/parseFill';
import { parseStroke } from './parser/parseStroke';
import { FigScriptParseResult } from './parser/types';

export interface FigScriptProps {
  children?: ReactNode;
  Position?: string; // Required in FigScript Mappings
  Layout?: string;   // Required in FigScript Mappings
  Appearance?: string; // Required in FigScript Mappings
  Fill?: string;     // Optional
  Stroke?: string;   // Optional
  as?: ElementType;
  className?: string;
  objectName?: string; // New prop for HTML id
  // Optional callback for development/debugging to get parsing issues
  onParseDiagnostics?: (diagnostics: { errors: string[], warnings: string[] }) => void;
  [key: string]: any; // Allow any other HTML attributes
}

export const FigScript: React.FC<FigScriptProps> = ({
  children,
  Position: positionString,
  Layout: layoutString,
  Appearance: appearanceString,
  Fill: fillString,
  Stroke: strokeString,
  as: Component = 'div',
  className: additionalClasses = '',
  objectName,
  onParseDiagnostics,
  ...restProps
}) => {
  // Memoize parsing results to avoid re-parsing on every render if props haven't changed.
  const {
    allClasses,
    isFixed,
    errors,
    warnings
  } = useMemo(() => {
    const collectedClasses: string[] = [];
    const collectedErrors: string[] = [];
    const collectedWarnings: string[] = [];
    let fixedPosition = false;

    // Helper to process and collect results from each parser
    const processParser = (parser: (input?: string) => FigScriptParseResult | (FigScriptParseResult & { isFixed?: boolean }), input?: string) => {
      const result = parser(input);
      collectedClasses.push(...result.classes);
      collectedErrors.push(...result.errors);
      collectedWarnings.push(...result.warnings);
      if ('isFixed' in result && typeof result.isFixed === 'boolean') {
        fixedPosition = result.isFixed;
      }
    };

    // Order of parsing might matter if one parser's output could influence another,
    // but generally, they should be independent based on their specific props.
    // Position parser needs to run to determine `isFixed` for portal logic.
    const positionResult = parsePosition(positionString);
    collectedClasses.push(...positionResult.classes);
    collectedErrors.push(...positionResult.errors);
    collectedWarnings.push(...positionResult.warnings);
    fixedPosition = positionResult.isFixed;

    processParser(parseLayout, layoutString);
    processParser(parseAppearance, appearanceString);
    processParser(parseFill, fillString);
    processParser(parseStroke, strokeString);

    return {
      allClasses: Array.from(new Set(collectedClasses)), // Ensure unique classes
      isFixed: fixedPosition,
      errors: collectedErrors,
      warnings: collectedWarnings,
    };
  }, [positionString, layoutString, appearanceString, fillString, strokeString]);

  // Log errors and warnings during development or call diagnostic callback
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (errors.length > 0) {
        console.error('FigScript Parsing Errors:', errors);
      }
      if (warnings.length > 0) {
        console.warn('FigScript Parsing Warnings:', warnings);
      }
    }
    if (onParseDiagnostics) {
      onParseDiagnostics({ errors, warnings });
    }
  }, [errors, warnings, onParseDiagnostics]);


  const finalClassName = [...allClasses, ...additionalClasses.split(' ').filter(Boolean)].join(' ');

  const elementProps: Record<string, any> = {
    className: finalClassName,
    ...restProps,
  };

  if (objectName) {
    elementProps.id = objectName;
  }

  const element = (
    <Component {...elementProps}>
      {children}
    </Component>
  );

  // State to ensure portalTarget is only accessed on the client-side for fixed elements
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (isFixed) {
      // document.body is only available on the client.
      setPortalTarget(document.body);
    } else {
      setPortalTarget(null); // Reset if not fixed
    }
  }, [isFixed]);

  if (isFixed && portalTarget) {
    return ReactDOM.createPortal(element, portalTarget);
  }

  return element;
};
