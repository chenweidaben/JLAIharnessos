# CLAUDE.md — jlmedaios AI 协作规范（工程宪法执行细则）

> 本文件是 AI 协作者（Claude Code / 豆包等）在本仓库工作的**行为约束**。
> **上位法**是根目录 [`ARCHITECTURE_CHARTER.md`](ARCHITECTURE_CHARTER.md)（架构宪章 v2.0），本文件是它的**执行细则**。
> 两者冲突时，以架构宪章为准；本文件未覆盖的，先问人再动手。

---

## 0. 这是什么项目

- **jlmedaios**（健澜 AI 原生医院操作系统 / Jianlan AI-Native Hospital OS）。
- **不是 HIS**，是医院的"操作系统 / AI 大脑"：每一次挂号、处方、检查、收费都是 AI 的学习样本。
- 双仓库同源：GitHub `JLAIharnessos` ≈ GitCode `JLMEDAIOS`（同一套代码，`package.json`/`README` 一致）。
- 许可证 Apache-2.0；版权 © 杭州健澜科技有限公司（所有新文件须带此版权行）。

## 1. 三层架构（动手前先记牢）

| 层 | 端口 | 技术 | 目录 |
|----|------|------|------|
| 体验层 BFF | 8080 | Bun + TypeScript（Ink TUI + React 19 + Vite） | `src/`、`web/`、`miniprogram/` |
| AI 智能层 | 8000 | Python FastAPI + vLLM（本地推理，数据不出院） | `services-python/`、`services/radar-inference/` |
| 交易引擎 | 9090 | Java Spring Boot 3.5 + Spring Modulith + Spring Cloud | `services-java/` |
| 数据层 | 5432/5433 | PostgreSQL 16 + pgvector、Redis 7、MinIO | `pgsql/` |

> ⚠️ 端口与连接串以 `docker-compose.yml` / `.env.example` 为准（文档间 5432/5433 有历史不一致，动手前先查实际配置，勿臆断）。

## 2. 铁律（红线，违反即不合格）

1. **数据不出院**：患者原始数据禁止出境/出域；生产医疗推理走本地 vLLM；**禁止 OpenAI/Claude/Gemini/Cohere 任何境外大模型**（国产豆包/DeepSeek 允许）。
2. **国密全链路**：数据加密 SM4、哈希 SM3、签名 SM2（生产接 HSM 加密机），不得用境外算法替代。
3. **病历 append-only**：病历一旦生成不可修改，只能追加 review；SHA-256 哈希链 + CA 签章 + TSA 时间戳。
4. **三级风险确认**（ADR-006）：`low` 只读直接执行 / `medium` 写操作单次确认 / `high` 高危写双重确认 + 处方权校验 + CA 签名；`ToolRiskManager` fail-closed。
5. **四级数据分级**（ADR-007）：公开/内部/敏感(含PHI)/极敏感；敏感字段展示层脱敏、存储加密。
6. **AI 定位"辅助"**：所有智能体 `humanInLoop=true`，AI 输出可 adopted/modified/rejected，**不得替代医生最终决策**。
7. **脱敏与凭证**：姓名/身份证/手机号/地址自动掩码；禁止在代码、日志、测试、提交信息中硬编码真实敏感数据或密钥（`.env*` 已 gitignore）。
8. **降级容错**：LLM/PG 不可用时系统不崩，8s 超时降级 mock；写操作幂等（`Idempotency-Key`）。

## 3. 目录结构（真实，勿臆造）

```
src/             TS 引擎（bff / core / medical-tools / knowledge / security /
                 integration / ui / orchestrator / resilience / saga / tenant /
                 data-platform / internet-hospital / emergency / voice …）
services-java/   Java 交易引擎（gateway / registry / his-{reg,charge,orders,pharmacy,
                 empi,ward,lis,nursing,discharge,exam,report,message} / monolith）
services-python/ AI 引擎（FastAPI + vLLM，app/ tests/）
services/        radar-inference（RADAR 影像推理，GPU 隔离）
web/             React 19 前端（Vite）
miniprogram/     微信小程序
agents/          10 个刚需智能体 + manifest.json（声明式 AgentPackage）
skills/library   技能包
docs/            adr/（架构决策）· engineering/（工程规范）· technical/（技术设计）
```

**跨模块调用只走契约（API/事件/MCP），不直接 import 别的模块内部实现。**

## 4. 编码规范（详见 `docs/engineering/代码规范.md`）

- **Prettier**：printWidth 100、tabWidth 2、单引号、分号、trailingComma all、LF。
- **ESLint**（flat config）：`eqeqeq` error、`no-eval` error、`no-debugger` error、`no-explicit-any` warn、导入自动排序。
- **日志**：业务代码禁止 `console.log`，必须用 `src/core/logging` 的 `Logger`；敏感字段输出自动脱敏。
- **类型**：`tsc --noEmit` 零报错；无 `any`、无 `@ts-ignore`；JSDoc 完整。
- **分层**：route → aggregator → repo → db（Java 侧对应 controller → service → repository）。
- **版权**：新文件头部 © 杭州健澜科技有限公司。

## 5. Git 工作流（详见 `docs/engineering/Git工作流规范.md`）

- 分支：`main`（生产，保护）/ `develop`（集成）/ `feature/*` / `fix/*`·`hotfix/*` / `release/v*`，全小写 `-` 连接。
- 提交：Conventional Commits（`feat/fix/docs/style/refactor/perf/test/chore/security`）。
- PR：`powershell -File scripts/ci.ps1` 全绿 → 1 人 Review（核心引擎/安全/审计需 2 人）→ Squash Merge。

## 6. 常用命令

```bash
bun run typecheck && bun run lint && bun run format:check && bun run test   # 全量
bun run lint:fix           # 自动修复
bun run test:unit          # 单测
powershell -File scripts/ci.ps1   # 本地 CI（提交前必跑）
# Java：services-java 下 mvn；Python：services-python 下 pip install -r requirements.txt && pytest
```

## 7. 架构决策（ADR）

- 任何架构级变更（换库、拆服务、改协议、改安全策略）必须先在 `docs/adr/` 写 ADR，格式见 `docs/adr/000-ADR模板.md`，编号顺延（当前至 015）。
- **先写 ADR 等人拍板，再动代码**，禁止"先改后补"。

## 8. AI 协作约定

1. **先读再写**：动某模块前，先读该模块 README、`docs/` 相关文档、相关 ADR 和 `ARCHITECTURE_CHARTER.md`，不要凭猜。
2. **小步快跑**：一次一个功能/模块，做完停下让人 review，不要一口气写整个系统。
3. **不越界**：只改任务相关文件；跨模块改动先说明并征得确认。
4. **不编造**：不确定的 API/版本/标准，查文档或明说"待确认"，禁止编一个看起来对的。
5. **守红线**：任何输出先过 §2 铁律自查（脱敏、国密、append-only、三级确认、AI 辅助定位）。

## 9. 禁止事项（合入前自查）

- [ ] 是否出现真实患者数据或密钥（代码/日志/测试/提交）？
- [ ] 是否调用了境外大模型，或绕过本地 vLLM / 国密？
- [ ] 是否破坏了病历 append-only / 哈希链 / CA 签章？
- [ ] 是否让 AI 输出最终医疗结论而非辅助建议（humanInLoop）？
- [ ] 是否改了高危操作却没走三级风险确认？
- [ ] 是否引入新依赖/新架构却没有 ADR？
- [ ] 是否跨模块直接 import 了别的模块内部实现？

> **命中任何一项，先停下修正，再继续。**
