# 巡检简报 · 2026-11-06 14:35（两小时滚动巡检 · 主线独立复跑）

仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
产品正式名：健澜AI原生医院操作系统OS（本文档已脱敏，不对标任何厂商真名）
本轮槽位：2026-11-06 14:25 触发、14:35 落盘（+08:00）

## 一、智能体状态

- 组织智能体 `o_000Rfj7NkAk`：executing，overall 90%，version 581（较 12:27 轮 571 推进）。
- 本轮组织侧新增 8 条提交（起始 HEAD `83395acf`），改动 7 文件：6 个源码文件 + `scripts/brand-scan.mts` + P5-18 简报。
- 逐行复核结论：均为类型级整改（`require` 改顶层 import / `createRequire`、`interface extends` 改 type 别名、`as` 断言改局部 `const` narrowing、`@ts-expect-error` 改显式窄化），未发现业务语义漂移。
- 需要登记的两点：① `wormKeyProvider.ts` 新增 4 处 `eslint-disable-next-line prefer-nullish-coalescing`（均带「空串也要回退」理由注释，属有理由的抑制，非静默放行）；② `wormArchiveAggregator.ts` 新增 2 处抑制（`no-require-imports`、`no-unsafe-argument`），后者无理由注释，质量欠账。

## 二、工具链（本轮实测）

node `v22.23.2` / bun `1.2.0` / npm `10.9.8`；git 需前置 `$env:PATH`。

## 三、代码健康门禁（全部主线独立复跑，不采信组织侧自报）

| 门禁 | 结果 | 取证 |
|---|---|---|
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0 / 0 字节（修复前后各跑一次，均 0） | `logs/patrol-1425-tsc-root.log`、`-root2.log` |
| web tsc（cwd=`web`，`bun x tsc --noEmit`） | exit 0 / 0 字节（修复前后各一次） | `logs/patrol-1425-tsc-web.log`、`-web2.log` |
| 单测 11 文件 | 153 pass / 0 fail / 441 expect（9.59s） | `logs/patrol-1425-unit.log` |
| VendorAdapters 单测（修复后复跑） | 7 pass / 0 fail / 9 expect | `logs/patrol-1425-vendor.log` |
| worm E2E 两轮（隔离实例 8081） | 23 pass / 0 fail / 81 expect ×2 | `logs/patrol-1425-e2e-r1.log`、`-r2.log` |
| 改动 7 文件 eslint（直连 eslint，绕过 lint-diff） | 0 errors / 33 warnings | `logs/patrol-1425-eslint.log` |

E2E 隔离做法：`HTTP_PORT=8081` 另起 bun 进程（`server.ts` 只认 `HTTP_PORT`，不认 `PORT`），以 `BFF_BASE_URL=http://127.0.0.1:8081` 跑用例，避免污染用户手工测试用的 8080 实例；跑完即停，8081 已释放。

## 四、品牌脱敏扫描（本轮核心发现：组织侧脚本假绿，主线抓出 2 处真残留）

- 组织侧脚本 `bun run scripts/brand-scan.mts --paths 'src web/src tests'`：`filesScanned=12127 / wordsLoaded=29 / totalHits=0 / backlogGangos=0`，exit 0。
- 主线独立复扫（`src` + `web/src`，9816 文件，逐文件 `ReadAllText` + `ToLowerInvariant` + `IndexOf` 计数，四套词表：中文真名 / 中文简称 / 拼音 / 英文别名）：
  - 首扫 24 hits / 5 文件；修复后 21 hits / 3 文件。
  - 修复后剩余全部为既定口径内项：`gangos` 13 处（指标前缀 backlog，改动会打断 Prometheus 采集，单列不计硬违规）、`winning` 8 处（`winningSupplierId` 招投标业务字段，误报排除）。
  - **硬违规 0**。
- **本轮就地修复的 2 处真残留（P0）**：
  1. `src/integration/adapters/his/VendorCHISAdapter.ts` L84/L91：默认 `endpoint` / `tokenUrl` 仍带厂商简称路径（整串 URL 未进替换表，与 12:27 轮 `zhiye` 同类漏网）→ 改为 `/vendor-c`。
  2. `web/src/pages/demo/ArchitecturePage.tsx` L149：「4 大厂商骨架」一行同时列出三家对标厂商中文简称 → 改为 `HIS厂商B / C / D / E`。
- **组织侧假绿根因（第二次复现）**：`scripts/brand-scan.mts` L67 用 `content.indexOf(w)`（大小写敏感 Ordinal），而词表 `logs/brand-words-reversed.txt` 仅 29 词且不含中文简称 `东华/智业/联众` 与小写别名 `dhc`；同时 `gangos_` 前缀命中被归入 backlog 后不计入 `totalHits`，导致「0 命中」既不覆盖大写变体、也无法自证覆盖范围。12:27 轮沉淀的「词表必须含中文真名/拼音/英文别名」经验未落到脚本里，属同一条经验第二次被绕过。
- 误报登记：`zy ` / `lz ` 在 router、aggregator 中的 60+ 处命中为普通英文单词子串（`lazy` 等），非违规。

## 五、运行态（实测）

| 端口 | 归属 | 实测 |
|---|---|---|
| 8080 | BFF bun，pid 47636（14:11:54 启动） | `/health` `/ready` `/api/v1/health` `/api/v1/system/health` `/metrics` 全 200 |
| 5174 | 本仓库前端 Vite，pid 42928（本轮新起） | `/`、`/login` 200；`/src/main.tsx` 200(6983B)；`/src/pages/demo/ArchitecturePage.tsx` 模块 200 且内容已脱敏；代理 `/api/v1/health` 200 |
| 5173 | **非本仓库进程**（node/vite，pid 41116，14:18:50 由沙箱运行时启动，`--strictPort` 占口） | 首页 200，但其 `App.tsx` 无 demo 页面引用、非本仓库快照；本仓库 `pages/demo/*` 在该实例下全部落 SPA 兜底（非代码缺陷，是副本不同源） |
| 8000 | python，pid 12744 | 本机 LLM 打桩服务，非项目进程 |
| 3000 / 9090 | 无监听 | — |

处置：不杀他人沙箱进程；本仓库另起 5174 作为工作台入口，5173 保持原状。上一轮的工作台前端实例（bun/vite，pid 47252）已不在，属外部进程占位导致的自然替换。
8081（本轮 E2E 隔离实例 pid 10268）已 `Stop-Process`，端口已释放。

## 六、本轮处理项与提交

- 修复：2 文件（`VendorCHISAdapter.ts` +2/-2、`ArchitecturePage.tsx` +1/-1），commit `c5bcdc25`。
- 组织侧 8 条提交（`254f122e` → `83395acf`，含 P5-18 简报与 `scripts/brand-scan.mts`）本轮主线复核后随推送一并收口，未做改写、未做覆盖式重写。
- 工作区仍有 38 项未跟踪（p0–p4 切片简报等另一路产物），按纪律本主线不代提交、不删除。

## 七、双仓推送与四 ref 核对

- 推送：`git push gitcode consult-agent-m86:master consult-agent-m86`、`git push mirror consult-agent-m86:master consult-agent-m86`。
- 核对：`git ls-remote <remote> refs/heads/master refs/heads/consult-agent-m86` 与本地 `git rev-parse HEAD` 逐位比对，四 ref 全部一致（本轮不在此文档固化最终 SHA，以 `git ls-remote` 实测值为准）。
- 未推 `origin`（HTTPS 内嵌票据口径）、未推 `heagentos`、未打 tag。

## 八、遗留风险与下一轮重点

1. `scripts/lint-diff.mts` 大文件假绿（`execFileSync` 缺 `maxBuffer`，默认 1MB；`server.ts` 7236 行 + `fix` 字段输出约 4.5MB → 抛错被 `catch {}` 吞掉 → 恒报 0 error）。组织侧提出的三条增量修复（加 maxBuffer / catch 内计入 `lint-run-failure` / eslint 输出 strip `fix`）需主线授权，本轮仍未授权、未修改；当前自证一律直连 eslint 绕过该脚本。
2. `scripts/brand-scan.mts` 大小写敏感 + 词表缺中文简称，需升级为大小写不敏感并补齐「中文真名 / 中文简称 / 拼音 / 英文别名」四套词条，否则每轮都要靠独立复扫兜底。
3. 扫描文件数口径三套并存（组织侧 12127 / 其代理 5244 / 主线 9816），需写清路径集合与排除规则后才能做基线可比。
4. 组织侧 `server.ts`「lint 清到 0」的自证从未被独立验证（其自陈先 commit 后注入，`lint-diff` 以已提交版本为基线看不到工作区 diff）。
5. 待拍板清单未变：`layered.put` 断网兜底 A/B/C、E2E `AUDIT_DB_SCHEMA` 数据隔离、`/ready` 非生产 `auditStore=memory` 是否降级 `degraded`、`WORM_BACKEND` 默认是否改 `fs`、`docs/**` 历史商业分析文档内厂商真名是否专项脱敏。
6. 5173 被外部沙箱进程长期占口，工作台入口改走 5174；若下一轮 5174 也被占，需先核对占用进程归属再决定是否迁移。
7. `wormArchiveAggregator.ts:86` 的 `no-unsafe-argument` 抑制缺理由注释，建议组织侧补注释或改真类型。

## 九、下一轮重点

- 复核组织侧是否落实 lint-diff 授权项与 brand-scan 词表升级；若仍自报「品牌 0」，继续以主线独立四套词表复扫为准。
- 复核 P5-18 之后新切片是否引入新的 `as`/`!` 断言替代型修复，逐提交看 diff 而非看自报。
- 保持 E2E 隔离实例做法（`HTTP_PORT` + `BFF_BASE_URL`），不重启用户正在手工测试的 8080。
