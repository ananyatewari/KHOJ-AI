import { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

export default function BackgroundCanvas() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -1000, y: -1000 });
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);

    /* ================= CONFIG ================= */

    const PARTICLE_COUNT = 220; // ⬆️ more particles
    const BASE_SPEED = 0.45; // ⬆️ faster motion
    const FLOAT_AMPLITUDE = 0.12; // ⬆️ livelier float

    const REPULSION_RADIUS = 140;
    const REPULSION_FORCE = 0.9;

    const DARK_COLORS = [
      "rgba(255,255,255,0.65)", // white
      "rgba(190,220,255,0.6)", // ice blue
      "rgba(59,130,246,10)", // blue-500
      "rgba(16,185,129,10)", // emerald-500
      "rgba(236,72,153,10)", // pink-500
      "rgba(168,85,247,10)", // purple-500   // mint
    ];

    const LIGHT_COLORS = [
      "rgba(59,130,246,10)", // blue-500
      "rgba(16,185,129,10)", // emerald-500
      "rgba(236,72,153,10)", // pink-500
      "rgba(168,85,247,10)", // purple-500
    ];

    /* ========================================== */

    const particles = Array.from({ length: PARTICLE_COUNT }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1.2 + Math.random() * 2.2,
      baseR: 1.2 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * BASE_SPEED,
      vy: (Math.random() - 0.5) * BASE_SPEED,
      baseOpacity: 0.15 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      colorIndex: Math.floor(Math.random() * 3),
    }));

    let lastTime = performance.now();

    function animate(time) {
      const dt = (time - lastTime) * 0.001;
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const palette = theme === "dark" ? DARK_COLORS : LIGHT_COLORS;

      for (const p of particles) {
        /* Floating motion */
        p.phase += dt * 1.4;
        p.x += p.vx + Math.sin(p.phase) * FLOAT_AMPLITUDE;
        p.y += p.vy + Math.cos(p.phase) * FLOAT_AMPLITUDE;

        /* Mouse repulsion */
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPULSION_RADIUS) {
          const force = (1 - dist / REPULSION_RADIUS) * REPULSION_FORCE;
          const angle = Math.atan2(dy, dx);

          p.x += Math.cos(angle) * force * 8;
          p.y += Math.sin(angle) * force * 8;

          p.r += (p.baseR * 2.4 - p.r) * 0.18;
        } else {
          p.r += (p.baseR - p.r) * 0.08;
        }

        /* Wrap edges */
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        /* Twinkle */
        ctx.globalAlpha = p.baseOpacity + Math.sin(p.phase * 2) * 0.08;

        ctx.fillStyle = palette[p.colorIndex];

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[1] pointer-events-none"
    />
  );
}
