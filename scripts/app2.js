import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
const $ = s => document.querySelector(s), V3 = THREE.Vector3, C = c => new THREE.Color(c);
const fail = err => { console.error(err); const l = $('#load'); if (l) { l.style.display = 'flex'; l.innerHTML = '<div>初始化失敗 / Init failed / 初期化に失敗</div><pre>' + String(err && err.stack || err).replace(/</g, '&lt;') + '</pre>'; } };
/* ---------- i18n ---------- */
const T = {
  zh: { nmO: '名稱：OpenStreetMap 標籤', nmT: '名稱翻譯：本站依常用譯名／羅馬拼音補充（非 OSM）', tour: '地標導覽', tourStop: '停止導覽', title: '歌舞伎町', sub: '新宿 · OSM 黏土微縮地圖', pano: '重設視角', bird: '鳥瞰', route: '路線', list: '清單', q: '搜尋地點…', from: '起點', to: '終點', go: '規劃', swap: '對調', clear: '清除', fromHere: '從這裡出發', toHere: '到這裡', osm: '在 OpenStreetMap 檢視', walk: '步行', min: '分鐘', m: '公尺', noroute: '找不到路線', pick: '請選擇起點與終點', keys: '鍵盤：方向鍵/WASD 平移 · Q/E 旋轉 · +/− 縮放 · R 重設 · B 鳥瞰 · N 朝北 · / 搜尋', tags: 'OSM 標記', h: '高度', lv: '樓層', op: '營運', model: '模型為示意造型，位置依 OSM。', comp: '顯示高度已壓縮。', gg: '此區建物高度以低矮造型呈現（多數 OSM 無高度資料）。', north: '朝北', mm: '小地圖', play: '播放', pause: '暫停', loading: '載入中…', speed: '時間' },
  en: { nmO: 'Name: OpenStreetMap tags', nmT: 'Name translated by this map (common usage / Hepburn), not from OSM', tour: 'Landmark tour', tourStop: 'Stop tour', title: 'Kabukicho', sub: 'Shinjuku · OSM clay diorama', pano: 'Reset view', bird: "Bird's-eye", route: 'Route', list: 'List', q: 'Search places…', from: 'From', to: 'To', go: 'Go', swap: 'Swap', clear: 'Clear', fromHere: 'Route from here', toHere: 'Route to here', osm: 'View on OpenStreetMap', walk: 'Walk', min: 'min', m: 'm', noroute: 'No route found', pick: 'Pick a start and a destination', keys: 'Keys: arrows/WASD pan · Q/E rotate · +/− zoom · R reset · B bird’s-eye · N north · / search', tags: 'OSM tags', h: 'height', lv: 'levels', op: 'operator', model: 'Stylised model; position from OSM.', comp: 'Display height compressed.', gg: 'Buildings here are shown as low structures (most lack OSM height data).', north: 'North up', mm: 'Minimap', play: 'Play', pause: 'Pause', loading: 'Loading…', speed: 'Time' },
  ja: { nmO: '名称：OpenStreetMap タグ', nmT: '名称の翻訳は本サイトによる補足（OSM 外）', tour: 'ランドマーク巡り', tourStop: '巡回停止', title: '歌舞伎町', sub: '新宿 · OSM クレイ・ジオラマ', pano: '視点リセット', bird: '俯瞰', route: 'ルート', list: '一覧', q: '場所を検索…', from: '出発', to: '目的地', go: '検索', swap: '入替', clear: 'クリア', fromHere: 'ここから出発', toHere: 'ここへ行く', osm: 'OpenStreetMap で見る', walk: '徒歩', min: '分', m: 'm', noroute: 'ルートが見つかりません', pick: '出発地と目的地を選んでください', keys: 'キー：矢印/WASD 移動 · Q/E 回転 · +/− ズーム · R リセット · B 俯瞰 · N 北向き · / 検索', tags: 'OSM タグ', h: '高さ', lv: '階数', op: '運営', model: '造形はイメージ、位置は OSM に基づく。', comp: '表示上の高さは圧縮。', gg: 'この一帯の建物は低層の造形で表示（多くは OSM に高さ情報なし）。', north: '北を上に', mm: 'ミニマップ', play: '再生', pause: '一時停止', loading: '読み込み中…', speed: '時刻' } };
const KCAT = { batting: ['打擊練習場', 'Batting center', 'バッティングセンター'], tower: ['高層複合大樓', 'High-rise complex', '高層複合ビル'], toho: ['商業大樓', 'Commercial building', '商業ビル'], plaza: ['行人廣場', 'Pedestrian square', '歩行者広場'], street: ['街道', 'Street', '通り'], goldengai: ['飲食街區', 'Bar & eatery district', '飲食店街'], shrine: ['神社', 'Shrine', '神社'], station: ['車站', 'Station', '駅'], hotel: ['飯店', 'Hotel', 'ホテル'], shop: ['商店', 'Shop', '店舗'], park: ['公園', 'Park', '公園'], civic: ['公共設施', 'Public facility', '公共施設'], venue: ['表演／娛樂場地', 'Venue', '劇場・娯楽施設'], gate: ['拱門', 'Arch', 'アーチ'] };
const LI = { zh: 0, en: 1, ja: 2 };
const params = new URLSearchParams(location.search);
let lang = ['en', 'ja', 'zh'].includes(params.get('lang')) ? params.get('lang') : (localStorage.getItem('kbLang') || 'zh');
if (!T[lang]) lang = 'zh';
const TEST = params.has('test'), FREEZE = params.has('freeze');
const nmOf = a => !a ? '' : lang === 'en' ? (a[1] || a[0]) : lang === 'ja' ? (a[2] || a[0]) : (a[3] || a[0]);
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261024);
/* ---------- data decode (deflate-raw + zigzag varint, decimetres) ---------- */
async function decode(D) {
  const bytes = Uint8Array.from(atob(D.bin), c => c.charCodeAt(0));
  const buf = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  let p = 0; const rv = () => { let v = 0, s = 1, b; do { b = buf[p++]; v += (b & 127) * s; s *= 128; } while (b & 128); return v % 2 ? -(v + 1) / 2 : v / 2; };
  const pts = () => { const n = rv(); const o = []; if (!n) return o; let x = rv(), z = rv(); o.push([x / 10, z / 10]); for (let i = 1; i < n; i++) { x += rv(); z += rv(); o.push([x / 10, z / 10]); } return o; };
  const O = { nodes: [], b: [], r: [], rl: [], g: [], trees: [] };
  let n = rv(), x = 0, z = 0; for (let i = 0; i < n; i++) { x += rv(); z += rv(); O.nodes.push([x / 10, z / 10]); }
  n = rv(); for (let i = 0; i < n; i++) { const h = rv() / 10, k = rv(), nm = rv(); O.b.push([h, k, nm, pts()]); }
  n = rv(); for (let i = 0; i < n; i++) { const c = rv(), nm = rv(), m = rv(); let pv = 0; const s = []; for (let j = 0; j < m; j++) { pv += rv(); s.push(pv); } O.r.push([c, nm, s]); }
  n = rv(); for (let i = 0; i < n; i++) { const t = rv(); O.rl.push([t, pts()]); }
  n = rv(); for (let i = 0; i < n; i++) { const t = rv(), nm = rv(); O.g.push([t, nm, pts()]); }
  O.trees = pts(); return O;
}
async function main() {
const D = JSON.parse($('#DATA').textContent), O = await decode(D), NAMES = D.names; O.r.forEach((r, k) => r.push(D.rw[k] / 2));
const rname = i => i ? NAMES[i - 1] : null;
/* ---------- renderer ---------- */
const canvas = $('#c'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.info.autoReset = false;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#f3e6d6', 900, 2600);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 15, 6000); // tight near plane → stable depth
const lr = new CSS2DRenderer({ element: $('#lbl') }); lr.setSize(innerWidth, innerHeight);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = .09; controls.maxPolarAngle = 1.3; controls.minDistance = 22; controls.maxDistance = 1700; controls.screenSpacePanning = false;
const hemi = new THREE.HemisphereLight('#fff4e6', '#8a6f60', 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d8', 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -400, right: 400, top: 400, bottom: -400, near: 200, far: 1500 }); sun.shadow.bias = -0.00025; sun.shadow.normalBias = .9; sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .5, .35, .9); composer.addPass(bloom); composer.addPass(new OutputPass()); let bloomBase = .1;
const skyU = { top: { value: C('#9fd0ec') }, hor: { value: C('#f7e6d3') } };
scene.add(new THREE.Mesh(new THREE.SphereGeometry(3500, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 top,hor;varying vec3 p;void main(){float h=clamp(normalize(p).y*2.2,0.,1.);gl_FragColor=vec4(mix(hor,top,h),1.);}' })));
/* ---------- materials ---------- */
const U = { night: { value: 0 }, time: { value: 0 } };
function neonMat(day = .15, nightK = 1.8) { const m = new THREE.MeshStandardMaterial({ roughness: .5 }); m.onBeforeCompile = s => { s.uniforms.uNight = U.night; s.fragmentShader = 'uniform float uNight;\n' + s.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance += vColor * (${day.toFixed(2)} + uNight * ${nightK.toFixed(2)});\n#endif`); }; m.customProgramCacheKey = () => 'neon' + day + nightK; return m; }
const clay = new THREE.MeshStandardMaterial({ roughness: .85 });
const bldMat = new THREE.MeshStandardMaterial({ roughness: .82, vertexColors: true });
bldMat.onBeforeCompile = s => {
  s.uniforms.uNight = U.night;
  s.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz; vWN=normalize(mat3(modelMatrix)*objectNormal);');
  s.fragmentShader = 'uniform float uNight; varying vec3 vWP; varying vec3 vWN;\nfloat hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat pulse(float a,float b,float x,float w){return smoothstep(a-w,a+w,x)-smoothstep(b-w,b+w,x);}\n' + s.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  if (abs(vWN.y) < .5) {
    float u = (abs(vWN.x) > abs(vWN.z) ? vWP.z : vWP.x) / 2.8, v = vWP.y / 3.3;
    vec2 cell = floor(vec2(u, v)), f = fract(vec2(u, v));
    vec2 fw = max(fwidth(vec2(u, v)), vec2(1e-4));
    float win = pulse(.22, .78, f.x, fw.x) * pulse(.3, .78, f.y, fw.y);
    float far = smoothstep(.25, .6, max(fw.x, fw.y));      // pattern below pixel size → fade to average (no shimmer)
    float lit = step(.72, hsh(cell + floor(vWP.xz / 40.)));
    win = mix(win, .31, far); lit = mix(lit, .28, far);
    vec3 wc = mix(vec3(1., .72, .4), vec3(.75, .85, 1.), step(.8, hsh(cell * 1.7)));
    float ground = step(vWP.y, 3.6) * step(.6, vWP.y);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * .8 + vec3(.04, .05, .07), win * (1. - ground) * .5);
    totalEmissiveRadiance += uNight * (win * lit * (1. - ground) * wc * .8 + ground * vec3(1., .55, .3) * .6);
  }`);
};
bldMat.customProgramCacheKey = () => 'bld';
const neon = neonMat(), neonSoft = neonMat(.1, 1.6);
/* ---------- instanced kit ---------- */
const kit = {};
const GEO = { box: new THREE.BoxGeometry(1, 1, 1), rbox: new RoundedBoxGeometry(1, 1, 1, 2, .18), sph: new THREE.SphereGeometry(.5, 12, 8), cyl: new THREE.CylinderGeometry(.5, .5, 1, 10), cone: new THREE.ConeGeometry(.5, 1, 9), disc: new THREE.CylinderGeometry(.5, .5, 1, 14) };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3();
function M(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); return _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)); }
function put(kind, geo, mat, m, color, shadow = true) { (kit[kind] ||= { geo, mat, list: [], shadow }).list.push([m.clone(), C(color)]); }
function finalizeKit() { for (const k in kit) { const g = kit[k]; const im = new THREE.InstancedMesh(g.geo, g.mat, g.list.length); g.list.forEach(([m, c], i) => { im.setMatrixAt(i, m); im.setColorAt(i, c); }); g.im = im; im.castShadow = g.shadow; im.receiveShadow = true; im.matrixAutoUpdate = false; scene.add(im); g.im = im; } }
/* ---------- board ---------- */
const BX = 372, BZ = 345;
const board = new THREE.Mesh(new RoundedBoxGeometry(BX * 2, 16, BZ * 2, 3, 6), new THREE.MeshStandardMaterial({ color: '#e9d6bf', roughness: .95 })); board.position.y = -8; board.receiveShadow = true; scene.add(board);
const table = new THREE.Mesh(new THREE.CircleGeometry(2600, 48), new THREE.MeshStandardMaterial({ color: '#d9c3a8', roughness: 1 })); table.rotation.x = -Math.PI / 2; table.position.y = -16.5; table.receiveShadow = true; scene.add(table);
/* ground layer heights: well separated + polygonOffset (fix z-fighting) */
const Y = { area: .25, rail: .45, road: [1.05, .95, .85, .75, .65], mark: 1.12, route: 1.9 };
function gmat(color, off) { return new THREE.MeshStandardMaterial({ color, roughness: .92, polygonOffset: true, polygonOffsetFactor: -off, polygonOffsetUnits: -off * 2 }); }
const nodes = O.nodes, W = [15, 10, 6, 9, 2.6], RCOL = ['#5d5866', '#6c6672', '#7c7478', '#e0c7a6', '#d3bb9f'];
function strip(pts, w, y) { const pos = [], idx = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const L = Math.hypot(bx - ax, bz - az) || 1; const nx = -(bz - az) / L * w / 2, nz = (bx - ax) / L * w / 2; const o = pos.length / 3; pos.push(ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz); idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
function discGeo(x, z, r, y) { const g = new THREE.CircleGeometry(r, 12); g.rotateX(-Math.PI / 2); g.translate(x, y, z); return g; }
const roadGeos = [[], [], [], [], []], adj = new Map(), carAdj = new Map(), deg = new Map(), namedRoads = {};
const link = (A, a, b, w) => { if (!A.has(a)) A.set(a, []); if (!A.has(b)) A.set(b, []); A.get(a).push([b, w]); A.get(b).push([a, w]); };
O.r.forEach(([cls, ni, seq, wide]) => {
  const pts = seq.map(i => nodes[i]); roadGeos[cls].push(strip(pts, wide, Y.road[cls]));
  if (cls < 4) seq.forEach(i => roadGeos[cls].push(discGeo(nodes[i][0], nodes[i][1], wide / 2, Y.road[cls])));
  for (let i = 0; i < seq.length - 1; i++) { const a = seq[i], b = seq[i + 1], L = Math.hypot(nodes[a][0] - nodes[b][0], nodes[a][1] - nodes[b][1]); link(adj, a, b, L); if (cls <= 1) link(carAdj, a, b, L); }
  seq.forEach(i => deg.set(i, (deg.get(i) || 0) + 1));
  if (ni) (namedRoads[NAMES[ni - 1][0]] ||= []).push(Object.assign(pts, { w: wide }));
});
roadGeos.forEach((gs, cls) => { if (!gs.length) return; const g = mergeGeometries(gs.map(g => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); g.deleteAttribute('normal'); return g; })); g.computeVertexNormals(); const m = new THREE.Mesh(g, gmat(RCOL[cls], 2 + (4 - cls))); m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m); });
const markMat = gmat('#f6f1e6', 8);
O.r.forEach(([cls, , seq, rw]) => { if (cls > 1) return; for (let i = 0; i < seq.length - 1; i++) { const [ax, az] = nodes[seq[i]], [bx, bz] = nodes[seq[i + 1]]; const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
  if (cls === 0) for (let s = 4; s < L - 4; s += 9) put('mark', GEO.box, markMat, M(ax + (bx - ax) * s / L, Y.mark, az + (bz - az) * s / L, .5, .02, 4, ang), '#f6f1e6', false);
  [0, 1].forEach(e => { const n = seq[i + e]; if ((deg.get(n) || 0) >= 3 && L > 16) { const t = e ? (L - 7) / L : 7 / L; for (let k = -3; k <= 3; k++) { const px = ax + (bx - ax) * t + Math.cos(ang) * k * 1.6 * rw / 10, pz = az + (bz - az) * t - Math.sin(ang) * k * 1.6 * rw / 10; put('mark', GEO.box, markMat, M(px, Y.mark, pz, .8, .02, 3.2, ang), '#fbf8f0', false); } } }); } });
/* rail + station canopies */
const railGeos = [];
const stPoi = D.pois.find(p => p.id === 'node/6283010875');
O.rl.forEach(([t, pts]) => { railGeos.push(strip(pts, 4.2, Y.rail)); for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az); [-.75, .75].forEach(o => put('rail', GEO.box, clay, M((ax + bx) / 2 + Math.cos(ang) * o, .65, (az + bz) / 2 - Math.sin(ang) * o, .2, .2, L, ang), '#6a6a72', false));
  if (stPoi) for (let s = 0; s < L; s += 8) { const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L; if (Math.hypot(x - stPoi.x, z - stPoi.z) < 95 && (s / 8 | 0) % 1 === 0) put('canopy', GEO.rbox, clay, M(x, 6, z, 7, .5, 8.2, ang), '#e8e2d6'); } } });
if (railGeos.length) { const m = new THREE.Mesh(mergeGeometries(railGeos.map(g => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); return g; })), gmat('#a08a7a', 1)); m.receiveShadow = true; scene.add(m); }
/* areas: 0 park, 1 plaza, 2 shrine grounds, 3 Golden Gai */
function polyGeo(pts, y) { const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }
const ACOL = ['#a9c98a', '#ead3b0', '#d9cdb8', '#8f6f5a'], areaGeos = [], parks = [], areasByT = {};
O.g.forEach(([t, ni, pts]) => { if (pts.length < 3) return; (areaGeos[t] ||= []).push(polyGeo(pts, Y.area + t * .04)); (areasByT[t] ||= []).push(pts); if (t === 0 || t === 2) parks.push(pts); });
areaGeos.forEach((gs, t) => { if (!gs) return; const m = new THREE.Mesh(mergeGeometries(gs), gmat(ACOL[t], 1 + t * .5)); m.receiveShadow = true; scene.add(m); });
const inPoly = (x, z, f) => { let c = false; for (let i = 0, j = f.length - 1; i < f.length; j = i++) { const [xi, zi] = f[i], [xj, zj] = f[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
// Cinecity paving grid
(areasByT[1] || []).forEach(pts => { let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; pts.forEach(([x, z]) => { minx = Math.min(minx, x); maxx = Math.max(maxx, x); minz = Math.min(minz, z); maxz = Math.max(maxz, z); }); for (let x = minx; x < maxx; x += 6) for (let z = minz; z < maxz; z += 6) if (inPoly(x + 3, z + 3, pts)) put('pave', GEO.box, gmat('#fff', 3), M(x + 3, Y.area + .1, z + 3, 5.4, .05, 5.4), ((x + z) / 6 | 0) % 2 ? '#e3c9a4' : '#f1dcc0', false); });
/* ---------- buildings ---------- */
const PAL = ['#f2b58a', '#f4a5a0', '#f7d58c', '#a8d5c2', '#b9c8ec', '#f3e0cf', '#e8b9d0', '#cfe0a8', '#f0c0b0', '#9fc7d8', '#e6c79c', '#d8c8e8', '#ffe2b8', '#c7b8a8'];
const GGPAL = ['#8a5a44', '#a5684c', '#6f4e3e', '#b98a5e', '#7a6050', '#9b4f3f', '#c9a273'];
const NEON = ['#ff3d8b', '#33e6ff', '#ffd23d', '#b45cff', '#ff4b3d', '#4dff88', '#ff8a2b'];
const hComp = h => h <= 45 ? h : 45 + (h - 45) * .5;
const bgeos = [], ggGeos = [], hzGeos = [], bldInfo = [], LMK = {};
const roadPts = []; O.r.forEach(([cls, , seq]) => { if (cls <= 3) seq.forEach(i => roadPts.push(nodes[i])); });
function edgeFacing(pts) { let best = -1, bl = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; let dmin = 1e9; for (let k = 0; k < roadPts.length; k += 3) { const d = (roadPts[k][0] - mx) ** 2 + (roadPts[k][1] - mz) ** 2; if (d < dmin) dmin = d; } const sc = L / (1 + Math.sqrt(dmin) * .15); if (sc > bl && L > 2.5) { bl = sc; best = i; } } return best; }
function edgeFrame(pts, i) { const a = pts[i], b = pts[(i + 1) % pts.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); let nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (inPoly(mx + nx * .8, mz + nz * .8, pts)) { nx = -nx; nz = -nz; } return { a, b, L, nx, nz, mx, mz, ang: Math.atan2(b[0] - a[0], b[1] - a[1]) }; }
function extrude(pts, h, col, top) { const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(.5, h - .6), bevelEnabled: true, bevelThickness: .6, bevelSize: .6, bevelOffset: -.6, bevelSegments: 1, curveSegments: 1 }); g.rotateX(-Math.PI / 2); g.deleteAttribute('uv'); const n = g.attributes.position.count, ca = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const c = g.attributes.position.getY(i) > h - .1 ? top : col; ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); return g; }
/* v11: the Blender clay diorama replaces the OSM blocks around the Ichibangai gate; frame = same placement as the GLB below */
const GF = (() => { const p = inward(D.meta.gate, '歌舞伎町一番街通り', 10), dir = roadDir('歌舞伎町一番街通り', p), half = roadW('歌舞伎町一番街通り', p) / 2 + .8, fs = Math.sign(Math.sin(dir) * p[2] + Math.cos(dir) * p[3]) || 1; return { x: p[0], z: p[1], ry: dir + (fs > 0 ? Math.PI : 0), s: half * 2 / 11.6 }; })();
const DIO_RECTS = [[-43, 43, -2.5, 12.5], [-23, 23, 10, 42], [-31, 31, 12, 26.5]]; // Blender x/y footprints of the exported near buildings
const GF2 = (() => { const p = inward(D.meta.gate2, 'セントラルロード', 10), dir = roadDir('セントラルロード', p), half = roadW('セントラルロード', p) / 2 + .8, fs = Math.sign(Math.sin(dir) * p[2] + Math.cos(dir) * p[3]) || 1; return { x: p[0], z: p[1], ry: dir + (fs > 0 ? Math.PI : 0), s: half * 2 / 11.6 }; })();
function inDio(wx, wz) { return [GF, GF2].some(F => { const dx = wx - F.x, dz = wz - F.z, c = Math.cos(F.ry), sn = Math.sin(F.ry), lx = (dx * c - dz * sn) / F.s, ly = -(dx * sn + dz * c) / F.s; return DIO_RECTS.some(([x0, x1, y0, y1]) => lx > x0 && lx < x1 && ly > y0 && ly < y1); }); }
const hotel = D.pois.find(p => p.id === 'node/475090904'), pepe = D.pois.find(p => p.id === 'node/4919950721');
O.b.forEach(([h, kind, ni, pts], bi) => {
  const r = mulberry32(bi * 7919 + 13); let hv = Math.max(3, hComp(h));
  let cx = 0, cz = 0; pts.forEach(p => { cx += p[0]; cz += p[1]; }); cx /= pts.length; cz /= pts.length;
  if (hotel && inPoly(hotel.x, hotel.z, pts)) kind = 8; if (pepe && inPoly(pepe.x, pepe.z, pts)) kind = 9;
  if (kind < 2 && inDio(cx, cz)) return;
  const info = { cx, cz, hv, pts, kind }; bldInfo.push(info); if (kind >= 3) (LMK[kind] ||= []).push(info);
  if (kind === 3) return; // Tokyu Kabukicho Tower: Blender LOD (assets/map_lods.glb)
  const core = cx > -240 && cx < 230 && cz > -220 && cz < 110;
  let col = C(kind === 2 ? '#d2553d' : kind === 7 ? GGPAL[Math.floor(r() * GGPAL.length)] : kind === 8 ? '#b4644a' : kind === 4 ? '#e9e2d6' : kind === 5 ? '#f2d24a' : PAL[Math.floor(r() * PAL.length)]);
  const top = C(kind === 2 ? '#7b4a3a' : kind === 7 ? '#5a4036' : '#cbb7a5').lerp(col, .3);
  try { (kind === 7 ? ggGeos : (areasByT[2] || []).some(A => inPoly(cx, cz, A)) ? hzGeos : bgeos).push(extrude(pts, hv, col, top)); } catch (e) { return; }
  if (kind === 7 || (areasByT[2] || []).some(A => inPoly(cx, cz, A))) return;
  if (kind === 2) { put('roofS', GEO.cone, clay, M(cx, hv + 1.4, cz, 7, 3, 7, Math.PI / 4), '#5a3a30'); return; } // shrine hall / Golden Gai shacks: placeholders until their Blender LOD streams in
  if (false) { // Golden Gai: tiny signs + lanterns on every shop
    const ei = edgeFacing(pts); if (ei < 0) return; const f = edgeFrame(pts, ei);
    put('ggSign', GEO.rbox, neonSoft, M(f.mx + f.nx * .6, 3.4 + r() * 1.5, f.mz + f.nz * .6, Math.min(f.L * .7, 2.4), .9, .25, f.ang + Math.PI / 2), NEON[Math.floor(r() * NEON.length)], false);
    put('ggLamp', GEO.sph, neonSoft, M(f.mx + f.nx * .9, 2.4, f.mz + f.nz * .9, .6, .8, .6), r() < .6 ? '#ff5a3d' : '#ffd27a', false); return; }
  if (r() < .5 && hv > 8) put('roofbox', GEO.rbox, clay, M(cx + (r() - .5) * 3, hv + .9, cz + (r() - .5) * 3, 2 + r() * 2, 1.8, 2 + r() * 2), '#d8d0c8');
  if (r() < .25 && hv > 12) put('tank', GEO.cyl, clay, M(cx - 2, hv + 1.6, cz + 1.5, 2, 3.2, 2), '#9fb3bf');
  if (hv < 7 || r() > (core ? .5 : .12) || [D.meta.gate, D.meta.gate2].some(g => Math.hypot(g[0] - cx, g[1] - cz) < 45)) return;
  const ei = edgeFacing(pts); if (ei < 0) return; const f = edgeFrame(pts, ei);
  const nc = NEON[Math.floor(r() * NEON.length)], nS = 1;
  for (let s = 0; s < nS; s++) { const t = .15 + .7 * (s + .5) / nS; const px = f.a[0] + (f.b[0] - f.a[0]) * t + f.nx * 1.4, pz = f.a[1] + (f.b[1] - f.a[1]) * t + f.nz * 1.4; const sh2 = Math.min(hv * .7, 7 + r() * 8); const y0 = 4 + r() * Math.max(0, hv - sh2 - 5);
    put('blade', GEO.rbox, neon, M(px, y0 + sh2 / 2, pz, 1, sh2, 3, f.ang + Math.PI / 2), NEON[Math.floor(r() * NEON.length)]); }
  put('band', GEO.box, neon, M(f.mx + f.nx * .45, 3.9, f.mz + f.nz * .45, Math.min(f.L * .85, 22), 1.3, .4, f.ang + Math.PI), nc);
  put('awning', GEO.box, clay, M(f.mx + f.nx * 1.2, 3.1, f.mz + f.nz * 1.2, Math.min(f.L * .8, 20), .3, 2.2, f.ang + Math.PI), ['#c8402f', '#2f6c8f', '#e7a83c', '#5b8a4a'][Math.floor(r() * 4)]);
  if (hv > 20 && r() < .5 && ![D.meta.gate, D.meta.gate2].some(g => Math.hypot(g[0] - cx, g[1] - cz) < 40)) put('roofsign', GEO.rbox, neon, M(cx, hv + 3.5, cz, Math.min(f.L * .6, 14), 5, .8, f.ang), nc);
});
const PH = {}; [['b', bgeos], ['gg', ggGeos], ['hz', hzGeos]].forEach(([k, a]) => { if (!a.length) return; const m = new THREE.Mesh(mergeGeometries(a), bldMat); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m); PH[k] = m; });
/* canvas text sign helper (plain text, no logos) */
function textSign(lines, w, h, bg, fg, x, y, z, ry, sw, shh) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; lines.forEach((l, i) => { c.font = `bold ${l[1]}px sans-serif`; c.fillText(l[0], w / 2, h * (i + .5) / lines.length + 2); }); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }); const pl = new THREE.Mesh(new THREE.PlaneGeometry(sw, shh), mat); pl.position.set(x, y, z); pl.rotation.y = ry; scene.add(pl); signs.push(mat); return pl; }
const signs = [];
const procK0 = Object.fromEntries(Object.entries(kit).map(([k, v]) => [k, v.list.length])), procS0 = scene.children.length;
/* --- Landmark: Tokyu Kabukicho Tower (tapered slender tower + fountain-like crown fins) --- */
(LMK[3] || []).forEach(info => { const xs = info.pts.map(p => p[0]), zs = info.pts.map(p => p[1]); const w = Math.max(...xs) - Math.min(...xs), d = Math.max(...zs) - Math.min(...zs);
  const pod = extrude(info.pts, 24, C('#d6dde6'), C('#c4ccd6')); const pm = new THREE.Mesh(pod, bldMat); pm.castShadow = pm.receiveShadow = true; scene.add(pm);
  const glass = new THREE.MeshStandardMaterial({ color: '#9fb8d8', roughness: .25, metalness: .35, vertexColors: false });
  const H = hComp(225), segs = 7, base = Math.min(w, d) * .62;
  for (let i = 0; i < segs; i++) { const y0 = 24 + (H - 34) * i / segs, y1 = 24 + (H - 34) * (i + 1) / segs, s0 = base * (1 - i * .055), s1 = base * (1 - (i + 1) * .055);
    const g = new THREE.CylinderGeometry(s1 / 2 * 1.08, s0 / 2 * 1.08, y1 - y0 - .4, 8, 1); g.rotateY(Math.PI / 8); const m = new THREE.Mesh(g, glass); m.scale.set(1, 1, d / w > 1.3 ? 1.35 : 1); m.position.set(info.cx, (y0 + y1) / 2, info.cz); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    put('towerBand', GEO.cyl, neonSoft, M(info.cx, y1 - .2, info.cz, s1 * 1.1, .5, s1 * 1.1 * (d / w > 1.3 ? 1.35 : 1)), '#bfe8ff', false); }
  const topY = 24 + (H - 34), sT = base * (1 - segs * .055);
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; put('crownFin', GEO.rbox, neon, M(info.cx + Math.cos(a) * sT * .42, topY + 6, info.cz + Math.sin(a) * sT * .42, 1, 14, 3.2, -a, 0, .32), k % 2 ? '#9fe6ff' : '#e6f6ff'); }
  put('crownCore', GEO.cyl, neon, M(info.cx, topY + 3, info.cz, sT * .5, 6, sT * .5), '#cfefff'); for (let k = 0; k < 3; k++) put('crownRing', GEO.disc, neon, M(info.cx, topY - 4 - k * 9, info.cz, sT * 1.15, .7, sT * 1.15), ['#ff5fd2', '#7fe0ff', '#ffd23d'][k], false); textSign([['東急歌舞伎町タワー', 64]], 640, 96, '#1b1f3a', '#bfe8ff', info.cx, 30, info.cz + base * .62, 0, 22, 3.3);
  LMK.tower = { x: info.cx, z: info.cz, y: topY + 14, ry: (() => { const pl = D.pois.find(p => p.k === 'plaza'); return pl ? Math.atan2(pl.x - info.cx, pl.z - info.cz) : 0; })() }; });
const gzLight = new THREE.SpotLight('#cfe4ff', 0, 70, .6, .5, 0);
/* --- Landmark: Shinjuku Toho Building + stylised Godzilla head on the building edge facing Cinecity --- */
(LMK[4] || []).forEach(info => { const plaza = D.pois.find(p => p.k === 'plaza') || { x: info.cx - 50, z: info.cz }; let bi = 0, bd = 1e9; info.pts.forEach((p, i) => { const d = Math.hypot(p[0] - plaza.x, p[1] - plaza.z); if (d < bd) { bd = d; bi = i; } });
  const [vx, vz] = info.pts[bi]; const gx = vx + (info.cx - vx) * .18, gz = vz + (info.cz - vz) * .18, gy = info.hv, face = Math.atan2(plaza.x - gx, plaza.z - gz);
  const G = '#5f6b5a', sx = Math.sin(face), sz = Math.cos(face), rx = Math.cos(face), rz = -Math.sin(face);
  const GS = 1.9; const at = (f, u, y) => [gx + sx * f * GS + rx * u * GS, gy + y * GS, gz + sz * f * GS + rz * u * GS];
  const P = (kind, geo, mat, f, u, y, w, h, d, col, pitch = 0) => { const [x, yy, z] = at(f, u, y); put(kind, geo, mat, M(x, yy, z, w * GS, h * GS, d * GS, face, pitch), col); };
  P('gz', GEO.cyl, clay, -3.5, 0, 4, 6, 8, 6, G); // neck
  P('gz', GEO.rbox, clay, 0, 0, 9, 7, 6, 8.5, G); // skull
  P('gz', GEO.rbox, clay, 5.5, 0, 8.6, 5.4, 3.4, 6, G); // snout
  P('gz', GEO.rbox, clay, 4.6, 0, 5.6, 5, 1.6, 6.5, '#4f5a4a', .35); // open jaw
  P('gzT', GEO.box, clay, 7.6, 0, 7.0, .6, .9, 4.8, '#f3efe2'); P('gzT', GEO.box, clay, 6.8, 0, 6.4, .6, .8, 4.6, '#f3efe2');
  [-1.9, 1.9].forEach(u => { P('gzE', GEO.sph, neon, 3.4, u, 10.6, 1.5, 1, 1.5, '#fff27a'); P('gzE', GEO.box, neon, 3.9, u, 11.6, .4, .3, 2.2, '#ff5a2a'); });
  { const [lx, ly, lz] = at(14, 0, 4); gzLight.position.set(lx, ly, lz); const [tx, ty, tz] = at(0, 0, 8); gzLight.target.position.set(tx, ty, tz); scene.add(gzLight, gzLight.target); }
  for (let k = 0; k < 5; k++) P('gzS', GEO.cone, clay, -2.5 - k * 2.2, 0, 12.5 - k * 1.6, 1.4, 4 - k * .4, 3, '#d9d4c4');
  LMK.godzilla = { x: gx, z: gz, y: gy + 26, face: [sx, sz], gy, ry: face }; });
for (const k in kit) kit[k].list.length = Math.min(kit[k].list.length, procK0[k] ?? 0); scene.children.slice(procS0).forEach(o => { scene.remove(o); o.geometry && o.geometry.dispose(); }); // v12: tower + Godzilla now come from the Blender map LODs
/* --- Don Quijote + PePe + Prince hotel generic signage (text only) --- */
function facadeSign(info, text, bg, fg, y) { const ei = edgeFacing(info.pts); if (ei < 0) return; const f = edgeFrame(info.pts, ei); const w = Math.min(f.L * .85, 26); textSign([[text, 70]], 1024, 128, bg, fg, f.mx + f.nx * .9, y, f.mz + f.nz * .9, Math.atan2(f.nx, f.nz), w, w / 8); }
(LMK[5] || []).forEach(info => { facadeSign(info, 'ドン・キホーテ', '#f6d23a', '#d4202c', Math.min(info.hv - 3, 20)); for (let k = 0; k < 6; k++) put('blade', GEO.rbox, neon, M(info.cx + (k - 2.5) * 2.4, info.hv + 2, info.cz, 1.8, 3.4, .6), k % 2 ? '#ffd23d' : '#ff3344'); });
(LMK[9] || []).slice(0, 1).forEach(info => facadeSign(info, 'Seibu Shinjuku PePe', '#2b6fb6', '#ffffff', 8));
(LMK[8] || []).slice(0, 1).forEach(info => { facadeSign(info, 'PRINCE HOTEL', '#7a2f26', '#ffe9c7', Math.min(info.hv - 4, 60)); });
if (stPoi) { let bd = 1e9, ang = 0; O.rl.forEach(([, pts]) => pts.forEach((p, i) => { const d = Math.hypot(p[0] - stPoi.x, p[1] - stPoi.z); if (d < bd && pts[i + 1]) { bd = d; ang = Math.atan2(pts[i + 1][0] - p[0], pts[i + 1][1] - p[1]); } })); textSign([['西武新宿駅', 60], ['Seibu-Shinjuku Sta.', 40]], 512, 160, '#1f4f8f', '#ffffff', stPoi.x, 11, stPoi.z, ang + Math.PI / 2, 16, 5); put('pole', GEO.cyl, clay, M(stPoi.x, 4.5, stPoi.z, .5, 9, .5), '#5d5a60'); }
/* --- Hero street gates (stylised homage: red steel arch, glowing signboard framed by bulbs) --- */
const gate = D.meta.gate, gate2 = D.meta.gate2;
function roadDir(name, p) { let dir = 0, bd = 1e9; (namedRoads[name] || []).forEach(q => q.forEach((v, i) => { const d = Math.hypot(v[0] - p[0], v[1] - p[1]); const w = q[i + 1] || q[i - 1]; if (d < bd && w) { bd = d; dir = q[i + 1] ? Math.atan2(w[0] - v[0], w[1] - v[1]) : Math.atan2(v[0] - w[0], v[1] - w[1]); } })); return dir; }
function glowSign(text, sub, w, h, bg, fg, glow) { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = Math.round(1024 * h / w); const c = cv.getContext('2d'), H = cv.height;
  c.fillStyle = bg; c.fillRect(0, 0, 1024, H); c.strokeStyle = fg; c.lineWidth = H * .05; c.strokeRect(H * .06, H * .06, 1024 - H * .12, H - H * .12);
  c.textAlign = 'center'; c.textBaseline = 'middle'; let fs = Math.min(H * (sub ? .5 : .62), 1024 * .86 / text.length); const light = parseInt(bg.slice(1, 3), 16) > 200, FF = light ? '"Hiragino Kaku Gothic ProN","Noto Sans CJK JP","Yu Gothic",sans-serif' : '"Hiragino Mincho ProN","Noto Serif CJK JP","Noto Sans CJK JP",serif'; c.font = `900 ${fs}px ${FF}`; const tw = c.measureText(text).width; if (tw > 1024 * .84) { fs *= 1024 * .84 / tw; c.font = `900 ${fs}px ${FF}`; }
  c.shadowColor = glow; c.shadowBlur = H * .12; c.fillStyle = fg; for (let k = 0; k < 2; k++) c.fillText(text, 512, H * (sub ? .42 : .52)); c.shadowBlur = 0; c.fillStyle = '#ffffff'; c.globalAlpha = light ? 0 : .55; c.fillText(text, 512, H * (sub ? .42 : .52)); c.globalAlpha = 1;
  if (sub) { c.font = `700 ${H * .16}px sans-serif`; c.fillStyle = fg; c.fillText(sub, 512, H * .8); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); signs.push(mat); return mat; }
function inward(g, name, k) { const pts = (namedRoads[name] || []).flat().filter(p => Math.hypot(p[0] - g[0], p[1] - g[1]) < 120); let mx = 0, mz = 0; pts.forEach(p => { mx += p[0]; mz += p[1]; }); mx /= pts.length || 1; mz /= pts.length || 1; let dx = mx - g[0], dz = mz - g[1]; const L = Math.hypot(dx, dz) || 1; return [g[0] + dx / L * k, g[1] + dz / L * k, dx / L, dz / L]; }
function heroGate(p, dir, half, text, sub, frameCol, bg, fg, glow, bulbCol) { // follows our Imagine concept (ref/imagine_gate_elevation.png): short grey posts, thick red tube loop, flat top, big rounded corners, sagging lower band, white sign
  const [gx, gz] = p, nx = Math.cos(dir), nz = -Math.sin(dir), fx = Math.sin(dir), fz = Math.cos(dir), hw = half, span = hw * 2, H = span * .92, T = span * .075, PT = H * .32, R = span * .14, TOP = H - T / 2;
  const at = (u, y, f = 0) => [gx + nx * u + fx * f, y, gz + nz * u + fz * f];
  const tube = (pts, th, col, step) => { for (let i = 0; i < pts.length - 1; i++) { const [u0, y0] = pts[i], [u1, y1] = pts[i + 1], L = Math.hypot(u1 - u0, y1 - y0), rz = Math.atan2(y1 - y0, u1 - u0); const [x, y, z] = at((u0 + u1) / 2, (y0 + y1) / 2);
      put('gateTube', GEO.rbox, neon, M(x, y, z, L + th * .5, th, th, dir, 0, rz), col, false);
      if (step) for (let t = step / 2; t < L; t += step) [1, -1].forEach(s => [-1, 1].forEach(o => { const pu = u0 + (u1 - u0) * t / L - Math.sin(rz) * o * th * .25, py = y0 + (y1 - y0) * t / L + Math.cos(rz) * o * th * .25, [bx, by, bz] = at(pu, py, (th / 2 + .03) * s); put('gateBulb', GEO.sph, neon, M(bx, by, bz, .16, .16, .1), bulbCol, false); })); } };
  const arc = (cu, cy, r, a0, a1, n = 8) => Array.from({ length: n + 1 }, (_, k) => { const a = a0 + (a1 - a0) * k / n; return [cu + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  tube([[-hw, PT - .2], [-hw, TOP - R], ...arc(-hw + R, TOP - R, R, Math.PI, Math.PI / 2), ...arc(hw - R, TOP - R, R, Math.PI / 2, 0), [hw, TOP - R], [hw, PT - .2]], T, frameCol, .55);
  const LB = H * .56, low = [], ri = R * .7; low.push(...arc(-hw + ri, LB - ri, ri, Math.PI, Math.PI / 2, 5).slice(1)); for (let k = 1; k < 10; k++) { const u = -hw + ri + (span - 2 * ri) * k / 10; low.push([u, LB - .35 * Math.sin(Math.PI * k / 10)]); } low.push(...arc(hw - ri, LB - ri, ri, Math.PI / 2, 0, 5).slice(0, -1)); tube(low, T * .85, frameCol, .55);
  [-1, 1].forEach(s => { const [x, , z] = at(hw * s, 0), pr = T * .85; put('gatePost', GEO.cyl, neonSoft, M(x, PT / 2, z, pr * 2, PT, pr * 2), '#9a9ea6'); put('gatePost', GEO.cyl, neonSoft, M(x, PT - .2, z, pr * 2.3, .45, pr * 2.3), '#b8bcc3'); put('gateFoot', GEO.cyl, neonSoft, M(x, .25, z, pr * 2.4, .5, pr * 2.4), '#8a8e96'); });
  const SW = span * .72, SH = H * .26, SY = (LB + T * .5 + TOP - T * .5) / 2 + .1;
  { const [x, y, z] = at(0, SY); put('gateBox', GEO.rbox, clay, M(x, y, z, SW + .2, SH + .2, .5, dir), '#e9e2d4'); }
  [-1, 1].forEach(s => { const [x, y, z] = at(s * (SW / 2 + (hw - SW / 2) / 2), SY); put('gateTrim', GEO.cyl, clay, M(x, y, z, .35, hw - SW / 2 + .2, .35, dir, 0, Math.PI / 2), '#a9adb4'); });
  const mat = glowSign(text, sub, SW, SH, bg, fg, glow); [1, -1].forEach(s => { const pl = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), mat); pl.position.set(...at(0, SY, .27 * s)); pl.rotation.y = dir + (s > 0 ? 0 : Math.PI); scene.add(pl); });
  return { x: gx, z: gz, dir, dx: p[2], dz: p[3], span, H, SY, SW, SH }; }
function roadW(name, p) { let w = 10, bd = 1e9; (namedRoads[name] || []).forEach(q => q.forEach(v => { const d = Math.hypot(v[0] - p[0], v[1] - p[1]); if (d < bd) { bd = d; w = q.w; } })); return w; }
const gA = inward(gate, '歌舞伎町一番街通り', 10), gB = inward(gate2, 'セントラルロード', 10);
const kitLen0 = Object.fromEntries(Object.entries(kit).map(([k, v]) => [k, v.list.length])), sc0 = scene.children.length;
LMK.gate = heroGate(gA, roadDir('歌舞伎町一番街通り', gA), roadW('歌舞伎町一番街通り', gA) / 2 + .8, '歌舞伎町一番街', 'KABUKICHO ICHIBANGAI', '#ff1e2a', '#fbf7ef', '#d0101c', '#ff9a9a', '#fff4f4');
for (const k in kit) kit[k].list.length = Math.min(kit[k].list.length, kitLen0[k] ?? 0); scene.children.slice(sc0).forEach(o => { scene.remove(o); o.geometry && o.geometry.dispose(); }); // procedural Ichibangai gate replaced by the Blender model below
let glbDone = false, lastN = 0; const glbEm = [];
{ const k0 = Object.fromEntries(Object.entries(kit).map(([k, v]) => [k, v.list.length])), s0 = scene.children.length;
LMK.gate2 = heroGate(gB, roadDir('セントラルロード', gB), roadW('セントラルロード', gB) / 2 + .8, '歌舞伎町セントラルロード', 'KABUKICHO CENTRAL ROAD', '#2a7dff', '#f4f8ff', '#1440a8', '#9fc8ff', '#f0f8ff');
for (const k in kit) kit[k].list.length = Math.min(kit[k].list.length, k0[k] ?? 0); scene.children.slice(s0).forEach(o => { scene.remove(o); o.geometry && o.geometry.dispose(); }); }
/* --- Hanazono shrine: torii at the grounds edge nearest 明治通り + hall --- */
(areasByT[2] || []).forEach(pts => { const meiji = (namedRoads['明治通り'] || []).flat(); let bi = 0, bd = 1e9; pts.forEach((p, i) => meiji.forEach(m => { const d = Math.hypot(p[0] - m[0], p[1] - m[1]); if (d < bd) { bd = d; bi = i; } }));
  let cx = 0, cz = 0; pts.forEach(p => { cx += p[0]; cz += p[1]; }); cx /= pts.length; cz /= pts.length; const [ex, ez] = pts[bi]; const tx = ex + (cx - ex) * .12, tz = ez + (cz - ez) * .12, a = Math.atan2(cx - tx, cz - tz), nx = Math.cos(a), nz = -Math.sin(a);
  for (let k = 0; k < 30; k++) { const x = cx + (rnd() - .5) * 70, z = cz + (rnd() - .5) * 70; if (inPoly(x, z, pts) && Math.abs((x - tx) * Math.cos(a) - (z - tz) * Math.sin(a)) > 13 && !bldInfo.some(b => Math.hypot(b.cx - x, b.cz - z) < 8)) { put('trunk', GEO.cyl, clay, M(x, 1.5, z, .6, 3, .6), '#8a6248'); put('tree', GEO.sph, clay, M(x, 6, z, 6, 6.5, 6), '#5f9a52'); } }
  LMK.torii = { x: tx, z: tz, a }; });
/* lantern strings (Golden Gai, Ichibangai, Sakura-dori, Omoide-yokocho …) */
const LANT = ['新宿ゴールデン街 G1通り', '新宿ゴールデン街 G2通り', '歌舞伎町一番街通り', '歌舞伎町さくら通り', 'あかるい花園一番街', 'あかるい花園三番街', 'あかるい花園五番街', '思い出横丁', 'あかるい花園八番街', '歌舞伎町東通り'];
LANT.forEach(nm => (namedRoads[nm] || []).forEach(pts => { let acc = 0; const sp = nm.includes('ゴールデン') || nm.includes('花園') ? 6 : 10, half = Math.max(.9, (pts.w || 10) / 2 - .4); for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az), nx = Math.cos(ang), nz = -Math.sin(ang);
  for (let s = (sp - acc % sp); s < L; s += sp) { const px = ax + (bx - ax) * s / L, pz = az + (bz - az) * s / L; for (let k = 0; k <= 4; k++) { const u = k / 4 * 2 - 1; put('lantern', GEO.sph, neon, M(px + nx * u * half, 6.2 - (1 - u * u) * 1, pz + nz * u * half, .9, 1.3, .9), k % 2 ? '#ff4b3d' : '#ffb347', false); } }
  acc += L; } }));
/* streetlights, trees, vending machines */
O.r.forEach(([cls, , seq, rw]) => { if (cls > 2) return; let acc = 0; for (let i = 0; i < seq.length - 1; i++) { const [ax, az] = nodes[seq[i]], [bx, bz] = nodes[seq[i + 1]]; const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az), nx = Math.cos(ang), nz = -Math.sin(ang), sp = cls === 0 ? 26 : 34;
  for (let s = (sp - acc % sp); s < L; s += sp) { const side = ((acc + s) / sp | 0) % 2 ? 1 : -1, o = rw / 2 + .8; const px = ax + (bx - ax) * s / L + nx * o * side, pz = az + (bz - az) * s / L + nz * o * side; put('pole', GEO.cyl, clay, M(px, 3.6, pz, .3, 7.2, .3), '#5d5a60'); put('lamp', GEO.sph, neon, M(px, 7.3, pz, 1, .7, 1), '#ffe2a8', false); if (cls === 0 && rnd() < .5) { put('trunk', GEO.cyl, clay, M(px + (bx - ax) / L * 8, 1.5, pz + (bz - az) / L * 8, .5, 3, .5), '#8a6248'); put('tree', GEO.sph, clay, M(px + (bx - ax) / L * 8, 5, pz + (bz - az) / L * 8, 4.2, 4.6, 4.2), ['#7fae5e', '#6d9e52', '#8dbb68'][i % 3]); } if (cls === 2 && rnd() < .3) put('vend', GEO.rbox, neon, M(px + (bx - ax) / L * 3, 1, pz + (bz - az) / L * 3, 1, 2, .8, ang), ['#e8f4ff', '#ffefe0', '#ff6b6b'][i % 3]); }
  acc += L; } });
O.trees.forEach(([x, z], i) => { put('trunk', GEO.cyl, clay, M(x, 1.5, z, .6, 3, .6), '#8a6248'); put('tree', GEO.sph, clay, M(x, 5, z, 4.5, 5, 4.5), ['#7fae5e', '#6d9e52', '#8dbb68'][i % 3]); });
(areasByT[0] || []).forEach(f => { let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; f.forEach(([x, z]) => { minx = Math.min(minx, x); maxx = Math.max(maxx, x); minz = Math.min(minz, z); maxz = Math.max(maxz, z); }); for (let k = 0; k < 40; k++) { const x = minx + rnd() * (maxx - minx), z = minz + rnd() * (maxz - minz); if (!inPoly(x, z, f)) continue; put('trunk', GEO.cyl, clay, M(x, 1.5, z, .6, 3, .6), '#8a6248'); put('tree', GEO.sph, clay, M(x, 5.5, z, 5, 5.5, 5), ['#7fae5e', '#6d9e52', '#8dbb68'][k % 3]); } });
for (let k = 0; k < 220; k++) { const a = rnd() * Math.PI * 2, r = 480 + rnd() * 700; const x = Math.cos(a) * r, z = Math.sin(a) * r * .9; const h = 6 + rnd() * 40 * (r < 700 ? 1.4 : .7); put('far', GEO.rbox, clay, M(x, h / 2 - 16, z, 18 + rnd() * 24, h, 18 + rnd() * 24, rnd()), ['#e2cbb4', '#d9c0aa', '#ead8c4'][k % 3]); }
/* --- night-city layer: stacked vertical signboards, rooftop billboards, LED screens, wet-street reflections --- */
const CORE_ST = ['歌舞伎町一番街通り', 'セントラルロード', '歌舞伎町さくら通り', '花道通り', '歌舞伎町東通り', '一番通り', '仲見世通り', '靖国通り', '西武新宿駅前通り'];
const coreSamples = []; CORE_ST.forEach(n => (namedRoads[n] || []).forEach(pts => { for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az); const ang = Math.atan2(bx - ax, bz - az); for (let s = 0; s < L; s += 3) coreSamples.push([ax + (bx - ax) * s / L, az + (bz - az) * s / L, n, ang, pts.w || 8]); } }));
const nearCore = (x, z, r) => coreSamples.some(p => Math.abs(p[0] - x) < r && Math.abs(p[1] - z) < r && Math.hypot(p[0] - x, p[1] - z) < r);
const r2 = mulberry32(77), ledTargets = [];
const nearGate = (x, z) => [LMK.gate, LMK.gate2].some(g => g && Math.hypot(g.x - x, g.z - z) < 48);
bldInfo.forEach(info => { if (info.kind >= 3 || info.kind === 7 || info.hv < 8 || !nearCore(info.cx, info.cz, 24)) return; const ng = nearGate(info.cx, info.cz); const ei = edgeFacing(info.pts); if (ei < 0) return; const f = edgeFrame(info.pts, ei);
  const cols = info.hv > 14 && r2() < .6 ? 1 : 0;
  for (let c = 0; c < cols; c++) { const t = (c + .5) / cols, px = f.a[0] + (f.b[0] - f.a[0]) * t + f.nx * 1.6, pz = f.a[1] + (f.b[1] - f.a[1]) * t + f.nz * 1.6; if ([LMK.gate, LMK.gate2].some(g => g && Math.hypot(g.x - px, g.z - pz) < 48)) continue; let y = 4.6; const top = Math.min(info.hv - 1, 34);
    while (y < top - 2) { const h = 3.5 + r2() * 3; if (y + h > top) break; put('stack', GEO.box, neon, M(px, y + h / 2, pz, 1, h, 3.4, f.ang + Math.PI / 2), NEON[Math.floor(r2() * NEON.length)]); put('stackF', GEO.box, clay, M(px - f.nx * .2, y + h / 2, pz - f.nz * .2, .6, h + .3, 3.8, f.ang + Math.PI / 2), '#3a3238'); y += h + .5; } }
  if (!ng && info.hv > 12 && r2() < .55) { const w = Math.min(f.L * .7, 16), bx = info.cx + f.nx * 2, bz = info.cz + f.nz * 2; [-1, 1].forEach(s => put('pole', GEO.cyl, clay, M(bx + Math.cos(f.ang) * w * .4 * s, info.hv + 2, bz - Math.sin(f.ang) * w * .4 * s, .35, 4, .35), '#4a4448'));
    put('roofbill', GEO.box, neon, M(bx, info.hv + 6, bz, w, 4.5, .6, f.ang + Math.PI), NEON[Math.floor(r2() * NEON.length)]); put('roofbillF', GEO.box, clay, M(bx - f.nx * .35, info.hv + 6, bz - f.nz * .35, w + .6, 5.1, .4, f.ang + Math.PI), '#1e1a22'); }
  if (info.hv > 22 && ledTargets.length < 6 && r2() < .5) ledTargets.push({ info, f }); });
const ledCv = document.createElement('canvas'); ledCv.width = 256; ledCv.height = 144; const ledC = ledCv.getContext('2d'), ledTex = new THREE.CanvasTexture(ledCv); ledTex.colorSpace = THREE.SRGBColorSpace;
const ledMat = new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false }); signs.push(ledMat);
function drawLED(t) { const c = ledC; c.fillStyle = '#05060a'; c.fillRect(0, 0, 256, 144); for (let i = 0; i < 8; i++) { c.fillStyle = `hsl(${(i * 45 + t * 40) % 360},95%,58%)`; c.fillRect(i * 32, 0, 30, 96 + Math.sin(t * 2 + i) * 30); } c.fillStyle = `hsl(${(t * 60) % 360},90%,62%)`; c.fillRect(0, 118, 256, 26); for (let x = 0; x < 256; x += 4) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x, 0, 1, 144); } ledTex.needsUpdate = true; }
drawLED(0); ledTargets.forEach(({ info, f }) => { const w = Math.min(f.L * .7, 14), h = w * .56; const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), ledMat); pl.position.set(f.mx + f.nx * 1.0, Math.min(info.hv - h / 2 - 2, 30), f.mz + f.nz * 1.0); pl.rotation.y = Math.atan2(f.nx, f.nz); scene.add(pl); put('stackF', GEO.box, clay, M(pl.position.x - f.nx * .3, pl.position.y, pl.position.z - f.nz * .3, w + 1, h + 1, .4, Math.atan2(f.nx, f.nz)), '#1e1a22'); });
/* Golden Gai: tiny signs + paper lanterns on each micro bar */
/* (Golden Gai signs/lanterns now come from the Blender LOD) */
/* Don Quijote-style generic discount store: yellow façade cladding (no logo) */
(LMK[5] || []).forEach(info => { const ei = edgeFacing(info.pts); if (ei < 0) return; const f = edgeFrame(info.pts, ei); const h = Math.min(info.hv - 1, 26); put('dqFace', GEO.box, clay, M(f.mx + f.nx * .4, h / 2 + .5, f.mz + f.nz * .4, f.L * .96, h, .5, f.ang + Math.PI), '#f5c814'); for (let y = 5; y < h; y += 3.2) put('band', GEO.box, neon, M(f.mx + f.nx * .75, y, f.mz + f.nz * .75, f.L * .9, .45, .2, f.ang + Math.PI), y % 2 ? '#ff3344' : '#ffe14a'); });
/* batting center: green net cage + sign */
{ const bp = D.pois.find(p => p.k === 'batting'); if (bp) { const w = 18, d = 11, h = 9, a = 0; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => put('pole', GEO.cyl, clay, M(bp.x + i * w / 2, h / 2, bp.z + j * d / 2, .5, h, .5), '#3d5a3d'));
  const net = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: '#3f9a54', transparent: true, opacity: .35, depthWrite: false, roughness: .9 })); net.position.set(bp.x, h / 2, bp.z); scene.add(net);
  textSign([['BATTING CENTER', 64], ['バッティングセンター', 44]], 640, 160, '#14502a', '#fff59a', bp.x, h + 2.4, bp.z + d / 2, 0, 14, 3.5); LMK.batting = { x: bp.x, z: bp.z }; } }
/* wet-street neon reflections (additive decals, night only) */
const rcv = document.createElement('canvas'); rcv.width = rcv.height = 64; { const c = rcv.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }
const reflMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(rcv), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
const reflGeo = new THREE.PlaneGeometry(1, 1); reflGeo.rotateX(-Math.PI / 2);
coreSamples.forEach((p, k) => { if (k % 3) return; const [x, z, , a, w] = p, nx = Math.cos(a), nz = -Math.sin(a); [-1, 1].forEach(s => { if (r2() < .3) return; const o = s * w * .28; put('refl', reflGeo, reflMat, M(x + nx * o, 1.22, z + nz * o, Math.min(w * .22, 3.5), 1, 9, a), NEON[Math.floor(r2() * NEON.length)], false); }); });
[LMK.gate, LMK.gate2].forEach((g, i) => g && put('refl', reflGeo, reflMat, M(g.x, 1.23, g.z, g.span * .9, 1, 20, g.dir), i ? '#3aa8ff' : '#ff3020', false));

/* --- gate street scenes, after our Imagine concepts (ref/imagine_gate_*.png, ref/imagine_signs.png): shopfronts, awnings, blade signs, lamps, pedestrians, sheen --- */
const atlasTex = new THREE.TextureLoader().load(window.SIGN_ATLAS || ''); atlasTex.colorSpace = THREE.SRGBColorSpace; atlasTex.anisotropy = 4;
const atlasMat = new THREE.MeshBasicMaterial({ map: atlasTex, toneMapped: false, side: THREE.DoubleSide }); signs.push(atlasMat); const atlasQ = [];
const SHOPC = ['#c8402f', '#2f6c8f', '#e7a83c', '#7a4a9a', '#e06a2a', '#e07aa0', '#5b8a4a', '#3aa0b0'];
function gateStreet(g, len, full, seed, a0 = 6, flank = true) { const rr = mulberry32(seed), fs = Math.sign(Math.sin(g.dir) * (g.dx || 0) + Math.cos(g.dir) * (g.dz || 0)) || 1, dx = Math.sin(g.dir) * fs, dz = Math.cos(g.dir) * fs, nx = Math.cos(g.dir), nz = -Math.sin(g.dir), ang = Math.atan2(dx, dz), hw = g.span / 2;
  const P = (along, side, off) => [g.x + dx * along + nx * side * off, g.z + dz * along + nz * side * off];
  [-1, 1].forEach(sd => { let k = 0; for (let a = a0; a < len; a += full ? 7 : 11, k++) { const [fx0, fz0] = P(a, sd, hw - .5), ci = Math.floor(rr() * 8), fa = ang + (sd > 0 ? -Math.PI / 2 : Math.PI / 2);
      put('shopF', GEO.box, neonSoft, M(fx0, 1.6, fz0, 5.6, 3.2, .3, ang + Math.PI / 2), ['#ffe6b8', '#ffd2a0', '#fff0d8'][k % 3], false); // lit shop window
      put('awning', GEO.rbox, clay, M(fx0 - nx * sd * .8, 3.4, fz0 - nz * sd * .8, 6, .35, 1.9, ang + Math.PI / 2, 0, -sd * .18), SHOPC[ci], false);
      put('band', GEO.rbox, neon, M(fx0 + nx * sd * .1, 4.5, fz0 + nz * sd * .1, 5.2, 1.1, .35, ang + Math.PI / 2), SHOPC[(ci + 3) % 8], false);
      if (a > 12 && (full || k % 2 === 0)) { const [bx, bz] = P(a + 2, sd, hw - 1.6), h = 5.5 + rr() * 3, y = 6 + h / 2; atlasQ.push([bx, y, bz, 2.1, h * .96, ang, Math.floor(rr() * 8)]); put('stackF', GEO.box, clay, M(bx, y, bz, 2.35, h + .3, .2, ang), '#2a2430'); }
      if (k % 2 === 0) { const [lx, lz] = P(a + 3.5, sd, hw - 2.2); put('pole', GEO.cyl, clay, M(lx, 2.3, lz, .22, 4.6, .22), '#4a4448'); put('lamp', GEO.sph, neon, M(lx, 4.7, lz, .8, .9, .8), '#ffe2a8', false); }
      if (rr() < (full ? .9 : .5)) { const [px, pz] = P(a + rr() * 4, sd, hw - 2.6 - rr() * 1.2); put('ped', GEO.cyl, clay, M(px, 1.1, pz, .75, 2.1, .75), ['#e2583e', '#3b6ea8', '#f0c24a', '#5a9a62', '#8c5ab8', '#f2f2f2'][k % 6]); put('pedH', GEO.sph, clay, M(px, 2.55, pz, .7, .7, .7), '#f1cfb4'); } } });
  // signs flanking the gate on the corner facades, facing Yasukuni-dori (as in the concept)
  if (flank) [-1, 1].forEach(sd => (full ? [[2.2, 6, 0], [5, 13, 1], [8.5, 8, 0], [11.5, 15, 1]] : [[2.4, 7, 0], [6.5, 11, 1]]).forEach(([o, y, b], j) => { const [x, z] = P(full ? 1.2 : 1.5, sd, hw + o), w = 2.3, h = b ? 6.5 : 5; atlasQ.push([x - dx * .15, y, z - dz * .15, w, h, ang + Math.PI, (seed + j * 3 + (sd > 0 ? 5 : 0)) % 8]); put('stackF', GEO.box, clay, M(x + dx * .05, y, z + dz * .05, w + .3, h + .3, .2, ang), '#2a2430'); }));
  // Yasukuni-dori sidewalk side, outside the gate
  for (let s = -2; s <= 2; s++) { const bx = g.x - dx * 3 + nx * s * 6, bz = g.z - dz * 3 + nz * s * 6; if (Math.abs(s) > 0) put('pole', GEO.cyl, clay, M(bx, .5, bz, .35, 1, .35), '#8e9298'); if (full && s % 2 === 0 && s) { put('ped', GEO.cyl, clay, M(bx - dx * 2, 1.1, bz - dz * 2, .75, 2.1, .75), '#2f2f3a'); put('pedH', GEO.sph, clay, M(bx - dx * 2, 2.55, bz - dz * 2, .7, .7, .7), '#f1cfb4'); } }
  put('refl', reflGeo, reflMat, M(g.x + dx * len / 2, 1.24, g.z + dz * len / 2, g.span * .55, 1, len, ang), full ? '#ff6a4a' : '#4ab0ff', false);
}
{ const gs = atlasQ.map(([x, y, z, w, h, a, i]) => { const q = new THREE.PlaneGeometry(w, h), uv = q.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, (i + .04 + uv.getX(k) * .92) / 8); q.rotateY(a); q.translate(x, y, z); return q; }); if (gs.length) scene.add(new THREE.Mesh(mergeGeometries(gs), atlasMat)); }
finalizeKit();
/* ---------- agents (Dijkstra) ---------- */
function dijkstra(A, s, t) { const dist = new Map([[s, 0]]), prev = new Map(), done = new Set(); const H = [[0, s]]; const push = e => { H.push(e); let i = H.length - 1; while (i) { const p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } }; const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return top; };
  while (H.length) { const [d, u] = pop(); if (done.has(u)) continue; done.add(u); if (u === t) break; for (const [v, w] of A.get(u) || []) { const nd = d + w; if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); push([nd, v]); } } }
  if (s !== t && !prev.has(t)) return null; const p = [t]; while (p[0] !== s) p.unshift(prev.get(p[0])); return { path: p, len: dist.get(t) }; }
function bigComp(A) { const seen = new Set(); let best = []; for (const s of A.keys()) { if (seen.has(s)) continue; const c = [s]; seen.add(s); for (let i = 0; i < c.length; i++) for (const [v] of A.get(c[i])) if (!seen.has(v)) { seen.add(v); c.push(v); } if (c.length > best.length) best = c; } return best; }
const wNodes = bigComp(adj), cNodes = bigComp(carAdj), wSet = new Set(wNodes);
function newPath(a, from) { for (let k = 0; k < 6; k++) { const r = dijkstra(a.A, from, a.pool[Math.floor(rnd() * a.pool.length)]); if (r && r.path.length > 1) { a.path = r.path; a.seg = 0; a.t = 0; return; } } a.path = [from, a.A.get(from)[0][0]]; a.seg = 0; a.t = 0; }
function agent(A, pool, speed) { const a = { A, pool, speed, off: rnd() - .5 }; newPath(a, pool[Math.floor(rnd() * pool.length)]); a.t = rnd(); return a; }
const NW = 200, NC = 36;
const walkers = Array.from({ length: NW }, () => agent(adj, wNodes, 2 + rnd() * 1.2)), cars = Array.from({ length: NC }, () => agent(carAdj, cNodes, 9 + rnd() * 4));
const wBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.9, 1.6, 3, 8), new THREE.MeshStandardMaterial({ roughness: .7 }), NW), wHead = new THREE.InstancedMesh(GEO.sph, new THREE.MeshStandardMaterial({ color: '#f1cfb4', roughness: .7 }), NW);
const carM = new THREE.InstancedMesh(GEO.rbox, new THREE.MeshStandardMaterial({ roughness: .5 }), NC), carTop = new THREE.InstancedMesh(GEO.rbox, new THREE.MeshStandardMaterial({ roughness: .4, color: '#bfe2f0' }), NC), carLights = new THREE.InstancedMesh(GEO.box, neonMat(.2, 2.4), NC * 2);
walkers.forEach((w, i) => wBody.setColorAt(i, C(['#e2583e', '#3b6ea8', '#f0c24a', '#5a9a62', '#8c5ab8', '#2f2f3a', '#f2f2f2', '#d77aa8'][i % 8])));
cars.forEach((c, i) => { carM.setColorAt(i, C(['#f4c430', '#2b2b2b', '#f6f6f6', '#3c6e9e', '#c43a2f', '#4b8a52'][i % 6])); carLights.setColorAt(i * 2, C('#fff3c4')); carLights.setColorAt(i * 2 + 1, C('#ff3030')); });
[wBody, wHead, carM, carTop].forEach(m => { m.castShadow = true; scene.add(m); }); scene.add(carLights);
let simT = +params.get('t') || 16 * 60, playing = !FREEZE && !matchMedia('(prefers-reduced-motion: reduce)').matches, walkT = 0;
function stepAgents(dt) { walkT += dt;
  const upd = (a, side) => { let P0 = nodes[a.path[a.seg]], P1 = nodes[a.path[a.seg + 1]]; let L = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) || .01; a.t += a.speed * dt / L;
    while (a.t >= 1) { a.t -= 1; a.seg++; if (a.seg >= a.path.length - 1) newPath(a, a.path[a.path.length - 1]); P0 = nodes[a.path[a.seg]]; P1 = nodes[a.path[a.seg + 1]]; L = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) || .01; }
    const dx = (P1[0] - P0[0]) / L, dz = (P1[1] - P0[1]) / L; return [P0[0] + (P1[0] - P0[0]) * a.t - dz * side, P0[1] + (P1[1] - P0[1]) * a.t + dx * side, Math.atan2(dx, dz)]; };
  walkers.forEach((a, i) => { const [x, z, ang] = upd(a, a.off * 3); const bob = Math.abs(Math.sin(walkT * 6 + i)) * .2; const cd = camera.position.distanceTo(controls.target), hs = Math.hypot(x - camera.position.x, z - camera.position.z) < Math.min(70, cd * .85) || cd < 120 && [LMK.gate, LMK.gate2].some(g => Math.hypot(x - g.x, z - g.z) < 10) ? 0 : 1; wBody.setMatrixAt(i, M(x, 2 + bob, z, hs, hs, hs, ang)); wHead.setMatrixAt(i, M(x, 4.3 + bob, z, 1.5 * hs, 1.5 * hs, 1.5 * hs)); });
  cars.forEach((a, i) => { const [x, z, ang] = upd(a, 2.4), s = Math.sin(ang), c = Math.cos(ang); carM.setMatrixAt(i, M(x, 1.9, z, 2.4, 1.6, 4.8, ang)); carTop.setMatrixAt(i, M(x - s * .3, 3, z - c * .3, 2.1, 1, 2.6, ang)); carLights.setMatrixAt(i * 2, M(x + s * 2.45, 2, z + c * 2.45, 2, .4, .1, ang)); carLights.setMatrixAt(i * 2 + 1, M(x - s * 2.45, 2, z - c * 2.45, 2, .4, .1, ang)); });
  [wBody, wHead, carM, carTop, carLights].forEach(m => m.instanceMatrix.needsUpdate = true); }
stepAgents(0);
/* ---------- day / night ---------- */
const KF = [[0, '#0a1030', '#1c2550', '#7d8cff', .35, '#5a6aa8', '#1e1c30', .35, 1, .62], [300, '#0d1536', '#232c5a', '#8090ff', .35, '#5a6aa8', '#1e1c30', .35, 1, .62], [370, '#8fa0d0', '#f4c2a2', '#ffb48a', 1.4, '#f3c6b5', '#6b5a5a', .9, .4, .9], [480, '#a9d1ea', '#fbe6d3', '#ffe8cc', 2.4, '#fff1e0', '#8a7a68', 1.15, 0, 1], [720, '#9fd0ec', '#f4eee3', '#fff4e4', 2.8, '#fff6ee', '#8f8270', 1.25, 0, 1], [960, '#a6cfe6', '#f8e7d2', '#ffe3c0', 2.4, '#fbefe4', '#8a7a66', 1.15, 0, 1], [1050, '#8b8fc4', '#f7b98f', '#ff9f6a', 1.7, '#f6d2bc', '#7d6660', 1.0, .3, .95], [1130, '#3d3f80', '#b07aa0', '#ff8a6a', .8, '#8a7cb0', '#3a3048', .6, .8, .75], [1230, '#0a1030', '#1c2550', '#7d8cff', .35, '#5a6aa8', '#1e1c30', .35, 1, .62], [1440, '#0a1030', '#1c2550', '#7d8cff', .35, '#5a6aa8', '#1e1c30', .35, 1, .62]].map(k => k.map(v => typeof v === 'string' ? C(v) : v));
let lastSunQ = -1;
function applyTime(min) { min = ((min % 1440) + 1440) % 1440; let i = 0; while (KF[i + 1][0] <= min) i++; const a = KF[i], b = KF[i + 1], f = (min - a[0]) / (b[0] - a[0]); const lc = k => a[k].clone().lerp(b[k], f), ln = k => a[k] + (b[k] - a[k]) * f;
  skyU.top.value.copy(lc(1)); skyU.hor.value.copy(lc(2)); scene.fog.color.copy(skyU.hor.value); sun.color.copy(lc(3)); sun.intensity = ln(4); hemi.color.copy(lc(5)); hemi.groundColor.copy(lc(6)); hemi.intensity = ln(7);
  const n = ln(8); lastN = n; glbEm.forEach(m => m.emissiveIntensity = m.userData.em[0] + n * m.userData.em[1]); U.night.value = n; reflMat.opacity = n * .55; renderer.toneMappingExposure = ln(9); bloomBase = .08 + n * .3; bloom.threshold = .92 - n * .1;
  const qm = Math.floor(min / 15); if (qm !== lastSunQ) { lastSunQ = qm; const m = qm * 15, day = Math.min(1, Math.max(0, (m - 330) / 840)), az = Math.PI * (.2 + .6 * day), el = n > .5 ? .95 : .4 + Math.sin(day * Math.PI) * .65; sun.position.set(Math.cos(az) * Math.cos(el) * 800, Math.sin(el) * 800, Math.sin(az) * Math.cos(el) * 400 + 300); sun.updateMatrixWorld(); } // quantised sun → no shadow crawl
  signs.forEach(s => s.color.setScalar(.8 + n * .15)); gzLight.intensity = n * 9;
  $('#clock').textContent = String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(Math.floor(min % 60)).padStart(2, '0'); }
/* ---------- POIs ---------- */
const pois = D.pois.map(p => ({ ...p }));
pois.push({ id: null, k: 'gate', nm: ['歌舞伎町一番街 アーチ', 'Kabukicho Ichibangai Arch', '歌舞伎町一番街 アーチ', '歌舞伎町一番街 拱門', 'ttt'], x: LMK.gate.x, z: LMK.gate.z, t: {} });
const nearNode = (x, z) => { let bi = -1, bd = 1e9; for (const i of wNodes) { const d = (nodes[i][0] - x) ** 2 + (nodes[i][1] - z) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
const labels = [];
pois.push({ id: null, k: 'gate', nm: ['セントラルロード ゲート', 'Central Road Gate', 'セントラルロード ゲート', '中央路 拱門', 'ttt'], x: LMK.gate2.x, z: LMK.gate2.z, t: {} });
pois.forEach((p, i) => { let y = 8; const near = bldInfo.reduce((b, q) => { const d = Math.hypot(q.cx - p.x, q.cz - p.z); return d < b[0] ? [d, q] : b; }, [1e9, null]); if (near[1] && near[0] < 18) y = near[1].hv + 6; if (p.k === 'street' || p.k === 'plaza') y = 6; if (p.k === 'tower' && LMK.tower) { p.x = LMK.tower.x; p.z = LMK.tower.z; y = LMK.tower.y; } if (p.k === 'gate') { p.hero = Math.hypot(p.x - LMK.gate.x, p.z - LMK.gate.z) < 1 ? LMK.gate : LMK.gate2; y = p.hero.H + 9; if (p.hero === LMK.gate2) { p.lx = p.x - p.hero.dx * 18; p.lz = p.z - p.hero.dz * 18; y = 4; } } if (p.k === 'goldengai') y = 14; if (p.k === 'shrine' && p.id === 'way/102792887' && LMK.torii) y = 14;
  p.y = y; p.node = nearNode(p.x, p.z); p.no = String(i + 1).padStart(2, '0');
  const el = document.createElement('div'); el.className = ['gate', 'tower', 'toho'].includes(p.k) ? 'lb hero' : 'lb'; el.innerHTML = `<i>${p.no}</i><span></span>`; el.onclick = e => { e.stopPropagation(); select(i); }; el.onpointerenter = () => { const k = poiKey(p); if (k) dioLoad(k); };
  const o = new CSS2DObject(el); o.position.set(p.lx ?? p.x, y, p.lz ?? p.z); scene.add(o); labels.push({ el, o, i, mode: '', want: '', cnt: 0, prio: ['tower', 'toho', 'gate', 'goldengai', 'shrine', 'station', 'plaza'].includes(p.k) ? 2 : p.k === 'street' ? 0 : 1 }); });
function desc(p) { const t = T[lang], L = LI[lang], c = (KCAT[p.k] || KCAT.venue)[L], bits = [];
  if (p.t.height) bits.push(`${t.h} ${p.t.height} m`); if (p.t['building:levels']) bits.push(`${t.lv} ${p.t['building:levels']}`); if (p.t.operator) bits.push(`${t.op} ${p.t.operator}`);
  const tg = Object.entries(p.t).filter(([k]) => !['height', 'building:levels', 'operator'].includes(k)).map(([k, v]) => `${k}=${v}`).join(', ');
  const notes = []; if (['tower', 'toho', 'gate', 'shrine'].includes(p.k) && (p.k !== 'shrine' || p.id === 'way/102792887')) notes.push(t.model); if (+p.t.height > 45 || p.k === 'tower') notes.push(t.comp); if (p.k === 'goldengai') notes.push(t.gg); { const f = (p.nm[4] || '')[{ en: 0, ja: 1, zh: 2 }[lang]]; notes.push(f === 't' ? t.nmT : t.nmO); }
  const sep = lang === 'en' ? '. ' : '。'; return { cat: c, facts: bits.join(' · '), tags: tg ? `${t.tags}: ${tg}` : '', notes: notes.join(' ') }; }
/* ---------- selection / camera ---------- */
let sel = -1, fly = null; const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
function flyTo(pos, tgt, dur = 1.2) { fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: tgt, k: RM ? .999 : 0, dur }; }

/* --- v12 dioramas: one fully modelled 360° clay diorama per landmark (blender/diorama.py → assets/dio_<key>.glb, lazy-loaded on open, prefetched on hover)
   plus small map LODs of every landmark in one shared file (assets/map_lods.glb, loaded at idle after the first render). All sign faces share assets/atlas.webp. --- */
const DIO = { on: false, ready: false, peds: [], key: null, cache: {}, cfg: null };
const B2T = (x, y, z) => new V3(x, z, -y); // Blender → three
const DCFG = { ichiban: { p: B2T(0, -22.5, 2.5), t: B2T(0, 0, 6.87), lens: 38, R: 190, walk: [-42, 52], street: 1, sh: 70 },
  central: { p: B2T(0, -22.5, 2.5), t: B2T(0, 0, 6.87), lens: 38, R: 190, walk: [-42, 52], street: 1, sh: 70 },
  tokyu: { p: B2T(0, -150, 3), t: B2T(0, 0, 74), lens: 30, R: 330, sh: 120 }, toho: { p: B2T(0, -92, 2.5), t: B2T(0, 0, 30), lens: 30, R: 200, sh: 90 },
  plaza: { p: B2T(0, -52, 22), t: B2T(0, 8, 4), lens: 30, R: 160, sh: 80 }, goldengai: { p: B2T(0, -12, 2.6), t: B2T(0, 26, 3.6), lens: 26, R: 80, sh: 60, hb: 1.9 },
  hanazono: { p: B2T(0, -17, 2.6), t: B2T(0, 20, 6), lens: 30, R: 140, sh: 70 } };
const dScene = new THREE.Scene(), dCam = new THREE.PerspectiveCamera(39, 4 / 3, .5, 1600);
const dCtl = new OrbitControls(dCam, canvas); dCtl.enabled = false; dCtl.enableDamping = true; dCtl.dampingFactor = .08; dCtl.minDistance = 3; dCtl.maxDistance = 190; dCtl.maxPolarAngle = 1.78; dCtl.screenSpacePanning = false;
const dSkyU = { uNight: U.night };
dScene.add(new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: dSkyU,
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform float uNight; varying vec3 vD; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); } void main(){ float t = smoothstep(-.02, .42, vD.y);' +
    'vec3 day = mix(vec3(.93,.62,.55), vec3(.38,.27,.49), t), nig = mix(vec3(.10,.10,.24), vec3(.03,.03,.11), t); vec3 c = mix(day, nig, smoothstep(.25,.75,uNight));' +
    'vec3 q = floor(vD * 260.); float st = step(.9975, h(q)) * smoothstep(.05,.3,vD.y) * smoothstep(.4,.9,uNight); gl_FragColor = vec4(c + st * .9, 1.); }' })));
const dHemi = new THREE.HemisphereLight('#ffd9e2', '#7a5a66', 1.5), dSun = new THREE.DirectionalLight('#ffd6b8', 2.4), dRed = new THREE.PointLight('#ff3a30', 0, 30, 1.6);
dSun.castShadow = true; dSun.shadow.mapSize.set(2048, 2048); dSun.shadow.bias = -.0004; dSun.shadow.normalBias = .04; dRed.position.set(0, 8.5, 3);
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
const EMK2 = { shopGlass: [.15, 1.3], bulb: [.45, 2.1], lantern: [.3, 1.9], lanternRed: [.3, 1.9], window: [.1, 1.25], gateRed: [.03, .55], signFace: [.3, .7], towerGlass: [.04, .9], gzEye: [.4, 1.6], signLight: [.3, 1.4], water: [.05, .4], gateBlue: [.05, .8] };
const HULL = /^(gateRed|gateBlue|post|signBody|signBack|bld|ledge|awn|cloth|skin|hair|legs|lampPost|cloud|curb|toho|gz|shack|torii|hall|rib|podium|planter|trunk|leaf|stoneL|fount)/;
let atlasW = null; const getAtlas = () => { if (!atlasW) { atlasW = new THREE.TextureLoader().load('assets/atlas.webp'); atlasW.flipY = false; atlasW.colorSpace = THREE.SRGBColorSpace; atlasW.anisotropy = 4; } return atlasW; }; // one shared sign atlas for every GLB, fetched with the first one
const shared = {}; // one material instance per name across all GLBs (fewer programs, shared atlas)
function f32(g) { const o = new THREE.BufferGeometry(); for (const n of ['position', 'normal', 'uv']) { const a = g.attributes[n]; if (!a) continue; const k = a.itemSize, arr = new Float32Array(a.count * k); const G = ['getX', 'getY', 'getZ', 'getW']; for (let i = 0; i < a.count; i++) for (let j = 0; j < k; j++) arr[i * k + j] = a[G[j]](i); o.setAttribute(n, new THREE.BufferAttribute(arr, k)); } if (g.index) o.setIndex(Array.from(g.index.array)); else o.setIndex(null); return o; }
/* merge every static (non-instanced, non-pedestrian) mesh per material: cuts draw calls (and the per-mesh hull passes) to one per material */
function mergeStatic(root) { root.updateMatrixWorld(true); const inv = root.matrixWorld.clone().invert(), groups = new Map(), kill = [];
  root.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.userData.hull) return; let q = o, ped = false; while (q) { if (/^PEDS/.test(q.name)) ped = true; q = q.parent; } if (ped) return;
    const key = o.material.uuid + '|' + ['normal', 'uv'].filter(n => o.geometry.attributes[n]).join(','), g = f32(o.geometry); if (!g.index) { const n = g.attributes.position.count; g.setIndex(Array.from({ length: n }, (_, i) => i)); }
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); let grp = root; for (let q = o; q && q.parent; q = q.parent) if (q.parent === root) { grp = q; break; } (groups.get(key) || groups.set(key, { m: o.material, gs: [] }).get(key)).gs.push([g, grp]); kill.push(o); });
  kill.forEach(o => o.parent.remove(o));
  groups.forEach(({ m, gs }) => { const byGrp = new Map(); gs.forEach(([g, grp]) => { (byGrp.get(grp) || byGrp.set(grp, []).get(grp)).push(g); });
    byGrp.forEach((list, grp) => { const mg = mergeGeometries(list); if (!mg) return; const me = new THREE.Mesh(mg, m); me.name = 'm_' + m.name; if (grp === root) root.add(me); else { grp.updateMatrixWorld(true); me.applyMatrix4(grp.matrixWorld.clone().invert().multiply(root.matrixWorld)); grp.add(me); } }); }); }
function dioMats(root, hull = true) { mergeStatic(root); root.traverse(o => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; let m = o.material; const n = m.name;
    if (shared[n]) { o.material = m = shared[n]; } else { shared[n] = m;
      if (n === 'towerGlass') m.emissive.set('#7cc0ff'); if (EMK2[n]) { m.userData.em = EMK2[n]; glbEm.push(m); m.emissiveIntensity = m.userData.em[0] + lastN * m.userData.em[1]; if (n === 'bulb' || /^lantern/.test(n)) m.toneMapped = false; if (n === 'signFace') { m.map = m.emissiveMap = getAtlas(); m.emissive.set('#ffffff'); m.needsUpdate = true; signs.push(m); } }
      else if (!m.userData.clay) { m.userData.clay = 1; claify(m, /^(post|curb|walk)/.test(n) ? .5 : /^(road|base)/.test(n) ? .28 : .2); if (n === 'road') m.roughness = .55; } }
    if (EMK2[n] && n !== 'gateRed' && n !== 'towerGlass') o.castShadow = false; if (n === 'cloud') o.castShadow = false;
    if (hull && HULL.test(n) && !o.isInstancedMesh && !o.userData.hull) { o.userData.hull = 1; const h = new THREE.Mesh(o.geometry, hullMat); h.userData.hull = 1; h.castShadow = h.receiveShadow = false; h.raycast = () => {}; o.add(h); } }); }
const gltfL = new GLTFLoader(); gltfL.setMeshoptDecoder(MeshoptDecoder);
function loadGLB(url, prog) { return new Promise((ok, no) => gltfL.load(url, ok, e => prog && e.total && prog(e.loaded / e.total), no)); }
function dioLoad(key) { const c = DIO.cache; if (!c[key]) c[key] = loadGLB('assets/dio_' + key + '.glb', f => { if (DIO.key === key) dioProg(f); }).then(gl => { const r = gl.scene; dioMats(r); r.userData.peds = []; const pg = r.getObjectByName('PEDS');
    if (pg) pg.children.forEach((p, k) => r.userData.peds.push({ o: p, x: p.position.x, y: p.position.y, z: p.position.z, q: p.quaternion.clone(), dir: new V3(0, 0, 1).applyQuaternion(p.quaternion).z < 0 ? -1 : 1, sp: .9 + (k % 5) * .12, ph: k * 1.7 })); return r; }).catch(e => { console.error('diorama glb ' + key, e); c[key] = null; return null; });
  return c[key]; }
function dioProg(f) { const b = $('#dioL'); if (!b) return; b.hidden = f >= 1; b.firstChild.style.width = Math.round(f * 100) + '%'; }
function poiKey(p) { if (!p) return null; if (p.hero === LMK.gate) return 'ichiban'; if (p.hero === LMK.gate2) return 'central'; if (p.k === 'tower') return 'tokyu'; if (p.k === 'toho') return 'toho'; if (p.k === 'plaza') return 'plaza'; if (p.k === 'goldengai') return 'goldengai'; if (p.k === 'shrine' && p.id === 'way/102792887') return 'hanazono'; return null; }
/* map LODs (one file, placed at the real landmarks; they replace the procedural/OSM blocks) */
const LODPOS = { ichiban: () => GF, central: () => GF2, tokyu: () => LMK.tower && { x: LMK.tower.x, z: LMK.tower.z, ry: LMK.tower.ry, s: 1 }, toho: () => { const g = LMK.godzilla; return g && { x: g.x - 15.5 * g.face[0], z: g.z - 15.5 * g.face[1], y: g.gy - 28.2, ry: g.ry, s: 1 }; } };
const ggC = () => { const p = D.pois.find(q => q.n === '新宿ゴールデン街') || { x: 198.4, z: 46.8 }, d = roadDir('新宿ゴールデン街 G1通り', [198.4, 46.8]), th = d + Math.PI, s = 1.35; return { x: 198.4 + Math.sin(th) * 30 * s, z: 46.8 + Math.cos(th) * 30 * s, ry: th, s }; };
Object.assign(LODPOS, { goldengai: ggC, hanazono: () => LMK.torii && { x: LMK.torii.x, z: LMK.torii.z, ry: LMK.torii.a + Math.PI, s: 1.5 },
  plaza: () => { const p = D.pois.find(q => q.k === 'plaza'), t = LMK.tower; return p && t && { x: p.x, z: p.z, ry: Math.atan2(t.x - p.x, t.z - p.z) + Math.PI, s: 1 }; } });
const LODHIDE = { goldengai: 'gg', hanazono: 'hz' }, LODNEAR = { goldengai: 380, hanazono: 380, plaza: 380 }; // these stream in when the camera comes close
/* map LODs: drop pedestrians (sub-pixel at map scale) and bake every plain-coloured mesh into one vertex-coloured mesh → ~1 draw call per landmark (+ emissive parts) */
const lodMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 });
function bakeLod(o) { o.updateMatrixWorld(true); const inv = o.matrixWorld.clone().invert(), gs = [], kill = [];
  o.children.filter(c => /^PEDS/.test(c.name)).forEach(c => o.remove(c));
  o.traverse(m => { if (!m.isMesh || m.isInstancedMesh) return; const mt = m.material; if (EMK2[mt.name] || mt.map || mt.transparent) return;
    const g = f32(m.geometry); g.deleteAttribute('uv'); if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i)); if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = mt.color.r; c[i * 3 + 1] = mt.color.g; c[i * 3 + 2] = mt.color.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); gs.push(g); kill.push(m); });
  if (!gs.length) return; kill.forEach(m => m.parent.remove(m)); const me = new THREE.Mesh(mergeGeometries(gs), lodMat); me.castShadow = me.receiveShadow = true; me.name = 'baked'; o.add(me); }
const lodState = {}; let lodPending = 0;
function lodLoad(k) { if (lodState[k]) return; lodState[k] = 1; lodPending++; loadGLB('assets/lod_' + k + '.glb').then(gl => { const o = gl.scene.getObjectByName('L_' + k) || gl.scene, F = LODPOS[k](); dioMats(o, false); o.traverse(m => { if (m.material && /^roofTile/.test(m.material.name)) m.material.color.set('#8d838c'); }); bakeLod(o); if (F) { o.position.set(F.x, F.y || 0, F.z); o.rotation.set(0, F.ry, 0); o.scale.setScalar(F.s); scene.add(o); LMK['lod_' + k] = o; if (LODHIDE[k] && PH[LODHIDE[k]]) PH[LODHIDE[k]].visible = false;
      const pg = o.children.find(c => /^PEDS/.test(c.name)); if (pg) pg.children.forEach((p, j) => DIO.peds.push({ o: p, x: p.position.x, y: p.position.y, z: p.position.z, q: p.quaternion.clone(), dir: new V3(0, 0, 1).applyQuaternion(p.quaternion).z < 0 ? -1 : 1, sp: .9 + (j % 5) * .12, ph: j * 1.7, walk: [-42, 52] })); } }).catch(e => console.error('lod ' + k, e)).finally(() => { lodPending--; }); }
let lodDone = false, lodT = 0; const _lv = new V3();
function lodNear() { if (!lodDone || (lodT++ & 15)) return; Object.entries(LODNEAR).forEach(([k, R]) => { if (lodState[k]) return; const F = LODPOS[k](); if (!F) return; const c = DIO.on ? null : camera.position; if (c && Math.hypot(c.x - F.x, c.y, c.z - F.z) < R) lodLoad(k); }); }
function loadLods() { ['ichiban', 'central', 'tokyu', 'toho'].forEach(lodLoad); lodDone = true; const w = () => lodPending ? setTimeout(w, 50) : (glbDone = true); w(); }
function dioPedsUpd(list, walk) { const t = U.time.value; list.forEach(p => { const W = p.walk || walk; if (W) { const [z0, L] = W; let z = p.z + p.dir * p.sp * t; z = z0 + (((z - z0) % L) + L) % L; p.o.position.z = z; } p.o.position.y = p.y + Math.abs(Math.sin(t * 7 * p.sp + p.ph)) * .06; p.o.quaternion.copy(p.q); p.o.rotateZ(Math.sin(t * 7 * p.sp + p.ph) * .05); }); }
function dioPeds() { dioPedsUpd(DIO.peds); if (DIO.on && DIO.root) dioPedsUpd(DIO.root.userData.peds, DIO.cfg.walk); }
function dioHero() { const c = DIO.cfg || DCFG.ichiban, A = innerWidth / innerHeight, tv = Math.max(13.5 / c.lens, 18 / c.lens / A); dCam.fov = 2 * Math.atan(tv) * 180 / Math.PI; dCam.aspect = A; dCam.updateProjectionMatrix(); dCam.position.copy(c.p); dCtl.target.copy(c.t); dCtl.maxDistance = c.R; { const d = c.p.clone().sub(c.t); dCtl.maxPolarAngle = Math.max(1.78, Math.acos(d.y / d.length()) + .03); } dCtl.update(); }
function dioFrame(dt) { if (dCam.position.y < .8) dCam.position.y = .8; const n = U.night.value, st = DIO.cfg.street; dCtl.update(); const hb = DIO.cfg.hb || 1; dHemi.intensity = (1.5 - n * 1.15) * (1 + (hb - 1) * (1 - n * .4)); dHemi.color.set(n > .5 ? '#8a90d8' : '#ffd9e2'); dSun.intensity = 2.4 * (1 - n * .93); dRed.intensity = st ? n * 22 : 0; dLamps.forEach(l => l.intensity = st ? n * 25 : 0);
  dRefl.visible = st && n > .05; dRefl.material.uniforms.color.value.setScalar(.5 * n * .5);
  const rp = composer.passes[0]; rp.scene = dScene; rp.camera = dCam; bloom.strength = bloomBase * .75; composer.render(); rp.scene = scene; rp.camera = camera; }
function dioShow(key, r) { if (DIO.root) dScene.remove(DIO.root); DIO.root = r; dScene.add(r); const c = DIO.cfg, S = c.sh; dSun.position.set(-34 * S / 70, 105 * S / 70, 62 * S / 70).add(c.t).setY(105 * S / 70); dSun.target.position.copy(c.t).setY(0);
  Object.assign(dSun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 10, far: S * 4 }); dSun.shadow.camera.updateProjectionMatrix(); DIO.ready = true; dioProg(1); }
function dioEnter(p) { const key = poiKey(p) || 'ichiban'; DIO.on = true; DIO.key = key; DIO.cfg = DCFG[key]; DIO.ready = false; dioHero(); dCtl.enabled = true; controls.enabled = false; document.body.classList.add('dio'); $('#dioN').textContent = nmOf(p.nm); $('#dioBar').hidden = false; dioProg(0);
  dioLoad(key).then(r => { if (DIO.key === key && DIO.on && r) dioShow(key, r); else if (!r) dioExit(); }); }
function dioExit() { if (!DIO.on) return; DIO.on = false; DIO.key = null; dCtl.enabled = false; controls.enabled = true; document.body.classList.remove('dio'); $('#dioBar').hidden = true; dioProg(1); }
addEventListener('resize', () => { if (DIO.on) { const c = DIO.cfg, A = innerWidth / innerHeight, tv = Math.max(13.5 / c.lens, 18 / c.lens / A); dCam.fov = 2 * Math.atan(tv) * 180 / Math.PI; dCam.aspect = A; dCam.updateProjectionMatrix(); } });
function select(i) { sel = i; const p = pois[i], d = desc(p); $('#card').classList.add('on'); $('#cN').textContent = nmOf(p.nm); const alt = [p.nm[0], p.nm[1], p.nm[2], p.nm[3]].filter((v, k, a) => v && v !== nmOf(p.nm) && a.indexOf(v) === k); $('#cE').textContent = alt.join(' / '); $('#cC').textContent = d.cat; $('#cD').textContent = [d.facts, d.tags].filter(Boolean).join(lang === 'en' ? '. ' : '。'); $('#cNote').textContent = d.notes; { const im = $('#cImg'); im.hidden = true; } if (poiKey(p)) dioEnter(p); else dioExit();
  const a = $('#cL'); if (p.id) { a.style.display = ''; a.href = 'https://www.openstreetmap.org/' + p.id; a.textContent = T[lang].osm; } else a.style.display = 'none';
  labels.forEach(l => l.el.classList.toggle('sel', l.i === i)); document.querySelectorAll('.it').forEach(e => e.classList.toggle('sel', +e.dataset.i === i));
  const v = bestView(poiSpec(p)); flyTo(v[0], v[1], 1.4);
  if (innerWidth < 700) $('#side').classList.remove('open'); }
function closeCard() { dioExit(); sel = -1; $('#card').classList.remove('on'); labels.forEach(l => l.el.classList.remove('sel')); document.querySelectorAll('.it.sel').forEach(e => e.classList.remove('sel')); }
const CTR = new V3(-10, 0, -20);
function panoPos() { const a = camera.aspect, hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * a), vf = THREE.MathUtils.degToRad(camera.fov / 2); const R = a < .8 ? 215 : 360; const d = Math.max(R / Math.tan(hf), R * .8 / Math.tan(vf)) * (a < .8 ? .95 : .92); const L = d * 1.08; scene.fog.near = L * 1.3; scene.fog.far = L * 3.5; return CTR.clone().add(new V3(d * .42, d * .78, d * .62)); }
function pano() { closeCard(); flyTo(panoPos(), CTR.clone()); }
/* ---------- hero camera: score candidate viewpoints by 2.5D line-of-sight against building footprints ---------- */
const HG = new Map(), HC = 16; bldInfo.forEach(b => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; b.pts.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }); for (let i = Math.floor(x0 / HC); i <= Math.floor(x1 / HC); i++) for (let j = Math.floor(z0 / HC); j <= Math.floor(z1 / HC); j++) { const k = i * 4096 + j; HG.has(k) ? HG.get(k).push(b) : HG.set(k, [b]); } });
function heightAt(x, z) { let h = 0; for (const b of HG.get(Math.floor(x / HC) * 4096 + Math.floor(z / HC)) || []) if (b.hv > h && inPoly(x, z, b.pts)) h = b.hv; return h; }
function poiSpec(p) { const g = p.hero; if (g) { const fx = Math.sin(g.dir), fz = Math.cos(g.dir), nx = Math.cos(g.dir), nz = -Math.sin(g.dir); return { x: g.x, y: g.SY - 1, z: g.z, fit: Math.max(g.span * 2.3, g.H * 2), axis: [fx, fz], prefer: [-g.dx, -g.dz], pts: [[0, g.SY, 0], [nx * g.span / 2, g.H, nz * g.span / 2], [-nx * g.span / 2, g.H, -nz * g.span / 2], [nx * g.span / 2, 3, nz * g.span / 2], [-nx * g.span / 2, 3, -nz * g.span / 2]] }; }
  if (p.k === 'tower' && LMK.tower) return { x: LMK.tower.x, y: LMK.tower.y * .6, z: LMK.tower.z, fit: LMK.tower.y * 1.3, skip: 30 };
  if (p.k === 'toho' && LMK.godzilla) return { x: LMK.godzilla.x + LMK.godzilla.face[0] * 6, y: LMK.godzilla.y - 8, z: LMK.godzilla.z + LMK.godzilla.face[1] * 6, fit: 60, skip: 12, prefer: LMK.godzilla.face };
  const fit = p.k === 'goldengai' || p.k === 'plaza' || p.k === 'station' ? 140 : Math.max(55, p.y * 1.6); return { x: p.x, y: Math.max(3, p.y * .45), z: p.z, fit, skip: 14 }; }
function bestView(sp) { const vf = Math.tan(camera.fov * Math.PI / 360), hf = vf * Math.min(camera.aspect, 1.9), d0 = sp.fit / 2 / Math.min(vf, hf) + 4; const pts = (sp.pts || [[0, 0, 0], [0, sp.fit * .25, 0]]).map(([a, b, c]) => sp.pts ? [sp.x + a, b, sp.z + c] : [sp.x, sp.y + b, sp.z]);
  const cur = camera.position.clone().sub(controls.target).setY(0).normalize(); let best = null;
  const dirs = []; if (sp.axis) [1, -1].forEach(s => [0, .18, -.18].forEach(t => { const a = Math.atan2(sp.axis[0] * s, sp.axis[1] * s) + t; dirs.push([Math.sin(a), Math.cos(a), t === 0 ? 1 : .6]); })); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; dirs.push([Math.sin(a), Math.cos(a), 0]); }
  for (const [ux, uz, onAxis] of dirs) for (const df of [.7, .85, 1, 1.3, 1.7, 2.3]) for (const el of [.12, .22, .36, .55, .8]) { const d = d0 * df, cx = sp.x + ux * d * Math.cos(el), cz = sp.z + uz * d * Math.cos(el), cy = sp.y + d * Math.sin(el);
    if (cy < 4) continue; let inside = false; for (const [ox, oz] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) if (heightAt(cx + ox, cz + oz) > cy - 2.5) { inside = true; break; } if (inside) continue;
    let vis = 0; for (const [tx, ty, tz] of pts) { const L = Math.hypot(tx - cx, ty - cy, tz - cz), n = Math.ceil(L / 2); let ok = true; for (let i = 1; i < n; i++) { const t = i / n, x = cx + (tx - cx) * t, y = cy + (ty - cy) * t, z = cz + (tz - cz) * t; if (Math.hypot(x - tx, z - tz) < (sp.skip || 1.5)) break; if (heightAt(x, z) > y) { ok = false; break; } } vis += ok; }
    const pr = sp.prefer ? (ux * sp.prefer[0] + uz * sp.prefer[1]) : (ux * cur.x + uz * cur.z);
    const score = vis / pts.length * 10 + onAxis * 3 + pr * (sp.prefer ? 2.5 : .8) - Math.abs(df - 1) * 1.5 - Math.abs(el - (sp.axis ? .3 : .5)) * 2;
    if (!best || score > best.s) best = { s: score, p: new V3(cx, cy, cz) }; }
  const tgt = new V3(sp.x, sp.y, sp.z); return [best ? best.p : tgt.clone().add(new V3(cur.x * 150, 120, cur.z * 150)), tgt]; }
function tourStops() { const P = k => D.pois.find(p => p.k === k), out = [];
  const Q = k => pois.find(p => p.k === k);
  ['gate', 'tower', 'toho', 'plaza', 'goldengai', 'station', 'shop', 'batting', 'shrine'].forEach(k => { const p = Q(k); if (p) out.push(bestView(poiSpec(p))); });
  const g2 = pois.find(p => p.hero === LMK.gate2); if (g2) out.push(bestView(poiSpec(g2))); return out; }
let tourT = null, tourI = 0;
function view(i) { const st = tourStops(), v = st[((i % st.length) + st.length) % st.length]; closeCard(); flyTo(v[0], v[1], 1.6); }
function tour() { if (tourT) { clearInterval(tourT); tourT = null; } else { tourI = 0; view(tourI++); tourT = setInterval(() => view(tourI++), 5000); } applyLang(); }
function bird() { const d = camera.aspect < .8 ? 1250 : 980; flyTo(CTR.clone().add(new V3(0, d, 1)), CTR.clone()); }
camera.position.copy(panoPos()); controls.target.copy(CTR); controls.update();
/* ---------- routing ---------- */
const routeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, uniforms: { t: U.time, night: U.night }, vertexShader: 'varying float vu;attribute float u;void main(){vu=u;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform float t,night;varying float vu;void main(){float d=step(.45,fract(vu*.08-t*.9));vec3 c=mix(vec3(1.,.24,.55),vec3(1.,.85,.3),d);gl_FragColor=vec4(c*(1.+night*1.2),.95);}' });
let routeMesh = null, routeMarks = [], routeInfo = null;
function clearRoute() { if (routeMesh) { scene.remove(routeMesh); routeMesh.geometry.dispose(); routeMesh = null; } routeMarks.forEach(m => scene.remove(m)); routeMarks = []; routeInfo = null; $('#rRes').textContent = ''; drawMini(); }
function routeBetween(a, b) { clearRoute(); if (a < 0 || b < 0 || a === b) { $('#rRes').textContent = T[lang].pick; return; } const A = pois[a], B = pois[b]; const r = dijkstra(adj, A.node, B.node); if (!r) { $('#rRes').textContent = T[lang].noroute; return; }
  const pts = [[A.x, A.z], ...r.path.map(i => nodes[i]), [B.x, B.z]]; const pos = [], uu = [], idx = []; let acc = 0; const w = 2.2;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)]; let dx = q[0] - o[0], dz = q[1] - o[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L; if (i) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); pos.push(p[0] - dz * w, Y.route + 1.5, p[1] + dx * w, p[0] + dz * w, Y.route + 1.5, p[1] - dx * w); uu.push(acc, acc); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('u', new THREE.Float32BufferAttribute(uu, 1)); g.setIndex(idx); routeMesh = new THREE.Mesh(g, routeMat); routeMesh.renderOrder = 20; scene.add(routeMesh);
  [[A, '#2fb36b'], [B, '#e2583e']].forEach(([P, c]) => { const m = new THREE.Mesh(new THREE.ConeGeometry(2.6, 7, 12), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .5 })); m.rotation.x = Math.PI; m.position.set(P.x, 8, P.z); scene.add(m); routeMarks.push(m); });
  const len = acc; routeInfo = { pts, len }; $('#rRes').textContent = `${nmOf(A.nm)} → ${nmOf(B.nm)}: ${Math.round(len)} ${T[lang].m} · ${T[lang].walk} ${Math.max(1, Math.round(len / 80))} ${T[lang].min}`;
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; pts.forEach(([x, z]) => { minx = Math.min(minx, x); maxx = Math.max(maxx, x); minz = Math.min(minz, z); maxz = Math.max(maxz, z); }); const c = new V3((minx + maxx) / 2, 0, (minz + maxz) / 2), sz = Math.max(maxx - minx, maxz - minz, 80); const d = sz * (camera.aspect < .8 ? 2.6 : 1.6); closeCard(); flyTo(c.clone().add(new V3(d * .3, d * .9, d * .45)), c); drawMini(); }
/* ---------- minimap + compass ---------- */
const mm = $('#mm'), mctx = mm.getContext('2d'), MMW = mm.width, MMH = mm.height, mmS = Math.min(MMW / (BX * 2), MMH / (BZ * 2));
const toMM = (x, z) => [MMW / 2 + x * mmS, MMH / 2 + z * mmS];
const mmBase = document.createElement('canvas'); mmBase.width = MMW; mmBase.height = MMH; { const c = mmBase.getContext('2d'); c.fillStyle = '#efe2cf'; c.fillRect(0, 0, MMW, MMH); c.fillStyle = '#b9d49c'; (areasByT[0] || []).concat(areasByT[2] || []).forEach(p => { c.beginPath(); p.forEach(([x, z], i) => { const [u, v] = toMM(x, z); i ? c.lineTo(u, v) : c.moveTo(u, v); }); c.fill(); });
  c.strokeStyle = '#8c8590'; c.lineCap = 'round'; O.r.forEach(([cls, , seq]) => { if (cls > 3) return; c.lineWidth = [2.4, 1.7, 1, 1.2][cls]; c.beginPath(); seq.forEach((i, k) => { const [u, v] = toMM(...nodes[i]); k ? c.lineTo(u, v) : c.moveTo(u, v); }); c.stroke(); });
  c.fillStyle = 'rgba(200,150,120,.75)'; bldInfo.forEach(b => { c.beginPath(); b.pts.forEach(([x, z], i) => { const [u, v] = toMM(x, z); i ? c.lineTo(u, v) : c.moveTo(u, v); }); c.fill(); }); }
function drawMini() { mctx.drawImage(mmBase, 0, 0); if (routeInfo) { mctx.strokeStyle = '#ff3d8b'; mctx.lineWidth = 2.5; mctx.beginPath(); routeInfo.pts.forEach(([x, z], i) => { const [u, v] = toMM(x, z); i ? mctx.lineTo(u, v) : mctx.moveTo(u, v); }); mctx.stroke(); }
  pois.forEach((p, i) => { const [u, v] = toMM(p.x, p.z); mctx.fillStyle = i === sel ? '#e2583e' : '#5a3a30'; mctx.beginPath(); mctx.arc(u, v, i === sel ? 3.5 : 2, 0, 7); mctx.fill(); });
  const [tu, tv] = toMM(controls.target.x, controls.target.z), az = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z), dist = camera.position.distanceTo(controls.target), r = Math.min(60, dist * mmS * .5);
  mctx.fillStyle = 'rgba(226,88,62,.22)'; mctx.strokeStyle = '#e2583e'; mctx.lineWidth = 1.5; mctx.beginPath(); mctx.moveTo(tu + Math.sin(az) * r * .6, tv + Math.cos(az) * r * .6); mctx.lineTo(tu - Math.sin(az + .5) * r, tv - Math.cos(az + .5) * r); mctx.lineTo(tu - Math.sin(az - .5) * r, tv - Math.cos(az - .5) * r); mctx.closePath(); mctx.fill(); mctx.stroke(); }
mm.addEventListener('click', e => { const r = mm.getBoundingClientRect(); const x = ((e.clientX - r.left) * MMW / r.width - MMW / 2) / mmS, z = ((e.clientY - r.top) * MMH / r.height - MMH / 2) / mmS; const off = camera.position.clone().sub(controls.target); const t = new V3(x, 0, z); flyTo(t.clone().add(off), t, .8); });
function northUp() { const t = controls.target, d = camera.position.distanceTo(t), el = Math.max(.25, Math.asin(Math.min(1, (camera.position.y - t.y) / d))); flyTo(t.clone().add(new V3(0, Math.sin(el) * d, Math.cos(el) * d)), t.clone(), .8); }
const STREETS = ['靖国通り', '花道通り', '歌舞伎町さくら通り', '歌舞伎町一番街通り', 'セントラルロード', '区役所通り', '西武新宿駅前通り', '歌舞伎町東通り', '明治通り', '新宿ゴールデン街 G1通り', '新宿通り', '仲見世通り'];
STREETS.forEach((n, k) => { const segs = namedRoads[n]; if (!segs) return; const rec = NAMES.find(r => r[0] === n); let best = null, bl = 0; segs.forEach(pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (L > bl) { bl = L; best = pts; } });
  let acc = 0, m = best[0]; for (let i = 1; i < best.length; i++) { const L = Math.hypot(best[i][0] - best[i - 1][0], best[i][1] - best[i - 1][1]); if (acc + L >= bl / 2) { const f = (bl / 2 - acc) / L; m = [best[i - 1][0] + (best[i][0] - best[i - 1][0]) * f, best[i - 1][1] + (best[i][1] - best[i - 1][1]) * f]; break; } acc += L; }
  const el = document.createElement('div'); el.className = 'lb st'; el.innerHTML = '<span></span>'; const o = new CSS2DObject(el); o.position.set(m[0], 3, m[1]); scene.add(o); labels.push({ el, o, i: 1000 + k, nm: rec, st: true, mode: '', want: '', cnt: 0, prio: -1 }); });
/* ---------- labels: hysteresis to stop flicker ---------- */
const _v = new V3();
function layoutLabels() { const Wd = innerWidth, H = innerHeight, narrow = Wd < 700; const panels = ['#brand', '#tools', '#side', '#hud', '#card', '#attr', '#route', '#mmWrap', '#compass'].map(s => $(s)).filter(e => e && getComputedStyle(e).display !== 'none' && !e.hidden).map(e => e.getBoundingClientRect()).filter(r => r.width); const placed = [];
  const order = [...labels].sort((a, b) => (b.i === sel) - (a.i === sel) || b.prio - a.prio || a.i - b.i);
  for (const L of order) { _v.copy(L.o.position).project(camera); const x = (_v.x * .5 + .5) * Wd, y = (-_v.y * .5 + .5) * H; let mode = 'hide';
    if (_v.z < 1) { const tryW = w => { const r = { l: x - w / 2, r: x + w / 2, t: y - 12, b: y + 12 }; if (r.l < 4 || r.r > Wd - 4 || r.t < 4 || r.b > H - 4) return null; for (const p of panels) if (r.l < p.right && r.r > p.left && r.t < p.bottom && r.b > p.top) return null; for (const p of placed) if (r.l - 4 < p.r && r.r + 4 > p.l && r.t - 3 < p.b && r.b + 3 > p.t) return null; return r; };
      L.fw = L.fw || (L.el.querySelector('span').offsetWidth + 40); let r = (narrow && L.i !== sel && !L.st) ? null : tryW(L.fw); if (r) mode = 'full'; else if (!L.st) { r = tryW(28); if (r) mode = 'num'; } if (r) placed.push(r); }
    if (mode === L.mode) { L.cnt = 0; continue; } if (mode !== L.want) { L.want = mode; L.cnt = 0; } if (++L.cnt >= (L.mode === '' || fly ? 1 : 4) || mode === 'hide' && _v.z >= 1) { L.mode = mode; L.cnt = 0; L.el.classList.toggle('num', mode === 'num'); L.el.classList.toggle('hide', mode === 'hide'); } } }
/* ---------- UI ---------- */
function buildList() { const q = $('#q').value.trim().toLowerCase(); const list = $('#list'); list.innerHTML = ''; pois.forEach((p, i) => { if (q && !p.nm.join(' ').toLowerCase().includes(q)) return; const d = document.createElement('button'); d.className = 'it' + (i === sel ? ' sel' : ''); d.dataset.i = i; d.innerHTML = `<i>${p.no}</i><span></span><small></small>`; d.querySelector('span').textContent = nmOf(p.nm); d.querySelector('small').textContent = (KCAT[p.k] || KCAT.venue)[LI[lang]]; d.onclick = () => select(i); list.appendChild(d); }); }
function fillSel(el) { const v = el.value; el.innerHTML = `<option value="-1">—</option>` + pois.map((p, i) => `<option value="${i}">${p.no} ${nmOf(p.nm).replace(/</g, '')}</option>`).join(''); el.value = v || -1; }
function applyLang() { const t = T[lang]; document.documentElement.lang = lang === 'en' ? 'en' : lang === 'ja' ? 'ja' : 'zh-Hant'; document.title = t.title + ' · ' + t.sub; const set = (s, v) => { const e = $(s); if (e) e.textContent = v; }; set('#tTitle', t.title); set('#tourBtn', tourT ? t.tourStop : t.tour); set('#tSub', t.sub); set('#panoBtn', t.pano); set('#birdBtn', t.bird); set('#routeBtn', t.route); set('#listBtn', t.list); $('#q').placeholder = t.q; set('#rFromL', t.from); set('#rToL', t.to); set('#rGo', t.go); set('#rSwap', '⇅ ' + t.swap); set('#rClr', t.clear); set('#bFrom', t.fromHere); set('#bTo', t.toHere); set('#keys', t.keys); $('#compass').title = t.north; $('#mm').title = t.mm; $('#playBtn').title = playing ? t.pause : t.play; $('#langSel').value = lang;
  labels.forEach(l => { l.el.querySelector('span').textContent = nmOf(l.nm || pois[l.i].nm); l.fw = 0; }); buildList(); fillSel($('#rFrom')); fillSel($('#rTo')); if (sel >= 0) select(sel); if (routeInfo) routeBetween(+$('#rFrom').value, +$('#rTo').value); }
document.querySelectorAll('#hud [data-t]').forEach(b => b.onclick = () => { simT = +b.dataset.t; applyTime(simT); playing = false; $('#playBtn').textContent = '▶'; });
$('#playBtn').onclick = () => { playing = !playing; $('#playBtn').textContent = playing ? '❚❚' : '▶'; $('#playBtn').title = playing ? T[lang].pause : T[lang].play; }; $('#playBtn').textContent = playing ? '❚❚' : '▶';
$('#panoBtn').onclick = pano; $('#tourBtn').onclick = tour; $('#birdBtn').onclick = bird; $('#listBtn').onclick = () => $('#side').classList.toggle('open'); $('#routeBtn').onclick = () => $('#route').classList.toggle('on');
$('#langSel').onchange = e => { lang = e.target.value; localStorage.setItem('kbLang', lang); const u = new URL(location); u.searchParams.set('lang', lang); history.replaceState(null, '', u); applyLang(); };
$('#dioX').onclick = () => closeCard(); $('#cardX').onclick = closeCard; $('#q').oninput = buildList; $('#compass').onclick = northUp;
$('#rGo').onclick = () => routeBetween(+$('#rFrom').value, +$('#rTo').value); $('#rSwap').onclick = () => { const a = $('#rFrom').value; $('#rFrom').value = $('#rTo').value; $('#rTo').value = a; if (routeInfo) $('#rGo').onclick(); }; $('#rClr').onclick = clearRoute;
$('#bFrom').onclick = () => { $('#rFrom').value = sel; $('#route').classList.add('on'); if (+$('#rTo').value >= 0) $('#rGo').onclick(); }; $('#bTo').onclick = () => { $('#rTo').value = sel; $('#route').classList.add('on'); if (+$('#rFrom').value >= 0) $('#rGo').onclick(); };
const keys = new Set();
addEventListener('keydown', e => { if (DIO.on && e.key === 'Escape') { closeCard(); return; } if (e.target.closest('input,select,textarea')) { if (e.key === 'Escape') e.target.blur(); return; } const k = e.key.toLowerCase();
  if (k === 'escape') { closeCard(); $('#route').classList.remove('on'); $('#side').classList.remove('open'); } else if (k === 'r') pano(); else if (k === 'b') bird(); else if (k === 'n') northUp(); else if (k === '/') { e.preventDefault(); if (innerWidth < 700) $('#side').classList.add('open'); $('#q').focus(); } else if (k === ' ') { e.preventDefault(); $('#playBtn').onclick(); } else keys.add(k); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase())); addEventListener('blur', () => keys.clear());
function keyNav(dt) { if (!keys.size) return; const off = camera.position.clone().sub(controls.target), d = off.length(); const fwd = off.clone().setY(0).normalize().negate(), right = new V3(-fwd.z, 0, fwd.x), mv = new V3(), sp = d * .9 * dt;
  if (keys.has('arrowup') || keys.has('w')) mv.add(fwd); if (keys.has('arrowdown') || keys.has('s')) mv.sub(fwd); if (keys.has('arrowright') || keys.has('d')) mv.add(right); if (keys.has('arrowleft') || keys.has('a')) mv.sub(right);
  if (mv.lengthSq()) { mv.normalize().multiplyScalar(sp); camera.position.add(mv); controls.target.add(mv); fly = null; }
  if (keys.has('q') || keys.has('e')) { off.applyAxisAngle(new V3(0, 1, 0), (keys.has('q') ? 1 : -1) * dt * 1.2); camera.position.copy(controls.target).add(off); fly = null; }
  if (keys.has('+') || keys.has('=') || keys.has('-') || keys.has('_')) { const f = keys.has('-') || keys.has('_') ? 1 + dt * 1.2 : 1 - dt * 1.2; off.multiplyScalar(f); if (off.length() > controls.minDistance && off.length() < controls.maxDistance) camera.position.copy(controls.target).add(off); fly = null; } }
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); lr.setSize(innerWidth, innerHeight); if (sel < 0 && !routeInfo) { camera.position.copy(panoPos()); controls.target.copy(CTR); } });
applyLang(); applyTime(simT); drawMini();
/* ---------- loop ---------- */
let ledF = 0; const clock = new THREE.Clock(); let fc = 0, lastAz = 1e9;
function frame() { const dt = Math.min(clock.getDelta(), .1); renderer.info.reset(); lodNear();
  if (playing) { simT = (simT + dt * 4) % 1440; applyTime(simT); }
  if (!FREEZE) { stepAgents(dt); U.time.value += dt; if (++ledF % 4 === 0) drawLED(U.time.value); }
  keyNav(dt);
  if (fly) { fly.k = Math.min(1, fly.k + dt / fly.dur); const e = 1 - Math.pow(1 - fly.k, 3); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (fly.k >= 1) fly = null; }
  dioPeds(); if (DIO.on && DIO.ready) { dioFrame(dt); lr.domElement.style.visibility = 'hidden'; } else { lr.domElement.style.visibility = '';
  controls.update(); bloom.strength = bloomBase * Math.min(1, Math.max(.35, camera.position.distanceTo(controls.target) / 380)); composer.render(); lr.render(scene, camera); layoutLabels(); }
  const az = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z); if (Math.abs(az - lastAz) > .002) { lastAz = az; $('#needle').style.transform = `rotate(${az}rad)`; }
  if (++fc % 6 === 0) drawMini(); }
$('#load').style.display = 'none'; renderer.setAnimationLoop(frame);
requestAnimationFrame(() => requestAnimationFrame(() => (window.requestIdleCallback || setTimeout)(loadLods, { timeout: 400 }))); // map LODs after the first frame
/* click a gate in 3D → hero view */
{ const rc = new THREE.Raycaster(), pk = ['gatePost', 'gateTube', 'gateBox', 'gateTrim', 'gateFoot'].map(k => kit[k] && kit[k].im).filter(Boolean); let down = null;
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const r = canvas.getBoundingClientRect(); rc.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera); const h = rc.intersectObjects(pk, false)[0]; if (!h) return; let bi = -1, bd = 1e9; pois.forEach((p, i) => { if (!p.hero) return; const d = Math.hypot(p.hero.x - h.point.x, p.hero.z - h.point.z); if (d < bd) { bd = d; bi = i; } }); if (bi >= 0 && bd < 30) select(bi); }); }
if (TEST) window.__kb = { LMK, get ready() { return glbDone && !lodPending && (!DIO.on || DIO.ready); }, lod: k => lodLoad(k), camTo: (p, t) => { fly = null; camera.position.set(...p); controls.target.set(...t); controls.update(); return camera.position.toArray(); }, cpos: () => camera.position.toArray(), gpu: () => { let gb = 0, tb = 0; const seen = new Set(); [scene, dScene].forEach(S => S.traverse(o => { if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); Object.values(o.geometry.attributes).forEach(a => gb += a.array.byteLength); if (o.geometry.index) gb += o.geometry.index.array.byteLength; } [].concat(o.material || []).forEach(m => Object.values(m).forEach(v => { if (v && v.isTexture && !seen.has(v)) { seen.add(v); const im = v.image; if (im && im.width) tb += im.width * im.height * 4 * (v.generateMipmaps !== false ? 1.33 : 1); } })); })); return { geomMB: +(gb / 1048576).toFixed(1), texMB: +(tb / 1048576).toFixed(1), ...renderer.info.memory, calls: renderer.info.render.calls }; }, dio: on => on ? dioEnter(pois[sel] || pois[0]) : dioExit(), dioReady: () => DIO.ready, dioView: (az, pol, r) => { dCam.position.setFromSphericalCoords(r, pol, az).add(dCtl.target); dCtl.update(); }, dioHero: () => dioHero(), lmkInfo: () => { const ext = pts => { const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]); return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)].map(v => +v.toFixed(1)); }; return { k3: (LMK[3] || []).map(i => [ext(i.pts), i.hv, i.pts]), k4: (LMK[4] || []).map(i => [ext(i.pts), i.hv, i.pts]), k7: (LMK[7] || []).length, k7e: ext((LMK[7] || []).flatMap(i => i.pts)), shrine: (areasByT[2] || []).map(ext), pois: D.pois.filter(p => /plaza|tower|toho|goldengai|shrine/.test(p.k)).map(p => [p.k, p.nm, +p.x.toFixed(1), +p.z.toFixed(1)]), gate2: LMK.gate2 && [LMK.gate2.x, LMK.gate2.z, LMK.gate2.dir, LMK.gate2.span], GF }; }, dcam: () => [dCam.position.toArray(), dCtl.target.toArray(), dCam.fov, DIO.root && DIO.root.position.toArray(), DIO.root && DIO.root.scale.toArray()], dc: () => renderer.info.render.calls, stats: { ...D.meta.stats, pois: pois.length, walkers: NW, cars: NC }, select, route: (a, b) => { routeBetween(a, b); return $('#rRes').textContent; }, view: i => { view(i); fly.k = .999; }, fin: () => { if (fly) fly.k = .999; }, gxy: () => { const v = new V3(LMK.gate.x, LMK.gate.SY, LMK.gate.z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, gates: () => [LMK.gate, LMK.gate2].map(g => [g.x, g.z, g.dir, g.span].map(v => +v.toFixed(1))), setCam: (p, t) => { camera.position.set(...p); controls.target.set(...t); controls.update(); }, cam: () => [camera.position.toArray().map(v => +v.toFixed(1)), controls.target.toArray().map(v => +v.toFixed(1))], poi: n => pois.findIndex(p => p.nm.includes(n) || (p.id || '').endsWith('/' + n)) };
}
main().catch(fail);
