'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Reveals text one character at a time so a young reader is encouraged to read
 * along (a block of text gets skipped; a line that "types out" gets read). Tap
 * anywhere on the text to reveal it all instantly — fast readers aren't held
 * hostage. Respects `prefers-reduced-motion` (shows the full line immediately).
 *
 * `key`-change or a new `text` restarts the animation; `onDone` fires once the
 * full line is visible (used to reveal the Next button only after reading time).
 */
export function Typewriter({
  text,
  speedMs = 38,
  startDelayMs = 0,
  onDone,
}: {
  text: string;
  speedMs?: number;
  startDelayMs?: number;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // (Re)start the reveal whenever the text changes.
  useEffect(() => {
    doneRef.current = false;

    if (reducedMotion) {
      setShown(text.length);
      onDone?.();
      doneRef.current = true;
      return;
    }

    setShown(0);
    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setShown(i);
        if (i >= text.length) {
          if (interval) clearInterval(interval);
          if (!doneRef.current) {
            doneRef.current = true;
            onDone?.();
          }
        }
      }, speedMs);
    }, startDelayMs);

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
    // onDone intentionally excluded — we only restart on text/timing changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speedMs, startDelayMs, reducedMotion]);

  const revealAll = () => {
    setShown(text.length);
    if (!doneRef.current) {
      doneRef.current = true;
      onDone?.();
    }
  };

  const typing = shown < text.length;

  return (
    <span className="typewriter" onClick={revealAll} role="presentation">
      {text.slice(0, shown)}
      {typing && <span className="tw-caret" aria-hidden="true" />}
    </span>
  );
}
