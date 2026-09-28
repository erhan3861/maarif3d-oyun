/**
 * Maarif3D - Ana Uygulama Koordinatörü ve Durum Yöneticisi
 */
class App {
  constructor() {
    this.totalScore = 0;
    this.totalStars = 0;
    this.currentLevelKey = null;
    this.activeGameInstance = null;

    this.levelStars = {
      waste: 0,
      values: 0,
      math: 0,
      gym: 0
    };

    // DOM Öğeleri
    this.menuOverlay = document.getElementById('menu-overlay');
    this.gameHud = document.getElementById('game-hud');
    this.hudScore = document.getElementById('hud-score');
    this.hudStars = document.getElementById('hud-stars');
    this.currentStageTitle = document.getElementById('current-stage-title');
    this.targetTitle = document.getElementById('target-title');
    this.targetDesc = document.getElementById('target-desc');
    this.targetIcon = document.getElementById('target-icon');

    // Modallar
    this.victoryModal = document.getElementById('victory-modal');
    this.helpModal = document.getElementById('help-modal');

    this.init();
  }

  init() {
    this.loadProgress();
    this.bindEvents();
    this.updateHUD();

    // Kamerayı başlatmayı dene
    setTimeout(() => {
      if (window.visionController) {
        window.visionController.initCamera();
      }
    }, 500);
  }

  bindEvents() {
    // Seviye Kartları Tıklama
    document.querySelectorAll('.level-card').forEach(card => {
      card.addEventListener('click', () => {
        const levelKey = card.dataset.level;
        this.startLevel(levelKey);
      });
    });

    // Menüye Dön Butonu
    document.getElementById('btn-back-menu').addEventListener('click', () => {
      this.returnToMenu();
    });

    // Ses Aç / Kapat
    const btnSound = document.getElementById('btn-toggle-sound');
    btnSound.addEventListener('click', () => {
      if (window.soundEngine) {
        const isMuted = window.soundEngine.toggleMute();
        btnSound.innerHTML = isMuted 
          ? '<i class="fa-solid fa-volume-xmark"></i>' 
          : '<i class="fa-solid fa-volume-high"></i>';
      }
    });

    // Kamera / Fare Modu Değiştir
    const btnCam = document.getElementById('btn-toggle-cam');
    btnCam.addEventListener('click', () => {
      if (window.visionController) {
        if (window.visionController.handState.mode === 'camera') {
          window.visionController.fallbackToMouse('Fare Moduna Geçildi');
          btnCam.innerHTML = '<i class="fa-solid fa-mouse"></i>';
        } else {
          window.visionController.initCamera();
          btnCam.innerHTML = '<i class="fa-solid fa-camera"></i>';
        }
      }
    });

    // Yardım Modalı
    document.getElementById('btn-help').addEventListener('click', () => {
      this.helpModal.classList.remove('hidden');
    });
    document.getElementById('btn-close-help').addEventListener('click', () => {
      this.helpModal.classList.add('hidden');
    });
    document.getElementById('btn-understood-help').addEventListener('click', () => {
      this.helpModal.classList.add('hidden');
    });

    // Tebrik Modalı Butonları
    document.getElementById('btn-replay-level').addEventListener('click', () => {
      this.victoryModal.classList.add('hidden');
      if (this.currentLevelKey) this.startLevel(this.currentLevelKey);
    });

    document.getElementById('btn-back-to-map').addEventListener('click', () => {
      this.victoryModal.classList.add('hidden');
      this.returnToMenu();
    });

    document.getElementById('btn-next-level').addEventListener('click', () => {
      this.victoryModal.classList.add('hidden');
      const sequence = ['waste', 'values', 'math', 'gym'];
      const currentIdx = sequence.indexOf(this.currentLevelKey);
      const nextKey = sequence[(currentIdx + 1) % sequence.length];
      this.startLevel(nextKey);
    });
  }

  startLevel(levelKey) {
    if (window.soundEngine) {
      window.soundEngine.init();
      window.soundEngine.playClick();
    }

    this.currentLevelKey = levelKey;
    this.menuOverlay.classList.remove('active');
    this.gameHud.classList.remove('hidden');

    if (this.activeGameInstance && this.activeGameInstance.stop) {
      this.activeGameInstance.stop();
    }

    switch (levelKey) {
      case 'waste':
        this.activeGameInstance = new window.WasteGame();
        break;
      case 'values':
        this.activeGameInstance = new window.ValuesGame();
        break;
      case 'math':
        this.activeGameInstance = new window.MathGame();
        break;
      case 'gym':
        this.activeGameInstance = new window.GymGame();
        break;
      default:
        this.activeGameInstance = new window.WasteGame();
    }

    window.currentActiveGame = this.activeGameInstance;
    this.currentStageTitle.innerText = this.activeGameInstance.title;
    this.activeGameInstance.start();
  }

  returnToMenu() {
    if (window.soundEngine) window.soundEngine.playClick();

    if (this.activeGameInstance && this.activeGameInstance.stop) {
      this.activeGameInstance.stop();
    }
    window.currentActiveGame = null;

    this.currentStageTitle.innerText = 'Maarif Macera Haritası';
    this.gameHud.classList.add('hidden');
    this.menuOverlay.classList.add('active');
    this.updateHUD();
  }

  updateTargetHUD(iconClass, titleText, descText) {
    if (this.targetIcon) this.targetIcon.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    if (this.targetTitle) this.targetTitle.innerText = titleText;
    if (this.targetDesc) this.targetDesc.innerText = descText;
  }

  addScore(amount) {
    this.totalScore += amount;
    this.updateHUD();
  }

  showVictoryModal(title, desc, starsAwarded, scoreEarned) {
    if (window.soundEngine) window.soundEngine.playVictory();

    // Konfeti Şöleni!
    if (window.confetti) {
      window.confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    // Yıldızları kaydet
    if (this.currentLevelKey) {
      this.levelStars[this.currentLevelKey] = Math.max(
        this.levelStars[this.currentLevelKey] || 0,
        starsAwarded
      );
    }
    this.saveProgress();

    document.getElementById('victory-title').innerText = title;
    document.getElementById('victory-desc').innerText = desc;
    document.getElementById('modal-score-earned').innerText = `+${scoreEarned} Puan`;

    this.victoryModal.classList.remove('hidden');
    this.updateHUD();
  }

  updateHUD() {
    if (this.hudScore) this.hudScore.innerText = this.totalScore;
    
    // Toplam Yıldız Hesabı
    let earnedStars = 0;
    for (let key in this.levelStars) {
      earnedStars += this.levelStars[key] || 0;
      // Kart Yıldızlarını Güncelle
      const starContainer = document.getElementById(`stars-level-${key}`);
      if (starContainer) {
        let starsHtml = '';
        for (let i = 1; i <= 3; i++) {
          if (i <= (this.levelStars[key] || 0)) {
            starsHtml += '<i class="fa-solid fa-star"></i>';
          } else {
            starsHtml += '<i class="fa-regular fa-star"></i>';
          }
        }
        starContainer.innerHTML = starsHtml;
      }
    }
    this.totalStars = earnedStars;
    if (this.hudStars) this.hudStars.innerText = `${this.totalStars} / 12`;
  }

  saveProgress() {
    try {
      localStorage.setItem('maarif3d_score', this.totalScore.toString());
      localStorage.setItem('maarif3d_stars', JSON.stringify(this.levelStars));
    } catch (e) {
      console.warn('LocalStorage kaydı yapılamadı:', e);
    }
  }

  loadProgress() {
    try {
      const savedScore = localStorage.getItem('maarif3d_score');
      const savedStars = localStorage.getItem('maarif3d_stars');
      if (savedScore) this.totalScore = parseInt(savedScore, 10) || 0;
      if (savedStars) this.levelStars = JSON.parse(savedStars) || this.levelStars;
    } catch (e) {
      console.warn('LocalStorage okunamadı:', e);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
