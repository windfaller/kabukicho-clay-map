#!/bin/bash
set -e
cd /workspace/kabukicho-map
/workspace/tools/blender-5.2.1-linux-x64/blender -b --factory-startup -P blender/diorama.py -- export /tmp/dio_raw.glb 2>&1 | grep -E "EXPORTED|Error|Traceback"
cd /workspace/tools/gt && npx gltf-transform weld /tmp/dio_raw.glb /tmp/dio_w.glb >/dev/null 2>&1 && npx gltf-transform meshopt /tmp/dio_w.glb /workspace/kabukicho-map/assets/kabukicho_diorama.glb --level medium 2>&1 | tail -1
cd /workspace/kabukicho-map && python3 build2.py
