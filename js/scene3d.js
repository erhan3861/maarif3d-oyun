/**
 * Maarif3D - Three.js 3D Sahne ve Varlık Yöneticisi (3-4. Sınıf Seviyesi)
 * Kusursuz Z-Düzlemi El Koordinat Eşlemesi ve Manyetik Yakalama Desteği
 */
class Scene3D {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this.gamePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Z = 0 Düzlemi
    this.planeIntersectPoint = new THREE.Vector3();
    this.clock = new THREE.Clock();

    this.activeGameGroup = new THREE.Group();
    this.particleGroup = new THREE.Group();
    
    // 3D Sihirli El İmleci
    this.handCursor = null;
    this.cursorRing = null;
    this.cursorLight = null;

    this.init();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 0.5, 9.5);

    this.setupLighting();
    this.setupBackground();
    this.createMagicHandCursor();

    this.scene.add(this.activeGameGroup);
    this.scene.add(this.particleGroup);

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.animate();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8eb, 1.1);
    sunLight.position.set(5, 12, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    this.scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x70c0ff, 0.5);
    rimLight.position.set(-6, 4, -4);
    this.scene.add(rimLight);
  }

  setupBackground() {
    this.scene.background = new THREE.Color(0x0e1726);
    this.scene.fog = new THREE.FogExp2(0x0e1726, 0.03);

    // Yıldızlı gökyüzü
    const starGeo = new THREE.BufferGeometry();
    const starCount = 250;
    const posArray = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 40;
      posArray[i + 1] = (Math.random() - 0.5) * 30 + 3;
      posArray[i + 2] = (Math.random() - 0.5) * 20 - 5;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.22,
      color: 0xffd43b,
      transparent: true,
      opacity: 0.7
    });

    this.bgStars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.bgStars);
  }

  createMagicHandCursor() {
    this.handCursor = new THREE.Group();

    // 1. Parlayan 3D Sihirli Küre
    const sphereGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xffd43b,
      emissive: 0xff9900,
      emissiveIntensity: 0.9,
      roughness: 0.1
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.handCursor.add(sphere);

    // 2. Dönen Manyetik Hareket Halkası
    const ringGeo = new THREE.TorusGeometry(0.55, 0.04, 8, 28);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
    this.cursorRing = new THREE.Mesh(ringGeo, ringMat);
    this.handCursor.add(this.cursorRing);

    // 3. Işık
    this.cursorLight = new THREE.PointLight(0xffd43b, 1.5, 6);
    this.handCursor.add(this.cursorLight);

    this.handCursor.position.set(0, 0, 0);
    this.scene.add(this.handCursor);
  }

  updateHandCursor(visionState) {
    if (!this.handCursor) return;

    if (visionState.detected) {
      this.handCursor.visible = true;
      this.mouseNDC.set(visionState.x, visionState.y);

      // Raycaster ile Z=0 oyun düzlemine tam izdüşüm
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      this.raycaster.ray.intersectPlane(this.gamePlane, this.planeIntersectPoint);

      if (this.planeIntersectPoint) {
        this.handCursor.position.lerp(this.planeIntersectPoint, 0.45);
      }

      // Tutma / Yakalama Görsel Efekti
      if (visionState.isGrabbing) {
        this.handCursor.scale.lerp(new THREE.Vector3(1.5, 1.5, 1.5), 0.35);
        this.cursorRing.material.color.setHex(0xff6b6b);
        this.cursorRing.rotation.z += 0.2;
      } else {
        this.handCursor.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), 0.25);
        this.cursorRing.material.color.setHex(0x38bdf8);
        this.cursorRing.rotation.z += 0.04;
      }

    } else {
      this.handCursor.visible = false;
    }
  }

  clearActiveGame() {
    while (this.activeGameGroup.children.length > 0) {
      const obj = this.activeGameGroup.children[0];
      this.activeGameGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
  }

  // 1. Geri Dönüşüm Kutusu (Geniş Ağızlı, Net Etiketli)
  createRecycleBin(type, colorHex, labelText) {
    const binGroup = new THREE.Group();

    // Gövde
    const bodyGeo = new THREE.CylinderGeometry(0.85, 0.7, 1.7, 18);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3,
      metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    binGroup.add(body);

    // Üst Çerçeve
    const rimGeo = new THREE.TorusGeometry(0.88, 0.1, 8, 24);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.85;
    binGroup.add(rim);

    // Kutu İçi
    const insideGeo = new THREE.CircleGeometry(0.82, 16);
    const insideMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const inside = new THREE.Mesh(insideGeo, insideMat);
    inside.rotation.x = -Math.PI / 2;
    inside.position.y = 0.84;
    binGroup.add(inside);

    // Büyük Türkçe Etiket
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 300;
    labelCanvas.height = 140;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(8, 8, 284, 124, 24);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 44px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, 150, 70);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
    const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), labelMat);
    labelMesh.position.set(0, 0.1, 0.78);
    binGroup.add(labelMesh);

    binGroup.userData = { type: type, isBin: true, baseScale: 1.0 };
    return binGroup;
  }

  // 2. 3-4. Sınıf Atık Nesneleri (Büyük ve Net)
  createWasteItem(type) {
    const itemGroup = new THREE.Group();

    if (type === 'plastic') {
      // Plastik Şişe
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 1.0, 14),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9, roughness: 0.1 })
      );
      itemGroup.add(bottle);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10),
        new THREE.MeshStandardMaterial({ color: 0x0284c7 })
      );
      cap.position.y = 0.6;
      itemGroup.add(cap);

    } else if (type === 'paper') {
      // Kağıt Koli / Gazete
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.65, 0.65),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 })
      );
      itemGroup.add(box);

    } else if (type === 'glass') {
      // Cam Şişe
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.9, 14),
        new THREE.MeshStandardMaterial({ color: 0x4ade80, transparent: true, opacity: 0.85, roughness: 0.1 })
      );
      itemGroup.add(glass);

    } else if (type === 'organic') {
      // Elma Koçanı / Organik
      const apple = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 14),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
      );
      itemGroup.add(apple);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6),
        new THREE.MeshStandardMaterial({ color: 0x78350f })
      );
      stem.position.y = 0.45;
      itemGroup.add(stem);

    } else if (type === 'battery') {
      // E-Atık / Pil
      const battery = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.8, 14),
        new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.4 })
      );
      itemGroup.add(battery);
    }

    // Manyetik seçim halkası
    const haloGeo = new THREE.RingGeometry(0.65, 0.75, 24);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd43b, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    itemGroup.add(halo);
    itemGroup.userData.halo = halo;

    itemGroup.userData.type = type;
    itemGroup.userData.isWaste = true;
    itemGroup.userData.grabbed = false;
    return itemGroup;
  }

  // 3. Erdem Ağacı
  createErdemTree() {
    const treeGroup = new THREE.Group();

    // Gövde
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.75, 3.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
    );
    trunk.position.y = 1.7;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Katmanlar
    const colors = [0x22c55e, 0x16a34a, 0x15803d];
    const sizes = [2.2, 1.7, 1.2];
    const heights = [3.2, 4.3, 5.2];

    sizes.forEach((s, idx) => {
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(s, 2.0, 10),
        new THREE.MeshStandardMaterial({ color: colors[idx], flatShading: true })
      );
      leaf.position.y = heights[idx];
      leaf.castShadow = true;
      treeGroup.add(leaf);
    });

    this.blossomGroup = new THREE.Group();
    treeGroup.add(this.blossomGroup);

    return treeGroup;
  }

  addTreeBlossom(position) {
    const flower = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.25, 0),
      new THREE.MeshStandardMaterial({ color: 0xff6b81, emissive: 0xff4757, emissiveIntensity: 0.6 })
    );
    flower.position.copy(position);
    this.blossomGroup.add(flower);
  }

  // 4. Erdem Küresi (3-4. Sınıf Kök Değerleri)
  createValueOrb(valueText, colorHex) {
    const orbGroup = new THREE.Group();

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.68, 24, 24),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.92,
        roughness: 0.15
      })
    );
    sphere.castShadow = true;
    orbGroup.add(sphere);

    // Etiket
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText(valueText, 160, 70);

    const tex = new THREE.CanvasTexture(canvas);
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.65),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    labelMesh.position.z = 0.72;
    orbGroup.add(labelMesh);

    orbGroup.userData = {
      value: valueText,
      isValueOrb: true,
      color: colorHex,
      initialY: 0,
      angle: 0
    };

    return orbGroup;
  }

  // 5. 3-4. Sınıf Geometrik Cisimler (Küp, Kare Prizma, Dikdörtgenler Prizması, Silindir, Koni, Küre)
  createGeometricShape(shapeName, colorHex, subtitle) {
    let geo;
    switch (shapeName) {
      case 'Küp':
        geo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
        break;
      case 'Kare Prizma':
        geo = new THREE.BoxGeometry(0.9, 1.5, 0.9);
        break;
      case 'Dikdörtgenler Prizması':
        geo = new THREE.BoxGeometry(1.5, 0.8, 0.9);
        break;
      case 'Silindir':
        geo = new THREE.CylinderGeometry(0.55, 0.55, 1.3, 20);
        break;
      case 'Koni':
        geo = new THREE.ConeGeometry(0.65, 1.3, 20);
        break;
      case 'Küre':
        geo = new THREE.SphereGeometry(0.65, 24, 24);
        break;
      default:
        geo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.25,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const group = new THREE.Group();
    group.add(mesh);

    // Şekil Başlığı ve Özellik İpucu
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 130;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(shapeName, 160, 50);

    if (subtitle) {
      ctx.fillStyle = '#a5d8ff';
      ctx.font = '600 24px Quicksand, sans-serif';
      ctx.fillText(subtitle, 160, 95);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.65),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    labelMesh.position.y = -1.05;
    group.add(labelMesh);

    group.userData = { shapeName: shapeName, isShape: true, mesh: mesh };
    return group;
  }

  // 6. Jimnastik Robot Maskotu
  createRobotMascot() {
    const robot = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 1.4, 18), bodyMat);
    body.position.y = 1.0;
    robot.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 18, 18),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 })
    );
    head.position.y = 2.2;
    robot.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), eyeMat);
    leftEye.position.set(-0.24, 2.25, 0.55);
    const rightEye = leftEye.clone();
    rightEye.position.set(0.24, 2.25, 0.55);
    robot.add(leftEye);
    robot.add(rightEye);

    this.leftArm = new THREE.Group();
    const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.0, 10), bodyMat);
    armMesh.position.y = -0.45;
    this.leftArm.add(armMesh);
    this.leftArm.position.set(-0.95, 1.5, 0);
    robot.add(this.leftArm);

    this.rightArm = new THREE.Group();
    const rightArmMesh = armMesh.clone();
    this.rightArm.add(rightArmMesh);
    this.rightArm.position.set(0.95, 1.5, 0);
    robot.add(this.rightArm);

    return robot;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    if (this.bgStars) {
      this.bgStars.rotation.y = elapsedTime * 0.02;
    }

    if (window.visionController) {
      this.updateHandCursor(window.visionController.handState);
    }

    if (window.currentActiveGame && window.currentActiveGame.update) {
      window.currentActiveGame.update(delta, elapsedTime);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.scene3D = new Scene3D();
