import * as THREE from "https://esm.sh/three@0.164.0";
import { OrbitControls } from "https://esm.sh/three@0.164.0/examples/jsm/controls/OrbitControls.js";

// ========================================
// PRODUKTDATEN
// ========================================
const categories = {
    'Mac': {
        color: 0x2e67f2,
        products: [
            { name: 'MacBook Pro', img: './assets/macbookPro.png', importance: 1.0 }, // Flaggschiff
            { name: 'MacBook Air', img: './assets/macbookAir.png', importance: 0.8 },
            { name: 'iMac', img: './assets/iMac.png', importance: 0.6 },
            { name: 'MacMini', img: './assets/macMini.png', importance: 0.4 }
        ]
    },
    'iPhone': {
        color: 0x2e67f2,
        products: [
            { name: 'iPhone 17 Pro', img: './assets/iphone17pro.png', importance: 1.0 }, // Flaggschiff
            { name: 'iPhone 17', img: './assets/iphone17.png', importance: 0.8 },
            { name: 'iPhone 16', img: './assets/iphone16.png', importance: 0.6 },
            { name: 'iPhone Air', img: './assets/iphoneAir.png', importance: 0.4 }
        ]
    },

    'iPad': {
        color: 0x2e67f2,
        products: [
            { name: 'iPad Pro', img: './assets/ipadPro.jpg', importance: 1.0 },
            { name: 'iPad Air', img: './assets/ipadAir.jpg', importance: 0.8 }, // Flaggschiff
            { name: 'iPad', img: './assets/iPad.png', importance: 0.6 },
            { name: 'iPad Mini', img: './assets/ipadMini.jpg', importance: 0.4 }
        ]
    },

    'AirPods': {
        color: 0x2e67f2,
        products: [
            { name: 'AirPods Pro', img: './assets/airpodsPro.png', importance: 1.0 }, // Flaggschiff
            { name: 'AirPods Max', img: './assets/airpodsMax.png', importance: 0.8 },
            { name: 'AirPods 4', img: './assets/airpods4.png', importance: 0.6 },
        ]
    },
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
let stackState = 'bubble';

function selectCategory(categoryName) {
    activeCategory = categoryName;
    const categoryKeys = Object.keys(categories);
    const inactiveBubbles = categoryKeys.filter(key => key !== categoryName);

    Object.keys(categories).forEach((key) => {
        const group = scene.getObjectByName(key);
        if (!group) return;

        const isSelected = key === categoryName;
        const bubble = group.userData.bubble;

        if (isSelected) {
            // --- AKTIVE KATEGORIE ---
            group.userData.targetPos.set(0, -2, 2); // Zentraler Fokus
            group.userData.targetScale = 1.0;
            
            // Die Bubble "auflösen": Wir setzen die Target-Opacity auf 0
            if (bubble) {
                bubble.userData.targetOpacity = 0;
                // Optional: Ein kurzer Scale-Up Effekt beim "Platzen"
                bubble.userData.targetScale = 1.5; 
            }

            // --- STAPEL-LOGIK (Tidy Pile) ---
            /*const cards = group.children.filter(c => c.userData.type === 'productIcon');
            cards.forEach((card, index) => {
                // Stapel-Anordnung ohne Bubble-Zwang
                card.userData.targetPos.set(0, index * -0.1, index * -0.2); // Leichte Tiefenstaffelung
                card.userData.targetScale = 1.4; // Karten werden im Fokus groß
                
                // Rotation für den "Tidy Pile" Look aus deiner Skizze
                // Nur die hinteren Karten sind leicht gedreht
                card.userData.targetRotation = index === 0 ? 0 : (Math.random() - 0.5) * 0.15;
                
                // Transparenz-Effekt aus der Skizze (oberstes Produkt voll, Rest leicht transparent)
                card.userData.targetOpacity = index === 0 ? 1.0 : 0.4;
            });*/
            expandToCardGrid(group);

        } else {
            const index = inactiveBubbles.indexOf(key);
                const totalInactive = inactiveBubbles.length;
                
                // Positionierung oben in einer Reihe
                const xPos = (index - (totalInactive - 1) / 2) * 4.5; 
                group.userData.targetPos.set(xPos, 4, -4); 
                group.userData.targetScale = 0.35; // Schön klein als Icon
                group.userData.targetOpacity = 0.5; // Leicht transparent

                // Landmark-Logik: Nur das erste Produkt bleibt sichtbar
                const cards = group.children.filter(c => c.userData.type === 'productIcon');
                cards.forEach((card, cardIndex) => {
                    if (cardIndex === 0) {
                        // Das Landmark-Produkt (z.B. iPhone 17 Pro)
                        card.userData.targetPos.set(0, 0, 0); // Mittig in der kleinen Bubble
                        card.userData.targetScale = 1.0;     // Relativ zur kleinen Bubble normal groß
                        card.userData.targetOpacity = 1.0;   // Voll sichtbar
                        card.userData.targetRotation = 0;    // Keine Drehung
                    } else {
                        // Alle anderen Produkte in dieser Bubble werden unsichtbar
                        card.userData.targetPos.set(0, 0, -2); // Nach hinten schieben
                        card.userData.targetScale = 0.1;      // Ganz klein machen
                        card.userData.targetOpacity = 0.0;    // Komplett ausfaden
                    }
                });

                // Label unter der kleinen Bubble evtl. auch kleiner machen
                if (group.userData.labelMesh) {
                    group.userData.labelMesh.scale.set(0.5, 0.5, 0.5);
                }

                if (bubble) {
                bubble.userData.targetOpacity = 0.3; // Inaktive Bubbles bleiben sichtbar
                bubble.userData.targetScale = 0.4;
            }
            }
    });
}
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
// PRODUCT CARD ERSTELLEN
// ========================================
function createProductCard(imageUrl, scaleFactor = 1, category = '', productName = '') {
    const group = new THREE.Group();
    const isLandscape = (category === 'Mac');
    const cardW = isLandscape ? 4.4 : 3.4;
    const cardH = isLandscape ? 3.4 : 5.2;

    // --- CARD HINTERGRUND (startet unsichtbar!) ---
    const cardGeo = new THREE.BoxGeometry(cardW, cardH, 0.08);
    const cardMat = new THREE.MeshStandardMaterial({
        color: 0x1c1c1e,
        roughness: 0.3,
        metalness: 0.4,
        transparent: true,
        opacity: 0  // Startet komplett unsichtbar
    });
    const cardBack = new THREE.Mesh(cardGeo, cardMat);
    cardBack.position.z = -0.05;
    cardBack.userData.isCardBackground = true; // Marker zum Finden
    group.add(cardBack);

    // --- BORDER CANVAS ---
    const borderGeo = new THREE.PlaneGeometry(cardW, cardH);
    const borderCanvas = document.createElement('canvas');
    borderCanvas.width = 512;
    borderCanvas.height = isLandscape ? 394 : 645;
    const bCtx = borderCanvas.getContext('2d');
    const bW = borderCanvas.width;
    const bH = borderCanvas.height;
    const bR = 24;

    bCtx.clearRect(0, 0, bW, bH);
    bCtx.beginPath();
    bCtx.roundRect(2, 2, bW - 4, bH - 4, bR);
    bCtx.strokeStyle = 'rgba(255,255,255,0.18)';
    bCtx.lineWidth = 3;
    bCtx.stroke();

    const borderTex = new THREE.CanvasTexture(borderCanvas);
    const borderMat = new THREE.MeshBasicMaterial({
        map: borderTex,
        transparent: true,
        opacity: 0, // Startet auch unsichtbar
        depthWrite: false
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.z = 0.01;
    border.userData.isCardBorder = true; // Marker
    group.add(border);

        // --- TITEL LABEL (oben auf der Card) ---
    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = 512;
    titleCanvas.height = 80;
    const tCtx = titleCanvas.getContext('2d');

    tCtx.clearRect(0, 0, 512, 80);
    tCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    tCtx.font = '600 36px -apple-system, SF Pro Display, sans-serif';
    tCtx.textAlign = 'center';
    tCtx.fillText(productName, 256, 52);

    const titleTex = new THREE.CanvasTexture(titleCanvas);
    const titleMat = new THREE.MeshBasicMaterial({
        map: titleTex,
        transparent: true,
        opacity: 0,          // Startet unsichtbar
        depthWrite: false
    });

    // Breite der Card, etwas schmaler als die Card selbst
    const titleMesh = new THREE.Mesh(new THREE.PlaneGeometry(cardW - 0.4, 0.6), titleMat);
    
    // Oben auf der Card positionieren
    titleMesh.position.set(0, cardH / 2 - 0.3, 0.1);
    titleMesh.userData.isCardTitle = true; // Marker
    group.add(titleMesh);

    // --- PRODUKT BILD ---
    const imgW = isLandscape ? 3.6 : 2.6;
    const imgH = isLandscape ? 2.6 : 3.6;
    const imgGeo = new THREE.PlaneGeometry(imgW, imgH);
    const imgMat = new THREE.MeshStandardMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.1,
        alphaTest: 0.01,
        depthWrite: false
    });

    new THREE.TextureLoader().load(imageUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        imgMat.map = texture;
        imgMat.needsUpdate = true;
    });

    const imgMesh = new THREE.Mesh(imgGeo, imgMat);
    imgMesh.position.z = 0.06;
    group.add(imgMesh);

    group.scale.set(scaleFactor, scaleFactor, scaleFactor);
    return group;
}


// ========================================
// CARD BACKGROUNDS EIN- UND AUSBLENDEN
// ========================================
function showCardBackgrounds(group, visible) {
    group.children.forEach(card => {
        if (card.userData.type !== 'productIcon') return;

        card.traverse(child => {
            if (child.userData.isCardBackground) {
                child.userData.targetOpacity = visible ? 0.92 : 0;
            }
            if (child.userData.isCardBorder) {
                child.userData.targetOpacity = visible ? 1.0 : 0;
            }
            if (child.userData.isCardTitle) {
                child.userData.targetOpacity = 0;
            }
        });
    });
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
        side: THREE.DoubleSide,
        depthWrite: false,
        alphaTest: 0.05
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

    // 2. PRODUCT CARDS (Floating in der Bubble mit Hierarchie)
    const productCards = [];
    
    // Wir nutzen jetzt das neue Array von Objekten aus deiner Datenstruktur
    data.products.forEach((productObj, i) => {
        const isLead = (i === 0); // Das erste Produkt im Array ist unser Flaggschiff
        
        // Winkel für die Verteilung der anderen Produkte
        const angle = (i / data.products.length) * Math.PI * 2;
        const radiusX = 2.0;
        const radiusY = 2.3;
        
        // POSITIONS-LOGIK:
        let x, y, z;
        if (isLead) {
            // Flaggschiff: Zentral und weiter vorne
            x = 0;
            y = 0;
            z = 1.2; 
        } else {
            // Andere Produkte: Verteilt im Hintergrund
            x = Math.cos(angle) * radiusX;
            y = Math.sin(angle) * radiusY - 0.5;
            z = -1.0 - (i * 0.4); // Tiefenstaffelung nach hinten
        }

        // Erstelle die Karte (isLead bekommt größeren Scale-Faktor)
        const scale = isLead ? 1.2 : 0.75;
        // Wir übergeben jetzt productObj.img statt nur dem Namen
        const miniCard = createProductCard(productObj.img, scale, categoryName, productObj.name);
        
        miniCard.userData.type = 'productIcon';
        miniCard.userData.targetPos = new THREE.Vector3(x, y, z);
        miniCard.userData.category = categoryName;
        miniCard.userData.index = i;
        miniCard.userData.bubbleAngle = angle;
        // Für das Schweben in der animate-Schleife
        miniCard.userData.floatOffset = Math.random() * Math.PI * 2; 

        columnGroup.add(miniCard);

        // Direkt nach columnGroup.add(miniCard):
        miniCard.traverse(child => {
            if (child.userData.isCardBackground || child.userData.isCardBorder || child.userData.isCardTitle) {
                if (child.material) {
                    child.material.opacity = 0;
                    child.userData.targetOpacity = 0;
                }
            }
        });
        
        interactableObjects.push(miniCard);
        productCards.push(miniCard);
    });

    // 3. SOAP BUBBLE - DYNAMISCH UM PRODUCT ICONS (Bleibt wie bei dir)
    const bubble = createDynamicSoapBubble(categoryColor, categoryName);
    columnGroup.add(bubble);
    columnGroup.userData.bubble = bubble;
    
    updateBubbleToFitContent(bubble, productCards, 1.2);

    // 4. HALO (Bleibt wie bei dir)
    const halo = createHalo(3.5, categoryColor);
    halo.position.set(0, -8.5, 0);
    columnGroup.add(halo);
    columnGroup.userData.halo = halo;

    // 5. CATEGORY LABEL (Bleibt wie bei dir)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 256;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '600 100px Roboto';
    ctx.textAlign = 'center';
    ctx.fillText(categoryName.toUpperCase(), 512, 140);

    const labelTex = new THREE.CanvasTexture(canvas);
    labelTex.premultiplyAlpha = false;
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
    const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), labelMat);
    labelMesh.position.set(0, -8.5, 0);
    columnGroup.add(labelMesh);

    // 6. DROP SHADOW (Bleibt wie bei dir)
    const shadowGeo = new THREE.CircleGeometry(3.5, 32);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 });
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
    globalHero.position.set(0, 15, 5); // Zentriert im Hintergrund
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

        card.userData.targetPos = new THREE.Vector3(xOffset, yOffset - 1, 4 + zOffset);
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

function expandToCardGrid(group) {
    const cards = group.children.filter(child => child.userData.type === 'productIcon');
    const bubble = group.userData.bubble;

    if (bubble) {
        bubble.userData.targetOpacity = 0;
        bubble.userData.targetScale = 0.1;
    }

    // Card Backgrounds einblenden
    showCardBackgrounds(group, true);

    cards.forEach((card, i) => {
        const xOffset = i * 0.30;   // Subtiler horizontaler Versatz
        const yOffset = -i * 0.3;  // Minimalster vertikaler Versatz
        const zOffset = -i * 0.08;  // Tiefenstaffelung

        card.userData.targetPos = new THREE.Vector3(xOffset, yOffset - 1, 3 + zOffset);
        card.userData.targetScale = 1.4;
        card.userData.targetRotation = 0;
        card.userData.targetOpacity = 1.0;
        card.renderOrder = -i;
    });
}

function expandToJuxtaposition(group) {
    const cards = group.children.filter(child => child.userData.type === 'productIcon');
    const bubble = group.userData.bubble;

    if (bubble) {
        bubble.userData.targetOpacity = 0;
        bubble.userData.targetScale = 0.1;
    }

    showCardBackgrounds(group, true);

    cards.forEach((card, i) => {
        const xOffset = i * 3;   // Viel mehr horizontaler Versatz → nebeneinander
        const yOffset = -i * 0.2; // Kaum vertikaler Versatz
        const zOffset = -i * 0.05; // Minimale Tiefenstaffelung

        card.userData.targetPos = new THREE.Vector3(xOffset, yOffset - 1, 3 + zOffset);
        card.userData.targetScale = 1.4;
        card.userData.targetRotation = 0;
        card.userData.targetOpacity = 1.0;
        card.renderOrder = -i;

        card.traverse(child => {
            if (child.userData.isCardTitle) {
                child.userData.targetOpacity = 1.0;
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
        showCardBackgrounds(group, false);
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
    const radius = 55; 
    const height = 15;
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

window.addEventListener('click', (event) => {
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactableObjects, true);

    if (intersects.length > 0) {
        let clickedObj = intersects[0].object;
        while (clickedObj.parent && !clickedObj.userData.category) {
            clickedObj = clickedObj.parent;
        }

        if (clickedObj.userData.category) {
            const clickedCategory = clickedObj.userData.category;
            const group = scene.getObjectByName(clickedCategory);

            if (clickedCategory !== activeCategory) {
                // Neue Kategorie angeklickt → Pile
                selectCategory(clickedCategory);
                stackState = 'pile';
            } else {
                // Gleiche Kategorie nochmal geklickt → State weiterschalten
                if (stackState === 'pile') {
                    expandToJuxtaposition(group);
                    stackState = 'juxtaposition';
                } else if (stackState === 'juxtaposition') {
                    // Zurück zur Bubble Übersicht
                    transitionToOverview();
                    stackState = 'bubble';
                }
            }
        }
    }
});


// ========================================
// INIT
// ========================================
async function init() {
    await new FontFace('Roboto', 'url(https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxK.woff2)').load().then(font => {
    document.fonts.add(font);
    });
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

    if (controls) controls.update();

    // Update all category groups
    Object.keys(categories).forEach(key => {
        const group = scene.getObjectByName(key);
        if (!group || !group.userData.targetPos) return;

        const posLerpFactor = 0.08; // Etwas weicher für das Haupt-Movement

        // 1. Group Position & Scale
        group.position.lerp(group.userData.targetPos, posLerpFactor);
        
        const targetScale = group.userData.targetScale || 1;
        const s = THREE.MathUtils.lerp(group.scale.x, targetScale, posLerpFactor);
        group.scale.set(s, s, s);

        // 2. Group Opacity (für das Ausfaden der inaktiven Bubbles)
        if (group.userData.targetOpacity !== undefined) {
            group.traverse(child => {
                if (child.material && child.material.transparent) {
                    // Card-Backgrounds, Borders und Titel haben eigene Opacity-Logik
                    if (
                        child.userData.isCardBackground ||
                        child.userData.isCardBorder ||
                        child.userData.isCardTitle
                    ) return; // Überspringen!

                    child.material.opacity = THREE.MathUtils.lerp(
                        child.material.opacity,
                        group.userData.targetOpacity,
                        0.1
                    );
                }
            });
        }
        const bubble = group.userData.bubble;
        if (bubble && bubble.userData.targetOpacity !== undefined) {
            // Sanftes Ausfaden (0 bei Aktivierung, 0.3-0.5 bei Navigation)
            bubble.material.opacity = THREE.MathUtils.lerp(
                bubble.material.opacity, 
                bubble.userData.targetOpacity, 
                0.1
            );
            
            // Verhindert Rendering, wenn unsichtbar
            bubble.visible = bubble.material.opacity > 0.01;

            // Optionaler "Platzeffekt" durch Skalierung
            if (bubble.userData.targetScale !== undefined) {
                const bs = THREE.MathUtils.lerp(bubble.scale.x, bubble.userData.targetScale, 0.1);
                bubble.scale.set(bs, bs, bs);
            }
        }

        // 3. Children (Product Cards) Animation
        group.children.forEach(child => {
            // Position lerpen (wichtig für den Stapel-Effekt)
            if (child.userData.targetPos) {
                child.position.lerp(child.userData.targetPos, 0.1);
            }

            // NEU: Rotation lerpen (für den "Tidy Pile" Look)
            if (child.userData.targetRotation !== undefined) {
                // Wir nutzen lerp für den Z-Winkel
                child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, child.userData.targetRotation, 0.1);
            }

            // Scale & Opacity lerpen
            if (child.userData.targetScale !== undefined) {
                const cs = THREE.MathUtils.lerp(child.scale.x, child.userData.targetScale, 0.1);
                child.scale.set(cs, cs, cs);
            }
            
            // Falls Karten einzeln ein/ausfaden sollen (z.B. beim Stapeln)
            if (child.userData.targetOpacity !== undefined) {
                child.traverse(c => {
                    if (c.material && c.material.transparent) {
                        c.material.opacity = THREE.MathUtils.lerp(c.material.opacity, child.userData.targetOpacity, 0.1);
                    }
                });
            }
            child.traverse(subChild => {
                if (subChild.userData.targetOpacity !== undefined && subChild.material) {
                    subChild.material.opacity = THREE.MathUtils.lerp(
                        subChild.material.opacity,
                        subChild.userData.targetOpacity,
                        0.02
                    );
                }
            });
        });
    });

    checkHover();
    updateHeroParallax();
    renderer.render(scene, camera);
}
// Start
init();