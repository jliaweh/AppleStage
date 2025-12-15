import * as THREE from "https://esm.sh/three@0.164.0";
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
