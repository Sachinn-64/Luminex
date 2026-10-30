import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** 3D lemniscate (infinity loop) path, slightly twisted in Z so it reads as a solid object. */
class InfinityCurve extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const a = 1.15;
    const th = t * Math.PI * 2;
    const s = Math.sin(th);
    const c = Math.cos(th);
    const d = 1 + s * s;
    return target.set((a * c) / d, (a * s * c) / d, 0.22 * Math.sin(2 * th));
  }
}

function Loop({ hovered, open }: { hovered: boolean; open: boolean }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const geometry = useMemo(() => new THREE.TubeGeometry(new InfinityCurve(), 220, 0.19, 24, true), []);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    // keep the loop mostly face-on so it always reads as an infinity sign:
    // gentle 3D wobble + slow in-plane spin (faster on hover)
    const spin = hovered ? 1.4 : 0.35;
    g.rotation.z += dt * spin;
    g.rotation.y = Math.sin(t * 0.8) * 0.7;
    g.rotation.x = Math.sin(t * 0.6 + 1) * 0.4;
    const target = open ? 0.82 : hovered ? 1.12 : 1;
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, target, 0.12));
    if (mat.current) {
      mat.current.emissiveIntensity = THREE.MathUtils.lerp(mat.current.emissiveIntensity, hovered ? 0.9 : 0.45, 0.1);
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          ref={mat}
          color="#3D7BFF"
          emissive="#00D6FF"
          emissiveIntensity={0.45}
          metalness={0.55}
          roughness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.15}
        />
      </mesh>
    </group>
  );
}

/**
 * The floating 3D launcher for the assistant. Pure visual; the parent owns state.
 */
export default function ChatOrb({
  open,
  onClick,
  label = 'Open Luminex assistant',
}: {
  open: boolean;
  onClick: () => void;
  label?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group fixed bottom-6 right-6 z-[10002] size-[88px] cursor-pointer select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* glow halo */}
      <span
        aria-hidden
        className="absolute inset-2 rounded-full opacity-70 blur-xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(closest-side, rgba(0,120,255,0.75), rgba(0,214,255,0.25) 60%, transparent)' }}
      />
      {/* ring */}
      <span aria-hidden className="absolute inset-3 rounded-full border border-white/15 bg-[#050816]/70 backdrop-blur-md" />
      <span aria-hidden className="absolute inset-3 animate-ping rounded-full border border-brand-cyan/40 [animation-duration:2.4s]" />

      <Canvas
        className="relative"
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 3.6], fov: 38 }}
        style={{ width: '100%', height: '100%', pointerEvents: 'none', background: 'transparent' }}
      >
        <ambientLight intensity={0.35} />
        <pointLight position={[2.5, 2.5, 3]} intensity={18} color="#8fb3ff" />
        <pointLight position={[-2.5, -1.5, 2]} intensity={12} color="#00D6FF" />
        <directionalLight position={[0, 3, 1]} intensity={1.2} color="#ffffff" />
        <Loop hovered={hovered} open={open} />
      </Canvas>

      {/* tiny label on hover */}
      <span className="pointer-events-none absolute -top-9 right-1/2 translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-[#050816]/90 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100">
        {open ? 'Close' : 'Ask Luminex'}
      </span>
    </button>
  );
}
