/**
 * Kat 1: Sıfır Atık Ormanı (3-4. Sınıf Çevre ve İklim Bilinci)
 * Kolaylaştırılmış Manyetik Yakalama (Pinch / Hover / Tıkla) ve Otomatik Kutuya Bırakma
 */
class WasteGame {
  constructor() {
    this.name = 'waste';
    this.title = 'Kat 1: Sıfır Atık Ormanı (3-4. Sınıf)';
    this.targetCount = 6;
    this.sortedCount = 0;
    this.score = 0;
    this.wasteItems = [];
    this.bins = [];
    this.grabbedItem = null;
    this.spawnTimer = 0;
    this.isRunning = false;

    // 3-4. Sınıf Sıfır Atık Kutuları
    this.binTypes = [
      { type: 'plastic', color: 0xfacc15, label: 'PLASTİK' },
      { type: 'paper', color: 0x38bdf8, label: 'KAĞIT' },
      { type: 'glass', color: 0x4ade80, label: 'CAM' },
      { type: 'organic', color: 0xa16207, label: 'ORGANİK' },
      { type: 'battery', color: 0xa855f7, label: 'E-ATIK/PİL' }
    ];
  }

  start() {
    this.sortedCount = 0;
    this.score = 0;
    this.wasteItems = [];
    this.grabbedItem = null;
    this.spawnTimer = 0;
    this.isRunning = true;

    window.scene3D.clearActiveGame();

    this.setupEnvironment();
    this.setupBins();

    window.app.updateTargetHUD(
      'fa-recycle',
      `Hedef (0/${this.targetCount}): Atıkları Doğru Kutuya Bırak!`,
      'Elini atığa yaklaştırıp tut, ardından doğru renkli kutunun üzerine götür ve bırak!'
    );

    this.spawnWasteItem();
  }

  setupEnvironment() {
    const groundGeo = new THREE.PlaneGeometry(28, 16);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.3;
    ground.receiveShadow = true;
    window.scene3D.activeGameGroup.add(ground);

    const treePositions = [-8, -6, 6, 8];
    treePositions.forEach(x => {
      const tree = window.scene3D.createErdemTree();
      tree.position.set(x, -2.3, -3.5);
      tree.scale.setScalar(0.75);
      window.scene3D.activeGameGroup.add(tree);
    });
  }

  setupBins() {
    this.bins = [];
    const spacing = 2.4;
    const startX = -((this.binTypes.length - 1) * spacing) / 2;

    this.binTypes.forEach((b, idx) => {
      const bin = window.scene3D.createRecycleBin(b.type, b.color, b.label);
      bin.position.set(startX + idx * spacing, -1.4, 0);
      window.scene3D.activeGameGroup.add(bin);
      this.bins.push(bin);
    });
  }

  spawnWasteItem() {
    if (!this.isRunning || this.sortedCount >= this.targetCount) return;

    const randomType = this.binTypes[Math.floor(Math.random() * this.binTypes.length)].type;
    const item = window.scene3D.createWasteItem(randomType);
    
    item.position.set((Math.random() - 0.5) * 7.5, 4.0, 0);
    window.scene3D.activeGameGroup.add(item);
    this.wasteItems.push(item);
  }

  update(delta, elapsedTime) {
    if (!this.isRunning) return;

    const vision = window.visionController.handState;
    const cursorPos = window.scene3D.handCursor ? window.scene3D.handCursor.position : null;

    this.spawnTimer += delta;
    if (this.spawnTimer > 3.0 && this.wasteItems.length < 2 && this.sortedCount + this.wasteItems.length < this.targetCount + 1) {
      this.spawnWasteItem();
      this.spawnTimer = 0;
    }

    for (let i = this.wasteItems.length - 1; i >= 0; i--) {
      const item = this.wasteItems[i];

      if (item === this.grabbedItem) {
        // Ele yapışma ve takip
        if (cursorPos) {
          item.position.lerp(new THREE.Vector3(cursorPos.x, cursorPos.y, 0), 0.5);
        }

        // Kutu üzerine gelme kontrolü
        let isOverBin = false;
        for (let bin of this.bins) {
          const distToBin = item.position.distanceTo(bin.position);
          if (distToBin < 1.6) {
            isOverBin = true;
            bin.scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), 0.3);
            
            // Eğer el açıldıysa ya da kutu üzerinde bırakıldıysa
            if (!vision.isGrabbing || distToBin < 1.2) {
              this.handleDrop(item, i, bin);
              return;
            }
          } else {
            bin.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), 0.2);
          }
        }

        if (!vision.isGrabbing && !isOverBin) {
          // Boşluğa bırakıldı
          this.grabbedItem = null;
        }

      } else {
        // Aşağı doğru süzül
        item.position.y -= 0.8 * delta;
        item.rotation.z += 0.8 * delta;

        // Yaklaşma ve Yakalama Kontrolü (Hover & Pinch)
        if (cursorPos && vision.detected) {
          const dist = item.position.distanceTo(cursorPos);

          // Manyetik Halo Göster
          if (item.userData.halo) {
            item.userData.halo.material.opacity = dist < 2.0 ? 0.85 : 0;
          }

          // Yakalama: Pinch yapıldığında veya el çok yaklaştığında
          if ((vision.isGrabbing && dist < 2.2) || (dist < 1.3)) {
            if (!this.grabbedItem) {
              this.grabbedItem = item;
              if (window.soundEngine) window.soundEngine.playPop();
            }
          }
        }

        if (item.position.y < -1.8) {
          item.position.y = 4.0;
          item.position.x = (Math.random() - 0.5) * 7;
        }
      }
    }
  }

  handleDrop(item, itemIndex, bin) {
    this.grabbedItem = null;

    if (bin.userData.type === item.userData.type) {
      // Doğru Kutu!
      this.sortedCount++;
      this.score += 100;
      window.app.addScore(100);

      if (window.soundEngine) window.soundEngine.playSuccess();

      // Kutu zıplaması
      bin.position.y = -1.0;
      setTimeout(() => { bin.position.y = -1.4; }, 200);

      window.scene3D.activeGameGroup.remove(item);
      this.wasteItems.splice(itemIndex, 1);

      window.app.updateTargetHUD(
        'fa-recycle',
        `Harika! (${this.sortedCount}/${this.targetCount}) Atık Ayrıştırıldı`,
        'Çok güzel gidiyorsun, sıradaki atığı yakala!'
      );

      if (this.sortedCount >= this.targetCount) {
        this.finishGame();
      } else {
        this.spawnWasteItem();
      }

    } else {
      // Yanlış Kutu
      if (window.soundEngine) window.soundEngine.playError();
      item.position.y = 2.0; // Geri fırlat
      item.position.x = (Math.random() - 0.5) * 5;
    }
  }

  finishGame() {
    this.isRunning = false;
    setTimeout(() => {
      window.app.showVictoryModal(
        'Tebrikler Çevre Kahramanı! 🌿',
        'Tüm atıkları doğru geri dönüşüm kutularına başarıyla ulaştırıp doğayı korudun!',
        3,
        this.score
      );
    }, 500);
  }

  stop() {
    this.isRunning = false;
    this.wasteItems = [];
    this.grabbedItem = null;
    window.scene3D.clearActiveGame();
  }
}

window.WasteGame = WasteGame;
