/**
 * 1. Sınıf: Neşeli Sesler & Harf Balonları (Türkçe - İlk Okuma Yazma)
 * Öğrenciler havada süzülen 3D harf balonlarından istenen sesi eliyle yakalayıp patlatır!
 */
class LettersGame {
  constructor() {
    this.name = 'letters';
    this.title = '1. Sınıf: Neşeli Harf & Ses Balonları';
    this.targetCount = 5;
    this.currentRound = 0;
    this.score = 0;
    this.balloons = [];
    this.currentTarget = null;
    this.isRunning = false;

    // 1. Sınıf Maarif Modeli Temel Ses Grupları
    this.lettersCatalog = [
      { char: 'A', name: 'A Sesi (Arı, Ayı, Elma)', color: 0xef4444 },
      { char: 'E', name: 'E Sesi (Ev, Ekmek, El)', color: 0x38bdf8 },
      { char: 'L', name: 'L Sesi (Limon, Leylek)', color: 0xfacc15 },
      { char: 'K', name: 'K Sesi (Kedi, Kelebek)', color: 0x22c55e },
      { char: 'İ', name: 'İ Sesi (İncir, İp, İnek)', color: 0xa855f7 },
      { char: 'N', name: 'N Sesi (Nar, Nal, Nehir)', color: 0xec4899 },
      { char: 'O', name: 'O Sesi (Okul, Orman)', color: 0xf97316 },
      { char: 'M', name: 'M Sesi (Maymun, Masa)', color: 0x06b6d4 }
    ];
  }

  start() {
    this.currentRound = 0;
    this.score = 0;
    this.balloons = [];
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
    this.balloons = [];

    // 3 farklı harf balonu seç
    const shuffled = [...this.lettersCatalog].sort(() => 0.5 - Math.random());
    const roundLetters = shuffled.slice(0, 3);
    this.currentTarget = roundLetters[Math.floor(Math.random() * roundLetters.length)];

    window.app.updateTargetHUD(
      'fa-font',
      `Soru (${this.currentRound}/${this.targetCount}): "${this.currentTarget.char}" Harfini Yakala!`,
      `Havada uçuşan balonlar arasından "${this.currentTarget.name}" balonuna dokun!`
    );

    const spacing = 3.4;
    const startX = -((roundLetters.length - 1) * spacing) / 2;

    roundLetters.forEach((letter, idx) => {
      const balloon = this.createBalloon(letter.char, letter.color);
      const x = startX + idx * spacing;
      const y = (Math.random() - 0.5) * 0.8 + 0.8;

      balloon.position.set(x, y, 0);
      balloon.userData.baseY = y;
      balloon.userData.data = letter;

      window.scene3D.activeGameGroup.add(balloon);
      this.balloons.push(balloon);
    });
  }

  createBalloon(char, colorHex) {
    const group = new THREE.Group();

    // Balon Küresi
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 24, 24),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.15,
        metalness: 0.1,
        emissive: colorHex,
        emissiveIntensity: 0.35
      })
    );
    sphere.scale.set(1, 1.15, 1);
    group.add(sphere);

    // Düğüm
    const knot = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: colorHex })
    );
    knot.position.y = -0.9;
    knot.rotation.x = Math.PI;
    group.add(knot);

    // İp
    const stringGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6);
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const string = new THREE.Mesh(stringGeo, stringMat);
    string.position.y = -1.35;
    group.add(string);

    // Harf Etiketi
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(char, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.0),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    label.position.z = 0.8;
    group.add(label);

    return group;
  }

  update(delta, elapsedTime) {
    if (!this.isRunning) return;

    const vision = window.visionController.handState;
    const cursorPos = window.scene3D.handCursor ? window.scene3D.handCursor.position : null;

    this.balloons.forEach((balloon) => {
      balloon.rotation.y = Math.sin(elapsedTime * 2 + balloon.position.x) * 0.15;
      balloon.position.y = balloon.userData.baseY + Math.sin(elapsedTime * 2.5 + balloon.position.x) * 0.25;

      if (cursorPos && vision.detected) {
        const dist = balloon.position.distanceTo(cursorPos);
        if (dist < 1.8) {
          balloon.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.3);
          if (vision.isGrabbing || dist < 1.3) {
            this.handleSelect(balloon);
          }
        } else {
          balloon.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), 0.2);
        }
      }
    });
  }

  handleSelect(balloon) {
    if (!this.isRunning) return;

    if (balloon.userData.data.char === this.currentTarget.char) {
      this.score += 150;
      window.app.addScore(150);

      if (window.soundEngine) window.soundEngine.playSuccess();

      balloon.scale.setScalar(1.6);
      this.isRunning = false;

      window.app.updateTargetHUD(
        'fa-circle-check',
        'Tebrikler! Doğru Ses! 🌟',
        `"${this.currentTarget.char}" harfini başarıyla yakaladın!`
      );

      setTimeout(() => {
        this.isRunning = true;
        this.nextRound();
      }, 700);

    } else {
      if (window.soundEngine) window.soundEngine.playError();
      balloon.position.x += (Math.random() - 0.5) * 0.3;
    }
  }

  finishGame() {
    this.isRunning = false;
    setTimeout(() => {
      window.app.showVictoryModal(
        'Harf Şampiyonu! 🎈',
        'Tüm ses ve harf balonlarını doğru yakalayarak okuma macerasını tamamladın!',
        3,
        this.score
      );
    }, 500);
  }

  stop() {
    this.isRunning = false;
    this.balloons = [];
    window.scene3D.clearActiveGame();
  }
}

window.LettersGame = LettersGame;
