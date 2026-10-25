#!/bin/bash
# build all diorama GLBs (full, lazy) + merged map LODs
set -e
cd /workspace/kabukicho-map
B=/workspace/tools/blender-5.2.1-linux-x64/blender
GT=/workspace/tools/gt
for sc in ${FULL-ichiban central tokyu toho plaza goldengai hanazono}; do
  $B -b --factory-startup -P blender/diorama.py -- export /tmp/dio_raw_$sc.glb 1 $sc 2>&1 | grep -E "Error|Traceback" || true
  (cd $GT && npx gltf-transform weld /tmp/dio_raw_$sc.glb /tmp/dio_w_$sc.glb >/dev/null 2>&1 && npx gltf-transform meshopt /tmp/dio_w_$sc.glb /workspace/kabukicho-map/assets/dio_$sc.glb --level medium >/dev/null 2>&1)
  rm -f /tmp/dio_raw_$sc.glb /tmp/dio_w_$sc.glb
done
for sc in ${LODS-ichiban central tokyu toho plaza goldengai hanazono}; do
  $B -b --factory-startup -P blender/diorama.py -- lod /tmp/lod_raw_$sc.glb 1 $sc 2>&1 | grep -E "Error|Traceback" || true
  (cd $GT && npx gltf-transform dedup /tmp/lod_raw_$sc.glb /tmp/lod_d.glb >/dev/null 2>&1 && npx gltf-transform weld /tmp/lod_d.glb /tmp/lod_w0.glb >/dev/null 2>&1 && npx gltf-transform simplify /tmp/lod_w0.glb /tmp/lod_w.glb --ratio 0.25 --error 0.01 >/dev/null 2>&1 && npx gltf-transform meshopt /tmp/lod_w.glb /workspace/kabukicho-map/assets/lod_$sc.glb --level high >/dev/null 2>&1)
  rm -f /tmp/lod_raw_$sc.glb /tmp/lod_d.glb /tmp/lod_w0.glb /tmp/lod_w.glb
done
ls -la assets/*.glb
