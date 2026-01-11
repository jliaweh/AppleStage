import * as THREE from "https://esm.sh/three@0.164.0";
import { OrbitControls } from "https://esm.sh/three@0.164.0/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "https://esm.sh/three@0.164.0/examples/jsm/geometries/RoundedBoxGeometry.js";

// ========================================
// PRODUKTDATEN
// ========================================

const categories = {
    'Mac': {
        newest: '14" MacBook Pro',
        products: ['MacBook Pro 14"', 'MacBook Pro 16"', 'MacBook Air', 'iMac', 'Mac Studio'],
        color: 0xA2AAAD
    },
    'iPhone': {
        newest: 'iPhone 17 Pro',
        products: ['iPhone 17 Pro', 'iPhone 17', 'iPhone 16 Pro', 'iPhone 16', 'iPhone SE'],
        color: 0x1D1D1F
    },
    'iPad': {
        newest: 'iPad Pro',
        products: ['iPad Pro 13"', 'iPad Pro 11"', 'iPad Air', 'iPad', 'iPad mini'],
        color: 0x6E6E73
    },
    'AirPods': {
        newest: 'AirPods Max',
        products: ['AirPods Max', 'AirPods Pro', 'AirPods 3', 'AirPods 2'],
        color: 0xF5F5F7
    }
};

// ========================================
// GLOBALE VARIABLEN
// ========================================

let currentCategory = 'iPhone';
let scene, camera, renderer, controls;
let productCards = [];
let soapBubbles = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// ========================================
// INITIALISIERUNG
// ========================================

function init() {
    const container = document.getElementById('canvas-container');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // Camera
    camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 20);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI / 2;

    // Lights
    setupLights();

    // Grid
    /*const gridHelper = new THREE.GridHelper(30, 30, 0x333333, 0x1a1a1a);
    gridHelper.position.y = -5;
    scene.add(gridHelper);*/

    // Initial scene
    updateScene(currentCategory);

    // Event Listeners
    setupEventListeners();

    // Update UI
    updateCategoryInfo();

    // Start animation
    animate();
}

// ========================================
// BELEUCHTUNG
// ========================================

function setupLights() {
    // Ambient Light
    /*const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);*/

    // Main Light (von oben rechts)
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    // Fill Light (von links)
    /*const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);*/
}

// ========================================
// PRODUKTKARTE ERSTELLEN
// ========================================

function createProductCard(text, position, isNewest = false, category) {
    const group = new THREE.Group();

    // Größe abhängig von isNewest
    const width = isNewest ? 3 : 2;
    const height = isNewest ? 4 : 2.5;
    const depth = 0.1;

    // Card-Geometrie (Box)
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.1
    });

    const card = new THREE.Mesh(geometry, material);
    card.castShadow = true;
    card.receiveShadow = true;
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
    ctx.font = isNewest ? 'bold 48px -apple-system' : 'bold 36px -apple-system';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Canvas zu Texture
    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const textGeometry = new THREE.PlaneGeometry(width * 0.9, height * 0.9);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.z = depth / 2 + 0.01;
    group.add(textMesh);

    // Position setzen
    group.position.set(position.x, position.y, position.z);

    // UserData für Interaktion
    group.userData = {
        type: 'productCard',
        text: text,
        isNewest: isNewest,
        category: category,
        originalPosition: position.clone(),
        originalScale: new THREE.Vector3(1, 1, 1)
    };

    return group;
}

// ========================================
// SOAP BUBBLE ERSTELLEN
// ========================================

/*function createSoapBubble(position, size, color, category) {
    // Sphere-Geometrie, skaliert zu Ellipsoid
    const geometry = new THREE.SphereGeometry(size.x, 50, 50);
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

    // Edge-Glow für Sichtbarkeit
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
}*/

function createSoapBubble(position, size, color, category) {
    // 1. GEOMETRIE: Abgerundete Box statt Kugel
    // Parameter: Breite, Höhe, Tiefe, Segmente, Radius der Ecken
    // Wir nutzen size.x, size.y und eine flachere Tiefe (z.B. 0.5 oder size.z)
    const geometry = new RoundedBoxGeometry(size.x, size.y, size.z, 4, 0.25);

    // 2. MATERIAL: Apple "Frosted Glass" Look
    const material = new THREE.MeshPhysicalMaterial({
        color: color,           // Die Farbe der Kategorie
        emissive: color,        // Leichtes Selbstleuchten für Farbechtheit
        emissiveIntensity: 0.1, // Wie stark es leuchtet (niedrig halten)
        
        metalness: 0.1,         // Wenig metallisch
        roughness: 0.2,         // 0 = klares Glas, 0.2-0.4 = Milchglas (Apple Style)
        
        transmission: 0.95,     // WICHTIG: Macht es zu echtem Glas (Licht geht durch)
        thickness: 0.5,         // Simuliert Dicke des Glases für Lichtbrechung
        ior: 1.5,               // "Index of Refraction" (1.5 ist typisch für Glas)
        
        transparent: true,      // Muss true sein
        opacity: 1.0,           // Bei 'transmission' muss opacity oft auf 1 bleiben
        
        side: THREE.DoubleSide
    });

    const bubble = new THREE.Mesh(geometry, material);
    bubble.position.set(position.x, position.y, position.z);

    // Optional: Ein feiner weißer Rand (Rim), damit man die Form besser sieht
    // Wir machen eine etwas größere Wireframe-Box
    const outlineGeo = new RoundedBoxGeometry(size.x, size.y, size.z, 4, 0.25);
    const outlineMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.2, 
        wireframe: true 
    });
    // Skalieren wir sie minimal größer
    const outline = new THREE.Mesh(outlineGeo, outlineMat);
    outline.scale.set(1.01, 1.01, 1.01); 
    // bubble.add(outline); // <-- Kommentar entfernen, wenn du einen feinen Gitter-Rand willst

    bubble.userData = {
        type: 'soapBubble',
        category: category
    };

    return bubble;
}

// ========================================
// SZENE AKTUALISIEREN
// ========================================

function updateScene(category) {
    // Alte Objekte entfernen
    productCards.forEach(card => scene.remove(card));
    soapBubbles.forEach(bubble => scene.remove(bubble));
    productCards = [];
    soapBubbles = [];

    const categoryData = categories[category];
    if (!categoryData) return;

    // NEUSTES PRODUKT (oben zentral)
    const newestCard = createProductCard(
        categoryData.newest,
        new THREE.Vector3(0, 3, 0),
        true,
        category
    );
    scene.add(newestCard);
    productCards.push(newestCard);

    // SOAP BUBBLE für Produktgruppe
    const bubbleSize = new THREE.Vector3(3, 2.5, 1.5);
    const bubblePosition = new THREE.Vector3(0, -2, 0);
    const bubble = createSoapBubble(
        bubblePosition,
        bubbleSize,
        categoryData.color,
        category
    );
    scene.add(bubble);
    soapBubbles.push(bubble);

    // PRODUKTE im Stapel (Piling)
    const productsToShow = categoryData.products.slice(0, 4);
    productsToShow.forEach((product, index) => {
        // Kreisbogen-Anordnung
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
        
        // Leichte Drehung für räumlichen Effekt
        card.rotation.y = angle;
        
        scene.add(card);
        productCards.push(card);
    });
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Window Resize
    window.addEventListener('resize', onWindowResize);

    // Mouse Move (für Hover)
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Navigation Buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active state
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update category
            currentCategory = e.target.dataset.category;
            updateScene(currentCategory);
            updateCategoryInfo();
        });
    });
}

// ========================================
// WINDOW RESIZE
// ========================================

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// ========================================
// MOUSE MOVE & HOVER
// ========================================

function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    checkHover();
}

function checkHover() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(productCards, true);

    // Reset alle Cards
    productCards.forEach(card => {
        if (card.userData.type === 'productCard') {
            card.scale.copy(card.userData.originalScale);
            card.position.z = card.userData.originalPosition.z;
        }
    });

    const hoverInfo = document.getElementById('hover-info');

    // Hover-Effekt
    if (intersects.length > 0) {
        const hoveredObject = intersects[0].object.parent;
        if (hoveredObject.userData.type === 'productCard') {
            // Vergrößern und nach vorne bewegen
            hoveredObject.scale.set(1.1, 1.1, 1.1);
            hoveredObject.position.z = hoveredObject.userData.originalPosition.z + 0.5;
            
            // Info anzeigen
            hoverInfo.textContent = hoveredObject.userData.text;
            hoverInfo.classList.add('visible');
            return;
        }
    }

    hoverInfo.classList.remove('visible');
}

// ========================================
// UI UPDATE
// ========================================

function updateCategoryInfo() {
    document.getElementById('category-name').textContent = currentCategory;
    document.getElementById('category-count').textContent = 
        `${categories[currentCategory].products.length} Produkte`;
}

// ========================================
// ANIMATION LOOP
// ========================================

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// ========================================
// START
// ========================================

init();