import { useEffect, useRef } from "react";
import * as THREE from "three";

// Helper to construct ribbon geometry
function createRibbonGeometry(leftPoints, rightPoints) {
  const vertices = [];
  const indices = [];
  
  for (let i = 0; i < leftPoints.length; i++) {
    vertices.push(leftPoints[i].x, leftPoints[i].y, leftPoints[i].z);
    vertices.push(rightPoints[i].x, rightPoints[i].y, rightPoints[i].z);
  }
  
  for (let i = 0; i < leftPoints.length - 1; i++) {
    const currL = 2 * i;
    const currR = 2 * i + 1;
    const nextL = 2 * (i + 1);
    const nextR = 2 * (i + 1) + 1;
    
    // Triangle 1: currL, currR, nextL
    indices.push(currL, currR, nextL);
    // Triangle 2: currR, nextR, nextL
    indices.push(currR, nextR, nextL);
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export default function ThreeTrafficBg({ isDark }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      1,
      1000
    );
    camera.position.set(0, 35, 75);
    camera.lookAt(0, -5, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Dynamic Theme Colors
    const roadColor = isDark ? 0x1c1c1e : 0xe4e4e7;
    const particleColor = isDark ? 0xc5a073 : 0xb45309;
    const gridColor = isDark ? 0x111113 : 0xf4f4f5;

    // Fog for depth fading (still used for scenery/depth if needed, but road/particles override it)
    scene.fog = new THREE.FogExp2(isDark ? 0x050507 : 0xfafafa, 0.012);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.75 : 1.15);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    // --- 1. Define Winding Spline Roads ---
    const curves = [
      // Major Highway (West-East)
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-75, -8, -15),
        new THREE.Vector3(-45, -6, 10),
        new THREE.Vector3(-15, -7, -25),
        new THREE.Vector3(15, -6, 20),
        new THREE.Vector3(45, -7, -10),
        new THREE.Vector3(75, -8, 5)
      ]),
      // North-South Loop
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-30, -8, -55),
        new THREE.Vector3(-10, -6, -20),
        new THREE.Vector3(15, -7, -5),
        new THREE.Vector3(-5, -6, 25),
        new THREE.Vector3(25, -8, 55)
      ]),
      // Local Diagonal
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-55, -8, 35),
        new THREE.Vector3(-25, -7, 0),
        new THREE.Vector3(20, -6, -15),
        new THREE.Vector3(60, -8, -45)
      ])
    ];

    // --- 2. Create Road Meshes (Flat blueprint lanes - Dull & Subtle) ---
    const roadGroup = new THREE.Group();
    curves.forEach(curve => {
      const leftPoints = [];
      const rightPoints = [];
      const centerPoints = [];
      const segments = 120;
      const roadWidth = 1.2; // Widen slightly to look like a proper highway lane
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const pt = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        // Perpendicular vector in horizontal X-Z plane
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        
        // Offset Y slightly to prevent Z-fighting between asphalt mesh and lines
        leftPoints.push(new THREE.Vector3(pt.x + normal.x * roadWidth, pt.y + 0.01, pt.z + normal.z * roadWidth));
        rightPoints.push(new THREE.Vector3(pt.x - normal.x * roadWidth, pt.y + 0.01, pt.z - normal.z * roadWidth));
        centerPoints.push(new THREE.Vector3(pt.x, pt.y + 0.02, pt.z));
      }
      
      // Flat Asphalt Ribbon Mesh
      const ribbonGeom = createRibbonGeometry(leftPoints, rightPoints);
      const ribbonMat = new THREE.MeshBasicMaterial({
        color: isDark ? 0x0c0c0f : 0xf1f1f3,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isDark ? 0.08 : 0.06, // Super faded asphalt to enhance readability
        depthWrite: false,
        fog: false // Uniform faded look throughout, no dark shading
      });
      const ribbonMesh = new THREE.Mesh(ribbonGeom, ribbonMat);
      roadGroup.add(ribbonMesh);
      
      // Outer boundaries (Solid very dull lines)
      const outerMat = new THREE.LineBasicMaterial({
        color: isDark ? 0x3a3a3c : 0xa1a1aa,
        transparent: true,
        opacity: isDark ? 0.35 : 0.25, // Increased visibility so boundaries are seen
        fog: false // Uniform faded look throughout
      });
      
      const leftGeom = new THREE.BufferGeometry().setFromPoints(leftPoints);
      const leftLine = new THREE.Line(leftGeom, outerMat);
      roadGroup.add(leftLine);
      
      const rightGeom = new THREE.BufferGeometry().setFromPoints(rightPoints);
      const rightLine = new THREE.Line(rightGeom, outerMat);
      roadGroup.add(rightLine);
      
      // Dashed Center Divider (Indicates multiple lanes)
      const centerGeom = new THREE.BufferGeometry().setFromPoints(centerPoints);
      const centerMat = new THREE.LineDashedMaterial({
        color: isDark ? 0x48484a : 0x71717a,
        dashSize: 1.5,
        gapSize: 1.2,
        transparent: true,
        opacity: isDark ? 0.35 : 0.25, // Increased visibility
        fog: false // Uniform faded look throughout
      });
      const centerLine = new THREE.Line(centerGeom, centerMat);
      centerLine.computeLineDistances(); // Crucial for dashed line rendering
      roadGroup.add(centerLine);
    });
    scene.add(roadGroup);

    // --- 3. Flowing GPS Traffic Particles ---
    const flowCount = 36; // Reduced count for "less dots" to prevent cluttering text
    const flowParticles = [];

    for (let i = 0; i < flowCount; i++) {
      // Assign particle to a random curve
      const curveIndex = Math.floor(Math.random() * curves.length);
      const curve = curves[curveIndex];
      const speed = 0.035 + Math.random() * 0.05;
      const progress = Math.random(); // Start at random point along path

      // Sphere mesh representing vehicle headlight/flow (reduced size to 0.18 for visual minimalism)
      const geom = new THREE.SphereGeometry(0.18, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: 0.25, // Faded dots to maintain high contrast for the text
        fog: false // Uniform visibility throughout, prevents dark fading
      });
      const mesh = new THREE.Mesh(geom, mat);

      const pos = curve.getPointAt(progress);
      mesh.position.copy(pos);

      scene.add(mesh);
      flowParticles.push({ mesh, curve, progress, speed });
    }

    // --- 4. GlowingBobbing Pins (Hotspots) ---
    const pins = [];
    const pinLocations = [
      { x: -15, z: -25, color: 0xef4444 }, // Critical
      { x: 15, z: 20, color: 0xef4444 },  // Critical
      { x: -25, z: 0, color: 0xf59e0b },   // Medium
      { x: 20, z: -15, color: 0x10b981 },  // Low
      { x: -45, z: 10, color: 0xf59e0b },  // Medium (New)
      { x: 45, z: -10, color: 0x10b981 },  // Low (New)
      { x: -30, z: -55, color: 0xef4444 }, // Critical (New)
      { x: 25, z: 55, color: 0xf59e0b },   // Medium (New)
      { x: -55, z: 35, color: 0x10b981 },  // Low (New)
      { x: 60, z: -45, color: 0xef4444 },  // Critical (New)
    ];

    pinLocations.forEach(loc => {
      const pinGroup = new THREE.Group();

      // Cone (pointer down)
      const coneGeom = new THREE.ConeGeometry(0.48, 1.4, 16);
      coneGeom.rotateX(Math.PI); // Point down
      coneGeom.translate(0, 0.7, 0); // Translate center to base
      const coneMat = new THREE.MeshPhongMaterial({
        color: loc.color,
        shininess: 30,
        flatShading: true,
        transparent: true,
        opacity: isDark ? 0.35 : 0.45, // Faded cone
        fog: false // Uniform visibility throughout
      });
      const cone = new THREE.Mesh(coneGeom, coneMat);
      pinGroup.add(cone);

      // Sphere on top
      const sphereGeom = new THREE.SphereGeometry(0.42, 16, 16);
      sphereGeom.translate(0, 1.5, 0);
      const sphereMat = new THREE.MeshBasicMaterial({ 
        color: loc.color,
        transparent: true,
        opacity: isDark ? 0.4 : 0.5, // Faded sphere
        fog: false // Uniform visibility throughout
      });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      pinGroup.add(sphere);

      pinGroup.position.set(loc.x, -5.5, loc.z);
      scene.add(pinGroup);

      // Dynamic Expanding Wave Ring
      const ringGeom = new THREE.RingGeometry(0.8, 1.0, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: loc.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4, // Faded wave ring
        fog: false // Uniform visibility throughout
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(loc.x, -7.8, loc.z);
      scene.add(ring);

      pins.push({
        group: pinGroup,
        ring,
        baseY: -5.5,
        bobSpeed: 2.2 + Math.random() * 1.5,
        offset: Math.random() * Math.PI
      });
    });

    // --- 5. Mouse Parallax drift ---
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.016;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.016;
    };
    window.addEventListener("mousemove", onMouseMove);

    // --- Animation Loop ---
    let frameId;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // Camera parallax drift
      camera.position.x += (mouseX - camera.position.x) * 0.04;
      camera.position.y += (35 - mouseY - camera.position.y) * 0.04;
      camera.lookAt(0, -6, -5);

      // Update flow particles along curves
      flowParticles.forEach(p => {
        p.progress += p.speed * clock.getDelta() * 0.6;
        if (p.progress >= 1.0) {
          p.progress = 0.0;
        }
        const pos = p.curve.getPointAt(p.progress);
        p.mesh.position.copy(pos);
      });

      // Bob pins & Expand rings
      pins.forEach(p => {
        // Bobbing pin
        p.group.position.y = p.baseY + Math.sin(time * p.bobSpeed + p.offset) * 0.5;
        p.group.rotation.y = time * 0.5;

        // Expanding ring
        const scale = 1.0 + (time * 1.8 % 3.0);
        p.ring.scale.set(scale, scale, scale);
        p.ring.material.opacity = Math.max(0, 0.45 * (1.0 - (scale - 1.0) / 3.0));
      });

      renderer.render(scene, camera);
    };

    animate();

    // --- Window resizing ---
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isDark]);

  return <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none opacity-80 dark:opacity-75" />;
}
