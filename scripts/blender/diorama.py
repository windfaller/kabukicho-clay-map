# v11: full 360 clay diorama of our Imagine concept (ref/imagine_gate_*.png). Blender Z-up, street runs +Y, gate at y=0.
import bpy, bmesh, math, random, sys, os, json
from mathutils import Vector, Matrix
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = argv[0] if argv else 'day'          # day | night | export | orbitN (N=0..3)
OUT = argv[1] if len(argv) > 1 else '/tmp/x.png'
SAMPLES = int(argv[2]) if len(argv) > 2 else 40
D = os.path.dirname(os.path.abspath(__file__)); DIO = os.path.join(D, '..', 'dio')
RECTS = json.load(open(os.path.join(DIO, 'rects.json')))
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
NIGHT = MODE == 'night'; EXP = MODE == 'export'
EM = 1.0 if EXP else (3.0 if NIGHT else .5)
def hexc(h): h = h.lstrip('#'); return tuple((int(h[i:i+2], 16) / 255) ** 2.2 for i in (0, 2, 4))
MATS = {}
def mat(name, col, rough=.85, em=None, ems=0., tex=None, grain=.15):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexc(col), 1); b.inputs['Roughness'].default_value = rough
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(DIO, tex)); nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if em is not None: nt.links.new(t.outputs['Color'], b.inputs['Emission Color'])
    elif em is not None: b.inputs['Emission Color'].default_value = (*hexc(em), 1)
    if em is not None: b.inputs['Emission Strength'].default_value = ems * EM
    if grain and not EXP:
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 30; n.inputs['Detail'].default_value = 8
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = grain; bp.inputs['Distance'].default_value = .02
        nt.links.new(n.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    MATS[name] = m; return m
COL = bpy.data.collections.new('ALL'); sc.collection.children.link(COL)
def put(me, name, loc=(0, 0, 0), rz=0, s=1):
    o = bpy.data.objects.new(name, me); o.location = loc; o.rotation_euler = (0, 0, rz); o.scale = (s, s, s) if isinstance(s, (int, float)) else s; COL.objects.link(o); return o
def bm_mesh(bm, name, mats):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    return me
def rbox_bm(bm, c, size, bev, seg, mi=0, rz=0):
    for v in bm.verts: v.tag = True
    r = bmesh.ops.create_cube(bm, size=1.0)['verts']
    for v in r: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])); v.tag = False
    if bev > 0:
        es = list({e for v in r for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=es, offset=min(bev, min(size) * .48), segments=seg, affect='EDGES', profile=.5)
    M = Matrix.Translation(c) @ Matrix.Rotation(rz, 4, 'Z')
    nv = [v for v in bm.verts if not v.tag]
    for f in {f for v in nv for f in v.link_faces}: f.material_index = mi; f.smooth = True
    for v in nv: v.co = M @ v.co; v.tag = True
def mesh_of(fn, name, mats):
    bm = bmesh.new(); fn(bm)
    for v in bm.verts: v.tag = False
    return bm_mesh(bm, name, mats)
def rbox(name, m, c, size, bev=.3, seg=3, rz=0):
    me = mesh_of(lambda bm: rbox_bm(bm, Vector((0, 0, 0)), size, bev, seg), name, [m]); return put(me, name, c, rz)
def cyl_bm(bm, c, r, h, verts=24, mi=0, bev=0, r2=None):
    g = bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r2 if r2 is not None else r, depth=h, matrix=Matrix.Translation(c))
    vs = g['verts']
    if bev:
        es = [e for e in {e for v in vs for e in v.link_edges} if e.calc_face_angle(0) > .6]
        bmesh.ops.bevel(bm, geom=es, offset=bev, segments=2, affect='EDGES')
    for f in {f for v in bm.verts for f in v.link_faces if not v.tag}: f.material_index = mi; f.smooth = True
    for v in bm.verts: v.tag = True
def sph_bm(bm, c, r, mi=0, sub=2, scl=(1, 1, 1)):
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*[r * s for s in scl], 1)))
    for f in {f for v in bm.verts for f in v.link_faces if not v.tag}: f.material_index = mi; f.smooth = True
    for v in bm.verts: v.tag = True
def quad(name, m, center, w, h, rz, uv):
    me = bpy.data.meshes.new(name); hw, hh = w / 2, h / 2
    me.from_pydata([(-hw, 0, -hh), (hw, 0, -hh), (hw, 0, hh), (-hw, 0, hh)], [], [(0, 1, 2, 3)]); me.update()
    l = me.uv_layers.new(); u0, v0, u1, v1 = uv[:4]
    for i, (u, v) in enumerate([(u0, v0), (u1, v0), (u1, v1), (u0, v1)]): l.data[i].uv = (u, v)
    me.materials.append(m); return put(me, name, center, rz)

# ---------------- palette ----------------
RED = mat('gateRed', '#e3262c', .5, em='#ff2020', ems=.12)
BULB = mat('bulb', '#fff6ea', .15, em='#fff0d8', ems=2.6, grain=0)
STONE = mat('post', '#a9a6a2', .95, grain=.5)
SIGNB = mat('signBody', '#efe7d6', .8)
SIGNF = mat('signFace', '#ffffff', .75, em='#ffffff', ems=.35, tex='atlas.png', grain=.05)
SBACK = mat('signBack', '#2b2433', .9)
GLASS = mat('window', '#d9a050', .4, em='#ffae48', ems=1.0, grain=0)
FRAME = mat('frame', '#3a2f3c', .9)
SHOPG = mat('shopGlass', '#8a5a34', .5, em='#ffa048', ems=.8, grain=0)
LANT = mat('lantern', '#ffe9b8', .3, em='#ffd890', ems=2.5, grain=0)
IRON = mat('lampPost', '#2f3a3a', .6)
ROAD = mat('road', '#3d3c48', .35 if NIGHT else .7, grain=.25)
WALK = mat('walk', '#9a8f8a', .9, grain=.3)
CURB = mat('curb', '#b5aca5', .9)
BASE = mat('base', '#7a4a3c', .9)
CLOUD = mat('cloud', '#e0a79a' if not NIGHT else '#3a3456', .95)
DOOR = mat('door', '#6b3f2c', .8)
JEWEL = ['#55607e', '#b84e44', '#e08a6e', '#3f8f86', '#6a54a0', '#5468a8', '#d8a640', '#9c5080', '#5a8c5c', '#44568a', '#cc6584', '#4f9ab2']
BLD = [mat('bld%d' % i, c, .92) for i, c in enumerate(JEWEL)]
LEDGE = [mat('ledge%d' % i, '#%02x%02x%02x' % tuple(int(int(c[j:j+2], 16) * .72) for j in (1, 3, 5)), .9) for i, c in enumerate(JEWEL)]
AWN = [mat('awn%d' % i, c, .85) for i, c in enumerate(['#c7362e', '#d9a33a', '#3f6e8c', '#8a4c8c', '#4f8a56'])]
SKIN = mat('skin', '#e8b896', .7); HAIR = mat('hair', '#3a2a24', .8)
CLOTH = [mat('cloth%d' % i, c, .85) for i, c in enumerate(['#d8b04a', '#3f8a5a', '#c4405a', '#3d5e9e', '#8a5aa0', '#d07a3a', '#5a5f6a'])]

# ---------------- gate ----------------
S = 5.8; TR = .68; TOP = 11.0; R = 2.0; LB = 6.85; RI = 1.05
def arc(cx, cz, r, a0, a1, n=12): return [(cx + math.cos(a0 + (a1 - a0) * k / n) * r, cz + math.sin(a0 + (a1 - a0) * k / n) * r) for k in range(n + 1)]
loop = [(-S, 3.7), (-S, TOP - R)] + arc(-S + R, TOP - R, R, math.pi, math.pi / 2)[1:] + [(-S + R + (2 * S - 2 * R) * k / 8, TOP + .12 * math.sin(math.pi * k / 8)) for k in range(1, 8)] + arc(S - R, TOP - R, R, math.pi / 2, 0) + [(S, 3.7)]
low = arc(-S + RI, LB + RI, RI, math.pi, 1.5 * math.pi, 7) + [(-S + RI + (2 * S - 2 * RI) * k / 12, LB - .22 * math.sin(math.pi * k / 12)) for k in range(1, 12)] + arc(S - RI, LB + RI, RI, 1.5 * math.pi, 2 * math.pi, 7)
def tube(pts, name):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = TR; cu.bevel_resolution = 6; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for p, (x, z) in zip(sp.bezier_points, pts): p.co = (x, 0, z); p.handle_left_type = p.handle_right_type = 'AUTO'
    cu.resolution_u = 4; o = bpy.data.objects.new(name, cu); COL.objects.link(o); cu.materials.append(RED)
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False)
    for p in o.data.polygons: p.use_smooth = True
    return o
tube(loop, 'n_tubeLoop'); tube(low, 'n_tubeLow')
def resample(pts, step):
    out = []; acc = step / 2
    for a, b in zip(pts, pts[1:]):
        L = math.dist(a, b); t = acc
        while t < L: f = t / L; out.append(((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f), ((b[0] - a[0]) / L, (b[1] - a[1]) / L))); t += step
        acc = t - L
    return out
bulbme = mesh_of(lambda bm: sph_bm(bm, Vector((0, 0, 0)), .095, 0, 2), 'bulbM', [BULB])
for pts, trim in ((loop, 0), (low, 1)):
    for (x, z), (tx, tz) in resample(pts, .4):
        if trim and abs(x) > S - .45 and z > LB + .5: continue
        if not trim and z < 4.0: continue
        nx, nz = -tz, tx
        for face in (-1, 1):
            for th in (-.62, .62):
                put(bulbme, 'i_bulb', (x + nx * TR * math.sin(th) * .98, face * TR * math.cos(th) * .98, z + nz * TR * math.sin(th) * .98))
def post(bm):
    cyl_bm(bm, Vector((0, 0, 2.05)), .92, 3.3, 32, 0, .1)
    cyl_bm(bm, Vector((0, 0, .38)), 1.2, .76, 32, 0, .22)
    cyl_bm(bm, Vector((0, 0, .9)), 1.05, .3, 32, 0, .1)
    cyl_bm(bm, Vector((0, 0, 3.72)), 1.14, .55, 32, 0, .2)
    cyl_bm(bm, Vector((0, 0, 3.32)), 1.0, .2, 32, 0, .07)
pm = mesh_of(post, 'postM', [STONE])
for s in (-1, 1): put(pm, 'n_post', (s * S, 0, 0))
SW, SH, SZ = 9.4, 2.85, 8.92
rbox('n_signSlab', SIGNB, (0, 0, SZ), (SW + .5, 1.5, SH + .45), bev=.55, seg=5)
for s in (-1, 1):
    me = mesh_of(lambda bm: cyl_bm(bm, Vector((0, 0, 0)), .2, 1.0, 12, 0, .04), 'rod', [CURB]); o = put(me, 'n_rod', (s * 5.15, 0, SZ)); o.rotation_euler = (0, math.pi / 2, 0)
g = RECTS['gate']; u0, v0, u1, v1 = g[:4]; m = .012
quad('n_gateSign', SIGNF, (0, -.76, SZ), SW - .1, SH - .05, 0, (u0 + m * .3, v0 + m, u1 - m * .3, v1 - m))
quad('n_gateSignB', SIGNF, (0, .76, SZ), SW - .1, SH - .05, math.pi, (u0 + m * .3, v0 + m, u1 - m * .3, v1 - m))

# ---------------- windows / shopfront / lamp meshes ----------------
def framed(bm, w, h, d, inset, depth, bev):
    r = bmesh.ops.create_cube(bm, size=1.0)['verts']
    for v in r: v.co = Vector((v.co.x * w, v.co.y * d, v.co.z * h))
    front = [f for f in bm.faces if f.normal.y < -.9][0]
    res = bmesh.ops.inset_individual(bm, faces=[front], thickness=inset, depth=-depth)
    front.material_index = 1
    es = [e for e in bm.edges if e.calc_face_angle(0) > 1.0]
    bmesh.ops.bevel(bm, geom=es, offset=bev, segments=2, affect='EDGES')
    for f in bm.faces: f.smooth = True
winM = mesh_of(lambda bm: framed(bm, .72, .98, .3, .11, .12, .04), 'winM', [FRAME, GLASS])
winS = mesh_of(lambda bm: framed(bm, .62, .82, .28, .1, .1, .035), 'winS', [FRAME, GLASS])
shopM = mesh_of(lambda bm: framed(bm, 3.0, 2.3, .35, .22, .18, .06), 'shopM', [FRAME, SHOPG])
def lamp(bm):
    cyl_bm(bm, Vector((0, 0, .25)), .26, .5, 12, 0, .06)
    cyl_bm(bm, Vector((0, 0, 2.1)), .09, 3.4, 10, 0)
    cyl_bm(bm, Vector((0, 0, 1.0)), .14, .18, 12, 0, .04)
    cyl_bm(bm, Vector((0, 0, 3.75)), .2, .12, 12, 0, .03)
    cyl_bm(bm, Vector((0, 0, 4.15)), .28, .62, 8, 1, 0, .22)
    cyl_bm(bm, Vector((0, 0, 4.58)), .38, .28, 8, 0, 0, .05)
    sph_bm(bm, Vector((0, 0, 4.82)), .08, 0, 1)
lampM = mesh_of(lamp, 'lampM', [IRON, LANT])
balM = mesh_of(lambda bm: rbox_bm(bm, Vector((0, 0, 0)), (1.3, .55, .2), .08, 2), 'balM', [CURB])

# ---------------- signs ----------------
NAMES = [k for k in RECTS if k != 'gate']
def sign(key, c, h, rz=0, back=None, d=.38, bodyc=SBACK):
    r = RECTS[key]; w = h * r[4]
    o = rbox('n_sb', bodyc, c, (w + .22, d, h + .22), bev=.16, seg=3, rz=rz)
    u0, v0, u1, v1 = r[:4]; e = .004
    off = Vector((math.sin(rz) * (d / 2 + .015), -math.cos(rz) * (d / 2 + .015), 0))
    quad('n_sf', SIGNF, Vector(c) + off, w, h, rz, (u0 + e, v0 + e, u1 - e, v1 - e))
    k2 = back or random.choice(NAMES); r2 = RECTS[k2]
    if abs(r2[4] - r[4]) < .35 * r[4]:
        quad('n_sf', SIGNF, Vector(c) - off, w, h, rz + math.pi, (r2[0] + e, r2[1] + e, r2[2] - e, r2[3] - e))
    return w

# ---------------- buildings ----------------
WINS = []
def tower(x0, x1, y0, y1, h, ci, faces, shop=None, seed=0, wstep=1.35, fl=2.1, balc=0.):
    rr = random.Random(seed)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; W, L = x1 - x0, y1 - y0
    rbox('n_bld', BLD[ci], (cx, cy, h / 2), (W, L, h), bev=.55, seg=3)
    # ledges every few floors + roof setbacks
    z = 3.6
    rbox('n_ledge', LEDGE[ci], (cx, cy, z), (W + .4, L + .4, .32), bev=.15, seg=2)
    if h > 11: rbox('n_ledge', LEDGE[ci], (cx, cy, 3.6 + fl * (int((h - 4) / fl) // 2 + 1) - .9), (W + .3, L + .3, .26), bev=.12, seg=2)
    rbox('n_cap', LEDGE[ci], (cx, cy, h + .15), (W + .3, L + .3, .4), bev=.18, seg=2)
    if rr.random() < .7:
        sw, sl = W * rr.uniform(.45, .7), L * rr.uniform(.4, .7); rbox('n_set', BLD[ci], (cx + rr.uniform(-.1, .1) * W, cy, h + 1.1), (sw, sl, 2.0), bev=.4, seg=3)
        if rr.random() < .5: rbox('n_tank', CURB, (cx - sw * .2, cy + sl * .15, h + 2.6), (1.2, 1.2, 1.0), bev=.35, seg=3)
    for f in faces:
        if f in ('+x', '-x'):
            sgn = 1 if f == '+x' else -1; px = cx + sgn * (W / 2 + .02); a0, a1 = y0, y1; rz = -sgn * math.pi / 2
        else:
            sgn = 1 if f == '+y' else -1; py = cy + sgn * (L / 2 + .02); a0, a1 = x0, x1; rz = 0 if sgn < 0 else math.pi
        n = max(1, int((a1 - a0 - .6) / wstep)); sp = (a1 - a0) / n
        zz = 5.0
        while zz < h - 1.0:
            for k in range(n):
                a = a0 + sp * (k + .5)
                loc = (px, a, zz) if f in ('+x', '-x') else (a, py, zz)
                WINS.append((loc, rz))
                if balc and rr.random() < balc:
                    bl = (loc[0] + (math.cos(rz + math.pi / 2) * 0), loc[1], zz - .78)
                    off = Vector((math.sin(rz), -math.cos(rz), 0)) * .28
                    put(balM, 'i_bal', Vector(bl) + off, rz)
            zz += fl
        if shop and f == shop:
            n2 = max(1, int((a1 - a0) / 4.0)); sp2 = (a1 - a0) / n2
            for k in range(n2):
                a = a0 + sp2 * (k + .5); loc = (px, a, 1.45) if f in ('+x', '-x') else (a, py, 1.45)
                put(shopM, 'i_shop', loc, rz)
                off = Vector((math.sin(rz), -math.cos(rz), 0))
                o = rbox('n_awn', AWN[rr.randrange(5)], Vector(loc) + off * .75 + Vector((0, 0, 1.75)), (3.3, 1.3, .26), bev=.12, seg=2, rz=rz)
                o.rotation_euler = (math.radians(-16), 0, rz) if f in ('-y', '+y') else (0, 0, rz)
                if f in ('+x', '-x'): o.rotation_euler = (0, 0, rz); o.rotation_mode = 'ZXY'; o.rotation_euler = (math.radians(-16), 0, rz)
BW = 7.0   # building line (corner blocks)
BW2 = 9.3  # building line inside the street
# corner blocks facing the camera, as in the concept
for sgn in (-1, 1):
    xs = [BW, 11.2, 15.0, 19.5, 24.5, 30]; hs = [17.5, 15.5, 19, 13, 15] if sgn < 0 else [18.5, 14, 17, 12.5, 16]
    cs = [0, 2, 1, 5, 7] if sgn < 0 else [4, 3, 9, 6, 1]
    for j in range(5):
        x0, x1 = sorted((sgn * xs[j], sgn * xs[j + 1])); y0 = .6 + (j % 2) * .9
        tower(x0, x1, y0, 10 + j * .5, hs[j], cs[j], ['-y', '+y', '-x' if sgn > 0 or j == 4 else '+y', '+x' if sgn < 0 or j == 4 else '+y'][:4], shop='-y', seed=sgn * 10 + j, balc=.25 if j % 2 else 0)
# street blocks
y = 10.4; i = 0
for s in (-1, 1):
    y = 10.4; i = 0
    while y < 150:
        L = random.uniform(5.5, 9.5); h = random.uniform(9, 19) if y < 110 else random.uniform(12, 22)
        d = random.uniform(8, 12); st = random.choice((0, 0, .8, 1.6, 2.4)) if y > 14 else 0
        x0, x1 = (-BW2 - st - d, -BW2 - st) if s < 0 else (BW2 + st, BW2 + st + d)
        far = y > 60
        faces = ['+x' if s < 0 else '-x', '-x' if s < 0 else '+x', '-y'] + (['+y'] if not far else [])
        tower(x0, x1, y, y + L - .35, h, (i * 5 + (s > 0) * 3 + 1) % len(JEWEL), faces, shop=faces[0], seed=100 + i * 2 + (s > 0), wstep=1.35 if not far else 1.9, balc=.12)
        if not far or i % 2 == 0:
            for k in range(2 + (y < 70)):
                key = random.choice(NAMES); hh = random.uniform(2.2, 3.6) if RECTS[key][4] < 1 else random.uniform(1.1, 1.6)
                sign(key, (s * (BW2 + st - .55), y + 1.0 + k * L * .33, random.uniform(4.6, min(h - 2, 11))), hh)
            if not far and random.random() < .6:
                key = random.choice(NAMES); hh = 2.4 if RECTS[key][4] < 1 else 1.2
                sign(key, (s * (BW2 + st + .25), y + L * .5, random.uniform(5, min(h - 2, 10))), hh, -s * math.pi / 2, d=.3)
        y += L; i += 1

for x0, x1, yy0, yy1, hh, ci in ((-42, -31, -2, 12, 15, 7), (31, 42, -2, 12, 16, 9), (-30, -18, 12.5, 26, 10, 10), (18, 30, 12.5, 26, 11, 2)):
    tower(x0, x1, yy0, yy1, hh, ci, ['-y', '+y', '-x', '+x'], shop='-y', seed=int(x0 * 7 + hh))
# window instances (mesh: the near ones are full size)
for loc, rz in WINS: put(winM if loc[1] < 60 else winS, 'i_win', loc, rz)
# hero signs from the concept (flat on the corner buildings, facing the camera)
for key, x, z, h in (('izakaya', -9.6, 11.5, 4.6), ('hotel', -7.6, 9.1, 3.0), ('snack', -10.0, 7.25, 2.3), ('yakiniku', -8.2, 6.9, 2.5),
                     ('karaoke', 9.2, 10.65, 5.5), ('pachinko', 7.3, 8.1, 4.2), ('bar', 7.5, 4.7, 1.9), ('game', 9.4, 4.15, 1.5), ('s1', -12.5, 4.3, .9), ('s2', -10.4, 4.3, .8)):
    sign(key, (x, .1, z), h, 0, d=.42)
# sides/backs of the corner blocks get signs too
for key, x, y_, z, h in (('v0', -19.3, 5, 9, 3.4), ('v5', 19.3, 5, 9, 3.4), ('v3', -BW + .55, 4, 13, 3.6), ('v1', BW - .55, 4, 13.5, 3.6)):
    sign(key, (x, y_, z), h, math.pi / 2)

# ---------------- street, curbs, lamps, base ----------------
rbox('g_base', BASE, (0, 68, -.9), (66, 196, 1.8), bev=.9, seg=4)
rbox('g_road', ROAD, (0, 68, .02), (9.2, 190, .1), bev=0, seg=1)
rbox('g_cross', ROAD, (0, -12, .021), (64, 12, .1), bev=0, seg=1)
for s in (-1, 1):
    rbox('g_walk', WALK, (s * (BW2 + 4.6) / 2, 78, .15), (BW2 - 4.6, 168, .3), bev=.08, seg=1)
    rbox('g_curb', CURB, (s * 4.6, 78, .2), (.32, 168, .4), bev=.12, seg=2)
    rbox('g_walk', WALK, (s * 18.5, -3.0, .15), (23, 6.0, .3), bev=.08, seg=1)
    rbox('g_curb', CURB, (s * 18.5, -6.0, .2), (23, .32, .4), bev=.12, seg=2)
    rbox('g_walk', WALK, (s * 5.8, -2.3, .15), (2.4, 7.4, .3), bev=.08, seg=1)
rbox('g_walk', WALK, (0, -19.5, .15), (64, 3.0, .3), bev=.08, seg=1)
for s in (-1, 1):
    for yy in list(range(5, 150, 9)):
        put(lampM, 'i_lamp', (s * 5.25, yy, .3))
    for xx in (11, 17, 23): put(lampM, 'i_lamp', (s * xx, -5.3, .3))
# clay clouds all around (for the 360 orbit)
cl = random.Random(5)
def cloud(bm, k):
    for j in range(4 + k % 2): sph_bm(bm, Vector((j * 4.2 - 7, cl.uniform(-1, 1), (j % 2) * 1.8)), 4 + (j % 2) * 1.6, 0, 2, (1, .6, .55))
for k, (x, y_, z) in enumerate([(-15, 62, 30), (13, 70, 32), (-3, 95, 27), (22, 90, 36), (-60, 60, 46), (60, 40, 50), (-50, -60, 44), (45, -70, 52), (0, -90, 58), (-70, 0, 40), (70, 100, 48)]):
    me = mesh_of(lambda bm: cloud(bm, k), 'cloudM%d' % k, [CLOUD]); put(me, 'c_cloud', (x, y_, z))

# ---------------- pedestrians ----------------
def person(bm, ci, girl):
    cyl_bm(bm, Vector((-.11, 0, .32)), .085, .64, 10, 3); cyl_bm(bm, Vector((.11, 0, .32)), .085, .64, 10, 3)
    cyl_bm(bm, Vector((0, 0, .98)), .26 if not girl else .34, .72, 16, 0, .08, .2)
    sph_bm(bm, Vector((0, 0, 1.33)), .14, 0, 1)
    cyl_bm(bm, Vector((-.29, 0, 1.0)), .07, .55, 8, 0); cyl_bm(bm, Vector((.29, 0, 1.0)), .07, .55, 8, 0)
    sph_bm(bm, Vector((0, 0, 1.62)), .25, 1, 2)
    sph_bm(bm, Vector((0, .04, 1.7)), .262, 2, 2, (1, 1, .82))
PEDS = []
for k in range(14):
    ci = k % len(CLOTH); girl = k % 3 == 1
    me = mesh_of(lambda bm: person(bm, ci, girl), 'pedM%d' % k, [CLOTH[ci], SKIN, HAIR, mat('legs', '#3a3540', .8)])
    side = (-1, 1)[k % 2]; x = side * random.uniform(.8, 4.0) if k < 8 else side * random.uniform(5.2, 6.4)
    yy = random.uniform(3, 40) if k < 10 else random.uniform(-8, -3)
    o = put(me, 'p_ped%d' % k, (x, yy, .02 if abs(x) < 4.6 else .3), math.pi if k % 4 == 0 else 0, 1.0); PEDS.append(o)

# ---------------- export ----------------
def join_group(prefix, name):
    os_ = [o for o in COL.objects if o.name.startswith(prefix) and o.type == 'MESH']
    groups = {}
    for o in os_: groups.setdefault(tuple(m.name for m in o.data.materials), []).append(o)
    out = []
    for key, g in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in g: o.select_set(True)
        bpy.context.view_layer.objects.active = g[0]
        if len(g) > 1: bpy.ops.object.join()
        g[0].name = name + '_' + '_'.join(key); out.append(g[0])
    return out
def make_empty(n):
    e = bpy.data.objects.new(n, None); COL.objects.link(e); return e
if EXP:
    for o in COL.objects:
        if o.type == 'MESH' and o.data.users > 1: continue
    # split near/far by y for the map version
    for o in list(COL.objects):
        if o.name.startswith('n_') and o.location.y > 36: o.name = 'f_' + o.name[2:]
    for o in list(COL.objects):
        if o.name.startswith('n_') and o.type == 'MESH':
            # bake transforms so joins are exact
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
            if o.data.users == 1: bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    E = {n: make_empty(n) for n in ('NEAR', 'FAR', 'GROUND', 'CLOUDS', 'PEDS', 'INST_NEAR', 'INST_FAR')}
    for pre, nm, par in (('n_', 'near', 'NEAR'), ('f_', 'far', 'FAR'), ('g_', 'gnd', 'GROUND'), ('c_', 'cl', 'CLOUDS')):
        for o in join_group(pre, nm): o.parent = E[par]
    for o in COL.objects:
        if o.name.startswith('p_'): o.parent = E['PEDS']
        elif o.name.startswith('i_'): o.parent = E['INST_NEAR' if o.location.y < 36 else 'INST_FAR']
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB', export_image_format='WEBP', export_image_quality=85,
                              export_apply=True, export_yup=True, export_gpu_instances=True, export_normals=True, export_texcoords=True)
    print('EXPORTED', OUT, 'objects', len(COL.objects), 'wins', len(WINS)); sys.exit(0)

# ---------------- render ----------------
cam = bpy.data.cameras.new('cam'); cam.lens = 38; cam.sensor_width = 36; co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
if MODE.startswith('orbit'):
    k = int(MODE[5:]); a = math.radians(-30 + 90 * k); R_ = 60
    co.location = (math.sin(a) * R_, -math.cos(a) * R_ + 8, 30); dvec = Vector((0, 8, 6)) - co.location
    co.rotation_euler = dvec.to_track_quat('-Z', 'Y').to_euler(); cam.lens = 28
else:
    co.location = (0, -22.5, 2.5); co.rotation_euler = (math.radians(101), 0, 0)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (*hexc('#1a1838' if NIGHT else '#a07890'), 1); bg.inputs[1].default_value = .35 if NIGHT else 1.6
# gradient sky via light path trick: camera rays see gradient, lighting sees flat colour
nt = w.node_tree; lp = nt.nodes.new('ShaderNodeLightPath'); mix = nt.nodes.new('ShaderNodeMixShader'); sk = nt.nodes.new('ShaderNodeBackground')
tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); cr = nt.nodes.new('ShaderNodeValToRGB')
nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], cr.inputs['Fac'])
cr.color_ramp.elements[0].position = .5; cr.color_ramp.elements[1].position = .62
cr.color_ramp.elements[0].color = (*hexc('#141634' if NIGHT else '#e39a86'), 1); cr.color_ramp.elements[1].color = (*hexc('#0a0b24' if NIGHT else '#5b4378'), 1)
nt.links.new(cr.outputs['Color'], sk.inputs['Color']); nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
nt.links.new(bg.outputs[0], mix.inputs[1]); nt.links.new(sk.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], nt.nodes['World Output'].inputs['Surface'])
sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = .12 if NIGHT else 3.2; sun.color = hexc('#9fb0ff' if NIGHT else '#ffcfb0'); sun.angle = .5
so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(52), 0, math.radians(-28))
if NIGHT:
    l = bpy.data.lights.new('g', 'AREA'); l.energy = 600; l.size = 12; l.color = hexc('#ff4040'); o = bpy.data.objects.new('g', l); o.location = (0, -3, 9); o.rotation_euler = (math.radians(90), 0, 0); sc.collection.objects.link(o)
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1024, 768; sc.render.filepath = OUT
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'; sc.view_settings.exposure = .55 if not NIGHT else .2
bpy.ops.render.render(write_still=True); print('RENDERED', OUT)
