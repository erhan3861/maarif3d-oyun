/**
 * Kat 2: Erdem Ağacı & Kök Değerlerimiz (3-4. Sınıf Maarif Modeli)
 * Ultra Kolay Manyetik Yakalama (Pinch / Dokunma) ve Ağaca Hızlı Bırakma
 */
class ValuesGame {
  constructor() {
    this.name = 'values';
    this.title = 'Kat 2: Erdem Ağacı & Kök Değerler (3-4. Sınıf)';
    this.targetCount = 5;
    this.collectedCount = 0;
    this.score = 0;
    this.orbs = [];
    this.tree = null;
    this.grabbedOrb = null;
    this.isRunning = false;

    // 3-4. Sınıf Türkiye Yüzyılı Maarif Modeli Kök Değerleri
    this.valuesList = [
      { text: 'VATANSEVERLİK', color: 0xef4444 },
      { text: 'SORUMLULUK', color: 0x38bdf8 },
      { text: 'ADALET', color: 0xf59e0b },
      { text: 'DÜRÜSTLÜK', color: 0x22c55e },
      { text: 'YARDIMSEVERLİK', color: 0xa855f7 },
      { text: 'SAYGI', color: 0x06b6d4 },
      { text: 'SEVGİ', color: 0xec4899 },
      { text: 'ÇALIŞKANLIK', color: 0xf97316 }
    ];
  }

  start() {
    this.collectedCount = 0;
    this.score = 0;
    this.orbs = [];
    this.grabbedOrb = null;
    this.isRunning = true;

    window.scene3D.clearActiveGame();

    this.setupTree();
    this.spawnInitialOrbs();

    window.app.updateTargetHUD(
      'fa-heart',
      `Hedef (0/${this.targetCount}): Erdem Tohumlarını Ağaca Ulaştır!`,
      'Uçuşan erdem kürelerini elinle tut ve ortadaki Erdem Ağacı\'na getir!'
    );
  }

  setupTree() {
    this.tree = window.scene3D.createErdemTree();
    this.tree.position.set(0, -2.4, 0);
    this.tree.scale.setScalar(1.0);
    window.scene3D.activeGameGroup.add(this.tree);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.0, 3.2, 32),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, -2.35, 0);
    window.scene3D.activeGameGroup.add(ring);
  }

  spawnInitialOrbs() {
    const shuffled = [...this.valuesList].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    const radius = 3.6;
    selected.forEach((v, idx) => {
      const angle = (idx / selected.length) * Math.PI * 2;
      const orb = window.scene3D.createValueOrb(v.text, v.color);
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * 1.5 + 0.8;

      orb.position.set(x, y, 0);
      orb.userData.initialY = y;
      orb.userData.angle = angle;

      window.scene3D.activeGameGroup.add(orb);
      this.orbs.push(orb);
    });
  }

  update(delta, elapsedTime) {
    if (!this.isRunning) return;

    const vision = window.visionController.handState;
    const cursorPos = window.scene3D.handCursor ? window.scene3D.handCursor.position : null;

    if (this.tree) {
      this.tree.rotation.y = Math.sin(elapsedTime * 0.4) * 0.06;
    }

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];

      if (orb === this.grabbedOrb) {
        // İmlci doğrudan takip et
        if (cursorPos) {
          orb.position.lerp(new THREE.Vector3(cursorPos.x, cursorPos.y, 0), 0.5);
        }

        // Ağaçla temas / Yaklaşma kontrolü (Kolaylaştırılmış)
        const distToTree = orb.position.distanceTo(new THREE.Vector3(0, 0, 0));
        if (distToTree < 2.8) {
          this.absorbOrb(orb, i);
          return;
        }

        if (!vision.isGrabbing) {
          this.grabbedOrb = null;
        }

      } else {
        // Havada süzül
        orb.userData.angle += 0.3 * delta;
        orb.position.y = orb.userData.initialY + Math.sin(elapsedTime * 2 + orb.userData.angle) * 0.25;

        // Yakalama Kontrolü
        if (cursorPos && vision.detected) {
          const dist = orb.position.distanceTo(cursorPos);
          if ((vision.isGrabbing && dist < 2.2) || (dist < 1.3)) {
            if (!this.grabbedOrb) {
              this.grabbedOrb = orb;
              if (window.soundEngine) window.soundEngine.playPop();
            }
          }
        }
      }
    }
  }

  absorbOrb(orb, orbIndex) {
    this.grabbedOrb = null;
    this.collectedCount++;
    this.score += 150;
    window.app.addScore(150);

    if (window.soundEngine) window.soundEngine.playSuccess();

    // Ağaca çiçek açtır
    const blossomPos = new THREE.Vector3(
      (Math.random() - 0.5) * 2.0,
      1.5 + Math.random() * 2.5,
      (Math.random() - 0.5) * 1.5
    );
    window.scene3D.addTreeBlossom(blossomPos);

    if (this.tree) {
      this.tree.scale.addScalar(0.06);
    }

    window.scene3D.activeGameGroup.remove(orb);
    this.orbs.splice(orbIndex, 1);

    window.app.updateTargetHUD(
      'fa-heart',
      `Erdem Ekildi! (${this.collectedCount}/${this.targetCount})`,
      `"${orb.userData.value}" erdemi ağacımıza güç verdi!`
    );

    if (this.collectedCount >= this.targetCount) {
      this.finishGame();
    }
  }

  finishGame() {
    this.isRunning = false;
    setTimeout(() => {
      window.app.showVictoryModal(
        'Erdem Ağacı Rengarenk Açtı! 🌸',
        'Tüm güzel erdemleri toplayarak Erdem Ağacı\'nı büyüttün. Tebrikler!',
        3,
        this.score
      );
    }, 600);
  }

  stop() {
    this.isRunning = false;
    this.orbs = [];
    this.grabbedOrb = null;
    window.scene3D.clearActiveGame();
  }
}

window.ValuesGame = ValuesGame;
