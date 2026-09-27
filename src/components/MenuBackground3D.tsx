import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EnvironmentType } from '../types/game';

interface MenuBackground3DProps {
  environment: EnvironmentType;
}

export const MenuBackground3D: React.FC<MenuBackground3DProps> = ({ environment }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const envTheme: Record<EnvironmentType, { sky: number; ground: number; accent: number }> = {
      snow: { sky: 0x0b1524, ground: 0xcbd5e1, accent: 0x38bdf8 },
      base: { sky: 0x090f18, ground: 0x262f28, accent: 0xf59e0b },
      urban: { sky: 0x0d111a, ground: 0x1e242d, accent: 0xf59e0b },
      desert: { sky: 0x1c140d, ground: 0x9c7238, accent: 0xf59e0b },
      industrial: { sky: 0x070a10, ground: 0x181c24, accent: 0x38bdf8 },
    };

    const theme = envTheme[environment];
    scene.background = new THREE.Color(theme.sky);
    scene.fog = new THREE.FogExp2(theme.sky, 0.024);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 160);
    camera.position.set(0, 8, 22);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.1);
    keyLight.position.set(18, 28, 15);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(theme.accent, 2.2, 35);
    rimLight.position.set(-8, 6, -6);
    scene.add(rimLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160, 24, 24),
      new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Tactical outpost diorama structures
    const dioramaGroup = new THREE.Group();
    scene.add(dioramaGroup);

    const structMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

    // Central bunker / command building
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(10, 4.2, 8), structMat);
    bunker.position.set(-4, 2.1, -4);
    dioramaGroup.add(bunker);

    // Watchtower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 8.5, 3.2), darkMat);
    tower.position.set(7, 4.25, -6);
    dioramaGroup.add(tower);

    // Armored vehicle silhouette
    const vehicle = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 6.5), darkMat);
    vehicle.position.set(3, 1.1, 3);
    vehicle.rotation.y = -0.4;
    dioramaGroup.add(vehicle);

    // Sandbag barrier
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(6, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x78716c })
    );
    barrier.position.set(-2, 0.6, 4);
    dioramaGroup.add(barrier);

    // Atmospheric particles
    const pCount = 320;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 60;
      pPos[i * 3 + 1] = Math.random() * 18;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: environment === 'snow' ? 0xffffff : 0xf59e0b,
      size: 0.16,
      transparent: true,
      opacity: 0.55,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    let animId = 0;
    const animate = (t: number) => {
      animId = requestAnimationFrame(animate);
      const sec = t * 0.00025;
      camera.position.x = Math.sin(sec) * 20;
      camera.position.z = Math.cos(sec) * 20;
      camera.position.y = 6.5 + Math.sin(sec * 1.7) * 1.2;
      camera.lookAt(0, 2.2, -2);
      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [environment]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div ref={containerRef} className="w-full h-full" />
      {/* Measured contrast scrim per Frontend Design Constitution */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/65" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/70" />
    </div>
  );
};
