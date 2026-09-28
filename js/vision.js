/**
 * Maarif3D - Görüntü İşleme & El Takip Modülü (MediaPipe Hands + Fallback)
 * 3-4. Sınıf Çocukları için Ultra Hassas, Kolay Yakalama ve Sıfır Gecikmeli El Takibi
 */
class VisionController {
  constructor() {
    this.videoElement = document.getElementById('webcam-video');
    this.overlayCanvas = document.getElementById('camera-overlay');
    this.overlayCtx = this.overlayCanvas ? this.overlayCanvas.getContext('2d') : null;
    this.statusDot = document.querySelector('.status-dot');
    this.statusText = document.getElementById('cam-status-text');
    this.gestureHud = document.getElementById('gesture-hud');
    this.gestureStateIcon = document.getElementById('gesture-state-icon');
    this.gestureStateText = document.getElementById('gesture-state-text');

    // Takip Durumu
    this.handState = {
      detected: false,
      x: 0, // NDC X [-1 .. 1]
      y: 0, // NDC Y [-1 .. 1]
      rawX: 0.5,
      rawY: 0.5,
      isPinching: false,
      isGrabbing: false, // Hem pinch hem yumruk hem tıklama ile tutma desteği
      pinchDistance: 1.0,
      gesture: 'none',
      fingerCount: 0,
      mode: 'camera'
    };

    this.smoothX = 0;
    this.smoothY = 0;
    this.lerpFactor = 0.45; // Hızlı ve akıcı takip

    this.hands = null;
    this.camera = null;
    this.isCameraActive = false;

    this.initFallbackMouseEvents();
  }

  async initCamera() {
    this.updateStatus('Kamera başlatılıyor...', 'pending');

    try {
      if (!window.Hands || !window.Camera) {
        console.warn('MediaPipe Hands CDN beklemede, fare moduna geçiliyor.');
        this.fallbackToMouse('Fare / Dokunmatik Aktif');
        return;
      }

      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.hands.onResults(this.onHandsResult.bind(this));

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.isCameraActive && this.hands) {
            await this.hands.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
      this.isCameraActive = true;
      this.handState.mode = 'camera';
      this.updateStatus('Kamera Aktif! ✋', 'active');
      this.setGestureIndicator('fa-hand', 'Kameraya Elini Göster!', '#51cf66');

    } catch (err) {
      console.warn('Kamera açılamadı:', err);
      this.fallbackToMouse('Fare / Dokunmatik Aktif');
    }
  }

  onHandsResult(results) {
    if (!this.overlayCtx) return;

    this.overlayCanvas.width = this.videoElement.videoWidth || 320;
    this.overlayCanvas.height = this.videoElement.videoHeight || 240;
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      this.handState.detected = true;

      // 1. İşaret Parmağı (Landmark 8) ve Başparmak (Landmark 4)
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];
      const middleTip = landmarks[12];
      const palmCenter = landmarks[9]; // Avuç içi merkezi

      // Ayna görüntüsü: x koordinatını ters çevir
      const rawX = 1.0 - indexTip.x;
      const rawY = indexTip.y;

      // Three.js NDC koordinatlarına çevir: [-1 .. 1]
      const targetX = (rawX - 0.5) * 2.2;
      const targetY = -(rawY - 0.5) * 2.2;

      // Akıcı yumuşatma
      this.smoothX += (targetX - this.smoothX) * this.lerpFactor;
      this.smoothY += (targetY - this.smoothY) * this.lerpFactor;

      this.handState.x = Math.max(-1.1, Math.min(1.1, this.smoothX));
      this.handState.y = Math.max(-1.1, Math.min(1.1, this.smoothY));
      this.handState.rawX = rawX;
      this.handState.rawY = rawY;

      // 2. Kolaylaştırılmış Yakalama (Pinch & Tutma Tespiti)
      const dx = (1.0 - indexTip.x) - (1.0 - thumbTip.x);
      const dy = indexTip.y - thumbTip.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.handState.pinchDistance = dist;

      // Parmak sayımı
      this.handState.fingerCount = this.countFingers(landmarks);

      // Çocuklar için toleranslı eşik: mesafe < 0.14 veya kapalı el (fist)
      const wasGrabbing = this.handState.isGrabbing;
      const isPinchGesture = dist < 0.14;
      const isFistGesture = this.handState.fingerCount <= 1;

      this.handState.isPinching = isPinchGesture;
      this.handState.isGrabbing = isPinchGesture || isFistGesture;

      if (this.handState.isGrabbing) {
        this.handState.gesture = 'pinch';
        this.setGestureIndicator('fa-hand-holding', 'TUTTUN! ✊', '#ffd43b');
      } else {
        this.handState.gesture = 'open';
        this.setGestureIndicator('fa-hand', 'AÇIK EL ✋', '#4dabf7');
      }

      // Önizleme üzerine iskelet çiz
      this.drawLandmarkOverlay(landmarks);

    } else {
      this.handState.detected = false;
      this.setGestureIndicator('fa-hand-sparkles', 'Elini Kameraya Göster', '#e2e8f0');
    }
  }

  countFingers(landmarks) {
    let count = 0;
    if (landmarks[8].y < landmarks[6].y) count++;
    if (landmarks[12].y < landmarks[10].y) count++;
    if (landmarks[16].y < landmarks[14].y) count++;
    if (landmarks[20].y < landmarks[18].y) count++;
    return count;
  }

  drawLandmarkOverlay(landmarks) {
    const w = this.overlayCanvas.width;
    const h = this.overlayCanvas.height;

    this.overlayCtx.fillStyle = this.handState.isGrabbing ? '#ffd43b' : '#51cf66';
    this.overlayCtx.strokeStyle = '#ffffff';
    this.overlayCtx.lineWidth = 2;

    [4, 8, 12, 16, 20, 0].forEach(idx => {
      const lm = landmarks[idx];
      this.overlayCtx.beginPath();
      this.overlayCtx.arc((1.0 - lm.x) * w, lm.y * h, 5, 0, 2 * Math.PI);
      this.overlayCtx.fill();
      this.overlayCtx.stroke();
    });
  }

  fallbackToMouse(reason) {
    this.handState.mode = 'mouse';
    this.isCameraActive = false;
    this.updateStatus(reason || 'Fare Modu Aktif 🖱️', 'active');
    this.setGestureIndicator('fa-arrow-pointer', 'Fare / Dokunmatik Aktif', '#4dabf7');
  }

  initFallbackMouseEvents() {
    window.addEventListener('mousemove', (e) => {
      if (this.handState.mode === 'mouse' || !this.handState.detected) {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.handState.x = x;
        this.handState.y = y;
        this.handState.detected = true;
      }
    });

    window.addEventListener('mousedown', () => {
      this.handState.isPinching = true;
      this.handState.isGrabbing = true;
      this.handState.gesture = 'pinch';
      this.setGestureIndicator('fa-hand-holding', 'TUTTUN! ✊', '#ffd43b');
    });

    window.addEventListener('mouseup', () => {
      this.handState.isPinching = false;
      this.handState.isGrabbing = false;
      this.handState.gesture = 'open';
      this.setGestureIndicator('fa-hand', 'AÇIK EL ✋', '#4dabf7');
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const x = (touch.clientX / window.innerWidth) * 2 - 1;
        const y = -(touch.clientY / window.innerHeight) * 2 + 1;
        this.handState.x = x;
        this.handState.y = y;
        this.handState.detected = true;
        this.handState.isPinching = true;
        this.handState.isGrabbing = true;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.handState.isPinching = false;
      this.handState.isGrabbing = false;
    });
  }

  setGestureIndicator(iconClass, text, color) {
    if (this.gestureStateIcon) {
      this.gestureStateIcon.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
      if (color) this.gestureStateIcon.style.color = color;
    }
    if (this.gestureStateText) {
      this.gestureStateText.innerText = text;
    }
  }

  updateStatus(text, state) {
    if (this.statusText) this.statusText.innerText = text;
    if (this.statusDot) {
      this.statusDot.className = `status-dot ${state || ''}`;
    }
  }
}

window.visionController = new VisionController();
