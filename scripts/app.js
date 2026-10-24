import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
const $ = s => document.querySelector(s);
try {
const D = JSON.parse($('#DATA').textContent), O = D.osm;
const params = new URLSearchParams(location.search); let lang = params.get('lang') === 'en' ? 'en' : 'zh';
const TEST = params.has('test');
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261024), C = c => new THREE.Color(c), V3 = THREE.Vector3;
const T = { zh: { title: '歌舞伎町', sub: '新宿 · OSM 黏土微縮地圖', pano: '全景', list: '清單', q: '搜尋地點…', load: '載入中…', osm: '在 OpenStreetMap 檢視', tags: 'OSM 標記', h: '高度', lv: '樓層', op: '營運', rel: '宗教', comp: '（模型高度已壓縮以利檢視）', gate: '歌舞伎町一番街 入口拱門（位置依街道南端估計，造型為示意）' },
  en: { title: 'Kabukicho', sub: 'Shinjuku · OSM clay diorama', pano: 'Overview', list: 'List', q: 'Search places…', load: 'Loading…', osm: 'View on OpenStreetMap', tags: 'OSM tags', h: 'height', lv: 'levels', op: 'operator', rel: 'religion', comp: ' (model height compressed for display)', gate: 'Kabukicho Ichibangai entrance arch (position estimated from the street end; stylised)' } };
const CAT = { cinema: ['電影院', 'Cinema'], theatre: ['劇場／表演場地', 'Theatre / venue'], police: ['派出所', 'Police box'], hospital: ['醫院', 'Hospital'], park: ['公園', 'Park'], place_of_worship: ['宗教場所', 'Place of worship'], hotel: ['飯店', 'Hotel'], station: ['車站', 'Station'], department_store: ['百貨商場', 'Department store'], museum: ['博物館', 'Museum'], information: ['資訊點', 'Information point'], pedestrian: ['行人廣場／步行區', 'Pedestrian area'], street: ['街道', 'Street'], building: ['建築', 'Building'], gate: ['拱門', 'Arch'] };

/* renderer */
const canvas = $('#c'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#f3e6d6', 900, 2200);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 2, 5000);
const lr = new CSS2DRenderer({ element: $('#lbl') }); lr.setSize(innerWidth, innerHeight);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.maxPolarAngle = 1.35; controls.minDistance = 40; controls.maxDistance = 1600;
const hemi = new THREE.HemisphereLight('#fff4e6', '#8a6f60', 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d8', 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 10, far: 1600 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 1.2; scene.add(sun, sun.target);
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .6, .5, .82); composer.addPass(bloom); composer.addPass(new OutputPass());
/* sky dome */
const skyU = { top: { value: C('#9fd0ec') }, hor: { value: C('#f7e6d3') } };
scene.add(new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 top,hor;varying vec3 p;void main(){float h=clamp(normalize(p).y*2.2,0.,1.);gl_FragColor=vec4(mix(hor,top,h),1.);}' })));

/* shared uniforms + materials */
const U = { night: { value: 0 } };
function neonMat() { // emissive = instance color * night boost
  const m = new THREE.MeshStandardMaterial({ roughness: .5 });
  m.onBeforeCompile = s => { s.uniforms.uNight = U.night; s.fragmentShader = 'uniform float uNight;\n' + s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance += vColor * (0.15 + uNight * 2.6);\n#endif'); };
  return m;
}
const clayMat = new THREE.MeshStandardMaterial({ roughness: .85, vertexColors: true });
const bldMat = new THREE.MeshStandardMaterial({ roughness: .82, vertexColors: true });
bldMat.onBeforeCompile = s => {
  s.uniforms.uNight = U.night;
  s.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz; vWN=normalize(mat3(modelMatrix)*objectNormal);');
  s.fragmentShader = 'uniform float uNight; varying vec3 vWP; varying vec3 vWN;\nfloat hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n' + s.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  if (abs(vWN.y) < .5) {
    float u = abs(vWN.x) > abs(vWN.z) ? vWP.z : vWP.x;
    vec2 cell = vec2(floor(u / 2.8), floor(vWP.y / 3.3));
    vec2 f = vec2(fract(u / 2.8), fract(vWP.y / 3.3));
    float win = step(.22, f.x) * step(f.x, .78) * step(.3, f.y) * step(f.y, .78);
    float lit = step(.72, hsh(cell + floor(vWP.xz / 40.)));
    vec3 wc = mix(vec3(1., .72, .4), vec3(.75, .85, 1.), step(.8, hsh(cell * 1.7)));
    float ground = step(vWP.y, 3.6) * step(.6, vWP.y);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * .78 + vec3(.04, .05, .07), win * (1. - ground) * .6);
    totalEmissiveRadiance += uNight * (win * lit * (1. - ground) * wc * .75 + ground * vec3(1., .55, .3) * .7);
  }`);
};
/* instanced kit */
const kit = {}; const neon = neonMat();
const GEO = { box: new THREE.BoxGeometry(1, 1, 1), rbox: new RoundedBoxGeometry(1, 1, 1, 2, .18), sph: new THREE.SphereGeometry(.5, 12, 8), cyl: new THREE.CylinderGeometry(.5, .5, 1, 10), cone: new THREE.ConeGeometry(.5, 1, 9), disc: new THREE.CylinderGeometry(.5, .5, 1, 12) };
function put(kind, geo, mat, m, color, shadow = true) { (kit[kind] ||= { geo, mat, list: [], shadow }).list.push([m.clone(), C(color)]); }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function M(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) { _e.set(rx, ry, rz); _q.setFromEuler(_e); return _m.compose(new V3(x, y, z), _q, new V3(sx, sy, sz)); }
function finalizeKit() { for (const k in kit) { const g = kit[k]; const im = new THREE.InstancedMesh(g.geo, g.mat, g.list.length); g.list.forEach(([m, c], i) => { im.setMatrixAt(i, m); im.setColorAt(i, c); }); im.castShadow = g.shadow; im.receiveShadow = true; scene.add(im); g.im = im; } }

/* ground board */
const BX = 372, BZ = 345;
const board = new THREE.Mesh(new RoundedBoxGeometry(BX * 2, 16, BZ * 2, 3, 6), new THREE.MeshStandardMaterial({ color: '#e9d6bf', roughness: .95 })); board.position.y = -8; board.receiveShadow = true; scene.add(board);
const table = new THREE.Mesh(new THREE.CircleGeometry(2400, 48), new THREE.MeshStandardMaterial({ color: '#d9c3a8', roughness: 1 })); table.rotation.x = -Math.PI / 2; table.position.y = -16.2; table.receiveShadow = true; scene.add(table);

/* roads */
const nodes = O.nodes, names = O.names, W = [15, 10, 6, 9, 2.6], RCOL = ['#5d5866', '#6c6672', '#7c7478', '#d9b48e', '#cfb79c'];
const roadGeos = [[], [], [], [], []], adj = new Map(), carAdj = new Map(), deg = new Map();
function link(A, a, b, w) { if (!A.has(a)) A.set(a, []); if (!A.has(b)) A.set(b, []); A.get(a).push([b, w]); A.get(b).push([a, w]); }
function strip(pts, w, y) { const pos = [], idx = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; let dx = bx - ax, dz = bz - az; const L = Math.hypot(dx, dz) || 1; const nx = -dz / L * w / 2, nz = dx / L * w / 2; const o = pos.length / 3; pos.push(ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz); idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
const namedRoads = {};
O.r.forEach(([cls, ni, seq]) => {
  const pts = seq.map(i => nodes[i]); const y = .12 + (4 - cls) * .025 + (cls >= 3 ? .06 : 0);
  roadGeos[cls].push(strip(pts, W[cls], y));
  for (let i = 0; i < seq.length - 1; i++) { const a = seq[i], b = seq[i + 1], L = Math.hypot(nodes[a][0] - nodes[b][0], nodes[a][1] - nodes[b][1]); link(adj, a, b, L); if (cls <= 1) link(carAdj, a, b, L); }
  seq.forEach(i => deg.set(i, (deg.get(i) || 0) + 1));
  if (cls < 4) seq.forEach(i => put('joint' + cls, GEO.disc, new THREE.MeshStandardMaterial({ color: RCOL[cls], roughness: .9 }), M(nodes[i][0], y - .01, nodes[i][1], W[cls], .02, W[cls]), RCOL[cls], false));
  if (ni >= 0) (namedRoads[names[ni][0]] ||= []).push(pts);
});
// unify joint materials per class
roadGeos.forEach((gs, cls) => { if (!gs.length) return; const g = mergeGeometries(gs); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: RCOL[cls], roughness: .9 })); m.receiveShadow = true; scene.add(m); });
for (const k in kit) if (k.startsWith('joint')) { const cls = +k[5]; kit[k].mat = new THREE.MeshStandardMaterial({ color: '#fff', roughness: .9 }); }
// lane marks on class 0 and crosswalks at busy nodes
const markMat = new THREE.MeshStandardMaterial({ color: '#fff', roughness: .8 });
O.r.forEach(([cls, ni, seq]) => { if (cls > 1) return; for (let i = 0; i < seq.length - 1; i++) { const [ax, az] = nodes[seq[i]], [bx, bz] = nodes[seq[i + 1]]; const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
  if (cls === 0) for (let s = 4; s < L - 4; s += 9) put('mark', GEO.box, markMat, M(ax + (bx - ax) * s / L, .17, az + (bz - az) * s / L, .5, .02, 4, ang), '#f6f1e6', false);
  [0, 1].forEach(e => { const n = seq[i + e]; if ((deg.get(n) || 0) >= 3 && L > 16) { const t = e ? (L - 7) / L : 7 / L; for (let k = -3; k <= 3; k++) { const px = ax + (bx - ax) * t + Math.cos(ang) * k * 1.6 * W[cls] / 10, pz = az + (bz - az) * t - Math.sin(ang) * k * 1.6 * W[cls] / 10; put('mark', GEO.box, markMat, M(px, .18, pz, .8, .02, 3.2, ang), '#fbf8f0', false); } } }); } });
/* rail */
const railGeos = [];
O.rl.forEach(([t, f]) => { const pts = []; for (let i = 0; i < f.length; i += 2) pts.push([f[i], f[i + 1]]); if (t !== 1) return; railGeos.push(strip(pts, 4.2, .3));
  for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az); [-0.75, .75].forEach(o => put('rail', GEO.box, markMat, M((ax + bx) / 2 + Math.cos(ang) * o, .45, (az + bz) / 2 - Math.sin(ang) * o, .2, .2, L, ang), '#6a6a72', false)); } });
if (railGeos.length) { const m = new THREE.Mesh(mergeGeometries(railGeos), new THREE.MeshStandardMaterial({ color: '#a08a7a', roughness: 1 })); m.receiveShadow = true; scene.add(m); }
/* areas */
function polyGeo(f, y) { const sh = new THREE.Shape(); for (let i = 0; i < f.length; i += 2) i ? sh.lineTo(f[i], -f[i + 1]) : sh.moveTo(f[i], -f[i + 1]); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; }
const parks = [], areaGeos = [];
O.g.forEach(([t, ni, f]) => { if (f.length < 6) return; (areaGeos[t] ||= []).push(polyGeo(f, t === 0 ? .35 : .3)); if (t === 0) parks.push(f); });
areaGeos.forEach((gs, t) => { if (!gs) return; const m = new THREE.Mesh(mergeGeometries(gs.map(g => g.index ? g.toNonIndexed() : g)), new THREE.MeshStandardMaterial({ color: t === 0 ? '#a9c98a' : '#e7cda9', roughness: .95, polygonOffset: true, polygonOffsetFactor: -1 })); m.receiveShadow = true; scene.add(m); });
function inPoly(x, z, f) { let c = false; for (let i = 0, j = f.length - 2; i < f.length; j = i, i += 2) { const xi = f[i], zi = f[i + 1], xj = f[j], zj = f[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }

/* buildings */
const PAL = ['#f2b58a', '#f4a5a0', '#f7d58c', '#a8d5c2', '#b9c8ec', '#f3e0cf', '#e8b9d0', '#cfe0a8', '#f0c0b0', '#9fc7d8', '#e6c79c', '#d8c8e8', '#ffe2b8', '#c7b8a8'];
const NEON = ['#ff3d8b', '#33e6ff', '#ffd23d', '#b45cff', '#ff4b3d', '#4dff88', '#ff8a2b'];
const hComp = h => h <= 45 ? h : 45 + (h - 45) * .5;
const bgeos = [], bldInfo = [];
const roadPts = []; O.r.forEach(([cls, , seq]) => { if (cls <= 3) seq.forEach(i => roadPts.push(nodes[i])); });
O.b.forEach(([h, kind, ni, f], bi) => {
  const hv = Math.max(3, hComp(h)); const sh = new THREE.Shape(); const pts = [];
  for (let i = 0; i < f.length; i += 2) { pts.push([f[i], f[i + 1]]); i ? sh.lineTo(f[i], -f[i + 1]) : sh.moveTo(f[i], -f[i + 1]); }
  let g; try { g = new THREE.ExtrudeGeometry(sh, { depth: hv - .6, bevelEnabled: true, bevelThickness: .6, bevelSize: .6, bevelOffset: -.6, bevelSegments: 1, curveSegments: 1 }); } catch (e) { return; }
  g.rotateX(-Math.PI / 2); g.deleteAttribute('uv');
  const r = mulberry32(bi * 7919 + 13); const col = C(kind === 2 ? '#d2553d' : PAL[Math.floor(r() * PAL.length)]);
  const n = g.attributes.position.count, ca = new Float32Array(n * 3); const top = C(kind === 2 ? '#7b4a3a' : '#cbb7a5').lerp(col, .3);
  for (let i = 0; i < n; i++) { const y = g.attributes.position.getY(i); const cc = y > hv - .1 ? top : col; ca.set([cc.r, cc.g, cc.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); bgeos.push(g);
  // signs
  let cx = 0, cz = 0; pts.forEach(p => { cx += p[0]; cz += p[1]; }); cx /= pts.length; cz /= pts.length;
  bldInfo.push({ cx, cz, hv });
  const core = cx > -240 && cx < 230 && cz > -220 && cz < 110;
  if (kind === 2) { put('roofS', GEO.cone, clayMat2(), M(cx, hv + 1.4, cz, 7, 3, 7, Math.PI / 4), '#5a3a30'); return; }
  // rooftop clutter
  if (r() < .5 && hv > 8) put('roofbox', GEO.rbox, clayMat2(), M(cx + (r() - .5) * 3, hv + .9, cz + (r() - .5) * 3, 2 + r() * 2, 1.8, 2 + r() * 2), '#d8d0c8');
  if (r() < .25 && hv > 12) put('tank', GEO.cyl, clayMat2(), M(cx - 2, hv + 1.6, cz + 1.5, 2, 3.2, 2), '#9fb3bf');
  if (hv < 7 || r() > (core ? .85 : .25)) return;
  // longest edge near outward
  let best = -1, bl = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); let dmin = 1e9; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; for (let k = 0; k < roadPts.length; k += 3) { const d = (roadPts[k][0] - mx) ** 2 + (roadPts[k][1] - mz) ** 2; if (d < dmin) dmin = d; } const sc = L / (1 + Math.sqrt(dmin) * .15); if (sc > bl && L > 4) { bl = sc; best = i; } }
  if (best < 0) return;
  const a = pts[best], b = pts[(best + 1) % pts.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); let nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  if (inPoly(mx + nx * .8, mz + nz * .8, f)) { nx = -nx; nz = -nz; }
  const ang = Math.atan2(b[0] - a[0], b[1] - a[1]); const nc = NEON[Math.floor(r() * NEON.length)];
  const nSigns = core ? 1 + Math.floor(r() * 3) : 1;
  for (let s = 0; s < nSigns; s++) { const t = .15 + .7 * (s + .5) / nSigns + (r() - .5) * .1; const px = a[0] + (b[0] - a[0]) * t + nx * 1.4, pz = a[1] + (b[1] - a[1]) * t + nz * 1.4; const sh2 = Math.min(hv * .65, 4 + r() * 12); const y0 = 4 + r() * Math.max(0, hv - sh2 - 5);
    put('blade', GEO.rbox, neon, M(px, y0 + sh2 / 2, pz, .7, sh2, 2.2, ang + Math.PI / 2), NEON[Math.floor(r() * NEON.length)]);
    // blade bands
    for (let k = 1; k < sh2 / 2.4; k++) put('bladeT', GEO.box, clayMat2(), M(px + nx * .01, y0 + k * 2.4, pz + nz * .01, .8, .18, 2.35, ang + Math.PI / 2), '#3a2e2a', false); }
  put('band', GEO.box, neon, M(mx + nx * .45, 3.9, mz + nz * .45, Math.min(L * .85, 22), 1.3, .4, ang + Math.PI / 2 + Math.PI / 2), nc);
  put('awning', GEO.box, clayMat2(), M(mx + nx * 1.2, 3.1, mz + nz * 1.2, Math.min(L * .8, 20), .3, 2.2, ang + Math.PI), ['#c8402f', '#2f6c8f', '#e7a83c', '#5b8a4a'][Math.floor(r() * 4)]);
  if (hv > 20 && r() < .5) put('roofsign', GEO.rbox, neon, M(cx, hv + 3.5, cz, Math.min(L * .6, 14), 5, .8, ang), nc);
});
function clayMat2() { return clayMat2.m ||= new THREE.MeshStandardMaterial({ roughness: .85 }); }
{ const g = mergeGeometries(bgeos); const m = new THREE.Mesh(g, bldMat); m.castShadow = m.receiveShadow = true; scene.add(m); }

/* lantern strings on narrow named streets */
const LANT = ['新宿ゴールデン街 G1通り', '歌舞伎町一番街通り', '歌舞伎町さくら通り', 'あかるい花園一番街', '思い出横丁', 'あかるい花園八番街', '歌舞伎町東通り'];
LANT.forEach(nm => (namedRoads[nm] || []).forEach(pts => { let acc = 0; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az); const nx = Math.cos(ang), nz = -Math.sin(ang);
  for (let s = (10 - acc % 10); s < L; s += 10) { const px = ax + (bx - ax) * s / L, pz = az + (bz - az) * s / L, half = 5.5; for (let k = 0; k <= 6; k++) { const u = k / 6 * 2 - 1; put('lantern', GEO.sph, neon, M(px + nx * u * half, 7.2 - (1 - u * u) * 1.4, pz + nz * u * half, 1, 1.4, 1), k % 2 ? '#ff4b3d' : '#ffb347', false); } put('wire', GEO.box, clayMat2(), M(px, 6.6, pz, .08, .08, half * 2, ang + Math.PI / 2), '#3a2e2a', false); }
  acc += L; } }));
/* gate arch */
const gate = D.pois.find(p => p.gate)?.gate;
if (gate) { const ich = namedRoads['歌舞伎町一番街通り'] || []; let dir = 0; let bd = 1e9; ich.forEach(p => p.forEach((q, i) => { const d = Math.hypot(q[0] - gate[0], q[1] - gate[1]); if (d < bd && p[i + 1]) { bd = d; dir = Math.atan2(p[i + 1][0] - q[0], p[i + 1][1] - q[1]); } })); 
  const [gx, gz] = gate, nx = Math.cos(dir), nz = -Math.sin(dir), half = 6.5;
  [-1, 1].forEach(s => put('gatePost', GEO.rbox, clayMat2(), M(gx + nx * half * s, 5.5, gz + nz * half * s, 1.1, 11, 1.1, dir), '#d9d2c4'));
  put('gateArch', GEO.rbox, neon, M(gx, 11.5, gz, half * 2 + 3, 2.4, 1.2, dir + Math.PI / 2), '#ff3344');
  put('gateArc', GEO.cyl, neon, M(gx, 13.4, gz, 1.2, half * 2, 1.2, dir + Math.PI / 2, 0, Math.PI / 2), '#ffcf4d');
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const x = cv.getContext('2d'); x.fillStyle = '#ff3344'; x.fillRect(0, 0, 512, 96); x.fillStyle = '#fff6d8'; x.font = 'bold 64px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('歌舞伎町一番街', 256, 52);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; const pm = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }); const pl = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 2, 2.1), pm); pl.position.set(gx, 11.5, gz); pl.rotation.y = dir + Math.PI / 2 + Math.PI / 2; pl.translateZ(.65); scene.add(pl); var gatePlane = pm; }
/* streetlights + trees + vending machines */
O.r.forEach(([cls, , seq]) => { if (cls > 2) return; let acc = 0; for (let i = 0; i < seq.length - 1; i++) { const [ax, az] = nodes[seq[i]], [bx, bz] = nodes[seq[i + 1]]; const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az), nx = Math.cos(ang), nz = -Math.sin(ang), sp = cls === 0 ? 26 : 34;
  for (let s = (sp - acc % sp); s < L; s += sp) { const side = ((acc + s) / sp | 0) % 2 ? 1 : -1, o = W[cls] / 2 + .8; const px = ax + (bx - ax) * s / L + nx * o * side, pz = az + (bz - az) * s / L + nz * o * side; put('pole', GEO.cyl, clayMat2(), M(px, 3.6, pz, .3, 7.2, .3), '#5d5a60'); put('lamp', GEO.sph, neon, M(px, 7.3, pz, 1, .7, 1), '#ffe2a8', false); if (cls === 0 && rnd() < .5) put('tree', GEO.sph, clayMat2(), M(px - nx * side * 1.2 + (bx - ax) / L * 8, 5, pz - nz * side * 1.2 + (bz - az) / L * 8, 4.2, 4.6, 4.2), ['#7fae5e', '#6d9e52', '#8dbb68'][i % 3]); if (cls === 2 && rnd() < .3) put('vend', GEO.rbox, neon, M(px + (bx - ax) / L * 3, 1, pz + (bz - az) / L * 3, 1, 2, .8, ang), ['#e8f4ff', '#ffefe0', '#ff6b6b'][i % 3]); }
  acc += L; } });
O.trees.forEach(([x, z], i) => { put('trunk', GEO.cyl, clayMat2(), M(x, 1.5, z, .6, 3, .6), '#8a6248'); put('tree', GEO.sph, clayMat2(), M(x, 5, z, 4.5, 5, 4.5), ['#7fae5e', '#6d9e52', '#8dbb68'][i % 3]); });
parks.forEach(f => { let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; for (let i = 0; i < f.length; i += 2) { minx = Math.min(minx, f[i]); maxx = Math.max(maxx, f[i]); minz = Math.min(minz, f[i + 1]); maxz = Math.max(maxz, f[i + 1]); } for (let k = 0; k < 40; k++) { const x = minx + rnd() * (maxx - minx), z = minz + rnd() * (maxz - minz); if (!inPoly(x, z, f)) continue; put('trunk', GEO.cyl, clayMat2(), M(x, 1.5, z, .6, 3, .6), '#8a6248'); put('tree', GEO.sph, clayMat2(), M(x, 5.5, z, 5, 5.5, 5), ['#7fae5e', '#6d9e52', '#8dbb68'][k % 3]); put('bench', GEO.rbox, clayMat2(), M(x + 4, .5, z, 3, .5, 1, rnd() * 3), '#b07a52'); } });
/* surrounding city blocks outside the board for context */
for (let k = 0; k < 260; k++) { const a = rnd() * Math.PI * 2, r = 470 + rnd() * 700; const x = Math.cos(a) * r, z = Math.sin(a) * r * .9; const h = 6 + rnd() * 40 * (r < 700 ? 1.4 : .7); put('far', GEO.rbox, clayMat2(), M(x, h / 2 - 16, z, 18 + rnd() * 24, h, 18 + rnd() * 24, rnd()), ['#e2cbb4', '#d9c0aa', '#ead8c4'][k % 3]); }
finalizeKit();
for (const k in kit) if (k.startsWith('joint')) kit[k].im.material = new THREE.MeshStandardMaterial({ roughness: .9 });

/* walkers & cars (Dijkstra on OSM graph) */
function dijkstra(A, s, t) { const dist = new Map([[s, 0]]), prev = new Map(), pq = [[0, s]], done = new Set(); while (pq.length) { let bi = 0; for (let i = 1; i < pq.length; i++) if (pq[i][0] < pq[bi][0]) bi = i; const [d, u] = pq.splice(bi, 1)[0]; if (done.has(u)) continue; done.add(u); if (u === t) break; for (const [v, w] of A.get(u) || []) { const nd = d + w; if (nd < (dist.get(v) ?? 1e18)) { dist.set(v, nd); prev.set(v, u); pq.push([nd, v]); } } } if (!prev.has(t) && s !== t) return null; const p = [t]; while (p[0] !== s) p.unshift(prev.get(p[0])); return p; }
function bigComp(A) { const seen = new Set(); let best = []; for (const s of A.keys()) { if (seen.has(s)) continue; const c = [s]; seen.add(s); for (let i = 0; i < c.length; i++) for (const [v] of A.get(c[i])) if (!seen.has(v)) { seen.add(v); c.push(v); } if (c.length > best.length) best = c; } return best; }
const wNodes = bigComp(adj), cNodes = bigComp(carAdj);
function agent(A, pool, speed) { const a = { A, pool, speed, path: null, seg: 0, t: 0, off: (rnd() - .5) }; newPath(a, pool[Math.floor(rnd() * pool.length)]); return a; }
function newPath(a, from) { for (let k = 0; k < 6; k++) { const to = a.pool[Math.floor(rnd() * a.pool.length)]; const p = dijkstra(a.A, from, to); if (p && p.length > 1) { a.path = p; a.seg = 0; a.t = 0; return; } } a.path = [from, from]; }
const NW = TEST ? 140 : 220, NC = 36;
const walkers = Array.from({ length: NW }, () => agent(adj, wNodes, 2.2 + rnd() * 1.4)), cars = Array.from({ length: NC }, () => agent(carAdj, cNodes, 9 + rnd() * 4));
const wBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.9, 1.6, 3, 8), new THREE.MeshStandardMaterial({ roughness: .7 }), NW), wHead = new THREE.InstancedMesh(GEO.sph, new THREE.MeshStandardMaterial({ color: '#f1cfb4', roughness: .7 }), NW);
const carM = new THREE.InstancedMesh(GEO.rbox, new THREE.MeshStandardMaterial({ roughness: .5 }), NC), carTop = new THREE.InstancedMesh(GEO.rbox, new THREE.MeshStandardMaterial({ roughness: .4, color: '#bfe2f0' }), NC);
const carLights = new THREE.InstancedMesh(GEO.box, neonMat(), NC * 2);
walkers.forEach((w, i) => wBody.setColorAt(i, C(['#e2583e', '#3b6ea8', '#f0c24a', '#5a9a62', '#8c5ab8', '#2f2f3a', '#f2f2f2', '#d77aa8'][i % 8])));
cars.forEach((c, i) => { carM.setColorAt(i, C(['#f4c430', '#2b2b2b', '#f6f6f6', '#3c6e9e', '#c43a2f', '#4b8a52'][i % 6])); carLights.setColorAt(i * 2, C('#fff3c4')); carLights.setColorAt(i * 2 + 1, C('#ff3030')); });
[wBody, wHead, carM, carTop].forEach(m => { m.castShadow = true; scene.add(m); }); scene.add(carLights);
const _p = new V3(), _s = new V3();
function stepAgents(dt) {
  const upd = (a, i, side) => { let [u, v] = [a.path[a.seg], a.path[a.seg + 1]]; let P0 = nodes[u], P1 = nodes[v]; let L = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) || .01; a.t += a.speed * dt / L;
    while (a.t >= 1) { a.t -= 1; a.seg++; if (a.seg >= a.path.length - 1) newPath(a, a.path[a.path.length - 1]); [u, v] = [a.path[a.seg], a.path[a.seg + 1]]; P0 = nodes[u]; P1 = nodes[v]; L = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) || .01; }
    const dx = (P1[0] - P0[0]) / L, dz = (P1[1] - P0[1]) / L; return { x: P0[0] + (P1[0] - P0[0]) * a.t - dz * side, z: P0[1] + (P1[1] - P0[1]) * a.t + dx * side, ang: Math.atan2(dx, dz) }; };
  walkers.forEach((a, i) => { const p = upd(a, i, a.off * 3); const bob = Math.abs(Math.sin(simT * 3 + i)) * .3; wBody.setMatrixAt(i, M(p.x, 1.8 + bob, p.z, 1, 1, 1, p.ang)); wHead.setMatrixAt(i, M(p.x, 4.1 + bob, p.z, 1.5, 1.5, 1.5)); });
  cars.forEach((a, i) => { const p = upd(a, i, 2.4); carM.setMatrixAt(i, M(p.x, 1.1, p.z, 2.4, 1.6, 4.8, p.ang)); carTop.setMatrixAt(i, M(p.x - Math.sin(p.ang) * .3, 2.2, p.z - Math.cos(p.ang) * .3, 2.1, 1, 2.6, p.ang)); carLights.setMatrixAt(i * 2, M(p.x + Math.sin(p.ang) * 2.45, 1.2, p.z + Math.cos(p.ang) * 2.45, 2, .4, .1, p.ang)); carLights.setMatrixAt(i * 2 + 1, M(p.x - Math.sin(p.ang) * 2.45, 1.2, p.z - Math.cos(p.ang) * 2.45, 2, .4, .1, p.ang)); });
  [wBody, wHead, carM, carTop, carLights].forEach(m => m.instanceMatrix.needsUpdate = true);
}
/* day-night */
const KF = [[0, '#0a1030', '#1c2550', '#7d8cff', .35, '#5a6aa8', '#1e1c30', .35, 1, .62], [300, '#0d1536', '#232c5a', '#8090ff', .35, '#5a6aa8', '#1e1c30', .35, 1, .62], [370, '#8fa0d0', '#f4c2a2', '#ffb48a', 1.4, '#f3c6b5', '#6b5a5a', .9, .4, .9], [480, '#a9d1ea', '#fbe6d3', '#ffe8cc', 2.4, '#fff1e0', '#8a7a68', 1.15, 0, 1], [720, '#9fd0ec', '#f4eee3', '#fff4e4', 2.8, '#fff6ee', '#8f8270', 1.25, 0, 1], [960, '#a6cfe6', '#f8e7d2', '#ffe3c0', 2.4, '#fbefe4', '#8a7a66', 1.15, 0, 1], [1050, '#8b8fc4', '#f7b98f', '#ff9f6a', 1.7, '#f6d2bc', '#7d6660', 1.0, .3, .95], [1130, '#3d3f80', '#b07aa0', '#ff8a6a', .8, '#8a7cb0', '#3a3048', .6, .8, .75], [1230, '#0a1030', '#1c2550', '#7d8cff', .35, '#5a6aa8', '#1e1c30', .35, 1, .62], [1440, '#0a1030', '#1c2550', '#7d8cff', .35, '#5a6aa8', '#1e1c30', .35, 1, .62]].map(k => k.map(v => typeof v === 'string' ? C(v) : v));
let simT = 16 * 60, playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
function applyTime(min) { min = ((min % 1440) + 1440) % 1440; let i = 0; while (KF[i + 1][0] <= min) i++; const a = KF[i], b = KF[i + 1], f = (min - a[0]) / (b[0] - a[0]); const lc = k => a[k].clone().lerp(b[k], f), ln = k => a[k] + (b[k] - a[k]) * f;
  skyU.top.value.copy(lc(1)); skyU.hor.value.copy(lc(2)); scene.fog.color.copy(skyU.hor.value); sun.color.copy(lc(3)); sun.intensity = ln(4); hemi.color.copy(lc(5)); hemi.groundColor.copy(lc(6)); hemi.intensity = ln(7);
  const n = ln(8); U.night.value = n; renderer.toneMappingExposure = ln(9); bloom.strength = .12 + n * .6; bloom.threshold = .92 - n * .12; bloom.radius = .35;
  const day = Math.min(1, Math.max(0, (min - 330) / 840)), az = Math.PI * (.2 + .6 * day), el = n > .5 ? .9 : .35 + Math.sin(day * Math.PI) * .7;
  sun.position.set(Math.cos(az) * Math.cos(el) * 600, Math.sin(el) * 600, Math.sin(az) * Math.cos(el) * 300 + 250); board.material.color.set('#e9d6bf');
  if (gatePlane) gatePlane.color.setScalar(.75 + n * .6);
  $('#clock').textContent = String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(Math.floor(min % 60)).padStart(2, '0'); }
/* POIs, labels, cards */
const pois = D.pois.filter(p => p.n);
if (gate) pois.push({ id: null, n: '歌舞伎町一番街 アーチ', en: 'Kabukicho Ichibangai Arch', x: gate[0], z: gate[1], tags: { gate: 'yes' } });
const catOf = t => t.amenity && CAT[t.amenity] ? t.amenity : t.tourism && CAT[t.tourism] ? t.tourism : t.railway ? 'station' : t.shop ? t.shop : t.leisure ? 'park' : t.gate ? 'gate' : t.highway === 'pedestrian' ? 'pedestrian' : t.highway ? 'street' : 'building';
const labels = [];
function nameOf(p) { return lang === 'en' ? (p.en || p.n).split(';')[0] : p.n; }
pois.forEach((p, i) => { let y = 8; const near = bldInfo.reduce((b, q) => { const d = Math.hypot(q.cx - p.x, q.cz - p.z); return d < b[0] ? [d, q] : b; }, [1e9, null]); if (near[1] && near[0] < 18) y = near[1].hv + 6; if (p.tags.highway) y = 6;
  const el = document.createElement('div'); el.className = 'lb'; el.innerHTML = `<i>${String(i + 1).padStart(2, '0')}</i><span></span>`; el.onclick = e => { e.stopPropagation(); select(i); };
  const o = new CSS2DObject(el); o.position.set(p.x, y, p.z); scene.add(o); p.y = y; p.cat = catOf(p.tags); labels.push({ el, o, i, mode: 'full', prio: ['building', 'station', 'park', 'pedestrian'].includes(p.cat) || p.tags.height ? 1 : 0 }); });
function desc(p) { const t = T[lang], c = CAT[p.cat] || CAT.building, L = lang === 'en' ? 1 : 0; if (p.cat === 'gate') return t.gate; const bits = [];
  if (p.tags.height) bits.push(`${t.h} ${p.tags.height} m`); if (p.tags['building:levels']) bits.push(`${t.lv} ${p.tags['building:levels']}`); if (p.tags.operator) bits.push(`${t.op} ${p.tags.operator}`); if (p.tags.religion) bits.push(`${t.rel} ${p.tags.religion}`);
  const tg = Object.entries(p.tags).filter(([k]) => !['height', 'building:levels', 'operator', 'religion', 'website'].includes(k)).map(([k, v]) => `${k}=${v}`).join(', ');
  return `${c[L]}${lang === 'en' ? '. ' : '。'}${bits.join(' · ')}${bits.length ? (lang === 'en' ? '. ' : '。') : ''}${t.tags}: ${tg}${+p.tags.height > 45 ? t.comp : ''}`; }
let sel = -1;
function select(i) { sel = i; const p = pois[i]; $('#card').classList.add('on'); $('#cN').textContent = nameOf(p); $('#cE').textContent = lang === 'en' ? (p.en ? p.n : '') : (p.en || ''); $('#cD').textContent = desc(p);
  const a = $('#cL'); if (p.id) { a.style.display = ''; a.href = 'https://www.openstreetmap.org/' + p.id; a.textContent = T[lang].osm + ' (' + p.id + ')'; } else a.style.display = 'none';
  labels.forEach(l => l.el.classList.toggle('sel', l.i === i)); document.querySelectorAll('.it').forEach(e => e.classList.toggle('sel', +e.dataset.i === i));
  const tgt = new V3(p.x, Math.min(p.y * .5, 30), p.z), dist = Math.max(130, p.y * 2.4); const dir = camera.position.clone().sub(controls.target).setY(0).normalize(); flyTo(tgt.clone().add(new V3(dir.x * dist * .75, dist * .66, dir.z * dist * .75)), tgt);
  if (innerWidth < 700) $('#side').classList.remove('open'); }
function buildList() { const q = $('#q').value.trim().toLowerCase(); $('#list').innerHTML = ''; pois.forEach((p, i) => { const n = nameOf(p); if (q && !(p.n + ' ' + p.en).toLowerCase().includes(q)) return; const d = document.createElement('div'); d.className = 'it' + (i === sel ? ' sel' : ''); d.dataset.i = i; d.innerHTML = `<i>${String(i + 1).padStart(2, '0')}</i><span></span>`; d.querySelector('span').textContent = n; d.onclick = () => select(i); $('#list').appendChild(d); }); }
function applyLang() { const t = T[lang]; document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant'; $('#tTitle').textContent = t.title; $('#tSub').textContent = t.sub; $('#panoBtn').textContent = t.pano; $('#listBtn').textContent = t.list; $('#q').placeholder = t.q; $('#langBtn').textContent = lang === 'en' ? '中文' : 'EN'; labels.forEach(l => l.el.querySelector('span').textContent = nameOf(pois[l.i])); buildList(); if (sel >= 0) select(sel); }
/* camera */
let fly = null;
function flyTo(pos, tgt) { fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: tgt, k: 0 }; if (matchMedia('(prefers-reduced-motion: reduce)').matches) fly.k = .999; }
function panoPos() { const a = camera.aspect, hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * a); const vf = THREE.MathUtils.degToRad(camera.fov / 2); const R = a < .8 ? 215 : 360; const d = Math.max(R / Math.tan(hf), R * .8 / Math.tan(vf)) * (a < .8 ? .95 : .92); const L = d * 1.08; scene.fog.near = L * 1.3; scene.fog.far = L * 3.5; return new V3(d * .42, d * .78, d * .62); }
function pano() { sel = -1; $('#card').classList.remove('on'); labels.forEach(l => l.el.classList.remove('sel')); flyTo(panoPos(), new V3(-10, 0, -20)); }
camera.position.copy(panoPos()); controls.target.set(-10, 0, -20); controls.update();
/* label collision */
const _v = new V3();
function layoutLabels() { const Wd = innerWidth, H = innerHeight, narrow = Wd < 700; const panels = ['#brand', '#tools', '#side', '#hud', '#card', '#attr'].map(s => $(s)).filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').map(e => e.getBoundingClientRect()).filter(r => r.width); const placed = [];
  const order = [...labels].sort((a, b) => (b.i === sel) - (a.i === sel) || b.prio - a.prio);
  for (const L of order) { _v.copy(L.o.position).project(camera); const x = (_v.x * .5 + .5) * Wd, y = (-_v.y * .5 + .5) * H; let mode = 'hide';
    if (_v.z < 1) { const tryW = w => { const r = { l: x - w / 2, r: x + w / 2, t: y - 12, b: y + 12 }; if (r.l < 4 || r.r > Wd - 4 || r.t < 4 || r.b > H - 4) return null; for (const p of panels) if (r.l < p.right && r.r > p.left && r.t < p.bottom && r.b > p.top) return null; for (const p of placed) if (r.l - 4 < p.r && r.r + 4 > p.l && r.t - 3 < p.b && r.b + 3 > p.t) return null; return r; };
      const full = L.el.querySelector('span').offsetWidth + 40 || 120; let r = (narrow && L.i !== sel) ? null : tryW(full); if (r) mode = 'full'; else { r = tryW(28); if (r) mode = 'num'; } if (r) placed.push(r); }
    if (mode !== L.mode) { L.mode = mode; L.el.classList.toggle('num', mode === 'num'); L.el.classList.toggle('hide', mode === 'hide'); } } }
/* ui */
document.querySelectorAll('#hud [data-t]').forEach(b => b.onclick = () => { simT = +b.dataset.t; applyTime(simT); playing = false; $('#playBtn').textContent = '▶'; });
$('#playBtn').onclick = () => { playing = !playing; $('#playBtn').textContent = playing ? '❚❚' : '▶'; }; $('#playBtn').textContent = playing ? '❚❚' : '▶';
$('#panoBtn').onclick = pano; $('#listBtn').onclick = () => $('#side').classList.toggle('open'); $('#langBtn').onclick = () => { lang = lang === 'en' ? 'zh' : 'en'; applyLang(); };
$('#cardX').onclick = pano; $('#q').oninput = buildList; addEventListener('keydown', e => { if (e.key === 'Escape') pano(); });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); lr.setSize(innerWidth, innerHeight); if (sel < 0) { camera.position.copy(panoPos()); } });
applyLang(); applyTime(simT);
/* loop */
const clock = new THREE.Clock(); let fc = 0;
function loop() { renderer.info.reset(); const dt = Math.min(clock.getDelta(), .1); if (playing) { simT = (simT + dt * 4) % 1440; applyTime(simT); }
  stepAgents(dt); if (fly) { fly.k = Math.min(1, fly.k + dt / 1.2); const e = 1 - Math.pow(1 - fly.k, 3); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (fly.k >= 1) fly = null; }
  controls.update(); composer.render(); lr.render(scene, camera); if (fc++ % 3 === 0) layoutLabels(); requestAnimationFrame(loop); }
$('#load').remove(); loop();
if (TEST) window.__kb = { ready: true, dc: () => renderer.info.render.calls, stats: { buildings: O.b.length, roads: O.r.length, nodes: nodes.length, pois: pois.length, walkers: NW, cars: NC }, select };
} catch (err) { console.error(err); const l = $('#load'); if (l) l.innerHTML = '<div>初始化失敗 / Init failed</div><pre>' + String(err && err.stack || err).replace(/</g, '&lt;') + '</pre>'; }
