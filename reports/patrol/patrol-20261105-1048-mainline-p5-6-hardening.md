# 巡检简报 · 2026-11-05 10:48 槽位（主线 P5-6 独立复核 + 三缺陷硬修）

- 轮次标签：1048（槽位标签，与墙钟存在历史性偏差；本简报写盘墙钟为 10:58 前后）
- 巡检对象：本机 HIS-EMR 仓库 `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- 本轮入口基线 HEAD：`ae13684f`（组织侧 P5-6 收口，2026-11-05 10:29:28 +0800）
- 本轮产物 commit：`2b40d0b7`（fix(worm)：P5-6 自动调度三处真缺陷修复）

## 一、组织智能体进度

`peek_task_progress(o_000Rfj7NkAk)`：status=2，摘要显示 `finished; 85.00% executing`，version 332，
round 4605–4609。摘要正文描述的仍是 P5-4 WORM 国密硬化重做内容，与本轮 HEAD（P5-6 `ae13684f`）
不符，判定为**摘要滞后**而非真停工——HEAD 已含 P5-6 完整提交链（`b54f54ea` → `0bcbaeb4` →
`fa4f091d` → `ae13684f`），故本轮未发纠偏消息，仅登记该摘要/百分比语义不一致。

旧智能体 `o_000pZ6W0z5F` / `o_000pKWRkDCO` / `o_000EkD3iWsb` / `o_000E2mfsz5X` 维持终态，不再巡查。

## 二、工具链与门禁（本轮现跑，不沿用旧会话口径）

工具链：node `v22.23.2` / bun `1.2.0` / npm `10.9.8`；`git` 不在 PATH，需前置
`C:\Program Files\Git\cmd`（`git version 2.54.0.windows.1`）。

| 门禁 | 命令 | 结果 |
|---|---|---|
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit` | exit 0，日志 0 字节 |
| web tsc | `bun x tsc --noEmit`（cwd=web） | exit 0，日志 0 字节 |
| 路由体检 | `node logs/route-audit.cjs` | 2870 声明 / 2870 唯一 / 0 dup / 2863 lazy / 0 missing |
| 品牌 17 词 | Ordinal 逐文件扫描 `src` + `web/src` | files=9808 hits=0 hitFiles=0 |
| `gangos_` 存量 | 专项 backlog | 2 文件（不计硬违规） |
| 单测 | `bun test ./tests/unit/wormArchive.test.ts` | 39 pass / 0 fail / 94 expect |
| E2E | `bun test ./tests/integration/worm-e2e.test.ts` | 21 pass / 0 fail / 60 expect |

单测由 34 例增至 39 例，新增 5 例均为本轮缺陷的回归锚点。

## 三、运行态

开局实测：3000/5173/8000/9090 无监听；8080 为 bun pid 27404（`run src/bff/index.ts`），
其启动时间 10:27:28 **早于** `fa4f091d`(10:28:54)，即跑的是修复前的旧代码；5173 未起（前端不可用）。

就地处置：

1. 拉起 Vite：`C:\Program Files\nodejs\node.exe node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173`
   → pid **6528**，`http://127.0.0.1:5173/` = 200 len=894。
2. 杀掉陈旧 BFF pid 27404，以 `DEMO_MODE=1` 重启 → pid **16972**，六端点全绿。
3. 三处缺陷修复完成后再次重启 BFF → pid **29964**（启动 10:58:01），确保运行态加载的是最新代码。

重启后健康端点：`/health` 200、`/ready` 200、`/api/v1/health` 200、`/api/v1/system/health` 200、
`/metrics` 200；`/api/v1/worm/store/info` = 401（admin 鉴权，预期行为，非故障）；前端 `/` = 200 len=894。

## 四、代码审查与就地修复（本轮核心）

对组织侧 P5-6 交付做主线独立复核（`src/bff/aggregators/wormAuto.ts`），发现三处会被调用方
真实观察到的行为缺陷，全部就地修复，未扩大改动范围（仅该文件 + 其单测）：

### 缺陷 A：`setAutoConfig` 部分更新被 `undefined` 覆盖

路由层把未提供的字段显式传成 `undefined`（`typeof b.enabled === 'boolean' ? b.enabled : undefined`），
原实现 `{ ...cur, ...cfg }` 会让 `enabled`/`threshold` 变成 `undefined`；`JSON.stringify` 丢键后
`getAutoConfig` 再用 `DEFAULT_CONFIG` 补齐 → 一次"只改 intervalMs"的 POST 会把 `enabled` 悄悄
回退为 `false`、`threshold` 回退为 10。**部分更新语义被破坏**。

修法：白名单合并，只接受显式给出的 `enabled`(boolean) / `intervalMs`(有限数，下限 1000) /
`threshold`(有限数，下限 1) / `lastSealAt`(string|null)，其余键一律不进 patch。

### 缺陷 B：`tick()` 的时间窗分支被阈值吃掉

原逻辑先判 `elapsed < intervalMs && pending < threshold` 返 `interval-not-elapsed`，再判
`pending < threshold && lastSealAt` 返 `below-threshold`，等价于**只有 pending ≥ threshold 才可能封段**；
而设计口径是"距上次 seal 超 intervalMs **或** 事件数 ≥ threshold，任一成立即封"。结果：低事件量
场景下时间窗自动归档永不触发，P5-6 核心能力之一实际失效。

修法：`intervalDue = elapsed >= intervalMs`、`thresholdDue = pending >= threshold`，二者皆不成立
才返 `below-threshold`。（`TickResult` 联合类型保留 `interval-not-elapsed` 字样，编译无碍；现有断言
集合 `['no-events','disabled','below-threshold']` 仍成立。）

### 缺陷 C：`search` 分页参数无防御

`limit: q.get('limit') ? Number(q.get('limit')) : 50` → `?limit=abc` 得 NaN，
`slice(offset, offset+NaN)` 静默返回空页；负数/0 同理，且无上限可被放大扫描。

修法：`MAX_LIMIT = 500`；`limit`/`offset` 非有限数或 ≤0 时回落 50/0 并截顶。

### 新增回归测试（tests/unit/wormArchive.test.ts，+5 例）

1. 部分更新不清空其它配置字段（undefined 不得覆盖）
2. 配置越界值被夹紧（intervalMs < 1000、threshold < 1）
3. 时间窗触发：间隔已到即使未到阈值也封段
4. interval 未到且未到阈值 → 不封段（`below-threshold`）
5. `limit` 非法（NaN/负数/0）回退默认且不返回空页；超大 limit 截顶 500

## 五、仓库卫生

- 已跟踪改动全部提交，工作区 tracked 干净。
- 未跟踪 368 项，全部位于 `reports/`，属另一路 consult 任务产物——本主线不代提交、不删除。
- 根目录 `*.txt` 1361 个、`logs/` 3154 个文件；`.gitignore:33` = `logs/` 已覆盖，
  `git check-ignore -v logs/patrol-1048-unit.log` 实测命中，不污染版本库。

## 六、分组提交与双仓推送

本轮 1 组语义提交：

| commit | 内容 | 范围 |
|---|---|---|
| `2b40d0b7` | fix(worm)：P5-6 自动调度三处真缺陷修复 + 5 例回归测试 | `src/bff/aggregators/wormAuto.ts`(+35/−9)、`tests/unit/wormArchive.test.ts`(+47) |

推送与 SHA 核对结果见巡检回执（简报正文按纪律不写死自身最终 SHA，避免自我指涉再补 commit）。

## 七、遗留风险与下一轮重点

1. **组织侧摘要滞后**：version 332 摘要仍描述 P5-4 内容、`finished; 85% executing` 语义自相矛盾。
   下一轮继续以 git 实证（HEAD/提交链）为真值，摘要仅作参考。
2. **DEMO_MODE 下 SM2 临时密钥**：fs 后端重启后老段不可验签，属设计取舍，需合规口径裁决
   （demo 也落盘密钥文件 / 非 env 密钥直接拒绝启动）。用户尚未表态。
3. **轮次标签与墙钟系统性偏差**：今日已存在 `patrol-20261105-1123…1855` 等晚于当前墙钟的文件名，
   说明槽位标签跨轮复用且与真实时间脱节，来源仍未查明；是否统一订正全部历史简报命名待裁决。
4. **`gangos_` 存量 2 文件**：专项 backlog，不混入硬违规计数。
5. **E2E 破坏性探针**：`_tamper*` 钩子会改写 BFF 内存态，跨轮复跑前若见红，先判内存残留假红
   （重启清库存，禁改断言）。
6. 下一轮重点：复核组织侧新切片产出是否落地；继续 P5-6 的调度可观测性（tick 结果落审计）与
   检索性能（大段扫描）两项增强的可行性评估。
