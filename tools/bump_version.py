#!/usr/bin/env python3
"""發佈新版：python3 tools/bump_version.py 2.4.0 "更新說明"
同時更新 js/version.js、version.json 與 index.html 的 ?v= 參數。"""
import json, re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
if len(sys.argv) < 2 or not re.fullmatch(r'\d+(\.\d+)*', sys.argv[1]):
    sys.exit('用法：python3 tools/bump_version.py 新版本號 [更新說明]')
v, notes = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else '')
vj = root / 'js' / 'version.js'
vj.write_text(re.sub(r"const GAME_VERSION = '[^']*';", f"const GAME_VERSION = '{v}';", vj.read_text(encoding='utf-8')), encoding='utf-8')
(root / 'version.json').write_text(json.dumps({'version': v, 'notes': notes}, ensure_ascii=False) + '\n', encoding='utf-8')
ix = root / 'index.html'
ix.write_text(re.sub(r'\?v=[\w.]+"', f'?v={v}"', ix.read_text(encoding='utf-8')), encoding='utf-8')
print('版本已更新為', v)
