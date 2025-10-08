const video = document.createElement('video');
let frameInterval = 1000 // milliseconds
let flipVertically = false;
let flipHorizontally = false;
let invertColorC = true;
let markOverPaint = false;
// color from a color picker UI component
let selectedColor = { r: 1, g: 1, b: 1, a: 0.5 };
let opacityC = 1;
let opacityI = 1;
video.autoplay = true;
video.playsInline = true;


const displayCanvas = document.getElementById('displayCanvas');
const displayCtx = displayCanvas.getContext('2d');
const cameraCanvas = document.createElement("canvas");
const cameraCtx = cameraCanvas.getContext('2d');
const imageCanvas = document.createElement("canvas");
const imageCtx = imageCanvas.getContext('2d');

const cssW = window.innerWidth;
const cssH = window.innerHeight;
const dpr = window.devicePixelRatio || 1;

cameraCanvas.width = cssW * dpr;
cameraCanvas.height = cssH * dpr;
cameraCanvas.style.width = cssW + "px";
cameraCanvas.style.height = cssH + "px";
// console.log("cssW, cssH, dpr:::", cssW, cssH, dpr);

const overlay = document.getElementById('overlay');

video.addEventListener("loadedmetadata", () => {
    cameraCanvas.width = video.videoWidth;
    cameraCanvas.height = video.videoHeight;
    imageCanvas.width = video.videoWidth;
    imageCanvas.height = video.videoHeight;
    displayCanvas.width = video.videoWidth;
    displayCanvas.height = video.videoHeight;

    const targetFPS = 1; // e.g. 1 fps
    frameInterval = 1000 / targetFPS;

    let lastTime = 0;

    function drawFrame(now) {
        if (now - lastTime >= frameInterval) {
            if (flipVertically || flipHorizontally) {
                // flip vertically
                const xScale = flipHorizontally ? -1 : 1;
                const yScale = flipVertically ? -1 : 1;
                cameraCtx.save();
                cameraCtx.translate(flipHorizontally? cameraCanvas.width: 0, flipVertically? cameraCanvas.height: 0);
                cameraCtx.scale(xScale, yScale);
                cameraCtx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height);
                cameraCtx.restore();
            }
            else {
                cameraCtx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height)
            }
            mixImageAndCamera()
            lastTime = now;
        }
        requestAnimationFrame(drawFrame);
    }
    requestAnimationFrame(drawFrame);
});

const flip = (v) => 255 - v;
const subtract = (a, b, reverse = false) => reverse ? b - a : a - b;

function mixImageAndCamera() {
    const imageData = imageCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height)
    const cameraData = cameraCtx.getImageData(0, 0, cameraCanvas.width, cameraCanvas.height)
    const dataI = imageData.data;
    const dataC = cameraData.data;

    for (let i = 0; i < dataC.length; i += 4) {
        const nR = Math.floor(dataI[i]*opacityI)       + Math.floor((invertColorC? flip(dataC[i]): dataC[i])     * opacityC)
        const nG = Math.floor(dataI[i+1]*opacityI)     + Math.floor((invertColorC? flip(dataC[i+1]): dataC[i+1]) * opacityC)
        const nB = Math.floor(dataI[i+2]*opacityI)     + Math.floor((invertColorC? flip(dataC[i+2]): dataC[i+2]) * opacityC)
        
        dataC[i] =     markOverPaint && nR > 255? ((i/4)%4)*128: Math.min(255, nR);
        dataC[i + 1] = markOverPaint && nG > 255? ((i/4)%4)*128: Math.min(255, nG);
        dataC[i + 2] = markOverPaint && nB > 255? ((i/4)%4)*128: Math.min(255, nB);

        // preserve full opacity
        dataC[i + 3] = 255;
    }
    displayCtx.putImageData(cameraData, 0, 0);
}

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


// Image upload
document.getElementById('imageUpload').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
            // console.log('ev.target', ev.target);
            // console.log('screen.availWidth', screen.availWidth);
            overlay.src = ev.target.result;
            overlay.style.opacity = 0.01
            // overlay.style.transform = "translate(0px, 0px) scale(1) rotate(0deg)";
        };
        reader.readAsDataURL(file);
    }
});

overlay.addEventListener("load", () => {
    const imgW = overlay.naturalWidth;
    const imgH = overlay.naturalHeight;
    const ratio = Math.min(cameraCanvas.width/imgW, cameraCanvas.height/imgH);

    imageCtx.fillStyle = 'white'
    imageCtx.fillRect(0, 0, imageCanvas.width, imageCanvas.height)    // Compute scaling factor to fit screen (cover mode: min, contain mode: min)
    imageCtx.drawImage(overlay, Math.abs(imgW*ratio - imageCanvas.width)/2, Math.abs(imgH*ratio - imageCanvas.height)/2, imgW*ratio, imgH*ratio)    // Compute scaling factor to fit screen (cover mode: min, contain mode: min)

    // Compute scaling factor to fit screen (cover mode: min, contain mode: min)
    // const scaleFactor = Math.max(cssW / imgW, cssH / imgH);
    // console.log(`Image loaded, size ${imgW}x${imgH}, scaled to ${scaleFactor}`);
});

// Transparency (opacity) sliders
document.getElementById('opacityC').addEventListener('input', e => {
    opacityC = e.target.value / 100;
});
document.getElementById('opacityI').addEventListener('input', e => {
    opacityI = e.target.value / 100;
});

document.getElementById('frameIntervalSlider').addEventListener('input', e => {
    frameInterval = 1000 / e.target.value
});
document.getElementById('colorPicker').addEventListener('input', e => {
    const hex = e.target.value;
    selectedColor = {
        r: parseInt(hex.slice(1, 3), 16)/255,
        g: parseInt(hex.slice(3, 5), 16)/255,
        b: parseInt(hex.slice(5, 7), 16)/255,
        a: 0.5 // semi-transparent
    };
});

function getDistance(p1, p2) {
    return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
}

function getAngle(p1, p2) {
    return Math.atan2(p2.clientY - p1.clientY, p2.clientX - p1.clientX) * 180 / Math.PI;
}

document.getElementById('tipdown').addEventListener('click', e => {
    document.getElementById('controls').style.display = 'none'
    document.getElementById('tipup').style.display = 'block'
    overlay.style.opacity = 0.01 // keep a bit more than 0 opacity to track pointer events
})
document.getElementById('tipup').addEventListener('click', e => {
    document.getElementById('controls').style.display = 'flex'
    document.getElementById('tipup').style.display = 'none'
    // overlay.style.opacity = document.getElementById('opacitySlider').value / 100
})
document.getElementById('flipVideoVert').addEventListener('click', e => {
    flipVertically = !flipVertically
})
document.getElementById('flipVideoHori').addEventListener('click', e => {
    flipHorizontally = !flipHorizontally
})

document.getElementById('invertColorC').addEventListener('click', e => {
    invertColorC = !invertColorC
})
document.getElementById('markOverPaint').addEventListener('click', e => {
    markOverPaint = !markOverPaint
})

startCamera();
