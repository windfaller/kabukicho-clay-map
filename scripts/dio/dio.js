/* --- hero diorama v11: a fully modelled 360° clay diorama of our Imagine concept (blender/diorama.py → assets/kabukicho_diorama.glb).
   Selecting the Ichibangai gate swaps to its own scene with free orbit; a near-block copy also replaces the OSM blocks at the real gate. --- */
const DIO = { on: false, ready: false, peds: [] };
const dScene = new THREE.Scene(), dCam = new THREE.PerspectiveCamera(39, 4 / 3, .5, 1200);
const dCtl = new OrbitControls(dCam, canvas); dCtl.enabled = false; dCtl.enableDamping = true; dCtl.dampingFactor = .08; dCtl.minDistance = 5; dCtl.maxDistance = 190; dCtl.maxPolarAngle = 1.78; dCtl.screenSpacePanning = false;
const HERO_T = new V3(0, 2.5 + 22.5 * Math.tan(11 * Math.PI / 180), 0), HERO_P = new V3(0, 2.5, 22.5);
const dSkyU = { uNight: U.night };
dScene.add(new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: dSkyU,
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform float uNight; varying vec3 vD; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); } void main(){ float t = smoothstep(-.02, .42, vD.y);' +
    'vec3 day = mix(vec3(.93,.62,.55), vec3(.38,.27,.49), t), nig = mix(vec3(.10,.10,.24), vec3(.03,.03,.11), t); vec3 c = mix(day, nig, smoothstep(.25,.75,uNight));' +
    'vec3 q = floor(vD * 260.); float st = step(.9975, h(q)) * smoothstep(.05,.3,vD.y) * smoothstep(.4,.9,uNight); gl_FragColor = vec4(c + st * .9, 1.); }' })));
const dHemi = new THREE.HemisphereLight('#ffd9e2', '#6b4a58', 1.25), dSun = new THREE.DirectionalLight('#ffd6b8', 2.4), dRed = new THREE.PointLight('#ff3a30', 0, 30, 1.6);
dSun.position.set(-37, 57, 74); dSun.target.position.set(0, 0, -15); dSun.castShadow = true; Object.assign(dSun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 260 });
dSun.shadow.mapSize.set(2048, 2048); dSun.shadow.bias = -.0004; dSun.shadow.normalBias = .04; dRed.position.set(0, 8.5, 3);
dScene.add(dHemi, dSun, dSun.target, dRed);
const dLamps = [-1, 1].map(sx => { const l = new THREE.PointLight('#ffc77a', 0, 26, 1.4); l.position.set(sx * 5.2, 4.3, -14); dScene.add(l); return l; });
const dRefl = new Reflector(new THREE.PlaneGeometry(9.2, 190), { textureWidth: 512, textureHeight: 512, color: 0x000000 });
dRefl.rotation.x = -Math.PI / 2; dRefl.position.set(0, .085, -68); dRefl.material.transparent = true; dRefl.material.blending = THREE.AdditiveBlending; dRefl.material.depthWrite = false; dRefl.visible = false; dScene.add(dRefl);
/* clay grain (fingerprint-ish world-space value noise on the normal) + dark inverted-hull seams */
const GRAIN_GLSL = 'varying vec3 vGW; float gh(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); } float gn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);' +
  'return mix(mix(mix(gh(i),gh(i+vec3(1,0,0)),f.x),mix(gh(i+vec3(0,1,0)),gh(i+vec3(1,1,0)),f.x),f.y),mix(mix(gh(i+vec3(0,0,1)),gh(i+vec3(1,0,1)),f.x),mix(gh(i+vec3(0,1,1)),gh(i+vec3(1,1,1)),f.x),f.y),f.z); }';
function claify(m, amp) { m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;').replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 gw = vec4(transformed, 1.);\n#ifdef USE_INSTANCING\n gw = instanceMatrix * gw;\n#endif\n vGW = (modelMatrix * gw).xyz; }');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GRAIN_GLSL).replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ vec3 p = vGW * 3.1; vec3 g = vec3(gn(p), gn(p + 17.3), gn(p + 41.7)) + .5 * vec3(gn(p * 3.3), gn(p * 3.3 + 9.1), gn(p * 3.3 + 23.)); normal = normalize(normal + (g - .75) * ' + amp.toFixed(3) + '); }'); };
  m.customProgramCacheKey = () => 'clay' + amp; }
const hullMat = new THREE.MeshBasicMaterial({ color: '#1c1222', side: THREE.BackSide }); hullMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(objectNormal) * .055;'); }; hullMat.customProgramCacheKey = () => 'hull';
const EMK2 = { bulb: [.5, 3.2], lantern: [.35, 3.2], window: [.3, 1.9], gateRed: [.04, .7], signFace: [.32, 1.15] };
const HULL = /^(gateRed|post|signBody|signBack|bld|ledge|awn|cloth|skin|hair|legs|lampPost|cloud|curb)/;
function dioMats(root) { root.traverse(o => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; const m = o.material, n = m.name;
    if (EMK2[n]) { m.userData.em = EMK2[n]; if (!glbEm.includes(m)) glbEm.push(m); if (n === 'bulb' || n === 'lantern') m.toneMapped = false; if (n !== 'gateRed') o.castShadow = false; if (n === 'signFace') { m.emissiveMap = m.map; m.emissive.set('#ffffff'); signs.push(m); } }
    else if (!m.userData.clay) { m.userData.clay = 1; claify(m, /^(post|curb|walk)/.test(n) ? .5 : /^(road|base)/.test(n) ? .28 : .2); if (n === 'road') { m.roughness = .55; } }
    if (n === 'cloud') o.castShadow = false;
    if (HULL.test(n) && !o.isInstancedMesh && !o.userData.hull) { o.userData.hull = 1; const h = new THREE.Mesh(o.geometry, hullMat); h.userData.hull = 1; h.castShadow = h.receiveShadow = false; h.raycast = () => {}; o.add(h); } }); }
function dioHero() { const A = innerWidth / innerHeight, tv = Math.max(Math.tan(19.56 * Math.PI / 180), Math.tan(25.35 * Math.PI / 180) / A); dCam.fov = 2 * Math.atan(tv) * 180 / Math.PI; dCam.aspect = A; dCam.updateProjectionMatrix(); dCam.position.copy(HERO_P); dCtl.target.copy(HERO_T); dCtl.update(); }
{ const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
  ld.load('assets/kabukicho_diorama.glb', gl => { const root = gl.scene; dioMats(root); dScene.add(root); DIO.root = root;
    const mr = root.clone(); ['FAR', 'GROUND', 'CLOUDS'].forEach(k => { const o = mr.getObjectByName(k); if (o) o.visible = false; }); const fo = mr.getObjectByName('INST_FAR'); if (fo) fo.visible = false;
    mr.position.set(GF.x, 0, GF.z); mr.rotation.y = GF.ry; mr.scale.setScalar(GF.s); scene.add(mr); LMK.gateGLB = mr;
    [root, mr].forEach(r => { const pg = r.getObjectByName('PEDS'); if (pg) pg.children.forEach((p, k) => DIO.peds.push({ o: p, x: p.position.x, y: p.position.y, z: p.position.z, ry: p.rotation.y, dir: Math.abs(Math.cos(p.rotation.y)) > .5 && Math.cos(p.rotation.y) < 0 ? -1 : 1, sp: .9 + (k % 5) * .12, ph: k * 1.7 })); });
    glbEm.forEach(m => m.emissiveIntensity = m.userData.em[0] + lastN * m.userData.em[1]); DIO.ready = true; glbDone = true; }, undefined, e => { console.error('diorama glb', e); glbDone = true; }); }
function dioPeds() { const t = U.time.value; DIO.peds.forEach(p => { const L = 52, z0 = -42; let z = p.z + p.dir * p.sp * t; z = z0 + (((z - z0) % L) + L) % L; p.o.position.z = z; p.o.position.y = p.y + Math.abs(Math.sin(t * 7 * p.sp + p.ph)) * .06; p.o.rotation.z = Math.sin(t * 7 * p.sp + p.ph) * .05; }); }
function dioFrame(dt) { if (dCam.position.y < .8) dCam.position.y = .8; const n = U.night.value; dCtl.update(); dHemi.intensity = 1.25 - n * .95; dHemi.color.set(n > .5 ? '#8a90d8' : '#ffd9e2'); dSun.intensity = 2.4 * (1 - n * .93); dRed.intensity = n * 60; dLamps.forEach(l => l.intensity = n * 40);
  dRefl.visible = n > .05; dRefl.material.uniforms.color.value.setScalar(.5 * n * .75);
  const rp = composer.passes[0]; rp.scene = dScene; rp.camera = dCam; bloom.strength = bloomBase * 1.4; composer.render(); rp.scene = scene; rp.camera = camera; }
function dioEnter(p) { DIO.on = true; dioHero(); dCtl.enabled = true; controls.enabled = false; document.body.classList.add('dio'); $('#dioN').textContent = nmOf(p.nm); $('#dioBar').hidden = false; }
function dioExit() { if (!DIO.on) return; DIO.on = false; dCtl.enabled = false; controls.enabled = true; document.body.classList.remove('dio'); $('#dioBar').hidden = true; }
addEventListener('resize', () => { if (DIO.on) { const A = innerWidth / innerHeight, tv = Math.max(Math.tan(19.56 * Math.PI / 180), Math.tan(25.35 * Math.PI / 180) / A); dCam.fov = 2 * Math.atan(tv) * 180 / Math.PI; dCam.aspect = A; dCam.updateProjectionMatrix(); } });
