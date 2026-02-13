/*import * as THREE from "https://esm.sh/three@0.164.0";
import { OrbitControls } from "https://esm.sh/three@0.164.0/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "https://esm.sh/three@0.164.0/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "https://esm.sh/three@0.164.0/examples/jsm/environments/RoomEnvironment.js";
import { VRButton } from "https://esm.sh/three@0.164.0/examples/jsm/webxr/VRButton.js";

// ========================================
// PRODUKTDATEN
// ========================================

const categories = {
    'Mac': {
        newest: 'MacBook Pro',
        products: ['MacBook Pro', 'MacBook Air', 'iMac', 'Mac Studio', 'Mac Pro'],
        //color: 0xA2AAAD,
        heroImage: './assets/macbook_hero.jpg',
    },
    'iPhone': {
        newest: 'iPhone 17 Pro',
        products: ['iPhone 17', 'iPhone 16', 'iPhone SE', 'Zubehör'],
        //color: 0x1D1D1F,
        heroImage: './assets/iphone_hero.jpg',
    },
    'iPad': {
        newest: 'iPad Pro',
        products: ['iPad Air', 'iPad', 'iPad mini', 'Pencil'],
        //color: 0x6E6E73,
        heroImage: './assets/ipad_hero.jpg',
    },
    'AirPods': {
        newest: 'AirPods Max',
        products: ['AirPods Pro', 'AirPods 3', 'AirPods 2'],
        //color: 0xF5F5F7,
        heroImage: './assets/airpods_hero.jpg',
    }
};

// ========================================
// GLOBALE VARIABLEN
// ========================================

let scene, camera, renderer, controls;
let interactableObjects = []; 
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

const textureLoader = new THREE.TextureLoader();

let currentView = 'overview'; 
let activeCategory = null;

// ========================================
// INITIALISIERUNG
// ========================================

function init() {
    const container = document.getElementById('canvas-container');

    // 1. Scene Setup
    scene = new THREE.Scene();
    //scene.background = new THREE.Color(0x0a0a0a); 

    // 2. Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 35); 

    // 3. Renderer mit WebXR Support
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    
    // WICHTIG: XR aktivieren
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. AR Button hinzufügen
    document.body.appendChild(VRButton.createButton(renderer));

    // 5. Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // 6. Controls 
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2;

    setupLights();
    buildWorld();
    setupEventListeners();

    // 7. WEBXR LOOP (Ersetzt requestAnimationFrame)
    renderer.setAnimationLoop(renderLoop);
}

// ========================================
// WELT AUFBAUEN
// ========================================

function buildWorld() {
    const categoryKeys = Object.keys(categories);
    const gap = 8; 
    const totalWidth = (categoryKeys.length - 1) * gap;
    
    categoryKeys.forEach((key, index) => {
        const xPos = (index * gap) - (totalWidth / 2);
        createCategoryColumn(key, xPos);
    });
}

function createCategoryColumn(categoryName, xPosition) {
    const data = categories[categoryName];
    const columnGroup = new THREE.Group();
    columnGroup.position.x = xPosition;
    columnGroup.name = categoryName;

    columnGroup.userData.targetPos = new THREE.Vector3(xPosition, 0, 0);
    columnGroup.userData.targetScale = 1;

    scene.add(columnGroup);

    const headerCard = createProductCard(data.newest, new THREE.Vector3(0, 5, 0), true, data.heroImage);
    columnGroup.add(headerCard);
    interactableObjects.push(headerCard);

    // 2. SOAP BUBBLE
    const bubbleSize = new THREE.Vector3(4, 5, 3);
    const bubblePos = new THREE.Vector3(0, -2, 0);
    const bubble = createSoapBubble(bubblePos, bubbleSize, data.color, categoryName);
    columnGroup.add(bubble);

    data.products.forEach((prodName, i) => {
        const phi = Math.acos(-1 + (2 * i) / data.products.length);
        const theta = Math.sqrt(data.products.length * Math.PI) * phi;
        
        const x = Math.cos(theta) * Math.sin(phi) * 1.2;
        const y = Math.sin(theta) * Math.sin(phi) * 1.5;
        const z = Math.cos(phi) * 0.8;

        const miniCard = createProductCard(prodName, new THREE.Vector3(x, y, z), false); 

        miniCard.userData.type = 'productIcon'; 
        miniCard.userData.targetPos = new THREE.Vector3(x, y, z);

        columnGroup.add(miniCard);
        interactableObjects.push(miniCard);
    });

    // 3. LABEL
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 256;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; 
    ctx.font = '500 80px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.textAlign = 'center';
    ctx.letterSpacing = "4px"; // Wirkt moderner und luftiger
    ctx.fillText(categoryName.toUpperCase(), 512, 160);
    
    const labelTex = new THREE.CanvasTexture(canvas);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
    const labelGeo = new THREE.PlaneGeometry(4, 1);
    const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), labelMat);
    labelMesh.position.set(0, -7.5, 0);
    columnGroup.add(labelMesh);

    // 4. DROP SHADOW
    const shadowGeo = new THREE.CircleGeometry(2.5, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x737373,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2; // Flach auf den Boden legen
    shadow.position.set(0, -8.5, 0); // Unter die Bubble auf den Boden
    columnGroup.add(shadow);
}

// ========================================
// HELPER FUNKTIONEN
// ========================================

function createSoapBubble(position, size, color, category) {
    const geometry = new RoundedBoxGeometry(size.x, size.y, size.z, 4, 1.0);
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xFFFFFF,
        emissive: color,
        emissiveIntensity: 0.05,
        //metalness: 0.1,
        roughness: 0.1,
        transmission: 0.98,
        thickness: 0.2,
        ior: 1.0,
        transparent: true,
        opacity: 0.5,
        iridescence: 1.0,
        side: THREE.DoubleSide
    });
    const bubble = new THREE.Mesh(geometry, material);
    bubble.position.copy(position);
    return bubble;
}

function createProductCard(text, position, isNewest = false, imagePath = null) {
    const group = new THREE.Group();

    const width = isNewest ? 3.5 : 2.8;
    const height = isNewest ? 2.0 : 0.8;
    const depth = 0.15;

    if (isNewest && imagePath) {    
        textureLoader.load(imagePath, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            const imageAspect = texture.image.width / texture.image.height;
            
            // Plane so skalieren, dass das Bild draufpasst
            const pHeight = height * 1.5;
            const pWidth = pHeight * imageAspect;

            const imageMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(pWidth, pHeight),
                new THREE.MeshBasicMaterial({ map: texture, transparent: true })
            );
            imageMesh.position.z = depth / 2 + 0.02;
            group.add(imageMesh);
            }, undefined, (err) => {
            console.error("Bild konnte nicht geladen werden:", imagePath);
        });    
    }
    else{
    }   
    group.position.copy(position);

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
    scene.add(new THREE.AmbientLight(0x404040, 1)); 
}

// ========================================
// INTERAKTION
// ========================================

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onSelect);
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
}

function checkHover() {
    if (renderer.xr.isPresenting) {
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    } else {
        raycaster.setFromCamera(mouse, camera);
    }
    
    const intersects = raycaster.intersectObjects(scene.children, true);
    let found = false;

    if (intersects.length > 0) {
        let object = intersects[0].object;
        while(object.parent && !object.userData.type) {
            object = object.parent;
        }

        if (object.userData.type === 'productCard') {
            document.body.style.cursor = 'pointer';
            object.position.z = THREE.MathUtils.lerp(object.position.z, object.userData.originalPosition.z + 0.8, 0.1);
            found = true;
        }
    }

    if (!found) {
        document.body.style.cursor = 'default';
        interactableObjects.forEach(obj => {
            obj.position.z = THREE.MathUtils.lerp(obj.position.z, obj.userData.originalPosition.z, 0.1);
        });
    }
}

function onSelect(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !obj.name) { obj = obj.parent; }
        
        if (categories[obj.name]) {
            if (currentView === 'overview') {
                transitionToDetail(obj.name);
            } else if (currentView === 'detail' && activeCategory === obj.name) {
                transitionToOverview();
            }
        }
    }
}

function transitionToDetail(categoryName) {
    currentView = 'detail';
    activeCategory = categoryName;

    const categoryKeys = Object.keys(categories);
    categoryKeys.forEach((key, index) => {
        const group = scene.getObjectByName(key);
        if (!group) return;

        if (key === categoryName) {
            // Die aktive Gruppe kommt in den Fokus
            group.userData.targetPos = new THREE.Vector3(0, 2, 0); // Leicht nach oben für den Stapel-Platz
            group.userData.targetScale = 1.0;
            
            // Hero Image bleibt oben, Bubble wird zum Hintergrund oder verschwindet
            expandToTidyPile(group);
        } else {
            // Die anderen rücken nach oben in den Hintergrund (wie in deiner Skizze)
            const xOffset = (index - (categoryKeys.length / 2)) * 3;
            group.userData.targetPos = new THREE.Vector3(xOffset, 10, -15);
            group.userData.targetScale = 0.5;
            
            // Verstecke die Inhalte (Icons) der nicht aktiven Bubbles
            group.children.forEach(child => {
                if (child.userData.type === 'productIcon') {
                    child.userData.targetPos = new THREE.Vector3(0, 0, 0);
                    child.scale.set(0, 0, 0);
                }
            });
        }
    });
}

function expandToTidyPile(group) {
    const cards = group.children.filter(child => child.userData.type === 'productIcon');

    const bubble = group.children.find(c => c.geometry instanceof RoundedBoxGeometry);
    if (bubble) {
        //bubble.userData.targetScale = 0.1; // Fast verschwinden lassen
        bubble.visible = false;

    }

    cards.forEach((card, i) => {
        // Dynamic Stacking Logik
        const spread = 0.5; // Wie weit die Karten auseinander liegen
        const zOffset = i * -0.5; // Stapelung in die Tiefe
        const yOffset = i * -0.2 - 2; // Leichtes Versetzen nach unten

        card.userData.targetPos = new THREE.Vector3(0, yOffset, 5 + zOffset);
        card.userData.targetScale = 1.0 - (i * 0.1); // Werden nach hinten kleiner
        
        // Material-Anpassung für Transparenz
        card.traverse(child => {
            if (child.material) {
                child.material.transparent = true;
                // Das erste (i=0) ist voll da, die anderen werden blasser
                child.material.opacity = i === 0 ? 1.0 : 0.4; 
            }
        });
    });
}

function transitionToOverview() {
    currentView = 'overview';
    activeCategory = null;

    const gap = 8;
    const categoryKeys = Object.keys(categories);
    const totalWidth = (categoryKeys.length - 1) * gap;

    categoryKeys.forEach((key, index) => {
        const group = scene.getObjectByName(key);
        if (group) {
            const xPos = (index * gap) - (totalWidth / 2);
            group.userData.targetPos = new THREE.Vector3(xPos, 0, 0);
            group.userData.targetScale = 1;

            // Kinder in der Bubble wieder auf Originalposition
            group.children.forEach(child => {
                if (child.userData.type === 'productIcon') {
                    child.userData.targetPos = child.userData.originalPosition;
                }
            });
        }
    });
}

// RENDER LOOP
function renderLoop() {
    if (renderer.xr.isPresenting) {
        scene.background = null;
    } else {
        //Background color
        scene.background = new THREE.Color(0x000000);
        controls.update();
    }
    
    Object.keys(categories).forEach(key => {
        const group = scene.getObjectByName(key);
        if (group && group.userData.targetPos) {
            // Bewege die ganze Gruppe sanft zum Ziel
            group.position.lerp(group.userData.targetPos, 0.1);
            
            // Skaliere die Gruppe sanft
            const s = THREE.MathUtils.lerp(group.scale.x, group.userData.targetScale || 1, 0.1);
            group.scale.set(s, s, s);
        }

        // Animation der einzelnen Kinder (für Tidy Pile)
        group.children.forEach(child => {
            if (child.userData && child.userData.targetPos) {
                child.position.lerp(child.userData.targetPos, 0.1);

                if (child.userData.targetScale !== undefined) {
                const s = THREE.MathUtils.lerp(child.scale.x, child.userData.targetScale, 0.1);
                child.scale.set(s, s, s);
                }
            }
        });
    });

    checkHover();
    renderer.render(scene, camera);
}

// Start
init();*/

import * as THREE from "https://esm.sh/three@0.164.0";
import { OrbitControls } from "https://esm.sh/three@0.164.0/examples/jsm/controls/OrbitControls.js";

// ========================================
// PRODUKTDATEN
// ========================================
const categories = {
    'Mac': {
        newest: 'MacBook Pro',
        products: ['MacBook Pro', 'MacBook Air', 'iMac', 'Mac Studio', 'Mac Pro'],
        color: 0xA2AAAD,
        heroImage: './assets/mac_hero.jpg',
    },
    'iPhone': {
        newest: 'iPhone 17 Pro',
        products: ['iPhone 17', 'iPhone 16', 'iPhone SE', 'Zubehör'],
        color: 0x4A90E2,
        heroImage: './assets/iphone_hero.jpg',
    },
    'iPad': {
        newest: 'iPad Pro',
        products: ['iPad Air', 'iPad', 'iPad mini', 'Pencil'],
        color: 0x6E6E73,
        heroImage: './assets/ipad_hero.jpg',
    },
    'AirPods': {
        newest: 'AirPods Max',
        products: ['AirPods Pro', 'AirPods 3', 'AirPods 2'],
        color: 0xE8E8E8,
        heroImage: './assets/airpods_hero.jpg',
    }
};

// ========================================
// GLOBALE VARIABLEN
// ========================================
let scene, camera, renderer, controls;
let interactableObjects = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let currentView = 'overview';
let activeCategory = null;
let layoutMode = 'tidy';
let showGrid = true;
let hoveredCard = null;
let gridHelper;
let globalHero;

// ========================================
// EASING & HELPER FUNCTIONS
// ========================================
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ========================================
// GEOMETRIE ERSTELLUNG
// ========================================
function createRoundedBox(width, height, depth, radius) {
    const shape = new THREE.Shape();
    const x = -width / 2, y = -height / 2;
    const w = width, h = height;
    
    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + h - radius);
    shape.quadraticCurveTo(x, y + h, x + radius, y + h);
    shape.lineTo(x + w - radius, y + h);
    shape.quadraticCurveTo(x + w, y + h, x + w, y + h - radius);
    shape.lineTo(x + w, y + radius);
    shape.quadraticCurveTo(x + w, y, x + w - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);

    const extrudeSettings = {
        depth: depth,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 3
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

// ========================================
// HERO SHOT MIT DEPTH LAYERS ERSTELLEN
// ========================================
/*function createHeroShot(text, position, categoryColor, categoryName) {
    const group = new THREE.Group();
    const width = 5.5;
    const height = 3.5;
    
    // Generiere Gradient Background als Hero Image Ersatz
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 768;

    // Gradient Background
    const gradient = ctx.createLinearGradient(0, 0, 1024, 768);
    const color1 = new THREE.Color(categoryColor);
    const color2 = new THREE.Color(categoryColor).multiplyScalar(0.3);
    gradient.addColorStop(0, `rgb(${color1.r * 255}, ${color1.g * 255}, ${color1.b * 255})`);
    gradient.addColorStop(1, `rgb(${color2.r * 255}, ${color2.g * 255}, ${color2.b * 255})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 768);

    // Product Silhouette (simple representation)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    if (categoryName === 'Mac') {
        ctx.roundRect(200, 200, 624, 400, 30);
    } else if (categoryName === 'iPhone') {
        ctx.roundRect(400, 100, 224, 500, 40);
    } else if (categoryName === 'iPad') {
        ctx.roundRect(300, 150, 424, 468, 35);
    } else {
        ctx.arc(512, 384, 180, 0, Math.PI * 2);
    }
    ctx.fill();

    // Product name
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 64px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(text, 512, 680);

    const heroTexture = new THREE.CanvasTexture(canvas);

    // Layer 1: Background Card (Depth)
    const bgCard = createRoundedBox(width * 1.1, height * 1.1, 0.3, 0.3);
    const bgMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        metalness: 0.2,
        roughness: 0.6,
    });
    const bgMesh = new THREE.Mesh(bgCard, bgMat);
    bgMesh.position.z = -0.4;
    bgMesh.castShadow = true;
    group.add(bgMesh);

    // Layer 2: Glass Frame
    const frameGeo = createRoundedBox(width * 1.05, height * 1.05, 0.15, 0.25);
    const frameMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.z = -0.15;
    group.add(frameMesh);

    // Layer 3: Hero Image (Main)
    const heroMat = new THREE.MeshBasicMaterial({
        map: heroTexture,
        transparent: false,
    });
    const heroMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        heroMat
    );
    heroMesh.position.z = 0.1;
    group.add(heroMesh);
    group.userData.heroImage = heroMesh;

    // Layer 4: Glass Overlay (Premium Look)
    const glassGeo = new THREE.PlaneGeometry(width, height);
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.9,
        thickness: 0.5,
        transparent: true,
        opacity: 0.3,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.z = 0.25;
    group.add(glassMesh);

    // Glow/Rim Light
    const glowGeo = createRoundedBox(width * 1.15, height * 1.15, 0.1, 0.3);
    const glowMat = new THREE.MeshBasicMaterial({
        color: categoryColor,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = -0.5;
    group.add(glow);

    group.position.copy(position);
    group.userData = {
        type: 'productCard',
        text: text,
        isNewest: true,
        isHero: true,
        originalPosition: position.clone(),
        originalScale: new THREE.Vector3(1, 1, 1),
        glowMesh: glow,
        categoryColor: categoryColor,
        layers: {
            background: bgMesh,
            frame: frameMesh,
            image: heroMesh,
            glass: glassMesh
        }
    };

    return group;
}*/

// ========================================
// PRODUCT CARD ERSTELLEN
// ========================================
function createProductCard(text, position, isNewest = false, categoryColor = 0xffffff) {
    const group = new THREE.Group();
    
    const width = isNewest ? 4.5 : 3.2;
    const height = isNewest ? 2.8 : 1.4;
    const depth = 0.15;

    // Card Background
    const cardGeo = createRoundedBox(width, height, depth, 0.2);
    const cardMat = new THREE.MeshStandardMaterial({
        //color: 0x1a1a1a,
        metalness: 0.3,
        roughness: 0.4,
        emissive: categoryColor,
        emissiveIntensity: isNewest ? 0.2 : 0.1,
    });
    
    const card = new THREE.Mesh(cardGeo, cardMat);
    card.castShadow = true;
    card.receiveShadow = true;
    group.add(card);

    // Text Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 512;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = isNewest ? 'bold 72px -apple-system' : '500 52px -apple-system';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 256);

    const textTex = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ 
        map: textTex, 
        transparent: true,
        opacity: 1
    });
    const textMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 0.9, height * 0.7),
        textMat
    );
    textMesh.position.z = depth / 2 + 0.02;
    group.add(textMesh);

    // Glow Effect (initially hidden)
    const glowGeo = createRoundedBox(width * 1.08, height * 1.08, depth * 0.5, 0.25);
    const glowMat = new THREE.MeshBasicMaterial({
        color: categoryColor,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = -0.1;
    group.add(glow);

    group.position.copy(position);
    group.userData = {
        type: 'productCard',
        text: text,
        isNewest: isNewest,
        originalPosition: position.clone(),
        originalScale: new THREE.Vector3(1, 1, 1),
        glowMesh: glow,
        textMesh: textMesh,
        categoryColor: categoryColor
    };

    return group;
}

// ========================================
// DYNAMISCHE SOAP BUBBLE (umschließt Inhalte)
// ========================================
function createDynamicSoapBubble(categoryColor, category) {
    // Erstelle eine Hülle die sich um Inhalte legt
    const segments = 32;
    const geometry = new THREE.SphereGeometry(1, segments, segments);
    
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: categoryColor,
        emissiveIntensity: 0.15,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.95,
        thickness: 0.8,
        ior: 1.45,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    
    const bubble = new THREE.Mesh(geometry, material);
    bubble.userData.category = category;
    bubble.userData.isDynamic = true;
    
    return bubble;
}

// Berechne Bounding Box und passe Bubble an
function updateBubbleToFitContent(bubble, children, padding = 0.5) {
    const box = new THREE.Box3();
    
    // Berechne Bounding Box aller Kinder (außer Hero)
    children.forEach(child => {
        if (child.userData.type === 'productIcon') {
            const childBox = new THREE.Box3().setFromObject(child);
            box.expandByPoint(childBox.min);
            box.expandByPoint(childBox.max);
        }
    });

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Setze Bubble Position und Größe
    bubble.position.copy(center);
    
    // Skaliere die Sphere um die Inhalte
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = (maxDim / 2) + padding;
    bubble.scale.set(scale, scale * 1.2, scale * 0.9); // Leicht elliptisch
    
    bubble.userData.baseScale = bubble.scale.clone();
}

// ========================================
// HALO (AWARENESS INDICATOR)
// ========================================
function createHalo(radius, color) {
    // 1. Erstelle einen Canvas für den radialen Gradienten
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Gradient zeichnen: Mitte (Farbe) nach Außen (Transparent)
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    
    // Wir wandeln die THREE.Color in einen CSS-String um
    const threeColor = new THREE.Color(color);
    const rgb = `${Math.floor(threeColor.r * 255)}, ${Math.floor(threeColor.g * 255)}, ${Math.floor(threeColor.b * 255)}`;
    
    gradient.addColorStop(0, `rgba(${rgb}, 0.6)`);   // Zentrum: Kräftig aber transparent
    gradient.addColorStop(0.5, `rgba(${rgb}, 0.2)`); // Mitte: Sanftes Auslaufen
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);     // Rand: Komplett unsichtbar

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);

    // 2. Nutze eine PlaneGeometry statt eines Rings
    // Wir machen die Fläche etwas größer (Radius * 3), damit der Glow Platz zum Auslaufen hat
    const haloGeo = new THREE.PlaneGeometry(radius * 3, radius * 3);
    
    const haloMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0, // Startet unsichtbar, wird durch deine Hover/Transition Logik gesteuert
        depthWrite: false, // Verhindert unschöne Überlagerungs-Artefakte
        blending: THREE.AdditiveBlending, // Verstärkt den "Glow"-Effekt (leuchtet heller auf dunklem Grund)
        side: THREE.DoubleSide
    });

    const halo = new THREE.Mesh(haloGeo, haloMat);
    
    // Flach auf den Boden legen
    halo.rotation.x = -Math.PI / 2;
    
    return halo;
}

// ========================================
// CATEGORY COLUMN ERSTELLEN
// ========================================
function createCategoryColumn(categoryName, xPosition, categoryColor) {
    const data = categories[categoryName];
    const columnGroup = new THREE.Group();
    columnGroup.position.x = xPosition;
    columnGroup.name = categoryName;

    columnGroup.userData = {
        targetPos: new THREE.Vector3(xPosition, -3, 0),
        targetScale: 1,
        targetOpacity: 1,
        category: categoryName
    };

    scene.add(columnGroup);

    // 1. HERO SHOT (oben) - Multi-Layer Billboard
    /*const heroShot = createHeroShot(
        data.newest,
        new THREE.Vector3(0, 6, 0),
        categoryColor,
        categoryName
    );
    heroShot.userData.category = categoryName;
    columnGroup.add(heroShot);
    interactableObjects.push(heroShot);
    columnGroup.userData.heroShot = heroShot;*/

    /*const heroShot = createCurvedHero(
        `./assets/${categoryName.toLowerCase()}_hero.jpg`, 
        categoryColor, 
        categoryName
    );
    heroShot.position.y = 8; 
    heroShot.userData.category = categoryName;
    heroShot.userData.isHero = true;
    columnGroup.add(heroShot);
    interactableObjects.push(heroShot);
    columnGroup.userData.heroShot = heroShot;*/

    
    // 2. PRODUCT ICONS (in der Bubble verteilt) - ERST ERSTELLEN
    const productCards = [];
    data.products.forEach((prodName, i) => {
        const angle = (i / data.products.length) * Math.PI * 2;
        const radiusX = 2.0;
        const radiusY = 2.3;
        
        const x = Math.cos(angle) * radiusX;
        const y = Math.sin(angle) * radiusY - 0.5;
        const z = Math.sin(angle * 2) * 0.6;

        const miniCard = createProductCard(prodName, new THREE.Vector3(x, y, z), false, categoryColor);
        miniCard.userData.type = 'productIcon';
        miniCard.userData.targetPos = new THREE.Vector3(x, y, z);
        miniCard.userData.category = categoryName;
        miniCard.userData.index = i;
        miniCard.userData.bubbleAngle = angle;

        columnGroup.add(miniCard);
        interactableObjects.push(miniCard);
        productCards.push(miniCard);
    });

    // 3. SOAP BUBBLE - DYNAMISCH UM PRODUCT ICONS
    const bubble = createDynamicSoapBubble(categoryColor, categoryName);
    columnGroup.add(bubble);
    columnGroup.userData.bubble = bubble;
    
    // Update Bubble um die Product Cards zu umschließen
    updateBubbleToFitContent(bubble, productCards, 1.2);

    // 4. HALO
    const halo = createHalo(3.5, categoryColor);
    halo.position.set(0, -8.5, 0);
    columnGroup.add(halo);
    columnGroup.userData.halo = halo;

    // 5. CATEGORY LABEL
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 256;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '600 80px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(categoryName.toUpperCase(), 512, 140);

    const labelTex = new THREE.CanvasTexture(canvas);
    const labelMat = new THREE.MeshBasicMaterial({ 
        map: labelTex, 
        transparent: true 
    });
    const labelMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 1.5), 
        labelMat
    );
    labelMesh.position.set(0, -8.5, 0);
    columnGroup.add(labelMesh);

    // 6. DROP SHADOW
    const shadowGeo = new THREE.CircleGeometry(3.5, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.1
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -10, 0);
    columnGroup.add(shadow);
    columnGroup.userData.shadow = shadow;
}

// ========================================
// WORLD AUFBAUEN
// ========================================
function buildWorld() {
    const categoryKeys = Object.keys(categories);
    const gap = 11;
    const totalWidth = (categoryKeys.length - 1) * gap;
    
    categoryKeys.forEach((key, index) => {
        const xPos = (index * gap) - (totalWidth / 2);
        createCategoryColumn(key, xPos, categories[key].color);
    });

    globalHero = createCurvedHero('./assets/iphone_hero.jpg');
    globalHero.position.set(0, 11, 5); // Zentriert im Hintergrund
    scene.add(globalHero);
}

// ========================================
// TRANSITION TO DETAIL
// ========================================
function transitionToDetail(categoryName) {
    currentView = 'detail';
    activeCategory = categoryName;
    updateUI();

    const categoryKeys = Object.keys(categories);
    categoryKeys.forEach((key) => {
        const group = scene.getObjectByName(key);
        if (!group) return;

        if (key === categoryName) {
            // Active Category - Focus
            group.userData.targetPos = new THREE.Vector3(0, 2.5, 0);
            group.userData.targetScale = 1.3;
            group.userData.targetOpacity = 1;
            
            expandToTidyPile(group);
        } else {
            // Background Categories - Reduced but visible (Progressive Disclosure)
            const index = categoryKeys.indexOf(key);
            const activeIndex = categoryKeys.indexOf(categoryName);
            const offset = (index - activeIndex) * 7;
            
            group.userData.targetPos = new THREE.Vector3(offset, 9, -15);
            group.userData.targetScale = 0.45;
            group.userData.targetOpacity = 0.35;
            
            // Show Halo for awareness
            if (group.userData.halo) {
                group.userData.halo.material.opacity = 0.5;
            }
            
            // Hide product icons but keep structure visible
            group.children.forEach(child => {
                if (child.userData.type === 'productIcon') {
                    child.scale.set(0.01, 0.01, 0.01);
                }
            });

            // Keep bubble visible but more transparent
            if (group.userData.bubble) {
                group.userData.bubble.material.opacity = 0.3;
            }
        }
    });
}

// ========================================
// EXPAND TO TIDY PILE
// ========================================
function expandToTidyPile(group) {
    const cards = group.children.filter(child => child.userData.type === 'productIcon');
    const bubble = group.userData.bubble;
    
    if (bubble) {
        // Transform bubble to background/grouping indicator
        bubble.material.opacity = 0.25;
        
        // Skaliere Bubble größer für den Stapel-Raum
        const baseScale = bubble.userData.baseScale || new THREE.Vector3(1, 1, 1);
        bubble.scale.set(baseScale.x * 1.8, baseScale.y * 1.5, baseScale.z * 1.8);
    }

    // Tidy Pile Layout mit Z-Staffelung
    cards.forEach((card, i) => {
        const spread = 0.4;
        const zOffset = i * -1.0; // Deutliche Tiefenstaffelung
        const yOffset = -1.5 + (i * -0.6); // Vertikale Staffelung
        const xOffset = (i % 2 === 0 ? 1 : -1) * spread * (i * 0.12);

        card.userData.targetPos = new THREE.Vector3(xOffset, yOffset, 4 + zOffset);
        card.userData.targetScale = 1.0 - (i * 0.09);
        card.renderOrder = -i; // Verhindert Z-Fighting
        
        // Progressive Opacity für Tiefenwahrnehmung
        card.traverse(child => {
            if (child.material) {
                child.material.transparent = true;
                const opacityTarget = i === 0 ? 1.0 : Math.max(0.5, 1.0 - (i * 0.15));
                child.userData.targetOpacity = opacityTarget;
            }
        });
    });
}

// ========================================
// FAN OUT (PEEK ANIMATION)
// ========================================
function fanOutStack(group, hoveredIndex) {
    const cards = group.children.filter(child => child.userData.type === 'productIcon');
    
    cards.forEach((card, i) => {
        if (!card.userData.targetPos) return;
        
        const distance = Math.abs(i - hoveredIndex);
        const fanAngle = (i - hoveredIndex) * 10; // Grad
        const fanOffset = distance * 0.5;
        
        const basePos = card.userData.targetPos.clone();
        basePos.x += Math.sin(fanAngle * Math.PI / 180) * fanOffset;
        basePos.y += Math.abs(Math.cos(fanAngle * Math.PI / 180)) * fanOffset * 0.6;
        basePos.z += 0.5; // Leicht nach vorne bringen
        
        // Smooth transition
        card.position.lerp(basePos, 0.25);
    });
}

// ========================================
// RESET FAN
// ========================================
function resetFan(group) {
    const cards = group.children.filter(child => child.userData.type === 'productIcon');
    cards.forEach(card => {
        if (card.userData.targetPos) {
            card.position.lerp(card.userData.targetPos, 0.2);
        }
    });
}

// ========================================
// TRANSITION TO OVERVIEW
// ========================================
function transitionToOverview() {
    currentView = 'overview';
    activeCategory = null;
    hoveredCard = null;
    updateUI();

    const gap = 11;
    const categoryKeys = Object.keys(categories);
    const totalWidth = (categoryKeys.length - 1) * gap;

    categoryKeys.forEach((key, index) => {
        const group = scene.getObjectByName(key);
        if (!group) return;

        const xPos = (index * gap) - (totalWidth / 2);
        group.userData.targetPos = new THREE.Vector3(xPos, 0, 0);
        group.userData.targetScale = 1;
        group.userData.targetOpacity = 1;

        // Reset Halo
        if (group.userData.halo) {
            group.userData.halo.material.opacity = 0;
        }

        // Reset Bubble
        const bubble = group.userData.bubble;
        if (bubble) {
            bubble.material.opacity = 0.7;
            
            // Zurück zur Original-Größe (umschließt die Icons)
            const baseScale = bubble.userData.baseScale || new THREE.Vector3(1, 1, 1);
            bubble.scale.copy(baseScale);
        }

        // Reset Shadow
        if (group.userData.shadow) {
            group.userData.shadow.material.opacity = 0.4;
        }

        // Reset Product Icons to bubble formation
        group.children.forEach(child => {
            if (child.userData.type === 'productIcon') {
                const angle = child.userData.bubbleAngle;
                const radiusX = 2.0;
                const radiusY = 2.3;
                
                const x = Math.cos(angle) * radiusX;
                const y = Math.sin(angle) * radiusY - 0.5;
                const z = Math.sin(angle * 2) * 0.6;
                
                child.userData.targetPos = new THREE.Vector3(x, y, z);
                child.userData.targetScale = 1;
                
                child.traverse(c => {
                    if (c.material) {
                        c.userData.targetOpacity = 1;
                    }
                });
            }
        });
    });
}

// ========================================
// PARALLAX EFFECT FÜR HERO SHOTS
// ========================================
function updateHeroParallax() {
    if (currentView !== 'overview') return;

    Object.keys(categories).forEach(key => {
        const group = scene.getObjectByName(key);
        if (!group) return;

        // Find hero shot
        const hero = group.children.find(child => child.userData.isHero);
        if (!hero || !hero.userData.layers) return;

        // Parallax basierend auf Kameraposition
        const cameraOffset = camera.position.x * 0.01;
        const layers = hero.userData.layers;

        // Tiefenstaffelung durch Parallax
        if (layers.background) {
            layers.background.position.x = -cameraOffset * 0.3;
        }
        if (layers.frame) {
            layers.frame.position.x = -cameraOffset * 0.15;
        }
        if (layers.image) {
            layers.image.position.x = cameraOffset * 0.1;
        }
        if (layers.glass) {
            layers.glass.position.x = cameraOffset * 0.2;
        }

        // Subtle rotation for depth
        hero.rotation.y = THREE.MathUtils.lerp(
            hero.rotation.y,
            cameraOffset * 0.05,
            0.1
        );
    });
}
function checkHover() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactableObjects, true);

    // Reset all glows
    interactableObjects.forEach(obj => {
        if (obj.userData.glowMesh) {
            obj.userData.glowMesh.material.opacity = THREE.MathUtils.lerp(
                obj.userData.glowMesh.material.opacity,
                0,
                0.15
            );
        }
    });

    if (intersects.length > 0) {
        let object = intersects[0].object;
        
        // Find parent with userData
        while (object.parent && !object.userData.type) {
            object = object.parent;
        }

        if (object.userData.type === 'productCard' || object.userData.type === 'productIcon') {
            document.body.style.cursor = 'pointer';
            
            // Glow Effect
            if (object.userData.glowMesh) {
                object.userData.glowMesh.material.opacity = THREE.MathUtils.lerp(
                    object.userData.glowMesh.material.opacity,
                    0.4,
                    0.15
                );
            }
            
            // Lift Effect
            const lift = object.userData.isNewest ? 0.6 : object.userData.isHero ? 0.5 : 0.4;
            const targetZ = (object.userData.targetPos?.z || object.userData.originalPosition.z) + lift;
            object.position.z = THREE.MathUtils.lerp(object.position.z, targetZ, 0.2);

            // Fan out if in detail view and hovering over stack
            if (currentView === 'detail' && object.userData.type === 'productIcon') {
                const group = scene.getObjectByName(activeCategory);
                if (group && hoveredCard !== object) {
                    hoveredCard = object;
                    fanOutStack(group, object.userData.index);
                }
            }
        }
    } else {
        document.body.style.cursor = 'default';
        
        // Reset to target positions
        interactableObjects.forEach(obj => {
            const targetZ = obj.userData.targetPos?.z || obj.userData.originalPosition?.z || 0;
            obj.position.z = THREE.MathUtils.lerp(obj.position.z, targetZ, 0.2);
        });

        // Reset fan if no hover
        if (currentView === 'detail' && activeCategory && hoveredCard) {
            const group = scene.getObjectByName(activeCategory);
            if (group) {
                resetFan(group);
                hoveredCard = null;
            }
        }
    }
}

// ========================================
// EVENT HANDLERS
// ========================================
function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onMouseClick(event) {
    if (event.target.closest('.ui-button')) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        let obj = intersects[0].object;
        
        // Find category group
        while (obj.parent && !obj.name && obj.parent !== scene) {
            obj = obj.parent;
        }

        if (categories[obj.name]) {
            if (currentView === 'overview') {
                transitionToDetail(obj.name);
            } else if (currentView === 'detail' && activeCategory === obj.name) {
                transitionToOverview();
            }
        }
    }
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// ========================================
// UI UPDATES
// ========================================
function updateUI() {
    const viewBadge = document.getElementById('badge-view');
    const categoryBadge = document.getElementById('badge-category');
    
    viewBadge.textContent = currentView === 'overview' ? 'Übersicht' : 'Detail';
    categoryBadge.textContent = activeCategory || '-';
    
    if (currentView === 'detail') {
        viewBadge.classList.add('active');
    } else {
        viewBadge.classList.remove('active');
    }
}

function toggleGrid() {
    showGrid = !showGrid;
    if (gridHelper) {
        gridHelper.visible = showGrid;
    }
    const btn = document.getElementById('btn-grid');
    btn.innerHTML = `<span>⊞</span> Grid ${showGrid ? 'An' : 'Aus'}`;
}

function toggleLayout() {
    layoutMode = layoutMode === 'tidy' ? 'juxtaposition' : 'tidy';
    const btn = document.getElementById('btn-layout');
    const badge = document.getElementById('badge-layout');
    
    if (layoutMode === 'tidy') {
        btn.innerHTML = '<span>⋮</span> Stapel-Modus';
        badge.textContent = 'Stapel-Modus';
    } else {
        btn.innerHTML = '<span>⊞</span> Vergleichs-Modus';
        badge.textContent = 'Vergleichs-Modus';
    }
}

function resetView() {
    transitionToOverview();
    camera.position.set(0, 2, 35);
    controls.target.set(0, 0, 0);
}

function createCurvedHero(imageUrl) {
    const group = new THREE.Group();
    const radius = 60; 
    const height = 20;
    const arcAngle = Math.PI / 2.2;
    
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true, -arcAngle / 2, arcAngle);

    const material = new THREE.MeshStandardMaterial({
        side: THREE.BackSide,
        transparent: true,
        emissiveIntensity: 0.1
    });

    new THREE.TextureLoader().load(imageUrl, (texture) => { 
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        texture.repeat.x = -1; // Invertiert die vertikale Achse
        texture.offset.x = 1;

        material.map = texture;
        material.needsUpdate = true;
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.rotation.y = Math.PI;
    
    group.add(mesh);
    return group;
}
// ========================================
// INIT
// ========================================
function init() {
    const container = document.getElementById('canvas-container');

    // Scene
    scene = new THREE.Scene();
    //scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 70, 120);

    // Camera
    camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 2, 35);


    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 15;
    controls.maxDistance = 60;
    controls.target.set(0, 0, 0);

    // Lighting - 3-Point Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Key Light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
    mainLight.position.set(12, 22, 12);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.far = 60;
    mainLight.shadow.camera.left = -30;
    mainLight.shadow.camera.right = 30;
    mainLight.shadow.camera.top = 30;
    mainLight.shadow.camera.bottom = -30;
    scene.add(mainLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.35);
    fillLight.position.set(-12, 10, -10);
    scene.add(fillLight);

    // Rim Light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, 6, -22);
    scene.add(rimLight);

    // Grid
    /*gridHelper = new THREE.GridHelper(120, 60, 0x333333, 0x1b1b1b);
    gridHelper.position.y = -10.5;
    scene.add(gridHelper);*/

    // Build World
    buildWorld();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);
    
    // UI Buttons
    document.getElementById('btn-reset').addEventListener('click', resetView);

    // Show UI
    document.getElementById('loading').style.display = 'none';
    document.getElementById('ui-controls').style.display = 'flex';

    // Start Animation
    animate();
}

// ========================================
// ANIMATION LOOP
// ========================================
function animate() {
    requestAnimationFrame(animate);

    /*const time = Date.now() * 0.001;
    // GLOBALER HERO EFFEKT
    if (globalHero) {
        // Sanftes Schweben
        globalHero.position.y = 10 + Math.sin(time * 0.5) * 0.2;
        
        // Dezenter Parallax: Der Hero bewegt sich leicht entgegengesetzt zur Maus
        globalHero.position.x = THREE.MathUtils.lerp(globalHero.position.x, -mouse.x * 2, 0.05);
    }*/

    if (controls) controls.update();
    renderer.render(scene, camera);

    // Update all category groups
    Object.keys(categories).forEach(key => {
        const group = scene.getObjectByName(key);
        if (!group || !group.userData.targetPos) return;

        // Smooth position transition
        const posLerpFactor = easeOutCubic(0.09);
        group.position.lerp(group.userData.targetPos, posLerpFactor);
        
        // Smooth scale transition
        const targetScale = group.userData.targetScale || 1;
        const s = THREE.MathUtils.lerp(group.scale.x, targetScale, posLerpFactor);
        group.scale.set(s, s, s);

        // Update group opacity
        if (group.userData.targetOpacity !== undefined) {
            group.traverse(child => {
                if (child.material && child.material.transparent && child !== group.userData.bubble) {
                    child.material.opacity = THREE.MathUtils.lerp(
                        child.material.opacity,
                        group.userData.targetOpacity,
                        0.1
                    );
                }
            });
        }

        // Animate children (cards)
        group.children.forEach(child => {
            if (child.userData.targetPos) {
                child.position.lerp(child.userData.targetPos, 0.12);
            }

            if (child.userData.targetScale !== undefined) {
                const cs = THREE.MathUtils.lerp(child.scale.x, child.userData.targetScale, 0.12);
                child.scale.set(cs, cs, cs);
            }

            if (child.userData.targetOpacity !== undefined) {
                child.traverse(c => {
                    if (c.material && c.material.transparent) {
                        c.material.opacity = THREE.MathUtils.lerp(
                            c.material.opacity,
                            child.userData.targetOpacity,
                            0.1
                        );
                    }
                });
            }
        });
    });

    checkHover();
    updateHeroParallax();
    controls.update();
    renderer.render(scene, camera);
    

    
}
// Start
init();