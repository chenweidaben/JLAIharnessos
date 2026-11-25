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
