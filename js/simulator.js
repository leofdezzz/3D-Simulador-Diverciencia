const THREE = window.THREE;

export class FloatingFarmSimulator {
  constructor({ container }) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.orbit = null;
    this.clock = new THREE.Clock();

    this.callbacks = { ready: [], frame: [], seekComplete: [] };
    this.constants = {
      TW: 10,
      TD: 10,
      TH: 3.4,
      HW: 5,
      HD: 5,
      WT: 0.1,
      WATER_Y: 0.7,
      CABLE_Y: 0.7,
      RAIL_LEN: 9,
      SPOOL_R: 0.15,
    };
    this.constants.yBot = -this.constants.TH / 2;
    this.constants.yTop = this.constants.TH / 2;
    this.constants.RAIL_Y = this.constants.yTop + 0.3;

    this.state = { side: "N", pos: 0.5, power: 0.7 };
    this.turbineState = {
      target: new THREE.Vector3(0, 0, 0),
      rotSpeed: 0,
      seeking: false,
      seekTimer: 0,
    };

    this.sides = this.createSides();
    this.tmpDir = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);

    this.prevCableLens = [null, null, null, null];
    this.spoolAngles = [0, 0, 0, 0];
    this.spoolGroups = [];
    this.sheaveGroups = [];
    this.anchorPts = [];
    this.cableMeshes = [];

    this.iwGeo = null;
    this.iwPts = null;
    this.iwX = null;
    this.iwY = null;
    this.subLight = null;
    this.fanGroup = null;
    this.bladeSpinner = null;
    this.glowRing = null;
    this.turbineGroup = null;
    this.rotorGroup = null;

    this.PC = 260;
    this.pGeo = null;
    this.pPos = null;
    this.pVel = null;
    this.pLife = null;
    this.pMax = null;

    this.boundAnimate = this.animate.bind(this);
    this.boundResize = this.handleResize.bind(this);
  }

  createSides() {
    const { HD, HW, RAIL_Y } = this.constants;

    return {
      N: { dir: new THREE.Vector3(0, 0, -1), getPos: (t) => new THREE.Vector3(t, RAIL_Y, HD), rotY: Math.PI },
      S: { dir: new THREE.Vector3(0, 0, 1), getPos: (t) => new THREE.Vector3(t, RAIL_Y, -HD), rotY: 0 },
      E: { dir: new THREE.Vector3(-1, 0, 0), getPos: (t) => new THREE.Vector3(HW, RAIL_Y, t), rotY: -Math.PI / 2 },
      W: { dir: new THREE.Vector3(1, 0, 0), getPos: (t) => new THREE.Vector3(-HW, RAIL_Y, t), rotY: Math.PI / 2 },
    };
  }

  onReady(callback) {
    this.callbacks.ready.push(callback);
  }

  onFrame(callback) {
    this.callbacks.frame.push(callback);
  }

  onSeekComplete(callback) {
    this.callbacks.seekComplete.push(callback);
  }

  emit(type, payload) {
    this.callbacks[type].forEach((callback) => callback(payload));
  }

  start() {
    this.buildScene();
    this.emit("ready");
    window.addEventListener("resize", this.boundResize);
    requestAnimationFrame(this.boundAnimate);
  }

  isSeeking() {
    return this.turbineState.seeking;
  }

  setSide(side) {
    this.state.side = side;
    this.updateFan();
    this.resetParticles();
  }

  setPosition(position) {
    this.state.pos = position;
    this.updateFan();
    this.resetParticles();
  }

  setPower(power) {
    this.state.power = power;
  }

  seekOptimalPosition() {
    const optimal = this.getOptimalPos();
    this.turbineState.seeking = true;
    this.turbineState.seekTimer = 3.5;
    this.turbineState.target.x = optimal.x;
    this.turbineState.target.z = optimal.z;
  }

  buildScene() {
    const { innerWidth, innerHeight, devicePixelRatio } = window;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06101e);
    this.scene.fog = new THREE.FogExp2(0x06101e, 0.012);

    this.camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 600);
    this.camera.position.set(20, 14, 20);

    this.orbit = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.06;
    this.orbit.target.set(0, 1.5, 0);
    this.orbit.update();

    this.addLights();
    this.buildTank();
    this.buildInnerWater();
    this.buildAnchorPoints();
    this.buildRails();
    this.buildWinches();
    this.buildCables();
    this.buildFan();
    this.buildTurbine();
    this.buildParticles();
    this.seedParticles();
    this.updateFan();
  }

  addLights() {
    this.scene.add(new THREE.AmbientLight(0x1a3050, 3.5));

    const sun = new THREE.DirectionalLight(0xfff0cc, 3.5);
    sun.position.set(22, 38, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 180;
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 26;
    sun.shadow.camera.bottom = -26;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x2255aa, 1);
    fill.position.set(-14, 6, -10);
    this.scene.add(fill);

    this.subLight = new THREE.PointLight(0x0066cc, 3, 14);
    this.subLight.position.set(0, -0.5, 0);
    this.scene.add(this.subLight);
  }

  buildTank() {
    const { TW, TD, TH, HW, HD, WT, yBot, yTop } = this.constants;
    const tankGroup = new THREE.Group();
    this.scene.add(tankGroup);

    const plasticMaterial = new THREE.MeshPhongMaterial({
      color: 0xa8d8f0,
      emissive: 0x040c14,
      transparent: true,
      opacity: 0.4,
      shininess: 350,
      specular: new THREE.Color(0xffffff),
      side: THREE.DoubleSide,
    });

    const addWall = (w, h, d, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plasticMaterial);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      tankGroup.add(mesh);
    };

    addWall(TW + WT * 2, TH, WT, 0, 0, HD + WT / 2);
    addWall(TW + WT * 2, TH, WT, 0, 0, -HD - WT / 2);
    addWall(WT, TH, TD, HW + WT / 2, 0, 0);
    addWall(WT, TH, TD, -HW - WT / 2, 0, 0);

    const bottom = new THREE.Mesh(
      new THREE.BoxGeometry(TW + WT * 2, WT, TD + WT * 2),
      new THREE.MeshPhongMaterial({ color: 0x3a6880, shininess: 40, emissive: 0x030f18 })
    );
    bottom.position.y = yBot - WT / 2;
    tankGroup.add(bottom);

    const ironMaterial = new THREE.MeshPhongMaterial({
      color: 0x2c3840,
      shininess: 100,
      specular: new THREE.Color(0x5577aa),
    });
    const diagMaterial = new THREE.MeshPhongMaterial({
      color: 0x223038,
      shininess: 60,
      specular: new THREE.Color(0x334455),
    });

    const addBar = (x1, y1, z1, x2, y2, z2, radius, material) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8), material || ironMaterial);
      mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
      mesh.castShadow = true;
      tankGroup.add(mesh);
    };

    const addNode = (x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), ironMaterial);
      mesh.position.set(x, y, z);
      tankGroup.add(mesh);
    };

    const ox = HW + WT;
    const oz = HD + WT;
    const R = 0.07;
    const rr = 0.042;
    const rd = 0.028;

    addBar(-ox, yBot, -oz, -ox, yTop, -oz, R);
    addBar(ox, yBot, -oz, ox, yTop, -oz, R);
    addBar(-ox, yBot, oz, -ox, yTop, oz, R);
    addBar(ox, yBot, oz, ox, yTop, oz, R);
    addBar(-ox, yBot, -oz, ox, yBot, -oz, R);
    addBar(-ox, yBot, oz, ox, yBot, oz, R);
    addBar(-ox, yBot, -oz, -ox, yBot, oz, R);
    addBar(ox, yBot, -oz, ox, yBot, oz, R);
    addBar(-ox, yTop, -oz, ox, yTop, -oz, R);
    addBar(-ox, yTop, oz, ox, yTop, oz, R);
    addBar(-ox, yTop, -oz, -ox, yTop, oz, R);
    addBar(ox, yTop, -oz, ox, yTop, oz, R);
    addBar(-ox, 0, -oz, ox, 0, -oz, rr, diagMaterial);
    addBar(-ox, 0, oz, ox, 0, oz, rr, diagMaterial);
    addBar(-ox, 0, -oz, -ox, 0, oz, rr, diagMaterial);
    addBar(ox, 0, -oz, ox, 0, oz, rr, diagMaterial);
    addBar(-ox, yBot, oz, ox, yTop, oz, rd, diagMaterial);
    addBar(ox, yBot, oz, -ox, yTop, oz, rd, diagMaterial);
    addBar(-ox, yBot, -oz, ox, yTop, -oz, rd, diagMaterial);
    addBar(ox, yBot, -oz, -ox, yTop, -oz, rd, diagMaterial);
    addBar(ox, yBot, -oz, ox, yTop, oz, rd, diagMaterial);
    addBar(ox, yBot, oz, ox, yTop, -oz, rd, diagMaterial);
    addBar(-ox, yBot, -oz, -ox, yTop, oz, rd, diagMaterial);
    addBar(-ox, yBot, oz, -ox, yTop, -oz, rd, diagMaterial);

    [
      [-ox, yBot, -oz], [ox, yBot, -oz], [-ox, yBot, oz], [ox, yBot, oz],
      [-ox, yTop, -oz], [ox, yTop, -oz], [-ox, yTop, oz], [ox, yTop, oz],
    ].forEach(([x, y, z]) => addNode(x, y, z));

    const feetMaterial = new THREE.MeshPhongMaterial({ color: 0x1c2830, shininess: 50 });
    [
      [-ox + 0.2, -oz + 0.2],
      [ox - 0.2, -oz + 0.2],
      [-ox + 0.2, oz - 0.2],
      [ox - 0.2, oz - 0.2],
    ].forEach(([x, z]) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 10), feetMaterial);
      foot.position.set(x, yBot - 0.25, z);
      tankGroup.add(foot);
    });
  }

  buildInnerWater() {
    const { TW, TD, WATER_Y } = this.constants;
    this.iwGeo = new THREE.PlaneGeometry(TW - 0.06, TD - 0.06, 32, 32);

    const waterMaterial = new THREE.MeshPhongMaterial({
      color: 0x005a9e,
      emissive: 0x001a30,
      shininess: 280,
      specular: new THREE.Color(0x55aaee),
      transparent: true,
      opacity: 0.88,
    });

    const innerWater = new THREE.Mesh(this.iwGeo, waterMaterial);
    innerWater.rotation.x = -Math.PI / 2;
    innerWater.position.y = WATER_Y;
    this.scene.add(innerWater);

    this.iwPts = this.iwGeo.attributes.position;
    this.iwX = new Float32Array(this.iwPts.count);
    this.iwY = new Float32Array(this.iwPts.count);

    for (let i = 0; i < this.iwPts.count; i += 1) {
      this.iwX[i] = this.iwPts.getX(i);
      this.iwY[i] = this.iwPts.getY(i);
    }
  }

  buildAnchorPoints() {
    const { HW, HD, CABLE_Y, yTop, SPOOL_R } = this.constants;
    this.cornerXZ = [
      [-HW + 0.15, HD - 0.15],
      [HW - 0.15, HD - 0.15],
      [-HW + 0.15, -HD + 0.15],
      [HW - 0.15, -HD + 0.15],
    ];

    const sheaveBodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x556677,
      shininess: 110,
      specular: new THREE.Color(0x99aabb),
    });
    const sheaveRingMaterial = new THREE.MeshPhongMaterial({ color: 0x889aaa, shininess: 140 });

    this.anchorPts = this.cornerXZ.map(([gx, gz]) => {
      const sheaveGroup = new THREE.Group();
      sheaveGroup.position.set(gx, CABLE_Y + 0.06, gz);
      sheaveGroup.rotation.y = Math.atan2(gz, -gx);
      this.scene.add(sheaveGroup);
      this.sheaveGroups.push(sheaveGroup);

      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), sheaveBodyMaterial);
      mount.position.y = 0.05;
      sheaveGroup.add(mount);

      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 8), sheaveRingMaterial);
      axle.rotation.z = Math.PI / 2;
      sheaveGroup.add(axle);

      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 16), sheaveBodyMaterial);
      wheel.rotation.z = Math.PI / 2;
      sheaveGroup.add(wheel);

      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 20), sheaveRingMaterial);
      guard.rotation.y = Math.PI / 2;
      sheaveGroup.add(guard);

      const dropLen = yTop + 0.35 - SPOOL_R - (CABLE_Y + 0.06);
      const dropMid = (yTop + 0.35 - SPOOL_R + CABLE_Y + 0.06) / 2;
      const dropCable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, dropLen, 8),
        new THREE.MeshPhongMaterial({ color: 0xd4b86a, shininess: 20 })
      );
      dropCable.position.set(gx, dropMid, gz);
      this.scene.add(dropCable);

      return new THREE.Vector3(gx, CABLE_Y, gz);
    });
  }

  buildRails() {
    const { HD, HW, RAIL_LEN, RAIL_Y } = this.constants;
    const railMaterial = new THREE.MeshPhongMaterial({
      color: 0x44576a,
      shininess: 90,
      specular: new THREE.Color(0x6688aa),
    });
    const railGeometry = new THREE.CylinderGeometry(0.055, 0.055, RAIL_LEN, 10);
    const capGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const capMaterial = new THREE.MeshPhongMaterial({ color: 0x5a7a8a, shininess: 90 });

    const addRail = (rx, rz, px, py, pz) => {
      const mesh = new THREE.Mesh(railGeometry, railMaterial);
      mesh.rotation.set(rx, 0, rz);
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      this.scene.add(mesh);
    };

    addRail(0, Math.PI / 2, 0, RAIL_Y, HD);
    addRail(0, Math.PI / 2, 0, RAIL_Y, -HD);
    addRail(Math.PI / 2, 0, HW, RAIL_Y, 0);
    addRail(Math.PI / 2, 0, -HW, RAIL_Y, 0);

    const halfLen = RAIL_LEN / 2;
    [
      [halfLen, RAIL_Y, HD], [-halfLen, RAIL_Y, HD], [halfLen, RAIL_Y, -HD], [-halfLen, RAIL_Y, -HD],
      [HW, RAIL_Y, halfLen], [HW, RAIL_Y, -halfLen], [-HW, RAIL_Y, halfLen], [-HW, RAIL_Y, -halfLen],
    ].forEach(([x, y, z]) => {
      const cap = new THREE.Mesh(capGeometry, capMaterial);
      cap.position.set(x, y, z);
      this.scene.add(cap);
    });
  }

  buildWinches() {
    const { yTop, SPOOL_R } = this.constants;
    const motorBodyMaterial = new THREE.MeshPhongMaterial({ color: 0x263340, shininess: 80, specular: new THREE.Color(0x445566) });
    const gearBoxMaterial = new THREE.MeshPhongMaterial({ color: 0x1e2a34, shininess: 70 });
    const spoolBodyMaterial = new THREE.MeshPhongMaterial({ color: 0x3a4c5a, shininess: 110, specular: new THREE.Color(0x5577aa) });
    const flangeMaterial = new THREE.MeshPhongMaterial({ color: 0x445a6a, shininess: 100 });
    const boltMaterial = new THREE.MeshPhongMaterial({ color: 0x8899bb, shininess: 140 });
    const ropeWrapMaterial = new THREE.MeshPhongMaterial({ color: 0xc8a83c, shininess: 15 });
    const wireBlackMaterial = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 10 });
    const wireRedMaterial = new THREE.MeshPhongMaterial({ color: 0xaa2222, shininess: 10 });
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x1a2530, shininess: 60 });
    const terminalMaterial = new THREE.MeshPhongMaterial({ color: 0xddcc44, shininess: 120 });

    const winchConfig = [
      { px: this.cornerXZ[0][0], py: yTop + 0.35, pz: this.cornerXZ[0][1], ry: (-3 * Math.PI) / 4 },
      { px: this.cornerXZ[1][0], py: yTop + 0.35, pz: this.cornerXZ[1][1], ry: -Math.PI / 4 },
      { px: this.cornerXZ[2][0], py: yTop + 0.35, pz: this.cornerXZ[2][1], ry: (3 * Math.PI) / 4 },
      { px: this.cornerXZ[3][0], py: yTop + 0.35, pz: this.cornerXZ[3][1], ry: Math.PI / 4 },
    ];

    winchConfig.forEach((config, index) => {
      const winchGroup = new THREE.Group();
      winchGroup.position.set(config.px, config.py, config.pz);
      winchGroup.rotation.y = config.ry;
      this.scene.add(winchGroup);

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.07, 0.52), baseMaterial);
      base.position.y = -0.22;
      winchGroup.add(base);

      [[-0.3, -0.16], [0.3, -0.16], [-0.3, 0.16], [0.3, 0.16]].forEach(([x, z]) => {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 6), boltMaterial);
        bolt.position.set(x, -0.18, z);
        winchGroup.add(bolt);
      });

      [-0.16, 0.16].forEach((x) => {
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.12), motorBodyMaterial);
        block.position.set(x, 0, -0.09);
        winchGroup.add(block);

        const bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.04, 10), boltMaterial);
        bearing.rotation.z = Math.PI / 2;
        bearing.position.set(x, 0, -0.09);
        winchGroup.add(bearing);
      });

      const spoolGroup = new THREE.Group();
      winchGroup.add(spoolGroup);
      this.spoolGroups[index] = spoolGroup;

      const drum = new THREE.Mesh(new THREE.CylinderGeometry(SPOOL_R, SPOOL_R, 0.26, 18), spoolBodyMaterial);
      drum.rotation.z = Math.PI / 2;
      spoolGroup.add(drum);

      [-0.14, 0.14].forEach((x) => {
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(SPOOL_R + 0.075, SPOOL_R + 0.075, 0.042, 18), flangeMaterial);
        flange.rotation.z = Math.PI / 2;
        flange.position.x = x;
        spoolGroup.add(flange);

        for (let boltIndex = 0; boltIndex < 6; boltIndex += 1) {
          const angle = (boltIndex / 6) * Math.PI * 2;
          const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.016, 5, 5), boltMaterial);
          bolt.position.set(x, Math.cos(angle) * (SPOOL_R + 0.05), Math.sin(angle) * (SPOOL_R + 0.05));
          spoolGroup.add(bolt);
        }
      });

      for (let wrapIndex = 0; wrapIndex < 4; wrapIndex += 1) {
        const wrap = new THREE.Mesh(new THREE.TorusGeometry(SPOOL_R + wrapIndex * 0.018 + 0.005, 0.012, 5, 24), ropeWrapMaterial);
        wrap.rotation.y = Math.PI / 2;
        wrap.position.x = -0.09 + wrapIndex * 0.06;
        spoolGroup.add(wrap);
      }

      const radialLine = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.022, 0.022), boltMaterial);
      radialLine.position.set(0, SPOOL_R + 0.01, 0);
      spoolGroup.add(radialLine);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.38, 8), boltMaterial);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.x = 0.3;
      winchGroup.add(shaft);

      const gearBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), gearBoxMaterial);
      gearBox.position.set(0.38, 0, 0);
      winchGroup.add(gearBox);

      const gearBoxLid = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.2), motorBodyMaterial);
      gearBoxLid.position.set(0.51, 0, 0);
      winchGroup.add(gearBoxLid);

      [[0.38, 0.12, 0.1], [0.38, -0.12, 0.1], [0.38, 0.12, -0.1], [0.38, -0.12, -0.1]].forEach(([x, y, z]) => {
        const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), boltMaterial);
        bolt.position.set(x, y, z);
        winchGroup.add(bolt);
      });

      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.46, 16), motorBodyMaterial);
      motor.rotation.z = Math.PI / 2;
      motor.position.x = 0.73;
      winchGroup.add(motor);

      for (let finIndex = 0; finIndex < 8; finIndex += 1) {
        const angle = (finIndex / 8) * Math.PI * 2;
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.024, 0.024), motorBodyMaterial);
        fin.rotation.x = angle;
        fin.position.set(0.73, Math.cos(angle + Math.PI / 2) * 0.185, Math.sin(angle + Math.PI / 2) * 0.185);
        winchGroup.add(fin);
      }

      const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.055, 16), flangeMaterial);
      endCap.rotation.z = Math.PI / 2;
      endCap.position.x = 0.975;
      winchGroup.add(endCap);

      [[0.06, 0.12], [0.06, -0.12]].forEach(([y, z]) => {
        const terminal = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 6), terminalMaterial);
        terminal.rotation.z = Math.PI / 2;
        terminal.position.set(1.01, y, z);
        winchGroup.add(terminal);
      });

      const blackWire = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.38, 6), wireBlackMaterial);
      blackWire.rotation.set(0.3, 0, 0.5);
      blackWire.position.set(1.05, -0.14, 0.12);
      winchGroup.add(blackWire);

      const redWire = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.38, 6), wireRedMaterial);
      redWire.rotation.set(0.4, 0, 0.55);
      redWire.position.set(1.05, -0.12, -0.12);
      winchGroup.add(redWire);

      const cableGuide = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.022, 8, 18), boltMaterial);
      cableGuide.rotation.x = Math.PI / 2;
      cableGuide.position.set(0, -(SPOOL_R + 0.1), 0);
      winchGroup.add(cableGuide);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 8), motorBodyMaterial);
      post.position.set(0, -(SPOOL_R + 0.04), 0);
      winchGroup.add(post);
    });
  }

  buildCables() {
    const cableMaterial = new THREE.MeshPhongMaterial({ color: 0xd4b86a, shininess: 25 });
    this.cableMeshes = this.anchorPts.map(() => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1, 8), cableMaterial);
      this.scene.add(mesh);
      return mesh;
    });
  }

  buildFan() {
    this.fanGroup = new THREE.Group();
    this.scene.add(this.fanGroup);

    this.fanGroup.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.35),
        new THREE.MeshPhongMaterial({ color: 0x223344, shininess: 70 })
      )
    );

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.37, 0.07, 10, 28),
      new THREE.MeshPhongMaterial({ color: 0x1a3050, shininess: 100 })
    );
    ring.castShadow = true;
    this.fanGroup.add(ring);

    this.bladeSpinner = new THREE.Group();
    this.fanGroup.add(this.bladeSpinner);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8),
      new THREE.MeshPhongMaterial({ color: 0x445566, shininess: 100 })
    );
    hub.rotation.x = Math.PI / 2;
    this.bladeSpinner.add(hub);

    for (let bladeIndex = 0; bladeIndex < 5; bladeIndex += 1) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.27, 0.045),
        new THREE.MeshPhongMaterial({ color: 0x2266aa, shininess: 70 })
      );
      const angle = (bladeIndex / 5) * Math.PI * 2;
      blade.position.set(Math.sin(angle) * 0.14, Math.cos(angle) * 0.14, 0);
      blade.rotation.z = angle;
      this.bladeSpinner.add(blade);
    }

    this.glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.37, 0.14, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0x2255bb, transparent: true, opacity: 0.2 })
    );
    this.fanGroup.add(this.glowRing);
  }

  buildTurbine() {
    const { WATER_Y } = this.constants;
    this.turbineGroup = new THREE.Group();
    this.scene.add(this.turbineGroup);

    const pontoon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.32, 16),
      new THREE.MeshPhongMaterial({ color: 0xf0f5ff, shininess: 80, specular: new THREE.Color(0xaaccee) })
    );
    pontoon.position.y = WATER_Y + 0.02;
    this.turbineGroup.add(pontoon);

    const redBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.635, 0.635, 0.09, 16, 1, true),
      new THREE.MeshPhongMaterial({ color: 0xcc2020, side: THREE.DoubleSide, shininess: 40 })
    );
    redBand.position.y = WATER_Y + 0.1;
    this.turbineGroup.add(redBand);

    const ringMaterial = new THREE.MeshPhongMaterial({ color: 0x889aaa, shininess: 130 });
    [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((angle) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 5, 12), ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(Math.cos(angle) * 0.55, WATER_Y - 0.02, Math.sin(angle) * 0.55);
      this.turbineGroup.add(ring);
    });

    const shaftY0 = WATER_Y + 0.17;
    const shaftY1 = WATER_Y + 2.4;
    const shaftH = shaftY1 - shaftY0;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, shaftH, 10),
      new THREE.MeshPhongMaterial({ color: 0x6677aa, shininess: 130, specular: new THREE.Color(0xaabbcc) })
    );
    shaft.position.y = shaftY0 + shaftH / 2;
    shaft.castShadow = true;
    this.turbineGroup.add(shaft);

    const rotorCenterY = WATER_Y + 1.4;
    const rotorHeight = 2.1;
    const discMaterial = new THREE.MeshPhongMaterial({ color: 0x1a5599, shininess: 90, specular: new THREE.Color(0x4477aa) });
    const bottomDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.07, 24), discMaterial);
    bottomDisc.position.y = rotorCenterY - rotorHeight / 2;
    bottomDisc.castShadow = true;
    this.turbineGroup.add(bottomDisc);

    this.rotorGroup = new THREE.Group();
    this.rotorGroup.position.y = rotorCenterY;
    this.turbineGroup.add(this.rotorGroup);

    const savRadius = 0.52;
    const savGeometry = new THREE.CylinderGeometry(savRadius, savRadius, rotorHeight - 0.12, 26, 1, false, 0, Math.PI);
    const shellA = new THREE.Mesh(
      savGeometry,
      new THREE.MeshPhongMaterial({ color: 0x1155bb, side: THREE.DoubleSide, shininess: 80, transparent: true, opacity: 0.92 })
    );
    shellA.position.x = savRadius * 0.5;
    shellA.castShadow = true;
    this.rotorGroup.add(shellA);

    const shellB = new THREE.Mesh(
      savGeometry,
      new THREE.MeshPhongMaterial({ color: 0x2288dd, side: THREE.DoubleSide, shininess: 80, transparent: true, opacity: 0.92 })
    );
    shellB.rotation.y = Math.PI;
    shellB.position.x = -savRadius * 0.5;
    shellB.castShadow = true;
    this.rotorGroup.add(shellB);

    const strutMaterial = new THREE.MeshPhongMaterial({ color: 0x334466 });
    [-0.72, 0, 0.72].forEach((y) => {
      [savRadius * 0.42, -savRadius * 0.42].forEach((x) => {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, savRadius * 1.05, 6), strutMaterial);
        strut.rotation.z = Math.PI / 2;
        strut.position.set(x, y, 0);
        this.rotorGroup.add(strut);
      });
    });
  }

  buildParticles() {
    this.pPos = new Float32Array(this.PC * 3);
    this.pVel = new Float32Array(this.PC * 3);
    this.pLife = new Float32Array(this.PC);
    this.pMax = new Float32Array(this.PC);

    this.pGeo = new THREE.BufferGeometry();
    this.pGeo.setAttribute("position", new THREE.BufferAttribute(this.pPos, 3));

    const points = new THREE.Points(
      this.pGeo,
      new THREE.PointsMaterial({ color: 0x66ddff, size: 0.07, transparent: true, opacity: 0.5, sizeAttenuation: true })
    );
    this.scene.add(points);
  }

  seedParticles() {
    for (let i = 0; i < this.PC; i += 1) {
      this.resetParticle(i);
      this.pLife[i] = Math.random() * this.pMax[i];
    }
  }

  getFanPos() {
    return this.sides[this.state.side].getPos((this.state.pos - 0.5) * this.constants.RAIL_LEN);
  }

  getFanDir() {
    return this.sides[this.state.side].dir.clone();
  }

  getOptimalPos() {
    const fanPosition = this.getFanPos();
    if (this.state.side === "N" || this.state.side === "S") {
      return new THREE.Vector3(fanPosition.x, 0, 0);
    }
    return new THREE.Vector3(0, 0, fanPosition.z);
  }

  getWindEffect() {
    const fanPosition = this.getFanPos();
    const fanDirection = this.getFanDir();
    const turbinePosition = this.turbineGroup.position;
    const toTurbine = new THREE.Vector3(turbinePosition.x - fanPosition.x, 0, turbinePosition.z - fanPosition.z);
    const distance = toTurbine.length();

    if (distance < 0.1) {
      return 0;
    }

    const normalizedDirection = new THREE.Vector3(fanDirection.x, 0, fanDirection.z).normalize();
    const alignment = Math.max(0, toTurbine.clone().normalize().dot(normalizedDirection));
    const lateralDistance = toTurbine.clone().sub(normalizedDirection.clone().multiplyScalar(toTurbine.dot(normalizedDirection))).length();

    return this.state.power * Math.exp(-distance * 0.11) * Math.exp(-lateralDistance * 0.85) * alignment;
  }

  resetParticle(index) {
    const fanPosition = this.getFanPos();
    const fanDirection = this.getFanDir();
    const speed = (0.04 + Math.random() * 0.07) * (0.35 + this.state.power * 0.65) * 2.2;

    this.pPos[index * 3] = fanPosition.x + (Math.random() - 0.5) * 0.25;
    this.pPos[index * 3 + 1] = fanPosition.y + (Math.random() - 0.5) * 0.18;
    this.pPos[index * 3 + 2] = fanPosition.z + (Math.random() - 0.5) * 0.25;

    this.pVel[index * 3] = fanDirection.x * speed + (Math.random() - 0.5) * 0.007;
    this.pVel[index * 3 + 1] = 0;
    this.pVel[index * 3 + 2] = fanDirection.z * speed + (Math.random() - 0.5) * 0.007;

    this.pLife[index] = 0;
    this.pMax[index] = 0.9 + Math.random();
  }

  resetParticles() {
    for (let i = 0; i < this.PC; i += 1) {
      this.resetParticle(i);
    }
  }

  updateFan() {
    this.fanGroup.position.copy(this.getFanPos());
    this.fanGroup.rotation.y = this.sides[this.state.side].rotY;
  }

  updateCables() {
    const { CABLE_Y, SPOOL_R } = this.constants;
    const tx = this.turbineGroup.position.x;
    const tz = this.turbineGroup.position.z;

    this.anchorPts.forEach((anchor, index) => {
      const dx = tx - anchor.x;
      const dz = tz - anchor.z;
      const len = Math.sqrt(dx * dx + dz * dz);

      if (len < 0.001) {
        return;
      }

      this.cableMeshes[index].position.set((anchor.x + tx) / 2, CABLE_Y, (anchor.z + tz) / 2);
      this.cableMeshes[index].scale.y = len;
      this.tmpDir.set(dx, 0, dz).normalize();
      this.cableMeshes[index].quaternion.setFromUnitVectors(this.up, this.tmpDir);
      this.sheaveGroups[index].rotation.y = Math.atan2(-dz, dx) + Math.PI / 2;

      if (this.prevCableLens[index] !== null) {
        this.spoolAngles[index] += (len - this.prevCableLens[index]) / SPOOL_R;
        this.spoolGroups[index].rotation.x = this.spoolAngles[index];
      }

      this.prevCableLens[index] = len;
    });
  }

  updateWater(elapsedTime) {
    for (let i = 0; i < this.iwPts.count; i += 1) {
      this.iwPts.setZ(
        i,
        Math.sin(this.iwX[i] * 0.45 + elapsedTime * 1.7) * 0.045 +
        Math.sin(this.iwY[i] * 0.55 + elapsedTime * 1.3) * 0.035 +
        Math.sin((this.iwX[i] + this.iwY[i]) * 0.3 + elapsedTime * 0.9) * 0.02
      );
    }

    this.iwPts.needsUpdate = true;
    this.iwGeo.computeVertexNormals();
  }

  updateParticles(deltaTime) {
    if (this.state.power <= 0.02) {
      return;
    }

    for (let i = 0; i < this.PC; i += 1) {
      this.pLife[i] += deltaTime;

      if (this.pLife[i] >= this.pMax[i]) {
        this.resetParticle(i);
      } else {
        this.pPos[i * 3] += this.pVel[i * 3];
        this.pPos[i * 3 + 1] += this.pVel[i * 3 + 1];
        this.pPos[i * 3 + 2] += this.pVel[i * 3 + 2];
      }
    }

    this.pGeo.attributes.position.needsUpdate = true;
  }

  updateTurbine(deltaTime, elapsedTime) {
    this.turbineGroup.position.x += (this.turbineState.target.x - this.turbineGroup.position.x) * deltaTime * 1.9;
    this.turbineGroup.position.z += (this.turbineState.target.z - this.turbineGroup.position.z) * deltaTime * 1.9;
    this.turbineGroup.rotation.x = Math.sin(elapsedTime * 0.8) * 0.012;
    this.turbineGroup.rotation.z = Math.sin(elapsedTime * 1.1 + 0.5) * 0.012;

    const windEffect = this.getWindEffect();
    this.turbineState.rotSpeed += (windEffect * 240 - this.turbineState.rotSpeed) * deltaTime * 1.6;
    this.rotorGroup.rotation.y += (this.turbineState.rotSpeed / 60) * Math.PI * 2 * deltaTime;

    if (this.turbineState.seeking) {
      this.turbineState.seekTimer -= deltaTime;

      if (this.turbineState.seekTimer <= 0) {
        this.turbineState.seeking = false;
        this.emit("seekComplete", { windEffect: this.getWindEffect() });
      }
    }

    return windEffect;
  }

  animate() {
    requestAnimationFrame(this.boundAnimate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    const elapsedTime = this.clock.getElapsedTime();

    this.updateWater(elapsedTime);

    this.subLight.position.x = Math.sin(elapsedTime * 0.7) * 1.5;
    this.subLight.position.z = Math.cos(elapsedTime * 0.5) * 1.5;
    this.subLight.intensity = 3 + Math.sin(elapsedTime * 2.1) * 0.7;

    this.bladeSpinner.rotation.z -= deltaTime * (3 + this.state.power * 22);
    this.glowRing.material.opacity = 0.06 + this.state.power * 0.3;

    const windEffect = this.updateTurbine(deltaTime, elapsedTime);
    this.updateParticles(deltaTime);
    this.updateCables();

    this.emit("frame", { rpm: this.turbineState.rotSpeed, windEffect });

    this.orbit.update();
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    const { innerWidth, innerHeight } = window;
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
}
