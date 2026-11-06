/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — the collection deck
 *
 * Read top-to-bottom. Each `at` value is ms after mount.
 *
 *    0ms   deck mounts; every card waits below its resting place
 *  150ms   cards rise into the fan, left → right (staggered 70ms)
 *  600ms   the current collection's card rises out of the deck
 *
 * Interactions (no timeline, spring on change):
 *  hover / focus   card lifts 14px
 *  navigate        old card sinks, new card rises (deck persists)
 *  hidden          whole deck slides down out of view (day pages)
 * ───────────────────────────────────────────────────────── */

import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { motion, MotionConfig, useReducedMotion, type Transition } from 'motion/react';
import { COLLECTIONS, type CollectionId } from '@/data/collections';
import { CardArt } from './CardArt';
import type { DeckTuning } from './tuning';
import { DECK_TUNING_DEFAULTS } from './tuning';
import './deck.css';

const TIMING = {
  fanIn:       150,   // cards start rising into the fan
  raiseActive: 600,   // current card rises out of the deck
};

/* Card geometry per layout. Positions are relative to the deck's
 * horizontal centre; y grows downward. */
const GEOMETRY = {
  dock:       { width: 196, height: 252, peek: 100 },  // peek = px visible above the fold
  dockSmall:  { width: 132, height: 170, peek: 76 },
  hero:       { width: 210, height: 270, peek: 270 },
  heroSmall:  { width: 128, height: 165, peek: 165 },
};

/* Card entrance */
const CARD = {
  enterOffset: 240,   // px below resting position before the fan-in
};

/* Whole deck hides on day pages */
const HIDE = {
  offset: 320,        // px the deck drops when hidden
  spring: { type: 'spring' as const, stiffness: 300, damping: 30 },
};

const DeckDials = import.meta.env.DEV ? lazy(() => import('./DeckDials')) : null;

const SMALL_QUERY = '(max-width: 640px)';

function useIsSmall(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(SMALL_QUERY);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(SMALL_QUERY).matches,
    () => false,
  );
}

export interface DeckProps {
  /** The collection whose page is showing; its card is raised */
  active?: CollectionId | null;
  /** dock: pinned to the bottom of the viewport. hero: in the page flow. */
  variant?: 'dock' | 'hero';
  /** Slide the whole deck out of view (day pages) */
  hidden?: boolean;
  /** Collections the member has not bought; their card shows a lock */
  locked?: CollectionId[];
  /** Change to replay the entrance (development) */
  replayTrigger?: number;
}

export default function Deck({
  active = null,
  variant = 'dock',
  hidden = false,
  locked = [],
  replayTrigger = 0,
}: DeckProps) {
  const reduceMotion = useReducedMotion();
  const small = useIsSmall();
  const [stage, setStage] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [tuning, setTuning] = useState<DeckTuning>(DECK_TUNING_DEFAULTS);
  const [devReplay, setDevReplay] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setStage(2);
      return;
    }
    setStage(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), TIMING.fanIn));
    timers.push(setTimeout(() => setStage(2), TIMING.raiseActive));
    return () => timers.forEach(clearTimeout);
  }, [replayTrigger, devReplay, reduceMotion]);

  const geo = GEOMETRY[`${variant}${small ? 'Small' : ''}` as keyof typeof GEOMETRY];
  const t = small ? tuning.small : tuning.large;
  const count = COLLECTIONS.length;
  const mid = (count - 1) / 2;

  const enterSpring: Transition = tuning.enterSpring;
  const raiseSpring: Transition = tuning.raiseSpring;

  const restY = geo.height - geo.peek; // push card down so only `peek` shows

  const cards = useMemo(
    () =>
      COLLECTIONS.map((c, i) => {
        const offset = i - mid;
        return {
          ...c,
          index: i,
          x: offset * t.spread - geo.width / 2,
          rotate: offset * t.fanAngle,
          arcY: offset * offset * t.arc,
        };
      }),
    [mid, t.spread, t.fanAngle, t.arc, geo.width],
  );

  const onTuningChange = useCallback((next: DeckTuning) => setTuning(next), []);
  const onReplay = useCallback(() => setDevReplay((n) => n + 1), []);

  // Hero cards sit fully in view, so leave room under them for the fan's arc
  const maxArc = mid * mid * t.arc;
  const cardBottom = variant === 'hero' ? maxArc + 8 : 0;
  const containerHeight =
    variant === 'hero' ? geo.height + t.rise + maxArc + 24 : geo.peek + t.rise + 24;

  return (
    <MotionConfig reducedMotion="user">
      <motion.nav
        aria-label="Collections"
        className={`deck deck--${variant}`}
        style={{ height: containerHeight }}
        initial={false}
        animate={
          hidden
            ? { y: HIDE.offset, transitionEnd: { visibility: 'hidden' } }
            : { y: 0, visibility: 'visible' }
        }
        transition={HIDE.spring}
        inert={hidden || undefined}
      >
        {cards.map((card) => {
          const isActive = card.id === active;
          const isLocked = locked.includes(card.id);
          const isHovered = hovered === card.index;

          const lift =
            (stage >= 2 && isActive ? t.rise : 0) + (isHovered && !isActive ? t.hoverLift : 0);
          const y = stage >= 1 ? restY + card.arcY - lift : restY + CARD.enterOffset;

          return (
            <motion.a
              key={card.id}
              href={card.href}
              className={`deck-card deck-card--ink-${card.ink}`}
              aria-current={isActive ? 'page' : undefined}
              data-astro-prefetch
              style={{
                width: geo.width,
                height: geo.height,
                background: card.color,
                zIndex: isActive ? count + 1 : card.index + 1,
                fontSize: geo.width * 0.118,
                left: '50%',
                bottom: cardBottom,
                transformOrigin: '50% 100%',
              }}
              initial={{ x: card.x, y: restY + CARD.enterOffset, rotate: card.rotate }}
              animate={{ x: card.x, y, rotate: isActive && stage >= 2 ? card.rotate * 0.4 : card.rotate }}
              transition={{
                ...(stage >= 2 ? raiseSpring : enterSpring),
                delay: stage === 1 ? card.index * tuning.stagger : 0,
              }}
              onHoverStart={() => setHovered(card.index)}
              onHoverEnd={() => setHovered((h) => (h === card.index ? null : h))}
              onFocus={() => setHovered(card.index)}
              onBlur={() => setHovered((h) => (h === card.index ? null : h))}
            >
              <CardArt pattern={card.pattern} />
              <span className="deck-card__title serif">
                {card.cardLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
              {isLocked && (
                <span className="deck-card__lock" aria-label="Not yet unlocked">
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
                    <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </span>
              )}
            </motion.a>
          );
        })}
      </motion.nav>
      {DeckDials && (
        <Suspense fallback={null}>
          <DeckDials onChange={onTuningChange} onReplay={onReplay} />
        </Suspense>
      )}
    </MotionConfig>
  );
}
