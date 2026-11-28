# 巡检简报 2026-11-28 17:01 轮（Python 限流改造复核收口：Redis 固定窗口 TTL 续期缺陷修复 · venv 实测 12 passed · 后端 tsc 0）

## 概要
本轮定时唤醒先复核工作区一组未收口的 Python 限流改造（`services-python`，分支 `consult-agent-m86`）：新增限流存储抽象层 `rate_limit_store.py` 与其单测，`api_key_auth.py` 内联 dict 计数改为复用 store，`main.py` 中间件在鉴权前先做 per-IP 限流。逐行核对后确认内存固定窗口、桶上限惰性驱逐、工厂降级、测试注入还原、429 返回形状、旧内联计数清零、无循环依赖、IP 配额无双扣等口径正确；同时定位 **1 个真实缺陷**：Redis 实现用 pipeline 每次访问都 `EXPIRE` 刷新 TTL，活跃键不回收、计数窗口被无限顺延，偏离 BFF 固定窗口语义。

已对齐 BFF `incrAndExpire` 原语改为 Lua `eval` 原子方案：脚本内 `exists` 判断，仅键首次创建时 `PEXPIRE`，后续访问不续期。修复后在新建 venv 内真实跑通：`py_compile` 四文件 exit 0；services-python 全量 **12 passed / 0 fail**（限流 7 + 中间件 4 + 健康检查 1），exit 0；后端根 `tsc --noEmit` **exit 0**。本轮改动 **4 个 Python 文件**（2 新增、2 修改）。

## 工具链与现场基线
- 起点 HEAD：`fb7ac15f407b8ab7971b59fa4e6e79e12d0c4cb9`；origin(GitCode HTTPS) / gitcode(GitCode SSH) / mirror(GitHub SSH) 三远端 `consult-agent-m86` SHA 逐字一致，ahead/behind 0/0，认证正常无 401/403。
- Python：系统 3.13.18（sandbox runtime，无第三方依赖）；本轮在 `services-python/.venv` 建虚拟环境，装上最小可跑集 pytest 9.2.0 / fastapi 0.165.0 / redis 8.2.0 / httpx / pydantic。`.venv/`、`__pycache__/`、`*.pyc` 已被 `.gitignore` 忽略，不入库。
- 前端/后端 TS：本轮未改 `src/`、`web/` 任何源码；后端 tsc 复跑 exit 0。bun 不在当前 PATH，web typecheck 本轮未复跑，沿用上一轮 0 error 基线。
- 工作区：2 个 CRLF 噪音 aggregator（lessonRecord / teachingOnline）忽略行尾后内容差异 0 行，不暂存；探针 / 台账 / 历史切片 / schema 备份 / `_rep20_*` 留痕均不入库。

## 复核结论
### 已确认正确的口径
| 项 | 结论 | 证据 |
|---|---|---|
| 内存固定窗口计数 | 正确 | `MemoryRateLimitStore.consume`：桶过期（`now >= reset_at`）重建新窗口；计数 `<= limit` 放行；`__slots__` 桶 |
| 桶上限惰性驱逐 | 正确 | 桶数达 `_MEMORY_MAX_BUCKETS=10000` 时先驱逐全部已过期空桶再建新桶，防无界增长 |
| Redis 跨实例共享 | 正确 | `RedisRateLimitStore` 经同步客户端；`redis-py` 延迟导入，纯内存模式无需依赖 |
| 工厂降级路径 | 正确 | `create_rate_limit_store`：`REDIS_URL` 空 / `memory` / `ping` 失败 / 连接异常 → 降级 `MemoryRateLimitStore` 并 `warning` 告警，服务可启动 |
| 测试注入还原 | 正确 | `_set_store` 注入内存/mock 实现；`isolated_store` fixture teardown 还原为 `None`，`_get_store` 下次惰性重建 |
| 429 返回形状 | 一致 | 中间件直接返回 `JSONResponse(status_code=429, content={"detail": ...})`，与既有 401 形状一致；函数式中间件内不 `raise HTTPException`（避免冒泡成 500） |
| 旧内联计数残留 | 为零 | `_request_counts` / `_ip_request_counts` Grep 0 命中；旧 `time` / `json` / `BaseHTTPMiddleware` import 已清 |
| 循环依赖 | 无 | 依赖链 `main → api_key_auth → rate_limit_store`，store 不反向导入 auth |
| IP 配额无双扣 | 正确 | 全仓无 `Depends(api_key_auth)` 挂载；IP 限流仅在 `main.py` 中间件 L63 扣一次；路由鉴权走函数式中间件 |
| 键命名 | 一致 | `jianlan:ratelimit:<scope>:<identity>`，与 BFF 统一，便于按域清理 |

### 定位并修复的缺陷（1 项）
| # | 文件 | 缺陷 | 根因 | 修复 |
|---|---|---|---|---|
| 1 | `app/core/rate_limit_store.py`（Redis 实现） | pipeline 每次 `incr` 后都 `expire(key, window_sec)`，活跃键 TTL 被每次访问刷新、键不回收、计数窗口被无限顺延，偏离固定窗口语义 | 旧实现把"设过期"挂在每次写操作上，而非仅首次建键 | 对齐 BFF `src/cache/RedisCache.ts` 的 `INCR_EXPIRE_SCRIPT`，改 Lua `eval` 原子脚本：`exists` 判断，仅 `exists==0` 首次建键才 `PEXPIRE`（毫秒 `window_sec*1000`），后续访问不续期；删除 `RedisPipelineLike` 协议与 pipeline 用法，`RedisClientLike` 协议改为 `eval / ping / close` |

### 测试 mock 同步改造
- 旧 `_FakePipeline`（incr/expire/execute）与 `_FakeRedis`（pipeline/ping/close）替换为 `_FakeRedis.eval(script, numkeys, key, ttl_ms, by)`，内部按字典 `exists` 模拟"仅首次记 expire"。
- 用例断言对齐新语义：同键三次访问 count 1/2 放行、count 3 超限；另一身份新键独立计数；**每个键仅首次创建时设一次过期，同键二次访问不续期**；首次 `PEXPIRE` 窗口为 60s = 60000ms。

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 结果 | 退出码 |
|---|---|---:|
| `py_compile` 四文件（store / auth / main / test） | 0 语法错误 | **0** |
| services-python 全量 `pytest tests/`（3 文件） | **12 passed / 0 fail**（限流 7 + 中间件 4 + 健康检查 1），3 条 starlette/on_event 弃用 warning（非失败） | **0** |
| 修复前基线（限流 + 中间件 2 文件） | 11 passed / 0 fail，exit 0（留痕 `_rep20_pytest_before.txt`） | **0** |
| 后端根 `tsc --noEmit` | 0 error | **0** |
| 前端 web typecheck | 本轮未改 web；bun 不在 PATH 未复跑，沿用上一轮 0 error 基线 | — |

- 测试运行环境：`services-python/.venv`，cwd=`services-python`，命令 `python -m pytest tests/ -q`。
- 说明：sqlalchemy / asyncpg / uvicorn 等重型包本轮未装（仅装最小可跑集）；`app.main` 全量导入经既有 4 个中间件用例 + 1 个健康检查用例验证可起 TestClient。

## 红线复核
- 改动文件 Grep：无硬编码 Redis 连接串 / 口令 / 密钥；无 `os.environ` 写入或 `process.env=` 写入残留；Redis 连接串仅经环境变量 `REDIS_URL` 读取，不入库、不回显。
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值（per-key 配额沿用 `rateLimitPerMin`，per-IP 60/min）；未暴露生产可达清场 / 重置端点。
- 生产未配 `AI_API_KEYS` 仍直接 `RuntimeError` 拒启动，mock key 不回落。

## 本轮未纳入、保留待后续批次（接台账）
- **死代码 vars 6 个**逐项保守保留证据已在上一轮简报列示（target / assistantMsg / enrollment / signerKeyId / db / oldKey）；C 类 106 个契约形参禁删，仅内部可同步改签名者加 `_` 前缀。
- **全量基线对齐**：择机串行复跑全量 unit 取原生汇总行；wormArchive（fs 超时）/ LLMClient（jsdom 串扰）/ monitoring（栈溢出）三文件串行稳定性待复核，仍复现须定位根因，不得判偶发。
- **只读方案维持、不擅自升级**：bun ≥1.2.10 前缀锚定需全量回归 + 复核 M48-A Windows afterEach pump 根因；web→TS6 先评估 antd5 / React19 / vitest / typescript-eslint 兼容矩阵，独立分支取证。
- **维持台账、不得擅动**：四套漂移 DDL（256/349/350/369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写；350 规则引擎旧表；限流选项 B 评审；审计链 seq 1647 断点复测（待测试库授权与备份）。

## 遗留阻塞与待办
- 审计链 seq 1647 断点复测仍待测试库授权与备份，未具备前不动。
- 未入库产物：`.venv/`、`__pycache__/`、`_rep20_*` 留痕、历史 patrol 切片、schema 备份、探针 / 种子 SQL/TS、`docs/TODO_LEDGER.md`、`scripts/_*.py`；2 个 CRLF 噪音 aggregator 未暂存。
