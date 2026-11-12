/* Mascot viewer — classic script, requires window.THREE from three.min.js
 *
 * Each department mascot is built procedurally from Three.js primitives
 * (stylised low-poly), so no external GLB files are needed.
 *   falcon    → College of Computer Studies
 *   python    → College of Health Sciences
 *   phoenix   → College of Education (Blue Phoenix)
 *   warrior   → College of Criminology (Purple Warrior)
 *   beaver    → College of Engineering
 *   eagle     → College of Business and Accountancy
 *   redknight → College of Arts and Sciences (Red Knight)
 *   dolphin   → College of Maritime Education
 */
(function () {
    var container = document.getElementById('mascot-viewer');
    if (!container) return;

    var mascotName = container.dataset.mascot || '';
    var mascotType = (container.dataset.type || '').toLowerCase();
    var THREE      = window.THREE;

    if (!THREE) {
        container.innerHTML = '<div class="viewer-loading"><p style="color:#b89898">3D viewer unavailable</p></div>';
        return;
    }

    var W = container.clientWidth || 400;
    var H = container.clientHeight || 340;
    var PLATFORM_TOP = -0.57;
    var TAU = Math.PI * 2;

    // ── Themes per mascot ────────────────────────────────────────────────────
    var THEMES = {
        falcon:    { bg: 0x06101d, plat: 0x16263d, ring: 0x6fa8dc, fill: 0x3d7bd9, rim: 0x9fd0ff },
        python:    { bg: 0x04130a, plat: 0x12321d, ring: 0x58c27d, fill: 0x2e9e5b, rim: 0xb8f5c8 },
        phoenix:   { bg: 0x030a1c, plat: 0x0e2147, ring: 0x37d5ff, fill: 0x1f8fff, rim: 0x7fe8ff },
        warrior:   { bg: 0x0e0618, plat: 0x2b1442, ring: 0xd4af37, fill: 0x9b59d0, rim: 0xe0b8ff },
        beaver:    { bg: 0x120b04, plat: 0x3a2814, ring: 0xffc107, fill: 0xd18b3c, rim: 0xffe0a0 },
        eagle:     { bg: 0x050a16, plat: 0x14213d, ring: 0xd4af37, fill: 0x4466aa, rim: 0xfff0c0 },
        redknight: { bg: 0x140305, plat: 0x3d0a10, ring: 0xd4af37, fill: 0xc0303a, rim: 0xffc0c0 },
        dolphin:   { bg: 0x02101a, plat: 0x0c2c44, ring: 0x4fc3f7, fill: 0x2a8bd0, rim: 0xb3ecff }
    };
    var theme = THEMES[mascotType] || THEMES.falcon;

    // ── Renderer ────────────────────────────────────────────────────────────
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace  = THREE.SRGBColorSpace;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setSize(W, H);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    // ── Scene ────────────────────────────────────────────────────────────────
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.bg);
    scene.fog        = new THREE.Fog(theme.bg, 6, 14);

    var camera = new THREE.PerspectiveCamera(40, W / H, 0.01, 200);
    var target = new THREE.Vector3(0, 0.3, 0);

    // ── Environment (soft studio reflections for metal parts) ────────────────
    (function () {
        var env = new THREE.Scene();
        var skyGeo = new THREE.SphereGeometry(10, 32, 16);
        var cols = [], pa = skyGeo.attributes.position, top = new THREE.Color(0xffffff),
            mid = new THREE.Color(theme.fill).lerp(new THREE.Color(0x888888), 0.5), bot = new THREE.Color(0x111111), cc = new THREE.Color();
        for (var i = 0; i < pa.count; i++) {
            var y = pa.getY(i) / 10;
            if (y > 0) cc.copy(mid).lerp(top, y); else cc.copy(mid).lerp(bot, -y);
            cols.push(cc.r, cc.g, cc.b);
        }
        skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        env.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
        var panel = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
        panel.position.set(4, 5, 5); panel.lookAt(0, 0, 0); env.add(panel);
        var panel2 = panel.clone(); panel2.position.set(-6, 2, -3); panel2.lookAt(0, 0, 0); env.add(panel2);
        var pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(env, 0.04).texture;
        scene.environmentIntensity = 0.6;
    })();

    // ── Lights ───────────────────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0xffffff, theme.plat, 0.9));
    var key = new THREE.DirectionalLight(0xfff4e6, 2.2);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2; key.shadow.camera.right = 2;
    key.shadow.camera.top  =  3; key.shadow.camera.bottom = -2;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 20;
    key.shadow.bias = -0.0005;
    scene.add(key);
    var fill = new THREE.DirectionalLight(theme.fill, 1.0);
    fill.position.set(-4, 2, 2);
    scene.add(fill);
    var rim = new THREE.DirectionalLight(theme.rim, 1.6);
    rim.position.set(0, 3, -5);
    scene.add(rim);

    // ── Platform ─────────────────────────────────────────────────────────────
    var platform = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.5, 0.12, 64),
        new THREE.MeshStandardMaterial({ color: theme.plat, metalness: 0.4, roughness: 0.45 })
    );
    platform.position.y = PLATFORM_TOP - 0.06;
    platform.receiveShadow = true;
    scene.add(platform);

    var ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.42, 0.025, 8, 96),
        new THREE.MeshBasicMaterial({ color: theme.ring })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = PLATFORM_TOP + 0.005;
    scene.add(ring);

    var innerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.95, 0.98, 64),
        new THREE.MeshBasicMaterial({ color: theme.ring, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = PLATFORM_TOP + 0.003;
    scene.add(innerRing);

    // ════════════════════════════════════════════════════════════════════════
    //  Helpers
    // ════════════════════════════════════════════════════════════════════════
    function M(color, o) {
        var p = { color: color, roughness: 0.6, metalness: 0.0, flatShading: true };
        if (o) for (var k in o) p[k] = o[k];
        return new THREE.MeshStandardMaterial(p);
    }
    function Metal(color, o) {
        var p = { roughness: 0.3, metalness: 0.75 };
        if (o) for (var k in o) p[k] = o[k];
        return M(color, p);
    }
    function add(parent, geo, mat, p, r, s) {
        var m = new THREE.Mesh(geo, mat);
        if (p) m.position.set(p[0], p[1], p[2]);
        if (r) m.rotation.set(r[0], r[1], r[2]);
        if (s) m.scale.set(s[0], s[1], s[2]);
        parent.add(m);
        return m;
    }
    function grp(parent, p, r) {
        var g = new THREE.Group();
        if (p) g.position.set(p[0], p[1], p[2]);
        if (r) g.rotation.set(r[0], r[1], r[2]);
        if (parent) parent.add(g);
        return g;
    }
    function SPH(r, w, h) { return new THREE.SphereGeometry(r, w || 18, h || 14); }
    function HEMI(r) { return new THREE.SphereGeometry(r, 18, 8, 0, TAU, 0, Math.PI / 2); }
    function CYL(rt, rb, h, s) { return new THREE.CylinderGeometry(rt, rb, h, s || 12); }
    function CONE(r, h, s) { return new THREE.ConeGeometry(r, h, s || 10); }
    function BOX(x, y, z) { return new THREE.BoxGeometry(x, y, z); }
    function extrude(shape, depth) {
        var g = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
        g.translate(0, 0, -depth / 2);
        return g;
    }
    function shapeFrom(pts) {
        var s = new THREE.Shape();
        s.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
        s.closePath();
        return s;
    }
    function starShape(rOut, rIn, n) {
        var pts = [];
        for (var i = 0; i < n * 2; i++) {
            var a = Math.PI / 2 + i * Math.PI / n;
            var r = i % 2 ? rIn : rOut;
            pts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        return shapeFrom(pts);
    }

    // Eye built in a head-local frame: the iris faces away from the head centre.
    function eye(parent, pos, r, iris, opts) {
        opts = opts || {};
        var smooth = { flatShading: false, roughness: 0.25 };
        var g = grp(parent, pos);
        var dir = new THREE.Vector3(pos[0], pos[1], pos[2]).normalize();
        if (opts.forward) dir.lerp(new THREE.Vector3(0, 0, 1), opts.forward).normalize();
        add(g, SPH(r, 16, 12), M(opts.white || 0xffffff, smooth));
        var ir = add(g, SPH(r * 0.68, 16, 12), M(iris, opts.glow ? { flatShading: false, emissive: iris, emissiveIntensity: 1.2 } : smooth));
        ir.position.copy(dir).multiplyScalar(r * 0.5);
        if (opts.slit) {
            var sl = add(g, BOX(r * 0.22, r * 1.1, r * 0.1), M(0x050505, smooth));
            sl.position.copy(dir).multiplyScalar(r * 0.98);
            sl.lookAt(sl.position.clone().add(dir));
        } else if (!opts.glow) {
            var pu = add(g, SPH(r * 0.36, 12, 10), M(0x080808, smooth));
            pu.position.copy(dir).multiplyScalar(r * 0.82);
        }
        var hl = add(g, SPH(r * 0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        hl.position.copy(dir).multiplyScalar(r * 0.95).add(new THREE.Vector3(r * 0.25, r * 0.3, 0));
        return g;
    }

    function roundTexture() {
        var c = document.createElement('canvas');
        c.width = c.height = 64;
        var x = c.getContext('2d');
        var gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.35, 'rgba(255,255,255,0.8)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr;
        x.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
    }

    // Rising glowing particles (embers / bubbles / sparks)
    function particles(count, color, area, speed, size) {
        var geo = new THREE.BufferGeometry();
        var pos = new Float32Array(count * 3);
        var life = [];
        for (var i = 0; i < count; i++) {
            pos[i * 3]     = (Math.random() - 0.5) * area.x;
            pos[i * 3 + 1] = area.y0 + Math.random() * area.h;
            pos[i * 3 + 2] = (Math.random() - 0.5) * area.z;
            life.push(0.5 + Math.random());
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        var mat = new THREE.PointsMaterial({
            color: color, size: size || 0.06, map: roundTexture(), transparent: true,
            depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9
        });
        var pts = new THREE.Points(geo, mat);
        pts.userData.update = function (t, dt) {
            for (var i = 0; i < count; i++) {
                pos[i * 3 + 1] += dt * speed * life[i];
                pos[i * 3]     += Math.sin(t * 2 + i) * dt * 0.08;
                if (pos[i * 3 + 1] > area.y0 + area.h) {
                    pos[i * 3]     = (Math.random() - 0.5) * area.x;
                    pos[i * 3 + 1] = area.y0;
                    pos[i * 3 + 2] = (Math.random() - 0.5) * area.z;
                }
            }
            geo.attributes.position.needsUpdate = true;
        };
        return pts;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Birds: Falcon, Eagle, Blue Phoenix
    // ════════════════════════════════════════════════════════════════════════
    function buildBird(o) {
        var root = new THREE.Group();
        var anim = [];

        // Legs + talons
        var footMat = M(o.feet);
        var talonMat = M(0x222222);
        [-1, 1].forEach(function (s) {
            var leg = grp(root, [s * 0.13, 0, 0.02]);
            add(leg, CYL(0.04, 0.035, 0.3, 8), footMat, [0, 0.17, 0]);
            add(leg, SPH(0.075, 10, 8), M(o.legFeather || o.belly), [0, 0.33, 0], null, [1, 1.3, 1]);
            for (var k = -1; k <= 1; k++) {
                var toe = grp(leg, [0, 0.03, 0], [0, k * 0.45, 0]);
                add(toe, CYL(0.025, 0.02, 0.14, 6), footMat, [0, 0, 0.07], [Math.PI / 2, 0, 0]);
                add(toe, CONE(0.02, 0.06, 6), talonMat, [0, -0.01, 0.16], [Math.PI / 2 + 0.6, 0, 0]);
            }
            add(leg, CYL(0.022, 0.02, 0.1, 6), footMat, [0, 0.03, -0.05], [-Math.PI / 2, 0, 0]);
        });

        // Body
        var body = grp(root, [0, 0.72, 0], [0.18, 0, 0]);
        add(body, SPH(0.42), M(o.body), null, null, [1, 1.25, 0.95]);
        add(body, SPH(0.36), M(o.belly), [0, -0.06, 0.15], null, [0.92, 1.12, 0.72]);
        if (o.spots) {
            var spotMat = M(o.spots);
            for (var i = 0; i < 14; i++) {
                var a = (i % 5 - 2) * 0.28, yy = -0.32 + Math.floor(i / 5) * 0.2 + (i % 2) * 0.05;
                var sp = add(body, SPH(0.03, 6, 5), spotMat,
                    [Math.sin(a) * 0.3, yy, 0.15 + Math.cos(a) * 0.25], null, [1, 0.6, 0.5]);
                sp.lookAt(sp.position.clone().multiplyScalar(2));
            }
        }

        // Tail
        var tail = grp(root, [0, 0.42, -0.3], [0.85, 0, 0]);
        var tailMat = M(o.tail || o.wingTip, o.tailGlow ? { emissive: o.tailGlow, emissiveIntensity: 0.6 } : null);
        for (var f = 0; f < 5; f++) {
            var fg = grp(tail, null, [0, 0, (f - 2) * 0.2]);
            var fe = add(fg, BOX(0.1, 0.45, 0.03), tailMat, [0, -0.22, 0]);
            fe.castShadow = true;
        }

        // Neck ruff + head
        if (o.ruff) add(root, SPH(0.3), M(o.head), [0, 1.08, 0.08], null, [1, 0.8, 0.95]);
        var head = grp(root, [0, 1.22, 0.12]);
        add(head, SPH(0.27), M(o.head));
        if (o.hood) {
            var hood = add(head, HEMI(0.285), M(o.hood), [0, 0.0, -0.02], [-0.45, 0, 0]);
            add(head, SPH(0.08, 8, 6), M(o.hood), [0.17, -0.1, 0.13], [0, 0, -0.3], [0.45, 1.3, 0.6]);
            add(head, SPH(0.08, 8, 6), M(o.hood), [-0.17, -0.1, 0.13], [0, 0, 0.3], [0.45, 1.3, 0.6]);
        }
        // Beak: upper + hooked tip + cere
        var beakMat = M(o.beak, { roughness: 0.35 });
        add(head, CONE(0.085, 0.24, 8), beakMat, [0, -0.04, 0.3], [Math.PI / 2 + 0.25, 0, 0]);
        add(head, CONE(0.035, 0.1, 6), beakMat, [0, -0.11, 0.39], [Math.PI, 0, 0]);
        add(head, SPH(0.08, 10, 8), M(o.cere || o.beak), [0, 0.0, 0.22], null, [1, 0.7, 0.6]);
        // Eyes + fierce brows
        [-1, 1].forEach(function (s) {
            eye(head, [s * 0.14, 0.05, 0.19], 0.065, o.iris, { forward: 0.35, glow: o.eyeGlow });
            if (o.eyeRing) add(head, new THREE.TorusGeometry(0.068, 0.014, 6, 16), M(o.eyeRing),
                [s * 0.145, 0.05, 0.195], [0, s * 0.62, 0]);
            add(head, BOX(0.17, 0.04, 0.09), M(o.brow || o.head), [s * 0.13, 0.13, 0.2], [0.2, 0, s * 0.32]);
        });
        if (o.crest) {
            var crestMat = M(o.crest, { emissive: o.crest, emissiveIntensity: 0.8 });
            for (var c = 0; c < 5; c++) {
                var cr = add(head, CONE(0.06 - c * 0.006, 0.42 - c * 0.04, 6), crestMat,
                    [0, 0.22 - c * 0.02, 0.06 - c * 0.1], [-0.5 - c * 0.22, 0, 0]);
                cr.castShadow = true;
            }
        }

        // Wings
        var wingShape = shapeFrom([
            [0, 0.1], [0.3, 0.22], [0.62, 0.2], [0.9, 0.08], [1.05, -0.06],
            [0.92, -0.16], [0.86, -0.08], [0.76, -0.3], [0.68, -0.18], [0.56, -0.4],
            [0.48, -0.24], [0.36, -0.44], [0.28, -0.26], [0.15, -0.38], [0.08, -0.2], [0, -0.16]
        ]);
        var covertShape = shapeFrom([
            [0, 0.1], [0.3, 0.22], [0.62, 0.2], [0.8, 0.1], [0.66, -0.04],
            [0.5, -0.12], [0.34, -0.1], [0.18, -0.16], [0, -0.1]
        ]);
        var wingMat   = M(o.wingTip, { side: THREE.DoubleSide, emissive: o.wingGlow || 0x000000, emissiveIntensity: o.wingGlow ? 0.7 : 0 });
        var covertMat = M(o.wing, { side: THREE.DoubleSide });
        var wingGeo   = extrude(wingShape, 0.04);
        var covertGeo = extrude(covertShape, 0.04);
        var wings = [];
        [-1, 1].forEach(function (s) {
            var wr = grp(root, [s * 0.3, 0.98, -0.08]);
            wr.scale.x = s;
            var pivot = grp(wr, null, [0, o.wingSweep || 0.45, o.wingLift || 0.35]);
            var wm = add(pivot, wingGeo, wingMat, null, null, [o.span, o.span, 1]);
            add(pivot, covertGeo, covertMat, [0, 0, 0.035], null, [o.span, o.span, 1]);
            wm.castShadow = true;
            wings.push(pivot);
        });

        anim.push(function (t) {
            var flap = Math.sin(t * (o.flapSpeed || 1.6)) * (o.flapAmp || 0.12);
            wings.forEach(function (w) { w.rotation.z = (o.wingLift || 0.35) + flap; });
            head.rotation.y = Math.sin(t * 0.5) * 0.35;
            head.rotation.x = Math.sin(t * 0.9) * 0.05;
            body.scale.y = 1 + Math.sin(t * 2) * 0.012;
            tail.rotation.y = Math.sin(t * 1.3) * 0.08;
        });
        return { group: root, update: function (t, dt) { anim.forEach(function (f) { f(t, dt); }); } };
    }

    function buildFalcon() {
        return buildBird({
            body: 0x4f6273, belly: 0xf1e6cf, spots: 0x4a3a2c, head: 0xf1e6cf, hood: 0x26323e,
            beak: 0x5c6b7a, cere: 0xf5c518, feet: 0xf5c518, iris: 0x2a1a0a, eyeRing: 0xf5c518,
            brow: 0x26323e, wing: 0x5d7386, wingTip: 0x2b3742, tail: 0x3b4b5a, legFeather: 0xe6d9bd,
            span: 1.05, wingLift: 0.3, wingSweep: 0.5, flapAmp: 0.1
        });
    }
    function buildEagle() {
        return buildBird({
            body: 0x6b4423, belly: 0x7a4e2a, head: 0xf7f5ef, ruff: true, beak: 0xf2b705, feet: 0xf2b705,
            iris: 0xf2c230, brow: 0xd9d6cc, wing: 0x7a5030, wingTip: 0x3e2814, tail: 0xf7f5ef,
            legFeather: 0x6b4423, span: 1.25, wingLift: 0.55, wingSweep: 0.35, flapAmp: 0.14
        });
    }
    function buildPhoenix() {
        var b = buildBird({
            body: 0x1565c0, belly: 0x64b5f6, head: 0x1e88e5, beak: 0xffca28, feet: 0xffca28,
            iris: 0x7ff3ff, eyeGlow: true, brow: 0x0d47a1, wing: 0x1e88e5, wingTip: 0x00b8ff,
            wingGlow: 0x0077ff, tail: 0x00b8ff, tailGlow: 0x0088ff, crest: 0x4fe3ff,
            legFeather: 0x42a5f5, span: 1.35, wingLift: 0.7, wingSweep: 0.3, flapAmp: 0.22, flapSpeed: 2.4
        });
        var root = b.group;
        // Long flowing flame tail streamers
        var streamMat = M(0x29b6f6, { emissive: 0x0091ea, emissiveIntensity: 0.9, side: THREE.DoubleSide, flatShading: false });
        var streams = [];
        for (var i = 0; i < 3; i++) {
            var sx = (i - 1) * 0.12;
            var curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(sx, 0.45, -0.32),
                new THREE.Vector3(sx * 1.6, 0.25, -0.65),
                new THREE.Vector3(sx * 2.4, 0.15, -0.95),
                new THREE.Vector3(sx * 3.2, 0.28, -1.25)
            ]);
            var tube = new THREE.TubeGeometry(curve, 30, 0.035, 6, false);
            var s = add(root, tube, streamMat);
            var tip = add(root, SPH(0.08, 10, 8), M(0x80e8ff, { emissive: 0x00c8ff, emissiveIntensity: 1.5 }),
                [sx * 3.2, 0.28, -1.25], null, [0.7, 1.4, 0.7]);
            streams.push(s, tip);
        }
        var glow = new THREE.PointLight(0x33aaff, 2, 3);
        glow.position.set(0, 0.9, -0.5);
        root.add(glow);
        var embers = particles(70, 0x55ddff, { x: 1.6, z: 1.2, y0: -0.2, h: 2.2 }, 0.5, 0.07);
        root.userData.extras = [embers];
        var baseUpdate = b.update;
        b.hover = 0.18;
        b.update = function (t, dt) {
            baseUpdate(t, dt);
            embers.userData.update(t, dt);
            glow.intensity = 1.8 + Math.sin(t * 6) * 0.5;
            streams.forEach(function (m, k) { m.rotation.x = Math.sin(t * 1.5 + k) * 0.04; });
        };
        return b;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Python (Health Sciences)
    // ════════════════════════════════════════════════════════════════════════
    function buildPython() {
        var root = new THREE.Group();
        var pts = [], N = 44, turns = 2.2;
        for (var i = 0; i <= N; i++) {
            var f = i / N, a = f * turns * TAU, r = 0.62 - 0.22 * f;
            pts.push(new THREE.Vector3(Math.cos(a) * r, 0.13 + 0.26 * f * turns, Math.sin(a) * r));
        }
        var end = pts[pts.length - 1];
        pts.push(new THREE.Vector3(end.x * 0.4, end.y + 0.22, end.z * 0.6));
        pts.push(new THREE.Vector3(-0.06, end.y + 0.45, 0.1));
        pts.push(new THREE.Vector3(0.02, end.y + 0.66, 0.12));
        pts.push(new THREE.Vector3(0.0, end.y + 0.76, 0.3));
        var curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');

        var SEG = 300, RAD = 14, R = 0.14;
        var geo = new THREE.TubeGeometry(curve, SEG, R, RAD, false);
        var pos = geo.attributes.position, P = new THREE.Vector3(), v = new THREE.Vector3();
        for (var s = 0; s <= SEG; s++) {
            var u = s / SEG;
            var k = 1;
            if (u < 0.16) k = 0.12 + 0.88 * Math.pow(u / 0.16, 0.7);
            else if (u > 0.82) k = 1 - 0.28 * ((u - 0.82) / 0.18);
            curve.getPointAt(u, P);
            for (var j = 0; j <= RAD; j++) {
                var idx = s * (RAD + 1) + j;
                v.fromBufferAttribute(pos, idx).sub(P).multiplyScalar(k).add(P);
                pos.setXYZ(idx, v.x, v.y, v.z);
            }
        }
        geo.computeVertexNormals();
        var nrm = geo.attributes.normal, colors = [];
        var cBase = new THREE.Color(0x3a9d4a), cDark = new THREE.Color(0x14451f),
            cBelly = new THREE.Color(0xf0dc78), cEdge = new THREE.Color(0xc9e46a), c = new THREE.Color();
        for (s = 0; s <= SEG; s++) {
            u = s / SEG;
            for (j = 0; j <= RAD; j++) {
                idx = s * (RAD + 1) + j;
                var ny = nrm.getY(idx), nz = nrm.getZ(idx);
                var th = j / RAD * TAU;
                var belly = ny < -0.45 || (u > 0.8 && nz > 0.5);
                var blot = Math.sin(u * 120) * Math.sin(th * 2 + u * 25);
                if (belly) c.copy(cBelly);
                else if (blot > 0.45) c.copy(cDark);
                else if (blot > 0.3) c.copy(cEdge);
                else c.copy(cBase);
                colors.push(c.r, c.g, c.b);
            }
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        var bodyMesh = add(root, geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.1 }));
        bodyMesh.castShadow = true;

        // Head at the end of the neck, oriented along the tangent
        var hp = curve.getPointAt(1), tan = curve.getTangentAt(1);
        var head = grp(root, [hp.x, hp.y, hp.z]);
        head.lookAt(hp.clone().add(tan));
        var piv = grp(head);
        var skin = M(0x3a9d4a, { flatShading: false, roughness: 0.4 });
        add(piv, SPH(0.16, 20, 14), skin, [0, 0.01, 0.08], null, [1.12, 0.72, 1.5]);
        add(piv, SPH(0.14, 16, 12), M(0xf0dc78, { flatShading: false }), [0, -0.035, 0.1], null, [1.0, 0.45, 1.4]);
        add(piv, SPH(0.05, 8, 6), M(0x14451f), [0, 0.08, 0.08], null, [1.6, 0.5, 2.2]);
        [-1, 1].forEach(function (sd) {
            eye(piv, [sd * 0.115, 0.06, 0.13], 0.048, 0xffc400, { slit: true, forward: 0.4 });
            add(piv, BOX(0.09, 0.025, 0.06), skin, [sd * 0.1, 0.105, 0.14], [0.1, 0, sd * 0.35]);
            add(piv, SPH(0.012, 6, 5), M(0x0a0a0a), [sd * 0.035, 0.03, 0.3]);
        });
        var tongue = grp(piv, [0, -0.03, 0.28]);
        var tMat = M(0xd81b60);
        add(tongue, BOX(0.018, 0.008, 0.14), tMat, [0, 0, 0.07]);
        add(tongue, BOX(0.012, 0.008, 0.07), tMat, [0.018, 0, 0.16], [0, 0.45, 0]);
        add(tongue, BOX(0.012, 0.008, 0.07), tMat, [-0.018, 0, 0.16], [0, -0.45, 0]);

        return {
            group: root,
            update: function (t) {
                piv.rotation.y = Math.sin(t * 0.9) * 0.3;
                piv.rotation.x = Math.sin(t * 1.4) * 0.08;
                var flick = Math.max(0, Math.sin(t * 2.6));
                var on = flick > 0.6;
                tongue.visible = on;
                tongue.scale.z = on ? 0.6 + Math.abs(Math.sin(t * 30)) * 0.5 : 0.1;
                root.scale.y = 1 + Math.sin(t * 1.6) * 0.012;
            }
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Beaver (Engineering) — with hard hat and wrench
    // ════════════════════════════════════════════════════════════════════════
    function buildBeaver() {
        var root = new THREE.Group();
        var fur = M(0x8b5a2b), furLight = M(0xc89566), dark = M(0x3b2416);

        // Tail with crosshatch texture
        var tc = document.createElement('canvas'); tc.width = tc.height = 128;
        var tx = tc.getContext('2d');
        tx.fillStyle = '#3a2a20'; tx.fillRect(0, 0, 128, 128);
        tx.strokeStyle = '#241812'; tx.lineWidth = 3;
        for (var i = -128; i < 256; i += 16) {
            tx.beginPath(); tx.moveTo(i, 0); tx.lineTo(i + 128, 128); tx.stroke();
            tx.beginPath(); tx.moveTo(i + 128, 0); tx.lineTo(i, 128); tx.stroke();
        }
        var tailTex = new THREE.CanvasTexture(tc);
        tailTex.colorSpace = THREE.SRGBColorSpace;
        var tail = grp(root, [0, 0.14, -0.38], [0.25, 0, 0]);
        add(tail, CYL(0.06, 0.08, 0.16, 10), fur, [0, 0, 0.0], [Math.PI / 2, 0, 0]);
        var paddle = add(tail, SPH(1, 24, 12), new THREE.MeshStandardMaterial({ map: tailTex, roughness: 0.7 }),
            [0, -0.02, -0.4], null, [0.24, 0.045, 0.4]);
        paddle.castShadow = true;

        // Body
        var body = grp(root, [0, 0.5, 0]);
        add(body, SPH(0.46), fur, null, null, [1, 1.08, 0.92]);
        add(body, SPH(0.37), furLight, [0, -0.06, 0.18], null, [0.9, 1.0, 0.6]);

        // Feet
        [-1, 1].forEach(function (s) {
            add(root, SPH(0.13, 12, 8), dark, [s * 0.2, 0.05, 0.22], null, [0.8, 0.35, 1.3]);
            add(root, SPH(0.12, 12, 10), fur, [s * 0.24, 0.16, 0.08], null, [1, 0.9, 1.2]);
        });

        // Head
        var head = grp(root, [0, 1.1, 0.06]);
        add(head, SPH(0.33), fur, null, null, [1.05, 0.95, 1]);
        add(head, SPH(0.17, 14, 10), furLight, [0, -0.1, 0.25], null, [1.35, 0.9, 1]);
        add(head, SPH(0.055, 10, 8), M(0x111111, { flatShading: false, roughness: 0.2 }), [0, -0.02, 0.41], null, [1.3, 0.9, 1]);
        var teeth = M(0xfff1d0, { roughness: 0.3 });
        add(head, BOX(0.06, 0.11, 0.035), teeth, [-0.033, -0.22, 0.36]);
        add(head, BOX(0.06, 0.11, 0.035), teeth, [0.033, -0.22, 0.36]);
        [-1, 1].forEach(function (s) {
            eye(head, [s * 0.13, 0.08, 0.27], 0.06, 0x2a1608, { forward: 0.5 });
            add(head, SPH(0.08, 10, 8), fur, [s * 0.26, 0.2, -0.04], null, [1, 1, 0.6]);
            add(head, SPH(0.05, 8, 6), dark, [s * 0.265, 0.2, -0.01], null, [1, 1, 0.4]);
            for (var w = 0; w < 3; w++)
                add(head, CYL(0.004, 0.004, 0.18, 4), M(0x2a1a10), [s * 0.2, -0.08 + w * 0.025, 0.33], [0, 0, Math.PI / 2 + s * (w - 1) * 0.15]);
        });

        // Hard hat
        var hatMat = M(0xffc107, { roughness: 0.35, flatShading: false });
        var hat = grp(head, [0, 0.12, -0.01], [-0.12, 0, 0]);
        add(hat, HEMI(0.31), hatMat, [0, 0.02, 0]);
        add(hat, CYL(0.38, 0.38, 0.025, 32), hatMat, [0, 0.02, 0.05], null, [1, 1, 1.12]);
        add(hat, BOX(0.06, 0.06, 0.6), hatMat, [0, 0.3, 0], null).scale.set(1, 1, 0.9);
        add(hat, BOX(0.16, 0.08, 0.02), M(0x1f2a44), [0, 0.15, 0.27], [-0.4, 0, 0]);

        // Arms + wrench
        var armL = grp(root, [0.36, 0.72, 0.15], [-0.6, 0, -0.35]);
        add(armL, new THREE.CapsuleGeometry(0.075, 0.2, 4, 8), fur, [0, -0.13, 0]);
        add(armL, SPH(0.075, 10, 8), dark, [0, -0.28, 0]);
        var armR = grp(root, [-0.36, 0.72, 0.15], [-0.9, 0, 0.35]);
        add(armR, new THREE.CapsuleGeometry(0.075, 0.2, 4, 8), fur, [0, -0.13, 0]);
        add(armR, SPH(0.075, 10, 8), dark, [0, -0.28, 0]);
        var wrench = grp(armR, [0, -0.3, 0.02], [0.9, 0, 0]);
        var steel = Metal(0xb0bec5);
        add(wrench, BOX(0.05, 0.42, 0.025), steel, [0, 0.17, 0]);
        add(wrench, CYL(0.07, 0.07, 0.03, 12), steel, [0, 0.4, 0], [Math.PI / 2, 0, 0]);
        add(wrench, BOX(0.05, 0.06, 0.04), M(0x3b2416), [0, 0.45, 0]);
        add(wrench, CYL(0.05, 0.05, 0.03, 10), steel, [0, -0.06, 0], [Math.PI / 2, 0, 0]);

        return {
            group: root,
            update: function (t) {
                tail.rotation.x = 0.25 + Math.max(0, Math.sin(t * 2.2)) * 0.25;
                body.scale.y = 1 + Math.sin(t * 2) * 0.015;
                head.rotation.z = Math.sin(t * 0.8) * 0.08;
                head.rotation.y = Math.sin(t * 0.5) * 0.2;
                head.position.y = 1.1 + Math.sin(t * 2) * 0.01;
                armR.rotation.x = -0.9 + Math.sin(t * 1.8) * 0.12;
            }
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Humanoids: Purple Warrior (Criminology), Red Knight (Arts & Sciences)
    // ════════════════════════════════════════════════════════════════════════
    function buildHumanoid(o) {
        var root = new THREE.Group();
        var armor = Metal(o.armor, { roughness: 0.35, metalness: 0.6 });
        var trim  = Metal(o.trim, { roughness: 0.25, metalness: 0.9 });
        var mail  = Metal(o.limb, { roughness: 0.45, metalness: 0.7 });
        var cloth = M(o.cloth, { roughness: 0.8 });
        var leather = M(0x3b2416);

        // Legs
        [-1, 1].forEach(function (s) {
            var leg = grp(root, [s * 0.13, 0, 0]);
            add(leg, BOX(0.15, 0.09, 0.26), leather, [0, 0.045, 0.04]);
            add(leg, CYL(0.075, 0.085, 0.36, 10), o.greaveArmor ? armor : mail, [0, 0.26, 0]);
            add(leg, SPH(0.075, 10, 8), trim, [0, 0.45, 0.04], null, [1, 0.8, 0.7]);
            add(leg, CYL(0.09, 0.08, 0.32, 10), mail, [0, 0.6, 0]);
        });

        // Hips / skirt
        if (o.style === 'warrior') {
            for (var i = 0; i < 12; i++) {
                var a = i / 12 * TAU;
                var strip = add(root, BOX(0.1, 0.26, 0.025), i % 2 ? cloth : armor,
                    [Math.sin(a) * 0.25, 0.72, Math.cos(a) * 0.25], [0.12, a, 0]);
                strip.rotation.order = 'YXZ';
                strip.rotation.set(-0.15, a, 0);
            }
        } else {
            add(root, BOX(0.36, 0.5, 0.04), cloth, [0, 0.66, 0.2], [0.05, 0, 0]);
            add(root, BOX(0.36, 0.5, 0.04), cloth, [0, 0.66, -0.2], [-0.05, 0, 0]);
            add(root, BOX(0.06, 0.5, 0.045), trim, [0, 0.66, 0.205], [0.05, 0, 0]);
        }
        add(root, CYL(0.25, 0.24, 0.14, 12), mail, [0, 0.84, 0]);

        // Torso
        var torso = grp(root, [0, 1.08, 0]);
        add(torso, CYL(0.31, 0.24, 0.5, 10), armor);
        add(torso, SPH(0.28, 12, 10), armor, [0, 0.07, 0.07], null, [1.05, 0.8, 0.7]);
        add(torso, new THREE.TorusGeometry(0.255, 0.03, 6, 20), trim, [0, -0.22, 0], [Math.PI / 2, 0, 0]);
        add(torso, BOX(0.08, 0.06, 0.04), trim, [0, -0.22, 0.26]);
        if (o.emblem === 'star') {
            add(torso, extrude(starShape(0.09, 0.04, 5), 0.02), trim, [0, 0.08, 0.27]);
        } else {
            add(torso, BOX(0.05, 0.24, 0.02), trim, [0, 0.06, 0.27]);
            add(torso, BOX(0.18, 0.05, 0.02), trim, [0, 0.1, 0.27]);
        }

        // Shoulders
        [-1, 1].forEach(function (s) {
            add(torso, HEMI(0.15), armor, [s * 0.35, 0.2, 0], [0, 0, -s * 0.35], [1, 0.9, 1.1]);
            add(torso, new THREE.TorusGeometry(0.14, 0.02, 6, 16), trim, [s * 0.36, 0.2, 0], [Math.PI / 2, 0, -s * 0.35]);
        });

        // Cape
        var capeGeo = new THREE.PlaneGeometry(0.62, 1.2, 6, 12);
        var capeBase = capeGeo.attributes.position.array.slice();
        var cape = add(root, capeGeo, M(o.cape, { side: THREE.DoubleSide, roughness: 0.85, flatShading: false }),
            [0, 0.75, -0.26], [0.08, 0, 0]);
        cape.castShadow = true;

        // Right arm (weapon) — character's right is viewer's left (-x)
        function arm(s, upperX, upperZ, foreX) {
            var a = grp(torso, [s * 0.38, 0.13, 0], [upperX, 0, upperZ]);
            add(a, CYL(0.07, 0.065, 0.28, 8), mail, [0, -0.14, 0]);
            var fore = grp(a, [0, -0.28, 0], [foreX, 0, 0]);
            add(fore, SPH(0.07, 8, 6), trim);
            add(fore, CYL(0.075, 0.06, 0.24, 8), armor, [0, -0.13, 0]);
            var hand = grp(fore, [0, -0.28, 0]);
            add(hand, SPH(0.065, 10, 8), leather);
            return { upper: a, fore: fore, hand: hand };
        }
        var right = arm(-1, -0.35, -0.12, -0.95);
        var left  = arm(1, -0.25, 0.2, -1.1);

        // Weapon in the right hand, kept upright: cancel the arm rotation (-0.35 - 0.95)
        var weapon = grp(right.hand, null, [1.3, 0, 0.12]);
        if (o.weapon === 'spear') {
            add(weapon, CYL(0.022, 0.022, 1.9, 8), M(0x5d4037), [0, 0.35, 0]);
            add(weapon, CONE(0.06, 0.26, 4), Metal(0xe0e0e0), [0, 1.42, 0]);
            add(weapon, CYL(0.035, 0.035, 0.06, 8), trim, [0, 1.27, 0]);
            add(weapon, CONE(0.03, 0.12, 6), trim, [0, -0.66, 0], [Math.PI, 0, 0]);
        } else {
            var steel = Metal(0xdfe6ee, { roughness: 0.15, metalness: 0.95 });
            add(weapon, CYL(0.03, 0.03, 0.22, 8), leather, [0, 0, 0]);
            add(weapon, SPH(0.05, 10, 8), trim, [0, -0.13, 0]);
            add(weapon, BOX(0.34, 0.045, 0.06), trim, [0, 0.13, 0]);
            add(weapon, BOX(0.075, 0.85, 0.018), steel, [0, 0.57, 0]);
            add(weapon, CONE(0.053, 0.13, 4), steel, [0, 1.06, 0], [0, Math.PI / 4, 0], [1, 1, 0.25]);
            add(weapon, BOX(0.02, 0.7, 0.022), Metal(0x9aa6b2), [0, 0.52, 0]);
        }
        weapon.traverse(function (m) { if (m.isMesh) m.castShadow = true; });

        // Shield in front of the left arm
        var shield = grp(root, [0.42, 0.95, 0.3], [0, 0.45, 0]);
        if (o.shield === 'round') {
            add(shield, CYL(0.36, 0.36, 0.05, 32), armor, null, [Math.PI / 2, 0, 0]);
            add(shield, new THREE.TorusGeometry(0.36, 0.03, 8, 40), trim);
            add(shield, CYL(0.27, 0.27, 0.055, 32), M(o.cloth, { roughness: 0.5 }), null, [Math.PI / 2, 0, 0]);
            add(shield, extrude(starShape(0.2, 0.085, 5), 0.04), trim, [0, 0, 0.03]);
            add(shield, CYL(0.05, 0.05, 0.05, 12), trim, [0, 0, 0.06], [Math.PI / 2, 0, 0]);
        } else {
            var ks = new THREE.Shape();
            ks.moveTo(-0.27, 0.32); ks.lineTo(0.27, 0.32);
            ks.quadraticCurveTo(0.3, -0.05, 0, -0.42);
            ks.quadraticCurveTo(-0.3, -0.05, -0.27, 0.32);
            add(shield, extrude(ks, 0.04), trim, null, null, [1.1, 1.08, 1]);
            add(shield, extrude(ks, 0.05), armor, [0, 0, 0.01]);
            add(shield, BOX(0.06, 0.62, 0.02), trim, [0, -0.04, 0.04]);
            add(shield, BOX(0.42, 0.06, 0.02), trim, [0, 0.12, 0.04]);
            add(shield, CYL(0.06, 0.06, 0.03, 12), trim, [0, 0.12, 0.05], [Math.PI / 2, 0, 0]);
        }
        shield.traverse(function (m) { if (m.isMesh) m.castShadow = true; });

        // Head + helmet
        var head = grp(root, [0, 1.56, 0]);
        add(head, CYL(0.09, 0.1, 0.1, 8), mail, [0, -0.1, 0]);
        var visorGlow = M(o.eyes, { emissive: o.eyes, emissiveIntensity: 2.2 });
        if (o.style === 'warrior') {
            add(head, SPH(0.22, 18, 14), armor, [0, 0.05, 0], null, [0.95, 1.08, 1.05]);
            [-1, 1].forEach(function (s) {
                add(head, BOX(0.09, 0.2, 0.06), armor, [s * 0.11, -0.04, 0.18], [0, s * 0.3, 0]);
                add(head, SPH(0.022, 8, 6), visorGlow, [s * 0.075, 0.06, 0.2]);
            });
            add(head, BOX(0.24, 0.035, 0.04), M(0x0a0510), [0, 0.06, 0.205]);
            add(head, BOX(0.045, 0.16, 0.04), M(0x0a0510), [0, -0.04, 0.215]);
            add(head, BOX(0.05, 0.12, 0.05), armor, [0, 0.07, 0.22]);
            add(head, new THREE.TorusGeometry(0.205, 0.022, 6, 24), trim, [0, 0.03, 0], [Math.PI / 2, 0, 0]);
            // Horsehair crest (front to back)
            var crest = grp(head, [0, 0.1, 0], [0, Math.PI / 2, 0]);
            var plume = M(o.plume, { roughness: 0.9 });
            add(crest, new THREE.TorusGeometry(0.22, 0.05, 6, 18, Math.PI), plume, null, null, [1.25, 1.2, 0.7]);
            add(crest, new THREE.TorusGeometry(0.2, 0.025, 6, 18, Math.PI), trim, [0, -0.02, 0], null, [1.1, 1.05, 1]);
            for (var p = 0; p < 6; p++)
                add(crest, BOX(0.06, 0.12, 0.05), plume, [-0.28 - p * 0.012, 0.03 - p * 0.06, 0], [0, 0, 0.2 + p * 0.1]);
        } else {
            add(head, CYL(0.21, 0.22, 0.36, 16), armor, [0, 0.07, 0]);
            add(head, new THREE.SphereGeometry(0.21, 16, 8, 0, TAU, 0, Math.PI / 2), armor, [0, 0.25, 0], null, [1, 0.35, 1]);
            add(head, BOX(0.36, 0.035, 0.04), M(0x080202), [0, 0.1, 0.2]);
            add(head, BOX(0.3, 0.012, 0.02), visorGlow, [0, 0.1, 0.212]);
            add(head, BOX(0.035, 0.22, 0.03), trim, [0, 0.02, 0.215]);
            add(head, new THREE.TorusGeometry(0.218, 0.02, 6, 28), trim, [0, 0.2, 0], [Math.PI / 2, 0, 0]);
            add(head, new THREE.TorusGeometry(0.222, 0.02, 6, 28), trim, [0, -0.1, 0], [Math.PI / 2, 0, 0]);
            for (var h = 0; h < 3; h++)
                add(head, CYL(0.012, 0.012, 0.03, 6), M(0x080202), [0.08, -0.02 - h * 0.04, 0.205], [Math.PI / 2, 0, 0]);
            var plumeK = M(o.plume, { roughness: 0.85 });
            add(head, CYL(0.04, 0.05, 0.06, 8), trim, [0, 0.31, 0]);
            for (var q = 0; q < 7; q++)
                add(head, SPH(0.07, 8, 6), plumeK, [0, 0.38 + Math.sin(q * 0.4) * 0.04, 0.02 - q * 0.06],
                    [0.3 * q, 0, 0], [0.8, 1.2 - q * 0.08, 1]);
        }

        root.traverse(function (m) { if (m.isMesh) m.castShadow = true; });

        return {
            group: root,
            update: function (t) {
                torso.scale.y = 1 + Math.sin(t * 1.8) * 0.01;
                head.rotation.y = Math.sin(t * 0.6) * 0.25;
                head.position.y = 1.56 + Math.sin(t * 1.8) * 0.006;
                right.upper.rotation.x = -0.35 + Math.sin(t * 1.2) * 0.05;
                shield.rotation.y = 0.45 + Math.sin(t * 1.0) * 0.04;
                var arr = capeGeo.attributes.position.array;
                for (var k = 0; k < arr.length; k += 3) {
                    var yy = capeBase[k + 1], xx = capeBase[k];
                    var d = (0.6 - yy) / 1.2;
                    arr[k + 2] = capeBase[k + 2] - d * d * 0.25 + Math.sin(t * 2.2 + yy * 4 + xx * 3) * 0.035 * d;
                }
                capeGeo.attributes.position.needsUpdate = true;
                capeGeo.computeVertexNormals();
            }
        };
    }

    function buildWarrior() {
        return buildHumanoid({
            style: 'warrior', armor: 0x7e3fc0, trim: 0xe0b84a, limb: 0xa9aeb8, cloth: 0xa55ad1,
            cape: 0x5e1fa8, plume: 0xb388ff, eyes: 0xd9a6ff, emblem: 'star', shield: 'round',
            weapon: 'spear', greaveArmor: true
        });
    }
    function buildRedKnight() {
        return buildHumanoid({
            style: 'knight', armor: 0xb3141b, trim: 0xd4af37, limb: 0xa7b0ba, cloth: 0x8e0f15,
            cape: 0x5e0a0e, plume: 0xe53935, eyes: 0xffb199, emblem: 'cross', shield: 'kite',
            weapon: 'sword', greaveArmor: false
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Dolphin (Maritime)
    // ════════════════════════════════════════════════════════════════════════
    function buildDolphin() {
        var root = new THREE.Group();
        var water = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2 });
        var splash = grp(root);
        add(splash, CYL(0.75, 0.85, 0.06, 40), water, [0, 0.03, 0]);
        add(splash, new THREE.TorusGeometry(0.62, 0.06, 8, 40), water, [0, 0.07, 0], [Math.PI / 2, 0, 0]);
        add(splash, new THREE.TorusGeometry(0.35, 0.04, 8, 32), water, [0, 0.07, 0], [Math.PI / 2, 0, 0]);
        for (var i = 0; i < 14; i++) {
            var a = i / 14 * TAU, rr = 0.55 + (i % 3) * 0.1;
            add(splash, SPH(0.035 + (i % 2) * 0.02, 8, 6), water, [Math.cos(a) * rr, 0.18 + (i % 4) * 0.09, Math.sin(a) * rr]);
        }
        var dol = grp(root, [0, 0.95, 0], [-0.55, 0, 0]);
        var skin = M(0x5b8fb9, { flatShading: false, roughness: 0.3 });
        var belly = M(0xe6eff6, { flatShading: false, roughness: 0.3 });
        add(dol, SPH(0.3, 24, 16), skin, null, null, [1, 1, 2.6]);
        add(dol, SPH(0.25, 24, 16), belly, [0, -0.1, 0.05], null, [0.85, 0.8, 2.35]);
        add(dol, SPH(0.2, 18, 12), skin, [0, 0.03, 0.62], null, [1, 0.95, 1.1]);
        add(dol, SPH(0.075, 12, 8), M(0x8fb6d4, { flatShading: false, roughness: 0.3 }), [0, -0.04, 0.82], null, [1, 0.75, 1.9]);
        [-1, 1].forEach(function (s) {
            eye(dol, [s * 0.15, 0.06, 0.7], 0.04, 0x0a0a0a, { forward: 0.2 });
            add(dol, SPH(0.12, 10, 8), skin, [s * 0.26, -0.14, 0.25], [0.3, s * 0.4, s * 0.6], [0.25, 0.08, 1]);
        });
        add(dol, CONE(0.13, 0.32, 10), skin, [0, 0.33, -0.05], [-0.55, 0, 0], [0.35, 1, 1]);
        var tail = grp(dol, [0, 0, -0.72]);
        add(tail, SPH(0.13, 12, 10), skin, [0, 0, -0.05], null, [0.8, 0.8, 1.6]);
        [-1, 1].forEach(function (s) {
            add(tail, SPH(0.2, 12, 8), skin, [s * 0.16, 0, -0.25], [0, -s * 0.5, 0], [1, 0.12, 0.45]);
        });
        dol.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
        var bubbles = particles(40, 0xb3ecff, { x: 1.4, z: 1.4, y0: 0.05, h: 1.4 }, 0.4, 0.06);
        root.userData.extras = [bubbles];
        return {
            group: root,
            update: function (t, dt) {
                dol.position.y = 0.95 + Math.sin(t * 1.5) * 0.06;
                dol.rotation.x = -0.55 + Math.sin(t * 1.5) * 0.06;
                tail.rotation.x = Math.sin(t * 3) * 0.3;
                splash.rotation.y = t * 0.3;
                bubbles.userData.update(t, dt);
            }
        };
    }

    // ── Build selected mascot ────────────────────────────────────────────────
    var BUILDERS = {
        falcon: buildFalcon, eagle: buildEagle, phoenix: buildPhoenix, python: buildPython,
        beaver: buildBeaver, warrior: buildWarrior, redknight: buildRedKnight, dolphin: buildDolphin
    };
    var mascot = (BUILDERS[mascotType] || buildFalcon)();
    var holder = new THREE.Group();
    holder.add(mascot.group);
    scene.add(holder);

    mascot.group.traverse(function (m) { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });

    // Fit to a standard height and stand it on the platform
    var TARGET_H = 1.95;
    mascot.group.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(mascot.group);
    var size = box.getSize(new THREE.Vector3());
    var fit = Math.min(TARGET_H / size.y, 2.4 / Math.max(size.x, size.z));
    holder.scale.setScalar(fit);
    var baseY = PLATFORM_TOP - box.min.y * fit + (mascot.hover || 0);
    holder.position.set(-(box.min.x + box.max.x) / 2 * fit, baseY, -(box.min.z + box.max.z) / 2 * fit);
    (mascot.group.userData.extras || []).forEach(function (e) { holder.add(e); });
    var mascotH = size.y * fit;
    target.set(0, PLATFORM_TOP + mascotH * 0.45 + (mascot.hover || 0) * 0.5, 0);

    // ── Orbit camera (drag to rotate, wheel / pinch to zoom) ──────────────────
    var theta = 0.45, phi = 1.4, radius = 3.9;
    var MIN_R = 2.2, MAX_R = 7;
    var autoRotate = true, resumeAt = 0;
    var isDragging = false, prevX = 0, prevY = 0, pinchDist = 0;

    function placeCamera() {
        camera.position.set(
            target.x + radius * Math.sin(phi) * Math.sin(theta),
            target.y + radius * Math.cos(phi),
            target.z + radius * Math.sin(phi) * Math.cos(theta)
        );
        camera.lookAt(target);
    }
    function onStart(x, y) { isDragging = true; prevX = x; prevY = y; autoRotate = false; }
    function onMove(x, y) {
        if (!isDragging) return;
        theta -= (x - prevX) * 0.01;
        phi   -= (y - prevY) * 0.008;
        phi = Math.max(0.6, Math.min(1.62, phi));
        prevX = x; prevY = y;
    }
    function onEnd() { isDragging = false; resumeAt = performance.now() + 4000; }
    function zoom(f) { radius = Math.max(MIN_R, Math.min(MAX_R, radius * f)); }

    var el = renderer.domElement;
    el.addEventListener('mousedown', function (e) { onStart(e.clientX, e.clientY); });
    window.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); });
    window.addEventListener('mouseup', function () { if (isDragging) onEnd(); });
    el.addEventListener('wheel', function (e) { e.preventDefault(); zoom(e.deltaY > 0 ? 1.08 : 0.92); }, { passive: false });
    el.addEventListener('touchstart', function (e) {
        e.preventDefault();
        if (e.touches.length === 2) {
            isDragging = false;
            pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        } else onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    el.addEventListener('touchmove', function (e) {
        e.preventDefault();
        if (e.touches.length === 2) {
            var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            if (pinchDist) zoom(pinchDist / d);
            pinchDist = d;
        } else onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    el.addEventListener('touchend', function (e) { if (e.touches.length === 0) { pinchDist = 0; onEnd(); } });

    // ── Animate ──────────────────────────────────────────────────────────────
    var clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        var dt = Math.min(clock.getDelta(), 0.05);
        var t = clock.elapsedTime;
        if (!autoRotate && !isDragging && resumeAt && performance.now() > resumeAt) autoRotate = true;
        if (autoRotate) theta += dt * 0.35;
        mascot.update(t, dt);
        if (mascot.hover) holder.position.y = baseY + Math.sin(t * 1.2) * 0.05;
        innerRing.rotation.z = t * 0.2;
        placeCamera();
        renderer.render(scene, camera);
    }
    animate();

    // ── Resize ───────────────────────────────────────────────────────────────
    window.addEventListener('resize', function () {
        var w = container.clientWidth || W;
        H = container.clientHeight || H;
        camera.aspect = w / H;
        camera.updateProjectionMatrix();
        renderer.setSize(w, H);
    });
})();
