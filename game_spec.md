# game_spec.md — 神金海豹大作战 技术规格与核心保护清单

> 本文件是项目的**技术宪法**。所有开发前必读，改动前必查【禁止修改】清单。
>
> - 项目名称：神金海豹大作战
> - 当前版本：V0.5
> - 文档基线：B0（2026-10-15）
> - 开发分支：`naiyu0.5`（**禁止直接修改 `main`**）
> - 在线试玩：https://shenjin-seal.app.workbuddy.host/
> - 仓库：https://github.com/qwe0305/naiyu

---

## 1. 项目概览

### 1.1 一句话定位

单文件 H5 网页小游戏：玩家操控一只海豹，吞噬比自己小的鱼不断成长，躲避比自己大的鱼；融合皮肤收集、金币商店、升级强化、Boss 战与无尽模式。

### 1.2 产品形态

| 项目 | 说明 |
|---|---|
| 运行形态 | **单 HTML 文件**，双击即玩，无需服务器、无需联网（云功能除外） |
| 目标平台 | 桌面浏览器 + 移动端浏览器（含 Edge / Chrome / Safari / 微信内置浏览器） |
| 玩法类型 | 吞噬成长（io 类）× 休闲闯关 × 收集养成 |
| 游戏模式 | 单局挑战（3 档难度）、无尽模式（星级递进 + 选卡） |
| 商业化 | 暂无内购/广告；皮肤与升级均用局内金币解锁 |
| 云能力 | WorkBuddy 云服务：手机号登录、个人资料、无尽排行榜 |
| 包体 | 主 HTML 约 **841 KB**（含全部 CSS/JS/贴图 base64） |

### 1.3 立项约束

- **零依赖原则**：不引入 npm 包、不引入框架、不引入 CDN 运行时（云 SDK 除外，且本地优先）。
- **单文件交付原则**：最终产物必须是单个 `.html`，所有资源内联。
- **原版保护原则**：原版核心逻辑视为不可变资产，扩展一律通过挂钩（monkey patch）实现（详见第 6 节）。

---

## 2. 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 渲染 | **Canvas 2D API** | 单一 `<canvas>`，2D context，`requestAnimationFrame` 主循环 |
| 语言 | **纯 JavaScript（ES5 + 少量 ES6 语法）** | 无 TypeScript、无转译、无 polyfill |
| 模块化 | **IIFE** `(function(){ 'use strict'; ... })()` | 扩展层整体包裹，不污染全局（仅挂 `window.__v2` 调试口） |
| 样式 | 原生 CSS（内联 `<style>`） | 无预处理器 |
| 音频 | **WebAudio API** 程序合成 + base64 内联 mp3 | 原版 `beep()` 合成音；扩展层 `sfx()` 合成音；Boss 出场音为内联 mp3 |
| 存储 | **localStorage** | 5 个 key，详见 §5.3 |
| 云 | WorkBuddy Cloud SDK | `wb-cloud-sdk.js` 本地加载 + CDN `document.write` 兜底 |
| 构建 | `源码/merge.py`（Python 3） | **当前已失效**，详见 §7.2 |
| 包管理 | **无** | 无 `package.json` / `node_modules` |
| 测试 | **无** | 无测试框架、无自动化测试，全靠真机手测 |
| 版本控制 | Git / GitHub | 主分支 `main`，开发分支 `naiyu0.5` |

### 2.1 关键版本要求

- 浏览器：支持 Canvas 2D、WebAudio、localStorage、ES6 `const/let/箭头函数`（即 Chrome 49+ / 现代浏览器均可）。
- WorkBuddy 云 SDK：`wb-cloud-sdk.js` 随游戏目录分发，版本跟随主仓库。

---

## 3. 目录结构

```
naiyu/
├── README.md                      # 项目说明（玩法/皮肤/难度/Boss 表）
├── README.html                    # README 的网页版
├── 交付说明.pdf                    # 交付文档
├── .gitignore                     # 忽略 .wbapp_*.genie、.workbuddy/
├── game_spec.md                   # ← 本文件（技术规格 + 保护清单）
├── game_plan.md                   # 里程碑计划
├── game_progress.md               # 进度基线记录
│
├── 游戏/                           # 【产物目录】可直接运行
│   ├── 神金海豹大作战_v2.html       # ★ 唯一可运行产物（841 KB）
│   └── wb-cloud-sdk.js            # 云服务 SDK（67 KB）
│
├── 源码/                           # 【源码目录】
│   ├── v2-extension.js            # ★ 扩展层全部源码（103 KB / 2082 行）
│   └── merge.py                   # 构建脚本（路径已失效，见 §7.2）
│
├── 素材/                           # 【资源目录】40 个文件
│   ├── skins/                     # 10 套皮肤原图 + *_已处理256.png（构建用缩略图）
│   ├── boss/                      # boss.png / boss2.png / boss3.png / boss-avatar.png / boss-kangaroo.jpg / boss-shop.png / waimai_orb.png
│   └── audio/kangaroo.mp3         # 袋鼠 Boss 音效
│
├── 文档/                           # 【内容文档】
│   ├── 游戏策划方案.html
│   └── 皮肤图鉴.jpg
│
└── 历史版本/                        # 【归档，禁止改动】
    ├── 旧版游戏_index.html         # V0.4 及更早的可运行版本
    └── 旧版源码_game-src.html      # V0.4 及更早的源码
```

### 3.1 文件职责速查

| 你想做的事 | 应该改哪个文件 |
|---|---|
| 加新玩法 / 新皮肤 / 新 Boss | `源码/v2-extension.js` **和** `游戏/神金海豹大作战_v2.html` 内嵌扩展层（**两份必须同步**） |
| 改渲染 / 碰撞 / 难度曲线 | ⛔ **禁止**。见第 6 节 |
| 换皮肤贴图 | `素材/skins/` → 需重新构建或手改 HTML 内 base64 |
| 改云服务配置 | `游戏/神金海豹大作战_v2.html` 内扩展层的 `createWorkBuddyCloud({...})` 参数 |
| 改玩法数值（金币、价格、倍率） | `源码/v2-extension.js` 顶部常量区 |

---

## 4. 架构总览

### 4.1 双脚本分层架构

整个游戏由**两层脚本**组成，运行时叠加：

```
┌─────────────────────────────────────────────────────────┐
│  原版核心层（HTML 第 80–404 行 <script>）                 │
│  职责：canvas 渲染、精灵图、碰撞检测、难度配置、主循环      │
│  对外：通过全局函数暴露，无模块系统                        │
│  状态：【禁止修改】                                        │
└─────────────────────────────────────────────────────────┘
                    ↕  函数挂钩（monkey patch，12 处）
┌─────────────────────────────────────────────────────────┐
│  扩展层（追加在 </body> 前 的 <script>）                  │
│  源码真身：源码/v2-extension.js（2082 行）                │
│  职责：皮肤/商店/金币、8 种升级、Boss 战、无尽模式、        │
│        云登录与排行榜、设置面板、HUD 增强                   │
│  状态：可自由修改                                          │
└─────────────────────────────────────────────────────────┘
```

### 4.2 挂钩机制（Hook / Monkey Patch）

扩展层的接入方式统一为「**先保存原函数，再替换为包装函数**」：

```js
// 典型模式
const _drawPlayer = drawPlayer;
drawPlayer = function () {
  _drawPlayer();          // 先执行原版逻辑
  /* ...扩展绘制（皮肤、无敌闪烁、护盾等）... */
};
```

**已挂钩的 12 个原版函数**（扩展层入口，改动扩展层时必须理解）：

| 挂钩函数 | 原版职责 | 扩展层叠加内容 |
|---|---|---|
| `drawBackground` | 绘制海底背景 | 皮肤主题背景、无尽模式色调 |
| `drawFish` | 绘制鱼 | 鱼种皮肤变体、Boss 子弹外观 |
| `drawPlayer` | 绘制玩家海豹 | **皮肤贴图替换**、无敌闪烁、冲刺残影 |
| `spawnFish` | 生成鱼 | 难度倍率 `SPAWN_MUL`、Boss 出现判定 |
| `setPointer` | 记录指针位置 | 屏幕→世界坐标换算（配合镜头） |
| `updateHud` | 更新 HUD 文字 | 等级条、连击数、金币、冲刺 CD |
| `endGame` | 结束对局 | 结算金币、Boss 进度持久化、无尽波次判定 |
| `playEat` | 吃鱼音效 | 音量控制、连击音效 |
| `beep` | 通用提示音 | 覆盖为低音量版本 |
| `reset` | 重置对局 | 重置扩展层局内状态 `newV()` |
| `start` | 开始对局 | 初始化 Boss、无尽模式 |
| `resize` | 窗口尺寸适配 | 世界尺寸重算、镜头重置 |

> ⚠️ **挂钩点的函数名、参数个数、调用时机是原版与扩展层的契约。** 修改扩展层时不得假设原版会被改动；原版一旦改动，这 12 个挂钩全部有失效风险。

### 4.3 世界坐标与镜头系统

- 原版坐标系是**世界坐标**，世界尺寸 `W × H` 随设备变化：
  - 手机端：视口 × **3.0**
  - 电脑端：视口 × **1.45**
- 镜头 `cam = {x, y}` 负责世界→屏幕平移，跟随玩家。
- 指针换算：屏幕触摸坐标 → 减去 `cam` 偏移 → 世界坐标。
- 扩展层通过挂钩 `setPointer` 与 `resize` 介入该换算。

### 4.4 主循环（双 rAF）

存在**两个并行的 `requestAnimationFrame`**：

| 循环 | 位置 | 职责 |
|---|---|---|
| `loop(t)` | 原版 | 物理更新、碰撞、渲染、`state` 状态机 |
| `loopV2(now)` | 扩展层 | 积分推断、Boss 逻辑、无尽波次、粒子、HUD 增强 |

> ⚠️ 两循环**共享同一帧时钟但不互相感知**。任何跨层状态读写都依赖全局变量，改动时注意竞态与帧序。

---

## 5. 核心数据与接口

### 5.1 原版核心状态（禁止修改）

| 标识 | 含义 |
|---|---|
| `state` | 游戏状态机（`'ready' \| 'playing' \| 'over'` 等） |
| `player` | `{ x, y, r }` 海豹位置与半径 |
| `fishes[]` | 全部鱼对象数组 |
| `bubbles[]` | 气泡粒子 |
| `score` | 当前分数 |
| `lives` | 剩余生命 |
| `invincibleUntil` | 无敌截止时间戳 |
| `pointer` | 指针目标位置（世界坐标） |
| `cam` | 镜头偏移 |
| `W` / `H` | 世界宽高 |
| `WIN_SIZE` | 通关所需体型 |
| `MAX_LIVES` | 最大生命 |
| `START_SIZE = 26` | 初始半径 |
| `GROW_PER_EAT = 1.6` | 每吃一条鱼的半径增长 |
| `DIFFS` | 难度表：`easy` / `hard` / `hell`，每档含 `winSize` / `fishCap` / `spawnRate` |
| `cfg` | 当前生效难度配置 |
| `FISH_IMGS` | 鱼贴图资源表 |
| `sealImg` | 海豹贴图 |

### 5.2 扩展层核心状态（可修改）

**全局存档对象**

| 变量 | localStorage key | 内容 |
|---|---|---|
| `S` | `sealV2` | `{ coins, owned[], equipped, bossKilled, endlessBest }` |
| `SET` | `sealV2Set` | `{ vol, spawnMul, testMode }` |
| — | `sealV2Profile` | 昵称、头像（base64 缩略图） |
| — | `sealBest` | 原版最高分（由原版写入） |

**局内状态对象 `V`（由 `newV()` 创建）**

| 字段 | 含义 |
|---|---|
| `level` / `exp` | 等级与经验（等级上限 **Lv.9**） |
| `combo` | 连击计数与倍率 |
| `dash` | 冲刺（冷却/持续时间） |
| `bosses[]` / `bossIdx` / `bossDone` / `trig` | Boss 队列、当前索引、击杀数、触发标记 |
| `endless` | `{ star, round, roundDone, lastPicks, active, pendingWave, nextWaveAt }` |
| `bullets[]` / `waves[]` / `snakes[]` / `parts[]` | Boss 弹幕、音浪环、蛇形曲线、粒子 |
| `prevScore` / `prevLives` | **上一帧**分数/生命，用于零侵入事件推断 |
| `hurtFlash` / `surviveT` | 受伤闪屏、存活计时 |

**关键常量**

- `SKINS`：11 项皮肤表（含默认 `classic`）

  | id | 价格 | 解锁条件 |
  |---|---|---|
  | `classic` | 0 | 默认 |
  | `base` | 200 | — |
  | `moyushuang` | 800 | — |
  | `binghongcha` | 1200 | — |
  | `leshi` | 2000 | — |
  | `gaodengshuxue` | 2500 | — |
  | `xiandaishuxue` | 3500 | — |
  | `jiahao` | 5000 | — |
  | `naiyu` | 8000 | `bossReq: 1` |
  | `xiangjiao` | 10000 | `bossReq: 2` |
  | `wjh` | 15000 | `bossReq: 3` |

- `UPGRADES`：8 种升级 — 巨化 / 疾风 / 吸星 / 暴食 / 连击大师 / 铁壁 / 闪充 / 丰收
- `BOSS_DEFS`：3 个 Boss — `dj`（音浪环）/ `moyu`（辣油散射）/ `math`（蛇形函数线）；`BOSS_SIZE = 112`
- `SPAWN_MUL`：生成倍率（见 §7.5）

### 5.3 关键函数接口

| 函数 | 层 | 说明 |
|---|---|---|
| `newV()` | 扩展 | 创建/重置局内状态 `V` |
| `hitPlayer(dmg, fromBoss)` | 扩展 | 受伤统一入口：无敌判定 → 扣命 → 缩小 → **1800ms 无敌** |
| `sfx(name)` | 扩展 | 合成音效播放（受 `SET.vol` 控制） |
| `drawBossLayer()` | 扩展 | Boss 与弹幕渲染；使用全局 `dtFrame` |
| `tryDash()` | 扩展 | 触发冲刺 |
| `spawnBoss()` / `defeatBoss()` | 扩展 | Boss 出场 / 击败 |
| `cloudLogin()` | 扩展 | 云服务登录与资料同步 |

### 5.4 调试出口

```js
window.__v2   // 调试命名空间
```

暴露：`V`、`S`、`SKINS`、`tryDash`、`spawnBoss`、`defeatBoss`、`cam`、`cloudLogin` 等。

> 这是**唯一允许的全局污染**。调试新功能时可继续在 `__v2` 上挂接口。

### 5.5 Boss 击杀持久化

```js
if (V.bossDone > (S.bossKilled || 0)) S.bossKilled = V.bossDone;
```

Boss 击杀数为**跨局累积**，用于解锁 `naiyu` / `xiangjiao` / `wjh` 皮肤。改动时不得破坏此累积语义。

---

## 6. 【禁止修改】核心清单

> **本节是硬约束。** 以下模块属于原版游戏逻辑，是全部扩展能力的地基。任何改动都可能导致挂钩失效、难度失衡或存档损坏。

### 6.1 禁止修改的文件

| 文件 | 原因 |
|---|---|
| `游戏/神金海豹大作战_v2.html` 中**第 80–404 行的原版 `<script>` 块** | 原版核心逻辑，扩展层全部挂钩点在此 |
| `历史版本/旧版游戏_index.html` | 历史归档，仅供比对，不得改动 |
| `历史版本/旧版源码_game-src.html` | 历史归档，仅供比对，不得改动 |

> 允许修改的是 `神金海豹大作战_v2.html` 中**第 406 行之后**（扩展层 `<script>`）以及云 SDK 引用的参数区。

### 6.2 禁止修改的模块与函数（原版核心层）

| 模块 | 内容 | 为什么禁止 |
|---|---|---|
| **画布与适配** | `resize()` | 决定世界尺寸 `W/H`（手机 ×3.0 / 电脑 ×1.45）与镜头基准；改动将导致所有坐标换算失效 |
| **资源加载** | `sealImg`、`FISH_IMGS`、`spriteFor()`、`pickTier()` | 贴图寻址与鱼种分层规则；扩展层的皮肤替换依赖其输出结构 |
| **音效基座** | `playEat()`、`stopAllVoices()`、`beep()`、`EAT_SOUNDS` | 扩展层挂钩覆盖；改动将破坏音效链与音量控制 |
| **难度配置** | `DIFFS`、`cfg`、`WIN_SIZE`、`MAX_LIVES` | 难度与通关条件的数据源；扩展层通过倍率叠加而非改源 |
| **对局生命周期** | `reset()`、`start()`、`endGame()` | 状态机的唯一切换点，挂钩点所在；改动将导致扩展层状态不重置 |
| **生成逻辑** | `spawnFish()` | 鱼生成规则与上限 `fishCap`；Boss 出现判定挂在此处 |
| **渲染核心** | `drawFish()`、`drawPlayer()`、`drawBackground()` | 全部视觉绘制；挂钩点所在 |
| **碰撞与物理** | `loop(t)` 内部碰撞判定 | 核心手感：`player.r*0.7 + f.r*0.75` 判定距离；`f.r < player.r*0.95` 吃、`f.r > player.r*1.05` 被咬；`ease=8` 缓动 |
| **输入** | `setPointer()` | 指针→世界坐标换算的唯一入口 |
| **HUD** | `updateHud()` | 原版 HUD 文字，扩展层挂钩叠加 |
| **数值常量** | `START_SIZE = 26`、`GROW_PER_EAT = 1.6` | 成长曲线基准 |

### 6.3 禁止破坏的契约

1. **挂钩点函数名与调用时机**：不得重命名、不得改变原版调用顺序。
2. **`DIFFS[k].winSize / fishCap / spawnRate` 的原始写读语义**：扩展层用 `Object.defineProperty` 把 `spawnRate` 改为 getter 叠加 `SPAWN_MUL`，**新代码不得再次改写同一属性**。
3. **`score` / `lives` 的数值单调语义**：扩展层靠 `prevScore`/`prevLives` 差值推断事件；不得让这两值出现非正常抖动。
4. **localStorage 的 5 个 key 名与数据结构**：改名或改结构将导致老玩家存档丢失。
5. **`window.__v2` 的调试接口**：可以增加，不得移除已有成员。
6. **`f.r < player.r*0.95` / `f.r > player.r*1.05` 的判定阈值**：手感核心，改动需单独评审。

### 6.4 改动前自检清单

- [ ] 我改的文件不在 §6.1 名单里？
- [ ] 我改的代码在 `神金海豹大作战_v2.html` 第 406 行之后？
- [ ] 我没有重命名/删除 §4.2 的 12 个挂钩函数？
- [ ] 我没有二次改写 `DIFFS[*].spawnRate`？
- [ ] 我改的是 `naiyu0.5` 分支（`git branch` 确认）？
- [ ] `源码/v2-extension.js` 与 HTML 内嵌扩展层是否已同步？

---

## 7. 已知限制与潜在隐患

> 按严重度排序。P0 = 阻断开发；P1 = 高风险；P2 = 需关注。

### 7.1 扩展层双份源码，存在漂移风险（P1）

**现象**：扩展层代码存在于**两处** —— `源码/v2-extension.js`（真身）与 `游戏/神金海豹大作战_v2.html`（第 406–2496 行内嵌副本），两者各约 2082 行。

**风险**：README 明示「两者保持同步」，但**没有任何自动化机制**。只改一处会导致源码与产物不一致，下次构建时改动丢失。

**建议**：任一里程碑涉及扩展层时，**必须同步两处**，并在 `game_progress.md` 记录同步状态。

### 7.2 构建脚本 `源码/merge.py` 已失效（P0）

**问题一（路径）**：脚本内为原作者机器的绝对路径

```python
ORIG = /root/uploads/1791981645701006561-11f199330d93c35b_v17.html   # 不存在
SKIN_DIR = /workspace/assets/skins/_processed                        # 不存在
```

**问题二（文件名）**：脚本引用 `ROOT/'v2.js'`，而仓库实际文件名为 `v2-extension.js`。

**影响**：当前**无法回归构建**。换素材、改扩展层后只能手工改 HTML，属于高风险操作。

**建议**：排入 `game_plan.md` 的 M1 里程碑（重建可运行的构建链路）。

### 7.3 无工程化基础设施（P2）

无 `package.json`、无构建工具、无 lint、无测试、无 CI。所有质量保障依赖真机手测。三份项目文档（`game_spec.md` / `game_plan.md` / `game_progress.md`）在本次之前**完全缺失**。

### 7.4 云服务配置暴露（P2）

- `publishableKey` 硬编码在 HTML 前端（设计如此，publishable 语义可接受，但需确认权限范围最小化）。
- 排行榜 `endless_leaderboard` 表为**公开可读**，需确认无敏感字段。

### 7.5 `spawnRate` getter 改写破坏原语义（P2）

扩展层用 `Object.defineProperty` 把 `DIFFS[k].spawnRate` 改成了 getter（读取时返回 `原值 × SPAWN_MUL`）。

- 影响：`DIFFS` 不再是纯数据对象，任何遍历/序列化/深拷贝都会触发 getter。
- 约束：`SPAWN_MUL` 的赋值时机必须在 `defineProperty` 之前完成。

### 7.6 双 rAF 主循环并存（P2）

`loop(t)` 与 `loopV2(now)` 并行运行，无统一帧调度。跨层状态共享依赖全局变量与帧序，存在**竞态窗口**。新增跨层逻辑时优先在已有挂钩点内完成，避免新起第三个循环。

### 7.7 依赖全局变量 `dtFrame`（P2）

`drawBossLayer()` 的粒子更新使用全局 `dtFrame`，而非从参数传入。任何时序调整都可能影响粒子速度表现。

### 7.8 音效版权（P1，法律风险）

Boss 出场音效来源为抖音 **@墨夏汐**，**商用需获得授权**。若后续引入广告变现或付费，必须先解决授权或替换音源。

### 7.9 素材体积（P2）

`素材/skins/` 单张原图 460–580 KB，10 套合计约 5.4 MB。产物通过 `*_已处理256.png`（约 40–57 KB）压缩，最终 HTML 仍达 841 KB。首屏加载在弱网下有压力，可作为性能优化里程碑的输入。

---

## 8. 本次文档与代码的冲突点记录

| 冲突点 | 冲突内容 | 处理方式 |
|---|---|---|
| 分支名 | 用户要求「改动仅在 `naiyu` 分支」，但仓库仅有 `main` | 已向用户确认，实际采用分支名 **`naiyu0.5`**；`main` 不做任何修改 |
| `v2.js` 文件名 | `merge.py` 引用 `v2.js`，仓库实际为 `v2-extension.js` | 记录为隐患 §7.2，排入 M1 修复 |

---

## 9. 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|---|---|---|---|
| 2026-10-15 | B0 | 首次自动重建三份项目文档，建立技术规格与禁止修改清单 | AI 工作流 |

---

> **下一份文档**：`game_plan.md`（里程碑计划） · **基线记录**：`game_progress.md`
