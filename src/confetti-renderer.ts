type Color = readonly [number, number, number];
type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  rx: number;
  ry: number;
  rz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  phase: number;
  flutter: number;
  delay: number;
  color: Color;
};

const COLORS: readonly Color[] = [
  [34, 151, 98],
  [35, 137, 224],
  [246, 191, 54],
  [158, 201, 65],
  [238, 117, 73],
  [95, 194, 224],
  [222, 91, 143],
  [190, 146, 221],
];
const DURATION = 20;
const FOCAL_LENGTH = 1000;
const random = (min: number, max: number) => min + Math.random() * (max - min);

/** A lightweight 3D paper simulation projected onto a transparent 2D canvas. */
export function startConfetti(
  canvas: HTMLCanvasElement,
  onComplete: () => void,
): () => void {
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  let width = window.innerWidth;
  let height = window.innerHeight;
  let frame = 0;
  let stopped = false;
  let elapsed = 0;
  let previousTime = 0;

  const resize = () => {
    const previousWidth = width;
    const previousHeight = height;
    width = window.innerWidth;
    height = window.innerHeight;
    for (const particle of particles) {
      particle.x *= width / previousWidth;
      particle.y *= height / previousHeight;
    }
    // Bound the backing buffer on phones with high pixel density.
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const count = width < 700 ? 260 : 400;
  const particles: Particle[] = Array.from({ length: count }, (_, index) => {
    const ribbon = index % 5 === 0;
    return {
      x: random(-30, width + 30),
      y: random(-height * 0.55, -25),
      z: random(-130, 480),
      vx: random(-90, 90),
      vy: random(65, 180),
      width: ribbon ? random(4, 7) : random(8, 15),
      height: ribbon ? random(21, 34) : random(10, 19),
      rx: random(0, Math.PI * 2),
      ry: random(0, Math.PI * 2),
      rz: random(0, Math.PI * 2),
      spinX: random(-5, 5),
      spinY: random(-4, 4),
      spinZ: random(-2, 2),
      phase: random(0, Math.PI * 2),
      flutter: random(2, 5),
      delay: Math.floor(index / (count / 3)) * 0.85 + random(0, 0.6),
      color: COLORS[index % COLORS.length],
    };
  }).sort((a, b) => b.z - a.z); // Paint distant pieces first.

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    context.clearRect(0, 0, width, height);
  };

  const drawPiece = (particle: Particle, age: number) => {
    const cx = Math.cos(particle.rx),
      sx = Math.sin(particle.rx);
    const cy = Math.cos(particle.ry),
      sy = Math.sin(particle.ry);
    const cz = Math.cos(particle.rz),
      sz = Math.sin(particle.rz);
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    context.beginPath();
    for (let index = 0; index < corners.length; index++) {
      const x = (corners[index][0] * particle.width) / 2;
      const y = (corners[index][1] * particle.height) / 2;
      const rotatedX = x * cy + y * sx * sy;
      const rotatedY = y * cx;
      const depth = -x * sy + y * sx * cy;
      const scale = FOCAL_LENGTH / (FOCAL_LENGTH + particle.z + depth);
      const px = particle.x + (rotatedX * cz - rotatedY * sz) * scale;
      const py = particle.y + (rotatedX * sz + rotatedY * cz) * scale;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();

    // Rotate the paper's normal with its corners so lighting follows each flip.
    const normalX = cx * sy * cz + sx * sz;
    const normalY = cx * sy * sz - sx * cz;
    const normalZ = cx * cy;
    const light = Math.abs(-0.35 * normalX - 0.45 * normalY + 0.82 * normalZ);
    const brightness = 0.62 + 0.42 * light;
    const back = normalZ < 0 ? 24 : 0;
    const [r, g, b] = particle.color.map((channel) =>
      Math.min(255, Math.round(channel * brightness + back)),
    );
    context.globalAlpha =
      Math.min(1, age * 4) * Math.min(1, (DURATION - elapsed) / 1.2);
    const sheen = context.createLinearGradient(
      particle.x - 8,
      particle.y - 10,
      particle.x + 8,
      particle.y + 10,
    );
    sheen.addColorStop(
      0,
      `rgb(${Math.min(255, r + 32)}, ${Math.min(255, g + 32)}, ${Math.min(255, b + 32)})`,
    );
    sheen.addColorStop(0.48, `rgb(${r}, ${g}, ${b})`);
    sheen.addColorStop(
      1,
      `rgb(${Math.round(r * 0.82)}, ${Math.round(g * 0.82)}, ${Math.round(b * 0.82)})`,
    );
    context.fillStyle = sheen;
    context.fill();
    context.strokeStyle = `rgba(255, 255, 255, ${0.12 + light * 0.2})`;
    context.lineWidth = 0.45;
    context.stroke();
  };

  const tick = (time: number) => {
    if (stopped) return;
    const delta = previousTime
      ? Math.min((time - previousTime) / 1000, 0.05)
      : 0;
    previousTime = time;
    elapsed += delta;
    context.clearRect(0, 0, width, height);
    if (elapsed >= DURATION) {
      stop();
      onComplete();
      return;
    }
    for (const particle of particles) {
      const age = elapsed - particle.delay;
      if (age < 0 || particle.y > height + 50) continue;
      const scale = FOCAL_LENGTH / (FOCAL_LENGTH + particle.z);
      const flutter = Math.sin(age * particle.flutter + particle.phase);
      // Gravity, air resistance and flutter give each piece a different trajectory.
      particle.vy += (320 - particle.vy * 1.4) * delta;
      particle.vx *= Math.exp(-0.5 * delta);
      particle.x += (particle.vx + flutter * 38) * delta * scale;
      particle.y += particle.vy * delta * scale;
      particle.rx += (particle.spinX + flutter * 0.8) * delta;
      particle.ry += particle.spinY * delta;
      particle.rz += (particle.spinZ + flutter * 0.4) * delta;
      if (particle.y > -40 && particle.x > -50 && particle.x < width + 50)
        drawPiece(particle, age);
    }
    context.globalAlpha = 1;
    frame = requestAnimationFrame(tick);
  };

  const onVisibilityChange = () => {
    cancelAnimationFrame(frame);
    previousTime = 0;
    if (!document.hidden && !stopped) frame = requestAnimationFrame(tick);
  };

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVisibilityChange);
  frame = requestAnimationFrame(tick);
  return stop;
}
