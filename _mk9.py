# -*- coding: utf-8 -*-
# M9 测试页生成：复制 _publish/index.html，</body> 前注入自动开局 + 生成 Boss2/Boss3
import io, os

ROOT = r"D:\.workbuddy\2026-10-15-22-43-01\naiyu"
SRC  = os.path.join(ROOT, "_publish", "index.html")
DST  = os.path.join(ROOT, "_test_m9.html")

BOOT = """
<script>
setTimeout(function () {
  try {
    var nb = document.getElementById('normalBtn') || document.querySelector('#panel .diffbtn');
    if (nb) nb.click();
    setTimeout(function () {
      var db = document.querySelector('#diffPanel .dbtn[data-d="hard"]') || document.querySelector('#diffPanel .dbtn');
      if (db) db.click();
      setTimeout(function () {
        try {
          var V = window.__v2.V, api = window.__v2;
          while (V.bosses.length < 1) api.spawnBoss(V.bosses.length);
          api.spawnBoss(1); // moyu
          api.spawnBoss(2); // math
          window.__M9_READY = true;
        } catch (e) { window.__M9_ERR = String(e); }
      }, 600);
    }, 300);
  } catch (e) { window.__M9_ERR = String(e); }
}, 400);
</script>
"""

src = io.open(SRC, "r", encoding="utf-8").read()
i = src.rfind("</body>")
assert i > 0
new = src[:i] + BOOT + src[i:]
io.open(DST, "w", encoding="utf-8").write(new)
print("MK_OK")
