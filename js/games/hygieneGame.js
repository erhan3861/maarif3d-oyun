/**
 * 1. Sınıf: Sağlıklı Tabak & Vitamin Avcısı (Hayat Bilgisi - Sağlıklı Yaşam)
 * Çocuklar sağlıklı besinleri (süt, elma, havuç, balık, yumurta) tabağa taşır!
 */
class HygieneGame {
  constructor() {
    this.name = 'hygiene';
    this.title = '1. Sınıf: Sağlıklı Tabak & Vitamin Avcısı';
    this.targetCount = 5;
    this.collectedCount = 0;
    this.score = 0;
    this.plate = null;
    this.items = [];
    this.grabbedItem = null;
    this.isRunning = false;

    this.foodsCatalog = [
      { name: 'Süt', healthy: true, color: 0x38bdf8 },
      { name: 'Elma', healthy: true, color: 0xef4444 },
      { name: 'Havuç', healthy: true, color: 0xf97316 },
      { name: 'Balık', healthy: true, color: 0x06b6d4 },
      { name: 'Yumurta', healthy: true, color: 0xfacc15 },
      { name: 'Gazoz', healthy: false, color: 0x64748b },
      { name: 'Cips', healthy: false, color: 0x78716c }
    ];
  }

  start() {
    this.collectedCount = 0;
    this.score = 0;
    this.items = [];
    this.grabbedItem = null;
    this.isRunning = true;

    window.scene3D.clearActiveGame();
    this.setupPlate();
    this.spawnFoods();

    window.app.updateTargetHUD(
      'fa-carrot',
      `Hedef (0/${this.targetCount}): Sağlıklı Besinleri Tabağa Doldur!`,
      'Süt, meyve ve sebzeleri elinle yakalayıp ortadaki tabağa koy!'
    );
  }

  setupPlate() {
    this.plate = new THREE.Group();

    // Tabak Tablası
    const plateGeo = new THREE.CylinderGeometry(2.2, 1.8, 0.3, 32);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.1,
      metalness: 0.1
    });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.position.y = -1.8;
    this.plate.add(plateMesh);

    // Tabak Kenar Şeridi
    const rimGeo = new THREE.TorusGeometry(2.2, 0.08, 8, 32);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -1.65;
    this.plate.add(rim);

    window.scene3D.activeGameGroup.add(this.plate);
  }

  spawnFoods() {
    const shuffled = [...this.foodsCatalog].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    const radius = 3.6;
    selected.forEach((food, idx) => {
      const angle = (idx / selected.length) * Math.PI * 2;
      const mesh = this.createFoodMesh(food);

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * 1.4 + 1.0;

      mesh.position.set(x, y, 0);
      mesh.userData.baseY = y;
      mesh.userData.angle = angle;

      window.scene3D.activeGameGroup.add(mesh);
      this.items.push(mesh);
    });
  }

  createFoodMesh(food) {
    const group = new THREE.Group();

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 18, 18),
      new THREE.MeshStandardMaterial({
        color: food.color,
        roughness: 0.25,
        emissive: food.color,
        emissiveIntensity: 0.2
      })
    );
    group.add(sphere);

    // Etiket
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(food.name, 128, 50);

    const tex = new THREE.CanvasTexture(canvas);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.5),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    label.position.z = 0.6;
    group.add(label);

    group.userData = { foodData: food };
    return group;
  }

  update(delta, elapsedTime) {
    if (!this.isRunning) return;

    const vision = window.visionController.handState;
    const cursorPos = window.scene3D.handCursor ? window.scene3D.handCursor.position : null;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      if (item === this.grabbedItem) {
        if (cursorPos) {
          item.position.lerp(new THREE.Vector3(cursorPos.x, cursorPos.y, 0), 0.5);
        }

        // Tabak kontrolü
        const distToPlate = item.position.distanceTo(new THREE.Vector3(0, -1.8, 0));
        if (distToPlate < 2.2) {
          this.handlePlateDrop(item, i);
          return;
        }

        if (!vision.isGrabbing) {
          this.grabbedItem = null;
        }

      } else {
        item.userData.angle += 0.3 * delta;
        item.position.y = item.userData.baseY + Math.sin(elapsedTime * 2 + item.userData.angle) * 0.2;

        if (cursorPos && vision.detected) {
          const dist = item.position.distanceTo(cursorPos);
          if ((vision.isGrabbing && dist < 2.0) || (dist < 1.2)) {
            if (!this.grabbedItem) {
              this.grabbedItem = item;
              if (window.soundEngine) window.soundEngine.playPop();
            }
          }
        }
      }
    }
  }

  handlePlateDrop(item, itemIndex) {
    this.grabbedItem = null;

    if (item.userData.foodData.healthy) {
      // Sağlıklı Besin!
      this.collectedCount++;
      this.score += 150;
      window.app.addScore(150);

      if (window.soundEngine) window.soundEngine.playSuccess();

      window.scene3D.activeGameGroup.remove(item);
      this.items.splice(itemIndex, 1);

      window.app.updateTargetHUD(
        'fa-circle-check',
        `Harika Bir Tercih! (${this.collectedCount}/${this.targetCount})`,
        `"${item.userData.foodData.name}" vücuduna güç ve sağlık kattı!`
      );

      if (this.collectedCount >= this.targetCount) {
        this.finishGame();
      }

    } else {
      // Sağlıksız Besin
      if (window.soundEngine) window.soundEngine.playError();
      item.position.y = 2.5;
      item.position.x = (Math.random() - 0.5) * 5;
    }
  }

  finishGame() {
    this.isRunning = false;
    setTimeout(() => {
      window.app.showVictoryModal(
        'Sağlıklı Yaşam Kahramanı! 🥗',
        'Tabağını en faydalı vitaminlerle doldurdun ve güçlü bir beden kazandın!',
        3,
        this.score
      );
    }, 500);
  }

  stop() {
    this.isRunning = false;
    this.items = [];
    this.grabbedItem = null;
    window.scene3D.clearActiveGame();
  }
}

window.HygieneGame = HygieneGame;
