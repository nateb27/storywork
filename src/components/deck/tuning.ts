import type { Transition } from 'motion/react';

/**
 * Values that shape the deck's fan and motion. These are the
 * production defaults; in development the DialKit panel overrides
 * them live (see DeckDials.tsx). Bake tuned values back in here.
 */

export interface FanTuning {
  spread: number;     // px between card centres
  fanAngle: number;   // degrees of rotation per card from centre
  arc: number;        // px each card drops per step² from centre
  rise: number;       // px the current card rises out of the deck
  hoverLift: number;  // px a card lifts on hover or focus
}

export interface DeckTuning {
  large: FanTuning;
  small: FanTuning;
  stagger: number;          // seconds between cards during the fan-in
  enterSpring: Transition;  // cards rising into the fan
  raiseSpring: Transition;  // current card rising, hover lifts
}

export const DECK_TUNING_DEFAULTS: DeckTuning = {
  large: { spread: 124, fanAngle: 6, arc: 9, rise: 46, hoverLift: 14 },
  small: { spread: 74, fanAngle: 7, arc: 6, rise: 30, hoverLift: 10 },
  stagger: 0.07,
  enterSpring: { type: 'spring', stiffness: 350, damping: 28 },  // balanced entrance
  raiseSpring: { type: 'spring', stiffness: 500, damping: 25 },  // snappy pop
};
