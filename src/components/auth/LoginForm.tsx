/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — signing in
 *
 * Steps, not a timeline: each change of step plays its own beat.
 *
 *  email → code    email card fades out; code card rises 8px into place
 *                  and the first box takes focus
 *  wrong code      boxes shake side to side (360ms), clear, refocus
 *  right code      boxes darken to ink; "Signing you in" replaces the hint
 *  resend          countdown from 60s, then the link becomes active
 * ───────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, MotionConfig, useAnimationControls } from 'motion/react';

/* Step cards crossfading */
const STEP = {
  offsetY: 8,  // px the incoming card rises from
  enter: { type: 'spring' as const, stiffness: 350, damping: 28 },
  exit: { duration: 0.12 },
};

/* Wrong-code shake */
const SHAKE = {
  x: [0, -8, 8, -5, 5, -2, 0],  // px keyframes
  duration: 0.36,               // seconds
};

const RESEND_SECONDS = 60;

interface Props {
  next: string;
  codeLength: number;
  joinHref: string;
  supportEmail: string;
  signedOut?: boolean;
}

type Step = 'email' | 'code' | 'success';

export default function LoginForm({ next, codeLength, joinHref, supportEmail, signedOut }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(() => Array(codeLength).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const shake = useAnimationControls();
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailInput.current?.focus();
  }, []);

  /* Resend countdown */
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; devCode?: string };
      if (!data.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return false;
      }
      setDevCode(data.devCode ?? null);
      setDigits(Array(codeLength).fill(''));
      setResendIn(RESEND_SECONDS);
      setStep('code');
      return true;
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [email, codeLength]);

  const onEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) void sendCode();
  };

  /* Focus the first box when the code step appears */
  useEffect(() => {
    if (step === 'code') setTimeout(() => boxes.current[0]?.focus(), 60);
  }, [step]);

  const verify = useCallback(
    async (code: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, code, next }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string; redirect?: string };
        if (data.ok && data.redirect) {
          setStep('success');
          window.location.assign(data.redirect);
          return;
        }
        setError(data.error ?? 'That code is wrong or has expired.');
        await shake.start({ x: SHAKE.x, transition: { duration: SHAKE.duration } });
        setDigits(Array(codeLength).fill(''));
        boxes.current[0]?.focus();
      } catch {
        setError('Couldn’t reach the server. Check your connection and try again.');
      } finally {
        setBusy(false);
      }
    },
    [email, next, codeLength, shake],
  );

  /* Write digits starting at a box; submit when full */
  const fill = (start: number, input: string) => {
    const chars = input.replace(/\D/g, '').split('');
    if (!chars.length) return;
    const nextDigits = [...digits];
    let i = start;
    for (const c of chars) {
      if (i >= codeLength) break;
      nextDigits[i++] = c;
    }
    setDigits(nextDigits);
    setError(null);
    if (nextDigits.every(Boolean)) {
      boxes.current[codeLength - 1]?.blur();
      void verify(nextDigits.join(''));
    } else {
      boxes.current[Math.min(i, codeLength - 1)]?.focus();
    }
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const nextDigits = [...digits];
      if (nextDigits[i]) {
        nextDigits[i] = '';
      } else if (i > 0) {
        nextDigits[i - 1] = '';
        boxes.current[i - 1]?.focus();
      }
      setDigits(nextDigits);
    } else if (e.key === 'ArrowLeft' && i > 0) {
      boxes.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < codeLength - 1) {
      boxes.current[i + 1]?.focus();
    }
  };

  const onPaste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fill(i, e.clipboardData.getData('text'));
  };

  const half = Math.ceil(codeLength / 2);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'email' ? (
          <motion.form
            key="email"
            className="login-card"
            onSubmit={onEmailSubmit}
            initial={{ opacity: 0, y: STEP.offsetY }}
            animate={{ opacity: 1, y: 0, transition: STEP.enter }}
            exit={{ opacity: 0, transition: STEP.exit }}
            noValidate
          >
            {signedOut && <p className="login-note">You’re signed out.</p>}
            <label className="login-label" htmlFor="login-email">
              Email address
            </label>
            <input
              ref={emailInput}
              id="login-email"
              className="login-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? 'login-error' : undefined}
            />
            {error && (
              <p id="login-error" className="login-error" role="alert">
                {error}
              </p>
            )}
            <button className="button login-submit" type="submit" disabled={busy || !email}>
              {busy ? 'Sending a code…' : 'Continue'}
            </button>
            <p className="login-hint">We’ll email you a {codeLength}-digit code. No password.</p>
          </motion.form>
        ) : (
          <motion.div
            key="code"
            className="login-card login-card--code"
            initial={{ opacity: 0, y: STEP.offsetY }}
            animate={{ opacity: 1, y: 0, transition: STEP.enter }}
            exit={{ opacity: 0, transition: STEP.exit }}
          >
            <h2 className="login-code-title">Check your email</h2>
            <p className="login-code-copy">
              We sent a {codeLength}-digit code to <strong>{email}</strong>. It may take a minute,
              and sometimes lands in spam.
            </p>
            {devCode && (
              <p className="login-dev">
                Development backend: your code is <code>{devCode}</code>
              </p>
            )}
            <motion.div
              className={`otp${step === 'success' ? ' otp--success' : ''}`}
              animate={shake}
              role="group"
              aria-label={`${codeLength}-digit code`}
            >
              {digits.map((d, i) => (
                <span key={i} className="otp__slot">
                  {i === half && codeLength > 5 && <span className="otp__dash" aria-hidden="true">–</span>}
                  <input
                    ref={(el) => {
                      boxes.current[i] = el;
                    }}
                    className="otp__box"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={i === 0 ? codeLength : 1}
                    value={d}
                    disabled={busy || step === 'success'}
                    aria-label={`Digit ${i + 1}`}
                    onChange={(e) => fill(i, e.target.value)}
                    onKeyDown={onKeyDown(i)}
                    onPaste={onPaste(i)}
                    onFocus={(e) => e.target.select()}
                  />
                </span>
              ))}
            </motion.div>
            <p className={`login-code-status${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>
              {step === 'success' ? 'Signing you in…' : (error ?? (busy ? 'Checking…' : '\u00a0'))}
            </p>
            <div className="login-code-actions">
              {resendIn > 0 ? (
                <span className="login-muted">Resend code in {resendIn}s</span>
              ) : (
                <button type="button" className="login-link" onClick={() => void sendCode()} disabled={busy}>
                  Resend code
                </button>
              )}
              <button
                type="button"
                className="login-link"
                onClick={() => {
                  setStep('email');
                  setError(null);
                  setDevCode(null);
                }}
              >
                Use a different email
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="login-foot">
        <p>
          Not a member yet? <a href={joinHref}>Join the challenge</a>
        </p>
        <p className="login-muted">
          Trouble signing in? <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
        </p>
      </div>
    </MotionConfig>
  );
}
