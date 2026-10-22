import { useEffect, useRef } from "react";

interface Props {
  // Base dot opacity, and how far it pulses above/below that
  dotOpacity: number;
  dotPulse: number;
  // Opacity of the lines joining nearby dots
  lineOpacity: number;
  // Use a purple tint in light mode instead of always drawing white
  followTheme?: boolean;
  style?: React.CSSProperties;
}

const DOT_COUNT = 60;
const LINK_DISTANCE = 120;

export default function ParticleCanvas({ dotOpacity, dotPulse, lineOpacity, followTheme = false, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const dots = Array.from({ length: DOT_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.003 + 0.001,
    }));

    let raf: number;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 1;
      const isLight = followTheme && document.documentElement.classList.contains("light-mode");
      const rgb = isLight ? "100,90,160" : "255,255,255";

      for (const d of dots) {
        d.x += Math.cos(d.a + t * d.speed) * 0.18;
        d.y += Math.sin(d.a + t * d.speed) * 0.18;
        if (d.x < 0) d.x = w;
        if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h;
        if (d.y > h) d.y = 0;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${dotOpacity + Math.sin(t * d.speed * 3 + d.a) * dotPulse})`;
        ctx.fill();
      }

      // Faint lines between close dots
      for (let i = 0; i < dots.length; i++) {
        const di = dots[i]!;
        for (let j = i + 1; j < dots.length; j++) {
          const dj = dots[j]!;
          const dist = Math.hypot(di.x - dj.x, di.y - dj.y);
          if (dist < LINK_DISTANCE) {
            ctx.beginPath();
            ctx.moveTo(di.x, di.y);
            ctx.lineTo(dj.x, dj.y);
            ctx.strokeStyle = `rgba(${rgb},${lineOpacity * (1 - dist / LINK_DISTANCE)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [dotOpacity, dotPulse, lineOpacity, followTheme]);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", ...style }} />;
}
