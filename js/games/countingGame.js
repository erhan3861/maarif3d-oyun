/**
 * 1. Sınıf: Meyve Bahçesinde Ritmik Sayma (Matematik 1-10 Sayma)
 * Öğrenciler istenen sayıda 3D meyveyi (elma, portakal, çilek) sepete taşır.
 */
class CountingGame {
  constructor() {
    this.name = 'counting';
    this.title = '1. Sınıf: Meyve Bahçesinde Ritmik Sayma';
    this.targetCount = 4; // Toplam 4 tur
    this.currentRound = 0;
    this.score = 0;
    this.basket = null;
    this.fruits = [];
    this.grabbedFruit = null;
    this.neededAmount = 3;
    this.collectedInBasket = 0;
    this.isRunning = false;

    this.fruitCatalog = [
      { name: 'Elma', color: 0xef4444, type: 'apple' },
      { name: 'Portakal', color: 0xf97316, type: 'orange' },
      { name: 'Çilek', color: 0xec4899, type: 'strawberry' }
    ];
  }

  start() {
    this.currentRound = 0;
    this.score = 0;
    this.isRunning = true;

    window.scene3D.clearActiveGame();
    this.setupBasket();
    this.nextRound();
  }

  setupBasket() {
    this.basket = new THREE.Group();

    // Sepet gövdesi
    const basketGeo = new THREE.CylinderGeometry(1.4, 1.0, 1.2, 18, 1, true);
    const basketMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.9,
      side: THREE.DoubleSide
    });
    const basketMesh = new THREE.Mesh(basketGeo, basketMat);
    basketMesh.position.y = -1.6;
    this.basket.add(basketMesh);

    // Sepet tabanı
    const bottomMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 18),
      new THREE.MeshStandardMaterial({ color: 0x78350f, side: THREE.DoubleSide })
    );
    bottomMesh.rotation.x = -Math.PI / 2;
    bottomMesh.position.y = -2.18;
    this.basket.add(bottomMesh);

    // Sepet Etiketi (Sayaç)
    this.counterCanvas = document.createElement('canvas');
    this.counterCanvas.width = 256;
    this.counterCanvas.height = 128;
    this.counterCtx = this.counterCanvas.getContext('2d');
    this.updateCounterLabel(0, 3);

    this.counterTex = new THREE.CanvasTexture(this.counterCanvas);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.7),
      new THREE.MeshBasicMaterial({ map: this.counterTex, transparent: true })
    );
    label.position.set(0, -1.6, 1.45);
    this.basket.add(label);

    window.scene3D.activeGameGroup.add(this.basket);
  }

  updateCounterLabel(collected, target) {
    if (!this.counterCtx) return;
    this.counterCtx.clearRect(0, 0, 256, 128);
    this.counterCtx.fillStyle = '#ffffff';
    this.counterCtx.roundRect(10, 10, 236, 108, 20);
    this.counterCtx.fill();
    this.counterCtx.fillStyle = '#0f172a';
    this.counterCtx.font = 'bold 44px Fredoka, sans-serif';
    this.counterCtx.textAlign = 'center';
    this.counterCtx.textBaseline = 'middle';
    this.counterCtx.fillText(`${collected} / ${target}`, 128, 64);
    if (this.counterTex) this.counterTex.needsUpdate = true;
  }

  nextRound() {
    if (this.currentRound >= this.targetCount) {
      this.finishGame();
      return;
    }

    this.currentRound++;
    this.collectedInBasket = 0;
    this.neededAmount = Math.floor(Math.random() * 3) + 2; // 2, 3 veya 4 adet
    this.updateCounterLabel(0, this.neededAmount);

    // Meyveleri temizle ve yenilerini saç
    this.fruits.forEach(f => window.scene3D.activeGameGroup.remove(f));
    this.fruits = [];
    this.grabbedFruit = null;

    const currentFruitType = this.fruitCatalog[(this.currentRound - 1) % this.fruitCatalog.length];

    window.app.updateTargetHUD(
      'fa-apple-whole',
      `Soru (${this.currentRound}/${this.targetCount}): Sepete ${this.neededAmount} ${currentFruitType.name} Koy!`,
      `Meyveleri elinle tutup alttaki sepete taşı ve ritmik say!`
    );

    // 6 adet meyve oluştur
    const totalSpawn = 6;
    for (let i = 0; i < totalSpawn; i++) {
      const fruit = this.createFruitMesh(currentFruitType);
      const x = (i - (totalSpawn - 1) / 2) * 1.5;
      const y = (Math.random() * 1.0) + 1.2;

      fruit.position.set(x, y, 0);
      fruit.userData.baseY = y;
      fruit.userData.initialX = x;

      window.scene3D.activeGameGroup.add(fruit);
      this.fruits.push(fruit);
    }
  }

  createFruitMesh(fruitData) {
    const group = new THREE.Group();

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 16, 16),
      new THREE.MeshStandardMaterial({ color: fruitData.color, roughness: 0.25 })
    );
    group.add(sphere);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6),
      new THREE.MeshStandardMaterial({ color: 0x78350f })
    );
    stem.position.y = 0.42;
    group.add(stem);

    group.userData = { isFruit: true, fruitData: fruitData };
    return group;
  }

  update(delta, elapsedTime) {
    if (!this.isRunning) return;

    const vision = window.visionController.handState;
    const cursorPos = window.scene3D.handCursor ? window.scene3D.handCursor.position : null;

    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const fruit = this.fruits[i];

      if (fruit === this.grabbedFruit) {
        if (cursorPos) {
          fruit.position.lerp(new THREE.Vector3(cursorPos.x, cursorPos.y, 0), 0.5);
        }

        // Sepetle temas kontrolü
        const distToBasket = fruit.position.distanceTo(new THREE.Vector3(0, -1.6, 0));
        if (distToBasket < 1.6) {
          this.collectFruitInBasket(fruit, i);
          return;
        }

        if (!vision.isGrabbing) {
          this.grabbedFruit = null;
        }

      } else {
        fruit.position.y = fruit.userData.baseY + Math.sin(elapsedTime * 2 + fruit.userData.initialX) * 0.15;
        fruit.rotation.y += 0.8 * delta;

        if (cursorPos && vision.detected) {
          const dist = fruit.position.distanceTo(cursorPos);
          if ((vision.isGrabbing && dist < 2.0) || (dist < 1.2)) {
            if (!this.grabbedFruit) {
              this.grabbedFruit = fruit;
              if (window.soundEngine) window.soundEngine.playPop();
            }
          }
        }
      }
    }
  }

  collectFruitInBasket(fruit, fruitIndex) {
    this.grabbedFruit = null;
    this.collectedInBasket++;
    this.score += 50;
    window.app.addScore(50);

    if (window.soundEngine) window.soundEngine.playSuccess();

    this.updateCounterLabel(this.collectedInBasket, this.neededAmount);

    window.scene3D.activeGameGroup.remove(fruit);
    this.fruits.splice(fruitIndex, 1);

    // Sepet zıplama
    this.basket.position.y = 0.2;
    setTimeout(() => { if (this.basket) this.basket.position.y = 0; }, 150);

    if (this.collectedInBasket >= this.neededAmount) {
      this.score += 100;
      window.app.addScore(100);

      window.app.updateTargetHUD(
        'fa-circle-check',
        'Harikasın! Sayma Tamamlandı! 🍎',
        `${this.neededAmount} adet meyveyi sepete başarıyla doldurdun!`
      );

      setTimeout(() => {
        this.nextRound();
      }, 900);
    }
  }

  finishGame() {
    this.isRunning = false;
    setTimeout(() => {
      window.app.showVictoryModal(
        'Meyve Bahçesi Şampiyonu! 🍇',
        'Tüm ritmik sayma görevlerini başarıyla tamamlayarak sepetleri doldurdun!',
        3,
        this.score
      );
    }, 500);
  }

  stop() {
    this.isRunning = false;
    this.fruits = [];
    this.grabbedFruit = null;
    window.scene3D.clearActiveGame();
  }
}

window.CountingGame = CountingGame;
