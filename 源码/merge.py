#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 v2 扩展层合并进原版《神金海豹大作战》
----------------------------------------------------
原则：原版代码一行不改，只在 </body> 前追加一个 <script> 扩展层。
顺带做两件优化：
  1) 原版第 1、2 张图是同一张 → 去重，省 145 KB
  2) 原版 7 张 PNG 全部转 WebP → 体积从 2.2 MB 降到约 0.4 MB
输出：dist/神金海豹大作战_v2.html
"""
import base64, io, re, sys, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
ORIG = pathlib.Path('/root/uploads/1791981645701006561-11f199330d93c35b_v17.html')
V2JS = ROOT / 'v2.js'
SKIN_DIR = pathlib.Path('/workspace/assets/skins/_processed')
BOSS_PNG = pathlib.Path('/workspace/assets/boss.png')
OUT_DIR = ROOT / 'dist'
OUT = OUT_DIR / '神金海豹大作战_v2.html'

SKIN_IDS = ['base', 'moyushuang', 'binghongcha', 'leshi', 'gaodengshuxue',
            'xiandaishuxue', 'jiahao', 'naiyu', 'xiangjiao', 'wjh']


def webp_uri(data: bytes, quality=90) -> str:
    im = Image.open(io.BytesIO(data)).convert('RGBA')
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=quality, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def png_uri(path: pathlib.Path, quality=90) -> str:
    return webp_uri(path.read_bytes(), quality)


def main():
    html = ORIG.read_text(encoding='utf-8', errors='replace')
    print('原版 %.0f KB' % (len(html.encode()) / 1024))

    # ---- 1) 去重：sealImg 复用 title-seal ----
    pat = re.compile(r"sealImg\.src\s*=\s*'data:image/png;base64,[A-Za-z0-9+/=]+';")
    if not pat.search(html):
        sys.exit('未找到 sealImg.src，原版结构可能变了')
    html = pat.sub("sealImg.src = document.getElementById('title-seal').src;", html, count=1)
    print('  ✔ 玩家海豹图去重（复用标题图）')

    # ---- 2) 其余 PNG → WebP ----
    n = [0]

    def conv(m):
        n[0] += 1
        try:
            return webp_uri(base64.b64decode(m.group(1)))
        except Exception as e:
            print('    ! 第%d张转换失败，保留原图：%s' % (n[0], e))
            return m.group(0)

    html = re.sub(r'data:image/png;base64,([A-Za-z0-9+/=]+)', conv, html)
    print('  ✔ %d 张原版贴图转 WebP' % n[0])

    # ---- 3) 组装扩展层 ----
    skin_src = {sid: png_uri(SKIN_DIR / f'{sid}.png') for sid in SKIN_IDS}
    boss_img = png_uri(BOSS_PNG, 92)
    orb_img = png_uri(ROOT / 'waimai_orb.png', 92)
    b2_img = png_uri(ROOT / 'boss2.png', 92)
    b3_img = png_uri(ROOT / 'boss3.png', 92)
    voice = (ROOT / 'kangaroo.mp3')
    voice_uri = ('data:audio/mpeg;base64,' + base64.b64encode(voice.read_bytes()).decode()
                 ) if voice.exists() else ''
    prelude = ('const SKIN_SRC = ' + __import__('json').dumps(skin_src, ensure_ascii=False,
               separators=(',', ':')) + ';\n'
               'const BOSS_IMG = new Image(); BOSS_IMG.src = ' + repr(boss_img) + ';\n'
               'const ORB_IMG = new Image(); ORB_IMG.src = ' + repr(orb_img) + ';\n'
               'const BOSS2_SRC = ' + repr(b2_img) + ';\n'
               'const BOSS3_SRC = ' + repr(b3_img) + ';\n'
               'const BOSS_VOICE_SRC = ' + repr(voice_uri) + ';\n')
    v2 = V2JS.read_text(encoding='utf-8')

    inject = '\n<script>\n' + prelude + v2 + '\n</script>\n'
    if '</body>' not in html:
        sys.exit('原版缺少 </body>')
    html = html.replace('</body>', inject + '</body>', 1)

    # ---- 4) 标题加 v2 标记（保留原名）----
    html = html.replace('<title>神金海豹大作战</title>', '<title>神金海豹大作战 · v2</title>', 1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print('\n输出：%s  (%.0f KB)' % (OUT, len(html.encode()) / 1024))
    print('  皮肤 %d 套 | Boss 图 1 张 | 音效 3 段（原版保留）' % len(skin_src))


if __name__ == '__main__':
    main()
