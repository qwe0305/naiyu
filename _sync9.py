# -*- coding: utf-8 -*-
# M9 同步：扩展层 -> 游戏 HTML -> _publish/index.html
import io, os, re

ROOT = r"D:\.workbuddy\2026-10-15-22-43-01\naiyu"
EXT  = os.path.join(ROOT, "源码", "v2-extension.js")
HTML = os.path.join(ROOT, "游戏", "神金海豹大作战_v2.html")
PUB  = os.path.join(ROOT, "_publish", "index.html")
REPORT = os.path.join(ROOT, "_sync_report.txt")

ext = io.open(EXT, "r", encoding="utf-8").read()
head = ext[:100]  # 定位锚：扩展层头部 100 字符

out_lines = []
for path in (HTML, PUB):
    src = io.open(path, "r", encoding="utf-8").read()
    i = src.find(head)
    assert i >= 0, "anchor not found in " + path
    j = src.find("</script>", i)
    assert j > i, "script end not found in " + path
    new = src[:i] + ext + src[j:]
    io.open(path, "w", encoding="utf-8", newline="").write(new)
    out_lines.append("%s: replaced %d..%d, new len %d" % (os.path.basename(path), i, j, len(new)))

# 校验 M9 标记
for path in (HTML, PUB):
    s = io.open(path, "r", encoding="utf-8").read()
    marks = ["视野内 Boss", "LATIAO_IMG.complete && LATIAO_IMG.naturalWidth) {\n        /* Boss2 辣条方块", "orb: '课本', orbIc: '📖'"]
    out_lines.append(os.path.basename(path) + " marks: " + ", ".join(str(m in s) for m in marks))

io.open(REPORT, "w", encoding="utf-8").write("\n".join(out_lines))
print("SYNC_OK")
