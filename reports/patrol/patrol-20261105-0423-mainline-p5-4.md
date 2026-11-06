# 槽位 0423 轮滚动巡检（墙钟 2026-11-05 04:23）· P5-4 国密硬化复核

> 命名说明：`patrol-20261105-0423-mainline.md` 已被更早一轮（P2-1 时期，文件 mtime 2026-11-04 21:52）占用，本轮不覆盖历史证据，另存为带切片后缀的 `-mainline-p5-4.md`。可见轮次标签会跨轮复用，检索时须以 commit 时间 + 文件 mtime 定位。

## 本轮时间与口径

- 执行墙钟：`2026-11-05 04:23`（`get_current_time` 实测 04:23:12）。
- 入轮基线 HEAD `4daf496c`（P5-4 简报），工作分支 `consult-agent-m86`。

## 1. 智能体进度

组织智能体 `o_000Rfj7NkAk` 状态 **finished / 100%**，无 error、无卡死，本轮有实质产出。

**P5-4 WORM 国密硬化（经一次推翻重做）**

| 阶段 | commit | 说明 |
|---|---|---|
| 首版 | `0ff8ae31` + `b4a5afa4` | **伪国密**：`aes-128-cbc` 顶替 SM4、`P-256` 顶替 SM2，已废弃 |
| 重做 | `159428fa` | sm-crypto 真国密：SM3 摘要 + SM4-CBC 加密 + SM2 签名 |
| 台账 | `7efbc384` | 台账回写重做 |
| 简报 | `4daf496c` | 组织侧槽位 0255 |

推翻理由成立：Bun 内置 crypto 确实不支持国密（`SM3/SM4/SM2 = NONE`），但子代理漏查仓库已声明并已安装的 `sm-crypto@0.5.8`，转而用算法不等价的替代品冒充。SM4 与 AES 是两套算法、SM2 与 P-256 是两条曲线，密评不认，按"禁止降级简化"必须驳回。

**进度摘要滞后（观察项）**：`peek_task_progress` 的 `last_task_summary` 仍停在首版 `0ff8ae31` / `19/19`，与实际终态（`159428fa` / 20 单测）不一致。巡检以 git 与实测为准，不采信该摘要的 commit 号与用例数。

## 2. 代码健康门禁（本人实测）

### 工具链

node `v22.23.2` / bun `1.2.0` / npm `10.9.8`；`sm-crypto@^0.5.8` 在 `package.json` 声明且 `node_modules\sm-crypto` 已安装。

### 双 tsc

| 命令 | 退出码 | 日志大小 |
|---|---|---|
| 根 `node node_modules/typescript/bin/tsc --noEmit` | **0** | **0 字节** |
| `web` 下 `bun x tsc --noEmit` | **0** | **0 字节** |

取证：`logs\patrol-0423-tsc-root.log`、`logs\patrol-0423-tsc-web.log`。

### 路由体检

| 指标 | 实测 |
|---|---|
| path 声明 | 2,870 |
| 唯一 path | 2,870 |
| 重复 | **0** |
| 懒加载 import | 2,863 |
| 懒加载缺失 | **0** |

P5-4 只加 `/worm/keys`、`/_tamper-digest`、`/_tamper-signature` 三条 BFF 路由，未动前端路由表，2,870 条继续全唯一。

### 品牌 / 脱敏扫描

17 词 Ordinal 扫描 **9,806 文件 / 0 命中**。`gangos_` 存量指标名出现在 2 个文件，属专项 backlog，不计硬违规。

## 3. 国密实现独立复核（不信自报）

### 标准向量（本人跑 `logs\sm-verify-0423.js`）

| 项 | 实测 |
|---|---|
| SM3(abc) | `66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0` |
| 命中 GB/T 32905-2016 | **true** |
| SM4-CBC 往返 | **true**（key 32 hex / iv 32 hex） |
| SM2 公钥 | 130 hex，前缀 `04` |
| SM2 私钥 | 64 hex |
| SM2 签名 | 128 hex |
| 验签真 / 改明文后 | **true / false** |

### 算法不等价残留

`aes-128`、`aes128`、`aes-256`、`P-256`、`p256`、`prime256v1`、`namedCurve`、`结构等价`、`同构` 在 4 个 P5-4 切片文件（`wormArchiveAggregator.ts`、`routes\worm.ts`、`wormArchive.test.ts`、`worm-e2e.test.ts`）**0 命中**，伪国密已彻底清除。

### 密钥暴露面

- `worm.ts` 中 `privateKey` / `privateKeyHex` / `signerPrivate` 字符串 **0 命中**，无硬编码私钥输出路径。
- 未带 admin 凭证访问 `/api/v1/worm/keys`、`POST /api/v1/worm/verify?scope=real` 均返 **401** —— RBAC 正确拦截，非缺陷。

## 4. 切片测试（脏进程接续跑）

在组织侧自跑过、**未重启**的同一只 BFF（pid 53808）上依次跑：

| 轮次 | 结果 |
|---|---|
| 单测 `tests\unit\wormArchive.test.ts` | **20 pass / 0 fail / 40 expect** |
| E2E R1 `tests\integration\worm-e2e.test.ts` | **14 pass / 0 fail / 36 expect** |
| E2E R2（紧接 R1，同进程） | **14 pass / 0 fail / 36 expect** |

关键意义：P5-4 新增了 `/_tamper-digest`、`/_tamper-signature` 两个**新的破坏性钩子**，理论上存在重演 P5-2 内存污染的风险。R1 跑完后立刻在**同进程**跑 R2 且全绿，证明这两个钩子只作用于影子探针段、不污染真实段——污染问题没有复发。取证 `logs\patrol-0423-worm-unit.log`、`-r1.log`、`-r2.log`。

## 5. 运行态

| 端口 | 状态 | 进程 |
|---|---|---|
| 8080 | LISTEN | bun pid **53808**，启动 `02:47:45`（组织侧 P5-4 重做后重启，含最新代码） |
| 5173 | LISTEN | node pid 11528，启动 `11-01 19:28:03`（Vite 长期在跑） |
| 3000 / 8000 / 9090 | 无监听 | — |

健康端点：`/health`、`/ready`、`/api/v1/health`、`/api/v1/system/health`、`/metrics`、前端 `5173/` **六项全 200**。无端口冲突、无进程崩溃。

## 6. 仓库卫生

| 指标 | 实测 |
|---|---|
| `git status --porcelain` | 360 |
| 已跟踪改动 | **0** |
| 未跟踪 | 360，全部在 `reports/`（另一路 consult 任务），本主线不代提交、不删除 |
| 仓库根文件 | 2,166（探针/日志，均被 `.gitignore` 的 `/*.txt`、`*.log` 覆盖，未污染索引） |

## 7. 本轮处理项

未发现 P0 缺陷：双 tsc 双零、路由零重复零悬空、品牌零命中、国密标准向量命中、算法残留清零、测试双轮全绿、六端点全 200。

本轮无源码改动，无修复型分组提交；仅落简报 1 个 commit。新增取证脚本 `logs\sm-verify-0423.js`（国密标准向量复核，可复用），属 `logs/` 不入库。

## 8. 分组提交与双仓推送

| 步骤 | 结果 |
|---|---|
| 本地 commit | `docs(patrol): 槽位 0423 轮巡检——P5-4 国密硬化独立复核全绿` |
| `git push gitcode consult-agent-m86:master` + 分支 | 成功（fast-forward，无强推） |
| `git push mirror consult-agent-m86:master` + 分支 | 成功 |

推送后 `git ls-remote` 核对：本地 HEAD、gitcode master / 分支、mirror master / 分支五处逐位一致（值见交付回复，不在此写死以免自我指涉）。

不推 origin、不推 heagentos；未打 tag。

## 9. 遗留风险与下一轮重点

1. **伪国密两 commit 留在历史**：`0ff8ae31`、`b4a5afa4` 已被 `159428fa` 覆盖，但仍在 git 历史中。不做 force push / 历史改写（任务口径禁止），由台账 `7efbc384` 记录废弃原因。风险是后续 bisect 或人工翻历史时误引该版实现，建议在台账或 README 加警示。
2. **组织侧进度摘要滞后**：`peek_task_progress` 停在首版 commit 与 `19/19`，与实测不一致。巡检继续以 git + 实测为准。
3. **P5-4 未覆盖**：段落盘对象存储/S3（本机无 S3 环境）、自动时间窗触发 seal、跨段 seq 连续性校验、冷数据查询索引、SM2 密钥轮换与 HSM/KMS 对接。
4. **P5-2/P5-3 未覆盖项**仍在台账：SM4 段加密已由 P5-4 补上，但段级对象存储、PIX/PDQ、XDS Provide&Register 双事务、EMPI 批处理匹配未动。
5. **另一路 consult 任务 360 个未跟踪目录**持续堆积在 `reports/`，不属本主线，未处置。
6. **密钥来源仍是 demo-ephemeral**：`keySource=demo-ephemeral`，SM2 密钥为进程内临时生成；生产需接 KMS/HSM 与密钥轮换，当前仅标记未实现。
7. **轮次标签跨轮复用**：本轮 0423 与更早 P2-1 轮重名，已实测确认并另存文件名；后续命名建议固定加切片或日期序号后缀。

### 下一轮重点

- 复核组织智能体续做（方向交其自选：WORM 段级对象存储抽象 + 跨段 seq 连续性、SIEM Syslog/CEF、Captcha 登录链路、租户科室分级限流、EMPI 批处理匹配 / PIX-PDQ）。
- 常规门禁：双 tsc 双零、品牌 17 词 0 命中、路由 2,870 条唯一、六端点 200。
- 每轮同时推 master 与 `consult-agent-m86` 分支，防止 master 再次滞后。

7x24 不停工。
