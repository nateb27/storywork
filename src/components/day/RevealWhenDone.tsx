/**
 * Shows its (server-rendered) children only once the given day is
 * marked done. Used for the Five More offer at the end of Day 10, so it
 * appears after the work, never before it.
 */
import type { ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useProgress } from '@/lib/progress-store';

/* The offer rises in after the completion confirmation */
const REVEAL = {
  delay: 0.45,  // seconds: after the check and the confirmation line
  offsetY: 10,  // px it rises from
  spring: { type: 'spring' as const, stiffness: 300, damping: 30 },
};

export default function RevealWhenDone({ day, children }: { day: number; children?: ReactNode }) {
  const done = Boolean(useProgress()[day]);
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: REVEAL.offsetY }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ ...REVEAL.spring, delay: REVEAL.delay }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
