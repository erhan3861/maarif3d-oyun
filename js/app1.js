/**
 * Maarif3D - 1. Sınıf Uygulama Koordinatörü ve Durum Yöneticisi
 */
class App1 {
  constructor() {
    this.totalScore = 0;
    this.totalStars = 0;
    this.currentLevelKey = null;
    this.activeGameInstance = null;

    this.levelStars = {
      letters: 0,
      counting: 0,
      hygiene: 0,
      colors: 0
    };

    this.menuOverlay = document.getElementById('menu-overlay');
    this.gameHud = document.getElementById('game-hud');
    this.hudScore = document.getElementById('hud-score');
    this.hudStars = document.getElementById('hud-stars');
    this.currentStageTitle = document.getElementById('current-stage-title');
    this.targetTitle = document.getElementById('target-title');
    this.targetDesc = document.getElementById('target-desc');
    this.targetIcon = document.getElementById('target-icon');

    this.victoryModal = document.getElementById('victory-modal');
    this.helpModal = document.getElementById('help-modal');

    this.init();
  }

  init() {
    this.loadProgress();
    this.bindEvents();
    this.updateHUD();

    setTimeout(() => {
      if (window.visionController) {
        window.visionController.initCamera();
      }
    }, 400);
  }

  bindEvents() {
    document.querySelectorAll('.level-card').forEach(card => {
      card.addEventListener('click', () => {
        const levelKey = card.dataset.level;
        this.startLevel(levelKey);
      });
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
      this.returnToMenu();
    });

    const btnSound = document.getElementById('btn-toggle-sound');
    btnSound.addEventListener('click', () => {
      if (window.soundEngine) {
        const isMuted = window.soundEngine.toggleMute();
        btnSound.innerHTML = isMuted 
          ? '<i class="fa-solid fa-volume-xmark"></i>' 
          : '<i class="fa-solid fa-volume-high"></i>';
      }
    });

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

    document.getElementById('btn-help').addEventListener('click', () => {
      this.helpModal.classList.remove('hidden');
    });
    document.getElementById('btn-close-help').addEventListener('click', () => {
      this.helpModal.classList.add('hidden');
    });
    document.getElementById('btn-understood-help').addEventListener('click', () => {
      this.helpModal.classList.add('hidden');
    });

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
      const sequence = ['letters', 'counting', 'hygiene', 'colors'];
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
      case 'letters':
        this.activeGameInstance = new window.LettersGame();
        break;
      case 'counting':
        this.activeGameInstance = new window.CountingGame();
        break;
      case 'hygiene':
        this.activeGameInstance = new window.HygieneGame();
        break;
      case 'colors':
        this.activeGameInstance = new window.ColorsGame();
        break;
      default:
        this.activeGameInstance = new window.LettersGame();
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

    this.currentStageTitle.innerText = '1. Sınıf Maarif Dünyası';
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

    if (window.confetti) {
      window.confetti({
        particleCount: 130,
        spread: 90,
        origin: { y: 0.6 }
      });
    }

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
    
    let earnedStars = 0;
    for (let key in this.levelStars) {
      earnedStars += this.levelStars[key] || 0;
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
      localStorage.setItem('maarif1_score', this.totalScore.toString());
      localStorage.setItem('maarif1_stars', JSON.stringify(this.levelStars));
    } catch (e) {
      console.warn('LocalStorage kaydedilemedi:', e);
    }
  }

  loadProgress() {
    try {
      const savedScore = localStorage.getItem('maarif1_score');
      const savedStars = localStorage.getItem('maarif1_stars');
      if (savedScore) this.totalScore = parseInt(savedScore, 10) || 0;
      if (savedStars) this.levelStars = JSON.parse(savedStars) || this.levelStars;
    } catch (e) {
      console.warn('LocalStorage okunamadı:', e);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App1();
});
