/* ============================================================================
   《神金海豹大作战》v2 扩展层
   ----------------------------------------------------------------------------
   设计原则：原版代码一行不动。
   本层以「追加脚本」的形式运行，通过读取原版全局状态 + 挂钩绘制/结算函数接入。
   保留：原版玩法、手感、音效（3 段随机吃音 + WebAudio 死亡/胜利音）、名字。
   新增：积分、皮肤系统、Boss 战（吃掉核心物破防）、冲刺、局内进化三选一。
   ========================================================================== */
(function () {
'use strict';

/* ---------------------------------------------------------------- 0. 样式 */
const CSS = `
#v2hud{position:fixed;top:56px;left:12px;right:12px;display:flex;justify-content:space-between;
  align-items:center;color:#fff;font-size:13px;pointer-events:none;z-index:6;text-shadow:0 1px 3px rgba(0,0,0,.6)}
#v2hud .pill{background:rgba(4,30,48,.55);border:1px solid rgba(255,255,255,.14);border-radius:10px;
  padding:4px 10px;backdrop-filter:blur(6px);line-height:1.3}
#v2hud b{color:#ffd54a;font-size:15px}
#lvt{display:inline-block;background:linear-gradient(90deg,#ffd54a,#ff9d2e);color:#3a2400;border-radius:99px;
  padding:0 6px;font-size:10px;font-weight:900;margin-left:4px;vertical-align:1px}
#bossbar{position:fixed;top:8px;left:50%;transform:translateX(-50%);width:min(460px,82vw);z-index:6;
  opacity:0;transition:opacity .3s;pointer-events:none}
#bossbar.on{opacity:1}
#bossbar .nm{display:flex;justify-content:space-between;font-size:12px;color:#fff;text-shadow:0 1px 3px #000;margin-bottom:3px}
#bossbar .nm .tag{color:#ffb3c1}
#bossbar .bar{position:relative;height:15px;border-radius:99px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.25);overflow:hidden}
#bossbar .bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#ff9d2e,#ff3b3b);transition:width .25s}
#bossbar .bar .bnum{position:absolute;inset:0;display:grid;place-items:center;font-size:11px;font-weight:900;
  color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 4px rgba(0,0,0,.7);letter-spacing:.5px}
#dashbtn{position:fixed;right:18px;bottom:26px;width:76px;height:76px;border-radius:50%;
  display:grid;place-items:center;line-height:1.15;text-align:center;z-index:7;cursor:pointer;
  background:radial-gradient(circle at 35% 30%,rgba(120,220,255,.45),rgba(6,40,61,.9));
  border:2px solid rgba(120,220,255,.6);backdrop-filter:blur(8px);box-shadow:0 8px 22px rgba(0,0,0,.35);
  user-select:none;-webkit-user-select:none;transition:transform .1s, opacity .2s}
#dashbtn b{font-size:16px;color:#eaf7ff;letter-spacing:2px}
#dashbtn span{font-size:9px;color:#8fd6ff;letter-spacing:1px}
#dashbtn.cd{opacity:.45}
#dashbtn.cd b{font-size:20px;color:#9fb4c7;letter-spacing:0}
#dashbtn:active{transform:scale(.93)}
/* M5：旋转水波技能按钮（冲刺按钮上方） */
#spinbtn{position:fixed;right:18px;bottom:118px;width:64px;height:64px;border-radius:50%;
  display:grid;place-items:center;line-height:1.15;text-align:center;z-index:7;cursor:pointer;
  background:radial-gradient(circle at 35% 30%,rgba(110,231,160,.45),rgba(6,40,61,.9));
  border:2px solid rgba(110,231,160,.6);backdrop-filter:blur(8px);box-shadow:0 8px 22px rgba(0,0,0,.35);
  user-select:none;-webkit-user-select:none;transition:transform .1s, opacity .2s}
#spinbtn b{font-size:15px;color:#eaf7ff;letter-spacing:2px}
#spinbtn span{font-size:9px;color:#8fe6b5;letter-spacing:1px}
#spinbtn.cd{opacity:.45}
#spinbtn.cd b{font-size:18px;color:#9fc7b4;letter-spacing:0}
#spinbtn:active{transform:scale(.93)}
/* 面板可滚动：原版给 html,body 设了 touch-action:none + overflow:hidden，这里在面板打开时放开 */
html.v2scroll,html.v2scroll body{touch-action:pan-y !important;overscroll-behavior:none}
.v2ov{position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;
  justify-content:center;justify-content:safe center;
  background:rgba(4,30,48,.9);backdrop-filter:blur(8px);color:#fff;text-align:center;
  padding:22px 20px calc(38px + env(safe-area-inset-bottom));overflow-y:auto;overflow-x:hidden;
  overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch}
.v2ov>*{flex-shrink:0}
.v2ov h2{color:#ffd54a;font-size:26px;margin-bottom:6px}
.v2ov .sub{font-size:13px;color:#9fc0d4;margin-bottom:16px}
#shopGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:11px;
  width:min(760px,94vw);padding:4px}
.skcard{background:linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,.05));
  border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:10px;cursor:pointer;
  position:relative;transition:.14s;text-align:center}
.skcard:active{transform:scale(.97)}
.skcard.on{border-color:#ffd54a;box-shadow:0 0 0 1px #ffd54a,0 8px 22px rgba(255,213,74,.25)}
.skcard.locked{opacity:.55;filter:grayscale(.5)}
.skcard img{width:100%;height:92px;object-fit:contain;filter:drop-shadow(0 6px 12px rgba(0,0,0,.5))}
.skcard .n{font-size:14px;font-weight:800;margin-top:7px}
.skcard .l{font-size:11px;color:#9fc0d4;margin-top:2px;min-height:14px}
.skcard .p{font-size:12px;font-weight:800;color:#ffd54a;margin-top:5px}
.skcard .p.own{color:#6ee7a0}
.skcard .rib{position:absolute;top:8px;right:8px;font-size:9px;font-weight:900;padding:2px 7px;border-radius:99px;
  background:linear-gradient(90deg,#ffd54a,#ff9d2e);color:#3a2400}
.skcard .rr{position:absolute;top:8px;left:8px;font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px;
  background:rgba(255,255,255,.16);color:#dbe9f2}
#lvCards{display:flex;flex-direction:column;gap:12px;width:min(360px,90vw)}
.lvc{display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,rgba(255,255,255,.15),rgba(255,255,255,.05));
  border:1px solid rgba(255,255,255,.22);border-radius:16px;padding:14px 16px;cursor:pointer;text-align:left;transition:.14s}
.lvc:active{transform:scale(.97)}
.lvc .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:22px;
  background:rgba(255,255,255,.14);flex:0 0 auto;color:#ffd54a}
.lvc b{font-size:15px;display:block}
.lvc span{font-size:12px;color:#9fc0d4}
.v2btn{margin-top:14px;padding:11px 30px;font-size:16px;font-weight:bold;color:#06283d;
  background:linear-gradient(180deg,#ffd54a,#ffb02e);border:none;border-radius:26px;cursor:pointer;
  box-shadow:0 4px 14px rgba(255,180,40,.35)}
.v2btn.ghost{background:rgba(255,255,255,.14);color:#fff;box-shadow:none;border:1px solid rgba(255,255,255,.25)}
.v2btn:active{transform:scale(.95)}
#v2toast{position:fixed;left:50%;top:20%;transform:translateX(-50%);z-index:30;display:flex;
  flex-direction:column;gap:8px;align-items:center;pointer-events:none}
.tst{background:rgba(4,30,48,.92);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:9px 16px;
  font-size:13px;color:#fff;white-space:nowrap;animation:v2pop .3s ease,v2fade 2.4s forwards;
  box-shadow:0 10px 26px rgba(0,0,0,.45)}
.tst.gold{border-color:rgba(255,213,74,.65);color:#ffd54a}
@keyframes v2pop{from{transform:translateY(10px) scale(.92);opacity:0}}
@keyframes v2fade{0%,72%{opacity:1}100%{opacity:0;transform:translateY(-14px)}}
#shopBtn{position:fixed;left:50%;transform:translateX(-50%);bottom:24px;z-index:12}
/* ---- 血量移到左下角：M4 改为血条 —— 原版红心整块隐藏，由 #hpbox 接管 ---- */
#lives{display:none !important}
/* ---- 设置按钮（右上角齿轮，符合主流游戏惯例） ---- */
#setBtn{position:fixed;top:10px;right:12px;width:38px;height:38px;border-radius:50%;z-index:15;cursor:pointer;
  display:grid;place-items:center;font-size:20px;color:#fff;
  background:rgba(4,30,48,.55);border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(8px);
  box-shadow:0 4px 14px rgba(0,0,0,.3);transition:transform .12s}
#setBtn:active{transform:scale(.9) rotate(30deg)}
#setOv .row{margin:14px 0;width:min(420px,88vw);text-align:left}
#setOv .row .lab{font-size:14px;font-weight:700;color:#eaf7ff;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
#setOv .row .lab b{color:#ffd54a;font-size:14px}
#setOv .row .hint{font-size:12px;color:#9fc0d4;margin-top:4px;line-height:1.5}
#setOv input[type=range]{-webkit-appearance:none;width:100%;height:6px;border-radius:99px;
  background:linear-gradient(90deg,#ffd54a,#ff9d2e);outline:none;margin-top:4px}
#setOv input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;
  background:#fff;border:3px solid #ffd54a;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4)}
#setOv .seg{display:flex;gap:8px;flex-wrap:wrap}
#setOv .seg button{flex:1;min-width:52px;padding:9px 0;font-size:14px;font-weight:700;color:#cfe8f5;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);border-radius:12px;cursor:pointer;transition:.13s}
#setOv .seg button.on{background:linear-gradient(180deg,#ffd54a,#ffb02e);color:#06283d;border-color:transparent}
#setOv .seg button:active{transform:scale(.94)}
#setOv .btnrow3{display:flex;gap:8px}
#setOv .btnrow3 button{flex:1;padding:11px 0;font-size:14px;font-weight:800;border:none;border-radius:12px;cursor:pointer;transition:transform .12s}
#setOv .btnrow3 #setRestart{background:linear-gradient(180deg,#ffd54a,#ffb02e);color:#3d2a00}
#setOv .btnrow3 #setResume{background:linear-gradient(180deg,#9fe08c,#5ec444);color:#0c2b06}
#setOv .btnrow3 #setHome{background:linear-gradient(180deg,#8fc7ff,#4d9be6);color:#04213d}
#setOv .btnrow3 button:active{transform:scale(.95)}
/* ---- 开始界面按钮组：难度折叠 + 皮肤商店 + 开始游戏（统一黄色系） ---- */
#v2menu{display:flex;gap:10px;margin-top:20px;justify-content:center;flex-wrap:wrap;position:relative;z-index:2}
#v2menu .mbtn{padding:11px 22px;font-size:16px;font-weight:bold;border:none;border-radius:26px;cursor:pointer;
  box-shadow:0 4px 12px rgba(255,180,40,.3);transition:transform .12s}
#v2menu .mbtn:active{transform:scale(.95)}
#normalBtn{background:linear-gradient(180deg,#ffe066,#ffbf2e);color:#5a4200}
#endlessBtn{background:linear-gradient(180deg,#ffe8a3,#ffc94a);color:#5a4200}
#skinBtn2{background:linear-gradient(180deg,#fff0a8,#ffd54a);color:#6b4d00}
#lbBtn{background:linear-gradient(180deg,#ffd98a,#ffb02e);color:#5a4200}
/* 登录徽章 */
#v2login{position:absolute;top:16px;left:16px;padding:8px 16px;font-size:14px;font-weight:bold;border:none;border-radius:22px;
  cursor:pointer;background:rgba(255,255,255,.14);color:#cfe8f5;border:1px solid rgba(255,255,255,.3);
  z-index:12;transition:transform .12s;letter-spacing:.5px}
#v2login.on{background:linear-gradient(180deg,#4ddb8a,#2fbf68);color:#04331b;border-color:transparent}
#v2login:active{transform:scale(.95)}
#v2login .lgav{width:22px;height:22px;border-radius:50%;object-fit:cover;vertical-align:-6px;margin-right:5px;background:#04331b}
/* 个人资料面板 */
#profOv .profCard{width:min(360px,88vw);background:rgba(10,30,50,.55);border:1px solid rgba(255,255,255,.16);
  border-radius:18px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:12px}
#profOv .profAva{width:84px;height:84px;border-radius:50%;object-fit:cover;border:3px solid #ffd54a;cursor:pointer;
  background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:40px;overflow:hidden}
#profOv .profAvaHint{font-size:11px;color:#9fc0d4}
#profOv input.profName{width:200px;padding:9px 12px;font-size:15px;font-weight:bold;text-align:center;border-radius:12px;
  border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#eaf7ff;outline:none}
#profOv .profStats{width:100%;display:flex;flex-direction:column;gap:6px}
#profOv .profStats .srow{display:flex;justify-content:space-between;font-size:14px;color:#cfe8f5;
  background:rgba(255,255,255,.06);border-radius:10px;padding:8px 14px}
#profOv .profStats b{color:#ffd54a}
#profOv .profBtns{display:flex;gap:10px;margin-top:4px}
#profOv .profBtns .v2btn{margin-top:0}
#profOv #profLogout{background:linear-gradient(180deg,#ff9d9d,#f26b6b);color:#4a0808}
/* 登录/注册弹窗 */
#loginOv .loginCard{width:min(340px,88vw);background:rgba(10,30,50,.55);border:1px solid rgba(255,255,255,.16);
  border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:12px;align-items:stretch}
.login-tabs{display:flex;gap:10px}
.login-tab{flex:1;padding:10px 0;font-size:15px;font-weight:800;border:none;border-radius:12px;cursor:pointer;
  background:rgba(255,255,255,.12);color:#cfe8f5;border:1px solid rgba(255,255,255,.22);transition:transform .12s}
.login-tab.on{background:linear-gradient(180deg,#ffd54a,#ffb02e);color:#3d2a00;border-color:transparent}
.login-tab:active{transform:scale(.96)}
.loginInp{width:100%;box-sizing:border-box;padding:11px 14px;font-size:16px;border-radius:12px;border:1px solid rgba(255,255,255,.28);
  background:rgba(255,255,255,.1);color:#eaf7ff;outline:none}
.loginInp::placeholder{color:#7fa5bb}
.loginInp:focus{border-color:#ffd54a}
.loginCode{display:flex;gap:8px}
.loginCode .loginInp{flex:1}
.loginCodeBtn{flex-shrink:0;padding:0 14px;font-size:13px;font-weight:700;border:none;border-radius:12px;cursor:pointer;
  background:rgba(255,255,255,.14);color:#cfe8f5;border:1px solid rgba(255,255,255,.28)}
.loginCodeBtn:disabled{opacity:.55}
.loginErr{min-height:16px;font-size:12px;color:#ff9d9d;text-align:center}
#loginOv .v2btn{width:100%;margin-top:0}
#loginOv #liClose{margin-top:4px;background:rgba(255,255,255,.14);color:#cfe8f5}
/* 排行榜弹窗 */
.lb-tabs{display:flex;gap:10px;justify-content:center;margin-bottom:14px;width:min(420px,88vw)}
.lb-tab{flex:1;padding:11px 0;font-size:15px;font-weight:800;border:none;border-radius:14px;cursor:pointer;
  background:rgba(255,255,255,.12);color:#cfe8f5;border:1px solid rgba(255,255,255,.22);transition:transform .12s}
.lb-tab.on{background:linear-gradient(180deg,#ffd54a,#ffb02e);color:#3d2a00;border-color:transparent}
.lb-tab:active{transform:scale(.95)}
.lb-list{width:min(420px,88vw);max-height:46vh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:6px}
.lb-head,.lb-row{display:grid;grid-template-columns:1.2fr 2fr 1.6fr 1.8fr;align-items:center;gap:6px;
  padding:9px 10px;font-size:14px;text-align:center}
.lb-head{color:#9fc0d4;font-size:12px;font-weight:700;border-bottom:1px solid rgba(255,255,255,.12)}
.lb-row{border-bottom:1px solid rgba(255,255,255,.06)}
.lb-row:last-child{border-bottom:none}
.lb-row.top{background:rgba(255,213,74,.08)}
.lb-rank{font-weight:900}
.lb-name{font-weight:700;color:#eaf7ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-val{font-weight:900;color:#ffd54a}
.lb-boss{font-size:12px;color:#9fc0d4}
.lb-empty{padding:26px 10px;color:#9fc0d4;font-size:14px}
.lb-me{margin-top:12px;font-size:12px;color:#9fc0d4;width:min(420px,88vw);text-align:center}

#diffPanel .diffTitle{font-size:13px;font-weight:800;color:#ffd54a;letter-spacing:1px;text-shadow:0 1px 4px rgba(0,0,0,.6)}
#diffPanel{display:none;flex-direction:column;gap:8px;margin-top:12px;align-items:center;position:relative;z-index:2}
#diffPanel.open{display:flex}
#diffPanel .dbtn{width:min(240px,70vw);padding:10px;font-size:16px;font-weight:bold;border:none;border-radius:22px;cursor:pointer;
  color:#6b4d00;box-shadow:0 3px 10px rgba(255,180,40,.28);transition:transform .12s}
#diffPanel .dbtn:active{transform:scale(.96)}
#diffPanel .dbtn[data-d="easy"]{background:linear-gradient(180deg,#fff6c9,#ffe98a)}
#diffPanel .dbtn[data-d="hard"]{background:linear-gradient(180deg,#ffd54a,#ffb02e)}
#diffPanel .dbtn[data-d="hell"]{background:linear-gradient(180deg,#ff9d2e,#ff7a1a);color:#3d2200}
/* M4：玩家血条（左下角） */
#hpbox{position:fixed;left:12px;bottom:16px;z-index:6;width:min(240px,44vw);pointer-events:none;
  opacity:0;transition:opacity .3s}
#hpbox.on{opacity:1}
#hpbox .hptop{display:flex;justify-content:space-between;font-size:12px;font-weight:800;color:#fff;
  text-shadow:0 1px 3px rgba(0,0,0,.7);margin-bottom:3px}
#hpbox .hptop b{color:#ff5b6a}
#hpbox .hpbar{position:relative;height:16px;border-radius:99px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.3);
  overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.3)}
#hpbox .hpbar i{display:block;height:100%;width:100%;border-radius:99px;
  background:linear-gradient(90deg,#ff5b6a,#ff9d2e);transition:width .25s}
/* 血条内嵌数字：白字 + 描边，保证任何血量色底都清晰 */
#hpbox .hpnum{position:absolute;inset:0;display:grid;place-items:center;font-size:11px;font-weight:900;
  color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 4px rgba(0,0,0,.7);letter-spacing:.5px}
#upbox{position:fixed;left:12px;bottom:52px;z-index:6;display:flex;gap:4px;pointer-events:none;flex-wrap:wrap;
  max-width:min(300px,60vw)}
#upbox .upic{width:22px;height:22px;border-radius:6px;background:rgba(4,30,48,.6);
  border:1px solid rgba(255,213,74,.5);display:grid;place-items:center;font-size:12px;color:#ffd54a;
  text-shadow:0 0 4px rgba(255,213,74,.6)}
#upbox .upic span{font-size:9px;color:#fff;margin-left:1px}
`;
const _st = document.createElement('style'); _st.textContent = CSS; document.head.appendChild(_st);

/* ------------------------------------------------------------ 1. 工具函数 */
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const fmt = n => Math.round(n).toLocaleString('en-US');

function toast(msg, gold) {
  const box = document.getElementById('v2toast');
  const d = document.createElement('div');
  d.className = 'tst' + (gold ? ' gold' : '');
  d.textContent = msg;
  box.appendChild(d);
  setTimeout(() => d.remove(), 2500);
}

/* 扩展音效：复用原版 AudioContext，不干扰原版 beep
   音量系数恢复为 1（原先把整体压到 .55，导致扩展音效听起来"没声音"） */
const SFX_VOL = 1;

/* ---- 设置：全局音量 + 怪物生成速度乘区（独立于难度） --------------------- */
const SETKEY = 'sealV2Set';
let SET = (function () {
  try { return Object.assign({ vol: 1, spawnMul: 1 }, JSON.parse(localStorage.getItem(SETKEY) || '{}')); }
  catch (e) { return { vol: 1, spawnMul: 1 }; }
})();
const saveSET = () => { try { localStorage.setItem(SETKEY, JSON.stringify(SET)); } catch (e) { } };
let GAME_VOL = typeof SET.vol === 'number' ? Math.max(0, Math.min(1, SET.vol)) : 1;   // 总音量 0~1
let SPAWN_MUL = typeof SET.spawnMul === 'number' ? SET.spawnMul : 1;                 // 生成速度倍率
let TEST_MODE = SET.testMode === true;   // 测试版：所有皮肤免费试用

function sfx(freq, dur, type, vol, slideTo) {
  try {
    if (GAME_VOL <= 0) return;
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, actx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), actx.currentTime + dur);
    g.gain.setValueAtTime((vol || .1) * SFX_VOL * GAME_VOL, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  } catch (e) { }
}

/* M5c：音频解锁 —— 浏览器/微信强制要求「用户手势」后才能出声。
   原版没有这段逻辑，导致手机上首次点击前 AudioContext 处于 suspended、
   new Audio().play() 被静默拒绝 —— 表现就是「音效没了」。
   这里在首次任意手势时 resume 音频上下文，并预播一个静音样本打通播放权限。 */
let _audioUnlocked = false;
function unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended' && actx.resume) actx.resume();
  } catch (e) { }
  try {
    /* 用 0 音量的极短样本「预热」HTMLAudio 播放权限（iOS/微信必需） */
    const a = new Audio(EAT_SOUNDS[0]);
    a.volume = 0;
    const pr = a.play();
    if (pr && pr.then) pr.then(() => { try { a.pause(); } catch (e) { } }).catch(() => { });
  } catch (e) { }
}
['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(ev =>
  addEventListener(ev, unlockAudio, { once: false, passive: true }));

/* 开局音效：三声上行音阶（520 → 660 → 880 Hz），比死亡/胜利音更亮，作为开局提示 */
function playStartJingle() {
  if (GAME_VOL <= 0) return;
  sfx(520, .12, 'triangle', .18);
  setTimeout(() => sfx(660, .12, 'triangle', .18), 110);
  setTimeout(() => sfx(880, .22, 'triangle', .2), 220);
}

/* Boss 出场音效：来自抖音「原声」链接（2.7 秒，已内联为 base64） */
let _bossVoice = null;
function playBossVoice() {
  try {
    if (!_bossVoice) { _bossVoice = new Audio(BOSS_VOICE_SRC); _bossVoice.volume = .7; }
    _bossVoice.volume = .7 * GAME_VOL;
    _bossVoice.currentTime = 0;
    const pr = _bossVoice.play();
    if (pr && pr.catch) pr.catch(() => { });
  } catch (e) { }
}
/* ------------------------------------------------------------ 2. 存档 */
/* M8 存档健壮性加固：
   1) 双键备份 —— 主键写失败（配额满/隐私模式）自动落备份键，读时主键损坏回退备份键
   2) 版本号 —— 存档带 v 字段，读档校验结构（coins 非数字等）自动修复默认值
   3) 写入防抖 —— saveS 高频调用时 300ms 合并成一次真实 IO
   4) 兜底时机 —— 页面隐藏/关闭时立即 flush，结算/购买不丢档 */
const SKEY = 'sealV2', SKEY_BAK = 'sealV2_bak', SVER = 3;
const S_DEFAULT = { coins: 0, owned: ['classic'], equipped: 'classic', bossKilled: 0 };
function m8SanitizeS(raw) {
  const s = Object.assign({}, S_DEFAULT, raw && typeof raw === 'object' ? raw : {});
  if (!Array.isArray(s.owned) || !s.owned.length) s.owned = ['classic'];
  if (typeof s.coins !== 'number' || !isFinite(s.coins) || s.coins < 0) s.coins = 0;
  if (typeof s.equipped !== 'string' || !s.equipped) s.equipped = 'classic';
  if (typeof s.bossKilled !== 'number' || !isFinite(s.bossKilled) || s.bossKilled < 0) s.bossKilled = 0;
  s.v = SVER;
  return s;
}
function m8ReadKey(k) {
  try {
    const t = localStorage.getItem(k);
    if (!t) return null;
    const o = JSON.parse(t);
    return (o && typeof o === 'object') ? o : null;
  } catch (e) { return null; }
}
let S = (function () {
  /* 主键 → 备份键 → 默认值，逐级回退 */
  const raw = m8ReadKey(SKEY) || m8ReadKey(SKEY_BAK);
  return m8SanitizeS(raw);
})();
let _sSaveTimer = null, _sDirty = false;
function m8WriteNow() {
  const body = JSON.stringify(S);
  let ok = false;
  try { localStorage.setItem(SKEY, body); ok = true; } catch (e) { }
  if (!ok) {                                   // 主键失败（配额/隐私模式）→ 落备份键
    try { localStorage.setItem(SKEY_BAK, body); ok = true; } catch (e) { }
  } else {
    try { localStorage.setItem(SKEY_BAK, body); } catch (e) { }   // 正常时也同步备份
  }
  _sDirty = false;
}
const saveS = () => {
  _sDirty = true;
  if (_sSaveTimer) return;
  _sSaveTimer = setTimeout(() => { _sSaveTimer = null; m8WriteNow(); }, 300);
};
/* 页面隐藏/关闭：立即落盘，防止杀后台丢档 */
document.addEventListener('visibilitychange', () => { if (document.hidden && _sDirty) m8WriteNow(); });
window.addEventListener('pagehide', () => { if (_sDirty) m8WriteNow(); });
setInterval(() => { if (_sDirty) m8WriteNow(); }, 10000);    /* 长局保险丝 */

/* ------------------------------------------------------------ 2.5 云服务：登录 + 排行榜 */
const CLOUD = (typeof WorkBuddyCloud !== 'undefined' && WorkBuddyCloud.createWorkBuddyCloud)
  ? WorkBuddyCloud.createWorkBuddyCloud({
      endpoint: 'https://shenjin-seal.app.workbuddy.host',
      oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
      publishableKey: 'wbpk_Ix6GMyqXuLEc6KGYCRI2H9_63rfvkMY6hAJdzxxaGJfGIc9anWHl1OY'
    })
  : null;

let cloudUser = null;   // { name, avatarUrl } 当前登录用户（手机号）
let lbOv = null;        // 排行榜弹窗 DOM
let profOv = null;      // 个人资料弹窗 DOM

// 本地资料缓存（头像 dataURL + 名称，登录后立即显示，云端为准）
const PKEY = 'sealV2Profile';
let P = (function () {
  try { return Object.assign({ name: '', avatar: '' }, JSON.parse(localStorage.getItem(PKEY) || '{}')); }
  catch (e) { return { name: '', avatar: '' }; }
})();
const saveP = () => { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) { } };

function myDisplayName() { return (P.name || (cloudUser && cloudUser.name) || '玩家').slice(0, 12); }
function myAvatar() { return P.avatar || (cloudUser && cloudUser.avatarUrl) || ''; }

/* M8 云健壮性：网络请求加超时保护（弱网下 getSession/report 可能挂起几十秒） */
function cloudTimeout(promise, ms, tag) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(tag + ' timeout')), ms || 8000))
  ]);
}

async function refreshCloudUser() {
  if (!CLOUD) return;
  try {
    const { data: s, error } = await cloudTimeout(CLOUD.auth.getSession(), 8000, 'getSession');
    if (error || !s) { cloudUser = null; return; }
    const u = s.user || {};
    cloudUser = { id: u.id, name: u.name || '玩家', avatarUrl: u.avatarUrl || null };
    // 云端若返回了昵称/头像而本地还没有，就先采用
    if (u.name && !P.name) { P.name = u.name; saveP(); }
    if (u.avatarUrl && !P.avatar) { P.avatar = u.avatarUrl; saveP(); }
  } catch (e) { cloudUser = null; }   /* 超时/断网：静默降级为未登录，不阻塞游戏 */
}
/* 登录状态变化时同步 cloudUser（其他标签页登录/登出、token 刷新失败等场景） */
if (CLOUD && CLOUD.auth && CLOUD.auth.onAuthStateChange) {
  try {
    CLOUD.auth.onAuthStateChange(() => { refreshCloudUser().then(renderLoginBadge); });
  } catch (e) { }
}

// 登录弹窗（手机号 + 密码，游戏内完成，不跳转外站）
let loginOv = null;      // 登录/注册弹窗 DOM
let pendingOtp = null;   // 已发送验证码的上下文 { phone, verificationId, isExistingUser }
let otpTimer = null;     // 重发倒计时

async function cloudLogin() {
  if (!CLOUD) { toast('云服务未加载，请联网后重试'); return; }
  openLogin();
}

function openLogin() {
  if (loginOv) { loginOv.classList.remove('hidden'); document.documentElement.classList.add('v2scroll'); return; }
  const ov = el('div', 'loginOv', 'v2ov hidden');
  ov.id = 'loginOv';
  ov.innerHTML = '<h2>📱 账号登录</h2><div class="sub">手机号登录 · 全程在游戏内完成，不会跳转</div>' +
    '<div class="loginCard">' +
    '  <div class="login-tabs"><button class="login-tab on" data-t="in">登录</button><button class="login-tab" data-t="up">注册</button></div>' +
    '  <input class="loginInp" id="liPhone" type="tel" maxlength="11" placeholder="手机号">' +
    '  <input class="loginInp" id="liPwd" type="password" placeholder="密码">' +
    '  <div class="loginCode" id="liCodeRow" style="display:none">' +
    '    <input class="loginInp" id="liCode" type="tel" maxlength="6" placeholder="短信验证码">' +
    '    <button class="loginCodeBtn" id="liSend" type="button">获取验证码</button>' +
    '  </div>' +
    '  <div class="loginErr" id="liErr"></div>' +
    '  <button class="v2btn" id="liGo">登录</button>' +
    '  <button class="v2btn" id="liWx" style="background:linear-gradient(180deg,#3ddc84,#1fb25e);margin-top:8px">微信登录</button>' +
    '  <button class="v2btn" id="liClose">返回</button>' +
    '</div>';
  document.body.appendChild(ov);
  loginOv = ov;
  ov.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
  document.documentElement.classList.add('v2scroll');

  const phone = ov.querySelector('#liPhone');
  const pwd = ov.querySelector('#liPwd');
  const codeRow = ov.querySelector('#liCodeRow');
  const code = ov.querySelector('#liCode');
  const sendBtn = ov.querySelector('#liSend');
  const errBox = ov.querySelector('#liErr');
  const goBtn = ov.querySelector('#liGo');
  let mode = 'in';   // 'in' 登录 / 'up' 注册

  const err = m => { errBox.textContent = m || ''; };
  const switchTab = t => {
    mode = t;
    ov.querySelectorAll('.login-tab').forEach(x => x.classList.toggle('on', x.dataset.t === t));
    codeRow.style.display = (t === 'up') ? 'flex' : 'none';
    goBtn.textContent = (t === 'up') ? '注册并登录' : '登录';
    err('');
  };
  ov.querySelectorAll('.login-tab').forEach(t => t.onclick = () => switchTab(t.dataset.t));
  ov.querySelector('#liClose').onclick = () => { ov.classList.add('hidden'); document.documentElement.classList.remove('v2scroll'); };
  phone.addEventListener('input', () => err(''));

  /* M8：微信登录 —— 跳转微信授权（由云服务 OAuth 中转站托管），回跳后自动换取会话 */
  ov.querySelector('#liWx').onclick = async () => {
    err('');
    if (!CLOUD || !CLOUD.auth.signInWithOAuth) { err('当前环境不支持微信登录'); return; }
    const wxBtn = ov.querySelector('#liWx');
    wxBtn.disabled = true;
    try {
      const redirectTo = location.origin + location.pathname;
      const r = await cloudTimeout(CLOUD.auth.signInWithOAuth({ provider: 'wechat', redirectTo }), 12000, 'wx');
      if (r && r.error) { err('微信登录暂不可用：' + (r.error.message || '服务端未配置微信渠道')); wxBtn.disabled = false; return; }
      /* 成功时 SDK 已重定向（或返回授权 URL），这里兜底手动跳 */
      if (r && r.data && r.data.url) location.href = r.data.url;
    } catch (e) {
      err('微信登录暂不可用（' + (e.message || '网络异常') + '）');
      wxBtn.disabled = false;
    }
  };

  // 发送验证码（注册用）
  sendBtn.onclick = async () => {
    const p = phone.value.trim();
    if (!/^1\d{10}$/.test(p)) { err('请输入正确的 11 位手机号'); return; }
    sendBtn.disabled = true;
    try {
      const sent = await CLOUD.auth.sendOtp({ phone: p });
      if (sent.error) { err(sent.error.message || '验证码发送失败'); return; }
      pendingOtp = { phone: p, verificationId: sent.data.verificationId, isExistingUser: sent.data.isExistingUser };
      err('验证码已发送，请查收短信');
      let n = 60;
      otpTimer = setInterval(() => {
        n--;
        if (n <= 0) { clearInterval(otpTimer); sendBtn.disabled = false; sendBtn.textContent = '重新获取'; }
        else { sendBtn.textContent = n + 's'; }
      }, 1000);
    } catch (e) { err('验证码发送失败，请重试'); }
    finally { if (!otpTimer) sendBtn.disabled = false; }
  };

  // 登录 / 注册
  goBtn.onclick = async () => {
    const p = phone.value.trim();
    const pw = pwd.value;
    if (!/^1\d{10}$/.test(p)) { err('请输入正确的 11 位手机号'); return; }
    goBtn.disabled = true;
    try {
      if (mode === 'in') {
        if (!pw) { err('请输入密码'); return; }
        const { data, error } = await CLOUD.auth.signInWithPassword({ phone: p, password: pw });
        if (error) { err('登录失败：' + (error.message || '手机号或密码错误')); return; }
      } else {
        if (!pendingOtp || pendingOtp.phone !== p) { err('请先获取验证码'); return; }
        if (!code.value.trim()) { err('请输入短信验证码'); return; }
        if (!pw || pw.length < 6) { err('请设置至少 6 位密码'); return; }
        const completed = await CLOUD.auth.verifyOtp({
          phone: pendingOtp.phone,
          verificationId: pendingOtp.verificationId,
          isExistingUser: pendingOtp.isExistingUser,
          token: code.value.trim(),
          password: pw,
        });
        if (completed.error) { err(completed.error.message || '注册失败'); return; }
      }
      // 成功：刷新会话并进入
      pendingOtp = null;
      if (otpTimer) { clearInterval(otpTimer); otpTimer = null; }
      await refreshCloudUser();
      renderLoginBadge();
      ov.classList.add('hidden');
      document.documentElement.classList.remove('v2scroll');
      toast(mode === 'in' ? '登录成功' : '注册成功，已自动登录');
    } catch (e) { err('操作失败，请重试'); }
    finally { goBtn.disabled = false; }
  };
}

async function cloudLogout() {
  if (!CLOUD) return;
  try { await CLOUD.auth.signOut(); } catch (e) { }
  cloudUser = null;
  renderLoginBadge();
}

// 无尽成绩上报（已登录才上报；每玩家只保留历史最佳；M8：失败自动重试 1 次）
async function reportEndlessScore(star, surviveSec, bossProgress, _retry) {
  if (!CLOUD || !cloudUser) return;
  try {
    const { data: s } = await cloudTimeout(CLOUD.auth.getSession(), 8000, 'report.getSession');
    if (!s) return;
    const name = myDisplayName();
    const avatar = myAvatar();
    // 查现有记录
    const { data: rows } = await CLOUD.database.from('endless_leaderboard')
      .select('id, best_star, best_survive, owner_name, avatar_url').eq('owner_id', s.user.id).maybeSingle();
    if (rows) {
      // 已存在：取历史最高更新（名称/头像每次都同步）
      const upd = { owner_name: name, avatar_url: avatar };
      if (star > (rows.best_star || 0)) upd.best_star = star;
      if (surviveSec > (rows.best_survive || 0)) upd.best_survive = surviveSec;
      if (star >= (rows.best_star || 0)) upd.boss_progress = bossProgress;
      await CLOUD.database.from('endless_leaderboard').update(upd).eq('id', rows.id);
    } else {
      // 新玩家：插入（owner_id 由 DEFAULT auth.uid() 填）
      await CLOUD.database.from('endless_leaderboard').insert({
        owner_name: name, avatar_url: avatar, best_star: star, best_survive: surviveSec, boss_progress: bossProgress
      });
    }
  } catch (e) {
    /* M8：失败自动重试 1 次（弱网下首次请求常被掐断），仍失败则静默 */
    if (!_retry) { setTimeout(() => { try { reportEndlessScore(star, surviveSec, bossProgress, true); } catch (e2) { } }, 4000); }
  }
}

// 读取排行榜（公开读）
async function fetchLeaderboard(kind) {
  if (!CLOUD) return [];
  try {
    const col = kind === 'star' ? 'best_star' : 'best_survive';
    const { data, error } = await CLOUD.database.from('endless_leaderboard')
      .select('owner_name, avatar_url, best_star, best_survive, boss_progress')
      .order(col, { ascending: false })
      .limit(50);
    if (error) return [];
    return data || [];
  } catch (e) { return []; }
}

function renderLoginBadge() {
  const e = document.getElementById('v2login');
  if (!e) return;
  if (cloudUser) {
    const av = myAvatar();
    e.innerHTML = (av ? '<img class="lgav" src="' + av + '">' : '👤') + ' ' + myDisplayName();
    e.classList.add('on');
  } else {
    e.innerHTML = '🔒 手机号登录';
    e.classList.remove('on');
  }
}

/* ------------------------------------------------------------ 3. 皮肤 */
const RARE = { 1: '普通', 2: '稀有', 3: '史诗', 4: '传说' };
const SKINS = [
  { id: 'classic', name: '经典海豹',    rare: 4, price: 0,    label: '原版形象',   src: null, hideInShop: true },
  { id: 'base',    name: '初始模型',    rare: 1, price: 200,  label: '你的原始模样', src: SKIN_SRC.base },
  { id: 'moyushuang', name: '魔芋爽',   rare: 1, price: 800,  label: '辣味开胃',   src: SKIN_SRC.moyushuang },
  { id: 'binghongcha', name: '冰红茶',  rare: 2, price: 1200, label: '冰力十足',   src: SKIN_SRC.binghongcha, glow: '#ffd54a' },
  { id: 'leshi',   name: '乐事薯片',    rare: 2, price: 2000, label: '超值分享',   src: SKIN_SRC.leshi, glow: '#ff6ec7' },
  { id: 'gaodengshuxue', name: '高等数学', rare: 3, price: 2500, label: '上册 第八版', src: SKIN_SRC.gaodengshuxue, glow: '#6ee7a0' },
  { id: 'xiandaishuxue', name: '线性代数', rare: 3, price: 3500, label: '第六版 同济', src: SKIN_SRC.xiandaishuxue, glow: '#b388ff' },
  { id: 'jiahao',  name: '嘉豪',        rare: 3, price: 5000, label: '黑色宽松 T',  src: SKIN_SRC.jiahao, glow: '#9fb4ff' },
  { id: 'naiyu',   name: '奶鱼',        rare: 4, price: 8000, label: '贝壳上衣+鱼尾', src: SKIN_SRC.naiyu, glow: '#3ddc97', bossReq: 1 },
  { id: 'xiangjiao', name: '香蕉',      rare: 4, price: 10000, label: '香蕉皮尾巴', src: SKIN_SRC.xiangjiao, glow: '#ffd23f', bossReq: 2 },
  { id: 'wjh',     name: 'wjh',         rare: 4, price: 15000, label: '终极形态', src: SKIN_SRC.wjh, glow: '#9fb4ff', bossReq: 3 }
];
const skinById = id => SKINS.find(s => s.id === id) || SKINS[0];

/* 皮肤贴图 + 原版海豹贴图 的统一度量（用于等比绘制） */
const _metric = {};
function metric(img) {
  if (!img || !img.complete || !img.naturalWidth) return null;
  const key = img.src.length + ':' + img.src.slice(-48);
  if (_metric[key]) return _metric[key];
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  let a = 1e9, b = -1, cc = 1e9, d = -1;
  try {
    const px = x.getImageData(0, 0, c.width, c.height).data;
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) {
      if (px[(y * c.width + xx) * 4 + 3] > 60) {
        if (xx < a) a = xx; if (xx > b) b = xx; if (y < cc) cc = y; if (y > d) d = y;
      }
    }
  } catch (e) { }
  if (b < 0) { a = 0; b = c.width - 1; cc = 0; d = c.height - 1; }
  const m = { img, w: c.width, h: c.height, bx: a, by: cc, bw: b - a + 1, bh: d - cc + 1 };
  m.cx = a + m.bw / 2; m.cy = cc + m.bh / 2;
  m.size = Math.sqrt(m.bw * m.bh);              // 视觉尺度基准
  _metric[key] = m;
  return m;
}

/* 皮肤图片预载 */
SKINS.forEach(sk => {
  if (sk.src) { sk.img = new Image(); sk.img.src = sk.src; }
});
const CLASSIC_IMG = sealImg;                       // 原版玩家海豹

function equippedImg() {
  const sk = skinById(S.equipped);
  if (sk.id === 'classic') return CLASSIC_IMG;
  return sk.img && sk.img.complete && sk.img.naturalWidth ? sk.img : CLASSIC_IMG;
}

/* --------------------------------------------- 4. 局内状态（每次开局重置） */
const UPGRADES = [
  { id: 'giant',  ic: '◉', name: '巨化',     d: '体型立刻 +12%' },
  { id: 'swift',  ic: '➤', name: '疾风',     d: '游动速度 +20%' },
  { id: 'magnet', ic: '◎', name: '吸星',     d: '附近小鱼自动被吸过来' },
  { id: 'devour', ic: '▲', name: '暴食',     d: '能吃掉更大的奶龙' },
  { id: 'combo',  ic: '✦', name: '连击大师', d: '吃鱼积分 ×2 / ×3 / ×4' },
  { id: 'vigor',  ic: '✚', name: '疗愈',     d: '立刻回复 30 滴血 + 3 秒无敌' },
  { id: 'charge', ic: '↻', name: '闪充',     d: '技能冷却 −2 秒' },
  { id: 'harvest', ic: '✳', name: '丰收',    d: '每次吃鱼额外 +1 经验' },
  { id: 'wave',   ic: '〜', name: '水波强化', d: '水波每次伤害 +7 滴' }
];

let V = null;   // v2 局内状态
let GAME_MODE = 'normal';   // 'normal' | 'endless'（普通 / 无尽）
let CUR_DIFF = 'hard';      // 当前难度键 'easy' | 'hard' | 'hell'（无尽模式积分倍率用）
/* M4：各难度初始血量（M5c 改：统一 100 滴，难度只影响积分/成长不影响血量） */
const DIFF_HP = { easy: 100, hard: 100, hell: 100 };
function diffStartHp() {
  return DIFF_HP[CUR_DIFF] || 100;
}
function newV() {
  const hp0 = diffStartHp();
  V = {
    lvl: 1, exp: 0, expNeed: 10, pendingLv: 0,
    up: { giant: 0, swift: 0, magnet: 0, devour: 0, combo: 0, charge: 0, harvest: 0, wave: 0 },
    coinsRun: 0, combo: 0, comboT: 0, maxCombo: 0,
    hp: hp0, maxHp: hp0,          /* M4：血量制生命（M5c 统一 100 滴） */
    dashT: 0, dashCd: 0, dashX: 1, dashY: 0,
    spinT: 0, spinCd: 0,            /* M5：旋转水波技能（动画剩余时间 / 冷却） */
    eatCount: 0,
    bosses: [], bossIdx: -1, bossDone: 0, trig: [false, false, false],
    endless: { star: 0, round: 0, roundDone: 0, lastPick: -1, active: false, pendingWave: 0, nextWaveAt: 0 },
    bullets: [], waves: [], curves: [], parts: [],
    mathFn: -1,   /* M2：高数 Boss 当前循环的函数编号（-1 = 尚未随机） */
    prevScore: 0, prevLives: (typeof lives === 'number' ? lives : 3),
    hurtFlash: 0, surviveT: 0,
    /* M6：皮肤专属技能状态（道具动画 / 护盾 / 缩小 / 气泡 / 弹丸） */
    m6Item: null, m6Shield: 0, m6ShieldFx: 0, m6ShrinkT: 0, m6BubbleT: 0,
    m6Shots: [], m6MinR: 26, m6PreR: 26,
    m6ClearT: 0, m6ClearR: 0,  /* M7：wjh 清屏冲击环剩余时间 / 半径 */
    clearCd: 0                 /* M7：清屏独立冷却（60 秒） */
  };
}
newV();

/* ------------------------------------------------------------ 5. Boss 配置 */
const BOSS_SIZE = 112;          // 三个 Boss 体型统一
const BOSS_DEFS = [
  { key: 'dj', name: '袋鼠 DJ', sub: '音响三兄弟', orb: '音响', orbIc: '♪', orbC: '#ff4d6d',
    sprite: 'BOSS_IMG', r: BOSS_SIZE, speed: 42, atkCd: 5, atk: 'ring', dmg: 14, hp: 80, reward: 100, orbCoin: 30,
    line: '◆ 袋鼠 DJ 登场！吃掉它的 3 个音响！' },
  { key: 'moyu', name: '魔芋爽辣王', sub: '辣味地狱', orb: '辣条', orbIc: '🌶', orbC: '#ff3b30',
    sprite: BOSS2_SRC, r: BOSS_SIZE, speed: 50, atkCd: 2.9, atk: 'spread', dmg: 7, hp: 120, reward: 200, orbCoin: 50,
    line: '◆ 魔芋爽辣王来了！用旋转水波打掉它的 120 血！' },
  { key: 'math', name: '高数压轴', sub: '期末第八版', orb: '课本', orbIc: '📖', orbC: '#4cc9f0',
    sprite: BOSS3_SRC, r: BOSS_SIZE, speed: 58, atkCd: 4, atk: 'curve', dmg: 7, hp: 160, reward: 300, orbCoin: 80,
    line: '◆ 高数压轴登场！小心它的函数引力线！撞掉它的 160 血！' }
];
/* ---- M2：辣条子弹贴图（V2_LATIAO_SRC 由 HTML 素材块注入） ---- */
const LATIAO_IMG = new Image();
if (typeof V2_LATIAO_SRC === 'string' && V2_LATIAO_SRC) LATIAO_IMG.src = V2_LATIAO_SRC;

/* ---- M4：Boss3 重做 —— 积分号弹幕贴图 + 拉人/弹幕参数 ------------------
   技能循环：函数线条把玩家从远处拉过来（拉拽期间每秒扣 5 滴），
   玩家被拉近 Boss（靠近"课本"= Boss 本体一定范围）后 Boss 改发弹幕：
   积分号贴图横着发出、360° 旋转、碰到扣 10 滴。 */
const INTEGRAL_IMG = new Image();
if (typeof V2_INTEGRAL_SRC === 'string' && V2_INTEGRAL_SRC) INTEGRAL_IMG.src = V2_INTEGRAL_SRC;
const MATH3 = {
  beamCd: 6,          // 拉人技能冷却（秒）
  beamSpeed: 150,     // 拉拽速度（px/s，放慢 → 拉拽时间更长，每秒扣血累计更多）
  beamDps: 4,         // 拉拽期间每秒扣血（M11：5 → 4）
  pullStop: 150,      // 拉到距离 Boss 这么近停住（"课本"范围）
  danmakuCd: 2,       // 弹幕波次间隔（M11：1.6 → 2.0）
  danmakuDmg: 7,      // 每个积分号伤害（M11：10 → 7）
  danmakuSpd: 240     // 弹幕速度
};

/* ---- M2：函数轨迹目录（高数压轴） --------------------------------------
   每次攻击若尚未选函数则随机取一个，之后一直循环同一条函数图像。
   pts 为归一化采样点（最大半径≈1），step 为平均段长（推进用）。 ---- */
function _fnSample(n, f, scale) {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const v = f(i / n);
    p.push([v[0] * scale, v[1] * scale]);
  }
  let step = 0;
  for (let i = 1; i < p.length; i++) step += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return { pts: p, step: step / n };
}
const FN_CURVES = [
  { name: '阿基米德螺线', s: _fnSample(300, k => { const th = k * 6 * Math.PI, r = k; return [Math.cos(th) * r, Math.sin(th) * r]; }, 1) },
  { name: '对数螺线', s: _fnSample(300, k => { const th = k * 4 * Math.PI, r = Math.exp(1.25 * k) / Math.exp(1.25); return [Math.cos(th) * r, Math.sin(th) * r]; }, 1) },
  { name: '双曲螺线', s: _fnSample(300, k => { const th = .55 + k * (6 * Math.PI - .55), r = .55 / th; return [Math.cos(th) * r, Math.sin(th) * r]; }, 1) },
  { name: '圆的渐开线', s: _fnSample(260, k => { const t = k * 2 * Math.PI, d = 2 * Math.PI; return [(Math.cos(t) + t * Math.sin(t)) / d, (Math.sin(t) - t * Math.cos(t)) / d]; }, 1) },
  { name: '摆线（旋轮线）', s: _fnSample(320, k => { const t = k * 4 * Math.PI; return [(t - Math.sin(t)) / (4 * Math.PI) - .5, (1 - Math.cos(t)) / 2 - .5]; }, 1.6) },
  { name: '星形线', s: _fnSample(260, k => { const t = k * 2 * Math.PI; return [Math.pow(Math.cos(t), 3), Math.pow(Math.sin(t), 3)]; }, 1) },
  { name: '三叶玫瑰线', s: _fnSample(240, k => { const t = k * Math.PI, r = Math.cos(3 * t); return [Math.cos(t) * r, Math.sin(t) * r]; }, 1) },
  { name: '四叶玫瑰线', s: _fnSample(280, k => { const t = k * 2 * Math.PI, r = Math.sin(2 * t); return [Math.cos(t) * r, Math.sin(t) * r]; }, 1) },
  { name: '双纽线', s: (function () { const p = []; for (let i = 0; i <= 160; i++) { const th = -Math.PI / 4 + i / 160 * (Math.PI / 2), r = Math.sqrt(Math.max(0, Math.cos(2 * th))); p.push([Math.cos(th) * r, Math.sin(th) * r]); } for (let i = 0; i <= 160; i++) { const th = 3 * Math.PI / 4 + i / 160 * (Math.PI / 2), r = Math.sqrt(Math.max(0, -Math.cos(2 * th))); p.push([Math.cos(th) * r, Math.sin(th) * r]); } let st = 0; for (let i = 1; i < p.length; i++) st += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return { pts: p, step: st / p.length }; })() },
  { name: '心脏线', s: _fnSample(280, k => { const t = k * 2 * Math.PI, r = 1 - Math.cos(t); return [Math.cos(t) * r / 2, Math.sin(t) * r / 2]; }, 1) }
];
const _bossImgCache = {};
function bossImg(def) {
  const src = def.sprite;
  if (src === 'BOSS_IMG') return BOSS_IMG;
  if (!_bossImgCache[def.key]) { const im = new Image(); im.src = src; _bossImgCache[def.key] = im; }
  return _bossImgCache[def.key];
}

/* ------------------------------------------------------------ 6. DOM 注入 */
function el(tag, id, cls, html) {
  const e = document.createElement(tag);
  if (id) e.id = id; if (cls) e.className = cls; if (html != null) e.innerHTML = html;
  return e;
}
// HUD 扩展
const hud2 = el('div', 'v2hud');
hud2.innerHTML =
  '<div class="pill">积分 <b id="v2coin">0</b><span id="lvt">Lv.1</span></div>' +
  '<div class="pill">连击 <b id="v2combo">0</b></div>';
document.body.appendChild(hud2);
const bossbar = el('div', 'bossbar');
bossbar.innerHTML = '<div class="nm"><span id="bbname">Boss</span><span class="tag" id="bbtag">剩 3 / 3</span></div>' +
  '<div class="bar"><i id="bbfill"></i><span class="bnum" id="bbnum">100 / 100</span></div>';
document.body.appendChild(bossbar);
const dashbtn = el('div', 'dashbtn', null, '<div style="display:grid;place-items:center"><b>冲刺</b><span>双击/点此</span></div>');
document.body.appendChild(dashbtn);
document.body.appendChild(el('div', 'v2toast'));
/* M4：玩家血条 + 进化技能栏（左下角） */
const hpbox = el('div', 'hpbox');
hpbox.innerHTML = '<div class="hptop"><span>生命</span><b id="hpnum">100 / 100</b></div>' +
  '<div class="hpbar"><i id="hpfill"></i><span class="hpnum" id="hpnum2">100 / 100</span></div>';
document.body.appendChild(hpbox);
const upbox = el('div', 'upbox');
document.body.appendChild(upbox);

// 开始界面加「皮肤商店」按钮
const shopBtn = el('button', 'shopBtn', 'v2btn ghost', '◉ 皮肤商店');
shopBtn.style.position = 'fixed'; shopBtn.style.marginTop = '0';
startScreen.appendChild(shopBtn);

// 商店 overlay
const shop = el('div', 'shopOv', 'v2ov hidden');
shop.innerHTML = '<h2>皮肤商店</h2><div class="sub">吃掉奶龙赚积分，解锁新皮肤 · 皮肤只改外观不影响数值</div>' +
  '<div id="shopGrid"></div>' +
  '<div style="margin-top:14px;font-size:13px;color:#9fc0d4">当前积分 <b id="shopCoin" style="color:#ffd54a;font-size:17px">0</b></div>' +
  '<button class="v2btn" id="shopClose">返回</button>';
document.body.appendChild(shop);

// 进化 overlay
const lvov = el('div', 'lvOv', 'v2ov hidden');
lvov.innerHTML = '<h2>进 化</h2><div class="sub">选择一项强化，本局永久生效<br>' +
  '<b style="color:#ffd54a">◉ 选卡期间无敌 · 选完还有 1.6 秒保护</b></div>' +
  '<div id="lvCards"></div><div style="margin-top:14px;font-size:12px;color:#9fc0d4" id="lvTip"></div>';
document.body.appendChild(lvov);

// ---- 设置按钮（右上角齿轮，主流游戏位置） ----
const setBtn = el('button', 'setBtn', null, '⚙');
document.body.appendChild(setBtn);

// ---- 设置面板 ----
const setOv = el('div', 'setOv', 'v2ov hidden');
setOv.innerHTML =
  '<h2>设 置</h2><div class="sub">音量与怪物生成速度，改动即时生效并自动保存</div>' +
  '<div class="row"><div class="lab"><span>🔊 游戏音量</span><b id="volVal">100%</b></div>' +
  '<input type="range" id="volRange" min="0" max="100" step="5" value="100">' +
  '<div class="hint">控制所有音效（吃鱼、冲刺、Boss、死亡/胜利音）</div></div>' +
  '<div class="row"><div class="lab"><span>👾 怪物生成速度</span><b id="spawnVal">1.0×</b></div>' +
  '<div class="seg" id="spawnSeg">' +
  '<button data-s="0.5">0.5×</button><button data-s="0.8">0.8×</button><button data-s="1">1.0×</button>' +
  '<button data-s="1.2">1.2×</button><button data-s="1.5">1.5×</button><button data-s="2">2.0×</button>' +
  '</div>' +
  '<div class="hint">独立于难度：最终生成率 = 难度基础值 × 此倍率</div></div>' +
  '<div class="row"><div class="lab"><span>🧪 版本切换</span></div>' +
  '<div class="seg" id="verSeg">' +
  '<button data-v="normal">正式版</button><button data-v="test">测试版</button>' +
  '</div>' +
  '<div class="hint">测试版：所有皮肤免费试用（不扣积分、无需击败 Boss），正式版恢复原价</div></div>' +
  '<div class="row btnrow3">' +
  '<button id="setRestart">↻ 重新开始</button>' +
  '<button id="setResume">▶ 继续游戏</button>' +
  '<button id="setHome">⌂ 回主界面</button></div>' +
  '<div class="row" id="setBackRow" style="display:none">' +
  '<button id="setBack" style="width:100%;padding:11px 0;font-size:14px;font-weight:800;border:none;border-radius:12px;cursor:pointer;background:linear-gradient(180deg,#ffd54a,#ffb02e);color:#3d2a00">返回</button></div>';
document.body.appendChild(setOv);

shopBtn.onclick = () => { renderShop(); shop.classList.remove('hidden'); };
document.getElementById('shopClose').onclick = () => shop.classList.add('hidden');
setBtn.onclick = () => {
  // 主界面时只显示「返回」；游戏中显示三个功能按钮（与游戏中设置区分）
  const inGame = state !== 'menu';
  document.querySelector('#setOv .btnrow3').style.display = inGame ? 'flex' : 'none';
  document.getElementById('setBackRow').style.display = inGame ? 'none' : 'block';
  setOv.classList.remove('hidden');
};

/* ---- 设置面板三个功能按钮：重新开始 / 继续游戏 / 回主界面 ---- */
document.getElementById('setRestart').onclick = () => {
  setOv.classList.add('hidden');
  start();
};
document.getElementById('setResume').onclick = () => setOv.classList.add('hidden');
document.getElementById('setHome').onclick = () => {
  setOv.classList.add('hidden');
  bossbar.classList.remove('on');
  overScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  state = 'menu';
  reset();
};
document.getElementById('setBack').onclick = () => setOv.classList.add('hidden');

/* ---- 设置面板交互：音量 + 生成速度 ---------------------------------------- */
(function initSettings() {
  const volRange = document.getElementById('volRange');
  const volVal = document.getElementById('volVal');
  const spawnVal = document.getElementById('spawnVal');
  const spawnSeg = document.getElementById('spawnSeg');
  const verSeg = document.getElementById('verSeg');

  // 版本切换（正式版 / 测试版）
  function refreshVerSeg() {
    verSeg.querySelectorAll('button').forEach(b =>
      b.classList.toggle('on', (b.dataset.v === 'test') === TEST_MODE));
  }
  refreshVerSeg();
  verSeg.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      TEST_MODE = b.dataset.v === 'test';
      SET.testMode = TEST_MODE; saveSET();
      // 切回正式版：若当前装备的是测试版试用的皮肤，回退到已拥有的
      if (!TEST_MODE && !S.owned.includes(S.equipped)) {
        S.equipped = S.owned[0] || 'classic'; saveS();
      }
      refreshVerSeg();
      toast(TEST_MODE ? '🧪 已切换到测试版：皮肤免费试用' : '已切换到正式版', TEST_MODE);
      renderShop();
      sfx(TEST_MODE ? 760 : 480, .08, 'triangle', .07);
    });
  });

  // 初始化：回显已保存的值
  volRange.value = Math.round(GAME_VOL * 100);
  volVal.textContent = Math.round(GAME_VOL * 100) + '%';
  spawnVal.textContent = (SPAWN_MUL % 1 === 0 ? SPAWN_MUL + '.0' : SPAWN_MUL) + '×';
  spawnSeg.querySelectorAll('button').forEach(b => {
    b.classList.toggle('on', +b.dataset.s === SPAWN_MUL);
  });

  // 音量滑块
  volRange.addEventListener('input', () => {
    GAME_VOL = +volRange.value / 100;
    SET.vol = GAME_VOL;
    saveSET();
    volVal.textContent = volRange.value + '%';
  });

  // 生成速度倍率
  spawnSeg.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      SPAWN_MUL = +b.dataset.s;
      SET.spawnMul = SPAWN_MUL;
      saveSET();
      spawnSeg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      spawnVal.textContent = (SPAWN_MUL % 1 === 0 ? SPAWN_MUL + '.0' : SPAWN_MUL) + '×';
    });
  });
})();

/* ---- 开始界面重排 V0.4：三个主按钮（普通游戏 / 无尽模式 / 皮肤商店） ---------
   点「普通游戏」或「无尽模式」先弹出难度选择，选中难度后立即开局；
   两种模式共用一套难度，但积分倍率不同（普通 1/1.5/2，无尽 2/2.5/3）。 */
(function buildMenu() {
  const diffRow = document.getElementById('diffRow');
  if (diffRow) {
    const lab = diffRow.previousElementSibling;       // 「选择难度」那行小字
    if (lab && lab.tagName === 'P') lab.style.display = 'none';
    diffRow.style.display = 'none';
  }
  const menu = el('div', 'v2menu');
  const normalBtn = el('button', 'normalBtn', 'mbtn', '▶ 普通游戏');
  const endlessBtn = el('button', 'endlessBtn', 'mbtn', '∞ 无尽模式');
  const skinBtn2 = el('button', 'skinBtn2', 'mbtn', '◉ 皮肤商店');
  const lbBtn = el('button', 'lbBtn', 'mbtn', '🏆 排行榜');
  menu.appendChild(normalBtn); menu.appendChild(endlessBtn); menu.appendChild(skinBtn2); menu.appendChild(lbBtn);
  // 登录徽章（右上角）
  const loginBadge = el('button', 'v2login', null, '🔒 手机号登录');
  startScreen.appendChild(loginBadge);
  const panel = el('div', 'diffPanel');
  const panelTitle = el('div', 'diffTitle', null, '选择难度');
  panel.appendChild(panelTitle);
  panel.innerHTML += '<button class="dbtn" data-d="easy">简单</button>' +
    '<button class="dbtn" data-d="hard">困难</button>' +
    '<button class="dbtn" data-d="hell">地狱</button>';
  startScreen.appendChild(menu);
  startScreen.appendChild(panel);
  let pendingMode = 'normal';   // 当前展开难度面板的模式

  // 原来的皮肤商店按钮移进按钮组（复用同一套商店逻辑）
  shopBtn.style.position = 'static'; shopBtn.style.marginTop = '0';
  shopBtn.style.display = 'none';

  normalBtn.onclick = () => {
    pendingMode = 'normal';
    panelTitle.textContent = '普通游戏 · 选择难度';
    panel.classList.toggle('open');
    sfx(520, .06, 'triangle', .06);
  };
  endlessBtn.onclick = () => {
    pendingMode = 'endless';
    panelTitle.textContent = '无尽模式 · 选择难度（积分 ×2.0~×3.0）';
    panel.classList.toggle('open');
    sfx(760, .06, 'triangle', .06);
  };
  panel.querySelectorAll('.dbtn').forEach(b => {
    b.addEventListener('click', () => {
      cfg = DIFFS[b.dataset.d];
      CUR_DIFF = b.dataset.d;
      GAME_MODE = pendingMode;                         // 由哪个主按钮打开就进哪个模式
      panel.classList.remove('open');
      sfx(660, .08, 'triangle', .07);
      start();
    });
  });
  skinBtn2.onclick = () => { renderShop(); shop.classList.remove('hidden'); };
  // 登录 / 排行榜（登录后点徽章 → 个人资料面板）
  loginBadge.onclick = () => { cloudUser ? openProfile() : cloudLogin(); };
  lbBtn.onclick = () => openLeaderboard();
  renderLoginBadge();
  // 点击面板外收起难度面板
  startScreen.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== normalBtn && e.target !== endlessBtn) panel.classList.remove('open');
  });
})();

/* ---- 个人资料面板 ------------------------------------------------------- */
// 选图 → 居中裁剪 96×96 → JPEG dataURL（排行榜公开读，直接存库即可显示）
function pickAvatar() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = ev => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = c.height = 96;
          const g = c.getContext('2d');
          const s = Math.min(img.width, img.height);
          g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 96, 96);
          P.avatar = c.toDataURL('image/jpeg', .82);
          saveP();
          renderLoginBadge();
          const a = profOv && profOv.querySelector('.profAva');
          if (a) { a.innerHTML = ''; a.style.backgroundImage = 'url(' + P.avatar + ')'; a.style.backgroundSize = 'cover'; }
          toast('头像已更新，记得保存资料');
        } catch (e) { toast('图片处理失败，换一张试试'); }
      };
      img.src = ev.target.result;
    };
    rd.readAsDataURL(f);
  };
  inp.click();
}

// 保存资料：写本地缓存 + 同步云端排行榜行（无行则建）
async function saveProfile() {
  const nameEl = profOv && profOv.querySelector('#profName');
  if (nameEl) P.name = (nameEl.value || '').trim().slice(0, 12);
  saveP();
  renderLoginBadge();
  if (!CLOUD || !cloudUser) { toast('资料已保存'); closeProfile(); return; }
  try {
    const { data: s } = await CLOUD.auth.getSession();
    if (!s) { toast('登录已过期，请重新登录'); return; }
    const { data: rows } = await CLOUD.database.from('endless_leaderboard')
      .select('id').eq('owner_id', s.user.id).maybeSingle();
    const payload = { owner_name: myDisplayName(), avatar_url: myAvatar() };
    if (rows) await CLOUD.database.from('endless_leaderboard').update(payload).eq('id', rows.id);
    else await CLOUD.database.from('endless_leaderboard')
      .insert(Object.assign(payload, { best_star: 0, best_survive: 0, boss_progress: 0 }));
    toast('资料已保存并同步到排行榜');
  } catch (e) { toast('云端同步失败，本地已保存'); }
  closeProfile();
}

function closeProfile() {
  if (profOv) profOv.classList.add('hidden');
  document.documentElement.classList.remove('v2scroll');
}

async function openProfile() {
  if (!cloudUser) { cloudLogin(); return; }
  if (profOv) {
    profOv.classList.remove('hidden');
    document.documentElement.classList.add('v2scroll');
    refreshProfileStats();
    return;
  }
  const ov = el('div', 'profOv', 'v2ov hidden');
  ov.id = 'profOv';
  ov.innerHTML = '<h2>👤 我的资料</h2>' +
    '<div class="profCard">' +
    '  <div class="profAva" id="profAva"></div>' +
    '  <div class="profAvaHint">点头像更换（可从手机相册选图）</div>' +
    '  <input class="profName" id="profName" maxlength="12" placeholder="输入名称（12 字以内）">' +
    '  <div class="profStats" id="profStats">加载中…</div>' +
    '  <div class="profBtns">' +
    '    <button class="v2btn" id="profSave">保存</button>' +
    '    <button class="v2btn" id="profLogout">退出登录</button>' +
    '    <button class="v2btn" id="profClose">返回</button>' +
    '  </div>' +
    '</div>';
  document.body.appendChild(ov);
  profOv = ov;
  const ava = ov.querySelector('#profAva');
  const paintAva = () => {
    const a = myAvatar();
    if (a) { ava.innerHTML = ''; ava.style.backgroundImage = 'url(' + a + ')'; ava.style.backgroundSize = 'cover'; }
    else { ava.style.backgroundImage = 'none'; ava.textContent = '🦭'; }
  };
  paintAva();
  ov.querySelector('#profName').value = P.name || cloudUser.name || '';
  ava.onclick = pickAvatar;
  ov.querySelector('#profSave').onclick = saveProfile;
  ov.querySelector('#profClose').onclick = closeProfile;
  ov.querySelector('#profLogout').onclick = async () => { await cloudLogout(); closeProfile(); };
  ov.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
  document.documentElement.classList.add('v2scroll');
  refreshProfileStats();
}

// 战绩 + 排名（表小，直接全量取回本地算排名）
async function refreshProfileStats() {
  const box = profOv && profOv.querySelector('#profStats');
  if (!box || !CLOUD) return;
  box.innerHTML = '<div class="srow">加载中…</div>';
  let mine = null, all = [];
  try {
    const { data: s } = await CLOUD.auth.getSession();
    if (!s) { box.innerHTML = '<div class="srow">登录已过期，请重新登录</div>'; return; }
    const { data } = await CLOUD.database.from('endless_leaderboard')
      .select('owner_id, best_star, best_survive, boss_progress');
    all = data || [];
    mine = all.find(r => r.owner_id === s.user.id) || null;
  } catch (e) { box.innerHTML = '<div class="srow">战绩读取失败，请稍后再试</div>'; return; }
  const star = (mine && mine.best_star) || 0;
  const surv = (mine && mine.best_survive) || 0;
  const starRank = star > 0 ? all.filter(r => (r.best_star || 0) > star).length + 1 : '—';
  const survRank = surv > 0 ? all.filter(r => (r.best_survive || 0) > surv).length + 1 : '—';
  box.innerHTML =
    '<div class="srow"><span>⭐ 最高星数</span><b>' + star + '</b></div>' +
    '<div class="srow"><span>🏅 星数排名</span><b>' + starRank + (starRank !== '—' ? (' / ' + all.length) : '') + '</b></div>' +
    '<div class="srow"><span>⏱ 最长存活</span><b>' + fmtTime(surv) + '</b></div>' +
    '<div class="srow"><span>🏅 存活排名</span><b>' + survRank + (survRank !== '—' ? (' / ' + all.length) : '') + '</b></div>' +
    '<div class="srow"><span>🐉 Boss 进度</span><b>' + ((mine && mine.boss_progress) || 0) + '</b></div>';
}

/* ---- 排行榜弹窗 --------------------------------------------------------- */
function openLeaderboard() {
  if (!CLOUD) { toast('云服务未加载，请联网后重试'); return; }
  if (lbOv) { lbOv.classList.remove('hidden'); loadLb('star'); return; }
  const ov = el('div', 'lbOv', 'v2ov hidden');
  ov.innerHTML = '<h2>🏆 无尽排行榜</h2><div class="sub">无尽模式 · 历史最佳成绩（登录后成绩才会记录）</div>' +
    '<div class="lb-tabs"><button class="lb-tab on" data-k="star">⭐ 星数榜</button>' +
    '<button class="lb-tab" data-k="survive">⏱ 存活时间榜</button></div>' +
    '<div class="lb-list" id="lbList">加载中…</div>' +
    '<div class="lb-me" id="lbMe"></div>' +
    '<button class="v2btn" id="lbClose">返回</button>';
  document.body.appendChild(ov);
  lbOv = ov;
  ov.querySelector('#lbClose').onclick = () => ov.classList.add('hidden');
  ov.querySelectorAll('.lb-tab').forEach(t => {
    t.onclick = () => {
      ov.querySelectorAll('.lb-tab').forEach(x => x.classList.remove('on'));
      t.classList.add('on');
      loadLb(t.dataset.k);
    };
  });
  ov.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
  loadLb('star');
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60), s = sec % 60;
  return (m > 0 ? m + ' 分 ' : '') + s + ' 秒';
}

async function loadLb(kind) {
  const list = document.getElementById('lbList');
  const me = document.getElementById('lbMe');
  if (!list) return;
  const rows = await fetchLeaderboard(kind);
  if (!rows.length) { list.innerHTML = '<div class="lb-empty">暂无数据，快来创造纪录吧！</div>'; if (me) me.innerHTML = ''; return; }
  const isStar = kind === 'star';
  let html = '<div class="lb-head"><span>名次</span><span>玩家</span><span>' + (isStar ? '星数' : '存活') + '</span><span>Boss</span></div>';
  rows.forEach((r, i) => {
    const name = (r.owner_name || '玩家');
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
    const av = r.avatar_url
      ? '<img src="' + r.avatar_url + '" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:-5px;margin-right:4px">'
      : '';
    html += '<div class="lb-row' + (i < 3 ? ' top' : '') + '">' +
      '<span class="lb-rank">' + medal + '</span>' +
      '<span class="lb-name">' + av + name + '</span>' +
      '<span class="lb-val">' + (isStar ? ('★ ' + r.best_star) : fmtTime(r.best_survive)) + '</span>' +
      '<span class="lb-boss">' + (r.boss_progress > 0 ? ('第 ' + r.boss_progress + ' Boss') : '—') + '</span></div>';
  });
  list.innerHTML = html;
  if (me && cloudUser) {
    me.innerHTML = '👤 你已登录：' + (cloudUser.name || '玩家') + '（成绩会在无尽模式死亡后自动上榜）';
  } else if (me) {
    me.innerHTML = '🔒 未登录：手机号登录后，无尽成绩才能上榜';
  }
}


/* ---- 面板滚动支持 ---------------------------------------------------------
   原版给 html,body 设了 touch-action:none + overflow:hidden，并且在 window 上
   挂了 touchmove 的 preventDefault（用来控制海豹）。这两条叠加会让面板完全滑不动。
   这里只做两件事，不碰原版一行代码：
   ① 面板打开时给 <html> 加 v2scroll，放开 touch-action；
   ② 在面板上截住 touchmove，不让它冒泡到 window 触发 preventDefault。 */
[shop, lvov, setOv].forEach(ov => {
  ov.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
  new MutationObserver(() => {
    const anyOpen = !shop.classList.contains('hidden') || !lvov.classList.contains('hidden') || !setOv.classList.contains('hidden');
    document.documentElement.classList.toggle('v2scroll', anyOpen);
  }).observe(ov, { attributes: true, attributeFilter: ['class'] });
});

function renderShop() {
  document.getElementById('shopCoin').textContent = fmt(S.coins);
  const g = document.getElementById('shopGrid');
  g.innerHTML = SKINS.filter(sk => !sk.hideInShop).map(sk => {
    const have = S.owned.includes(sk.id);
    const on = S.equipped === sk.id;
    const bossMet = !sk.bossReq || (S.bossKilled || 0) >= sk.bossReq;
    const testFree = TEST_MODE && !have;                 // 测试版：未拥有的皮肤免费试用
    let price;
    if (have) price = `<div class="p own">✓ ${on ? '使用中' : '点击装备'}</div>`;
    else if (testFree) price = `<div class="p own">🧪 测试版 · 免费试用</div>`;
    else if (sk.price === 0) price = `<div class="p own">免费</div>`;
    else if (sk.bossReq) price = `<div class="p">◇ ${fmt(sk.price)}${bossMet ? '' : ` · 需击败 ${sk.bossReq} Boss`}</div>`;
    else price = `<div class="p">◇ ${fmt(sk.price)}</div>`;
    const focus = (S.equipped === 'classic' && sk.id === 'classic') ? CLASSIC_IMG : sk.img;
    const thumb = sk.id === 'classic'
      ? `<img src="${CLASSIC_IMG.src}" alt="">`
      : (sk.src ? `<img src="${sk.src}" alt="">` : '');
    return `<div class="skcard ${on ? 'on' : ''} ${(!have && !testFree && sk.bossReq && !bossMet) ? 'locked' : ''}" data-sk="${sk.id}">
      ${on ? '<div class="rib">使用中</div>' : `<div class="rr">${RARE[sk.rare]}</div>`}
      ${thumb}<div class="n">${sk.name}</div><div class="l">${sk.label}</div>${price}</div>`;
  }).join('');
  g.querySelectorAll('[data-sk]').forEach(c => {
    c.onclick = () => clickSkin(c.dataset.sk);
  });
}
function clickSkin(id) {
  const sk = skinById(id);
  if (S.owned.includes(id)) { S.equipped = id; saveS(); sfx(660, .1, 'triangle', .08); toast('已装备：' + sk.name, true); renderShop(); return; }
  if (TEST_MODE) {   // 测试版：免费直接装备（不写入正式版存档的已购列表）
    S.equipped = id; saveS(); sfx(880, .12, 'triangle', .1);
    toast('🧪 测试版已装备：' + sk.name, true); renderShop(); return;
  }
  if (sk.bossReq && (S.bossKilled || 0) < sk.bossReq) { toast('需击败 ' + sk.bossReq + ' 个 Boss 才能解锁'); return; }
  if (S.coins < sk.price) { toast('积分不足，还差 ' + fmt(sk.price - S.coins)); return; }
  S.coins -= sk.price; S.owned.push(id); S.equipped = id; saveS();
  sfx(880, .12, 'triangle', .1); toast('★ 解锁并装备：' + sk.name, true); renderShop();
  updateShopCoin();
}

/* ------------------------------------------------------------ 7. 冲刺 */
const DASH_INVULN = 3000;      // 冲刺无敌时长（3 秒）
let lastTap = 0;
function tryDashCore() {
  if (state !== 'playing' || !V) return;
  if (V.dashCd > 0) return;
  let dx = 0, dy = 0;
  if (pointer) { dx = pointer.x - player.x; dy = pointer.y - player.y; }
  const m = Math.hypot(dx, dy);
  if (m > 12) { dx /= m; dy /= m; } else { dx = player.dir > 0 ? 1 : -1; dy = 0; }
  V.dashX = dx; V.dashY = dy; V.dashT = 0.24;
  V.dashCd = Math.max(4, 10 - V.up.charge * 2);
  invincibleUntil = performance.now() + DASH_INVULN;
  sfx(300, .18, 'triangle', .1, 900);
  for (let i = 0; i < 16; i++) {
    V.parts.push({ x: player.x, y: player.y, vx: rnd(-160, 160) - dx * 200, vy: rnd(-160, 160) - dy * 200,
      r: rnd(3, 8), life: rnd(.25, .5), c: '#8fd6ff' });
  }
}
dashbtn.onclick = tryDash;

/* ============================================================ 12. M6 皮肤专属技能
   双击/冲刺按钮按所装备皮肤替换为专属技能（其他皮肤保持原版冲刺）：
   - 魔芋爽：掏出魔芋串吃掉 → 回 10 滴血（吃东西音效）
   - 冰红茶：掏出冰红茶喝掉 → 回 20 滴血（喝东西音效）
   - 乐事薯片：举薯片护盾 → 挡下下一次攻击（薯片碎音效）
   - 线性代数：头顶居中靠上冒出白底黑字气泡「QᴧQᵀ难。。我大脑要变小脑了」→ 缩成地图最小体型 10 秒
   - 嘉豪：拿枪射击最近 Boss → 一次 −10（开枪音效）
   - 奶鱼：拿金叉子射击最近 Boss → 一次 −15
   - 香蕉：扔香蕉砸最近 Boss → 一次 −20（扔东西音效）
   道具贴图大小约为玩家半个身子；冷却与原版冲刺共用（10 秒，闪充可减）。 */
const M6_SRC = window.V2_M6_SRC || {};
const M6_IMG = {};
for (const k in M6_SRC) { const im = new Image(); im.src = M6_SRC[k]; M6_IMG[k] = im; }

const M6_SKILLS = {
  moyushuang:    { kind: 'heal',  heal: 10, item: 'moyu',   snd: 'eat',   btn: '吃魔芋' },
  binghongcha:   { kind: 'heal',  heal: 20, item: 'icetea', snd: 'drink', btn: '喝红茶' },
  leshi:         { kind: 'shield',                                        btn: '薯片盾' },
  xiandaishuxue: { kind: 'shrink',                                        btn: '变小' },
  jiahao:        { kind: 'shoot', dmg: 15, item: 'gun',    snd: 'gun',   btn: '射击' },
  naiyu:         { kind: 'shoot', dmg: 20, item: 'fork',   snd: 'gun',   btn: '叉击' },
  xiangjiao:     { kind: 'shoot', dmg: 25, item: 'banana', snd: 'throw', btn: '扔香蕉' },
  wjh:           { kind: 'clear',                                        btn: '清屏' }
};

/* M6 音效合成（WebAudio 现场合成，无需外链素材）：
   噪声爆发 = 枪声 / 薯片碎；三连下滑音 = 咕嘟喝水；扫频+气流 = 扔出 */
function playNoise(dur, vol, fc) {
  try {
    if (GAME_VOL <= 0) return;
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const n = Math.max(1, Math.floor(actx.sampleRate * dur));
    const buf = actx.createBuffer(1, n, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = actx.createBufferSource(); src.buffer = buf;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fc || 1400;
    const g = actx.createGain(); g.gain.value = (vol || .3) * GAME_VOL;
    src.connect(f); f.connect(g); g.connect(actx.destination);
    src.start();
  } catch (e) { }
}
function playGun()     { playNoise(.22, .5, 3200); sfx(120, .18, 'square', .25, 45); }
function playCrunch()  { playNoise(.18, .45, 2200); setTimeout(() => playNoise(.12, .3, 1600), 90); }
function playDrink()   { for (let i = 0; i < 3; i++) setTimeout(() => sfx(320 - i * 60, .12, 'sine', .16, 200 - i * 40), i * 170); }
function playThrowSnd(){ sfx(700, .25, 'sine', .14, 160); playNoise(.12, .12, 900); }
function playM6Snd(kind) {
  if (kind === 'eat') { try { playEat(); } catch (e) { } }
  else if (kind === 'drink') playDrink();
  else if (kind === 'gun') playGun();
  else if (kind === 'throw') playThrowSnd();
}

function m6StartSkill() {
  const skl = M6_SKILLS[S.equipped];
  if (!skl) { tryDashCore(); return; }
  if (state !== 'playing' || !V || !player) return;
  /* M9b：清屏走独立冷却，必须在 dashCd 拦截之前判断，否则冲刺冷却会误拦清屏 */
  if (skl.kind === 'clear') {
    if ((V.clearCd || 0) > 0) return;
    V.clearCd = CLEAR_CD;
    m6ClearScreen();
    return;
  }
  if (V.dashCd > 0) return;
  if (skl.kind === 'shield' && V.m6Shield > 0) { toast('🛡 薯片护盾已在生效中', true); return; }
  if (skl.kind === 'shrink' && V.m6ShrinkT > 0) { toast('已经够小了……', true); return; }
  V.dashCd = Math.max(4, 10 - V.up.charge * 2);
  if (skl.kind === 'heal') {
    V.m6Item = { id: skl.item, t: .9, dur: .9, heal: skl.heal };
    playM6Snd(skl.snd);
  } else if (skl.kind === 'shield') {
    V.m6Shield = 2;                      // M6b：两片薯片，各挡一次
    V.m6Item = { id: 'chip', t: .8, dur: .8, hold: true };
    playCrunch();
    toast('🛡 薯片护盾展开：两侧各抵挡 1 次攻击', true);
  } else if (skl.kind === 'shrink') {
    V.m6PreR = player.r;
    player.r = Math.max(12, V.m6MinR * .55);   // M6b：比地图最小尺寸更小
    V.m6ShrinkT = 10;
    V.m6BubbleT = 4;
    /* M6b：变小期间 10 秒无敌金身（与缩小同步结束） */
    V.m6PreInvuln = invincibleUntil;
    invincibleUntil = performance.now() + 10000;
    sfx(880, .3, 'sine', .12, 220);
    toast('✦ 金身无敌 10 秒！趁机苟住', true);
  } else   if (skl.kind === 'shoot') {
    playM6Snd(skl.snd);
    V.m6Item = { id: skl.item, t: .7, dur: .7, shoot: true };
    let tx = null, ty = null, best = 1e9;
    for (const B of V.bosses) {
      const d = Math.hypot(B.x - player.x, B.y - player.y);
      if (d < best) { best = d; tx = B.x; ty = B.y; }
    }
    let dx, dy;
    if (tx !== null) { dx = tx - player.x; dy = ty - player.y; }
    else if (pointer) { dx = pointer.x - player.x; dy = pointer.y - player.y; }
    else { dx = player.dir; dy = 0; }
    const m = Math.hypot(dx, dy) || 1;
    V.m6Shots.push({ x: player.x, y: player.y, vx: dx / m * 620, vy: dy / m * 620,
      dmg: skl.dmg, life: 2.2, item: skl.item, rot: Math.atan2(dy, dx) });
  } else if (skl.kind === 'clear') {
    m6ClearScreen();
  }
}
function tryDash() { m6StartSkill(); }

/* ============================================================ M7 wjh 皮肤专属技能：清屏
   效果：瞬间抹掉当前页面里的所有生物（地图上的鱼群），并清空场上弹幕/音浪/函数线。
   注意：不清 Boss —— Boss 保留，需正常打到血量为 0 才能击败。
   视觉：以玩家为中心扩散的白金色冲击环 + 白闪 + 大量迸散粒子。
   冷却 60 秒（独立冷却，与原版冲刺不再共用）。 */
const CLEAR_CD = 60;                 // M7：清屏冷却 60 秒
function m6ClearScreen() {
  if (state !== 'playing' || !V || !player) return;
  /* 1) 清掉当前页面上的所有生物（鱼群） */
  let cleared = 0;
  try {
    if (typeof fishes !== 'undefined' && fishes && fishes.length) {
      cleared = fishes.length;
      fishes.length = 0;
    }
  } catch (e) { }
  /* 2) 场上敌对弹幕/音浪/曲线也一并抹掉（属于"当前页面"的骚扰物） */
  V.bullets.length = 0;
  V.waves.length = 0;
  V.curves.length = 0;
  /* M9：视野内的 Boss 也一并清掉 —— 直接血量清零走 defeatBoss 正常结算；
     屏幕外的 Boss 保留，追上去再清 */
  let bossKilled = 0;
  const vx0 = cam.x - 60, vx1 = cam.x + innerWidth + 60;
  const vy0 = cam.y - 60, vy1 = cam.y + innerHeight + 60;
  for (const B of V.bosses.slice()) {
    if (B.x + B.r > vx0 && B.x - B.r < vx1 && B.y + B.r > vy0 && B.y - B.r < vy1) {
      damageBoss(B, B.hp + 1, 'clear');
      bossKilled++;
    }
  }
  /* 3) 视觉与音效：扩散冲击环 + 白闪 + 迸散粒子 */
  V.m6ClearT = 1.0;
  V.m6ClearR = Math.max(W, H) * 1.25;
  V.hurtFlash = Math.max(V.hurtFlash || 0, .35);
  try {
    sfx(160, .35, 'sawtooth', .18, 2400);
    setTimeout(() => { try { sfx(980, .25, 'sine', .12, 120); } catch (e) { } }, 120);
    playNoise(.3, .35, 6000);
  } catch (e) { }
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * TAU, sp = rnd(220, 900);
    V.parts.push({
      x: player.x, y: player.y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: rnd(2, 7), life: rnd(.45, .95),
      c: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? '#ffe9a8' : '#9fd8ff')
    });
  }
  toast('✧ wjh 清屏！清掉 ' + cleared + ' 只生物' + (bossKilled ? ' · 清掉 ' + bossKilled + ' 个视野内 Boss' : '') + '，冷却 60 秒', true);
}

/* M6 状态推进：道具动画计时 / 缩小恢复 / 弹丸飞行与命中 */
function updateM6(dt) {
  if (V.m6Item) { V.m6Item.t -= dt; if (V.m6Item.t <= 0) V.m6Item = null; }
  if (V.m6ShieldFx > 0) V.m6ShieldFx -= dt;
  if (V.m6BubbleT > 0) V.m6BubbleT -= dt;
  if (V.m6ClearT > 0) V.m6ClearT -= dt;   /* M7：wjh 清屏冲击环 */
  if (V.clearCd > 0) V.clearCd -= dt;     /* M7：清屏独立冷却 60 秒 */
  if (V.m6ShrinkT > 0) {
    V.m6ShrinkT -= dt;
    if (V.m6ShrinkT <= 0) {
      V.m6ShrinkT = 0;
      player.r = V.m6PreR;
      /* 金身随缩小一起结束（只回收本技能给的那段无敌，不覆盖其他来源的无敌） */
      try { invincibleUntil = Math.min(invincibleUntil, performance.now() + 800); } catch (e) { }
      toast('终于缓过来了，变回原来的大小', true);
    }
  }
  /* 吃/喝回血：道具递到嘴边（动画中点）时生效一次 */
  if (V.m6Item && V.m6Item.heal && !V.m6Item.applied && V.m6Item.t <= V.m6Item.dur * .5) {
    V.m6Item.applied = true;
    V.hp = Math.min(V.maxHp, V.hp + V.m6Item.heal);
    updateHud();
    toast('♥ 回复 ' + V.m6Item.heal + ' 滴血', true);
    for (let i = 0; i < 14; i++) V.parts.push({ x: player.x, y: player.y, vx: rnd(-90, 90), vy: rnd(-140, -30), r: rnd(2, 5), life: rnd(.4, .8), c: '#7dff9a' });
  }
  /* 弹丸：飞行 → 撞 Boss 结算伤害 */
  for (let i = V.m6Shots.length - 1; i >= 0; i--) {
    const s = V.m6Shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    let hit = false;
    for (const B of V.bosses) {
      if (Math.hypot(B.x - s.x, B.y - s.y) < B.r * .55 + 14) { damageBoss(B, s.dmg, 'm6'); hit = true; break; }
    }
    if (hit || s.life <= 0) {
      if (hit) {
        for (let k = 0; k < 12; k++) V.parts.push({ x: s.x, y: s.y, vx: rnd(-180, 180), vy: rnd(-180, 180), r: rnd(2, 5), life: rnd(.25, .5), c: '#ffd54a' });
        playCrunch();
      }
      V.m6Shots.splice(i, 1);
    }
  }
}

/* M6 世界层绘制：护盾 / 使用中道具 / 飞行弹丸（世界坐标，画在 Boss 层里） */
function drawM6World(t) {
  if (!V || !player) return;
  const p = player;
  const drawSpr = (id, x, y, sz, rot, alpha) => {
    const im = M6_IMG[id];
    if (!(im && im.complete && im.naturalWidth)) return;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(im, -sz / 2, -sz / 2, sz, sz);
    ctx.restore();
  };
  /* 薯片护盾：身体两侧各一片，随剩余次数消失；碎裂期渐隐 */
  if (V.m6Shield > 0 || V.m6ShieldFx > 0) {
    const a = V.m6Shield > 0 ? .95 : Math.max(0, V.m6ShieldFx / .7);
    const bob = Math.sin(t / 220) * 3;
    /* 两侧各一片：右侧（朝向侧）+ 左侧 */
    const sides = [1, -1];
    for (let si = 0; si < sides.length; si++) {
      const sgn = sides[si];
      if (V.m6Shield <= 0 && si === 1) break;         // 只剩 1 片时只画一片
      drawSpr('chip', p.x + sgn * p.r * .95, p.y - p.r * .25 + bob,
        p.r * 1.5, sgn * (Math.PI / 2) + Math.sin(t / 300) * .12, a);
    }
    if (V.m6Shield > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,220,120,.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.55 + Math.sin(t / 260) * 2, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }
  /* 使用中的道具：吃/喝递向嘴边，举枪/叉微抬起 */
  if (V.m6Item) {
    const pr = 1 - V.m6Item.t / V.m6Item.dur;
    const sz = p.r * 1.15;                                   // ≈半个身子
    const rise = V.m6Item.hold ? 0 : pr * p.r * .5;
    const a = V.m6Item.hold || pr < .8 ? 1 : (1 - pr) * 5;
    const rot = V.m6Item.shoot ? -.35 : Math.sin(t / 160) * .1;
    drawSpr(V.m6Item.id, p.x + p.r * .8, p.y - p.r * .2 - rise + Math.sin(t / 250) * 2, sz, rot, a);
  }
  /* M7：wjh 清屏冲击环 —— 以玩家为中心向外扩散的金白双环 */
  if (V.m6ClearT > 0) {
    const pr = 1 - V.m6ClearT / 1.0;                 // 0 → 1
    const ease = 1 - Math.pow(1 - pr, 2.2);
    const rad = ease * (V.m6ClearR || Math.max(W, H) * 1.25);
    const fade = Math.max(0, 1 - pr * 1.1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    /* 外环：金 */
    ctx.globalAlpha = fade * .9;
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 10 * fade + 2;
    ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 26;
    ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, TAU); ctx.stroke();
    /* 内环：白，滞后一点 */
    const rad2 = rad * .82;
    ctx.globalAlpha = Math.max(0, fade - .12) * .85;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5 * fade + 1;
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(p.x, p.y, rad2, 0, TAU); ctx.stroke();
    /* 中心余晖 */
    const cg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.4);
    cg.addColorStop(0, 'rgba(255,255,255,' + (fade * .55) + ')');
    cg.addColorStop(1, 'rgba(255,235,170,0)');
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  /* 飞行弹丸 */
  for (const s of V.m6Shots) drawSpr(s.item, s.x, s.y, p.r * .9, s.rot, 1);
}

/* M6 白底黑字气泡（屏幕坐标，居中靠上）：线性代数「变小」时吐槽 */
function drawM6Bubble() {
  if (!V || V.m6BubbleT <= 0) return;
  const a = Math.min(1, V.m6BubbleT / .4);
  const vw = innerWidth, vh = innerHeight;
  const bw = Math.min(430, vw * .78), bh = 62;
  const x = vw / 2 - bw / 2, y = vh * .15;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.strokeStyle = 'rgba(40,40,60,.85)'; ctx.lineWidth = 2;
  const r = 16;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + bw, y, x + bw, y + bh, r);
  ctx.arcTo(x + bw, y + bh, x, y + bh, r);
  ctx.arcTo(x, y + bh, x, y, r);
  ctx.arcTo(x, y, x + bw, y, r);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(vw / 2 - 9, y + bh - 1); ctx.lineTo(vw / 2 + 9, y + bh - 1); ctx.lineTo(vw / 2, y + bh + 14);
  ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill();
  ctx.fillStyle = '#141420';
  ctx.font = '900 17px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('QᴧQᵀ难。。我大脑要变小脑了', vw / 2, y + bh / 2);
  ctx.restore();
}

/* 移动端浏览器会在 touchstart 后补发合成的 mousedown，
   一次点按被计成两次「tap」，导致单击就触发冲刺。
   这里记录最近一次触摸时间，忽略其后 600ms 内的合成鼠标事件。 */
let lastTouchTap = 0;
function tapDash(e) {
  const n = performance.now();
  if (e.type === 'touchstart') lastTouchTap = n;
  else if (n - lastTouchTap < 600) return; // 触摸合成的 mousedown，跳过
  if (n - lastTap < 280) tryDash();
  lastTap = n;
}
/* 技能按钮（右下角，冲刺按钮上方）：显示冷却，点按直接释放水波 */
const spinbtn = el('div', 'spinbtn', null, '<div style="display:grid;place-items:center"><b>水波</b><span>单击屏幕</span></div>');
document.body.appendChild(spinbtn);
spinbtn.onclick = trySpinAttack;
/* M6b 修复 BUG1 / M10：tapAttack 只在游戏中且未点到 UI 时生效；
   触摸监听改到下方（touchend 判定），此处只保留桌面鼠标。 */

/* ------------------------------------------------------------ 7.5 旋转水波（M5b 近战攻击技能）
   参考视频：海豹原地绕纵轴快速自转，身上缠出两条青色螺旋水带（前后分层产生缠绕感），
   伴随上升气泡与白色碎浪。近战范围：仅贴身小半径内 Boss 各扣 5 滴血。
   冷却 8 秒；单击与双击（冲刺）靠 300ms 停顿区分。 */
/* M11 平衡：原 5 伤害 / 8 秒冷却，打 Boss1 需要 20 次、约 160 秒，手感过苦。
   调整为 12 伤害 / 5.5 秒冷却，命中半径略放宽，让水波成为真正能推进血线的主力技能 */
const SPIN_ATK = { cd: 5.5, dmg: 12, dur: .78 };
let tapTimer = 0;
function trySpinAttack() {
  if (state !== 'playing' || !V || !player) return;
  if (V.spinCd > 0) return;
  V.spinCd = SPIN_ATK.cd;
  V.spinT = SPIN_ATK.dur;
  const R = player.r * 2.5 + 48;          // M11：近战半径略放宽（原 2.2r+36，贴脸才打得中）
  /* M6b：水波强化进化 —— M11：每级 +7 滴伤害（原 +5） */
  const dmg = SPIN_ATK.dmg + (V.up.wave || 0) * 7;
  sfx(560, .45, 'sine', .12, 160);
  sfx(300, .5, 'triangle', .07, 420);
  let hitCnt = 0;
  for (const B of V.bosses.slice()) {
    if (Math.hypot(B.x - player.x, B.y - player.y) < R + B.r * .5) {
      damageBoss(B, dmg, 'spin'); hitCnt++;
    }
  }
  if (hitCnt) toast('〜 水波命中 ' + hitCnt + ' 个 Boss −' + dmg, true);
}
/* 螺旋水带：每条带绕身体约一圈，前侧段画亮色（back=false，画在身体之上），
   背侧段画半透明暗色（back=true，画在身体之下）→ 形成缠绕身体的立体感 */
function drawSpinRibbon(pr, back) {
  const A = player.r * 1.55, yT = -player.r * 1.35, yB = player.r * 1.45;
  for (let s = 0; s < 2; s++) {
    const th0 = pr * TAU * 2.2 + s * Math.PI;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 28; i++) {
      const u = i / 28;
      const th = th0 + u * TAU * .9;
      if ((Math.cos(th) < 0) === back) { started = false; continue; }
      const x = Math.sin(th) * A;
      const y = yT + u * (yB - yT);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = back ? 'rgba(130,215,250,.45)' : 'rgba(150,238,255,.95)';
    ctx.lineWidth = back ? 4 : 8;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(110,215,255,1)'; ctx.shadowBlur = back ? 6 : 18;
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (!back) {                          // 前侧带的白色碎浪高光
      ctx.strokeStyle = 'rgba(245,253,255,.75)';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
  }
}
/* 上升气泡 + 白色泡沫：围绕海豹螺旋外扩、向上飘散，随动画进度渐隐 */
function drawSpinBubbles(pr) {
  const a0 = 1 - pr;
  if (a0 <= 0) return;
  for (let k = 0; k < 10; k++) {
    const th = k * .63 + pr * 5;
    const rr = player.r * (1.15 + pr * 1.7);
    const bx = Math.cos(th) * rr;
    const by = Math.sin(th) * rr * .45 - pr * 75 - k * 2.5;
    const a = a0 * .8;
    const br = 2 + (k % 3) * 1.6;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU);
    ctx.fillStyle = 'rgba(200,238,255,' + (a * .3).toFixed(3) + ')';
    ctx.fill();
    ctx.strokeStyle = 'rgba(228,248,255,' + a.toFixed(3) + ')';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}
/* M6b 修复 BUG1：原来 tapAttack 无差别监听全局 mousedown/touchstart，
   点「开始游戏」、点进化卡、点商店/设置都会顺带触发水波。
   现在只在「游戏中」且「没有点到任何 UI 控件」时才判定为单击屏幕。
   M10：手机端「拖动移动误触攻击」修复 —— 触摸改为 touchend 判定，
   必须「位移 < TAP_MAX_MOVE 且时长 < TAP_MAX_MS」才算点按；按住拖动只是移动。 */
const TAP_MAX_MOVE = 16;     // 允许的手指抖动（CSS px）
const TAP_MAX_MS = 230;      // 点按最长时长
let tStartX = 0, tStartY = 0, tStartT = 0, tDragged = false, tOnUi = false;

function isUiTarget(t) {
  if (!t || !t.closest) return false;
  return !!t.closest('#startScreen,#overScreen,#lvCards,#lvov,#shopOv,#setOv,.v2ov,#dashbtn,#spinbtn,#panel,#shopBtn,#diffPanel');
}
/* 一次有效点按：280ms 内第二下 = 冲刺，否则 300ms 后 = 水波 */
function handleTap() {
  const n = performance.now();
  if (n - lastTap < 280) {                       // 双击 → 冲刺（取消挂起的单击攻击）
    clearTimeout(tapTimer); tapTimer = 0;
    tryDash(); lastTap = 0;
    return;
  }
  lastTap = n;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => {
    tapTimer = 0;
    if (state === 'playing') trySpinAttack();     // 停顿期间若进了弹窗/结算，放弃这次攻击
  }, 300);
}
function tapAttack(e) {                          // 仅桌面鼠标走这里
  if (state !== 'playing') return;               // 菜单/进化/结算界面：不触发任何战斗操作
  if (isUiTarget(e.target)) return;              // 点在按钮/面板/卡牌上：交给控件自己处理
  const n = performance.now();
  if (n - lastTouchTap < 600) return;            // 触摸合成的 mousedown，跳过
  handleTap();
}
/* 触摸三段式：按下记起点 → 移动超阈值标记为拖动 → 抬起时只有「快速轻点」才算点击 */
addEventListener('touchstart', e => {
  const t = e.touches && e.touches[0]; if (!t) return;
  tStartX = t.clientX; tStartY = t.clientY; tStartT = performance.now();
  tDragged = false; tOnUi = isUiTarget(e.target);
}, { passive: true });
addEventListener('touchmove', e => {
  const t = e.touches && e.touches[0]; if (!t) return;
  if (Math.hypot(t.clientX - tStartX, t.clientY - tStartY) > TAP_MAX_MOVE) tDragged = true;
}, { passive: true });
addEventListener('touchend', () => {
  lastTouchTap = performance.now();              // 拦掉随后浏览器的合成 mousedown
  if (tOnUi || tDragged) return;                 // 点 UI / 拖动移动 → 不触发技能
  if (performance.now() - tStartT > TAP_MAX_MS) return;   // 长按 → 不算点击
  if (state !== 'playing') return;
  handleTap();
}, { passive: true });
addEventListener('mousedown', tapAttack);
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'shift') { e.preventDefault(); trySpinAttack(); }
  if (state === 'levelup' && ['1', '2', '3'].includes(k)) {
    const c = document.querySelectorAll('#lvCards .lvc'); const i = +k - 1;
    if (c[i]) c[i].click();
  }
});

/* ------------------------------------------------------------ 8. 进化 */
/* 升级无敌：选卡期间拉满无敌（世界本来就暂停，双保险），选完再给一段缓冲 */
const LV_INVULN_HOLD = 1e9;    // 选卡期间（等价于无限）
const LV_INVULN_AFTER = 1600;  // 选完回到游戏后的无敌缓冲（毫秒）
let lvInvulnBackup = 0;

function gainExp(n) {
  if (!V || V.lvl >= 9) return;
  V.exp += n;
  while (V.lvl < 9 && V.exp >= V.expNeed) {
    V.exp -= V.expNeed; V.lvl++;
    V.expNeed = Math.round(V.expNeed * 1.3) + 3;
    V.pendingLv++;
  }
  if (V.lvl >= 9) V.exp = 0;
  if (V.pendingLv > 0) openLv();
}
function openLv() {
  if (state !== 'playing') return;
  state = 'levelup';
  /* 升级期间无敌：弹窗时世界虽然已暂停，但「弹出瞬间」和「选完恢复的那一帧」
     玩家很可能正贴着大鱼/Boss，这里直接把无敌时间拉满，彻底断掉这种秒死。 */
  lvInvulnBackup = invincibleUntil;
  invincibleUntil = performance.now() + LV_INVULN_HOLD;
  renderLv();
  lvov.classList.remove('hidden');
}
function renderLv() {
  const pool = UPGRADES.slice(), picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  document.getElementById('lvCards').innerHTML = picks.map(u =>
    `<div class="lvc" data-u="${u.id}"><div class="ic">${u.ic}</div><div><b>${u.name}</b><span>${u.d}</span></div></div>`).join('');
  document.getElementById('lvTip').textContent = `等级 Lv.${V.lvl} · 还能进化 ${9 - V.lvl} 次（键盘 1/2/3 也可选择）`;
  document.querySelectorAll('#lvCards .lvc').forEach(e => { e.onclick = () => pickLv(e.dataset.u); });
}
function pickLv(id) {
  V.pendingLv--;
  if (V.pendingLv > 0) {                 // 还有升级待选：保持弹窗 + 保持无敌
    try { applyLv(id); } catch (e) { }
    renderLv();
    invincibleUntil = performance.now() + LV_INVULN_HOLD;
    return;
  }
  /* 先恢复好状态再应用强化 —— 即使某个强化出错，也不会卡在弹窗里 */
  lvov.classList.add('hidden');
  state = 'playing';
  lastV2 = performance.now();
  // 修复：选卡是用手/鼠标点的，pointer 停在卡片上——恢复后海豹会自动游过去。把目标拉回海豹自身
  if (player) { pointer.x = player.x; pointer.y = player.y; }
  const base = performance.now() + LV_INVULN_AFTER;
  invincibleUntil = base;
  try { applyLv(id); } catch (e) { }
  invincibleUntil = Math.max(invincibleUntil, base);  // 保留「铁壁」等给的更长无敌
}
function applyLv(id) {
  const u = V.up;
  if (id === 'giant')  { u.giant++;  player.r = Math.min(cfg.winSize * 1.05, player.r * 1.12); }
  if (id === 'swift')  { u.swift++; }
  if (id === 'magnet') { u.magnet++; }
  if (id === 'devour') { u.devour++; }
  if (id === 'combo')  { u.combo++; }
  /* M6b：疗愈 —— 改为回血 + 短无敌（不再回满）；M11：20 → 30 滴 */
  if (id === 'vigor')  {
    V.hp = Math.min(V.maxHp, V.hp + 30);
    lives = 1; updateHud();
    invincibleUntil = Math.max(invincibleUntil, performance.now() + 3000);
  }
  if (id === 'charge') { u.charge++; }
  if (id === 'harvest') { u.harvest++; }
  if (id === 'wave')   { u.wave++; }      /* M6b：水波强化（伤害在 trySpinAttack 里叠加） */
  const d = UPGRADES.find(x => x.id === id);
  sfx(880, .12, 'triangle', .1);
  toast('✦ 进化：' + d.name + '　' + d.d, true);
}

/* ------------------------------------------------------------ 9. Boss 逻辑 */
function spawnBoss(i) {
  const def = BOSS_DEFS[i];
  V.bossIdx = i;
  const fromLeft = Math.random() < .5;
  const boss = {
    def, t: 0, ph: 1, x: fromLeft ? -def.r * 1.6 : W + def.r * 1.6, y: rnd(H * .3, H * .7),
    r: def.r, atk: 2, hitT: 0,
    hp: def.hp, maxHp: def.hp,          /* M4：Boss 血量 */
    beam: null, beamStop: 0, danT: 0,   /* M4：Boss3 拉人 / 弹幕状态 */
    /* M9：方块系统全员回归 —— Boss1 三个外卖（吃完=击败）；
       Boss2 四个辣条方块 / Boss3 五个课本方块（全部吃完 → 扣掉 Boss 当前一半血量，方块稍后重生） */
    orbs: def.key === 'dj'
      ? [0, 1, 2].map(k => ({ alive: true, state: 'guarded', cyc: 2.6 + k * 1.3, r: 19,
          ang: k * TAU / 3, x: fromLeft ? -def.r * 1.6 : W + def.r * 1.6, y: H / 2 }))
      : def.key === 'moyu'
      ? [0, 1, 2, 3].map(k => ({ alive: true, state: 'guarded', cyc: 2.8 + k * 1.2, r: 18,
          ang: k * TAU / 4, x: fromLeft ? -def.r * 1.6 : W + def.r * 1.6, y: H / 2 }))
      : def.key === 'math'
      ? [0, 1, 2, 3, 4].map(k => ({ alive: true, state: 'guarded', cyc: 3 + k * 1.1, r: 18,
          ang: k * TAU / 5, x: fromLeft ? -def.r * 1.6 : W + def.r * 1.6, y: H / 2 }))
      : []
  };
  V.bosses.push(boss);
  bossbar.classList.add('on');
  document.getElementById('bbname').textContent = def.name + ' · ' + def.sub;
  document.getElementById('bbtag').textContent = '剩 ' + V.bosses.length + ' / ' + V.bosses.length;
  document.getElementById('bbfill').style.width = '100%';
  toast(def.line, true);
  playBossVoice();   /* Boss 出场音效 */
}

function updateBoss(dt) {
  if (!V.bosses.length) return;
  for (const B of V.bosses) updateBossOne(B, dt);
  // 弹幕（全局，与单个 Boss 无关，但原逻辑放在 updateBoss 里，这里独立处理一次）
  updateBullets(dt);
  /* M4：Boss 血条同步（血量最低者）+ 条内及时数字 */
  let low = V.bosses[0];
  for (const b of V.bosses) if (b.hp / b.maxHp < low.hp / low.maxHp) low = b;
  document.getElementById('bbfill').style.width = (low.hp / low.maxHp * 100).toFixed(1) + '%';
  const bn = document.getElementById('bbnum');
  if (bn) bn.textContent = Math.ceil(low.hp) + ' / ' + low.maxHp;
  document.getElementById('bbtag').textContent = '剩 ' + V.bosses.length + ' / ' + V.bosses.length;
}
function updateBossOne(B, dt) {
  const D = B.def;
  B.t += dt; if (B.hitT > 0) B.hitT -= dt;

  // 缓慢追踪玩家
  const tx = player.x + (player.dir > 0 ? -1 : 1) * 60, ty = player.y;
  const dx = tx - B.x, dy = ty - B.y, d = Math.hypot(dx, dy) || 1;
  const sp = D.speed + B.ph * 12;
  B.x += dx / d * sp * dt; B.y += dy / d * sp * dt;
  B.x = clamp(B.x, -B.r * .4, W + B.r * .4);
  B.y = clamp(B.y, B.r * .5, H - B.r * .5);

  // 核心物环绕（M9：按方块数量均分圆周，不再写死 3 个）
  B.orbs.forEach((o, k) => {
    if (!o.alive) return;
    const orbN = B.orbs.length || 1;
    o.ang += dt * (0.8 + B.ph * 0.12);
    const base = B.r * 0.95 + 30;
    const gx = B.x + Math.cos(o.ang + k * TAU / orbN) * base;
    const gy = B.y + Math.sin(o.ang + k * TAU / orbN) * base;
    let ox = gx, oy = gy;
    if (o.state === 'open') {
      ox = B.x + Math.cos(o.ang + k * TAU / orbN) * (base + 34);
      oy = B.y + Math.sin(o.ang + k * TAU / orbN) * (base + 26);
    }
    o.x += (ox - o.x) * Math.min(1, dt * 4);
    o.y += (oy - o.y) * Math.min(1, dt * 4);
    o.cyc -= dt;
    if (o.cyc <= 0) {
      if (o.state === 'guarded') { o.state = 'open'; o.cyc = 2.2; sfx(320, .25, 'sawtooth', .09, 90);
        toast('◆ ' + D.orb + '弹出！快去吃！', true); }
      else { o.state = 'guarded'; o.cyc = Math.max(2.4, 4.6 - B.ph * .5); }
    }
    const dd = Math.hypot(player.x - o.x, player.y - o.y);
    if (dd < player.r * .7 + o.r * .85) {
      if (o.state === 'open') eatOrb(o, B);
      else hitPlayer(D.orbDmg || D.dmg, true);
    }
  });

  /* M9：Boss2/3 方块全部吃完 → 结算已触发（见 eatOrb），这里负责 10 秒后重生方块，
     让「吃完减半血」可以反复触发 */
  if ((D.key === 'moyu' || D.key === 'math') && B.orbs.length) {
    if (B.orbs.every(o => !o.alive)) {
      if (B.orbRespawnAt === undefined) B.orbRespawnAt = B.t + 10;
      else if (B.t >= B.orbRespawnAt) {
        B.orbRespawnAt = undefined;
        const n = B.orbs.length;
        B.orbs.forEach((o, k) => { o.alive = true; o.state = 'guarded'; o.cyc = 2.8 + k * 1.1; });
        toast('◆ ' + D.name + ' 召回了新的' + D.orb + '！', true);
        sfx(500, .2, 'square', .08, 200);
      }
    }
  }

  // 攻击
  if (D.key !== 'math') {
    B.atk -= dt;
    if (B.atk <= 0) {
      B.atk = D.atkCd - Math.min(1, B.ph * .3);   // 相位最多压缩 1 秒，保证基础间隔（DJ 为 5s）
      if (D.atk === 'ring') {
        const n = 1 + B.ph;
        for (let i = 0; i < n; i++) setTimeout(() => {
          if (V && V.bosses.includes(B)) V.waves.push({ x: B.x, y: B.y, r: B.r * .5, sp: 300, dmg: 4 + B.ph * 1.5, a: 1, hit: false });
        }, i * 170);
      } else if (D.atk === 'spread') {
        const n = 7 + B.ph * 2, off = rnd(0, TAU);   /* M11：9+3ph → 7+2ph，手机屏上弹幕不再密不透风 */
        for (let i = 0; i < n; i++) {
          const a = off + i / n * TAU;
          V.bullets.push({ x: B.x, y: B.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210,
            r: 11, sp: 210, dmg: D.dmg, life: 5, homing: false, c: '#ff7a3d' });   /* M2：辣条比原子弹大一点 */
        }
      }
      beep('death');
    }
  } else {
    /* M4：高数压轴技能重做 ——
       ① 函数线条把玩家持续拉过来（拉拽期间每秒扣 5 滴），攻击范围为半个地图；
          只有「玩家受到攻击」或「玩家离开攻击范围」时才会停止；
       ② 玩家被拉近"课本"（Boss 本体）附近后改发弹幕：
          积分号贴图横着发出、飞行中 360° 旋转、碰到扣 10 滴。 */
    const pd = Math.hypot(player.x - B.x, player.y - B.y);
    /* 半个地图 = 世界对角线的一半（按当前视野推算，兼容任意分辨率） */
    const halfMap = Math.max(W, H) * .5;
    if (B.beam) {
      /* 拉拽中：持续把玩家朝 Boss 拽；受伤标记/超范围则中断 */
      const dx = B.x - player.x, dy = B.y - player.y, d = Math.hypot(dx, dy) || 1;
      if (d > MATH3.pullStop) {
        player.x = clamp(player.x + dx / d * MATH3.beamSpeed * dt, player.r, W - player.r);
        player.y = clamp(player.y + dy / d * MATH3.beamSpeed * dt, player.r, H - player.r);
        pointer.x = player.x; pointer.y = player.y;
      }
      B.beamTick -= dt;
      if (B.beamTick <= 0) { B.beamTick += 1; hitPlayer(MATH3.beamDps, true); }
      /* 玩家受击（beamHurt 由 hitPlayer 打标）或离开攻击范围 → 解除拉拽 */
      if (d <= MATH3.pullStop + 10 || d > halfMap || B.beamStop) {
        B.beam = null; B.beamStop = 0;
      }
    } else {
      B.beamCdT = (B.beamCdT === undefined ? MATH3.beamCd : B.beamCdT) - dt;
      if (B.beamCdT <= 0 && pd < halfMap) {
        B.beam = true; B.beamTick = .4;
        B.beamCdT = MATH3.beamCd;
        toast('§ 函数引力 · 被拉过去了！', true);
        sfx(150, .5, 'sawtooth', .1, 45);
      }
    }
    /* 弹幕：玩家靠近课本时触发，横着发一排积分号 */
    if (pd < MATH3.pullStop + 90) {
      B.danT -= dt;
      if (B.danT <= 0) {
        B.danT = MATH3.danmakuCd;
        const rows = 3, side = 260;
        for (let r = 0; r < rows; r++) {
          const y = B.y + (r - (rows - 1) / 2) * 56;
          for (const s of [-1, 1]) {
            V.bullets.push({
              x: B.x, y, vx: s * side, vy: rnd(-18, 18),
              r: 13, sp: side, dmg: MATH3.danmakuDmg, life: 4.5, homing: false,
              c: '#9fe0ff', integral: true, spin: rnd(0, TAU), spinV: (4.2 + rnd(0, 1.4)) * (Math.random() < .5 ? -1 : 1)
            });
          }
        }
        sfx(600, .18, 'square', .07, 220);
      }
    } else B.danT = Math.min(B.danT || 0, .5);
  }

  // 撞本体：M5 起撞击不掉血，只把玩家把弹开（伤害只来自声波/辣条/积分符号/函数触手/拉拽）
  const bd = Math.hypot(player.x - B.x, player.y - B.y);
  if (bd < B.r * .55 + player.r * .7) {
    pointer.x = clamp(pointer.x + (player.x - B.x) / bd * 90, 0, W);
    pointer.y = clamp(pointer.y + (player.y - B.y) / bd * 90, 0, H);
  }
}

/* M4：Boss 统一掉血入口（血量归零即击败；DJ 也保留吃完 3 个外卖直接击败） */
function damageBoss(B, dmg, why) {
  if (!V || !B || B.hp <= 0) return;
  B.hp = Math.max(0, B.hp - dmg);
  B.hitT = .35;
  sfx(420, .07, 'square', .05, 700);
  for (let q = 0; q < 8; q++) V.parts.push({
    x: B.x + rnd(-B.r * .5, B.r * .5), y: B.y + rnd(-B.r * .5, B.r * .5),
    vx: rnd(-160, 160), vy: rnd(-160, 160), r: rnd(2, 6), life: .35, c: '#ffd54a'
  });
  if (B.hp <= 0) defeatBoss(B);
}

function updateBullets(dt) {
  // 弹幕
  for (let i = V.bullets.length - 1; i >= 0; i--) {
    const b = V.bullets[i];
    b.life -= dt;
    if (b.life <= 0) { V.bullets.splice(i, 1); continue; }
    if (b.homing) {
      const ax = player.x - b.x, ay = player.y - b.y, ad = Math.hypot(ax, ay) || 1;
      b.vx += (ax / ad * b.sp - b.vx) * Math.min(1, dt * 1.5);
      b.vy += (ay / ad * b.sp - b.vy) * Math.min(1, dt * 1.5);
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.integral) b.spin += (b.spinV || 5) * dt;   /* M4：积分号弹幕 360° 旋转 */
    if (b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) { V.bullets.splice(i, 1); continue; }
    if (Math.hypot(b.x - player.x, b.y - player.y) < player.r * .68 + b.r * .8) {
      hitPlayer(b.dmg, true);
      for (let q = 0; q < 10; q++) V.parts.push({ x: b.x, y: b.y, vx: rnd(-140, 140), vy: rnd(-140, 140), r: rnd(2, 6), life: .4, c: b.c });
      V.bullets.splice(i, 1);
    }
  }
  // 音浪
  for (let i = V.waves.length - 1; i >= 0; i--) {
    const w = V.waves[i];
    w.r += w.sp * dt; w.a -= dt * .85;
    if (w.a <= 0) { V.waves.splice(i, 1); continue; }
    const wd = Math.hypot(player.x - w.x, player.y - w.y);
    if (!w.hit && Math.abs(wd - w.r) < player.r * .68 + 8) { w.hit = true; hitPlayer(w.dmg, true); }
  }
  /* M2：函数轨迹线（高数压轴）—— 头部沿函数曲线推进，整体朝玩家缓慢转向，
     穿透玩家后继续延伸；线段带寿命，随时间从尾部慢慢消失 */
  for (let i = V.curves.length - 1; i >= 0; i--) {
    const s = V.curves[i];
    s.t += dt; s.life -= dt;
    /* 跟踪玩家：基准角以有限转速朝玩家方向转 */
    const want = Math.atan2(player.y - s.hy, player.x - s.hx);
    let da = want - s.baseAng;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    s.baseAng += clamp(da, -.9 * dt, .9 * dt) * .55;
    /* 头部沿函数轨迹推进：acc 为归一化弧长进度 */
    if (s.done <= 0) {
      s.acc += s.speed * dt / s.sc;
      const fp = s.f.s.pts, target = Math.min(s.acc / s.f.s.step, fp.length - 1);
      while (s.idx < target) {
        s.idx++;
        const p = fp[Math.floor(s.idx)];
        const ca = Math.cos(s.baseAng), sa = Math.sin(s.baseAng);
        const wx = s.hx + (p[0] * ca - p[1] * sa) * s.sc;
        const wy = s.hy + (p[0] * sa + p[1] * ca) * s.sc;
        s.pts.push({ x: wx, y: wy, age: 0 });
      }
      if (s.idx >= fp.length - 1.01) s.done = .0001;   /* 单程画完（允许图像自我重叠） */
    } else {
      s.done += dt;                                     /* 画完后停留，等尾部消失 */
    }
    /* 线段寿命：从最老的一端开始慢慢消失 */
    for (let k = 0; k < s.pts.length; k++) s.pts[k].age += dt;
    while (s.pts.length && s.pts[0].age > s.fade) s.pts.shift();
    /* 穿透判定：抽点检测，命中后短暂冷却，曲线不消失继续延伸 */
    s.cool -= dt;
    if (s.cool <= 0 && s.pts.length > 4) {
      const rr = player.r * .68 + 6;
      for (let k = 0; k < s.pts.length; k += 3) {
        const p = s.pts[k];
        if (Math.hypot(p.x - player.x, p.y - player.y) < rr) {
          s.cool = .9; hitPlayer(s.dmg, true);
          for (let q = 0; q < 8; q++) V.parts.push({ x: p.x, y: p.y, vx: rnd(-150, 150), vy: rnd(-150, 150), r: rnd(2, 5), life: .4, c: '#bfe6ff' });
          break;
        }
      }
    }
    if (s.life <= 0 || (s.done > s.fade && !s.pts.length) || s.pts.length > 2600) V.curves.splice(i, 1);
  }
}

function eatOrb(o, B) {
  const D = B.def;
  o.alive = false;
  B.ph = Math.min(3, B.ph + 1);
  const gain = Math.round(D.orbCoin * coinMul());
  V.coinsRun += gain;
  player.r = Math.min(cfg.winSize * 1.05, player.r * 1.06);
  V.orbsEaten = (V.orbsEaten || 0) + 1;
  score += Math.round(D.orbCoin / 3);          // 分数/成长仍用原始值，不受积分倍率影响
  updateHud();
  sfx(240, .3, 'sawtooth', .1, 90);
  for (let q = 0; q < 26; q++) V.parts.push({ x: o.x, y: o.y, vx: rnd(-260, 260), vy: rnd(-260, 260), r: rnd(3, 9), life: rnd(.4, .8), c: '#ffd54a' });

  if (D.key === 'dj') {
    /* Boss1 特例：每个外卖扣 1/3 最大血量，吃满 3 个直接击败 */
    B.hp = Math.max(0, B.hp - Math.round(B.maxHp / 3));
    B.hitT = .4;
    toast('◆ 吃掉' + D.orb + '！积分 +' + gain, true);
  } else {
    /* M9：Boss2/3 —— 单个方块不扣血；全部吃完 → 扣掉 Boss 当前血量的一半，方块稍后重生 */
    const allGone = B.orbs.every(x => !x.alive);
    if (allGone) {
      const cut = Math.max(1, Math.ceil(B.hp / 2));
      B.hp = Math.max(0, B.hp - cut);
      B.hitT = .5;
      B.orbRespawnAt = B.t + 10;
      toast('◆ ' + D.orb + '全部吃完！' + D.name + ' 血量 -' + cut + '（当前 ' + B.hp + '/' + B.maxHp + '）', true);
      beep('win');
      for (let q = 0; q < 40; q++) V.parts.push({ x: B.x + rnd(-B.r * .5, B.r * .5), y: B.y + rnd(-B.r * .5, B.r * .5), vx: rnd(-320, 320), vy: rnd(-320, 320), r: rnd(3, 9), life: rnd(.4, .9), c: D.orbC });
    } else {
      toast('◆ 吃掉' + D.orb + '！积分 +' + gain + '（集齐可重创 ' + D.name + '）', true);
    }
  }
  /* 血量归零 → 击败 */
  if (B.hp <= 0) defeatBoss(B);
}

function defeatBoss(B) {
  const D = B.def;
  V.coinsRun += Math.round(D.reward * coinMul());
  V.bossDone++;
  // 从在场列表中移除该 Boss
  const bi = V.bosses.indexOf(B);
  if (bi >= 0) V.bosses.splice(bi, 1);
  score += Math.round(D.reward / 2); updateHud();
  toast('★ ' + D.name + ' 被击败！积分 +' + Math.round(D.reward * coinMul()), true);
  beep('win');
  // 累计击败 Boss 数持久化（皮肤解锁条件跨局保留）
  if (V.bossDone > (S.bossKilled || 0)) { S.bossKilled = V.bossDone; saveS(); }

  if (V.bosses.length === 0) {
    V.bullets.length = 0; V.waves.length = 0; V.curves.length = 0;
    bossbar.classList.remove('on');
    // 这一波清空了，推进模式
    if (GAME_MODE === 'endless') {
      // 关键修复：只有打完普通 3 个 Boss 才进入无尽星数循环——
      // 3 个 Boss 是按体型先后刷的，中间有 9 秒空档（bosses 为空但流程没走完），
      // 之前在这个空档就误触发了 advanceEndless，表现为「打 1 个就进无尽一星」。
      if (V.endless.active) advanceEndless();
      else if (V.bossDone >= BOSS_DEFS.length) advanceEndless();
      else V.nextBossAt = performance.now() + 9000;
    }
    else {
      // 普通模式：打完 3 个 Boss 通关
      if (V.bossDone >= BOSS_DEFS.length) {
        V.allBossDown = true;
        setTimeout(() => {
          if (V && V.allBossDown && state === 'playing') endGame(true);
        }, 1600);
      } else {
        V.nextBossAt = performance.now() + 9000;
      }
    }
  } else {
    // 还有 Boss 在场：更新 bossbar 计数
    document.getElementById('bbtag').textContent = '剩 ' + V.bosses.length + ' / ' + V.bosses.length;
  }
}

/* ---- 无尽模式推进 ---------------------------------------------------------- */
function endlessSpec(star) {
  if (star <= 1) return { rounds: 1, perRound: 1 };
  if (star === 2) return { rounds: 3, perRound: 2 };
  return { rounds: 1, perRound: 3 };
}
function endlessStarsText(star) {
  const map = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九' };
  return map[star] || ('' + star);
}
function spawnEndlessWave() {
  const spec = endlessSpec(V.endless.star);
  const n = Math.min(3, spec.perRound);
  const pool = [0, 1, 2];
  // 洗牌后取前 n 个，保证本波内不重复；再用 pickBossIdx 的「相邻波不重复」逻辑重排首个
  const picks = [];
  const bag = pool.slice();
  while (picks.length < n && bag.length) {
    const k = Math.floor(Math.random() * bag.length);
    picks.push(bag.splice(k, 1)[0]);
  }
  // 相邻波不重复：若本波第一个 Boss 与上一波重复，则换到末位
  const used = V.endless.lastPicks || [];
  if (picks.length > 1 && used.length && used.includes(picks[0])) {
    const d = picks.shift(); picks.push(d);
  }
  V.endless.lastPicks = picks.slice();
  picks.forEach(idx => spawnBoss(idx));
}
function showEndlessStar() {
  // 显示「无尽奶龙」+「无尽第N颗星」提示
  const n = endlessStarsText(V.endless.star);
  showEndlessTitle('无尽奶龙', n);
}
function saveEndlessBest() {
  // 历史最高无尽星数（跨局持久化，存在皮肤存档 sealV2 里）
  if (V.endless.star > (S.endlessBest || 0)) { S.endlessBest = V.endless.star; saveS(); }
}
function advanceEndless() {
  const E = V.endless;
  if (!E.active) {
    // 刚打完普通 3 个 Boss，进入无尽
    E.active = true; E.star = 1; E.round = 1; E.roundDone = 0; E.lastPicks = [];
    saveEndlessBest();
    showEndlessStar();
    E.pendingWave++;   // 由主循环轮询补生成（避免升级弹窗打断 setTimeout 导致 Boss 永久消失）
    E.nextWaveAt = performance.now() + 1400;
    return;
  }
  E.roundDone++;
  const spec = endlessSpec(E.star);
  if (E.roundDone < spec.rounds) {
    // 同一颗星还有下一轮
    E.round++;
    E.pendingWave++;
    E.nextWaveAt = performance.now() + 1400;
  } else {
    // 这颗星完成，进入下一颗星
    E.star++; E.round = 1; E.roundDone = 0;
    saveEndlessBest();
    showEndlessStar();
    E.pendingWave++;
    E.nextWaveAt = performance.now() + 1600;
  }
}
function showEndlessTitle(mainText, starText) {
  // 屏幕中央大标题：无尽奶龙（黄）+ 下面无尽第N颗星（红）
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:40;' +
    'text-align:center;pointer-events:none;';
  d.innerHTML = '<div style="font-size:42px;font-weight:900;color:#ffd54a;text-shadow:0 0 18px rgba(255,213,74,.9),0 4px 12px rgba(0,0,0,.7);letter-spacing:2px">' + mainText + '</div>' +
    '<div style="font-size:26px;font-weight:800;color:#ff4d5e;text-shadow:0 0 14px rgba(255,60,80,.9),0 3px 10px rgba(0,0,0,.7);margin-top:10px;letter-spacing:3px">无尽第' + starText + '颗星</div>';
  document.body.appendChild(d);
  setTimeout(() => {
    d.style.transition = 'opacity .6s'; d.style.opacity = '0';
    setTimeout(() => d.remove(), 650);
  }, 2000);
}

function hitPlayer(dmg, fromBoss) {
  const now = performance.now();
  if (now < invincibleUntil) return;
  /* M6b：薯片护盾 —— 身体两侧各一片，每片各抵挡 1 次攻击 */
  if (V.m6Shield > 0) {
    V.m6Shield--;
    V.m6ShieldFx = .7;
    try { playCrunch(); } catch (e) { }
    for (let i = 0; i < 22; i++) V.parts.push({ x: player.x, y: player.y, vx: rnd(-220, 220), vy: rnd(-220, 220), r: rnd(2, 6), life: rnd(.3, .6), c: '#ffe28a' });
    toast(V.m6Shield > 0 ? '🛡 一片薯片碎了，还剩 1 片护盾' : '🛡 薯片护盾全部碎裂！攻击被挡下', true);
    return;
  }
  beep('death');
  V.combo = 0;
  V.hurtFlash = 1;                 // 触发全屏扣血闪红特效
  /* M4：血量制生命 —— 按点数扣血，lives 恒为 1（活着）兼容原版 UI，
     死亡时 lives=0 触发原版结算流程 */
  V.hp = Math.max(0, V.hp - (dmg || 1));
  lives = V.hp > 0 ? 1 : 0;
  /* M4：受到攻击 → 打断 Boss3 的持续拉拽（需求：只有受击或离开范围才停） */
  if (V.bosses) for (const B of V.bosses) if (B.beam) B.beamStop = 1;
  updateHud();
  if (V.hp <= 0) return endGame(false);
  /* M11：受击惩罚减轻 —— Boss 撞击只缩 6%、被鱼咬缩 3%（原 10% / 5%） */
  player.r = Math.max(START_SIZE, player.r * (fromBoss ? 0.94 : 0.97));
  invincibleUntil = now + 2400;        /* M11：无敌 1.8s → 2.4s */
}

/* ------------------------------------------------------------ 10. 钩子 */
/* 兜底：原版 updateHud 里 '🖤'.repeat(MAX_LIVES - lives) 在 lives 越界时会抛
   RangeError（会把整个结算/升级流程打断，表现为卡在升级界面）。
   这里统一把 lives 夹在合法区间，零侵入原版。 */
const _updateHud = updateHud;
updateHud = function () {
  if (lives > MAX_LIVES) lives = MAX_LIVES;
  if (lives < 0) lives = 0;
  /* M4：血量制 —— 红心按血量比例显示（满血=满心，残血=黑心居多） */
  if (V && typeof MAX_LIVES === 'number') {
    const hearts = Math.ceil(V.hp / V.maxHp * MAX_LIVES);
    lives = clamp(hearts, V.hp > 0 ? 1 : 0, MAX_LIVES);
  }
  const r = _updateHud.apply(this, arguments);
  // 难度标签：无尽模式在难度旁加鲜红「无尽」+ 当前星数 + 历史最高星数
  try {
    const tag = document.getElementById('diffTag');
    if (tag && GAME_MODE === 'endless') {
      const st = (V && V.endless && V.endless.star) || 0;
      const best = (S && S.endlessBest) || 0;
      tag.innerHTML = '· ' + cfg.name +
        ' <span style="color:#ff2d43;font-weight:900;text-shadow:0 0 6px rgba(255,45,67,.8)">· 无尽</span>' +
        (st > 0 ? ' <span style="color:#ff8a9a">★' + st + '</span>' : '') +
        (best > 0 ? ' <span style="color:#9fc0d4;font-size:11px">最高★' + best + '</span>' : '');
    }
  } catch (e) { }
  return r;
};

/* 原版吃鱼音效音量 0.9。M9：用户反馈笑声重叠太吵 ——
   收紧为「最多同时 1 个 + 最小间隔 500ms」，上一声没放完绝不叠新声 */
const EAT_VOLUME = .9;
let _lastEatAt = 0;
const _playEat = playEat;
playEat = function () {
  if (GAME_VOL <= 0) return;               // 静音时不播
  const nowMs = performance.now();
  if (nowMs - _lastEatAt < 500) return;    // M9：间隔 130ms → 500ms
  while (eatVoices.length >= 1) { const v = eatVoices.shift(); try { v.pause(); } catch (e) { } }   // M9：最多 1 个
  _lastEatAt = nowMs;
  _playEat.apply(this, arguments);
  const a = eatVoices[eatVoices.length - 1];
  if (a) a.volume = Math.min(1, EAT_VOLUME * GAME_VOL);
};

/* 原版 beep（死亡 / 胜利）音量恢复为原值 0.22（不再压到 0.13），只叠加全局音量 */
beep = function (type) {
  try {
    if (GAME_VOL <= 0) return;
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.connect(g); g.connect(actx.destination);
    const now = actx.currentTime;
    if (type === 'death') {
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, now);
      o.frequency.exponentialRampToValueAtTime(55, now + 0.35);
      g.gain.setValueAtTime(0.22 * GAME_VOL, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      o.start(now); o.stop(now + 0.42);
    } else {
      o.type = 'sine';
      o.frequency.setValueAtTime(520, now);
      o.frequency.setValueAtTime(660, now + 0.12);
      o.frequency.setValueAtTime(880, now + 0.26);
      g.gain.setValueAtTime(0.22 * GAME_VOL, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      o.start(now); o.stop(now + 0.65);
    }
  } catch (e) { }
};

/* ---- 地图放大：世界比屏幕大，镜头跟着玩家走 ---------------------------------
   做法：W/H 改指「世界尺寸」，画布像素仍是屏幕大小；绘制鱼/玩家/子弹时统一
   平移 -cam，背景则固定在屏幕上铺满；指针坐标按屏幕→世界换算。
   手机屏幕小，同样 1.45 倍会显得地图很局促 —— 小屏自动加大到 2.4 倍，
   体感与电脑端的 1.45 倍接近；电脑端保持不变。 */
function worldScale() {
  /* M4：地图扩大 —— 桌面 1.45 → 1.95，小屏 3.0 → 3.6，给 Boss3 拉人技能留出范围 */
  return (Math.min(innerWidth, innerHeight) < 500 || innerWidth < 700) ? 3.6 : 1.95;
}
const cam = { x: 0, y: 0 };
function updateCam() {
  const vw = innerWidth, vh = innerHeight;
  cam.x = clamp(player ? player.x - vw / 2 : 0, 0, Math.max(0, W - vw));
  cam.y = clamp(player ? player.y - vh / 2 : 0, 0, Math.max(0, H - vh));
}
const _resize = resize;
resize = function () {
  _resize.apply(this, arguments);
  const s = worldScale();
  W = Math.round(innerWidth * s);     // 世界尺寸（比屏幕大）
  H = Math.round(innerHeight * s);
};
resize();
/* 修复「地图有时变回旧大小」：原版在挂钩之前就注册了 addEventListener('resize', resize)，
   那个监听器持有的是未挂钩的旧函数——旋转屏幕/改窗口时只会重置画布，不会重算世界尺寸。
   这里补挂自己的监听器（此时全局 resize 已是挂钩版，会重算 W/H）。 */
addEventListener('resize', () => resize());
addEventListener('orientationchange', () => setTimeout(resize, 150));

/* 难度参数微调（⚠ 必须改 DIFFS 本身 —— 每次开局都会执行 cfg = DIFFS[...]，改 cfg 会被覆盖）
   1) 世界变大后鱼相应补一点
   2) 刷怪节奏放慢
   3) 最终体型（winSize）调小，保证长满后仍明显小于 Boss */
const WIN_CAP = { easy: 62, hard: 72, hell: 80 };
const COIN_MUL = { easy: 1, hard: 1.5, hell: 2 };   // 积分倍率：简单 1× / 困难 1.5× / 地狱 2×
const ENDLESS_COIN_MUL = { easy: 2.0, hard: 2.5, hell: 3.0 };   // 无尽模式积分倍率：简单 2× / 困难 2.5× / 地狱 3×
if (typeof DIFFS !== 'undefined' && DIFFS) {
  Object.keys(DIFFS).forEach(k => {
    const d = DIFFS[k];
    if (!d) return;
    if (d.fishCap) d.fishCap = Math.round(d.fishCap * 1.5);
    if (d.spawnRate) d.spawnRate = d.spawnRate * .6;
    if (WIN_CAP[k]) d.winSize = WIN_CAP[k];
    if (COIN_MUL[k]) d.coinMul = COIN_MUL[k];
  });
}
function coinMul() {
  // 无尽模式用独立倍率（简单 2× / 困难 2.5× / 地狱 3×），普通模式用难度倍率
  if (GAME_MODE === 'endless') return (cfg && ENDLESS_COIN_MUL[CUR_DIFF]) || 2.0;
  return (cfg && cfg.coinMul) || 1;
}   // 当前难度的积分倍率

/* ---- 怪物生成速度独立乘区 ------------------------------------------------
   把每个难度的 spawnRate 存成「基准值」，再用 getter 动态返回 基准 × SPAWN_MUL，
   这样原版主循环里的 `Math.random() < cfg.spawnRate` 读取时自动套上倍率，
   且与难度完全独立相乘（简单/困难/地狱各乘各的），改动设置即时生效、无需重开。 */
if (typeof DIFFS !== 'undefined' && DIFFS) {
  Object.keys(DIFFS).forEach(k => {
    const d = DIFFS[k];
    if (!d) return;
    const base = d.spawnRate;
    if (typeof base !== 'number') return;
    Object.defineProperty(d, 'spawnRate', {
      get: function () { return base * SPAWN_MUL; },
      enumerable: true, configurable: true
    });
  });
}

/* ================= M1 视觉动效升级 =========================================
   1) 新海底背景图（V2_BG_SRC 由 HTML 素材块注入，cover 铺屏 + 轻视差）
   2) 水面动效：移动波光斑 / 摇曳光柱 / 上升气泡（全部扩展层自绘）
   3) 原版 drawBackground 代码零改动 —— 背景图加载失败时自动回落原版 */
const V2_BG = new Image();
if (typeof V2_BG_SRC === 'string' && V2_BG_SRC) V2_BG.src = V2_BG_SRC;
const v2Bubbles = [];
let v2BubLast = 0;

/* ============================================================ M8 性能优化
   掉帧主因：每帧重建渐变对象（分配 churn → GC 卡顿）、每条鱼 shadowBlur、
   粒子/气泡无上限。对策：渐变缓存、光斑预渲染成离屏贴图、实体数量封顶。 */
const M8_CACHE = { dgH: 0, dg: null, pillarH: 0, pillar: null, tailGradKey: '', tailGrad: null };
const M8_MAX_PARTS = 320, M8_MAX_BUBBLES = 40;
function m8CapParts() {
  if (V && V.parts && V.parts.length > M8_MAX_PARTS) V.parts.splice(0, V.parts.length - M8_MAX_PARTS);
}
function m8BottomGradient() {
  if (M8_CACHE.dgH !== innerHeight || !M8_CACHE.dg) {
    const dg = ctx.createLinearGradient(0, innerHeight * .55, 0, innerHeight);
    dg.addColorStop(0, 'rgba(4,32,54,0)'); dg.addColorStop(1, 'rgba(4,32,54,.42)');
    M8_CACHE.dg = dg; M8_CACHE.dgH = innerHeight;
  }
  return M8_CACHE.dg;
}
function m8PillarGradient() {
  if (M8_CACHE.pillarH !== innerHeight || !M8_CACHE.pillar) {
    const g = ctx.createLinearGradient(0, 0, 0, innerHeight);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    M8_CACHE.pillar = g; M8_CACHE.pillarH = innerHeight;
  }
  return M8_CACHE.pillar;
}
/* 柔光椭圆预渲染：一次性画到离屏画布，之后每帧 drawImage（比 7 次 createRadialGradient 便宜一个量级） */
const M8_SPOT = (function () {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c2 = cv.getContext('2d');
  const g = c2.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(190,235,255,.085)'); g.addColorStop(1, 'rgba(190,235,255,0)');
  c2.fillStyle = g; c2.fillRect(0, 0, 128, 128);
  return cv;
})();

function drawV2Water(t) {
  /* --- 波光斑：预渲染贴图缩放绘制（M8：替代每帧 7 个径向渐变） --- */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const px = (i * 197 + Math.sin(t / 2600 + i * 2.1) * 90 + t / 55) % (innerWidth + 260) - 130;
    const py = innerHeight * (.14 + .11 * (i % 3)) + Math.sin(t / 1900 + i) * 26;
    const rw = 110 + (i % 4) * 46, rh = 13 + (i % 3) * 7;
    ctx.save(); ctx.translate(px, py); ctx.rotate(-.16 + (i % 2) * .1); ctx.scale(1, rh / rw);
    ctx.drawImage(M8_SPOT, px - rw, py - rw, rw * 2, rw * 2);
    ctx.restore();
  }
  ctx.restore();
  /* --- 摇曳光柱：渐变缓存（M8），仅高度变化时重建 --- */
  ctx.save();
  ctx.globalAlpha = .10;
  const pg = m8PillarGradient();
  ctx.fillStyle = pg;
  for (let i = 0; i < 4; i++) {
    const x = (i * innerWidth / 3.6 + Math.sin(t / 3400 + i * 1.7) * 70) - cam.x * .04;
    const w0 = 60 + i * 18, sway = Math.sin(t / 2200 + i) * 90;
    ctx.beginPath();
    ctx.moveTo(x, -20); ctx.lineTo(x + w0, -20);
    ctx.lineTo(x + w0 + 190 + sway, innerHeight); ctx.lineTo(x + 40 + sway, innerHeight);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  /* --- 上升气泡（M8：数量封顶 40，防长时间游玩内存缓涨） --- */
  if (t - v2BubLast > 90 && Math.random() < .09) {
    v2BubLast = t;
    if (v2Bubbles.length < M8_MAX_BUBBLES)
      v2Bubbles.push({ x: Math.random() * innerWidth, y: innerHeight + 12, r: 2 + Math.random() * 5, s: 28 + Math.random() * 55 });
  }
  ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.lineWidth = 1.2;
  for (let i = v2Bubbles.length - 1; i >= 0; i--) {
    const b = v2Bubbles[i];
    b.y -= b.s / 60; b.x += Math.sin(t / 500 + b.y / 55) * .6;
    if (b.y < -14) { v2Bubbles.splice(i, 1); continue; }
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
  }
}
function drawV2Background(t) {
  if (V2_BG.complete && V2_BG.naturalWidth) {
    /* cover 铺满视口，四周留 70px 余量做视差偏移（镜头移动时背景缓动，制造纵深） */
    const iw = V2_BG.naturalWidth, ih = V2_BG.naturalHeight, M = 70;
    const k = Math.max((innerWidth + M * 2) / iw, (innerHeight + M * 2) / ih);
    const dw = iw * k, dh = ih * k;
    const ox = -M - clamp(cam.x * .05, -M, M);
    const oy = -M - clamp(cam.y * .05, -M, M);
    ctx.drawImage(V2_BG, ox, oy, dw, dh);
    /* 底部加深，保证 HUD 与鱼群可读性（M8：渐变缓存） */
    ctx.fillStyle = m8BottomGradient(); ctx.fillRect(0, 0, innerWidth, innerHeight);
    drawV2Water(t);
  } else {
    _drawBackground(t);   // 背景图未就绪（如离线首帧）→ 回落原版渐变背景
  }
}
const _drawBackground = drawBackground;
drawBackground = function (t) {
  updateCam();                                   // 每帧最开始更新镜头
  drawV2Background(t);
};
/* M3：第二大生物（tier 3）贴图替换为生肖黏土动物（9 只），大小/密度/总数不变 */
const ZODIAC_IMGS = [];
(function () {
  try {
    if (typeof V2_ZODIAC_SRC === 'undefined') return;
    for (const k in V2_ZODIAC_SRC) {
      const im = new Image();
      im.src = V2_ZODIAC_SRC[k];
      ZODIAC_IMGS.push(im);
    }
  } catch (e) { }
})();
const _drawFish = drawFish;
drawFish = function (f, t) {
  if (!f) return _drawFish.apply(this, arguments);
  /* M8：视口裁剪 —— 屏幕外的鱼直接跳过绘制（相机跟随 + 地图 1.95x~3.6x，
     同屏外最多可能有 2/3 的鱼在白画） */
  const M8_VM = 90;
  const vx0 = cam.x - M8_VM, vx1 = cam.x + innerWidth + M8_VM;
  const vy0 = cam.y - M8_VM, vy1 = cam.y + innerHeight + M8_VM;
  if (f.x + f.r * 2 < vx0 || f.x - f.r * 2 > vx1 || f.y + f.r * 2 < vy0 || f.y - f.r * 2 > vy1) return;
  /* M3：生肖换装对象改为 tier 1（比蛋大一档的小型鱼）—— 体型「比蛋大一点点」；
     tier 3 恢复原版奶龙。每条鱼随机固定一只生肖，绘制布局与原版完全一致 */
  if (f.tier === 1 && ZODIAC_IMGS.length && ZODIAC_IMGS[0].complete) {
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    const r = f.r, y = f.y + Math.sin(t / 400 + f.wobble) * f.wobbleAmp * .15;
    const col = dangerColor(f);
    ctx.save(); ctx.globalAlpha = .35; ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.5, r * .08);
    ctx.beginPath(); ctx.ellipse(f.x, y + r * 1.05, r * 1.15, r * .36, 0, 0, TAU); ctx.stroke();
    ctx.restore();
    if (f.zod === undefined) f.zod = Math.floor(Math.random() * ZODIAC_IMGS.length);
    const img = ZODIAC_IMGS[f.zod % ZODIAC_IMGS.length];
    ctx.save();
    ctx.translate(f.x, y); ctx.scale(f.dir, 1); ctx.rotate(Math.sin(t / 260 + f.wobble) * .08);
    const th = r * 2.7, tw = th * (img.naturalWidth || 1) / (img.naturalHeight || 1);
    /* M9 修复：M8 误把 globalAlpha .28 作用到了整张贴图上导致鱼变半透明。
       现在贴图全色绘制，仅危险色描边圈降透明度 */
    if (img.complete && img.naturalWidth) ctx.drawImage(img, -tw / 2, -th * .52, tw, th);
    ctx.strokeStyle = col; ctx.globalAlpha = .28; ctx.lineWidth = Math.max(1.2, r * .12);
    ctx.beginPath(); ctx.ellipse(0, -th * .1, tw * .46, th * .42, 0, 0, TAU); ctx.stroke();
    ctx.restore(); ctx.restore();
    return;
  }
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  /* M1 视觉：逐鱼摆尾 —— 绕鱼心做小幅摇摆（每条鱼随机相位），加轻微呼吸缩放 */
  if (f) {
    if (f.seed === undefined) f.seed = Math.random() * 10;
    const sway = Math.sin(t / 240 + f.seed * 7) * .07;
    const pulse = 1 + Math.sin(t / 300 + f.seed * 5) * .025;
    ctx.translate(f.x, f.y); ctx.rotate(sway); ctx.scale(pulse, 2 - pulse); ctx.translate(-f.x, -f.y);
  }
  _drawFish.apply(this, arguments);
  ctx.restore();
};
/* 指针是屏幕坐标，不换算的话玩家只能在世界左上角打转 */
const _setPointer = setPointer;
setPointer = function (x, y) { return _setPointer.call(this, x + cam.x, y + cam.y); };

/* 除 Boss 外的生物（奶龙）稍微改小，画面更透气。
   ⚠ 注意：原版是按「原始体型」把新鱼摆在世界左右边界上的，缩小体型后必须
   按新 r 重新摆位，否则鱼会落在回收边界之外、下一帧就被删掉（表现为「吃完不刷新」）。
   顺带把生成点从「世界边缘」改成「相机视野边缘」——世界比屏幕大，否则新鱼要游很久才看得到。 */
const FISH_SCALE = .85;
const FISH_CULL = 170;          // 游出视野这么远就回收，把额度让给视野内的鱼
const _spawnFish = spawnFish;
spawnFish = function (anywhere) {
  const n = fishes.length;
  _spawnFish.apply(this, arguments);
  for (let i = n; i < fishes.length; i++) {
    const f = fishes[i];
    f.r = Math.max(6, f.r * FISH_SCALE);
    if (!anywhere) {
      f.x = f.dir > 0 ? cam.x - f.r * 3 : cam.x + innerWidth + f.r * 3;
      f.y = clamp(cam.y + rand(20, innerHeight - 20), 40, H - 40);
    }
  }
};

// 绘制：先画 Boss/弹幕，再画玩家（保证 Boss 在鱼之上、玩家之下）
const _drawPlayer = drawPlayer;
drawPlayer = function (t) {
  ctx.save(); ctx.translate(-cam.x, -cam.y);      // Boss/子弹/玩家都用世界坐标
  try { drawBossLayer(t); } catch (e) { }
  drawPlayerV2(t);
  ctx.restore();
};
/* M2.5：动态尾巴 —— 原图建模不可改动，尾巴为渲染层新增。
   皮肤主色采样（缓存于 Image 对象上），任何皮肤自动适配 */
const _tailRGBMap = new Map();
function tailRGB(img) {
  if (!img) return [232, 192, 99];
  if (_tailRGBMap.has(img)) return _tailRGBMap.get(img);
  let rgb = [232, 192, 99];
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const c2 = cv.getContext('2d'); c2.drawImage(img, 0, 0, 32, 32);
    const d = c2.getImageData(8, 18, 16, 12).data;        // 身体下半区采样
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    if (n) rgb = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  } catch (e) { }
  _tailRGBMap.set(img, rgb);
  return rgb;
}
function drawSealTail(t, p, m, bob) {
  const img = equippedImg();
  const [r0, g0, b0] = tailRGB(m ? img : null);
  /* M8：摆尾相位与身体 sway（t/190）完全同源 —— 尾巴和身体是一根弹簧，
     不再各摆各的；冲刺时叠加高频甩动，二阶正弦让摆动有回弹感而非机械往复 */
  const swayPh = Math.sin(t / 190);
  const wag = swayPh * .6 + (V && V.dashT > 0 ? Math.sin(t / 60) * .3 : 0) + Math.sin(t / 95) * .08;
  const k = m ? (p.r * 2.35) / m.size : 0;
  /* M8：尾根扎进身体内部（贴图后 24% 处而非 30%）—— 根部被身体贴图压住，
     接缝天然不可见；尾根加宽 1.35 倍，与身体后缘平滑融合 */
  const ax = m ? -m.size * .24 * k : -p.r * .58;
  const ay = (m ? m.size * .34 * k : p.r * .70) + bob;
  const len = (m ? m.size * .50 * k : p.r * 1.25);
  const w = p.r * .32;                                     // M8：尾根半宽 ×1.35
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(.75 + wag * .45);
  /* M8：渐变缓存 —— 颜色不变时复用同一渐变对象 */
  const gk = r0 + ',' + g0 + ',' + b0;
  if (M8_CACHE.tailGradKey !== gk) {
    const grad = ctx.createLinearGradient(0, 0, 0, len);
    grad.addColorStop(0, 'rgb(' + r0 + ',' + g0 + ',' + b0 + ')');
    grad.addColorStop(1, 'rgb(' + Math.max(0, r0 - 26) + ',' + Math.max(0, g0 - 26) + ',' + Math.max(0, b0 - 26) + ')');
    M8_CACHE.tailGrad = grad; M8_CACHE.tailGradKey = gk;
  }
  ctx.fillStyle = M8_CACHE.tailGrad;
  /* M8：尾根关节盖片 —— 与身体同色的圆角楔形垫在尾根下，
     把「贴图边缘 → 尾巴」的硬接缝变成同色过渡 */
  ctx.fillStyle = 'rgb(' + r0 + ',' + g0 + ',' + b0 + ')';
  ctx.beginPath(); ctx.ellipse(w * .2, -len * .04, w * 1.5, w * 1.15, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = M8_CACHE.tailGrad;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.quadraticCurveTo(-w * 1.25, len * .55, w * .1 + wag * w * .6, len);   // 外缘弧线到尾尖（尾尖随摆动横移）
  ctx.quadraticCurveTo(w * .95, len * .5, w, 0);                            // 内缘弧线收回尾根
  ctx.closePath();
  ctx.fill();
  /* 尾根与身体衔接的阴影，避免出现硬接缝 */
  ctx.strokeStyle = 'rgba(' + Math.max(0, r0 - 45) + ',' + Math.max(0, g0 - 45) + ',' + Math.max(0, b0 - 45) + ',.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawPlayerV2(t) {  const p = player;
  const sk = skinById(S.equipped);
  const img = equippedImg();
  const m = metric(img);
  ctx.save();
  ctx.translate(p.x, p.y);
  /* 无敌光环 → M3 持续金身：全程恒定金色光环（不再渐隐），不再闪烁虚影 */
  const invLeft = invincibleUntil - performance.now();
  const isInv = invLeft > 0 && invLeft < 1e8;
  if (isInv) {
    const rr = p.r * 1.5 + Math.sin(t / 150) * 2.5;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU);
    ctx.strokeStyle = 'rgba(255,213,74,.8)'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, rr * .8, 0, TAU);
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.scale(p.dir, 1);
  /* M5b：旋转水波 —— 海豹原地绕纵轴快速自转 + 青色螺旋水带缠绕身体 + 气泡泡沫（参考视频） */
  const spinning = V && V.spinT > 0;
  const prSpin = spinning ? 1 - V.spinT / SPIN_ATK.dur : 0;
  if (spinning) drawSpinRibbon(prSpin, true);            // 背侧水带（画在身体后面）
  ctx.save();                                            // 自转只作用于身体
  if (spinning) {
    /* 绕纵轴自转：水平缩放模拟——身体随 cos 变窄/翻面（参考视频效果），而非画布旋转 */
    const cs = Math.cos(prSpin * TAU * 3);
    const sx = Math.abs(cs) < .18 ? (cs < 0 ? -.18 : .18) : cs;
    ctx.scale(sx, 1);
  }
  /* M1 视觉：动态 2D —— 呼吸浮动 + 摆尾扭切 + 冲刺拉伸，游动感来自三者的叠加 */
  const bob = Math.sin(t / 300) * 3;
  ctx.rotate(Math.sin(t / 350) * 0.06);
  const sway = Math.sin(t / 190) * 0.055;                       // 摆尾：横向扭切
  ctx.transform(1, 0, sway, 1, 0, 0);
  if (V && V.dashT > 0) ctx.scale(1.08, .92);                   // 冲刺：前拉伸后压扁
  /* M5：删除 M2 的「张嘴吃鱼」动画（需求：里程2 里的吃东西动画删除） */
  /* M3：无敌不再用闪烁虚影（移除 globalAlpha 闪烁），金身效果见上方光环+辉光 */
  drawSealTail(t, p, m, bob);
  if (m) {
    const k = (p.r * 2.35) / m.size;
    const dw = m.w * k, dh = m.h * k;
  /* M3：无敌期间金色辉光包裹身体（替代原虚影闪烁），与皮肤辉光同款效果 */
  if (isInv) { ctx.shadowColor = '#ffd54a'; ctx.shadowBlur = 20; }
  else if (sk.glow) { ctx.shadowColor = sk.glow; ctx.shadowBlur = 20; }
  ctx.drawImage(img, -m.cx * k, -m.cy * k + bob, dw, dh);
  ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .8, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();                                         // 结束自转
  if (spinning) {
    drawSpinRibbon(prSpin, false);                       // 前侧水带（画在身体上面）
    drawSpinBubbles(prSpin);                             // 上升气泡 + 白色泡沫
  }
  ctx.restore();
}

function drawBossLayer(t) {
  if (!V) return;
  /* M6：皮肤技能世界层（护盾/道具/弹丸，画在 Boss 之下、玩家之下） */
  drawM6World(t);
  /* M2：袋鼠 DJ 音浪 → 水涟漪动效（参考 AE 水涟漪素材）：
     三圈同心涟漪 + 正弦波纹扰动 + 青蓝辉光 + 白色高光芯，纵向略压扁模拟水面透视 */
  for (const w of V.waves) {
    ctx.save();
    for (let ring = 0; ring < 3; ring++) {
      const rr = w.r * (1 - ring * .18);
      if (rr <= 4) break;
      const aMul = w.a * (1 - ring * .3);
      const seg = 46;
      ctx.beginPath();
      for (let k = 0; k <= seg; k++) {
        const th = k / seg * TAU;
        const wob = Math.sin(th * (5 + ring * 2) + w.r / 26 + ring * 2.2) * (4 + ring * 2.5);
        const x = w.x + Math.cos(th) * (rr + wob);
        const y = w.y + Math.sin(th) * (rr + wob) * .92;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.shadowColor = 'rgba(80,190,255,.9)'; ctx.shadowBlur = 16;
      ctx.strokeStyle = 'rgba(110,210,255,' + (.72 * aMul) + ')';
      ctx.lineWidth = (ring === 0 ? 6 : 3.5) * w.a + 1;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(235,252,255,' + (.5 * aMul) + ')';
      ctx.lineWidth = 1.6; ctx.stroke();
    }
    ctx.restore();
  }
  /* M4：函数引力线 —— Boss3 拉人时画一条正弦波动的函数感线条（Boss→玩家） */
  for (const B of V.bosses) {
    if (!B.beam || !player) continue;
    const dx = player.x - B.x, dy = player.y - B.y, d = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx), nx = -Math.sin(ang), ny = Math.cos(ang);
    const t = performance.now() / 1000;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      const N = 40;
      for (let k = 0; k <= N; k++) {
        const u = k / N, base = u * d;
        const wob = Math.sin(u * 10 - t * 9) * 14 * (1 - u * .3);
        const x = B.x + Math.cos(ang) * base + nx * wob;
        const y = B.y + Math.sin(ang) * base + ny * wob;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      if (pass === 0) { ctx.strokeStyle = 'rgba(190,225,255,.3)'; ctx.lineWidth = 10; }
      else { ctx.strokeStyle = 'rgba(240,250,255,.9)'; ctx.lineWidth = 3; }
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const B of V.bosses) {
    const D = B.def, img = bossImg(D), m = metric(img);
    // 气场
    ctx.beginPath(); ctx.arc(B.x, B.y, B.r * .82, 0, TAU);
    ctx.strokeStyle = 'rgba(255,77,109,' + (.35 + .2 * Math.sin(B.t * 4)) + ')';
    ctx.lineWidth = 5; ctx.stroke();
    if (m) {
      const k = (B.r * 2.4) / m.size;
      ctx.save();
      if (B.hitT > 0) ctx.globalAlpha = .9;
      ctx.drawImage(img, B.x - m.cx * k, B.y - m.cy * k, m.w * k, m.h * k);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(B.x, B.y, B.r, 0, TAU); ctx.fill();
    }
    // 核心物
    for (const o of B.orbs) {
      if (!o.alive) continue;
      const open = o.state === 'open', sr = o.r;
      ctx.save(); ctx.translate(o.x, o.y); ctx.scale(1 + Math.sin(B.t * 8) * .05, 1 + Math.sin(B.t * 8) * .05);
      ctx.shadowColor = open ? '#6ee7a0' : D.orbC; ctx.shadowBlur = open ? 24 : 12;
      ctx.fillStyle = open ? 'rgba(10,44,32,.95)' : 'rgba(30,16,24,.95)';
      const w = sr * 2.1, h = sr * 1.7, rr = sr * .34;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + rr, -h / 2); ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, rr);
      ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, rr); ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, rr);
      ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, rr); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = open ? '#6ee7a0' : D.orbC; ctx.stroke();
      ctx.shadowBlur = 0;
      /* 核心物上方飘的图标：袋鼠 DJ 换成「外卖袋」贴图，其余 Boss 沿用符号 */
      if (D.key === 'dj' && ORB_IMG.complete && ORB_IMG.naturalWidth) {
        const ih = sr * 2.35, iw = ih * (ORB_IMG.naturalWidth / ORB_IMG.naturalHeight);
        ctx.save();
        ctx.globalAlpha = open ? 1 : .94;
        if (open) { ctx.shadowColor = '#6ee7a0'; ctx.shadowBlur = 22; }
        ctx.drawImage(ORB_IMG, -iw / 2, -sr * 2.02 - ih / 2, iw, ih);
        ctx.restore();
      } else if (D.key === 'moyu' && LATIAO_IMG.complete && LATIAO_IMG.naturalWidth) {
        /* Boss2 辣条方块：用辣条贴图（复用辣条子弹素材） */
        const ih = sr * 2.1, iw = ih * (LATIAO_IMG.naturalWidth / LATIAO_IMG.naturalHeight);
        ctx.save();
        ctx.globalAlpha = open ? 1 : .94;
        if (open) { ctx.shadowColor = '#6ee7a0'; ctx.shadowBlur = 22; }
        ctx.drawImage(LATIAO_IMG, -iw / 2, -sr * 2.02 - ih / 2, iw, ih);
        ctx.restore();
      } else {
        ctx.font = sr * 1.05 + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(open ? '◆' : D.orbIc, 0, -sr * 1.3);
      }
      ctx.restore();
      if (open) {
        ctx.font = '800 12px system-ui'; ctx.textAlign = 'center';
        const ty = o.y - sr * (D.key === 'dj' ? 3.55 : 2.1);
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)';
        ctx.strokeText('吃掉它!', o.x, ty);
        ctx.fillStyle = '#6ee7a0'; ctx.fillText('吃掉它!', o.x, ty);
      }
    }
  }
  /* M2：函数轨迹线 —— 普通线条画风：细白线 + 淡蓝辉光，头部小亮点 */
  if (V.curves.length) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of V.curves) {
      const n = s.pts.length;
      if (n < 2) continue;
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        ctx.moveTo(s.pts[0].x, s.pts[0].y);
        for (let k = 1; k < n; k++) ctx.lineTo(s.pts[k].x, s.pts[k].y);
        if (pass === 0) { ctx.strokeStyle = 'rgba(190,225,255,.24)'; ctx.lineWidth = 9; }
        else { ctx.strokeStyle = 'rgba(242,250,255,.95)'; ctx.lineWidth = 3; }
        ctx.stroke();
      }
      const h = s.pts[n - 1];
      ctx.beginPath(); ctx.arc(h.x, h.y, 3.6, 0, TAU);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    ctx.restore();
  }
  /* M2：弹幕 → 辣条贴图（比原子弹大一点），沿速度方向旋转；贴图未就绪回落圆形
     M4：积分号弹幕 —— 用 INTEGRAL_IMG 贴图做 360° 旋转（动效而非纸片翻转） */
  for (const b of V.bullets) {
    if (b.integral && INTEGRAL_IMG.complete && INTEGRAL_IMG.naturalWidth) {
      const ih = b.r * 3.1, iw = ih * (INTEGRAL_IMG.naturalWidth / INTEGRAL_IMG.naturalHeight);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.spin || 0);
      ctx.shadowColor = 'rgba(120,210,255,.8)'; ctx.shadowBlur = 12;
      ctx.drawImage(INTEGRAL_IMG, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
    } else if (LATIAO_IMG.complete && LATIAO_IMG.naturalWidth) {
      const ih = b.r * 2.9, iw = ih * (LATIAO_IMG.naturalWidth / LATIAO_IMG.naturalHeight);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
      ctx.drawImage(LATIAO_IMG, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
    } else {
      ctx.save(); ctx.shadowColor = b.c; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fillStyle = b.c; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(b.x - b.r * .28, b.y - b.r * .3, b.r * .34, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
      ctx.restore();
    }
  }
  // 粒子
  for (let i = V.parts.length - 1; i >= 0; i--) {
    const p = V.parts[i];
    p.x += p.vx * dtFrame; p.y += p.vy * dtFrame;
    p.vx *= .94; p.vy *= .94; p.life -= dtFrame; p.r *= .98;
    if (p.life <= 0) { V.parts.splice(i, 1); continue; }
    ctx.globalAlpha = clamp(p.life * 1.8, 0, 1);
    ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// 重置 / 结算
const _reset = reset;
reset = function () {
  /* M4：reset 时 cfg 已是新难度（原版 reset 会读 cfg），据此确定血量上限 */
  try {
    if (typeof DIFFS !== 'undefined' && DIFFS) {
      for (const k in DIFFS) if (DIFFS[k] === cfg) { CUR_DIFF = k; break; }
    }
  } catch (e) { }
  _reset.apply(this, arguments);
  newV();
  V.prevLives = lives;
  bossbar.classList.remove('on'); lvov.classList.add('hidden');
  hpbox.classList.remove('on'); upbox.innerHTML = '';
};
const _endGame = endGame;
endGame = function (win) {
  hpbox.classList.remove('on');   /* M4：结算时隐藏血条 */
  /* 关键规则：长到目标体型【不再直接通关】——
     必须把全部 Boss 打完才算赢，否则体型到顶也只是「卡住」继续玩下去。 */
  if (win && V && !V.allBossDown) {
    if (player) player.r = Math.min(player.r, WIN_SIZE * .99);
    const now = performance.now();
    if (!V.capHintAt || now - V.capHintAt > 5000) {
      V.capHintAt = now;
      toast('体型已到上限 · 击败全部 ' + BOSS_DEFS.length + ' 个 Boss 才能通关', true);
    }
    return;
  }
  const run = V ? V.coinsRun : 0;
  S.coins += run; saveS(); updateShopCoin();
  _endGame.apply(this, arguments);
  // 结算补充信息
  try {
    const t = document.getElementById('overText');
    if (t && V) {
      if (GAME_MODE === 'endless') {
        const st = V.endless ? V.endless.star : 0;
        const starTxt = st > 0 ? ('无尽第 ' + endlessStarsText(st) + ' 颗星') : '尚未进入无尽';
        const surviveSec = V.surviveT ? Math.max(0, Math.round((performance.now() - V.surviveT) / 1000)) : 0;
        const bossProg = V.bossDone || 0;
        t.innerHTML += `<br><span style="color:#ffd54a;font-size:14px">无尽模式 · ${starTxt} · 存活 ${fmtTime(surviveSec)} · 历史最高 ★${(S.endlessBest || 0)} · 本局积分 +${fmt(run)} · 最高连击 ${V.maxCombo}</span>`;
        // 上报云端排行榜（已登录才记录）
        reportEndlessScore(st, surviveSec, bossProg);
      } else {
        t.innerHTML += `<br><span style="color:#9fc0d4;font-size:14px">本局积分 +${fmt(run)} · 击败 Boss ${V.bossDone}/3 · 最高连击 ${V.maxCombo}</span>`;
      }
    }
  } catch (e) { }
};
const _start = start;
start = function () {
  /* M4：原版难度按钮直接改 cfg 再 start()，不经过扩展层面板 ——
     这里反查 cfg 对应的难度键，保证血量上限/积分倍率随难度正确 */
  try {
    if (typeof DIFFS !== 'undefined' && DIFFS) {
      for (const k in DIFFS) if (DIFFS[k] === cfg) { CUR_DIFF = k; break; }
    }
  } catch (e) { }
  _start.apply(this, arguments);
  lastV2 = performance.now();
  /* M5c：开局音效（三声上行音阶，原版没有开局提示音） */
  try { playStartJingle(); } catch (e) { }
  /* M4：血量按难度重置（原版 reset 可能在 start 之前/之后调用，这里再兜一次） */
  if (V) {
    const hp0 = diffStartHp();
    V.maxHp = hp0;
    if (!(V.hp > 0) || V.hp > hp0) V.hp = hp0;
    V.surviveT = performance.now();
    /* M6：记录开局体型 = 地图最小尺寸（线性代数「变小」技能用） */
    V.m6MinR = player ? player.r : 26;
    V.m6PreR = player ? player.r : 26;
    hpbox.classList.add('on');
  }
};

function updateShopCoin() {
  const e = document.getElementById('v2coin'); if (e) e.textContent = fmt(S.coins + (V ? V.coinsRun : 0));
}

/* ------------------------------------------------------------ 11. v2 主循环 */
let lastV2 = performance.now(), dtFrame = 1 / 60;
function loopV2(now) {
  requestAnimationFrame(loopV2);
  dtFrame = Math.min(0.05, (now - lastV2) / 1000);
  lastV2 = now;
  m8CapParts();                       /* M8：粒子上限，防技能连发时内存/绘制量失控 */
  if (state === 'playing') updateV2(dtFrame, now);
  else if (state === 'levelup' && player) {
    try {
      ctx.save(); ctx.translate(-cam.x, -cam.y);
      drawBossLayer(now); drawPlayerV2(now);
      ctx.restore();
    } catch (e) { }
  }
  updateHUD2();
  drawHurtFx(now, dtFrame);      // 扣血特效覆盖层（最上层）
  drawBossIndicator(now);        // Boss 方向指示（屏幕外时边缘箭头）
  drawM6Bubble();                // M6：线性代数吐槽气泡（屏幕坐标，居中靠上）
}

/* ---- Boss 方向指示器 -------------------------------------------------------
   Boss 在屏幕外时，沿「屏幕中心 → Boss」方向在屏幕边缘画一个脉动的红色箭头
   + 「BOSS」小字，让玩家随时知道 Boss 大概在哪个方向。Boss 在视野内则不画。 */
function drawBossIndicator(now) {
  if (state !== 'playing' || !V || !V.bosses.length || !player) return;
  // 多 Boss 时指向最近的一个
  let b = V.bosses[0];
  for (const B of V.bosses) {
    if (Math.hypot(B.x - player.x, B.y - player.y) < Math.hypot(b.x - player.x, b.y - player.y)) b = B;
  }
  const sx = b.x - cam.x, sy = b.y - cam.y;
  const vw = innerWidth, vh = innerHeight;
  const pad = 46;                                   // 距边缘的留白
  const onScreen = sx > pad && sx < vw - pad && sy > pad && sy < vh - pad;
  if (onScreen) return;

  // 从屏幕中心指向 Boss 的方向
  const dx = sx - vw / 2, dy = sy - vh / 2;
  const ang = Math.atan2(dy, dx);
  // 与屏幕内缩矩形的交点（箭头落点）
  const mx = vw / 2 - pad, my = vh / 2 - pad;
  const t = Math.min(
    dx !== 0 ? mx / Math.abs(dx) : Infinity,
    dy !== 0 ? my / Math.abs(dy) : Infinity
  );
  const ax = vw / 2 + dx * t, ay = vh / 2 + dy * t;

  const pulse = .65 + Math.sin(now / 260) * .3;     // 呼吸脉动
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(ax, ay);
  ctx.rotate(ang);
  ctx.globalAlpha = pulse;

  // 箭头
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.lineTo(-8, -11); ctx.lineTo(-3, 0); ctx.lineTo(-8, 11);
  ctx.closePath();
  ctx.fillStyle = '#ff4d5e';
  ctx.shadowColor = 'rgba(255,60,80,.9)'; ctx.shadowBlur = 14;
  ctx.fill();

  // 「BOSS」小字（反转回正，方便读）
  ctx.rotate(-ang);
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,180,190,.95)';
  ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(0,0,0,.8)';
  ctx.fillText('BOSS', 0, -18);

  ctx.restore();
}

/* ---- 扣血 / 低血量特效 -----------------------------------------------------
   ① 受伤瞬间：全屏红色渐变闪一下（hurtFlash 衰减）
   ② 只剩 1 颗心且非地狱难度：屏幕四周持续红色渐晕，像「残血警告」 */
function drawHurtFx(now, dt) {
  if (!V) return;
  if (V.hurtFlash > 0) V.hurtFlash = Math.max(0, V.hurtFlash - dt * 1.6);
  const lowHp = state === 'playing' && V && V.hp <= 30 && cfg && cfg.name !== '地狱';   /* M4：血量制残血阈值 30/100 */
  const flash = V.hurtFlash;
  if (flash <= 0 && !lowHp) return;

  const vw = innerWidth, vh = innerHeight;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);      // 用屏幕坐标，忽略镜头

  // ① 受伤闪红：范围更大、边缘更浓，透明度随 hurtFlash 衰减
  if (flash > 0) {
    const r = Math.hypot(vw, vh) * .55;
    const a = Math.min(1, flash * 1.6);
    const g = ctx.createRadialGradient(vw / 2, vh / 2, r * .2, vw / 2, vh / 2, r);
    g.addColorStop(0, 'rgba(220,20,20,0)');
    g.addColorStop(0.5, 'rgba(205,15,15,' + (a * .45) + ')');
    g.addColorStop(0.8, 'rgba(190,10,10,' + (a * .8) + ')');
    g.addColorStop(1, 'rgba(150,5,5,' + Math.min(1, a * 1.15) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = 'rgba(255,30,30,' + (a * .2) + ')';
    ctx.fillRect(0, 0, vw, vh);
  }

  // ② 低血量持续渐晕：四周红色晕圈（明显脉动 + 轻微全屏泛红）
  if (lowHp) {
    const pulse = 0.72 + Math.sin(now / 240) * 0.2;       // 强呼吸脉动
    const r = Math.hypot(vw, vh) * .55;
    const g = ctx.createRadialGradient(vw / 2, vh / 2, r * .2, vw / 2, vh / 2, r);
    g.addColorStop(0, 'rgba(220,20,20,0)');
    g.addColorStop(0.5, 'rgba(205,15,15,' + (pulse * .45) + ')');
    g.addColorStop(0.8, 'rgba(190,10,10,' + (pulse * .8) + ')');
    g.addColorStop(1, 'rgba(150,5,5,' + Math.min(1, pulse * 1.15) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    // 全屏泛红，随脉动呼吸
    ctx.fillStyle = 'rgba(255,30,30,' + (pulse * .18) + ')';
    ctx.fillRect(0, 0, vw, vh);
  }

  ctx.restore();
}

function updateV2(dt, now) {
  if (!V) return;
  const P = player;
  /* M6：皮肤技能状态推进 */
  updateM6(dt);

  /* 体型上限：长到目标体型就停住（此时仍明显小于 Boss）；通关要靠打完 Boss */
  if (P && P.r > WIN_SIZE * .99) P.r = WIN_SIZE * .99;

  /* --- 世界比屏幕大：游出视野太远的鱼回收掉，把额度留给视野内的鱼 --- */
  if (fishes.length) {
    const lx = cam.x - FISH_CULL, rx = cam.x + innerWidth + FISH_CULL;
    for (let i = fishes.length - 1; i >= 0; i--) {
      const f = fishes[i];
      if (f.x < lx || f.x > rx) fishes.splice(i, 1);
    }
  }

  /* --- 吃鱼检测（通过 score/生命 变化，零侵入原版）--- */
  if (score > V.prevScore) {
    const d = score - V.prevScore;
    V.prevScore = score;
    V.eatCount++;
    V.mouthT = performance.now();   // M1 视觉：吃鱼瞬间张嘴（张嘴 90ms → 咀嚼闭合 220ms）
    V.combo++; V.comboT = 2.4;
    V.maxCombo = Math.max(V.maxCombo, V.combo);
    V.coinsRun += Math.round(d * 0.01 * (1 + V.up.combo) * coinMul());   // 积分 = 得分 × 0.01 × (1+连击大师) × 难度倍率
    gainExp(1 + V.up.harvest);
    if (V.combo > 0 && V.combo % 5 === 0) sfx(520 + V.combo * 20, .1, 'square', .06, 1000);
  } else { V.prevScore = score; }
  if (V.comboT > 0) { V.comboT -= dt; if (V.comboT <= 0) V.combo = 0; }
  if (V.prevLives !== lives) { if (lives < V.prevLives) V.combo = 0; V.prevLives = lives; }

  /* --- 冲刺位移 --- */
  if (V.dashCd > 0) V.dashCd -= dt;
  /* M5：旋转水波技能计时 */
  if (V.spinCd > 0) V.spinCd -= dt;
  if (V.spinT > 0) V.spinT -= dt;
  if (V.dashT > 0) {
    V.dashT -= dt;
    P.x = clamp(P.x + V.dashX * 1250 * dt, P.r, W - P.r);
    P.y = clamp(P.y + V.dashY * 1250 * dt, P.r, H - P.r);
    pointer.x = P.x; pointer.y = P.y;
    if (Math.random() < .8) V.parts.push({ x: P.x, y: P.y, vx: rnd(-40, 40), vy: rnd(-40, 40), r: rnd(3, 7), life: .35, c: '#8fd6ff' });
  }
  /* --- 疾风：额外吸附指针（减弱：叠加多层时之前会把速度拉得忽快忽慢） --- */
  if (V.up.swift) {
    const k = Math.min(.35, dt * 1.1 * V.up.swift);
    P.x += (pointer.x - P.x) * k; P.y += (pointer.y - P.y) * k;
  }
  P.x = clamp(P.x, P.r, W - P.r); P.y = clamp(P.y, P.r, H - P.r);

  /* --- 吸星：把小鱼拉过来 --- */
  if (V.up.magnet) {
    const R = P.r * 4 + 60;
    for (const f of fishes) {
      const dx = P.x - f.x, dy = P.y - f.y, d = Math.hypot(dx, dy);
      if (d < R && d > 1 && f.r < P.r) {
        const pull = (1 - d / R) * 320 * dt;
        f.x += dx / d * pull; f.y += dy / d * pull;
      }
    }
  }
  /* --- 暴食：能吃掉更大的奶龙 --- */
  if (V.up.devour) {
    const lim = P.r * (0.95 + V.up.devour * 0.16);
    for (let i = fishes.length - 1; i >= 0; i--) {
      const f = fishes[i];
      if (f.r <= P.r * .95 || f.r > lim) continue;
      const fy = f.y + Math.sin(now / 400 + f.wobble) * f.wobbleAmp * .15;
      if (Math.hypot(f.x - P.x, fy - P.y) < P.r * .85 + f.r * .9) {
        playEat();
        score += Math.round(f.r);
        /* M6：线性代数「变小」期间暂停成长，保证 10 秒内保持最小体型 */
        if (!(V.m6ShrinkT > 0)) P.r += (1.6 * cfg.growthMul) * (f.r / P.r) + .3 * cfg.growthMul;
        fishes.splice(i, 1); spawnFish(false); updateHud();
      }
    }
  }

  /* --- Boss 调度 --- */
  const WIN = cfg.winSize;
  const triggers = [WIN * .42, WIN * .68, WIN * .95];
  // 进入无尽星数循环后，Boss 由 endless 推进逻辑按波生成，这里不再按体型调度；
  // 但无尽模式的前 3 个 Boss（未进循环前）仍走正常调度
  if (!V.bosses.length && !(GAME_MODE === 'endless' && V.endless.active)) {
    if (V.bossIdx < 0) {
      if (!V.trig[0] && P.r >= triggers[0]) { V.trig[0] = true; spawnBoss(0); }
    } else if (V.bossIdx < 2 && V.nextBossAt && now >= V.nextBossAt) {
      const nx = V.bossIdx + 1;
      if (!V.trig[nx] && P.r >= triggers[nx] * .82) { V.trig[nx] = true; spawnBoss(nx); }
      else V.nextBossAt = now + 3000;
    }
  }

  /* --- 无尽模式：待生成波次的轮询补生成 ---
     根因修复：原来用 setTimeout 延迟生成下一波，回调守卫 `state === 'playing'`；
     若玩家在延迟窗口内升级触发「进化」弹窗（state 变 'levelup'），回调被静默跳过
     且无重试，导致这一波 Boss 永久消失。改成由主循环轮询：只要还有待生成波次、
     场上没 Boss、时间到了，就补生成 —— 升级弹窗结束后恢复 playing 也会自动补上。 */
  if (GAME_MODE === 'endless' && V.endless.active && V.endless.pendingWave > 0 &&
      !V.bosses.length && now >= V.endless.nextWaveAt) {
    V.endless.pendingWave--;
    spawnEndlessWave();
  }

  updateBoss(dt);
}

function updateHUD2() {
  if (!V) return;
  /* M5c：血条可见性由主循环每帧兜底（原版 start/reset 时序不稳导致偶尔不显示） */
  if (state === 'playing' || state === 'levelup') hpbox.classList.add('on');
  const c = document.getElementById('v2coin'); if (c) c.textContent = fmt(S.coins + V.coinsRun);
  const cm = document.getElementById('v2combo'); if (cm) cm.textContent = V.combo;
  const lt = document.getElementById('lvt'); if (lt) lt.textContent = 'Lv.' + V.lvl;
  /* M4：左下角血条 + 已选进化技能 */
  const hf = document.getElementById('hpfill');
  if (hf) {
    hf.style.width = (V.hp / V.maxHp * 100) + '%';
    const txt = Math.ceil(V.hp) + ' / ' + V.maxHp;
    const num = document.getElementById('hpnum'); if (num) num.textContent = txt;
    const num2 = document.getElementById('hpnum2'); if (num2) num2.textContent = txt;
  }
  const ub = document.getElementById('upbox');
  if (ub) {
    let html = '';
    for (const u of UPGRADES) {
      const n = V.up[u.id] || 0;
      if (n > 0) html += '<div class="upic">' + u.ic + (n > 1 ? '<span>' + n + '</span>' : '') + '</div>';
    }
    if (ub._html !== html) { ub.innerHTML = html; ub._html = html; }
  }
  const db = document.getElementById('dashbtn');
  if (db) {
    /* M6：皮肤专属技能按钮文案（无技能皮肤保持「冲刺」） */
    const skl = M6_SKILLS[S.equipped];
    /* M7：清屏技能显示独立 60 秒冷却 */
    if (skl && skl.kind === 'clear') {
      if ((V.clearCd || 0) > 0) { db.classList.add('cd'); db.querySelector('b').textContent = Math.ceil(V.clearCd); }
      else { db.classList.remove('cd'); db.querySelector('b').textContent = skl.btn; }
    }
    else if (V.dashCd > 0) { db.classList.add('cd'); db.querySelector('b').textContent = V.dashCd.toFixed(1); }
    else { db.classList.remove('cd'); db.querySelector('b').textContent = skl ? skl.btn : '冲刺'; }
  }
  /* M5：旋转水波技能按钮冷却 */
  const sb = document.getElementById('spinbtn');
  if (sb) {
    if (V.spinCd > 0) { sb.classList.add('cd'); sb.querySelector('b').textContent = Math.ceil(V.spinCd); }
    else { sb.classList.remove('cd'); sb.querySelector('b').textContent = '水波'; }
  }
}

requestAnimationFrame(loopV2);
updateShopCoin();

/* ---- 云服务初始化：会话恢复（手机号登录，无外站回调） ---- */
(async function initCloud() {
  if (!CLOUD) return;
  try {
    /* M8：微信授权回跳处理 —— URL 带 code+provider=wechat 时自动换取会话 */
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('code') && (q.get('provider') === 'wechat' || q.get('provider_id') === 'custom-oauth')) {
        const r = await cloudTimeout(CLOUD.auth.handleWechatWebCallback(), 12000, 'wxcallback');
        history.replaceState(null, '', location.pathname);   // 清掉回跳参数，刷新后不重放
        if (r && r.error) toast('微信登录失败：' + (r.error.message || '授权换取失败'));
        else { await refreshCloudUser(); renderLoginBadge(); toast('微信登录成功', true); }
      }
    } catch (e) { }
    await refreshCloudUser();
    renderLoginBadge();
  } catch (e) { }
})();

/* ---- 调试出口（便于自动化测试，不影响游戏）---- */
window.__v2 = {
  get V(){ return V; }, get S(){ return S; }, get player(){ return player; },
  SKINS, UPGRADES, BOSS_DEFS,
  tryDash, spawnBoss, defeatBoss, gainExp, skinById, renderShop, playBossVoice, playStartJingle,
  damageBoss, trySpinAttack, hitPlayer, applyLv,
  get invincibleUntil() { return invincibleUntil; },
  __forceInvuln(ms) { invincibleUntil = performance.now() + ms; },
  M6_SKILLS, get m6Shots() { return V ? V.m6Shots : []; },
  get fishCount() { return (typeof fishes !== 'undefined' && fishes) ? fishes.length : -1; },
  get clearCd() { return V ? (V.clearCd || 0) : 0; },
  m6StartSkill, m6ClearScreen, tryDashCore, eatOrb,
  get cam() { return cam; }, BOSS_SIZE,
  get voice() { return _bossVoice; }, get voiceSrcLen() { return BOSS_VOICE_SRC.length; },
  get cloudUser() { return cloudUser; },
  cloudLogin, cloudLogout, fetchLeaderboard, reportEndlessScore
};
})();
