/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — marking a day done
 *
 * Read top-to-bottom. Each `at` value is ms after the tap.
 *
 *    0ms   tap; the ring fills with ink, scale 0.85 → 1.0
 *   90ms   the check draws itself, stroke 0 → 100%
 *  320ms   confirmation line rises in: "Day 3 done."
 *
 * Undo reverses instantly (no ceremony for taking it back).
 * Already-done days render at the final stage on load.
 * ───────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { markDone, markNotDone, useProgress } from '@/lib/progress-store';

const TIMING = {
  ringFill:  0,     // ring fills and pops
  checkDraw: 90,    // check stroke draws
  confirm:   320,   // confirmation line appears
};

/* The circle behind the check */
const RING = {
  initialScale: 0.85,  // scale at the moment of the tap
  finalScale:   1,     // resting scale
  spring: { type: 'spring' as const, stiffness: 500, damping: 25 },
};

/* The check stroke */
const CHECK = {
  duration: 0.28,                       // seconds to draw
  ease: [0.65, 0, 0.35, 1] as const,    // in-out, like a pen stroke
};

/* The confirmation line under the bottom button */
const CONFIRM = {
  offsetY: 6,  // px it rises from
  spring: { type: 'spring' as const, stiffness: 350, damping: 28 },
};

interface Props {
  day: number;
  /** icon: quiet circle beside the title. button: the call to action after the work. */
  variant: 'icon' | 'button';
  /** Shown after completion on the button variant, e.g. "Day 4 will keep until tomorrow." */
  note?: string;
  /** Where to go once the day is done */
  nextHref?: string;
  nextLabel?: string;
}

function useCompletionStage(done: boolean) {
  const [stage, setStage] = useState(done ? 3 : 0);
  const [replayTrigger, setReplayTrigger] = useState(0);
  const wasDone = useRef(done);

  useEffect(() => {
    if (!done) {
      setStage(0);
      wasDone.current = false;
      return;
    }
    if (wasDone.current && replayTrigger === 0) {
      setStage(3);
      return;
    }
    wasDone.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), TIMING.ringFill));
    timers.push(setTimeout(() => setStage(2), TIMING.checkDraw));
    timers.push(setTimeout(() => setStage(3), TIMING.confirm));
    return () => timers.forEach(clearTimeout);
  }, [done, replayTrigger]);

  return { stage, replay: () => setReplayTrigger((n) => n + 1) };
}

function CheckMark({ stage, size }: { stage: number; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={stage >= 1 ? 0 : 0.55} />
      <motion.circle
        cx="12"
        cy="12"
        r="11"
        fill="currentColor"
        initial={false}
        animate={{
          scale: stage >= 1 ? RING.finalScale : RING.initialScale,
          opacity: stage >= 1 ? 1 : 0,
        }}
        style={{ transformOrigin: '12px 12px' }}
        transition={RING.spring}
      />
      <motion.path
        d="M7.2 12.4l3.1 3.1 6.5-6.7"
        fill="none"
        stroke={stage >= 1 ? 'var(--paper)' : 'currentColor'}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: stage >= 2 ? 1 : 0, opacity: stage >= 2 ? 1 : 0 }}
        transition={{ duration: CHECK.duration, ease: CHECK.ease }}
      />
    </svg>
  );
}

export default function Complete({ day, variant, note, nextLabel, nextHref }: Props) {
  const progress = useProgress();
  const done = Boolean(progress[day]);
  const { stage } = useCompletionStage(done);

  const toggle = () => (done ? markNotDone(day) : markDone(day));

  if (variant === 'icon') {
    return (
      <MotionConfig reducedMotion="user">
        <button
          type="button"
          className={`complete-icon${done ? ' is-done' : ''}`}
          onClick={toggle}
          aria-pressed={done}
          aria-label={done ? `Day ${day} done. Mark as not done` : `Mark day ${day} as done`}
          title={done ? 'Done' : 'Mark as done'}
        >
          <CheckMark stage={stage} size={22} />
        </button>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="complete-block">
        <button
          type="button"
          className={`button complete-button${done ? ' is-done' : ''}`}
          onClick={toggle}
          aria-pressed={done}
        >
          <CheckMark stage={stage} size={20} />
          <span>{done ? `Day ${day} done` : 'I’ve copied today’s passage'}</span>
        </button>
        <AnimatePresence>
          {done && stage >= 3 && (
            <motion.p
              className="complete-confirm"
              initial={{ opacity: 0, y: CONFIRM.offsetY }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={CONFIRM.spring}
              aria-live="polite"
            >
              <span>That’s today’s work.{note && ` ${note}`}</span>
              {nextHref && nextLabel && <a href={nextHref}>{nextLabel}</a>}
              <button type="button" className="complete-undo" onClick={() => markNotDone(day)}>
                Undo
              </button>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
