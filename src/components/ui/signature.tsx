"use client";

import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import * as opentype from "opentype.js";
import { cn } from "../../lib/utils";

interface SignatureProps {
  /** Text to generate signature for */
  text?: string;
  /** Color of the signature path */
  color?: string;
  /** Font size of the signature */
  fontSize?: number;
  /** Animation duration per character in seconds */
  duration?: number;
  /** Delay before animation starts in seconds */
  delay?: number;
  /** Delay between each character in seconds */
  charDelay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Only animate when in view */
  inView?: boolean;
  /** Only animate once */
  once?: boolean;
  /** Custom font URL to load */
  fontUrl?: string;
  /** Callback when full text finishes animating */
  onAnimationComplete?: () => void;
}

// In-memory font cache so subsequent renders or components load instantaneously
let cachedFont: any = null;

export function Signature({
  text = "Signature",
  color = "currentColor",
  fontSize = 32,
  duration = 0.65,
  delay = 0.1,
  charDelay,
  className,
  inView = false,
  once = true,
  fontUrl,
  onAnimationComplete,
}: SignatureProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [width, setWidth] = useState<number>(300);
  const height = fontSize * 3; // Give plenty of vertical space
  const horizontalPadding = fontSize * 0.1;
  const topMargin = fontSize * 1.5; // Shift down
  const baseline = topMargin;
  const maskId = `signature-reveal-${useId().replace(/:/g, "")}`;

  // Automatically compute character delay so the entire text always finishes promptly
  const stepDelay =
    charDelay !== undefined
      ? charDelay
      : text.length > 7
      ? 0.085
      : 0.12;

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        let font = cachedFont;

        if (!font) {
          const fontPaths = fontUrl
            ? [fontUrl]
            : [
                "/LastoriaBoldRegular.otf",
                "./LastoriaBoldRegular.otf",
                "https://www.componentry.fun/LastoriaBoldRegular.otf",
              ];

          const ot: any = (opentype as any).default || opentype;
          const parseFn = ot.parse || ot;

          for (const path of fontPaths) {
            try {
              const res = await fetch(path);
              if (!res.ok) continue;
              const buffer = await res.arrayBuffer();
              font = parseFn(buffer);
              if (font) {
                cachedFont = font;
                break;
              }
            } catch {
              // Try next path
            }
          }
        }

        if (!font) {
          throw new Error("Font could not be loaded from any path");
        }

        if (isCancelled) return;

        let x = horizontalPadding;
        const newPaths: string[] = [];

        for (const char of text) {
          const glyph = font.charToGlyph(char);
          const path = glyph.getPath(x, baseline, fontSize);
          newPaths.push(path.toPathData(3));

          const advanceWidth = glyph.advanceWidth ?? font.unitsPerEm;
          x += advanceWidth * (fontSize / font.unitsPerEm);
        }

        if (!isCancelled) {
          setPaths(newPaths);
          setWidth(x + horizontalPadding);
        }
      } catch (error) {
        console.error("Signature component font load error:", error);
        if (!isCancelled) {
          setPaths([]);
          setWidth(text.length * fontSize * 0.6);
        }
      }
    }

    load();

    return () => {
      isCancelled = true;
    };
  }, [text, fontSize, baseline, horizontalPadding, fontUrl]);

  const variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1 },
  };

  return (
    <motion.svg
      key={paths.length}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={cn("text-foreground overflow-visible", className)}
      initial="hidden"
      whileInView={inView ? "visible" : undefined}
      animate={inView ? undefined : "visible"}
      viewport={{ once }}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          {paths.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              stroke="white"
              strokeWidth={fontSize * 0.35}
              fill="none"
              variants={variants}
              transition={{
                pathLength: {
                  delay: delay + i * stepDelay,
                  duration,
                  ease: "easeInOut",
                },
                opacity: {
                  delay: delay + i * stepDelay + 0.01,
                  duration: 0.01,
                },
              }}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </mask>
      </defs>

      {paths.map((d, i) => {
        const isLast = i === paths.length - 1;
        return (
          <motion.path
            key={i}
            d={d}
            stroke={color}
            strokeWidth={2}
            fill="none"
            variants={variants}
            onAnimationComplete={isLast ? onAnimationComplete : undefined}
            transition={{
              pathLength: {
                delay: delay + i * stepDelay,
                duration,
                ease: "easeInOut",
              },
              opacity: {
                delay: delay + i * stepDelay + 0.01,
                duration: 0.01,
              },
            }}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="butt"
            strokeLinejoin="round"
          />
        );
      })}

      <g mask={`url(#${maskId})`}>
        {paths.map((d, i) => (
          <path key={i} d={d} fill={color} />
        ))}
      </g>
    </motion.svg>
  );
}

export default Signature;
