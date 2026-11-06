/**
 * "One day at a time": if the member already finished a different day
 * today and opens another unfinished one, show a gentle note. Nothing
 * is locked; the note can be dismissed for this day.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { isToday, useProgress } from '@/lib/progress-store';

/* The note slides down into place */
const NOTE = {
  offsetY: -6,  // px it drops from
  spring: { type: 'spring' as const, stiffness: 350, damping: 28 },
};

export default function SameDayNote({ day }: { day: number }) {
  const progress = useProgress();
  const [dismissed, setDismissed] = useState(true); // avoid a flash before storage is read
  const dismissKey = `storywork:same-day-dismissed:${day}`;

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(dismissKey) === '1');
    } catch {
      setDismissed(false);
    }
  }, [dismissKey]);

  const doneToday = Object.entries(progress).find(
    ([d, iso]) => Number(d) !== day && isToday(iso),
  );
  const show = !dismissed && !progress[day] && Boolean(doneToday);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(dismissKey, '1');
    } catch {
      /* fine: it just reappears next visit */
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {show && (
          <motion.aside
            className="same-day-note"
            initial={{ opacity: 0, y: NOTE.offsetY }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: NOTE.offsetY, transition: { duration: 0.15 } }}
            transition={NOTE.spring}
            role="note"
          >
            <p>
              You’ve done today’s work. This one will keep until tomorrow, and the passage you
              copied today will sink in better with a night’s sleep.
            </p>
            <button type="button" onClick={dismiss}>
              Continue anyway
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
