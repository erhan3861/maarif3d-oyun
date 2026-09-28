/**
 * Kat 3: Sihirli Geometri (3-4. Sınıf Geometrik Cisimler ve Özellikleri)
 * Şekle dokunma/tutma ile anında etkileşim ve Maarif matematik kazanımları
 */
class MathGame {
  constructor() {
    this.name = 'math';
    this.title = 'Kat 3: Sihirli Geometri (3-4. Sınıf)';
    this.targetCount = 5;
    this.currentRound = 0;
    this.score = 0;
    this.shapes = [];
    this.currentTarget = null;
    this.isRunning = false;

    // 3-4. Sınıf Geometrik Cisimler Kataloğu
    this.shapeCatalog = [
      { name: 'Küp', color: 0xef4444, hint: '6 yüzü de eş karedir', question: 'Tüm yüzleri eş kare olan "KÜP" cismine dokun!' },
      { name: 'Kare Prizma', color: 0x38bdf8, hint: '2 kare, 4 dikdörtgen yüz', question: 'Alt ve üst tabanı kare olan "KARE PRİZMA" cismine dokun!' },
      { name: 'Dikdörtgenler Prizması', color: 0xf59e0b, hint: 'Tüm yüzleri dikdörtgendir', question: 'Tüm yüzleri dikdörtgen olan "DİKDÖRTGENLER PRİZMASI"na dokun!' },
      { name: 'Silindir', color: 0x22c55e, hint: '2 daire taban, 1 eğri yüzey', question: 'İki daire tabanı olan "SİLİNDİR" cismine dokun!' },
      { name: 'Koni', color: 0xa855f7, hint: '1 daire taban ve tepe noktası', question: 'Dondurma külahına benzeyen "KONİ" cismine dokun!' },
      { name: 'Küre', color: 0xec4899, hint: 'Köşesi ve ayrıtı yoktur', question: 'Hiç köşesi ve ayrıtı olmayan "KÜRE" cismine dokun!' }
    ];
  }

  start() {
    this.currentRound = 0;
    this.score = 0;
    this.shapes = [];
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
    this.shapes = [];

    // 3 farklı şekil seç
    const shuffled = [...this.shapeCatalog].sort(() => 0.5 - Math.random());
    const roundShapes = shuffled.slice(0, 3);

    // Biri hedef
    this.currentTarget = roundShapes[Math.floor(Math.random() * roundShapes.length)];

    window.app.updateTargetHUD(
      'fa-shapes',
      `Soru (${this.currentRound}/${this.targetCount}): ${this.currentTarget.name.toUpperCase()}`,
      this.currentTarget.question
    );

    const spacing = 3.4;
    const startX = -((roundShapes.length - 1) * spacing) / 2;

    roundShapes.forEach((s, idx) => {
      const shapeMesh = window.scene3D.createGeometricShape(s.name, s.color, s.hint);
      const x = startX + idx * spacing;
      const y = 0.5;

      shapeMesh.position.set(x, y, 0);
      shapeMesh.userData.baseY = y;
      shapeMesh.userData.data = s;

      window.scene3D.activeGameGroup.add(shapeMesh);
      this.shapes.push(shapeMesh);
    });
  }

  update(delta, elapsedTime) {
    if (!this.isRunning) return;

    const vision = window.visionController.handState;
    const cursorPos = window.scene3D.handCursor ? window.scene3D.handCursor.position : null;

    this.shapes.forEach((shape) => {
      // Hafif dönüş
      shape.rotation.y += 0.8 * delta;
      shape.rotation.x = Math.sin(elapsedTime * 1.5 + shape.position.x) * 0.15;
      shape.position.y = shape.userData.baseY + Math.sin(elapsedTime * 2 + shape.position.x) * 0.15;

      // El Yaklaşması / Dokunma Kontrolü (Ultra Duyarlı)
      if (cursorPos && vision.detected) {
        const dist = shape.position.distanceTo(cursorPos);

        if (dist < 1.8) {
          shape.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.3);
          // Dokunma veya Pinch
          if (vision.isGrabbing || dist < 1.3) {
            this.handleSelection(shape);
          }
        } else {
          shape.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), 0.2);
        }
      }
    });
  }

  handleSelection(shape) {
    if (!this.isRunning) return;

    if (shape.userData.data.name === this.currentTarget.name) {
      // Doğru Seçim!
      this.score += 150;
      window.app.addScore(150);

      if (window.soundEngine) window.soundEngine.playSuccess();

      shape.scale.setScalar(1.5);
      this.isRunning = false;

      window.app.updateTargetHUD(
        'fa-circle-check',
        'Harika! Doğru Cevap! 🌟',
        `${this.currentTarget.name} cismini başarıyla tanıdın!`
      );

      setTimeout(() => {
        this.isRunning = true;
        this.nextRound();
      }, 700);

    } else {
      // Yanlış Seçim
      if (window.soundEngine) window.soundEngine.playError();
      shape.position.x += (Math.random() - 0.5) * 0.3;
    }
  }

  finishGame() {
    this.isRunning = false;
    setTimeout(() => {
      window.app.showVictoryModal(
        'Geometri Dahisi! 📐',
        'Tüm 3D geometrik cisimleri ve yüzey özelliklerini kusursuzca bildin!',
        3,
        this.score
      );
    }, 500);
  }

  stop() {
    this.isRunning = false;
    this.shapes = [];
    window.scene3D.clearActiveGame();
  }
}

window.MathGame = MathGame;
