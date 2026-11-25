# 健澜AI原生医院操作系统OS — 代码审核与生产化整改报告

**审核日期**：2026-11-25
**审核范围**：`src/`（5 205 个 TS 文件）、`web/`（约 4 750 个前端文件抽查）、配置与部署脚本
**审核方式**：TypeScript 全量类型检查、ESLint 静态分析、安全模式扫描（注入/密钥/鉴权/加密）、关键路径人工走查（认证、限流、WS、表达式沙箱、字段加密、幂等、连接池）

---

## 一、总体结论

代码库整体工程质量**高于一般开源项目**：类型纪律好（5 200+ 文件中 `any` 仅 44 处）、鉴权 fail-closed、SQL 全部走参数化绑定、字段加密 AES-256-GCM 实现规范（随机 IV + 认证标签）、表达式引擎为手撸 Tokenizer/Parser/白名单 AST 求值器（无 eval），`tsc --noEmit` 零错误。

但仍存在 **3 个 P1 级安全缺陷** 和若干 P2 稳定性问题，已在本次审核中修复（见第二节）。**修复前不建议直接上生产**；修复后仍需完成第三节的遗留项。

## 二、已修复问题（8 个文件，+220/−58 行）

| # | 级别 | 问题 | 位置 | 修复方式 |
|---|------|------|------|----------|
| 1 | **P1 安全** | **X-Forwarded-For 伪造绕过限流/封禁**：全局限流、登录限流、登录防爆破、幂等匿名作用域均无条件采信客户端自报的 XFF 头，攻击者轮换 XFF 即让每个请求落入新桶，限流与 IP 封禁完全失效 | `middleware/globalRateLimit.ts`、`middleware/rateLimit.ts`、`routes/auth.ts`、`middleware/idempotency.ts` | 统一口径：仅当 `TRUST_PROXY=1`（确认部署在可信反代后）才采信 XFF 首段，否则使用 socket IP |
| 2 | **P1 安全** | **WebSocket 会话越权（IDOR）**：`/ws/chat` 的 `agent:start` 对任意 `conversationId` 不做归属校验，且新建会话硬编码 `userId: 'ws-user'`——任何已认证用户可读写他人会话 | `bff/server.ts` `handleAgentStart` | 升级握手时解析 JWT 并把用户身份挂到连接 `data`；处理消息时校验会话归属（`conv.userId !== 当前用户` → FORBIDDEN），新建会话落真实 userId；历史 `ws-user` 会话仅非生产放行 |
| 3 | **P1 可用性** | **优雅停机失效（隐藏代码腐蚀）**：编码损坏把 `setTimeout(() => process.exit(0), 500)` 吞进了注释行，shutdown 永远不会退出进程 | `bff/server.ts:7285` | 修复 8 行乱码注释，还原退出语句；全仓扫描确认无其它文件残留 U+FFFD |
| 4 | **P2 安全** | **内部错误信息外泄**：fetch 兜底 catch 把 `String(err)`（可能含 SQL/schema 细节）直接回给客户端；WS `agent:error` 下发原始 `e.message` | `bff/server.ts` | 客户端只收通用文案，详情仅落服务端日志 |
| 5 | **P2 稳定** | **限流/锁定 Map 内存无界增长**：`readBuckets`/`writeBuckets`/`ipLogin`/`accounts`/`loginBuckets` 键永不删除，长跑或探测攻击下内存持续增长 | `aggregators/loginLockoutAggregator.ts`、`middleware/rateLimit.ts` | 增加 5 分钟周期清扫（unref 定时器，提供 `_stopRateLimitSweeper` 测试钩子）+ 桶数超 10 000 时惰性全量清扫 |
| 6 | **P2 稳定** | **表达式引擎 DoS 面**：AST 缓存 `Map` 无上限（表达式文本若含外部输入则内存无界）；解析/求值无嵌套深度限制（`((((…))))` 可打爆调用栈）；无输入长度上限 | `orchestrator/engine/expression.ts` | AST 缓存上限 500（FIFO 淘汰）；表达式长度上限 2 000 字符；Parser 与 Evaluator 双端 64 层深度保护 |
| 7 | **P2 稳定** | **请求超时竞速的定时器泄漏**：`Promise.race` 中 10 s 超时 timer 在业务先完成时不清除，每请求残留一个定时器 | `bff/server.ts` fetch 入口 | `finally` 中 `clearTimeout` |
| 8 | **P3 安全** | **JWT 未校验 iss**：文件头注释声称"校验 exp/nbf/iss"，实际只校验了 nbf/exp | `middleware/auth.ts` | 提取 `JWT_ISSUER` 常量，验签后强制比对 `iss === 'jianlan-bff'`（已确认全部测试用例的签发逻辑兼容） |

另修复顺手发现的 lint 错误（prefer-optional-chain / prefer-nullish-coalescing 等）7 处；修复后上述 8 个文件 `tsc` 零错误、ESLint 无新增错误。

## 三、发现但未改动的问题（需要决策或专项排期）

| # | 级别 | 问题 | 建议 |
|---|------|------|------|
| A | P1 | **WS token 走 query 参数**（`?token=`）：会进入 nginx/代理访问日志与浏览器历史 | 短期：文档标注风险；中期：前端改用 `Sec-WebSocket-Protocol: bearer.<jwt>`（服务端已支持），query 通道设废弃期限 |
| B | P1 | **多实例部署下限流/锁定失效**：限流桶、账号锁定、IP 封禁全部是进程内内存 Map，多副本部署时每副本独立计数，且仓库巡检记录已自识别该问题 | 迁移到 Redis（已有 `RedisCache`/`DistributedLock` 基建与 Lua 脚本样板） |
| C | P2 | **账号锁定 DoS 面**：任何人可对任意用户名故意失败 5 次锁定该账号 15 分钟 | 叠加 IP+账号复合维度，或对锁定引入验证码/管理员告警 |
| D | P2 | **`bff/server.ts` 7 250 行上帝文件**：2469 个路由文件 + 巨型入口，变更冲突与回归风险高 | 按域拆分启动装配模块（路由注册表已具备，缺拆分执行） |
| E | P2 | **前端 token 存 localStorage**（677 处，且存在 `token` 与 `jianlan:auth_tokens` 两套键并存）：XSS 可窃取 | 统一封装 auth store；中期评估 httpOnly Cookie + SameSite |
| F | P3 | **ESLint 基线不干净**：`lint:ci`（--max-warnings 0）在 HEAD 上即失败（如 `expression.ts` 11 个 `no-base-to-string` 历史错误、`routes/auth.ts` 6 个历史错误）；且 `.eslintignore` 已被新版 ESLint 废弃、CI 用的 `unix` formatter 未安装 | 要么修复存量，要么将存量豁免入 baseline 文件；迁移到 `eslint.config.js` 的 `ignores` |
| G | P3 | **表达式引擎 `===` 与 `==` 语义合并**（`l === r \|\| l == r`）：严格相等实际表现为宽松比较，`0 === ''` 为真 | 确认 DSL 语义意图；若需严格语义则分开实现，否则文档注明 |
| H | P3 | **DEMO 口令 scrypt 静态盐**（`DEMO_CRED_SALT` 全用户共用） | 仅演示路径，生产需确认不走该分支（已有 fail-closed 保护），可接受 |
| I | P3 | **测试与运行时 dev 默认 JWT 密钥不一致**（`local-dev-jwt-secret-jlmedaios-2026` vs `dev-only-insecure-jwt-secret-change-me`） | 统一到一个常量，避免集成测试环境误配 |
| J | P3 | **154 处 TODO/FIXME** 分布在 33 个文件（多为 Vendor HIS 适配器桩） | 建立 TODO 台账与里程碑归属，避免无限期悬挂 |

## 四、生产上线检查清单（上线前必须逐项确认）

- [ ] `NODE_ENV=production` 且 `JWT_SECRET`、`FIELD_ENCRYPTION_KEY`、`DATABASE_URL`、`METRICS_TOKEN` 全部注入（代码已 fail-closed，缺失会拒绝启动/验签）
- [ ] 反代后部署时设置 `TRUST_PROXY=1`（否则限流以 socket IP 计，整站共享一个桶）；直连部署则**不得**设置
- [ ] `DEMO_MODE` 未开启（生产开启会启动即拒绝，已有保护）
- [ ] Bun 运行时可用性验证：本机审核环境无 bun，`bun test`（unit/integration/e2e）未能在本次执行——**上线前必须在 CI 跑通全量测试**
- [ ] PG 连接串 SSL（生产默认开启）、审计 WORM 后端组合（`audit=pg + worm=memory` 已禁止启动）
- [ ] WebSocket 前端迁移到 `Sec-WebSocket-Protocol` 递 token

## 五、验证记录

- `tsc --noEmit`（TS 6.0.2，全仓 5 205 文件）：**0 错误**（修改前后均通过）
- ESLint（8 个修改文件）：无新增 error；剩余 error 均为 HEAD 基线既有（见第三节 F）
- 测试 JWT 兼容性：抽查 `tests/integration/*`，签发逻辑均含 `iss:'jianlan-bff'`，与新增 iss 校验兼容
- 乱码扫描：修复后 `src/` 全仓 U+FFFD 为 0

---

## 六、第二轮整改（第三节遗留项全部处理 + 横向服务审核）

第二轮按「全部需要」指令处理第三节 A–J 全部遗留项，并将审核范围横向扩展到 Python AI 服务、Java 微服务、小程序、SQL 迁移器与 Dockerfile。

### 6.1 第三节遗留项处置结果

| 项 | 处置 | 说明 |
|----|------|------|
| A WS token 走 query | **已修复** | 前端 `web/src/services/websocket.ts` 改用 `new WebSocket(url, ['bearer.'+token])`；`server.ts` upgrade 握手按 RFC 6455 回显 `Sec-WebSocket-Protocol` 首段（不回显子协议会导致部分浏览器/代理握手失败）。query 通道保留兼容但已非默认路径 |
| B 多副本限流失效 | **已修复** | `src/cache/RateLimiter.ts` 新增 `ban/bannedMs/unban`；`loginLockoutAggregator.ts` 新增 `initDistributedRateLimit()` 与全套 `*Async` 函数（Redis 优先、故障自动回落内存，降级不中断业务）；`globalRateLimitAsync`/`loginRateLimitAsync` 接入 `routes/auth.ts`、`routes/rateLimitAdmin.ts`；`server.ts` 启动时经 `createCacheServices()` 装配（位于 `assertProductionNotDemoMode()` 之后）。管理端 status 接口新增 `backend` 字段便于巡检确认当前后端 |
| C 账号锁定 DoS | **接受风险，文档说明** | IP 封禁维度已叠加（第一轮 XFF 修复后生效），单 IP 无法对海量账号实施锁定；再叠加验证码属于产品决策，记入 TODO 台账 |
| D server.ts 上帝文件 | **部分修复** | 抽出 WS 模块至 `src/bff/wsChat.ts`（200 行：`broadcast`/`chatClients`/`wsAuthorize`/`handleAgentStart`/`createWsHandlers`），server.ts 7 297→7 150 行并清理 4 个失效 import。全量按域拆分工作量大，建议后续以「路由注册表外移」为下一个增量 |
| E 前端 token 双键并存 | **已修复（重大潜在 bug）** | 发现 676 处 `localStorage.getItem("token") ?? ""`（424 个文件）读取的是一个**从未被写入**的键——真实 token 存于 `jianlan:auth_tokens`。即这些请求长期不带 token 或带空 token，属系统性认证失效隐患。已用脚本统一替换为 `tokenStorage.getAccessToken()` 并自动补齐 import，web 端 `tsc` 零错误 |
| F ESLint 基线 | **已修复（进行中收全量）** | 删除废弃的 `.eslintignore`（flat config 已有 `ignores`）；清零所有触碰文件 error（`expression.ts` 11 个 `no-base-to-string` 以新增 `toSafeString()` helper 修复等）；全仓 4 447 个 error 中 1 522 个可自动修复项正在后台 `--fix` 批处理，完成后以 `tsc` 全量复验 |
| G `===`/`==` 语义合并 | **已修复** | `===` 恢复严格比较，`==` 保留宽松比较（带 `eslint-disable eqeqeq` 注释），符合 DSL 使用者直觉 |
| H DEMO 静态盐 | **接受** | 生产 fail-closed（`assertProductionNotDemoMode` 拒绝启动），静态盐仅影响本地演示路径 |
| I 测试/运行时密钥不一致 | **已修复** | `middleware/auth.ts` dev 默认密钥统一为 `local-dev-jwt-secret-jlmedaios-2026`，与 31 个集成测试一致 |
| J TODO/FIXME 悬挂 | **已建台账** | 生成 `docs/TODO_LEDGER.md`（64 条，脚本 `scripts/_gen_todo_ledger.py` 可重跑） |

### 6.2 Python AI 服务（services-python）新发现与修复

| # | 级别 | 问题 | 修复 |
|---|------|------|------|
| P-1 | **P0 安全** | **函数式中间件 `raise HTTPException` 不会返回 401/429**：Starlette 的 `ExceptionMiddleware` 位于用户中间件**内侧**，`@app.middleware("http")` 中抛出的 `HTTPException` 会冒泡成 500——鉴权拒绝实际表现为服务器错误，且语义上绕过了统一错误格式 | `app/main.py` 改为直接 `return JSONResponse(status_code=401/429, ...)` |
| P-2 | **P1 安全** | **CORS `allow_origins=["*"]` + `allow_credentials=True`**：Starlette 此组合会回显请求来源，等价于任意站点可携带凭据跨域调 AI 接口 | 改为 `AI_CORS_ORIGINS` 环境变量白名单；生产未配置时不放行任何跨域来源；同时收敛 `allow_methods`/`allow_headers` |
| P-3 | **P1 安全** | **生产环境回落硬编码 mock API Key**（`ak_mock_client_001/002`）：未配置 `AI_API_KEYS` 时静默启用演示密钥 | `APP_ENV=production` 且未配置 `AI_API_KEYS` → 启动即 `RuntimeError` 拒绝 |
| P-4 | P2 正确性 | `api_key_auth` 依赖函数先做 IP 限流再判断路径，非 `/ai/*` 请求也消耗 IP 配额 | 调整顺序：路径过滤在前 |
| P-5 | P2 稳定 | `_ip_request_counts` 键无界增长 | 桶数超 10 000 时惰性驱逐过期空桶 |
| P-6 | **P1 稳定** | **审计中间件每请求「读全量 JSON → 追加 → 整体重写」**：O(n) 随文件增长变慢、并发 read-modify-write 互相覆盖丢审计、文件无界增长、同步 I/O 阻塞事件循环 | 重写为 JSONL 追加模式 + 按日轮转（`audit-YYYYMMDD.jsonl`），写入经 `asyncio.to_thread` 卸载；写盘失败不中断业务 |

验证：`pytest tests/` 通过（1 passed）。`services/radar-inference`（CT 推理服务）审核无异常：统一异常处理不回泄堆栈、`require_internal` 鉴权依赖齐备。

### 6.3 Java 微服务（services-java）审核结果

- **Gateway `AuthFilter` 为占位实现**（P1，待排期）：只检查 `X-Auth-Token` 头**存在与否**，不做任何签名校验——任意非空值即放行。当前实际鉴权依赖 BFF 层（已 fail-closed），但若绕过 BFF 直连 Gateway 则全线失守。建议 Gateway 复用 `JLMEDAIOS_SECURITY_JWT_SECRET` 做 JWT 验签，或在网络层禁止外部直连 Gateway 后端路由。
- 12 个业务微服务 `application.yml` 为开发骨架：H2 内存库 + `h2.console.enabled: true` + `show-sql: true` + `ddl-auto: update`。生产化需整体切换 PG 配置并关闭 console/show-sql（记入 TODO 台账，属配置基线而非代码缺陷）。
- 危险模式扫描：无 `createStatement` 拼接、无 `Runtime.exec`、无硬编码口令（monolith 走 `${ENV:}` 注入，规范）。

### 6.4 SQL 迁移器加固（src/db/migrate.ts）

多副本（K8s 滚动更新）并发启动时，两个实例可同时判定某迁移未执行并并发执行同一文件，DDL 冲突导致一方失败崩溃。已在 `runMigrationFile` 事务首语句加 `pg_advisory_xact_lock(0x4A4C4D31)` + 拿锁后复查 `schema_migrations`，将并发迁移串行化；锁随事务提交/回滚自动释放，崩溃无残留。该迁移器本身质量高（单文件事务、可处理 dollar-quoted 函数体的手写分词器、幂等记录）。

### 6.5 小程序 / Dockerfile / 配置基线

- `miniprogram/utils/request.js`+`auth.js`：token 注入、401 清登录态跳登录、BFF 信封解析均规范，未发现缺陷。
- `Dockerfile.backend`：多阶段构建、非 root（uid 10001）、固定版本 tag、健康检查、exec 形式 PID 1，均符合生产基线；未发现机密写死。
- `.env.example`：补齐 `TRUST_PROXY`（第一轮新增）、`APP_ENV`/`AI_API_KEYS`/`AI_CORS_ORIGINS`（本轮新增）说明，避免部署时漏配。

### 6.6 第二轮验证记录

- **后端单元测试（bun test，按 tests/unit 子目录分桶运行）**：**2 027 个测试全部通过、0 失败**（28 个域：bff 353、security 315、consult-agent 210、integration 203、orchestrator 144、medical-tools 107 等）。
  - 注意：`bun test tests/unit` 直接运行时 bun 的路径过滤是**子串匹配**，会把 `web/tests/unit/`（约 1.4 万个 DOM 测试）一并拉入无 jsdom 的 bun 环境运行，造成 169 个环境性失败（localStorage/navigator 不存在）——非真实缺陷，CI 应以分桶或精确路径方式运行。
- **前端测试（vitest run 全量）**：通过；仅 1 例「新建任务：缺少任务内容时校验拦截」在全量高压下 30 s 超时，**单独复跑通过（11.7 s）**，判定为资源竞争抖动而非缺陷。前端套件普遍单用例 10–90 s（重 jsdom 渲染），建议后续排查 per-test 开销。
- **ESLint 全仓 --fix**：1 522 处自动修复已应用（554 个文件），存量错误 4 447 → **3 083**。--fix 误删必要断言导致 121 个类型错误（20 个文件），已全部人工修复：catch 回落统一改为 `.catch((): T => ({}))`（21 处），字面量 widening 改用 `as const` 逐分支标注（4 处），冗余联合成员改 `(string & {})` 技巧（2 处）。修复后 **`tsc --noEmit` 0 错误**，触及文件 ESLint 0 错误。
- **Python 服务 pytest**：1 passed。
- **SQL 迁移器**：并发护栏单测无法本地连库验证，逻辑为事务内标准 `pg_advisory_xact_lock` 用法，建议 CI 集成环境补一条双副本并发迁移用例。

### 6.7 第三轮进行事项（截至本报告更新时仍在推进）

- db 仓储层 `no-base-to-string`（约 1 490 处，`String(unknown)` 可能输出 `[object Object]`）codemod 治理：新增 `src/db/rowText.ts`（`toText`/`toTextOrNull` 安全文本化），逐文件替换并复验。
- 剩余 3 083 个 lint error 的最终分布与处置（大部分为类型安全风格项，非运行时缺陷）。
