/* AR main — MindAR Image + Three.js
 * Everything that does not need the camera (engine, scene, logos, target file)
 * is prepared BEFORE the tap, so "Start AR camera" only has to open the camera.
 * The page can be left (tap a logo) and come back (Back button / bfcache):
 * the camera is stopped on pagehide and the Start button is shown again on pageshow. */
(async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const scanHint       = document.getElementById('scan-hint');
    const loadingSub     = document.getElementById('loading-sub');
    const startBtn       = document.getElementById('start-ar-btn');
    const progressWrap   = document.getElementById('progress-wrap');
    const spinner        = document.getElementById('spinner');

    const TARGET_SRC = 'assets/targets/cu-logo.mind';
    let state = 'preparing';        // preparing | ready | starting | running
    let navigating = false;

    function showError(text) {
        loadingOverlay.classList.remove('hidden');
        scanHint.classList.add('hidden');
        spinner.style.display  = 'none';
        loadingSub.textContent = '❌ ' + text;
        loadingSub.style.color = '#ff6666';
        startBtn.style.display = 'flex';      // always leave a way to try again
        startBtn.textContent   = 'Try again';
    }

    function showReady() {
        loadingOverlay.classList.remove('hidden');
        scanHint.classList.add('hidden');
        if (progressWrap) progressWrap.style.display = 'none';
        spinner.style.display  = 'none';
        loadingSub.style.color = '';
        loadingSub.textContent = 'Ready — tap to start the camera';
        startBtn.textContent   = 'Start AR camera';
        startBtn.style.display = 'flex';
    }

    // Only report errors that happen while the camera is starting/running on THIS visit.
    // "Script error." (no details, line 0) comes from browser internals / extensions and is ignored.
    window.onerror = (msg, src, line) => {
        if (navigating || (state !== 'starting' && state !== 'running')) return;
        if (!line || /^Script error/i.test(String(msg))) return;
        console.error('[AR]', msg, src, line);
    };

    // Start downloading the target file now so it is cached when the camera starts.
    fetch(TARGET_SRC).catch(() => {});

    // ── Wait for the MindAR bundle (index.html loads it) ─────────────────────
    loadingSub.textContent = 'Preparing AR engine...';
    const ok = await new Promise(resolve => {
        if (window.MINDAR && window.MINDAR.IMAGE) return resolve(true);
        let tries = 0;
        const check = setInterval(() => {
            tries++;
            if (window.MINDAR && window.MINDAR.IMAGE) { clearInterval(check); resolve(true); }
            else if (tries > 1200) { clearInterval(check); resolve(false); }
        }, 100);
    });
    if (!ok) { showError('AR engine did not load. Reload the page.'); startBtn.style.display = 'none'; return; }

    const THREE           = window.MINDAR.IMAGE.THREE;
    const { MindARThree } = window.MINDAR.IMAGE;

    // ── Build the scene before the tap ───────────────────────────────────────
    loadingSub.textContent = 'Loading department logos...';
    const POSITIONS = [
        [-0.9,  0.6, 0.0], [-0.3,  0.6, 0.0], [ 0.3,  0.6, 0.0], [ 0.9,  0.6, 0.0],
        [-0.9, -0.6, 0.0], [-0.3, -0.6, 0.0], [ 0.3, -0.6, 0.0], [ 0.9, -0.6, 0.0],
    ];
    const LOGO_SIZE = 0.42;

    const mindarThree = new MindARThree({
        container: document.querySelector('#ar-container'),
        imageTargetSrc: TARGET_SRC,
        maxTrack: 1,
        filterMinCF: 0.001,
        filterBeta: 1000,
        warmupTolerance: 5,
        missTolerance: 5,
    });
    const { renderer, scene, camera } = mindarThree;
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const anchor = mindarThree.addAnchor(0);
    const meshes = [];

    function makeFallbackTexture(label) {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#003366'; ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeRect(6, 6, 116, 116);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, 64, 64);
        return new THREE.CanvasTexture(c);
    }
    function loadTexture(url, label) {
        return new Promise(resolve => {
            new THREE.TextureLoader().load(url, resolve, undefined, () => resolve(makeFallbackTexture(label)));
        });
    }

    const depts    = (window.DEPARTMENTS || []).slice(0, 8);
    const textures = await Promise.all(depts.map(d => loadTexture(d.logo_path, d.code)));   // parallel, not one by one
    depts.forEach((dept, i) => {
        const mat = new THREE.MeshStandardMaterial({
            map: textures[i], transparent: true, alphaTest: 0.05,
            emissive: new THREE.Color(0x222244), emissiveIntensity: 0.3,
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
    });

    // ── Tap a logo → department page ─────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointer   = new THREE.Vector2();
    function handleInteraction(event) {
        if (state !== 'running' || navigating) return;
        const src = event.changedTouches ? event.changedTouches[0] : event;
        if (!src) return;
        pointer.x =  (src.clientX / window.innerWidth)  * 2 - 1;
        pointer.y = -(src.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(meshes);
        if (hits.length > 0) {
            navigating = true;
            stopAR();                                   // release the camera before leaving
            window.location.href = 'department.html?id=' + hits[0].object.userData.departmentId;
        }
    }
    document.addEventListener('touchend', handleInteraction);
    document.addEventListener('click',    handleInteraction);

    anchor.onTargetFound = () => { scanHint.classList.add('hidden'); };
    anchor.onTargetLost  = () => { if (state === 'running') scanHint.classList.remove('hidden'); };

    // ── Start / stop ─────────────────────────────────────────────────────────
    function stopAR() {
        if (state !== 'running' && state !== 'starting') return;
        state = 'ready';
        renderer.setAnimationLoop(null);
        try { mindarThree.stop(); } catch (e) { /* camera may already be gone */ }
        try { mindarThree.ui.hideScanning(); mindarThree.ui.hideLoading(); } catch (e) {}
        scanHint.classList.add('hidden');
    }

    async function startAR() {
        if (state !== 'ready') return;
        state = 'starting';
        startBtn.style.display = 'none';
        spinner.style.display  = 'block';
        loadingSub.style.color = '';
        loadingSub.textContent = 'Starting camera...';

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 60000));
        try {
            await Promise.race([mindarThree.start(), timeout]);
        } catch (err) {
            state = 'ready';
            try { mindarThree.stop(); } catch (e) {}
            showError(err && err.message === 'timeout'
                ? 'Camera timed out. Tap Allow when asked for the camera.'
                : 'Could not start the camera. Allow camera access and make sure no other app is using it.');
            return;
        }
        if (state !== 'starting') return;            // page was left while starting
        state = 'running';
        loadingOverlay.classList.add('hidden');
        scanHint.classList.remove('hidden');
        renderer.setAnimationLoop(() => renderer.render(scene, camera));
    }

    startBtn.addEventListener('click', startAR);

    // Leaving the page (logo tap, app switch, back/forward) → stop the camera.
    window.addEventListener('pagehide', stopAR);
    // Coming back from the department page (restored from the back/forward cache) → show Start again.
    window.addEventListener('pageshow', e => {
        if (!e.persisted) return;
        navigating = false;
        stopAR();
        showReady();
    });

    state = 'ready';
    showReady();
})();
