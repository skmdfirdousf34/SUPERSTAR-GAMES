/**
 * High-Performance Hardware-Accelerated Aviator Visuals:
 * - ParticlePool: Zero-GC 200-particle trail and crash burst system
 * - ScreenShake: Smooth decayed camera shake on impact
 * - drawSpribePlane: Vector Spribe airplane with spinning propeller & cockpit glow
 */

const MAX_PARTICLES = 200;

class Particle {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  life: number = 0;
  maxLife: number = 0;
  size: number = 0;
  color: string = "#ff4400";
  alpha: number = 1;
  active: boolean = false;
}

export class ParticlePool {
  private particles: Particle[];
  private nextIndex: number = 0;

  constructor() {
    this.particles = new Array(MAX_PARTICLES);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i] = new Particle();
    }
  }

  spawn(
    x: number,
    y: number,
    config: {
      spreadX?: number;
      spreadY?: number;
      vx?: number;
      vy?: number;
      randomVx?: number;
      randomVy?: number;
      maxLife?: number;
      size?: number;
      color?: string;
      alpha?: number;
    }
  ) {
    const p = this.particles[this.nextIndex];
    this.nextIndex = (this.nextIndex + 1) % MAX_PARTICLES;

    p.x = x + (config.spreadX || 0) * (Math.random() * 2 - 1);
    p.y = y + (config.spreadY || 0) * (Math.random() * 2 - 1);
    p.vx = (config.vx || 0) + (config.randomVx || 0) * (Math.random() * 2 - 1);
    p.vy = (config.vy || 0) + (config.randomVy || 0) * (Math.random() * 2 - 1);
    p.maxLife = config.maxLife || 600;
    p.life = p.maxLife;
    p.size = config.size || 2.5;
    p.color = config.color || "#ff8800";
    p.alpha = config.alpha || 0.8;
    p.active = true;
  }

  spawnTrail(x: number, y: number) {
    this.spawn(x, y, {
      spreadX: 3,
      spreadY: 3,
      vx: -40,
      vy: 10,
      randomVx: 15,
      randomVy: 15,
      maxLife: 500,
      size: 2.8,
      color: "#ff5500",
      alpha: 0.75,
    });
  }

  spawnCrashBurst(x: number, y: number) {
    for (let i = 0; i < 35; i++) {
      const angle = (i / 35) * Math.PI * 2;
      const speed = 80 + Math.random() * 180;
      this.spawn(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        maxLife: 700 + Math.random() * 400,
        size: 3.5,
        color: i % 2 === 0 ? "#ef4444" : "#f59e0b",
        alpha: 1,
      });
    }
  }

  update(dtMs: number) {
    const dtSec = dtMs / 1000;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= dtMs;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.size = Math.max(0.5, p.size * 0.995);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  reset() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i].active = false;
    }
  }
}

export class ScreenShake {
  public offsetX: number = 0;
  public offsetY: number = 0;
  private intensity: number = 0;
  private durationMs: number = 0;
  private elapsedMs: number = 0;
  private active: boolean = false;

  trigger(intensity: number = 8, durationMs: number = 350) {
    this.intensity = intensity;
    this.durationMs = durationMs;
    this.elapsedMs = 0;
    this.active = true;
  }

  update(dtMs: number) {
    if (!this.active) return;

    this.elapsedMs += dtMs;
    const progress = this.elapsedMs / this.durationMs;

    if (progress >= 1) {
      this.active = false;
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    const decay = 1 - progress;
    const currentIntensity = this.intensity * decay;
    this.offsetX = (Math.random() * 2 - 1) * currentIntensity;
    this.offsetY = (Math.random() * 2 - 1) * currentIntensity;
  }

  isActive() {
    return this.active;
  }
}

/**
 * Draws the Spribe Aviator red airplane with spinning propeller and cockpit glow.
 */
export function drawSpribePlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  tSec: number,
  scale: number = 0.85
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Gentle aerodynamic bobbing
  const bobOffset = Math.sin(tSec * 4) * 1.2;
  ctx.translate(0, bobOffset);
  ctx.scale(scale, scale);

  // Ambient Engine Glow Halo
  ctx.save();
  ctx.shadowColor = "rgba(239, 68, 68, 0.4)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(239, 68, 68, 0.08)";
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Fuselage (Body)
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.quadraticCurveTo(20, -6, 8, -5);
  ctx.lineTo(-4, -4);
  ctx.quadraticCurveTo(-12, -3, -16, -1);
  ctx.lineTo(-20, 0);
  ctx.lineTo(-16, 1);
  ctx.quadraticCurveTo(-12, 3, -4, 4);
  ctx.lineTo(8, 5);
  ctx.quadraticCurveTo(20, 6, 24, 0);
  ctx.closePath();
  ctx.fill();

  // Cross structural stripes
  ctx.strokeStyle = "#b91c1c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(6, -2.5);
  ctx.lineTo(10, 2.5);
  ctx.moveTo(10, -2.5);
  ctx.lineTo(6, 2.5);
  ctx.stroke();

  // Cockpit glass canopy with light pink/white reflection
  ctx.fillStyle = "rgba(255, 180, 200, 0.55)";
  ctx.beginPath();
  ctx.ellipse(12, -1.5, 5, 2.5, 0, Math.PI, 0);
  ctx.fill();

  // Top Swept Wing
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.moveTo(8, -5);
  ctx.lineTo(6, -16);
  ctx.lineTo(-2, -16);
  ctx.lineTo(-4, -5);
  ctx.closePath();
  ctx.fill();

  // Bottom Swept Wing
  ctx.beginPath();
  ctx.moveTo(8, 5);
  ctx.lineTo(6, 16);
  ctx.lineTo(-2, 16);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();

  // Tail Vertical Stabilizer
  ctx.fillStyle = "#b91c1c";
  ctx.beginPath();
  ctx.moveTo(-14, -1);
  ctx.lineTo(-18, -10);
  ctx.lineTo(-20, -1);
  ctx.closePath();
  ctx.fill();

  // Tail Horizontal Fin
  ctx.beginPath();
  ctx.moveTo(-14, -0.5);
  ctx.lineTo(-20, -4);
  ctx.lineTo(-22, -0.5);
  ctx.lineTo(-20, 3);
  ctx.closePath();
  ctx.fill();

  // Spinning Propeller at Nose
  const propAngle = tSec * 28;
  ctx.save();
  ctx.translate(24, 0);
  ctx.rotate(propAngle);

  // Propeller Blades
  ctx.fillStyle = "#b91c1c";
  ctx.beginPath();
  ctx.ellipse(0, -9, 1.5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 9, 1.5, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Propeller Center Chrome Nosecone
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
