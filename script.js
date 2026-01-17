import * as THREE from "https://esm.sh/three@0.164.0";
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
        color: 0xA2AAAD,
        heroImage: './assets/macbook_hero.jpg',
    },
    'iPhone': {
        newest: 'iPhone 17 Pro',
        products: ['iPhone 17', 'iPhone 16', 'iPhone SE', 'Zubehör'],
        color: 0x1D1D1F,
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
        color: 0xF5F5F7,
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

        const miniCard = createProductCard(prodName, new THREE.Vector3(x, y, z), categoryName);
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
        color: 0xffffff,
        emissive: color,
        emissiveIntensity: 0.2,
        metalness: 0.1,
        roughness: 0.15,
        transmission: 0.95,
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

function createProductCard(text, position, isNewest = false, imagePath = null) {
    const group = new THREE.Group();

    const width = isNewest ? 3.5 : 2.8;
    const height = isNewest ? 2.0 : 0.8;
    const depth = 0.15;

    /*const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.1
    });

    const card = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    card.castShadow = true;
    card.receiveShadow = true;
    group.add(card);*/

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

    /*const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#000000';
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
    group.add(textMesh);*/
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

    Object.keys(categories).forEach(key => {
        const group = scene.getObjectByName(key);
        if (key === categoryName) {
            group.userData.targetPos = new THREE.Vector3(0, 0, 5); 
            group.userData.targetScale = 1.2;
            
            expandToTidyPile(group);
        } else {
            group.userData.targetPos = new THREE.Vector3(group.position.x * 0.5, 10, -15);
            group.userData.targetScale = 0.4;
        }
    });
}

function expandToTidyPile(group) {
    const cards = group.children.filter(child => child.userData.type === 'productIcon');
    cards.forEach((card, i) => {
        // Zielposition im Stapel (Tidy Pile)
        const stackY = (i * -1.2) + 2; // Übereinander stapeln
        card.userData.targetPos = new THREE.Vector3(0, stackY, 2);
        card.userData.targetRotation = new THREE.Euler(0, 0, 0);
    });
    
    // Die Soap Bubble selbst wird in diesem Modus meist unsichtbar oder sehr groß/blass
    const bubble = group.children.find(c => c.geometry instanceof RoundedBoxGeometry);
    if(bubble) bubble.userData.targetScale = 2.0; 
}

function transitionToOverview() {
    currentView = 'overview';
    activeCategory = null;
    buildWorld(); 
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
    
    checkHover();
    renderer.render(scene, camera);

    function expandToTidyPile(group) {
    const cards = group.children.filter(child => child.userData.type === 'productIcon');
    cards.forEach((card, i) => {
        // Zielposition im Stapel (Tidy Pile)
        const stackY = (i * -1.2) + 2; // Übereinander stapeln
        card.userData.targetPos = new THREE.Vector3(0, stackY, 2);
        card.userData.targetRotation = new THREE.Euler(0, 0, 0);
    });
    
    const bubble = group.children.find(c => c.geometry instanceof RoundedBoxGeometry);
    if(bubble) bubble.userData.targetScale = 2.0; 
}
}

// Start
init();