/**
 * 1. Sınıf: Renkler & Gökkuşağı Kristali (Görsel Sanatlar & Matematik)
 * Çocuklar 3D parlayan renk kristallerini tanır ve gökkuşağı köprüsünü tamamlar!
 */
class ColorsGame {
  constructor() {
    this.name = 'colors';
    this.title = '1. Sınıf: Renkler & Gökkuşağı Kristali';
    this.targetCount = 5;
    this.currentRound = 0;
    this.score = 0;
    this.crystals = [];
    this.currentTarget = null;
    this.isRunning = false;

    this.colorsCatalog = [
      { name: 'Kırmızı', color: 0xef4444, title: 'KIRMIZI' },
      { name: 'Mavi', color: 0x3b82f6, title: 'MAVİ' },
      { name: 'Sarı', color: 0xfacc15, title: 'SARI' },
      { name: 'Yeşil', color: 0x22c55e, title: 'YEŞİL' },
      { name: 'Turuncu', color: 0xf97316, title: 'TURUNCU' },
      { name: 'Mor', color: 0xa855f7, title: 'MOR' },
      { name: 'Pembe', color: 0xec4899, title: 'PEMBE' }
    ];
  }

  start() {
    this.currentRound = 0;
    this.score = 0;
    this.isRunning = true;

    window.scene3D.clearActiveGame();
    this.nextRound();
  }

  nextRound() {
    if (this.currentRound >= this.targetCount) {
      this.finishGame();
      return;
    }

    this.currentRound++;
    window.scene3D.clearActiveGame();
    this.crystals = [];

    const shuffled = [...this.colorsCatalog].sort(() => 0.5 - Math.random());
    const roundColors = shuffled.slice(0, 3);
    this.currentTarget = roundColors[Math.floor(Math.random() * roundColors.length)];

    window.app.updateTargetHUD(
      'fa-palette',
      `Soru (${this.currentRound}/${this.targetCount}): "${this.currentTarget.title}" Kristali Bul!`,
      `Işıldayan kristaller arasından "${this.currentTarget.name}" renkli olana elinle dokun!`
    );

    const spacing = 3.4;
    const startX = -((roundColors.length - 1) * spacing) / 2;

    roundColors.forEach((colorObj, idx) => {
      const crystal = this.createCrystalMesh(colorObj);
      const x = startX + idx * spacing;
      const y = 0.5;

      crystal.position.set(x, y, 0);
      crystal.userData.baseY = y;
      crystal.userData.colorData = colorObj;

      window.scene3D.activeGameGroup.add(crystal);
      this.crystals.push(crystal);
    });
  }

  createCrystalMesh(colorObj) {
    const group = new THREE.Group();

    // 3D Parlak Elmas / Oktahedron Kristal
    const crystalGeo = new THREE.OctahedronGeometry(0.75, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: colorObj.color,
      roughness: 0.1,
      metalness: 0.3,
      emissive: colorObj.color,
      emissiveIntensity: 0.4
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.scale.set(1, 1.4, 1);
    group.add(crystalMesh);

    // Işık
    const light = new THREE.PointLight(colorObj.color, 1.2, 3);
    group.add(light);

    // Etiket
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(colorObj.name, 128, 50);

    const tex = new THREE.CanvasTexture(canvas);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.55),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    label.position.y = -1.2;
    group.add(label);

    return group;
  }

  update(delta, elapsedTime) {
    if (!this.isRunning) return;

    const vision = window.visionController.handState;
    const cursorPos = window.scene3D.handCursor ? window.scene3D.handCursor.position : null;

    this.crystals.forEach((crystal) => {
      crystal.rotation.y += 1.0 * delta;
      crystal.rotation.z = Math.sin(elapsedTime * 2 + crystal.position.x) * 0.15;
      crystal.position.y = crystal.userData.baseY + Math.sin(elapsedTime * 2.5 + crystal.position.x) * 0.2;

      if (cursorPos && vision.detected) {
        const dist = crystal.position.distanceTo(cursorPos);
        if (dist < 1.8) {
          crystal.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.3);
          if (vision.isGrabbing || dist < 1.3) {
            this.handleCrystalSelect(crystal);
          }
        } else {
          crystal.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), 0.2);
        }
      }
    });
  }

  handleCrystalSelect(crystal) {
    if (!this.isRunning) return;

    if (crystal.userData.colorData.name === this.currentTarget.name) {
      this.score += 150;
      window.app.addScore(150);

      if (window.soundEngine) window.soundEngine.playSuccess();

      crystal.scale.setScalar(1.6);
      this.isRunning = false;

      window.app.updateTargetHUD(
        'fa-circle-check',
        'Harika! Doğru Renk! 🌈',
        `"${this.currentTarget.name}" rengini doğru bildin ve gökkuşağını parlattın!`
      );

      setTimeout(() => {
        this.isRunning = true;
        this.nextRound();
      }, 700);

    } else {
      if (window.soundEngine) window.soundEngine.playError();
      crystal.position.x += (Math.random() - 0.5) * 0.3;
    }
  }

  finishGame() {
    this.isRunning = false;
    setTimeout(() => {
      window.app.showVictoryModal(
        'Gökkuşağı Ressamı! 🎨',
        'Tüm renk kristallerini doğru bularak gökkuşağı köprüsünü ışıl ışıl tamamladın!',
        3,
        this.score
      );
    }, 500);
  }

  stop() {
    this.isRunning = false;
    this.crystals = [];
    window.scene3D.clearActiveGame();
  }
}

window.ColorsGame = ColorsGame;
