# Ichibangai gate + street mouth, modelled after our own Imagine clay concept (ref/imagine_gate_*.png)
import bpy, bmesh, math, random, sys, os
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = argv[0] if argv else 'day'      # day | night | export
OUT = argv[1] if len(argv) > 1 else '/tmp/x.png'
D = os.path.dirname(os.path.abspath(__file__))
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
NIGHT = MODE == 'night'
EM = 1.0 if MODE == 'export' else (3.2 if NIGHT else .55)   # emission multiplier for renders

def coll(n):
    c = bpy.data.collections.new(n); sc.collection.children.link(c); return c
CG, CD, CX = coll('GATE'), coll('DRESS'), coll('CONTEXT')

MATS = {}
def mat(name, col, rough=.85, em=None, ems=0., tex=None, bump=True):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexc(col), 1); b.inputs['Roughness'].default_value = rough
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(D, tex)); t.interpolation = 'Linear'
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if em is not None: nt.links.new(t.outputs['Color'], b.inputs['Emission Color'])
    elif em is not None: b.inputs['Emission Color'].default_value = (*hexc(em), 1)
    if em is not None: b.inputs['Emission Strength'].default_value = ems * (EM if MODE != 'export' else 1)
    if bump and MODE != 'export':
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 18; n.inputs['Detail'].default_value = 6
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .18; bp.inputs['Distance'].default_value = .03
        nt.links.new(n.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    MATS[name] = m; return m
def hexc(h):
    h = h.lstrip('#'); return tuple((int(h[i:i+2], 16) / 255) ** 2.2 for i in (0, 2, 4))

def link(o, c):
    for u in o.users_collection: u.objects.unlink(o)
    c.objects.link(o); return o
def box(c, m, loc, size, bev=.2, seg=3, rz=0):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=(0, 0, rz)); o = bpy.context.object; o.scale = [s / 2 for s in size]
    bpy.ops.object.transform_apply(scale=True)
    if bev: md = o.modifiers.new('b', 'BEVEL'); md.width = min(bev, min(size) * .45); md.segments = seg; md.limit_method = 'NONE'
    o.data.materials.append(m); return link(o, c)
def cyl(c, m, loc, r, h, bev=.12, verts=20, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot); o = bpy.context.object
    if bev: md = o.modifiers.new('b', 'BEVEL'); md.width = bev; md.segments = 2; md.limit_method = 'ANGLE'
    bpy.ops.object.shade_smooth(); o.data.materials.append(m); return link(o, c)
def sph(c, m, loc, r, sub=1, sc_=(1, 1, 1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc); o = bpy.context.object; o.scale = sc_
    bpy.ops.object.shade_smooth(); o.data.materials.append(m); return link(o, c)
def quad(c, m, center, w, h, normal, uv=None):
    # vertical quad facing `normal` ('-y','+y','-x','+x')
    me = bpy.data.meshes.new('q'); x, y, z = center; hw, hh = w / 2, h / 2
    if normal in ('-y', '+y'):
        s = 1 if normal == '-y' else -1; yy = y
        vs = [(x - hw * s, yy, z - hh), (x + hw * s, yy, z - hh), (x + hw * s, yy, z + hh), (x - hw * s, yy, z + hh)]
    else:
        s = 1 if normal == '+x' else -1
        vs = [(x, y - hw * s, z - hh), (x, y + hw * s, z - hh), (x, y + hw * s, z + hh), (x, y - hw * s, z + hh)]
    me.from_pydata(vs, [], [(0, 1, 2, 3)]); me.update()
    u0, v0, u1, v1 = uv or (0, 0, 1, 1); l = me.uv_layers.new(); 
    for i, (u, v) in enumerate([(u0, v0), (u1, v0), (u1, v1), (u0, v1)]): l.data[i].uv = (u, v)
    o = bpy.data.objects.new('q', me); c.objects.link(o); me.materials.append(m); return o

# ---------------- materials ----------------
RED = mat('gateRed', '#e8222c', .55, em='#ff1820', ems=.25)
BULB = mat('bulb', '#fff4e6', .3, em='#fff0dc', ems=2.5, bump=False)
GREY = mat('post', '#9b9a98', .9)
GREY2 = mat('postCap', '#86858a', .9)
SIGNBODY = mat('signBody', '#efe6d4', .8)
SIGN = mat('signFace', '#ffffff', .7, em='#ffffff', ems=.6, tex='sign.png', bump=False)
ROD = mat('rod', '#8e9096', .6)
ATL = mat('atlas', '#ffffff', .7, em='#ffffff', ems=.8, tex='atlas.png', bump=False)
BACK = mat('signBack', '#2a2530', .9)
WIN = mat('window', '#ffcf7a', .5, em='#ffb050', ems=.9, bump=False)
LANT = mat('lantern', '#fff1c8', .4, em='#ffe2a0', ems=3., bump=False)
DARK = mat('lampPost', '#3c3840', .7)
AWN = [mat('awn%d' % i, c, .85) for i, c in enumerate(['#c7362e', '#d9a33a', '#3f6e8c', '#8a4c8c', '#4f8a56'])]
BLD = [mat('bld%d' % i, c, .92) for i, c in enumerate(['#4a3f5c', '#6b3a44', '#3e5868', '#7a5a46', '#5a4a6e', '#3f6a5a', '#8a4a52', '#2f3f5a', '#a0644e'])]
ROAD = mat('road', '#3a3940' if NIGHT else '#55545c', .25 if NIGHT else .8)
WALK = mat('walk', '#8e8a88', .9)

# ---------------- gate ----------------
S = 5.8; TR = .62           # post-centre half span, tube radius
def arc(cx, cz, r, a0, a1, n=10): return [(cx + math.cos(a0 + (a1 - a0) * k / n) * r, cz + math.sin(a0 + (a1 - a0) * k / n) * r) for k in range(n + 1)]
TOP = 11.0; R = 2.0; LB = 6.55; RI = 1.0
loop = [(-S, 3.9), (-S, TOP - R)] + arc(-S + R, TOP - R, R, math.pi, math.pi / 2)[1:] + arc(S - R, TOP - R, R, math.pi / 2, 0)[1:] + [(S, 3.9)]
low = arc(-S + RI, LB + RI, RI, math.pi, 1.5 * math.pi, 6) + [(-S + RI + (2 * S - 2 * RI) * k / 10, LB - .18 * math.sin(math.pi * k / 10)) for k in range(1, 10)] + arc(S - RI, LB + RI, RI, 1.5 * math.pi, 2 * math.pi, 6)
def tube(pts, name):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = TR; cu.bevel_resolution = 4; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, (x, z) in zip(sp.points, pts): p.co = (x, 0, z, 1)
    o = bpy.data.objects.new(name, cu); CG.objects.link(o); cu.materials.append(RED)
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.ops.object.shade_smooth(); return o
def resample(pts, step):
    out = []; acc = step / 2
    segs = [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    for a, b in segs:
        L = math.dist(a, b); t = acc
        while t < L:
            f = t / L; out.append(((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f), ((b[0] - a[0]) / L, (b[1] - a[1]) / L))); t += step
        acc = t - L
    return out
tube(loop, 'tubeLoop'); tube(low, 'tubeLow')
# bulbs: one mesh, 2 rows on each face
bm = bmesh.new()
for pts, trim in ((loop, 0), (low, 1)):
    for (x, z), (tx, tz) in resample(pts, .44):
        if trim and abs(x) > S - .5 and z > LB + .6: continue
        nx, nz = -tz, tx
        for face in (-1, 1):
            for th in (-.6, .6):
                v = Vector((x + nx * TR * math.sin(th), face * TR * math.cos(th), z + nz * TR * math.sin(th)))
                bmesh.ops.create_icosphere(bm, subdivisions=1, radius=.1, matrix=__import__('mathutils').Matrix.Translation(v))
me = bpy.data.meshes.new('bulbs'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('bulbs', me); CG.objects.link(ob); me.materials.append(BULB)
for p in me.polygons: p.use_smooth = True
# posts
for s in (-1, 1):
    cyl(CG, GREY, (s * S, 0, 2.2), .82, 3.4, bev=.15, verts=24)
    cyl(CG, GREY2, (s * S, 0, .3), 1.0, .6, bev=.2, verts=24)
    cyl(CG, GREY2, (s * S, 0, 3.95), .98, .5, bev=.18, verts=24)
    cyl(CG, ROD, (s * 5.0, 0, 8.75), .2, 1.3, bev=.05, verts=12, rot=(0, math.pi / 2, 0))
# sign
SW, SH, SZ = 9.3, 2.9, 8.75
box(CG, SIGNBODY, (0, 0, SZ), (SW + .3, .55, SH + .3), bev=.28, seg=4)
quad(CG, SIGN, (0, -.29, SZ), SW - .2, SH - .2, '-y'); quad(CG, SIGN, (0, .29, SZ), SW - .2, SH - .2, '+y')

# ---------------- dressing (exported; sits on the real map's facades) ----------------
def atl(i): return (i / 8 + .006, 0, (i + 1) / 8 - .006, 1)
def vsign(c, i, x, y, z, w, h, face='-y'):
    d = .14 if face == '-y' else -.14
    box(c, BACK, (x, y + d * 1.4, z), (w + .3, .28, h + .3), bev=.12, seg=2)
    quad(c, ATL, (x, y - .02 if face == '-y' else y + .02, z), w, h, face, atl(i))
# flank signs on the corner buildings, as in the concept
for i, x, z, w, h in [(0, -9.3, 11.3, 2.3, 5.2), (1, -7.3, 9.0, 1.7, 3.6), (5, -10.0, 6.9, 1.9, 2.6), (2, -8.0, 6.9, 1.5, 2.4),
                      (3, 9.6, 10.6, 2.1, 5.6), (4, 7.6, 8.2, 1.7, 4.2), (7, 9.8, 4.9, 1.8, 2.6), (6, 7.7, 5.3, 1.4, 2.2)]:
    vsign(CD, i, x, -1.0, z, w, h)
# corner shopfronts facing Yasukuni-dori
for s in (-1, 1):
    for k, x in enumerate((7.6, 10.3, 13.0)):
        box(CD, WIN, (s * x, -.95, 1.4), (2.0, .2, 2.1), bev=.08, seg=1)
        box(CD, AWN[(k + (s > 0) * 2) % 5], (s * x, -1.6, 3.15), (2.5, 1.4, .3), bev=.14, seg=2).rotation_euler = (math.radians(-14), 0, 0)
# street-side shops, awnings, blade signs and lamps (first block)
k = 0
for s in (-1, 1):
    for j, y in enumerate(range(3, 33, 6)):
        box(CD, WIN, (s * 6.75, y + 1, 1.4), (.2, 3.8, 2.1), bev=.08, seg=1)
        a = box(CD, AWN[(j + (s > 0)) % 5], (s * 6.1, y + 1, 3.2), (1.3, 4.4, .28), bev=.13, seg=2); a.rotation_euler = (0, math.radians(14 * s), 0)
        if j % 2 == 0 or s > 0:
            bx = s * 5.95; h = 3.0 + (j % 3) * .6
            box(CD, BACK, (bx, y + 3.2, 5.6 + h / 2), (1.45, .22, h + .3), bev=.1, seg=2)
            quad(CD, ATL, (bx, y + 3.2 - .12, 5.6 + h / 2), 1.25, h, '-y', atl((k * 3 + 1) % 8)); quad(CD, ATL, (bx, y + 3.2 + .12, 5.6 + h / 2), 1.25, h, '+y', atl((k * 3 + 4) % 8)); k += 1
for s in (-1, 1):
    for y in (6.5, 16.5, 26.5):
        cyl(CD, DARK, (s * 4.9, y, 2.1), .09, 4.2, bev=0, verts=8)
        box(CD, LANT, (s * 4.9, y, 4.45), (.5, .5, .65), bev=.12, seg=2)
        box(CD, DARK, (s * 4.9, y, 4.85), (.66, .66, .14), bev=.05, seg=1)

# ---------------- context (render only) ----------------
box(CX, ROAD, (0, 69, .05), (9.0, 140, .1), bev=0)
for s in (-1, 1): box(CX, WALK, (s * 5.6, 69, .12), (2.2, 140, .2), bev=.05, seg=1)
box(CX, WALK, (0, -31, .02), (120, 60.2, .2), bev=0)
def building(x0, x1, y0, y1, h, mi, front=False):
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    box(CX, BLD[mi], (cx, cy, h / 2), (x1 - x0, y1 - y0, h), bev=.35, seg=3)
    box(CX, BLD[mi], (cx, cy, h + .25), (x1 - x0 - .6, y1 - y0 - .6, .5), bev=.2, seg=2)
    side = 1 if cx < 0 else -1; xf = x1 if cx < 0 else x0
    for z in [3 + 2.4 * i for i in range(int((h - 4) / 2.4) + 1) if 3 + 2.4 * i < h - 1.2]:
        if z < 4.5: continue
        yy = y0 + 1.2
        while yy < y1 - .8:
            if random.random() < .8: box(CX, WIN, (xf + side * .06, yy, z), (.12, .9, 1.1), bev=.04, seg=1)
            yy += 1.7
        if front:
            xx = x0 + 1
            while xx < x1 - .6:
                if random.random() < .75 and not (z > 4 and abs(xx) < 11.5 and abs(cx) < 12): box(CX, WIN, (xx, y0 - .06, z), (.9, .12, 1.1), bev=.04, seg=1)
                xx += 1.7
building(-11.2, -6.85, -1, 8, 15.5, 1, True); building(-18, -11.2, -.6, 8, 12.5, 5, True); building(6.85, 11.4, -1, 8, 16.5, 4, True); building(11.4, 18, -.6, 8, 13, 2, True)
for x0, x1, h, mi in ((-24, -18, 17, 7), (18, 24, 18, 0)): building(x0, x1, -.2, 8, h, mi, True)
for s in (-1, 1):
    y = 8.3; i = 1
    while y < 120:
        L = random.uniform(5, 9); h = random.uniform(8, 18)
        building(-15 if s < 0 else 6.85, -6.85 if s < 0 else 15, y, y + L - .3, h, (i * 3 + (s > 0)) % 9); y += L; i += 1
        if y < 90 and random.random() < .7:
            quad(CX, ATL, (s * 6.0, y - 2, random.uniform(6, 10)), 1.1, 2.8, '-y', atl(random.randrange(8)))
for x in (-40, -28, 28, 40):
    building(x - 5, x + 5, 6, 16, random.uniform(10, 18), random.randrange(9), True)
# sky backdrop and clay clouds
me = bpy.data.meshes.new('sky'); me.from_pydata([(-200, 260, -10), (200, 260, -10), (200, 260, 160), (-200, 260, 160)], [], [(0, 1, 2, 3)])
sky = bpy.data.objects.new('sky', me); CX.objects.link(sky)
sm = bpy.data.materials.new('sky'); sm.use_nodes = True; nt = sm.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
em = nt.nodes.new('ShaderNodeEmission'); cr = nt.nodes.new('ShaderNodeValToRGB'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); tc = nt.nodes.new('ShaderNodeTexCoord')
mp = nt.nodes.new('ShaderNodeMapRange'); mp.inputs['From Min'].default_value = -10; mp.inputs['From Max'].default_value = 110
nt.links.new(tc.outputs['Object'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], mp.inputs['Value']); nt.links.new(mp.outputs['Result'], cr.inputs['Fac'])
cr.color_ramp.elements[0].color = (*hexc('#1a1838' if NIGHT else '#e8907e'), 1); cr.color_ramp.elements[1].color = (*hexc('#0b0b22' if NIGHT else '#6a4a7e'), 1)
nt.links.new(cr.outputs['Color'], em.inputs['Color']); em.inputs['Strength'].default_value = 1.0
nt.links.new(em.outputs[0], nt.nodes['Material Output'].inputs['Surface']); me.materials.append(sm)
CL = mat('cloud', '#d9a08e' if not NIGHT else '#3a3550', .95)
for x, z in ((-40, 70), (30, 78), (-12, 55), (55, 52)):
    for k in range(4): sph(CX, CL, (x + k * 5 - 7, 250, z + (k % 2) * 2.5), 6 + (k % 2) * 2, 2, (1, .4, .6))

# ---------------- export ----------------
def join_by_mat(c):
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(c.objects):
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        for m in o.modifiers: bpy.ops.object.modifier_apply(modifier=m.name)
        o.select_set(False)
    groups = {}
    for o in c.objects: groups.setdefault(o.data.materials[0].name, []).append(o)
    for n, os_ in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in os_: o.select_set(True)
        bpy.context.view_layer.objects.active = os_[0]; bpy.ops.object.join(); os_[0].name = c.name + '_' + n
if MODE == 'export':
    join_by_mat(CG); join_by_mat(CD)
    bpy.ops.object.select_all(action='DESELECT')
    for c in (CG, CD):
        for o in c.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=82,
                              export_apply=True, export_yup=True, export_materials='EXPORT', export_normals=True, export_texcoords=True)
    tris = sum(len(o.data.polygons) for c in (CG, CD) for o in c.objects); print('EXPORTED', OUT, 'polys', tris); sys.exit(0)

# ---------------- render ----------------
cam = bpy.data.cameras.new('cam'); cam.lens = 30; cam.sensor_width = 36; co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co)
co.location = (0, -22.5, 2.2); co.rotation_euler = (math.radians(94), 0, 0); sc.camera = co
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (*hexc('#141428' if NIGHT else '#8a6a8a'), 1)
w.node_tree.nodes['Background'].inputs[1].default_value = .25 if NIGHT else .9
sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = .15 if NIGHT else 2.6; sun.color = hexc('#9fb0ff' if NIGHT else '#ffd0b0'); sun.angle = .3
so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(55), math.radians(-20), math.radians(-25))
if NIGHT:
    for s in (-1, 1):
        for y in (6.5, 16.5, 26.5):
            l = bpy.data.lights.new('p', 'POINT'); l.energy = 300; l.color = hexc('#ffd8a0'); o = bpy.data.objects.new('p', l); o.location = (s * 4.9, y, 4.2); sc.collection.objects.link(o)
    l = bpy.data.lights.new('g', 'AREA'); l.energy = 500; l.size = 12; l.color = hexc('#ff4040'); o = bpy.data.objects.new('g', l); o.location = (0, -4, 9); o.rotation_euler = (math.radians(90), 0, 0); sc.collection.objects.link(o)
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = int(argv[2]) if len(argv) > 2 else 48; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1024, 768; sc.render.filepath = OUT
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy' if True else 'None'
sc.render.threads_mode = 'FIXED'; sc.render.threads = 8
bpy.ops.render.render(write_still=True); print('RENDERED', OUT)
