/**
 * Three.js Interactive 3D Ambient Visuals for HalfPe Settlement Dashboard
 * Aesthetic: Notion-inspired data constellation with delicate blue & stone particle wave
 * Responsive, 60fps, pointer-interactive, battery-friendly
 */

(function () {
  'use strict';

  let scene, camera, renderer, particles, linesGeometry, linesMesh;
  const PARTICLE_COUNT = 120;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = [];
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  let windowHalfX = window.innerWidth / 2;
  let windowHalfY = window.innerHeight / 2;
  let isRunning = true;
  let canvas = null;

  function initThree() {
    canvas = document.getElementById('threeCanvas');
    if (!canvas || typeof THREE === 'undefined') return;

    // 1. Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 500;

    // 2. Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3. Particles
    const geometry = new THREE.BufferGeometry();
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const colorNotionBlue = new THREE.Color(0x0075DE);
    const colorWarmStone = new THREE.Color(0xA39E98);
    const colorMint = new THREE.Color(0x1AAE39);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 600;

      velocities.push({
        x: (Math.random() - 0.5) * 0.4,
        y: (Math.random() - 0.5) * 0.4,
        z: (Math.random() - 0.5) * 0.3
      });

      // Subtle Notion accent colors for particles
      const chosenColor = i % 4 === 0 ? colorMint : (i % 3 === 0 ? colorWarmStone : colorNotionBlue);
      colors[i * 3] = chosenColor.r;
      colors[i * 3 + 1] = chosenColor.g;
      colors[i * 3 + 2] = chosenColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Circle texture for smooth dot rendering
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 32;
    dotCanvas.height = 32;
    const ctx = dotCanvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    const texture = new THREE.CanvasTexture(dotCanvas);

    const material = new THREE.PointsMaterial({
      size: 7,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 4. Subtle Interconnection Lines
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x0075DE,
      transparent: true,
      opacity: 0.09
    });
    linesGeometry = new THREE.BufferGeometry();
    linesMesh = new THREE.LineSegments(linesGeometry, lineMat);
    scene.add(linesMesh);

    // 5. Event Listeners
    window.addEventListener('resize', onWindowResize, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('visibilitychange', () => {
      isRunning = !document.hidden;
      if (isRunning) animate();
    });

    animate();
  }

  function onWindowResize() {
    if (!renderer || !camera) return;
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) * 0.35;
    mouseY = (event.clientY - windowHalfY) * 0.35;
  }

  function onTouchMove(event) {
    if (event.touches.length > 0) {
      mouseX = (event.touches[0].clientX - windowHalfX) * 0.3;
      mouseY = (event.touches[0].clientY - windowHalfY) * 0.3;
    }
  }

  function animate() {
    if (!isRunning) return;
    requestAnimationFrame(animate);

    // Smooth camera damping towards mouse
    targetX += (mouseX - targetX) * 0.03;
    targetY += (mouseY - targetY) * 0.03;
    camera.position.x += (targetX - camera.position.x) * 0.04;
    camera.position.y += (-targetY - camera.position.y) * 0.04;
    camera.lookAt(scene.position);

    // Slowly evolve particle positions
    const pos = particles.geometry.attributes.position.array;
    const linePositions = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] += velocities[i].x;
      pos[i * 3 + 1] += velocities[i].y;
      pos[i * 3 + 2] += velocities[i].z;

      // Bounce boundaries
      if (pos[i * 3] < -600 || pos[i * 3] > 600) velocities[i].x *= -1;
      if (pos[i * 3 + 1] < -400 || pos[i * 3 + 1] > 400) velocities[i].y *= -1;
      if (pos[i * 3 + 2] < -300 || pos[i * 3 + 2] > 300) velocities[i].z *= -1;

      // Connect nearby particles with delicate lines
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < 14400) { // ~120px distance
          linePositions.push(
            pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2],
            pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]
          );
        }
      }
    }

    particles.geometry.attributes.position.needsUpdate = true;
    linesMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

    // Slow ambient rotation
    particles.rotation.y += 0.0006;
    linesMesh.rotation.y += 0.0006;

    renderer.render(scene, camera);
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThree);
  } else {
    initThree();
  }
})();
