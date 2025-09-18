async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      document.getElementById('camera').srcObject = stream;
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
        overlay.src = ev.target.result;
        overlay.style.transform = "translate(0px, 0px) scale(1) rotate(0deg)";
      };
      reader.readAsDataURL(file);
    }
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

  function getDistance(p1, p2) {
    return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
  }

  function getAngle(p1, p2) {
    return Math.atan2(p2.clientY - p1.clientY, p2.clientX - p1.clientX) * 180 / Math.PI;
  }

  function updateTransform() {
    overlay.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotation}deg)`;
  }

  overlay.addEventListener("pointerdown", e => {
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
  });

  overlay.addEventListener("pointermove", e => {
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
  });

  overlay.addEventListener("pointerup", e => {
    pointers.delete(e.pointerId);
  });

  overlay.addEventListener("pointercancel", e => {
    pointers.delete(e.pointerId);
  });

  startCamera();
