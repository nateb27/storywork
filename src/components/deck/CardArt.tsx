import type { CardPattern } from '@/data/collections';

/**
 * Generated artwork for each collection card. Drawn on a 200 × 260
 * grid (the card's aspect ratio) in currentColor so it inherits the
 * card's ink colour. Everything is data-driven: change a constant,
 * the art follows.
 */

const W = 200;
const H = 260;

/* Ruled notebook paper with a margin line */
const RULED = {
  top: 96,        // first rule, below the title
  gap: 12,        // space between rules
  margin: 34,     // x of the vertical margin line
  opacity: 0.32,  // rule strength
};

/* Tally marks: groups of four uprights crossed by a fifth stroke */
const TALLY = {
  markHeight: 64, // length of each upright
  markGap: 11,    // space between uprights
  groupGap: 26,   // space between groups of five
  stroke: 3.2,    // line weight
  baseY: 214,     // bottom of the marks
  tilt: 3,        // px each upright leans, for a hand-drawn feel
};

/* Book spines on a shelf */
const SPINES = {
  baseY: 226,     // shelf line
  startX: 22,
  books: [
    { w: 16, h: 96 },
    { w: 22, h: 118 },
    { w: 12, h: 84 },
    { w: 20, h: 108, lean: -10 },
    { w: 26, h: 126 },
    { w: 14, h: 92 },
    { w: 18, h: 112 },
    { w: 24, h: 100 },
  ],
};

function Ruled() {
  const rules: number[] = [];
  for (let y = RULED.top; y < H - 8; y += RULED.gap) rules.push(y);
  return (
    <g stroke="currentColor" strokeWidth={1} opacity={RULED.opacity}>
      {rules.map((y) => (
        <line key={y} x1={0} y1={y} x2={W} y2={y} />
      ))}
      <line x1={RULED.margin} y1={RULED.top - 18} x2={RULED.margin} y2={H} strokeWidth={1.5} />
    </g>
  );
}

function TallyGroup({ x, count }: { x: number; count: 1 | 2 | 3 | 4 | 5 }) {
  const uprights = Math.min(count, 4);
  const top = TALLY.baseY - TALLY.markHeight;
  const width = (uprights - 1) * TALLY.markGap;
  return (
    <g>
      {Array.from({ length: uprights }, (_, i) => {
        const mx = x + i * TALLY.markGap;
        return <line key={i} x1={mx + TALLY.tilt} y1={top} x2={mx} y2={TALLY.baseY} />;
      })}
      {count === 5 && (
        <line x1={x - 8} y1={TALLY.baseY - 12} x2={x + width + 8} y2={top + 14} />
      )}
    </g>
  );
}

function Tally({ groups }: { groups: number }) {
  const groupWidth = 3 * TALLY.markGap;
  const total = groups * groupWidth + (groups - 1) * TALLY.groupGap;
  const startX = (W - total) / 2;
  return (
    <g stroke="currentColor" strokeWidth={TALLY.stroke} strokeLinecap="round" opacity={0.9}>
      {Array.from({ length: groups }, (_, g) => (
        <TallyGroup key={g} x={startX + g * (groupWidth + TALLY.groupGap)} count={5} />
      ))}
    </g>
  );
}

function DotGrid() {
  const dots: Array<[number, number]> = [];
  for (let y = 100; y < H; y += 14) for (let x = 14; x < W; x += 14) dots.push([x, y]);
  return (
    <g fill="currentColor" opacity={0.22}>
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} />
      ))}
    </g>
  );
}

function Spines() {
  let x = SPINES.startX;
  return (
    <g>
      <line
        x1={10}
        y1={SPINES.baseY}
        x2={W - 10}
        y2={SPINES.baseY}
        stroke="currentColor"
        strokeWidth={2}
        opacity={0.7}
      />
      {SPINES.books.map((b, i) => {
        const bx = x;
        x += b.w + 3;
        const transform = b.lean
          ? `rotate(${b.lean} ${bx + b.w} ${SPINES.baseY})`
          : undefined;
        return (
          <g key={i} transform={transform}>
            <rect
              x={bx}
              y={SPINES.baseY - b.h}
              width={b.w}
              height={b.h}
              rx={1.5}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              opacity={0.75}
            />
            <line
              x1={bx + 3}
              y1={SPINES.baseY - b.h + 12}
              x2={bx + b.w - 3}
              y2={SPINES.baseY - b.h + 12}
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.5}
            />
          </g>
        );
      })}
    </g>
  );
}

export function CardArt({ pattern }: { pattern: CardPattern }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      {pattern === 'ruled' && <Ruled />}
      {pattern === 'tally-ten' && <Tally groups={2} />}
      {pattern === 'tally-five' && (
        <>
          <DotGrid />
          <Tally groups={1} />
        </>
      )}
      {pattern === 'spines' && <Spines />}
    </svg>
  );
}
