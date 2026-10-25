# v11: full 360 clay diorama of our Imagine concept (ref/imagine_gate_*.png). Blender Z-up, street runs +Y, gate at y=0.
import bpy, bmesh, math, random, sys, os, json
from mathutils import Vector, Matrix
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = argv[0] if argv else 'day'          # day | night | export | orbitN (N=0..3)
OUT = argv[1] if len(argv) > 1 else '/tmp/x.png'
SAMPLES = int(argv[2]) if len(argv) > 2 else 40
SCENE = argv[3] if len(argv) > 3 else 'ichiban'
D = os.path.dirname(os.path.abspath(__file__)); DIO = os.path.join(D, '..', 'dio')
RECTS = json.load(open(os.path.join(DIO, 'rects.json')))
random.seed({'ichiban': 11, 'central': 23}.get(SCENE, 5))
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
NIGHT = MODE == 'night'; LOD = MODE == 'lod'; EXP = MODE in ('export', 'lod')
EM = 1.0 if EXP else (3.0 if NIGHT else .5)
def hexc(h): h = h.lstrip('#'); return tuple((int(h[i:i+2], 16) / 255) ** 2.2 for i in (0, 2, 4))
MATS = {}
def mat(name, col, rough=.85, em=None, ems=0., tex=None, grain=.15):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexc(col), 1); b.inputs['Roughness'].default_value = rough
    if tex and not EXP:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(DIO, tex)); nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if em is not None: nt.links.new(t.outputs['Color'], b.inputs['Emission Color'])
    elif em is not None and not tex: b.inputs['Emission Color'].default_value = (*hexc(em), 1)
    if em is not None: b.inputs['Emission Strength'].default_value = ems * EM
    if grain and not EXP:
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 30; n.inputs['Detail'].default_value = 8
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = grain; bp.inputs['Distance'].default_value = .02
        nt.links.new(n.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    MATS[name] = m; return m
COL = bpy.data.collections.new('ALL'); sc.collection.children.link(COL)
FARM = [False]
def put(me, name, loc=(0, 0, 0), rz=0, s=1):
    if FARM[0] and name[:2] in ('n_', 'i_'): name = ('f_' if name[0] == 'n' else 'j_') + name[2:]
    o = bpy.data.objects.new(name, me); o.location = loc; o.rotation_euler = (0, 0, rz); o.scale = (s, s, s) if isinstance(s, (int, float)) else s; COL.objects.link(o); return o
def bm_mesh(bm, name, mats):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    return me
def rbox_bm(bm, c, size, bev, seg, mi=0, rz=0):
    for v in bm.verts: v.tag = True
    r = bmesh.ops.create_cube(bm, size=1.0)['verts']
    for v in r: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])); v.tag = False
    if LOD and not GDET[0]: seg = 1; bev = bev if max(size) > 6 else 0  # small parts: plain boxes at map scale
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
    if LOD and not GDET[0]: verts = max(6, verts // 3); bev = 0
    g = bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r2 if r2 is not None else r, depth=h, matrix=Matrix.Translation(c))
    vs = g['verts']
    if bev:
        es = [e for e in {e for v in vs for e in v.link_edges} if e.calc_face_angle(0) > .6]
        bmesh.ops.bevel(bm, geom=es, offset=bev, segments=2, affect='EDGES')
    for f in {f for v in bm.verts for f in v.link_faces if not v.tag}: f.material_index = mi; f.smooth = True
    for v in bm.verts: v.tag = True
def sph_bm(bm, c, r, mi=0, sub=2, scl=(1, 1, 1)):
    if LOD and not GDET[0]: sub = 1
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
STONE = mat('post', '#c2c0bb', .95, grain=.5)
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

GDET = [False]
def build_gate(RED, GKEY):
    GDET[0] = True  # v20: gate keeps full-res geometry in the map LOD
    # ---------------- gate ----------------
    S = 5.8; TR = .68; TOP = 11.0; R = 2.0; LB = 6.85; RI = 1.05
    def arc(cx, cz, r, a0, a1, n=12): return [(cx + math.cos(a0 + (a1 - a0) * k / n) * r, cz + math.sin(a0 + (a1 - a0) * k / n) * r) for k in range(n + 1)]
    loop = [(-S, 3.7), (-S, TOP - R)] + arc(-S + R, TOP - R, R, math.pi, math.pi / 2)[1:] + [(-S + R + (2 * S - 2 * R) * k / 8, TOP + .12 * math.sin(math.pi * k / 8)) for k in range(1, 8)] + arc(S - R, TOP - R, R, math.pi / 2, 0) + [(S, 3.7)]
    low = arc(-S + RI, LB + RI, RI, math.pi, 1.5 * math.pi, 7) + [(-S + RI + (2 * S - 2 * RI) * k / 12, LB - .22 * math.sin(math.pi * k / 12)) for k in range(1, 12)] + arc(S - RI, LB + RI, RI, 1.5 * math.pi, 2 * math.pi, 7)
    def tube(pts, name, TR=TR, RED=RED):
        cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = TR; cu.bevel_resolution = 4 if LOD else 6; cu.use_fill_caps = True
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
    g = RECTS[GKEY]; u0, v0, u1, v1 = g[:4]; m = .012
    quad('n_gateSign', SIGNF, (0, -.76, SZ), SW - .1, SH - .05, 0, (u0 + m * .3, v0 + m, u1 - m * .3, v1 - m))
    quad('n_gateSignB', SIGNF, (0, .76, SZ), SW - .1, SH - .05, math.pi, (u0 + m * .3, v0 + m, u1 - m * .3, v1 - m))
    FR = mat('signFrame', '#efe4d0', .8, grain=.35)  # v22: cream clay rim like the concept
    for fy in (-.78, .78):  # v20: raised frame around both sign faces (depth + edge)
        rbox('n_sfT', FR, (0, fy, SZ + SH / 2 + .02), (SW + .1, .1, .14), bev=.04, seg=2); rbox('n_sfB', FR, (0, fy, SZ - SH / 2 - .02), (SW + .1, .1, .14), bev=.04, seg=2)
        for sx in (-1, 1): rbox('n_sfS', FR, (sx * (SW / 2 + .02), fy, SZ), (.14, .1, SH + .18), bev=.04, seg=2)
    for s_ in (-1, 1):  # v20: pillar plinth + ring mouldings
        rbox('n_plinth', STONE, (s_ * S, 0, .09), (2.9, 2.9, .18), bev=.06, seg=2)
        for zz in (1.15, 3.05): me = mesh_of(lambda bm, zz=zz: cyl_bm(bm, Vector((0, 0, zz)), .98, .08, 32, 0, .03), 'ring', [CURB]); put(me, 'n_pring', (s_ * S, 0, 0))
    GDET[0] = False
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
def shopfront(bm):  # v29: concept shopfront – wood door + two mullioned display windows + sill, instead of one flat glowing slab
    rbox_bm(bm, Vector((0, 0, 0)), (3.0, .35, 2.3), .05, 2, 0)
    rbox_bm(bm, Vector((-.98, -.2, -.12)), (.78, .08, 1.96), .03, 1, 2)
    rbox_bm(bm, Vector((-.98, -.25, .45)), (.44, .04, .5), .02, 1, 1)
    for x in (.05, .98):
        rbox_bm(bm, Vector((x, -.2, .18)), (.84, .06, 1.38), .02, 1, 1)
        rbox_bm(bm, Vector((x, -.24, .18)), (.06, .05, 1.38), 0, 1, 0)
        rbox_bm(bm, Vector((x, -.24, .42)), (.84, .05, .05), 0, 1, 0)
    rbox_bm(bm, Vector((.52, -.3, -.56)), (1.95, .2, .1), .03, 1, 3)
    rbox_bm(bm, Vector((0, -.22, 1.02)), (2.9, .1, .22), .03, 1, 3)
    for f in bm.faces: f.smooth = True
shopM = mesh_of(shopfront, 'shopM', [FRAME, SHOPG, DOOR, CURB])
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
NAMES = [k for k in RECTS if not k.startswith('gate') and k != 'toho']
NAMES2 = [k for k in NAMES if k[0] in 'vw'] + ['izakaya', 'hotel', 'karaoke', 'pachinko', 'yakiniku', 'snack']
def sign(key, c, h, rz=0, back=None, d=.38, bodyc=SBACK):
    r = RECTS[key]; w = h * r[4]
    if LOD and SCENE == 'central': return w  # v16: map LOD has no stand-in buildings, so their wall signs would float
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
def tower(x0, x1, y0, y1, h, ci, faces, shop=None, seed=0, wstep=1.35, fl=2.1, balc=0., mb=None, ml=None, small=None, wsc=1.0):
    rr = random.Random(seed); MB = mb or BLD[ci]; ML = ml or LEDGE[ci]
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; W, L = x1 - x0, y1 - y0
    rbox('n_bld', MB, (cx, cy, h / 2), (W, L, h), bev=.55, seg=3)
    # ledges every few floors + roof setbacks
    z = 3.6
    rbox('n_ledge', ML, (cx, cy, z), (W + .4, L + .4, .32), bev=.15, seg=2)
    if h > 11: rbox('n_ledge', ML, (cx, cy, 3.6 + fl * (int((h - 4) / fl) // 2 + 1) - .9), (W + .3, L + .3, .26), bev=.12, seg=2)
    rbox('n_cap', ML, (cx, cy, h + .15), (W + .3, L + .3, .4), bev=.18, seg=2)
    if rr.random() < .7:
        sw, sl = W * rr.uniform(.45, .7), L * rr.uniform(.4, .7); rbox('n_set', MB, (cx + rr.uniform(-.1, .1) * W, cy, h + 1.1), (sw, sl, 2.0), bev=.4, seg=3)
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
                WINS.append((loc, rz, FARM[0], small if small is not None else loc[1] >= 60, wsc))
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
CLOUDS_STREET = [(-15, 62, 30), (13, 70, 32), (-3, 95, 27), (22, 90, 36), (-60, 60, 46), (60, 40, 50), (-50, -60, 44), (45, -70, 52), (0, -90, 58), (-70, 0, 40), (70, 100, 48)]
def clouds(pts, sc=1.0):
    cl = random.Random(5)
    def cloud(bm, k):
        for j in range(4 + k % 2): sph_bm(bm, Vector(((j * 4.2 - 7) * sc, cl.uniform(-1, 1), (j % 2) * 1.8 * sc)), (4 + (j % 2) * 1.6) * sc, 0, 2, (1, .6, .55))
    for k, p in enumerate(pts):
        me = mesh_of(lambda bm: cloud(bm, k), 'cloudM%d' % k, [CLOUD]); put(me, 'c_cloud', p)
def person(bm, ci, girl):
    cyl_bm(bm, Vector((-.11, 0, .32)), .085, .64, 10, 3); cyl_bm(bm, Vector((.11, 0, .32)), .085, .64, 10, 3)
    cyl_bm(bm, Vector((0, 0, .98)), .26 if not girl else .34, .72, 16, 0, .08, .2)
    sph_bm(bm, Vector((0, 0, 1.33)), .14, 0, 1)
    cyl_bm(bm, Vector((-.29, 0, 1.0)), .07, .55, 8, 0); cyl_bm(bm, Vector((.29, 0, 1.0)), .07, .55, 8, 0)
    sph_bm(bm, Vector((0, 0, 1.62)), .25, 1, 2)
    sph_bm(bm, Vector((0, .04, 1.7)), .262, 2, 2, (1, 1, .82))
PEDS = []
def peds(boxes, seed=0, s=1.0):
    rr = random.Random(seed + 77)
    for k, (lo, hi) in enumerate(boxes):
        ci = k % len(CLOTH); girl = k % 3 == 1
        g0 = GDET[0]; GDET[0] = True  # v29: clay people keep smooth heads/bodies in the map LOD
        me = mesh_of(lambda bm: person(bm, ci, girl), 'pedM%d' % k, [CLOTH[ci], SKIN, HAIR, mat('legs', '#3a3540', .8)]); GDET[0] = g0
        x = rr.uniform(lo[0], hi[0]); yy = rr.uniform(lo[1], hi[1])
        if lo[0] < -4.5 and hi[0] > 4.5 and lo[0] < -6: x = rr.choice((-1, 1)) * rr.uniform(5.2, 6.4)
        o = put(me, 'p_ped%d' % k, (x, yy, lo[2]), math.pi if k % 4 == 0 else 0, s); PEDS.append(o)
def gate_street():
    BW = 7.0   # building line (corner blocks)
    BW2 = 8.4  # building line inside the street
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
            d = random.uniform(8, 12); st = random.choice((0, 0, 0, .5, 1.0)) if y > 14 else 0
            x0, x1 = (-BW2 - st - d, -BW2 - st) if s < 0 else (BW2 + st, BW2 + st + d)
            far = y > 60
            faces = ['+x' if s < 0 else '-x', '-x' if s < 0 else '+x', '-y'] + (['+y'] if not far else [])
            tower(x0, x1, y, y + L - .35, h, (i * 5 + (s > 0) * 3 + 1) % len(JEWEL), faces, shop=faces[0], seed=100 + i * 2 + (s > 0), wstep=1.35 if not far else 1.9, balc=.12)
            if not far or i % 2 == 0:
                for k in range(3 + (y < 70)):
                    key = random.choice(NAMES2); hh = random.uniform(2.2, 3.6) if RECTS[key][4] < 1 else random.uniform(1.1, 1.6)
                    sign(key, (s * (BW2 + st - .55), y + .8 + k * L * .26, random.uniform(4.6, min(h - 2, 11))), hh)
                if not far and random.random() < .85:
                    key = random.choice(NAMES2); hh = 2.4 if RECTS[key][4] < 1 else 1.2
                    sign(key, (s * (BW2 + st + .25), y + L * .5, random.uniform(5, min(h - 2, 10))), hh, -s * math.pi / 2, d=.3)
            y += L; i += 1

    for x0, x1, yy0, yy1, hh, ci in ((-42, -31, -2, 12, 15, 7), (31, 42, -2, 12, 16, 9), (-30, -18, 12.5, 26, 10, 10), (18, 30, 12.5, 26, 11, 2)):
        tower(x0, x1, yy0, yy1, hh, ci, ['-y', '+y', '-x', '+x'], shop='-y', seed=int(x0 * 7 + hh))
    # window instances (mesh: the near ones are full size)
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
        for xx in (17, 23): put(lampM, 'i_lamp', (s * xx, -5.3, .3))  # v22: no lamp right in front of the gate view
    clouds(CLOUDS_STREET); peds([((-4.0, 3, .02), (4.0, 40, .02))] * 10 + [((-6.4, -8, .3), (6.4, -3, .3))] * 4, 0)

# ---------------- v12: more landmarks (same clay kit) ----------------
BLUE = mat('gateBlue', '#2f63c8', .5, em='#3070ff', ems=.12)
TGLASS = mat('towerGlass', '#7aa6cf', .3, em='#a8d4ff', ems=.05, grain=.05)
TWHITE = mat('towerWhite', '#e8ebee', .8)
GZG = mat('gzGreen', '#4f9a3c', .85, grain=.4); GZB = mat('gzBelly', '#c4d47a', .85); GZS = mat('gzSpike', '#b9d65a', .8)
EYE = mat('gzEye', '#ffd23a', .4, em='#ffcc20', ems=.6, grain=0); PUPIL = mat('pupil', '#151515', .4, grain=0)
MOUTH = mat('mouth', '#c0404a', .6); TEETH = mat('teeth', '#f4efe0', .6)
TOHO = mat('tohoStone', '#a69680', .92, grain=.35); TOHOL = mat('tohoLedge', '#857764', .92)
SLIGHT = mat('signLight', '#fbe7b0', .5, em='#ffe1a0', ems=.8, grain=0)
WOOD = [mat('wood%d' % i, c, .9, grain=.4) for i, c in enumerate(['#7a5236', '#6a4630', '#8a5e3c', '#5e3e2a'])]
TILE = mat('roofTile', '#55545f', .85); VERM = mat('vermilion', '#e8412a', .7); BLACK = mat('toriiBlack', '#2a2626', .8)
STONE2 = mat('stoneL', '#b8b2a8', .95, grain=.5); WALLW = mat('wallWhite', '#efe8da', .9)
LEAF = mat('leaf', '#4f8f4a', .95, grain=.4); TRUNK = mat('trunk', '#6e4a34', .9); PAVE = mat('pave', '#b8aa9c', .9, grain=.35)
WATER = mat('water', '#8fc8e8', .1, em='#9fd8ff', ems=.2, grain=0); WIRE = mat('wire', '#2a2a30', .6)
LRED = mat('lanternRed', '#ff5a3d', .4, em='#ff4a2a', ems=2.0, grain=0)
def tube3(pts, name, r, m, res=6):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 1 if LOD else 3; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for p, c in zip(sp.bezier_points, pts): p.co = c; p.handle_left_type = p.handle_right_type = 'AUTO'
    cu.resolution_u = res
    if FARM[0] and name.startswith('n_'): name = 'f_' + name[2:]
    o = bpy.data.objects.new(name, cu); COL.objects.link(o); cu.materials.append(m)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False)
    for p in o.data.polygons: p.use_smooth = True
    return o
def cyl(name, m, c, r, h, verts=20, bev=0, r2=None, rot=None):
    me = mesh_of(lambda bm: cyl_bm(bm, Vector((0, 0, 0)), r, h, verts, 0, bev, r2), name, [m]); o = put(me, name, c)
    if rot: o.rotation_euler = rot
    return o
def sph(name, m, c, r, scl=(1, 1, 1), sub=2):
    me = mesh_of(lambda bm: sph_bm(bm, Vector((0, 0, 0)), r, 0, sub, scl), name, [m]); return put(me, name, c)
def ground(cx, cy, W, L, m=None):
    rbox('g_base', BASE, (cx, cy, -.9), (W, L, 1.8), bev=.9, seg=4)
    if m: rbox('g_pave', m, (cx, cy, .1), (W - 1.5, L - 1.5, .2), bev=.05, seg=1)
treeM = None
def tree(x, y, s=1.0, pre='n_'):
    cyl(pre + 'trunk', TRUNK, (x, y, 1.4 * s), .32 * s, 2.8 * s, 10, .05)
    rr = random.Random(int(x * 13 + y * 7))
    for k in range(5):
        sph(pre + 'leaf', LEAF, (x + rr.uniform(-1, 1) * s, y + rr.uniform(-1, 1) * s, (3.6 + rr.uniform(0, 1.6)) * s), (1.4 + rr.uniform(0, .6)) * s, sub=2)
def ring(cx, cy, R, H0, H1, n, seed, faces=('-y', '+y', '-x', '+x'), gap=None):
    """jewel clay blocks around a hero (all far = diorama only)"""
    rr = random.Random(seed); FARM[0] = True
    for k in range(n):
        a = 2 * math.pi * k / n
        if gap and abs(((a - gap[0] + math.pi) % (2 * math.pi)) - math.pi) < gap[1]: continue
        x, y = cx + math.sin(a) * R, cy - math.cos(a) * R; w = rr.uniform(8, 12); d = rr.uniform(8, 12); h = rr.uniform(H0, H1)
        tower(x - w / 2, x + w / 2, y - d / 2, y + d / 2, h, rr.randrange(12), list(faces), shop=None, seed=seed + k, wstep=1.9, small=True)
        if rr.random() < .7:
            key = rr.choice(NAMES2); ang = a + math.pi
            sign(key, (x - math.sin(a) * (d / 2 + .3), y + math.cos(a) * (d / 2 + .3), rr.uniform(5, max(5.5, h - 3))), 2.6 if RECTS[key][4] < 1.2 else 1.6, -a + math.pi * 0, d=.3)
    FARM[0] = False

def build_tokyu(ox=0, oy=0, k=1.0):
    P = lambda x, y, z: (ox + x * k, oy + y * k, z * k)
    rbox('n_tk', TGLASS, P(0, 0, 11), (54 * k, 38 * k, 22 * k), bev=2.5 * k, seg=3)
    for z in (.8, 7.6, 14.6, 21.8):
        rbox('n_tkw', TWHITE, P(0, 0, z), (57 * k, 41 * k, 1.6 * k), bev=.7 * k, seg=3)
    for z in (4.2, 11.2, 18.2):
        for f, (nx, ny, L) in {'-y': (0, -1, 54), '+y': (0, 1, 54), '-x': (-1, 0, 38), '+x': (1, 0, 38)}.items():
            n = int(L / 3.2)
            for j in range(n):
                a = -L / 2 + (j + .5) * L / n
                loc = P(a, ny * 19.1, z) if ny else P(nx * 27.1, a, z)
                rz = 0 if ny < 0 else math.pi if ny > 0 else (-nx * math.pi / 2)
                if k >= .99: WINS.append((loc, rz, FARM[0], False, 1.6))
    rbox('n_tkc', TWHITE, P(0, -23, 9), (26 * k, 9 * k, 1.8 * k), bev=.8 * k, seg=3)
    for s_ in (-1, 1): cyl('n_tkp', TWHITE, P(s_ * 11, -26, 4.2), 1.0 * k, 8.4 * k, 16, .2 * k)
    if k >= .99:
        for j in range(5): put(shopM, 'i_shop', P(-12 + j * 6, -19.25, 2.2), 0, (1.3, 1, 1.25))
    N = 10; z0, z1 = 22, 126
    for i in range(N):
        za, zb = z0 + (z1 - z0) * i / N, z0 + (z1 - z0) * (i + 1) / N; t = (i + .5) / N
        w, d = 30 - 13 * t, 22 - 8 * t
        rbox('n_tks', TGLASS, P(0, 2, (za + zb) / 2), (w * k, d * k, (zb - za + .2) * k), bev=2.4 * k, seg=3)
        for z in (za + 3.5, za + 7):
            rbox('n_tkb', TWHITE, P(0, 2, z), ((w + .5) * k, (d + .5) * k, .45 * k), bev=.2 * k, seg=2)
        for j in range(-2, 3):
            rbox('n_tkm', TWHITE, P(j * w / 6, 2 - d / 2 - .1, (za + zb) / 2), (.35 * k, .5 * k, (zb - za) * k), bev=.12 * k, seg=1)
    for s_ in (-1, 1):  # sweeping white ribs on the front corners (concept)
        tube3([P(s_ * 26, -21, 22.5), P(s_ * 15, -10, 30), P(s_ * 13.5, -8.5, 70), P(s_ * 9, -4.5, 128), P(s_ * 4, -1, 136)], 'n_rib', 1.6 * k, TWHITE)
        tube3([P(s_ * 26, 21, 22.5), P(s_ * 15, 13, 30), P(s_ * 13.5, 12, 70), P(s_ * 9, 8.5, 126)], 'n_rib', 1.3 * k, TWHITE)
    tube3([P(0, -20, 22.5), P(0, -9.5, 34), P(0, -8.6, 80)], 'n_rib', 1.2 * k, TWHITE)
    for j in range(7):  # fountain-splash crown
        a = -math.pi / 2 + (j - 3) * .42; dx, dy = math.cos(a), math.sin(a) * .55 + .2
        pts = [P(0, 2, 124), P(dx * 2.5, 2 + dy * 2.5, 133), P(dx * 5.5, 2 + dy * 5.5, 140 - abs(j - 3) * 1.5), P(dx * 7.5, 2 + dy * 7.5, 139 - abs(j - 3) * 2.5)]
        tube3(pts, 'n_fin', (1.1 - abs(j - 3) * .08) * k, TWHITE); sph('n_fin', TWHITE, pts[-1], 1.45 * k)
    tube3([P(0, 2, 120), P(0, 2, 138), P(0, 2, 150)], 'n_fin', 1.5 * k, TWHITE); sph('n_fin', TWHITE, P(0, 2, 150), 1.9 * k)

def godzilla(ox, oy, oz, S=1.0):
    G = lambda x, y, z: (ox + x * S, oy + y * S, oz + z * S)
    sph('n_gz', GZG, G(0, 3, 1.5), 6.5 * S, (1.35, 1.0, .75))
    sph('n_gz', GZG, G(0, -1, 6), 4.8 * S, (1.05, 1.0, 1.0))
    sph('n_gz', GZG, G(0, -3.5, 9.5), 5.0 * S, (1.0, 1.15, .78))
    sph('n_gz', GZG, G(0, -8.6, 8.6), 3.7 * S, (1.1, 1.35, .62))
    sph('n_gz', GZB, G(0, -8.2, 5.4), 3.3 * S, (1.05, 1.25, .42))
    sph('n_gz', MOUTH, G(0, -9.2, 6.7), 2.7 * S, (.95, 1.05, .36))
    for j in range(6):
        for s_ in (-1, 1):
            cyl('n_gzt', TEETH, G(s_ * (.5 + j * .42), -11.6 + j * .55, 7.75), .26 * S, .8 * S, 6, 0, .02 * S, rot=(math.pi, 0, 0))
    for s_ in (-1, 1):
        sph('n_gze', EYE, G(s_ * 2.7, -6.6, 11.3), 1.65 * S); sph('n_gzp', PUPIL, G(s_ * 2.85, -8.1, 11.3), .7 * S, (.55, .5, 1.35))
        sph('n_gz', GZG, G(s_ * 2.7, -6.4, 12.9), 1.4 * S, (1.5, .9, .55))
        sph('n_gz', PUPIL, G(s_ * 1.0, -12.4, 9.6), .28 * S)
        tube3([G(s_ * 6.5, 0, 3), G(s_ * 7.5, -3.5, 2.2), G(s_ * 7.2, -6.0, .6)], 'n_gz', 1.7 * S, GZG)
        sph('n_gz', GZG, G(s_ * 7.2, -6.6, .3), 1.9 * S, (1.1, 1, .7))
        for c in (-1, 0, 1): cyl('n_gzt', TEETH, G(s_ * 7.2 + c * .9, -8.2, -.5), .3 * S, 1.2 * S, 6, 0, .02 * S, rot=(math.radians(150), 0, 0))
    for j in range(7):
        cyl('n_gzs', GZS, G(0, 1 + j * 2.0, 14.5 - j * 1.6), (1.6 - j * .12) * S, (3.6 - j * .3) * S, 5, 0, .05 * S, rot=(math.radians(-25), 0, 0))
        for s_ in (-1, 1): cyl('n_gzs', GZS, G(s_ * 1.6, 2 + j * 2.0, 13.4 - j * 1.6), (1.0 - j * .08) * S, (2.4 - j * .2) * S, 5, 0, .04 * S, rot=(math.radians(-25), s_ * .35, 0))
    tube3([G(4, 7, 0), G(9, 13, 1), G(6, 18, 2.5), G(2, 20, 4)], 'n_gz', 2.2 * S, GZG)

def build_toho():
    FARM[0] = True
    tower(-24, 24, -20, 20, 28, 0, ['-y', '+y', '-x', '+x'], shop='-y', seed=4, wstep=3.4, fl=3.6, mb=TOHO, ml=TOHOL, wsc=2.0)
    rbox('n_tsb', SBACK, (9, -20.35, 15.5), (6.4, .8, 15.4), bev=.5, seg=3); sign('toho', (9, -20.9, 15.5), 14.6, 0, d=.3)  # our Imagine sign (ref/imagine_toho_sign.jpg)
    for x in (-15, 15):
        rbox('n_awn', AWN[0 if x < 0 else 4], (x, -21.6, 4.3), (8, 2.6, .35), bev=.15, seg=2).rotation_euler = (math.radians(-16), 0, 0)
    FARM[0] = False
    godzilla(0, -15.5, 28.2, 1.9)
    rbox('g_road', ROAD, (0, -32, .02), (90, 12, .1), bev=0, seg=1)
    for s_ in (-1, 1): rbox('g_walk', WALK, (0, -32 + s_ * 7.6, .15), (90, 3.2, .3), bev=.08, seg=1)
    for xx in range(-36, 40, 12): put(lampM, 'i_lamp', (xx, -24.5, .3))
    ring(0, 2, 44, 14, 30, 14, 31, gap=(0, .55))
    ground(0, 0, 100, 100, None)
    clouds([(-30, 20, 55), (30, 10, 60), (0, 60, 50), (-60, -40, 45), (55, -50, 50), (0, -70, 62)], 1.3)
    peds([((-30, -36.5, .02), (30, -27.5, .02))] * 6 + [((-30, -24.2, .3), (30, -23.2, .3))] * 6, 3)

def build_tokyu_scene():
    build_tokyu()
    rbox('g_plaza', PAVE, (0, -45, .1), (64, 44, .2), bev=.05, seg=1)
    FARM[0] = True
    for x in (-24, -12, 12, 24): tree(x, -36, 1.1, 'f_')
    FARM[0] = False
    for x in (-18, -6, 6, 18): put(lampM, 'i_lamp', (x, -32, .2))
    ring(0, -6, 62, 12, 34, 18, 51, gap=(0, .5))
    ground(0, -10, 150, 150, None)
    clouds([(-45, 10, 80), (45, 0, 95), (-20, 40, 110), (30, 60, 70), (-70, -60, 60), (65, -70, 75)], 2.0)
    peds([((-22, -58, .2), (22, -30, .2))] * 10, 5)

def build_plaza():
    rbox('n_pz', PAVE, (0, 0, .1), (56, 44, .2), bev=.05, seg=1)
    cyl('n_fnt', STONE2, (0, 0, .45), 5.2, .7, 32, .15); cyl('n_fntw', WATER, (0, 0, .82), 4.6, .1, 32)
    cyl('n_fnt', STONE2, (0, 0, 1.6), .9, 2.2, 16, .1); cyl('n_fnt', STONE2, (0, 0, 2.8), 2.2, .35, 24, .1); cyl('n_fntw', WATER, (0, 0, 3.0), 1.9, .08, 24)
    cyl('n_fnt', STONE2, (0, 0, 3.7), .5, 1.6, 12, .1); sph('n_fnt', STONE2, (0, 0, 4.7), .6)
    for x, y in ((-14, -10), (14, -10), (-14, 8), (14, 8), (-6, -16), (6, -16), (-22, 0), (22, 0)):
        cyl('n_plan', STONE2, (x, y, .5), 1.6, 1.0, 20, .2); tree(x, y, .8)
    for x, y, r in ((-9, -4, .3), (9, -4, -.3), (0, 11, 0)):
        rbox('n_bench', WOOD[2], (x, y, .6), (3.6, .9, .25), bev=.1, seg=2, rz=r); rbox('n_bench', WOOD[3], (x, y, .3), (3.0, .6, .5), bev=.1, seg=2, rz=r)
    for x, y in ((-20, -14), (20, -14), (-20, 14), (20, 14), (-8, 18), (8, 18)): put(lampM, 'i_lamp', (x, y, .2))
    rr = random.Random(9); FARM[0] = True  # surrounding blocks: diorama only (the map has the real OSM blocks)
    for side, (x0, x1, y0, y1, faces) in enumerate([(-50, -30, -22, 26, ['+x', '-y']), (30, 50, -22, 26, ['-x', '-y']), (-30, 30, 24, 40, ['-y'])]):
        if side < 2:
            y = y0
            while y < y1:
                L = rr.uniform(7, 10); h = rr.uniform(12, 24); xa = x0 + (2 if side == 0 else 0) * rr.random(); xb = x1 - (2 if side == 1 else 0) * rr.random()
                tower(xa, xb, y, y + L - .4, h, rr.randrange(12), faces, shop=faces[0], seed=200 + int(y) + side, balc=.15)
                key = rr.choice(NAMES2); sign(key, ((xb + .3) if side == 0 else (xa - .3), y + L / 2, rr.uniform(5, min(h - 2, 12))), 2.8 if RECTS[key][4] < 1.2 else 1.6, -math.pi / 2 if side == 0 else math.pi / 2, d=.35)
                y += L
        else:
            x = x0
            while x < x1:
                L = rr.uniform(7, 10); h = rr.uniform(10, 20)
                tower(x, x + L - .4, y0, y1, h, rr.randrange(12), faces, shop='-y', seed=300 + int(x), balc=.15)
                key = rr.choice(NAMES2); sign(key, (x + L / 2, y0 - .3, rr.uniform(5, min(h - 2, 11))), 2.8 if RECTS[key][4] < 1.2 else 1.6, 0, d=.35)
                x += L
    build_tokyu(0, 95, .5); FARM[0] = False
    ground(0, 20, 110, 150, None)
    clouds([(-30, 60, 60), (30, 70, 70), (0, 120, 80), (-60, -10, 50), (60, -20, 55)], 1.4)
    peds([((-24, -20, .2), (24, 20, .2))] * 14, 7)

def shack(x, y, side, rr):
    """Golden Gai two-storey bar shack, front facing the alley (side=-1: front faces -x)."""
    W = rr.uniform(2.6, 3.4); wm = WOOD[rr.randrange(4)]; h1 = rr.uniform(3.0, 3.4); h2 = rr.uniform(2.6, 3.0)
    f = -side
    rbox('n_gg', wm, (x, y, h1 / 2), (4.2, W - .12, h1), bev=.18, seg=2)
    rbox('n_gg', wm, (x + f * .35, y, h1 + h2 / 2), (4.2, W - .12, h2), bev=.18, seg=2)
    o = rbox('n_ggr', TILE, (x + f * 2.0, y, h1 + .1), (1.5, W + .1, .22), bev=.08, seg=2); o.rotation_euler = (0, f * math.radians(18), 0)
    rbox('n_ggr', TILE, (x + f * .3, y, h1 + h2 + .2), (4.8, W + .25, .35), bev=.12, seg=2)
    rbox('n_ggd', DOOR, (x + f * 2.12, y + rr.uniform(-.3, .3), 1.05), (.12, 1.0, 2.0), bev=.04, seg=1)
    put(winM, 'i_win', (x + f * 2.47, y, h1 + 1.4), -f * math.pi / 2)
    lm = LRED if rr.random() < .6 else LANT
    sph('n_ggl', lm, (x + f * 2.5, y + W * .32, h1 - .55), .32, (1, 1, 1.35), 1)
    if rr.random() < .8:
        key = rr.choice(NAMES2); r = RECTS[key]; hh = .9 if r[4] < 1.2 else .55; zz_ = rr.uniform(0, 1.2)
        if not LOD: sign(key, (x + f * 2.6, y - W * .25, h1 + .55 + zz_), hh, -f * math.pi / 2 + math.pi, d=.18)
    return W
def build_goldengai():
    rr = random.Random(12)
    for ax in (-11, 0, 11):  # three parallel alleys
        rbox('g_alley', ROAD, (ax, 30, .03), (2.6, 74, .06), bev=0, seg=1)
        for side in (-1, 1):
            y = -4
            while y < 64:
                W = shack(ax + side * 3.4, y, side, rr); y += W
        for y in range(2, 62, 7):  # overhead wires with sag
            tube3([(ax - 3.2, y, 6.8), (ax, y + .6, 6.0), (ax + 3.2, y + 1.2, 6.8)], 'n_wire', .05, WIRE, 4)
        for y in range(-2, 64, 14):
            cyl('n_pole', WOOD[3], (ax + 1.45, y, 3.8), .16, 7.6, 8)
    ground(0, 30, 40, 80, None)
    clouds([(-15, 70, 26), (15, 60, 30), (0, 95, 34), (-35, 10, 30), (35, 0, 32)], 1.0)
    peds([((-.7, 2, .06), (.7, 30, .06))] * 5 + [((-11.7, 2, .06), (-10.3, 40, .06))] * 2 + [((10.3, 2, .06), (11.7, 40, .06))] * 2, 9)

def stone_lantern(x, y):
    cyl('n_stl', STONE2, (x, y, .3), .9, .6, 6, .08); cyl('n_stl', STONE2, (x, y, 1.6), .32, 2.0, 12, .05)
    rbox('n_stl', STONE2, (x, y, 2.9), (1.4, 1.4, .3), bev=.1, seg=2); rbox('n_stlw', LANT, (x, y, 3.45), (.9, .9, .8), bev=.12, seg=2)
    cyl('n_stl', STONE2, (x, y, 4.15), 1.25, .6, 6, .05, .3); sph('n_stl', STONE2, (x, y, 4.6), .3, sub=1)
def build_hanazono():
    for s_ in (-1, 1):  # torii
        cyl('n_tor', VERM, (s_ * 3.6, 0, 4.4), .58, 8.8, 20, .08, .5); cyl('n_tor', BLACK, (s_ * 3.6, 0, .4), .78, .8, 20, .1)
    rbox('n_tor', VERM, (0, 0, 6.5), (10.4, .55, .75), bev=.18, seg=2); rbox('n_tor', VERM, (0, 0, 8.25), (11.6, .8, .7), bev=.2, seg=2)
    rbox('n_tor', VERM, (0, 0, 7.4), (.9, .5, 1.6), bev=.12, seg=2)
    tube3([(-6.9, 0, 9.25), (-4, 0, 8.85), (0, 0, 8.75), (4, 0, 8.85), (6.9, 0, 9.25)], 'n_tor', .5, BLACK)
    for s_ in (-1, 1): sph('n_tor', BLACK, (s_ * 6.9, 0, 9.3), .55)
    rbox('n_path', STONE2, (0, 20, .12), (4.6, 46, .24), bev=.1, seg=2)
    for y in (4, 16, 28):
        for s_ in (-1, 1): stone_lantern(s_ * 5.2, y)
    # hall
    rbox('n_hall', STONE2, (0, 46, .8), (20, 14, 1.6), bev=.3, seg=2)
    for j in range(4): rbox('n_hall', STONE2, (0, 38.4 - j * .5, .2 + j * .4), (8, 1.0, .4), bev=.08, seg=1)
    rbox('n_hallw', WALLW, (0, 46.5, 4.0), (14, 9, 4.8), bev=.25, seg=2)
    rbox('n_hallr', VERM, (0, 41.6, 4.2), (15, .5, .5), bev=.12, seg=2); rbox('n_hallr', VERM, (0, 41.6, 6.3), (15.6, .6, .6), bev=.12, seg=2)
    for x in (-7, -3.5, 0, 3.5, 7):
        for y in (41.4, 51.4): cyl('n_hallp', VERM, (x, y, 4.0), .34, 4.8, 12, .05)
    for x in (-5.2, 5.2): rbox('n_hallp', VERM, (x, 41.8, 1.9), (2.4, .2, .3), bev=.05, seg=1)
    rbox('n_halld', DOOR, (0, 41.9, 3.4), (4.4, .25, 3.6), bev=.1, seg=2)
    rbox('n_hallr', TILE, (0, 46.5, 6.9), (21, 16, .55), bev=.25, seg=2)
    cyl('n_hallr', TILE, (0, 46.5, 9.0), 13.2, 3.8, 4, .3, 5.2, rot=(0, 0, math.pi / 4)).scale = (1, .74, 1)
    rbox('n_hallr', BLACK, (0, 46.5, 11.1), (10, 1.0, .8), bev=.3, seg=2)
    for x in (-6, -2, 2, 6): sph('n_hall', LRED, (x, 40.8, 6.0), .45, (1, 1, 1.4), 1)
    sign('w20', (0, 41.2, 7.6), 1.4, 0, d=.25)
    for s_ in (-1, 1): rbox('n_wall', STONE2, (s_ * 14, 30, .9), (.8, 34, 1.8), bev=.2, seg=2); rbox('n_wall', TILE, (s_ * 14, 30, 2.0), (1.4, 34.4, .35), bev=.1, seg=2)
    FARM[0] = True
    for x, y, s in ((-9, 8, 1.3), (9, 8, 1.2), (-10, 22, 1.4), (10, 22, 1.3), (-16, 40, 1.5), (16, 40, 1.5), (-12, 56, 1.4), (12, 56, 1.5), (0, 60, 1.6), (-20, 10, 1.3), (20, 14, 1.3)): tree(x, y, s, 'f_')
    FARM[0] = False
    rbox('g_pave', PAVE, (0, 28, .08), (30, 66, .16), bev=.05, seg=1)
    rbox('g_road', ROAD, (0, -8, .02), (80, 10, .1), bev=0, seg=1)
    FARM[0] = True; ring(0, 26, 46, 12, 26, 16, 71, gap=(0, .45)); FARM[0] = False
    ground(0, 22, 110, 110, None)
    clouds([(-25, 50, 40), (25, 60, 45), (0, 90, 50), (-50, -20, 38), (50, -30, 42)], 1.3)
    peds([((-1.8, 4, .25), (1.8, 34, .25))] * 6 + [((-30, -10, .1), (30, -6, .1))] * 3, 11)

GATE = SCENE in ('ichiban', 'central')
if SCENE == 'ichiban': build_gate(RED, 'gate'); gate_street()
elif SCENE == 'central': build_gate(BLUE, 'gate2'); gate_street()
elif SCENE == 'tokyu': build_tokyu_scene()
elif SCENE == 'toho': build_toho()
elif SCENE == 'plaza': build_plaza()
elif SCENE == 'goldengai': build_goldengai()
elif SCENE == 'hanazono': build_hanazono()
# window instances (near ones full size, far/small ones lighter)
for loc, rz, far, small, wsc in WINS:
    put(winS if small else winM, 'j_win' if far else 'i_win', loc, rz, wsc)

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
    if GATE:
        for o in list(COL.objects):
            if o.name.startswith('n_') and o.location.y > 36: o.name = 'f_' + o.name[2:]
            if o.name.startswith('i_') and o.location.y >= 36: o.name = 'j_' + o.name[2:]
    if LOD:
        for o in list(COL.objects):
            if o.name[:2] in ('f_', 'g_', 'c_', 'j_') or (o.name.startswith('p_') and not GATE): bpy.data.objects.remove(o)
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
        elif o.name.startswith('i_'): o.parent = E['INST_NEAR']
        elif o.name.startswith('j_'): o.parent = E['INST_FAR']
    R0 = make_empty('L_' + SCENE)
    for e in E.values(): e.parent = R0
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB', export_image_format='WEBP', export_image_quality=85,
                              export_apply=True, export_yup=True, export_gpu_instances=True, export_normals=True, export_texcoords=True)
    print('EXPORTED', OUT, 'objects', len(COL.objects), 'wins', len(WINS)); sys.exit(0)

cam = bpy.data.cameras.new('cam'); cam.lens = 38; cam.sensor_width = 36; co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
HERO = {'ichiban': ((0, -22.5, 2.5), (0, 0, 6.87), 38), 'central': ((0, -22.5, 2.5), (0, 0, 6.87), 38),
        'tokyu': ((0, -150, 3), (0, 0, 74), 30), 'toho': ((0, -92, 2.5), (0, 0, 30), 30), 'plaza': ((0, -52, 22), (0, 8, 4), 30),
        'goldengai': ((0, -7, 1.8), (0, 30, 3.2), 30), 'hanazono': ((0, -17, 2.6), (0, 20, 6.0), 30)}
ORB = {'ichiban': ((0, 8, 6), 60, 30), 'central': ((0, 8, 6), 60, 30), 'tokyu': ((0, -10, 50), 190, 90), 'toho': ((0, 0, 18), 110, 55),
       'plaza': ((0, 10, 6), 90, 45), 'goldengai': ((0, 28, 3), 55, 30), 'hanazono': ((0, 26, 4), 80, 40)}
if MODE.startswith('orbit'):
    k = int(MODE[5:]); a = math.radians(-30 + 90 * k); C_, R_, H_ = ORB[SCENE]
    co.location = (C_[0] + math.sin(a) * R_, C_[1] - math.cos(a) * R_, H_); dvec = Vector(C_) - co.location
    co.rotation_euler = dvec.to_track_quat('-Z', 'Y').to_euler(); cam.lens = 28
else:
    p_, t_, lens = HERO[SCENE]; co.location = p_; co.rotation_euler = (Vector(t_) - Vector(p_)).to_track_quat('-Z', 'Y').to_euler(); cam.lens = lens
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (*hexc('#1a1838' if NIGHT else '#a07890'), 1); bg.inputs[1].default_value = .35 if NIGHT else (3.2 if SCENE == 'goldengai' else 1.6)
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
