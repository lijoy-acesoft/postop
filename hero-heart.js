/**
 * Interactive Three.js particle heart for the hero section.
 * Adapted from test.html — scoped to #hero-heart-canvas container.
 */
(function initHeroHeart() {
    const container = document.getElementById('hero-heart-canvas');
    const heroSection = document.getElementById('hero');
    if (!container || !heroSection || typeof THREE === 'undefined') return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 27;

    const HEART_SCALE = 1.05;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const particleCount = reducedMotion ? 10000 : 26000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const t = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());

        const x = 16 * Math.pow(Math.sin(t), 3) * r * HEART_SCALE;
        const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * r * HEART_SCALE;
        const z = (Math.random() - 0.5) * 4 * (1 - r) * HEART_SCALE;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        basePositions[i * 3] = x;
        basePositions[i * 3 + 1] = y;
        basePositions[i * 3 + 2] = z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xff3838,
        size: 0.1,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    const mousePoint = new THREE.Vector3();
    const smoothMouse = new THREE.Vector3();

    let hasInteracted = false;
    let holeMultiplier = 1.0;
    const holeRadius = 6.0 * HEART_SCALE;

    const SPRING = 0.032;
    const MOUSE_LERP = 0.09;
    const SCATTER_STRENGTH = 0.38;
    const HOLE_DECAY = 0.022;

    function updateMouseFromEvent(clientX, clientY) {
        const rect = container.getBoundingClientRect();

        hasInteracted = true;

        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        raycaster.ray.intersectPlane(planeZ, mousePoint);
    }

    heroSection.addEventListener('mousemove', (event) => {
        updateMouseFromEvent(event.clientX, event.clientY);
    });

    heroSection.addEventListener(
        'touchmove',
        (event) => {
            if (!event.touches.length) return;
            updateMouseFromEvent(event.touches[0].clientX, event.touches[0].clientY);
        },
        { passive: true }
    );

    function resize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    }

    resize();
    window.addEventListener('resize', resize);

    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(resize);
        ro.observe(container);
    }

    function animate() {
        requestAnimationFrame(animate);

        if (!reducedMotion && hasInteracted && holeMultiplier > 0) {
            holeMultiplier += (0 - holeMultiplier) * HOLE_DECAY;
        }

        if (hasInteracted) {
            smoothMouse.lerp(mousePoint, MOUSE_LERP);
        }

        const posAttribute = geometry.attributes.position;

        for (let i = 0; i < particleCount; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            let px = posAttribute.array[ix];
            let py = posAttribute.array[iy];
            let pz = posAttribute.array[iz];

            const bx = basePositions[ix];
            const by = basePositions[iy];
            const bz = basePositions[iz];

            let targetX = bx;
            let targetY = by;
            let targetZ = bz;

            if (!reducedMotion && holeMultiplier > 0.001) {
                const distFromCenter = Math.sqrt(bx * bx + by * by);
                if (distFromCenter < holeRadius && distFromCenter > 0.1) {
                    const pushForce = (holeRadius - distFromCenter) / distFromCenter;
                    targetX += bx * pushForce * holeMultiplier;
                    targetY += by * pushForce * holeMultiplier;
                }
            }

            if (!reducedMotion) {
                const dx = smoothMouse.x - px;
                const dy = smoothMouse.y - py;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const interactionRadius = 7.5 * HEART_SCALE;

                if (hasInteracted && distance < interactionRadius && distance > 0.001) {
                    const t = 1 - distance / interactionRadius;
                    const force = t * t;
                    px -= (dx / distance) * force * SCATTER_STRENGTH;
                    py -= (dy / distance) * force * SCATTER_STRENGTH;
                    pz += (Math.random() - 0.5) * force * 1.2;
                }
            }

            px += (targetX - px) * SPRING;
            py += (targetY - py) * SPRING;
            pz += (targetZ - pz) * SPRING;

            posAttribute.array[ix] = px;
            posAttribute.array[iy] = py;
            posAttribute.array[iz] = pz;
        }

        posAttribute.needsUpdate = true;
        renderer.render(scene, camera);
    }

    animate();
})();
