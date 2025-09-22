const video = document.createElement('video');
let frameInterval = 200 // milliseconds
video.autoplay = true;
video.playsInline = true;


const cameraCanvas = document.getElementById('cameraCanvas');
const ctx = cameraCanvas.getContext('2d');

video.addEventListener("loadedmetadata", () => {
  cameraCanvas.width = video.videoWidth;
  cameraCanvas.height = video.videoHeight;

  const targetFPS = 5; // e.g. 10 fps
  frameInterval = 1000 / targetFPS;

  let lastTime = 0;

  function drawFrame(now) {
    if (now - lastTime >= frameInterval) {
      ctx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height);
      lastTime = now;
    }
    requestAnimationFrame(drawFrame);
  }

  requestAnimationFrame(drawFrame);
});


async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            frameRate: { ideal: 10, max: 10 }
        });
        video.srcObject = stream;

        video.addEventListener("loadedmetadata", () => {
            cameraCanvas.width = video.videoWidth;
            cameraCanvas.height = video.videoHeight;
        });
    } catch (err) {
        console.error("Camera error:", err);
    }
}

const overlay = document.getElementById('overlay');

// Image upload
document.getElementById('imageUpload').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
            console.log('ev.target', ev.target);
            console.log('screen.availWidth', screen.availWidth);
            overlay.src = ev.target.result;

            overlay.style.transform = "translate(0px, 0px) scale(1) rotate(0deg)";
            console.log('overlay.scrollWidth', overlay.scrollWidth);
        };
        reader.readAsDataURL(file);
    }
});

overlay.addEventListener("load", () => {
    const imgW = overlay.naturalWidth;
    const imgH = overlay.naturalHeight;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // Compute scaling factor to fit screen (cover mode: min, contain mode: min)
    const scaleFactor = Math.min(screenW / imgW, screenH / imgH) * 0.85;

    // Reset transform state
    scale = scaleFactor;
    rotation = 0;
    translateX = (screenW - imgW) / 2;
    translateY = (screenH - imgH) / 2;
    updateControlUI()

    updateTransform();

    console.log(`Image loaded at ${imgW}x${imgH}, scaled to ${scaleFactor}`);
});

// Transparency
document.getElementById('opacitySlider').addEventListener('input', e => {
    overlay.style.opacity = e.target.value / 100;
});

// --- Drag + Pinch Zoom + Rotate ---
let pointers = new Map();

let startDistance = 0;
let startAngle = 0;
let startScale = 1;
let startRotation = 0;

let scale = 1;
let rotation = 0;

let startX = 0, startY = 0;
let translateX = 0, translateY = 0;
let initialX = 0, initialY = 0;

// non-pointer capable display
document.getElementById('zoomSlider').addEventListener('input', e => {
    scale = e.target.value;
    updateTransform()
});
// non-pointer capable display
document.getElementById('rotateSlider').addEventListener('input', e => {
    rotation = e.target.value
    updateTransform()
});
document.getElementById('frameIntervalSlider').addEventListener('input', e => {
    frameInterval = 1000 / e.target.value
});


function updateControlUI() {
    document.getElementById('zoomSlider').value = scale;
    // document.getElementById('rotateSlider').value = rotation;
}


function getDistance(p1, p2) {
    return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
}

function getAngle(p1, p2) {
    return Math.atan2(p2.clientY - p1.clientY, p2.clientX - p1.clientX) * 180 / Math.PI;
}

function updateTransform() {
    overlay.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotation}deg)`;
}

overlay.addEventListener("pointerdown", pDown);
function pDown(e) {
    overlay.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, e);
    if (pointers.size === 1) {
        startX = e.clientX;
        startY = e.clientY;
        initialX = translateX;
        initialY = translateY;
    } else if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        startDistance = getDistance(p1, p2);
        startAngle = getAngle(p1, p2);
        startScale = scale;
        startRotation = rotation;
    }
}

overlay.addEventListener("pointermove", pMove);
function pMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, e);

    if (pointers.size === 1) {
        // Drag
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        translateX = initialX + dx;
        translateY = initialY + dy;
    } else if (pointers.size === 2) {
        // Pinch + Rotate
        const [p1, p2] = [...pointers.values()];
        const newDist = getDistance(p1, p2);
        const newAngle = getAngle(p1, p2);

        scale = startScale * (newDist / startDistance);
        rotation = startRotation + (newAngle - startAngle);
    }
    updateTransform();
};

overlay.addEventListener("pointerup", e => {
    pointers.delete(e.pointerId);
});
overlay.addEventListener("pointercancel", e => {
    pointers.delete(e.pointerId);
});

startCamera();
if (navigator.maxTouchPoints > 1) {
    document.getElementById('zoomSlider').display = 'block';
    document.getElementById('rotateSlider').display = 'block';
    // browser supports multi-touch
}
