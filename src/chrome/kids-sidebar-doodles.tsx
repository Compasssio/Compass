type Doodle = {
  src: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  w: number;
  rot: number;
  op: number;
};

const SB_DOODLES: Doodle[] = [
  { src: "stardots", top: 1.5, right: 4, w: 34, rot: 0, op: 0.95 },
  { src: "lilwhitestar", top: 16, right: 15, w: 22, rot: 0, op: 0.8 },
  { src: "lilorangestar2", top: 30, right: 5, w: 26, rot: -8, op: 0.9 },
  { src: "bubbles", top: 45, right: 8, w: 34, rot: 0, op: 0.85 },
  { src: "lilpurplestar", top: 58, right: 16, w: 22, rot: 0, op: 0.8 },
  { src: "lilwhitestar2", top: 71, right: 7, w: 20, rot: 0, op: 0.75 },
  { src: "lilorangestar2", bottom: 13, right: 20, w: 28, rot: 12, op: 0.9 },
  { src: "lilwhitestar", bottom: 5, right: 9, w: 22, rot: 0, op: 0.75 },
];

export function KidsSidebarDoodles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {SB_DOODLES.map((d, i) => (
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
            transform: `rotate(${d.rot}deg)`,
            opacity: d.op,
          }}
          className="absolute"
        />
      ))}
    </div>
  );
}
