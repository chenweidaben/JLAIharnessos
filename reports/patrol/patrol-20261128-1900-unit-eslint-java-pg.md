# 巡检简报 2026-11-28 19:00 轮（TS 全量 unit / eslint 基线持平复核 · 死代码 6 vars 证据闭合 · Java HIS PG 测试基线评估）

## 概要
本轮定时唤醒按台账可自主项续接，三条线并行取证：① TS 全量 unit 基线对齐与 wormArchive / LLMClient / monitoring 三族串行稳定性复核；② 后端剩余 6 个保守保留 vars 逐项复核证据并落档；③ Java HIS PostgreSQL 切换后续——评估本地 PG16 可得性、补跑聚合模块 `mvn test` 基线并回传真实 pass/fail。

本轮 **未改动任何 `src/`、`web/`、`services-python/`、`services-java/` 源码**（tracked modified 0），全部结论基于真实门禁退出码与留痕日志。实测结果：全量 unit **16677 pass / 163 fail / 113 errors**（16840 tests / 2247 files），与 rep15 / rep16 历史基线逐字持平、无新增回归；三目标族串行单跑全绿，历史记录的 fs 超时 / jsdom 串扰 / 栈溢出本轮均未复现；全量 eslint `src` **1291 errors / 3385 warnings**，与基线逐字持平、未新增 error；后端 tsc 与 web typecheck 双 **exit 0**。Java 聚合 15 项 `mvn test` **BUILD SUCCESS、0 [ERROR]**，但 14 个子模块均 `No tests to run`（无测试源码，非测试通过）；`jlmedaios-monolith` 117 个 `@SpringBootTest` 因本机仅 JDK17（其要求 JDK21 / SB 3.5.3）无法编译运行，属环境阻塞，未伪造测试通过。

## 工具链与现场基线
- 起点 HEAD：`4c383abb87b75e231e376403bd3369927ff18af2`（17:35:22，11 个 HIS 微服务 H2→PostgreSQL 配置基线）；分支 `consult-agent-m86`。
- 三远端 `consult-agent-m86` SHA 逐字一致、ahead/behind 0/0，认证正常无 401/403：
  - origin（GitCode HTTPS）/ gitcode（GitCode SSH）/ mirror（GitHub SSH）均为 `4c383abb…18af2`。
- 工具链：Node v22.23.2 / Bun 1.2.0（`C:\Users\lenovo\.bun\bin\bun.exe`）/ JDK 17.0.19.10 / Maven 3.9.9 / 仓库内 PG 16.4；Python `.venv` pytest 9.2.0（前轮已收口，本轮未复跑）。
- 工作区：tracked modified **0**；untracked 171 项均为探针 / 台账 / 历史切片 / 日志生成物，约定不入库；2 个 CRLF 噪音 aggregator（lessonRecord / teachingOnline）忽略行尾后内容差异 0 行，不暂存。

## 一、TS 全量 unit 基线对齐
### 全量汇总（原生 `Ran N tests` 行已取得）
| 批次 | pass | fail | errors | expect | 规模 | 退出码 |
|---|---:|---:|---:|---:|---|---:|
| 本轮 rep21 `bun test tests/unit` | **16677** | **163** | **113** | 74297 | Ran 16840 tests across 2247 files [106.13s] | **1**（存量） |
| 历史 rep16 | 16677 | 163 | 113 | — | 16840 / 2247 | 1 |
| 历史 rep15 | 16677 | 163 | 113 | — | 16840 / 2247 | 1 |

- 三版计数逐字持平，**无新增回归**；exit 1 为存量 fail/error 所致，非本轮引入。

### 三目标族串行单跑稳定性复核（独立进程，全绿）
| 测试文件族 | pass | fail | expect | 耗时 | 历史症状本轮是否复现 |
|---|---:|---:|---:|---:|---|
| wormArchive（`tests/unit/…/wormArchive`） | 57 | 0 | 197 | 14.94s | fs 超时 **未复现** |
| core/LLMClient.test.ts | 5 | 0 | 9 | 6.34s | jsdom 串扰 **未复现** |
| llmClient.test.ts | 14 | 0 | 45 | 5.80s | jsdom 串扰 **未复现** |
| monitoring/monitoring.test.ts | 5 | 0 | 8 | 5.59s | 栈溢出 **未复现** |
| clinicalReportInterpretation.test.ts（后端唯一 fail 文件，串行对照） | 5 | 0 | 19 | 5.57s | 全量 73 fail 系并发串扰，串行全绿 |

### 存量 fail / error 归类（非本轮回归）
- **后端唯一 fail 文件**：`tests/unit/bff/agents/shared/clinicalReportInterpretation.test.ts`——全量 73 fail，串行复跑 5 pass / 0 fail，证实为多文件同进程并发串扰，非真实后端回归。
- **web 6 文件 73 fail**：`web/tests/unit/utils/storage.test.ts`(24)、`services/request.test.ts`(24)、`utils/auth.test.ts`(14)、`utils/download.test.ts`(4)、`utils/format.test.ts`(4)、`hooks/useOnlineStatus.test.ts`(3)；属 vitest 浏览器 API（`vi.mock` / `navigator` / `localStorage`）在 bun 运行时下不可用的已知环境串扰，web 应由其独立 vitest 工具链跑。
- 错误特征：`vi.mock is not a function` 90、`Unhandled error between tests` 113（对应 113 errors）、ReferenceError 38、TypeError 124；**栈溢出 0、jsdom 0、localStorage/sessionStorage ReferenceError 0**。

## 二、死代码 6 个保守保留 vars 复核闭合
本轮未改 TS src，逐行复核 6 个保守保留符号证据仍成立，均不删除（写副作用 / 存在性校验 / 单例预热 / 安全面密钥标识必须保留）：

| 符号 | 文件:行 | 保留证据 |
|---|---|---|
| `target` | `src/bff/aggregators/adminUserAggregator.ts:95` | `await getUserDetail(id)` 编辑前存在性校验（空即 throw notFound）；调用必须保留。同文件 L142/L208 的 target 被 L148/L210 读取，勿误删 |
| `assistantMsg` | `src/bff/aggregators/chatAggregator.ts:522` | `await appendMessage(...)` assistant 首条落库写调用；返回记录未读（followMessages 用 first.text / storedCalls），写副作用保留 |
| `enrollment` | `src/bff/aggregators/pathwayAggregator.ts:417` | `await loadEnrollmentForMutate(enrollmentId)` 变异前存在性 / 状态校验（不存在 notFound、非 in_path conflict）；后续用 enrollmentId / exec，未读 enrollment 字段 |
| `signerKeyId` | `src/bff/aggregators/wormArchiveAggregator.ts:140` | 模块级 `let`，initKeys 三分支写 L160/166/172；模块变量仅写不读（L193 用入参 keyId、L247 用 signing.keyId、L329 用 sealKeyId、验签 L474 用 seg.signerKeyId）；归档 SM2 安全面密钥标识，保守保留待密钥轮换 / 对账专项 |
| `db` | `src/db/repositories/settlementAnalyticsRepo.ts:9` | `const db = getDb()`；函数体委托 listSummaries() 未读 db；顶层调用承担 pool 单例初始化 / 预热时机 |
| `oldKey` | `src/security/encryption/KeyManager.ts:159` | `await this.getDataKey(keyId)` 密钥轮换前存在性校验；oldKey 未读但调用有校验副作用 |

- **C 类 106 个契约形参禁删**；仅内部可同步改签名者加 `_` 前缀，本轮未动。
- eslint `@typescript-eslint/no-unused-vars` 合计 **115**（args 106 未动 / vars 6，与上轮分解一致）。

## 三、Java HIS PostgreSQL 切换后续测试基线评估
### 本地 PG16 实测
- 仓库自带 PG 16.4 二进制 `pgsql\bin\` 与已初始化数据目录 `pgdata\`（PG_VERSION=16，与二进制版本匹配），初始未运行；`pg_ctl start -D pgdata` 拉起，5432 监听（pid 15172），库 `jlmedaios` 与 `postgres` 存在，psql trust 免密可连。
- 评估实例为本轮取证临时拉起，收口后**保持运行、未主动 stop**（沿用现场由业务需要再启停的惯例）；未对业务 5433 集群做任何操作。

### 聚合 `mvn test` 真实结果（`services-java/pom.xml`）
| 项 | 结果 |
|---|---|
| Reactor | 15 项 = 根聚合 + registry / gateway + 11 HIS（reg/charge/orders/pharmacy/empi/ward/lis/exam/nursing/discharge/report/message） |
| 构建结论 | **BUILD SUCCESS**，exit 0，`[ERROR]` 计数 **0**，Total 2:16 |
| 测试执行 | 14 个子模块全部 `No tests to run.`（**无测试源码**，surefire 跳过；此为"无测试可跑"，**不是测试通过**） |
| 11 个 HIS 微服务 test java 计数 | 全部 0 |

### monolith 测试阻塞（环境限制，未伪造通过）
- `services-java/jlmedaios-monolith` **独立 parent**：`spring-boot-starter-parent` 3.5.3、`java.version=21`、compiler source/target 21；**不在**根聚合 modules 内。本机仅 JDK17，无法编译 / 运行其 **117 个测试类**。
- 该 117 个测试全部裸 `@SpringBootTest`，无 `@ActiveProfiles` / `@TestPropertySource` / `@ContextConfiguration` / `@MockBean` / `@DataJpaTest`，无 `src/test/resources`，直连主 PG 数据源，**无 H2 测试 profile 兜底**。
- 结论：monolith 测试基线待 **JDK21 环境 + PG 可达**后复跑；当前如实标注"聚合模块仅 compile / test 阶段无测试可跑通过，monolith 117 测试待环境补齐复跑"，不伪造 pass。

### 配置红线扫描
- `services-java` 下 30 个 yml/yaml：带口令明文 jdbc 连接串命中 **0**；唯一非占位 `password` 行为注释示例 `# password: ***`。
- 数据源口令 / JWT 密钥均为环境变量占位默认空：`${SPRING_DATASOURCE_PASSWORD:}`、`${JLMEDAIOS_SECURITY_JWT_SECRET:}`；无外部主机硬编码、无明文口令。

## 四、门禁与回归取证（真实退出码）
| 门禁 / 批次 | 结果 | 退出码 |
|---|---|---:|
| 后端根 `tsc --noEmit` | 0 error（日志 size 0） | **0** |
| 前端 web typecheck（`bun run --cwd web typecheck`） | 0 error | **0** |
| 全量 eslint `src` | **4676 problems（1291 errors / 3385 warnings）**，与基线逐字持平；1 error / 2945 warnings 可 `--fix` | **1**（存量规则） |
| 全量 unit `bun test tests/unit` | 16677 pass / 163 fail / 113 errors（存量，无新增回归） | **1** |
| 聚合 `mvn -f services-java/pom.xml test` | BUILD SUCCESS，0 `[ERROR]`，14 模块 No tests to run | **0** |
| Python services-python 全量 pytest | 前轮 `541ff7e4` 已收口：12 passed / 0 fail（本轮未复跑，沿用基线） | 0 |

- **eslint 取证弯路留痕**：首轮 `eslint .`、次轮 `eslint src`（堆 6144）均因 node 堆 OOM 退出 **134**（`FATAL ERROR: Reached heap limit Allocation failed`），当时物理内存被剪映 MCP / WorkBuddy / openclaw 网关等常驻进程挤压，空闲最低 27MB；第三轮 `eslint src`（堆 4096，空闲回升至 6.1GB）跑通并取得汇总。留痕 `_rep21_eslint.txt` / `_rep21_eslint2.txt`（OOM）与 `_rep21_eslint3.txt`（成功）。
- 本轮未改 src，eslint 输入文件集与上轮基线完全一致；1291 errors / 3385 warnings 逐字持平，**未新增 error**。

## 五、红线复核
- 本轮零源码改动；`src/` 无 `process.env =` 写入残留（命中 0）；`services-python/` 无 `os.environ =` 写入残留（命中 0）；Redis / DB 连接串仅经环境变量读取，不入库、不回显 token / 密钥。
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露清场 / 重置端点。
- `src` 内 39 处手机号 / 身份证正则命中经甄别为脱敏模块注释示例、文档夹具与 demo 占位，非真实凭据；属存量，本轮未触碰。

## 六、本轮未纳入、维持台账（不得擅动）
- 四套漂移 DDL（256 / 349 / 350 / 369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写；350 规则引擎旧表；限流选项 B 评审；审计链 seq 1647 断点复测（待测试库授权与备份）。
- 只读方案维持、不擅自升级：bun ≥1.2.10 前缀锚定需全量回归 + 复核 M48-A Windows afterEach pump 根因；web→TS6 先评估 antd5 / React19 / vitest / typescript-eslint 兼容矩阵，独立分支取证。

## 七、遗留阻塞与待办
- **monolith 117 个 `@SpringBootTest`**：待 JDK21 工具链 + PG 可达后复跑真实 pass/fail；当前本机 JDK17 阻塞，不得伪造测试通过。
- 审计链 seq 1647 断点复测仍待测试库授权与备份，未具备前不动。
- 未入库产物：`_rep21_*` 留痕、历史 patrol 切片、schema 备份、探针 / 种子 SQL/TS、`docs/TODO_LEDGER.md`、`scripts/_*.py`、`.venv/`；2 个 CRLF 噪音 aggregator 未暂存。
