/**
 * Kat 4: Neşeli Jimnastik & Beden Duruşu (Sağlıklı Yaşam ve Koordinasyon)
 * Çocuklar 3D Robot Dost'un gösterdiği hareketleri kameraya karşı yapar ve enerjiyi doldurur!
 */
class GymGame {
  constructor() {
    this.name = 'gym';
    this.title = 'Kat 4: Neşeli Jimnastik';
    this.targetCount = 4;
    this.currentExerciseIndex = 0;
    this.exerciseHoldTimer = 0;
    this.score = 0;
    this.robot = null;
    this.isRunning = false;

    this.exercises = [
      {
        title: 'Kolları Gökyüzüne Uzat!',
        desc: 'Elini yukarı kaldır ve gökyüzündeki yıldızlara doğru uzan!',
        expectedPos: 'high',
        robotArmAngle: Math.PI
      },
      {
        title: 'Sağa Doğru Uzan!',
        desc: 'Elini sağa doğru aç ve esne!',
        expectedPos: 'right',
        robotArmAngle: Math.PI / 2
      },
      {
        title: 'Sola Doğru Uzan!',
        desc: 'Elini sola doğru aç ve esne!',
        expectedPos: 'left',
        robotArmAngle: -Math.PI / 2
      },
      {
        title: 'Ellerini Hızlıca Salla!',
        desc: 'Kameraya neşeyle el salla!',
        expectedPos: 'wave',
        robotArmAngle: Math.PI * 0.75
      }
    ];
  }

  start() {
    this.currentExerciseIndex = 0;
    this.exerciseHoldTimer = 0;
    this.score = 0;
    this.isRunning = true;

    window.scene3D.clearActiveGame();

    // 1. Robot Maskotu Sahneye Ekle
    this.setupRobot();

    // 2. İlk Jimnastik Hareketini Başlat
    this.setExercise(0);
  }

  setupRobot() {
    this.robot = window.scene3D.createRobotMascot();
    this.robot.position.set(0, -1.8, 0);
    this.robot.scale.setScalar(1.2);
    window.scene3D.activeGameGroup.add(this.robot);
  }

  setExercise(index) {
    if (index >= this.exercises.length) {
      this.finishGame();
      return;
    }

    this.currentExerciseIndex = index;
    this.exerciseHoldTimer = 0;
    const current = this.exercises[index];

    window.app.updateTargetHUD(
      'fa-person-running',
      `Egzersiz (${index + 1}/${this.exercises.length}): ${current.title}`,
      current.desc
    );

    if (window.soundEngine) window.soundEngine.playPop();
  }

  update(delta, elapsedTime) {
    if (!this.isRunning || !this.robot) return;

    const vision = window.visionController.handState;
    const current = this.exercises[this.currentExerciseIndex];

    // Robot Tatlı Zıplama & Kol Hareketi
    this.robot.position.y = -1.8 + Math.abs(Math.sin(elapsedTime * 4)) * 0.2;

    if (window.scene3D.leftArm && window.scene3D.rightArm) {
      window.scene3D.leftArm.rotation.z = Math.sin(elapsedTime * 6) * 0.3 - current.robotArmAngle;
      window.scene3D.rightArm.rotation.z = -Math.sin(elapsedTime * 6) * 0.3 + current.robotArmAngle;
    }

    // Hareket Tespiti Kontrolü
    if (vision.detected) {
      let isMatching = false;

      if (current.expectedPos === 'high' && vision.y > 0.3) {
        isMatching = true;
      } else if (current.expectedPos === 'right' && vision.x > 0.3) {
        isMatching = true;
      } else if (current.expectedPos === 'left' && vision.x < -0.3) {
        isMatching = true;
      } else if (current.expectedPos === 'wave' && Math.abs(vision.x) < 0.6) {
        isMatching = true;
      }

      if (isMatching) {
        this.exerciseHoldTimer += delta;
        if (this.exerciseHoldTimer >= 1.8) {
          // Egzersiz Başarıyla Tamamlandı!
          this.score += 150;
          window.app.addScore(150);

          if (window.soundEngine) window.soundEngine.playSuccess();
          this.setExercise(this.currentExerciseIndex + 1);
        }
      } else {
        this.exerciseHoldTimer = Math.max(0, this.exerciseHoldTimer - delta * 0.5);
      }
    }
  }

  finishGame() {
    this.isRunning = false;
    setTimeout(() => {
      window.app.showVictoryModal(
        'Harika Bir Sporcusun! 🤸‍♂️',
        'Tüm jimnastik hareketlerini başarıyla yaparak bedenine sağlık ve neşe kattın!',
        3,
        this.score
      );
    }, 600);
  }

  stop() {
    this.isRunning = false;
    window.scene3D.clearActiveGame();
  }
}

window.GymGame = GymGame;
