/*import * as THREE from "https://esm.sh/three@0.164.0";
import { OrbitControls } from "https://esm.sh/three@0.164.0/examples/jsm/controls/OrbitControls.js";



// ------------------------------------------------------
// Grundsetup
// ------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 1.5, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);


// Licht (dezent, Apple-like)
const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(5, 5, 5);
scene.add(light);

const softLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(softLight);


// ------------------------------------------------------
// Panel-Generator
// ------------------------------------------------------
function createPanel(width, height, color, text) {
    const group = new THREE.Group();

    // Fläche
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    // Text als CanvasTexture
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.font = "bold 80px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);

    const textMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), textMat);
    textPlane.position.z = 0.01; // leicht nach vorne
    group.add(textPlane);

    return group;
}


// ------------------------------------------------------
// Panels erzeugen
// ------------------------------------------------------
const hero = createPanel(4, 2, 0x111111, "HERO PANEL");
hero.position.set(0, 1.2, 0);
scene.add(hero);

const featureA = createPanel(3, 1.6, 0x222222, "Feature A");
featureA.position.set(0, 1.2, -5);
scene.add(featureA);

const featureB = createPanel(3, 1.6, 0x222222, "Feature B");
featureB.position.set(2.5, 1.2, -3);
scene.add(featureB);


// ------------------------------------------------------
// Orbit Controls (später ersetzen wir das durch Guided Orbit)
// ------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;


// ------------------------------------------------------
// Point & Fly Navigation
// ------------------------------------------------------
function flyTo(targetObj) {
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3().copy(targetObj.position).add(new THREE.Vector3(0, 0, 3));

    let t = 0;
    const anim = () => {
        t += 0.02;
        const k = 1 - Math.pow(1 - t, 3); // ease out cubic

        camera.position.lerpVectors(startPos, endPos, k);
        camera.lookAt(targetObj.position);

        if (t < 1) requestAnimationFrame(anim);
    };
    anim();
}


// Panels anklickbar machen
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("pointerdown", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects([hero, featureA, featureB], true);

    if (hits.length > 0) {
        const panel = hits[0].object.parent;
        flyTo(panel);
    }
});


// ------------------------------------------------------
// Render Loop
// ------------------------------------------------------
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();


// Responsiveness
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
*/

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from "https://esm.sh/three@0.164.0";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const Apple3DPrototype = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const productCardsRef = useRef([]);
  const soapBubblesRef = useRef([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  const [activeCategory, setActiveCategory] = useState('iPhone');
  const [hoveredProduct, setHoveredProduct] = useState(null);

  // Produktdaten basierend auf Ihrer Skizze
  const categories = {
    'Mac': {
      newest: '14" MacBook Pro',
      products: ['MacBook Pro 14"', 'MacBook Pro 16"', 'MacBook Air', 'iMac', 'Mac Studio'],
      color: '#A2AAAD'
    },
    'iPhone': {
      newest: 'iPhone 17 Pro',
      products: ['iPhone 17 Pro', 'iPhone 17', 'iPhone 16 Pro', 'iPhone 16', 'iPhone SE'],
      color: '#1D1D1F'
    },
    'iPad': {
      newest: 'iPad Pro',
      products: ['iPad Pro 13"', 'iPad Pro 11"', 'iPad Air', 'iPad', 'iPad mini'],
      color: '#6E6E73'
    },
    'AirPods': {
      newest: 'AirPods Max',
      products: ['AirPods Max', 'AirPods Pro', 'AirPods 3', 'AirPods 2'],
      color: '#F5F5F7'
    }
  };

  // Erstelle eine Produktkarte (3D-Panel)
  const createProductCard = (text, position, isNewest = false, category) => {
    const group = new THREE.Group();
    
    // Card-Größe
    const width = isNewest ? 3 : 2;
    const height = isNewest ? 4 : 2.5;
    const depth = 0.1;
    
    // Card-Geometrie mit abgerundeten Ecken
    const shape = new THREE.Shape();
    const radius = 0.2;
    shape.moveTo(-width/2 + radius, -height/2);
    shape.lineTo(width/2 - radius, -height/2);
    shape.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + radius);
    shape.lineTo(width/2, height/2 - radius);
    shape.quadraticCurveTo(width/2, height/2, width/2 - radius, height/2);
    shape.lineTo(-width/2 + radius, height/2);
    shape.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - radius);
    shape.lineTo(-width/2, -height/2 + radius);
    shape.quadraticCurveTo(-width/2, -height/2, -width/2 + radius, -height/2);
    
    const extrudeSettings = {
      depth: depth,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1
    });
    
    const card = new THREE.Mesh(geometry, material);
    group.add(card);
    
    // Text als Canvas-Texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = isNewest ? 512 : 256;
    const ctx = canvas.getContext('2d');
    
    // Hintergrund
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Text
    ctx.fillStyle = '#1d1d1f';
    ctx.font = isNewest ? 'bold 48px -apple-system, sans-serif' : 'bold 36px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width/2, canvas.height/2);
    
    // Canvas als Texture
    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({ 
      map: texture,
      transparent: true
    });
    
    const textGeometry = new THREE.PlaneGeometry(width * 0.9, height * 0.9);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.z = depth + 0.01;
    group.add(textMesh);
    
    // Position setzen
    group.position.set(position.x, position.y, position.z);
    
    // Zusätzliche Daten für Interaktion
    group.userData = {
      type: 'productCard',
      text: text,
      isNewest: isNewest,
      category: category,
      originalPosition: position.clone(),
      originalScale: new THREE.Vector3(1, 1, 1)
    };
    
    return group;
  };

  // Erstelle Soap Bubble (transparente Hülle um Produktgruppe)
  const createSoapBubble = (position, size, color, category) => {
    const geometry = new THREE.SphereGeometry(size.x, 32, 32);
    geometry.scale(1, size.y / size.x, size.z / size.x);
    
    const material = new THREE.MeshPhysicalMaterial({
      color: color,
      transparent: true,
      opacity: 0.15,
      roughness: 0,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide
    });
    
    const bubble = new THREE.Mesh(geometry, material);
    bubble.position.set(position.x, position.y, position.z);
    
    // Edge-Glow für Soap Bubble
    const edgeGeometry = new THREE.SphereGeometry(size.x * 1.02, 32, 32);
    edgeGeometry.scale(1, size.y / size.x, size.z / size.x);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    bubble.add(edge);
    
    bubble.userData = {
      type: 'soapBubble',
      category: category
    };
    
    return bubble;
  };

  // Initialisiere Scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f7);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 20);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Grid Helper (optional, für Orientierung)
    const gridHelper = new THREE.GridHelper(30, 30, 0xcccccc, 0xeeeeee);
    gridHelper.position.y = -5;
    scene.add(gridHelper);

    // Erstelle initiale Szene für iPhone
    updateSceneForCategory('iPhone');

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Mouse Move für Hover-Effekte
    const handleMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      checkHover();
    };
    renderer.domElement.addEventListener('mousemove', handleMouseMove);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update Scene when category changes
  const updateSceneForCategory = (category) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old cards and bubbles
    productCardsRef.current.forEach(card => scene.remove(card));
    soapBubblesRef.current.forEach(bubble => scene.remove(bubble));
    productCardsRef.current = [];
    soapBubblesRef.current = [];

    const categoryData = categories[category];
    if (!categoryData) return;

    // Position für "News zu neuen Produkten" - zentral oben
    const newestCard = createProductCard(
      categoryData.newest,
      new THREE.Vector3(0, 3, 0),
      true,
      category
    );
    scene.add(newestCard);
    productCardsRef.current.push(newestCard);

    // Positioniere Produktgruppen horizontal verteilt
    const spacing = 5;
    const startX = -7.5;
    
    // Erstelle Soap Bubble für die Produktgruppe
    const bubbleSize = new THREE.Vector3(3, 2.5, 1.5);
    const bubblePosition = new THREE.Vector3(0, -2, 0);
    
    const bubble = createSoapBubble(
      bubblePosition,
      bubbleSize,
      new THREE.Color(categoryData.color),
      category
    );
    scene.add(bubble);
    soapBubblesRef.current.push(bubble);

    // Produkte innerhalb der Soap Bubble anordnen (als Stapel)
    categoryData.products.slice(0, 4).forEach((product, index) => {
      const angle = (index / 4) * Math.PI * 0.4 - Math.PI * 0.2;
      const radius = 2;
      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius + 0.5;
      
      const card = createProductCard(
        product,
        new THREE.Vector3(x, -2 + index * 0.1, z),
        false,
        category
      );
      card.rotation.y = angle;
      scene.add(card);
      productCardsRef.current.push(card);
    });
  };

  // Check for hover interactions
  const checkHover = () => {
    if (!cameraRef.current || !sceneRef.current) return;
    
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(productCardsRef.current, true);
    
    // Reset all cards
    productCardsRef.current.forEach(card => {
      if (card.userData.type === 'productCard') {
        card.scale.copy(card.userData.originalScale);
        card.position.z = card.userData.originalPosition.z;
      }
    });
    
    if (intersects.length > 0) {
      const hoveredObject = intersects[0].object.parent;
      if (hoveredObject.userData.type === 'productCard') {
        // Hover-Effekt: leicht vergrößern und nach vorne bewegen
        hoveredObject.scale.set(1.1, 1.1, 1.1);
        hoveredObject.position.z = hoveredObject.userData.originalPosition.z + 0.5;
        setHoveredProduct(hoveredObject.userData.text);
        return;
      }
    }
    
    setHoveredProduct(null);
  };

  // Handle category change
  useEffect(() => {
    updateSceneForCategory(activeCategory);
  }, [activeCategory]);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* Navigation Bar (wie Apple) */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center space-x-8">
              <span className="text-xl font-semibold text-gray-900"></span>
              {Object.keys(categories).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? 'text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Info-Text oben */}
      <div className="bg-white border-b border-gray-200 py-3 text-center">
        <p className="text-sm text-gray-600">
          Gerade erst vorgestellt: Sieh dir an was es Neues gibt
        </p>
        <p className="text-xs text-gray-500 mt-1">
          <strong>News zu neuen Produkten der Reihen</strong>
        </p>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <div ref={mountRef} className="w-full h-full" />
        
        {/* Hover-Info */}
        {hoveredProduct && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm">
            {hoveredProduct}
          </div>
        )}
        
        {/* Controls Info */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg text-xs text-gray-600">
          <p className="font-semibold mb-2">Navigation:</p>
          <p>🖱️ Linke Maustaste: Rotieren</p>
          <p>🔍 Mausrad: Zoomen</p>
          <p>⚙️ Rechte Maustaste: Verschieben</p>
        </div>

        {/* Category Info */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900">{activeCategory}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {categories[activeCategory].products.length} Produkte
          </p>
        </div>
      </div>
    </div>
  );
};

export default Apple3DPrototype;