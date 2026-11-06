/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — copy mode
 *
 * Read top-to-bottom. Each `at` value is ms after mount.
 *
 *    0ms   controls visible; passage waits 8px low, transparent
 *  120ms   passage settles into place
 * 3200ms   no interaction → controls fade away
 *
 * Interactions:
 *  pointer / key      controls fade back in (fast), idle timer restarts
 *  sentence step      current sentence at full ink, the rest dim to 18%
 *  size change        text reflows; current sentence stays in view
 * ───────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, MotionConfig, useReducedMotion } from 'motion/react';
import { paragraphs as splitParagraphs, runs, sentences } from '@/lib/format';
import './copy.css';

const TIMING = {
  passageIn:    120,    // passage settles into place
  controlsIdle: 3200,   // controls hide after this long without input
};

/* The passage block */
const PASSAGE = {
  offsetY: 8,  // px it rises from on mount
  spring: { type: 'spring' as const, stiffness: 300, damping: 30 },
};

/* Top and bottom control bars */
const CONTROLS = {
  fadeIn:  { duration: 0.15 },   // appear quickly when wanted
  fadeOut: { duration: 0.6 },    // leave slowly so it never feels abrupt
};

/* Sentence-by-sentence focus */
const FOCUS = {
  dimOpacity: 0.18,                      // opacity of sentences not in focus
  transition: { duration: 0.25, ease: 'easeOut' as const },
};

/* Text size steps in px; index persists per device */
const SIZES = [18, 20, 22, 24, 27, 30, 34, 38];
const DEFAULT_SIZE_INDEX = { phone: 2, desktop: 4 };

const STORAGE = {
  size: 'storywork:copy:size',
  sentenceMode: 'storywork:copy:sentences',
};

interface Props {
  passage: string;
  dayLabel: string;
  title: string;
  author: string;
  work: string;
  backHref: string;
}

function readNumber(key: string): number | null {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

function save(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* fine: preference just won't persist */
  }
}

export default function CopyMode({ passage, dayLabel, title, author, work, backHref }: Props) {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [sizeIndex, setSizeIndex] = useState<number | null>(null);
  const [sentenceMode, setSentenceMode] = useState(false);
  const [current, setCurrent] = useState(0);
  const [awake, setAwake] = useState<boolean | null>(null);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentenceRefs = useRef<Array<HTMLSpanElement | null>>([]);

  /* Paragraphs → sentences, numbered across the whole passage */
  const structure = useMemo(() => {
    let i = 0;
    return splitParagraphs(passage).map((p) => sentences(p).map((s) => ({ index: i++, text: s })));
  }, [passage]);
  const sentenceCount = structure.reduce((n, p) => n + p.length, 0);

  /* Mount: restore preferences, play the entrance */
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 640px)').matches;
    const stored = readNumber(STORAGE.size);
    setSizeIndex(
      stored !== null && stored >= 0 && stored < SIZES.length
        ? stored
        : phone
          ? DEFAULT_SIZE_INDEX.phone
          : DEFAULT_SIZE_INDEX.desktop,
    );
    setSentenceMode(readNumber(STORAGE.sentenceMode) === 1);
    setCanFullscreen(Boolean(document.documentElement.requestFullscreen));

    if (reduceMotion) {
      setStage(1);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), TIMING.passageIn));
    return () => timers.forEach(clearTimeout);
  }, [reduceMotion]);

  /* Keep the screen awake while the page is visible */
  useEffect(() => {
    if (!('wakeLock' in navigator)) {
      setAwake(null);
      return;
    }
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        setAwake(true);
        lock.addEventListener('release', () => setAwake(false));
      } catch {
        setAwake(false);
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  /* Controls: show on any input, hide after idle */
  const poke = useCallback(() => {
    setControlsVisible(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setControlsVisible(false), TIMING.controlsIdle);
  }, []);

  useEffect(() => {
    poke();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [poke]);

  const changeSize = useCallback(
    (delta: number) => {
      setSizeIndex((i) => {
        const next = Math.max(0, Math.min(SIZES.length - 1, (i ?? 0) + delta));
        save(STORAGE.size, String(next));
        return next;
      });
      poke();
    },
    [poke],
  );

  const toggleSentences = useCallback(() => {
    setSentenceMode((on) => {
      save(STORAGE.sentenceMode, on ? '0' : '1');
      return !on;
    });
    poke();
  }, [poke]);

  const step = useCallback(
    (delta: number) => {
      setCurrent((c) => Math.max(0, Math.min(sentenceCount - 1, c + delta)));
    },
    [sentenceCount],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
    poke();
  }, [poke]);

  /* Keyboard: arrows/space step sentences, +/- size, s toggles mode */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (sentenceMode && (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'j')) {
        e.preventDefault();
        step(1);
      } else if (sentenceMode && (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k')) {
        e.preventDefault();
        step(-1);
      } else if (e.key === '+' || e.key === '=') {
        changeSize(1);
      } else if (e.key === '-' || e.key === '_') {
        changeSize(-1);
      } else if (e.key === 's') {
        toggleSentences();
      } else if (e.key === 'Escape' && !document.fullscreenElement) {
        window.location.href = backHref;
      }
      poke();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sentenceMode, step, changeSize, toggleSentences, poke, backHref]);

  /* Keep the focused sentence in view */
  useEffect(() => {
    if (!sentenceMode) return;
    sentenceRefs.current[current]?.scrollIntoView({
      block: 'center',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [current, sentenceMode, sizeIndex, reduceMotion]);

  const fontSize = sizeIndex === null ? undefined : SIZES[sizeIndex];

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`copy${controlsVisible ? '' : ' copy--idle'}`}
        onPointerMove={poke}
        onPointerDown={poke}
      >
        <motion.header
          className="copy__bar copy__bar--top"
          initial={false}
          animate={{ opacity: controlsVisible ? 1 : 0 }}
          transition={controlsVisible ? CONTROLS.fadeIn : CONTROLS.fadeOut}
          inert={!controlsVisible || undefined}
        >
          <a className="copy__back" href={backHref}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M10 3.5L5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {dayLabel}
          </a>
          <p className="copy__title">
            {title}
            {awake && <span className="copy__awake"> · Screen stays on</span>}
          </p>
          <div className="copy__tools" role="group" aria-label="Reading controls">
            <button type="button" onClick={() => changeSize(-1)} aria-label="Smaller text" disabled={sizeIndex === 0}>
              <span aria-hidden="true" className="copy__a copy__a--small">A</span>
            </button>
            <button type="button" onClick={() => changeSize(1)} aria-label="Larger text" disabled={sizeIndex === SIZES.length - 1}>
              <span aria-hidden="true" className="copy__a copy__a--large">A</span>
            </button>
            <button
              type="button"
              onClick={toggleSentences}
              aria-pressed={sentenceMode}
              aria-label="Sentence by sentence"
              title="Sentence by sentence (S)"
              className={sentenceMode ? 'is-on' : undefined}
            >
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <path d="M3 6h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
                <path d="M3 10h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M3 14h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
              </svg>
            </button>
            {canFullscreen && (
              <button type="button" onClick={toggleFullscreen} aria-label="Full screen" title="Full screen">
                <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                  <path d="M2.5 5.5V2.5h3M13.5 5.5V2.5h-3M2.5 10.5v3h3M13.5 10.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </motion.header>

        <main id="main" className="copy__page">
          <motion.figure
            className="copy__passage"
            initial={{ opacity: 0, y: PASSAGE.offsetY }}
            animate={{ opacity: stage >= 1 ? 1 : 0, y: stage >= 1 ? 0 : PASSAGE.offsetY }}
            transition={PASSAGE.spring}
            style={{ fontSize }}
          >
            <blockquote className="copy__text serif">
              {structure.map((para, pi) => (
                <p key={pi}>
                  {para.map((s) => (
                    <motion.span
                      key={s.index}
                      ref={(el: HTMLSpanElement | null) => {
                        sentenceRefs.current[s.index] = el;
                      }}
                      className="copy__sentence"
                      initial={false}
                      animate={{ opacity: !sentenceMode || s.index === current ? 1 : FOCUS.dimOpacity }}
                      transition={FOCUS.transition}
                      onClick={sentenceMode ? () => setCurrent(s.index) : undefined}
                    >
                      {runs(s.text).map((r, ri) => (r.em ? <em key={ri}>{r.text}</em> : <span key={ri}>{r.text}</span>))}{' '}
                    </motion.span>
                  ))}
                </p>
              ))}
            </blockquote>
            <figcaption className="copy__source">
              {author}, <cite>{work}</cite>
            </figcaption>
          </motion.figure>
        </main>

        {sentenceMode && (
          <motion.footer
            className="copy__bar copy__bar--bottom"
            initial={false}
            animate={{ opacity: controlsVisible ? 1 : 0.35 }}
            transition={controlsVisible ? CONTROLS.fadeIn : CONTROLS.fadeOut}
          >
            <button type="button" onClick={() => step(-1)} disabled={current === 0} aria-label="Previous sentence">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M10 3.5L5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="copy__count" aria-live="polite">
              {current + 1} of {sentenceCount}
            </span>
            <button type="button" onClick={() => step(1)} disabled={current === sentenceCount - 1} aria-label="Next sentence">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </motion.footer>
        )}
      </div>
    </MotionConfig>
  );
}
