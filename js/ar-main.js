/* AR main — MindAR Image + Three.js */
(async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const scanHint       = document.getElementById('scan-hint');
    const loadingSub     = document.getElementById('loading-sub');
    const startBtn       = document.getElementById('start-ar-btn');
    const progressWrap   = document.getElementById('progress-wrap');
    const spinner        = document.getElementById('spinner');

    window.onerror = (msg, src, line) => {
        loadingOverlay.classList.remove('hidden');
        loadingSub.textContent = '❌ JS Error: ' + msg + ' (line ' + line + ')';
        loadingSub.style.color = '#ff6666';
    };

    // Wait for MINDAR bundle to set window.MINDAR (up to 120 s)
    loadingSub.textContent = 'Preparing AR engine...';
    const mindarReady = await new Promise((resolve, reject) => {
        if (window.MINDAR && window.MINDAR.IMAGE) return resolve();
        let tries = 0;
        const check = setInterval(() => {
            tries++;
            if (window.MINDAR && window.MINDAR.IMAGE) { clearInterval(check); resolve(); }
            else if (tries > 1200) { clearInterval(check); reject(new Error('AR engine did not load')); }
        }, 100);
    }).catch(err => {
        loadingSub.textContent = '❌ ' + err.message + '. Reload page.';
        loadingSub.style.color = '#ff6666';
        return 'failed';
    });
    if (mindarReady === 'failed') return;

    const THREE           = window.MINDAR.IMAGE.THREE;
    const { MindARThree } = window.MINDAR.IMAGE;

    // ── Show button immediately — iOS requires a user tap before camera access ──
    if (progressWrap) progressWrap.style.display = 'none';
    loadingSub.textContent = 'Ready!';
    startBtn.style.display = 'block';

    await new Promise(resolve => {
        startBtn.addEventListener('click', resolve, { once: true });
    });

    // ── User tapped — now do all the heavy setup ──────────────────────────────
    startBtn.style.display = 'none';
    spinner.style.display  = 'block';
    loadingSub.textContent = 'Starting AR engine...';

    const POSITIONS = [
        [-0.9,  0.6, 0.0],
        [-0.3,  0.6, 0.0],
        [ 0.3,  0.6, 0.0],
        [ 0.9,  0.6, 0.0],
        [-0.9, -0.6, 0.0],
        [-0.3, -0.6, 0.0],
        [ 0.3, -0.6, 0.0],
        [ 0.9, -0.6, 0.0],
    ];
    const LOGO_SIZE = 0.42;

    const mindarThree = new MindARThree({
        container: document.querySelector('#ar-container'),
        imageTargetSrc: 'assets/targets/cu-logo.mind',
        maxTrack: 1,
        filterMinCF: 0.001,
        filterBeta: 1000,
        warmupTolerance: 5,
        missTolerance: 5,
    });

    const { renderer, scene, camera } = mindarThree;
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    loadingSub.textContent = 'Loading department logos...';
    const anchor = mindarThree.addAnchor(0);
    const meshes = [];

    function makeFallbackTexture(label) {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#003366';
        ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, 116, 116);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 64, 64);
        return new THREE.CanvasTexture(c);
    }

    function loadTexture(url, label) {
        return new Promise((resolve) => {
            new THREE.TextureLoader().load(
                url,
                (tex) => resolve(tex),
                undefined,
                ()    => resolve(makeFallbackTexture(label))
            );
        });
    }

    for (let i = 0; i < DEPARTMENTS.length && i < 8; i++) {
        const dept    = DEPARTMENTS[i];
        const texture = await loadTexture(dept.logo_path, dept.code);

        const mat  = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.05,
            emissive: new THREE.Color(0x222244),
            emissiveIntensity: 0.3,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(LOGO_SIZE, LOGO_SIZE), mat);
        mesh.position.set(...POSITIONS[i]);
        mesh.userData = { departmentId: dept.id };
        anchor.group.add(mesh);
        meshes.push(mesh);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(LOGO_SIZE / 2 + 0.01, LOGO_SIZE / 2 + 0.04, 32),
            new THREE.MeshBasicMaterial({ color: 0x4a9eff, side: THREE.DoubleSide })
        );
        ring.position.set(...POSITIONS[i]);
        anchor.group.add(ring);
    }

    // ── Raycasting ───────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointer   = new THREE.Vector2();

    function handleInteraction(event) {
        // Use changedTouches for touch events, clientX/Y for mouse
        const src = event.changedTouches ? event.changedTouches[0] : event;
        if (!src) return;
        // Coordinates relative to full viewport (MindAR canvas fills the screen)
        pointer.x =  (src.clientX / window.innerWidth)  * 2 - 1;
        pointer.y = -(src.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(meshes);
        if (hits.length > 0) {
            const id = hits[0].object.userData.departmentId;
            window.location.href = 'department.html?id=' + id;
        }
    }

    // Listen on document so MindAR's overlay doesn't block the events
    document.addEventListener('touchend', handleInteraction);
    document.addEventListener('click',    handleInteraction);

    anchor.onTargetFound = () => { scanHint.classList.add('hidden'); };
    anchor.onTargetLost  = () => { scanHint.classList.remove('hidden'); };

    // ── Start AR camera ───────────────────────────────────────────────────────
    loadingSub.textContent = 'Starting camera...';

    const timeout = setTimeout(() => {
        loadingOverlay.innerHTML =
            '<p class="error-msg">Camera timed out.<br><br>' +
            '• Tap <strong>Allow</strong> when asked for camera<br>' +
            '• Reload and try again</p>';
    }, 90000);

    try {
        await mindarThree.start();
        clearTimeout(timeout);
    } catch (err) {
        clearTimeout(timeout);
        loadingOverlay.innerHTML =
            '<p class="error-msg">Could not start camera.<br><br>' +
            '• Tap <strong>Allow</strong> when asked for camera access<br>' +
            '• Make sure no other app is using the camera<br>' +
            '• Reload and try again</p>';
        return;
    }

    loadingOverlay.classList.add('hidden');
    scanHint.classList.remove('hidden');

    renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
    });
})();
