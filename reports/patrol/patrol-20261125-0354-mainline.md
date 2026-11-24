# 巡检简报 2026-11-25 03:54 轮（定时唤醒 · medical-qc 前端收尾 · 代码质量扫描 · 工具文档一致性核对与安全子集补正 · 低峰串行回归）

## 概要
定时巡检唤醒后继续收口 `consult-agent-m86` 分支，本轮只推进不依赖架构拍板的独立打磨项：①medical-qc 前端视图层收尾（详情抽屉空状态兜底 + 类型契约现状注释，后端详情聚合列为待办）；②代码质量扫描，仅修 1 处运行时模板插值损坏，其余 any/死代码/注释乱码列待办；③工具文档 ↔ 后端 zod 全量核对（39 注册工具 / 36 份文档，185 条差异），并在严格边界内补正 32 份文档的入参侧与顶层出参字段，职责漂移、出参嵌套粒度等 7 组主题留待裁决；④低峰串行复核此前归类并行污染/误纳的后端三候选与前端 medicalQc 两测试，全绿取真实退出码。四套漂移 DDL（256/349/350/369）与 339 选型维持待拍板，拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0 / 前端 web 目录 npm + vitest 2.1.9
- 后端 TS：仓库根 `tsc --noEmit`；前端：`web/ tsc --noEmit`；前端 vitest 传完整文件路径
- DB：本地 postgres 常驻 `127.0.0.1:5433/jlmedaios`（trust 无密码）；迁移已记账 350 / init 355，未记账 5 个（256 / 339 / 349 / 350 / 369）
- 起点基线 HEAD：`672ad7730254c779ee5db50abf393a7b4c4f3da8`（三远端 origin/gitcode/mirror 逐字一致、ahead/behind 0/0）
- 本轮源码提交：`ce9169ed`（bff 日志插值修复）、`8f9aba39`（前端 medicalQc 收尾）；文档批次见末节「提交与双平台同步」

## 本轮改动
| 文件 | 类型 | 说明 |
|---|---|---|
| `src/bff/server.ts` | fix(bff) | 7084 行租户/院区注册表加载日志模板中 `${tenantCount}` 被 U+FFFD+`?` 顶替、插值失效；按 UTF-8 无 BOM 还原为合法插值。1 行改 1 行，无 EOL 漂移，不改业务行为。 |
| `web/src/components/medicalQc/QcDetail.tsx` | fix(web) | 详情抽屉在 `record` 缺失时渲染 `Empty` 兜底（testid `qc-detail-empty`），不再整块空白；提示详情待后端视图补齐，可先跑规则/AI 检查。 |
| `web/src/types/medicalQc.ts` | fix(web) | 文件头补契约现状注释：`/records/:id` 当前仅回 `nextLevel/status`，record/visit/patient/reviews 待后端聚合器组装；issue 当前字段 `code/message/level`。未收窄目标态类型。 |
| `docs/api/tools/*.md`（32 份） | docs(api/tools) | 以后端 zod 为准补正入参字段名/必填/枚举/多余入参/示例与顶层出参容器名；出参嵌套子字段、职责漂移等裁决项未动。明细见专项③。 |

## 专项① medical-qc 前端视图层收尾（后端契约未扩）
- 后端真实出参核对：`GET /queue` → `{items, total}`，10 字段与前端 `QcQueueItem` 一致；`GET /records/:id`（聚合器 `getQcRecord`）**仅返回精简 `{nextLevel, status?}`**；`POST /check` → `{canPass, score, rule{blockCount,majorCount?,minorCount?}, issues[], ai{issues,model,error}}`；`POST /review` → `{newStatus}`；`POST /resubmit` → `{status}`。
- 前端 `QcRecordDetail`（record/visit/patient/reviews/latestRule）等类型属超前目标态，与当前精简出参脱节；repo 层已具备 `getMedicalRecordById`/`listReviewsByRecord` 取数能力，详情组装是后端聚合器未完成项（gap-matrix M2-B 待落地）。集成测试对 `getQcRecord` 仅断言 `nextLevel`，佐证当前契约即精简版。
- 决策边界：本轮不改上线契约、不扩后端。落地两处前端收尾（空状态兜底 + 契约现状注释）；未重构 issue 字段映射、未收窄详情类型。
- 未闭合偏差（列待办，未改）：详情 record/visit/patient/reviews 待后端组装；issue 前端读 `severity/source/ruleId` 而后端给 `level/code` 且无 `source`；`rule.issues` 后端 rule 对象下无 `issues`；AI 建议在 `ai.issues` 未在清单展示。

## 专项② 代码质量扫描（仅修 1 处运行时损坏，其余列待办）
- TODO/FIXME/未实现 258 处：绝大多数为 `src/integration/adapters/his/Vendor*Adapter.ts` 有意保留的厂商对接骨架（统一抛未实现错误），M501 为模块编号非错误码；非可清理死代码。
- `:any` / `as any` 共 34 处跨 15 文件，集中在 repo 行映射与聚合器；类型收紧需行为决策，列待办。
- `console.log` 21 处：多为启动/迁移/审计/访问日志有意保留，注释内为示例代码，非残留调试。
- 编码损坏扫描（U+FFFD）：src 与 web/src 共 14 处，全在 `src/bff/server.ts`；其中 7084 行模板插值损坏已修复（见改动表）。其余 13 处均在注释（含文件头与 6751/6756/6789/6798/6809/6819/6833/6969/6974/7032/7244 行），部分严重损坏不可准确还原，按克制原则不猜改，列待办。
- 未发现过时角色数量/版本口径注释（src 与 web/src 检索“9 个角色”等 0 匹配）。后端 tsconfig 未开 `noUnusedLocals/Parameters`；未使用导出的跨文件引用扫描成本高、风险大，列待办。

## 专项③ 工具文档 ↔ 后端一致性核对与安全子集补正
### 核对基线
- 注册表 `FIRST_BATCH_TOOLS` 共 **39** 工具；已配文档 **36** 份；注册已注册、文档缺失 **3**（`render_medical_template`、`search_medical_knowledge`、`get_drug_information`，注意后两者与已配文档的 pharmacy `get_drug_info` 是不同工具）；文档孤儿 **0**。
- 元数据核对：风险等级 / 权限码 / 登录认证 / 确认策略两侧**全部一致（0 差异）**；唯一只读漂移为 `follow_up_management`（动态只读，列入裁决档）。
- 差异条目合计 **185**：【文档错】93、【文档漏】67、【文档多】17、【存疑】8。

### 本轮已补正（32 份文档，安全子集）
以后端 zod 二次核实后落地，覆盖：入参字段名错配、必填标记、枚举值、后端明确不存在的多余入参、缺失的标量/枚举入参、顶层出参容器/字段名错配、26 条示例入参重写。抽查复核（11 order_audit / 12 create_prescription / 13 prescription_audit / 15 get_drug_info / 20 view_dicom / 34 sync_to_his / 35 fetch_from_emr / 36 hl7_message_send）与后端 zod 逐字一致。
- 清单与后端不符 1 处：#181（35 fetch_from_emr）清单判 `encounterId` 为非 schema 字段，后端实为 optional，已以后端为准保留。

### 留待裁决（本轮未动）
- **职责整体漂移 3 个**：06 `medical_record_qa`（文档问答 vs 后端质控）、24 `critical_value_alert`（拉清单 vs 传结果识别）、29 `visit_reminder`（下发消息 vs 汇总列表）。
- **出参嵌套子字段披露粒度**：67 条【文档漏】出参行保留概要层级，未展开到 zod 叶子字段，待文档规范定调。
- 描述中后端未建模概念（就诊摘要/医嘱摘要/处方级别/作废措辞等）、30 动态只读表达、角色列硬契约、空权限公开只读语义、预留错误码（RATE_LIMITED 等）。
- 三份缺失文档本轮未新建；入参对象数组元素子字段仅在说明列概要，未逐字段入表。

## 专项④ 低峰串行回归复核（独立进程，全绿）
| 测试文件 | 结果 | 退出码 |
|---|---|---:|
| `tests/unit/medical-tools/getDrugInfo.test.ts` | **4 pass / 0 fail**（15 expect） | **0** |
| `tests/unit/knowledge/searchMedicalKnowledge.test.ts` | **9 pass / 0 fail**（23 expect） | **0** |
| `tests/unit/bff/agents/shared/clinicalReportInterpretation.test.ts` | **5 pass / 0 fail**（19 expect） | **0** |
| `web/tests/unit/store/medicalQcStore.test.ts` | **9 pass / 0 fail** | **0** |
| `web/tests/pages/medical-qc-page.test.tsx` | **5 pass / 0 fail** | **0** |

后端三候选与上轮归类结论一致：此前 `db.unsafe is not a function` 为多文件并发改写 `DEMO_MODE` 跨进程环境污染，非真实后端缺陷。前端两测试覆盖 store 读/写门禁与页面在线/退回/阻断/作者视角/断库五条路径，空状态兜底改动未破坏既有用例（夹具走完整 detail 视图分支）。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 |
|---|---|
| 后端 `tsc --noEmit`（仓库根） | **退出码 0**，无类型错误 |
| 前端 `web/ tsc --noEmit` | **退出码 0**，无类型错误 |
| BE 候选三文件单独 `bun test` | 4/0、9/0、5/0，**退出码 0** |
| FE medicalQc 两文件 `vitest run` | 9/0、5/0，**退出码 0** |
| 文档编码损坏扫描（U+FFFD） | docs/api/tools **0 匹配** |

## 提交与双平台同步（本轮实测）
- 提交（拆分三笔，基于起点 `672ad773`）：
  - `ce9169ed` `fix(bff): 修复租户/院区注册表加载日志模板插值损坏`（1 文件，1+/1-）。
  - `8f9aba39` `fix(web): 质控详情抽屉补空状态兜底并标注契约现状`（2 文件，17+/1-）。
  - `b2ca6986` `docs(api/tools): 32 份工具文档对齐后端 zod 安全子集`（32 文件，233+/150-）。
  - 本简报为同轮 docs(patrol) 一笔。
- 推送：origin / gitcode / mirror 三远端 consult-agent-m86；origin 与 gitcode 指向同一 GitCode 仓。`git ls-remote` 逐字核对三远端 SHA = 本地 HEAD，`rev-list --left-right --count` 三远端 behind/ahead = 0/0（结果见本轮执行结论）。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **medical-qc 后端详情视图组装**（record/visit/patient/reviews/latestRule）与 issue 字段规范化（code/level ↔ ruleId/severity/source 别名）属后端契约/功能收尾，待决策；前端保留目标态类型 + 空状态兜底。
- **role_permissions 全量镜像待拍板**：补 36 缺字典码、清 DB 冗余旧码、定运行时事实来源三条件未具备；本轮未写 DB 授权行、未补字典、未清冗余。
- **四套漂移 DDL + 339 选型待拍板**：256 / 349 / 350 / 369 与 339-twin-deep 须等架构/用户拍板；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。真实受限流 BFF 起服被这 5 个迁移阻断，HTTP 429 实测暂不具备前提，门控正确性以现有单测为准，未伪造触顶结果。
- **文档待裁决**：出参嵌套粒度、3 个职责漂移工具、描述未建模概念、动态只读、角色列契约、空权限语义、预留错误码；3 份缺失文档待补写。
- **代码质量待办**：34 处 any 收紧、13 处 server.ts 注释 U+FFFD 还原（部分不可考）、未使用导出/死代码跨文件扫描、测试隔离 env 并发污染根治（用例内快照/串行或升级 Bun ≥1.2.10）。
- 本轮临时预检脚本 / 取证 `.txt/.ts/.sql/.ps1` 与 schema-backup 备份不入库；docs CRLF→LF 历史漂移不纳入提交。
