type Doodle = {
  src: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  w: number;
  rot: number;
  op: number;
  flip?: boolean;
};

const DOODLES: Doodle[] = [
  { src: "lilbluewhale", top: 49, right: 1, w: 66, rot: 6, op: 0.9, flip: true },
  { src: "lilwhale1", bottom: 2, left: 8, w: 62, rot: 4, op: 0.9 },
  { src: "liloctored", top: 29, left: 1, w: 60, rot: -8, op: 0.9 },
  { src: "lilpurpocto", top: 75, right: 0.8, w: 58, rot: 8, op: 0.9 },
  { src: "lilwhitestar", top: 33, right: 2, w: 28, rot: 0, op: 0.8 },
  { src: "lilpurplestar", top: 45, left: 2.5, w: 24, rot: 0, op: 0.8 },
  { src: "lilorangestar2", top: 64, right: 3.5, w: 24, rot: 0, op: 0.8 },
  { src: "lilwhitestar2", top: 79, left: 3.5, w: 22, rot: 0, op: 0.78 },
  { src: "lilwhitestar", top: 95, right: 4, w: 26, rot: 0, op: 0.8 },
  { src: "lilwhitestar2", top: 30, left: 48, w: 20, rot: 0, op: 0.72 },
  { src: "lilorangestar2", top: 39, left: 61, w: 22, rot: 0, op: 0.72 },
  { src: "lilpurplestar", top: 47, left: 36, w: 22, rot: 0, op: 0.7 },
  { src: "lilwhitestar", top: 56, left: 53, w: 22, rot: 0, op: 0.72 },
  { src: "lilwhitestar2", top: 63, left: 31, w: 20, rot: 0, op: 0.68 },
  { src: "lilorangestar2", top: 71, left: 58, w: 22, rot: 0, op: 0.72 },
  { src: "lilpurplestar", top: 80, left: 44, w: 22, rot: 0, op: 0.7 },
  { src: "lilwhitestar", top: 87, left: 35, w: 22, rot: 0, op: 0.7 },
  { src: "bubbles", top: 16, left: 3, w: 50, rot: -4, op: 0.9 },
  { src: "stardots", top: 58, left: 3, w: 40, rot: -6, op: 0.88 },
];

export function KidsDoodles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {DOODLES.map((d, i) => (
        <img
          key={i}
          src={`/kids/doodles/${d.src}.png`}
          alt=""
          draggable={false}
          loading="lazy"
          style={{
            top: d.top != null ? `${d.top}%` : undefined,
            bottom: d.bottom != null ? `${d.bottom}%` : undefined,
            left: d.left != null ? `${d.left}%` : undefined,
            right: d.right != null ? `${d.right}%` : undefined,
            width: `${d.w}px`,
            transform: `${d.flip ? "scaleX(-1) " : ""}rotate(${d.rot}deg)`,
            opacity: d.op,
          }}
          className="absolute"
        />
      ))}
    </div>
  );
}
