import * as THREE from "https://esm.sh/three@0.164.0";
import { OrbitControls } from "https://esm.sh/three@0.164.0/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "https://esm.sh/three@0.164.0/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "https://esm.sh/three@0.164.0/examples/jsm/environments/RoomEnvironment.js";

// ========================================
// PRODUKTDATEN
// ========================================

const categories = {
    'Mac': {
        newest: 'MacBook Pro',
        products: ['MacBook Pro', 'MacBook Air', 'iMac', 'Mac Studio', 'Mac Pro'],
        color: 0xA2AAAD
    },
    'iPhone': {
        newest: 'iPhone 17 Pro',
        products: ['iPhone 17', 'iPhone 16', 'iPhone SE', 'Zubehör'],
        color: 0x1D1D1F
    },
    'iPad': {
        newest: 'iPad Pro',
        products: ['iPad Air', 'iPad', 'iPad mini', 'Pencil'],
        color: 0x6E6E73
    },
    'AirPods': {
        newest: 'AirPods Max',
        products: ['AirPods Pro', 'AirPods 3', 'AirPods 2'],
        color: 0xF5F5F7
    }
};
//
// ========================================
// GLOBALE VARIABLEN
// ========================================

let scene, camera, renderer, controls;
let interactableObjects = []; 
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// ========================================
// INITIALISIERUNG
// ========================================

function init() {
    const container = document.getElementById('canvas-container');

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a); // Dark Mode Hintergrund

    // 2. Camera 
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 35); 

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; 
    container.appendChild(renderer.domElement);

    // 4. Environment (WICHTIG für Glas-Effekt)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // 5. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2; 

    // 6. Lights
    setupLights();

    // 7. Szene aufbauen 
    buildWorld();

    // 8. Event Listeners
    setupEventListeners();

    // Start
    animate();
}

// ========================================
// WELT AUFBAUEN (Spalten-Logik)
// ========================================

function buildWorld() {
    const categoryKeys = Object.keys(categories);
    const gap = 8; // Abstand zwischen den Spalten
    const totalWidth = (categoryKeys.length - 1) * gap;
    
    categoryKeys.forEach((key, index) => {
        // Berechne X-Position, damit alles zentriert ist
        // Beispiel: bei 4 Items -> -12, -4, +4, +12 (wenn gap 8)
        const xPos = (index * gap) - (totalWidth / 2);
        
        createCategoryColumn(key, xPos);
    });
}

function createCategoryColumn(categoryName, xPosition) {
    const data = categories[categoryName];
    
    // Gruppe für die ganze Spalte erstellen
    const columnGroup = new THREE.Group();
    columnGroup.position.x = xPosition;
    scene.add(columnGroup);

    // --- A. HEADER (News Bubble / Newest Product) ---
    const headerPos = new THREE.Vector3(0, 5, 0);
    const headerCard = createProductCard(data.newest, headerPos, true, categoryName);
    columnGroup.add(headerCard);
    interactableObjects.push(headerCard);

    // --- B. BODY (Soap Bubble / Produktreihe) ---
    const bubbleSize = new THREE.Vector3(3.5, 6, 2); 
    const bubblePos = new THREE.Vector3(0, -2, 0);
    
    const bubble = createSoapBubble(bubblePos, bubbleSize, data.color, categoryName);
    columnGroup.add(bubble);

    // --- C. INHALT DER BUBBLE (Produktliste) ---
    data.products.forEach((prodName, i) => {
        const yOffset = -4 + (i * 1.2); 
        const zOffset = (i % 2 === 0) ? 0.2 : -0.2; 
        
        const prodCard = createProductCard(prodName, new THREE.Vector3(0, yOffset, zOffset), false, categoryName);
        
        prodCard.scale.set(0.8, 0.8, 0.8);
        prodCard.userData.originalScale = new THREE.Vector3(0.8, 0.8, 0.8);
        
        columnGroup.add(prodCard);
        interactableObjects.push(prodCard);
    });

    // --- D. TEXT LABEL UNTER DER SPALTE ---
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; 
    canvas.height = 128;
    ctx.fillStyle = '#ffffff'; // Weißer Text für Dark Mode
    ctx.font = 'bold 60px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(categoryName, 256, 100);
    
    const labelTex = new THREE.CanvasTexture(canvas);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
    const labelGeo = new THREE.PlaneGeometry(4, 1);
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.set(0, -6.5, 0); 
    columnGroup.add(labelMesh);
}

// ========================================
// HELPER FUNKTIONEN (Objekte)
// ========================================

function createSoapBubble(position, size, color, category) {
    // Abgerundete Box, aber mit hohem Radius für Oval-Look
    const geometry = new RoundedBoxGeometry(size.x, size.y, size.z, 4, 1.0); // Radius erhöht

    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,        // Basis Weiß
        emissive: color,        // Leuchten in Kategoriefarbe
        emissiveIntensity: 0.2,
        metalness: 0.1,
        roughness: 0.15,        // Frosted Look
        transmission: 0.95,     // Glas
        thickness: 1.5,
        ior: 1.5,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
    });

    const bubble = new THREE.Mesh(geometry, material);
    bubble.position.copy(position);
    return bubble;
}

function createProductCard(text, position, isNewest = false, category) {
    const group = new THREE.Group();

    // Box Geometrie
    const width = isNewest ? 3.5 : 2.8;
    const height = isNewest ? 2.0 : 0.8; // Flacher für Listen-Look
    const depth = 0.15;

    // Weißes "Keramik" Material
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.1
    });

    const card = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    card.castShadow = true;
    card.receiveShadow = true;
    group.add(card);

    // Text Textur
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#000000';
    // Schriftgröße anpassen
    ctx.font = isNewest ? 'bold 50px -apple-system' : '40px -apple-system';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; 

    const textMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 0.95, height * 0.95),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    );
    textMesh.position.z = depth / 2 + 0.01;
    group.add(textMesh);

    group.position.copy(position);

    // UserData
    group.userData = {
        type: 'productCard',
        text: text,
        originalPosition: position.clone(),
        originalScale: new THREE.Vector3(1, 1, 1)
    };

    return group;
}

function setupLights() {
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(10, 20, 10);
    scene.add(mainLight);

    const blueLight = new THREE.PointLight(0x0044ff, 0.5);
    blueLight.position.set(-20, 10, -10);
    scene.add(blueLight);
}

// ========================================
// INTERAKTION & EVENTS
// ========================================

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    checkHover();
}

function checkHover() {
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(scene.children, true);

    const hoverInfo = document.getElementById('hover-info');
    let found = false;

    if (intersects.length > 0) {
        let object = intersects[0].object;
        while(object.parent && !object.userData.type) {
            object = object.parent;
        }

        if (object.userData.type === 'productCard') {
            document.body.style.cursor = 'pointer';
            
            if (object.scale.x === object.userData.originalScale.x) {
                object.position.z = object.userData.originalPosition.z + 0.5;
            }
            
            if(hoverInfo) {
                hoverInfo.textContent = object.userData.text;
                hoverInfo.classList.add('visible');
            }
            found = true;
        }
    }

    if (!found) {
        document.body.style.cursor = 'default';
        if(hoverInfo) hoverInfo.classList.remove('visible');
        
        interactableObjects.forEach(obj => {
            obj.position.z = THREE.MathUtils.lerp(obj.position.z, obj.userData.originalPosition.z, 0.1);
        });
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}


init();