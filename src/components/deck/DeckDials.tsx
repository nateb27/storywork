/**
 * Development-only live controls for the deck (DialKit 2.0).
 * Loaded lazily from Deck.tsx behind `import.meta.env.DEV`, so neither
 * this file nor DialKit reaches the production bundle.
 *
 * Tune in the running page, press Copy in the panel, and bake the
 * values into DECK_TUNING_DEFAULTS in tuning.ts.
 */

import { useEffect } from 'react';
import { DialRoot, useDialKit, type TransitionConfig } from 'dialkit';
import type { Transition } from 'motion/react';
import 'dialkit/styles.css';
import { DECK_TUNING_DEFAULTS as D, type DeckTuning } from './tuning';

function toMotionTransition(curve: TransitionConfig): Transition {
  return curve.type === 'easing'
    ? { type: 'tween', duration: curve.duration, ease: curve.ease }
    : curve;
}

interface Props {
  onChange: (tuning: DeckTuning) => void;
  onReplay: () => void;
}

export default function DeckDials({ onChange, onReplay }: Props) {
  const p = useDialKit(
    'Deck',
    {
      large: {
        spread: [D.large.spread, 60, 200, 1],
        fanAngle: [D.large.fanAngle, 0, 16, 0.5],
        arc: [D.large.arc, 0, 30, 0.5],
        rise: [D.large.rise, 0, 120, 1],
        hoverLift: [D.large.hoverLift, 0, 40, 1],
      },
      small: {
        _collapsed: true,
        spread: [D.small.spread, 40, 140, 1],
        fanAngle: [D.small.fanAngle, 0, 16, 0.5],
        arc: [D.small.arc, 0, 30, 0.5],
        rise: [D.small.rise, 0, 80, 1],
        hoverLift: [D.small.hoverLift, 0, 30, 1],
      },
      stagger: [D.stagger, 0, 0.3, 0.005],
      enterSpring: { type: 'spring', stiffness: 350, damping: 28, mass: 1 },
      raiseSpring: { type: 'spring', stiffness: 500, damping: 25, mass: 1 },
      replay: { type: 'action', label: 'Replay entrance' },
    },
    {
      id: 'storywork-deck',
      persist: true,
      onAction: (action: string) => {
        if (action === 'replay') onReplay();
      },
    },
  );

  useEffect(() => {
    onChange({
      large: { ...p.large },
      small: { ...p.small },
      stagger: p.stagger,
      enterSpring: toMotionTransition(p.enterSpring),
      raiseSpring: toMotionTransition(p.raiseSpring),
    });
  }, [p, onChange]);

  return <DialRoot position="bottom-right" defaultOpen={false} />;
}
