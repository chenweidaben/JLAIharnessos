# 巡检简报 2026-11-25 04:25 轮（定时唤醒 · 缺失工具文档补写 · 质控详情组装评估 · 注释编码还原 · 低峰回归）

## 概要
在上轮四专项收口基础上，本轮继续推进不依赖架构拍板的独立收尾项：①按后端 zod 补写 3 份此前缺档的注册工具文档；②评估 medical-qc 后端详情组装取数链路，结论为存在契约扩字段、权限口径、规则快照来源三项未决依赖，本轮不落地、列待办；③还原 `server.ts` 中 5 处可凭代码佐证可靠还原的注释编码损坏，其余 9 处整词/多行粘连不可考，保留并标注；④低优先静态治理评估后，未使用导出因规模与动态注册风险本轮不批量清理，列入待办。四套漂移 DDL（256/349/350/369）与 339 选型维持待拍板，拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0 / 前端 web 目录 npm + vitest 2.1.9
- 后端 TS：仓库根 `tsc --noEmit`；前端：`web/ tsc --noEmit`；前端 vitest 传完整文件路径
- DB：本地 postgres `127.0.0.1:5433/jlmedaios`（trust 无密码）；迁移已记账 350 / init 355；`iam.roles` 11、`iam.users` 64
- 起点基线 HEAD：`1e01f7ca9c83132b1f67a683a37ed52b6807d419`（三远端 origin/gitcode/mirror 逐字一致、ahead/behind 0/0）
- 8080 demo 实例 `/health` 返回 ok

## 本轮改动
| 文件 | 类型 | 说明 |
|---|---|---|
| `docs/api/tools/37-render-medical-template-render_medical_template.md` | docs | 新建：渲染病历模板工具文档（EMR，`emr:read`，只读），入参 `templateId` 必填 / `data` 可选键值对，出参 `templateId/renderedContent/filledPlaceholders/missingPlaceholders`，错误码 `TEMPLATE_NOT_FOUND` 等。 |
| `docs/api/tools/38-search-medical-knowledge-search_medical_knowledge.md` | docs | 新建：医学知识检索工具文档（KNOWLEDGE，公开只读），入参 `query` 必填 / `knowledgeLevel` L1–L5 / `department` / `topK` 默认 5 / `documentType` 八类枚举，出参 `query/intent/total/results[]/context/searchedAt`，错误码 `KNOWLEDGE_RETRIEVAL_ERROR` 等。 |
| `docs/api/tools/39-get-drug-information-get_drug_information.md` | docs | 新建：药品说明书信息查询工具文档（CDS，公开只读），入参 `drugName` 必填 / `infoType` 六类枚举默认全部，出参 `drugName/tradeName?/sections/found/note?/queriedAt`；与处方药品类 `get_drug_info`（`drug:read`）明确区分。 |
| `src/bff/server.ts` | fix(bff) | 5 处注释内 `U+FFFD+?` 损坏按代码上下文还原：`seq 为 outbox`、`升级请求的 Token（…或 Sec-WebSocket-Protocol）`、`ws 已关闭`、`直连客户端 IP`、`beginProcessing 后 handler`。仅注释文字，不改行为；5 行改 5 行，无 EOL 漂移。 |

## 专项① 缺失工具文档补写（3 份，已对齐注册与 zod）
- 注册表 `FIRST_BATCH_TOOLS` 共 39 工具；上轮核对缺档 3 份，本轮全部补齐：`render_medical_template`（registry 第 77 项）、`search_medical_knowledge`（第 92 项）、`get_drug_information`（第 93 项）。
- 每份均先读后端 `.ts` 的 `buildMedicalTool` 定义与 zod `inputSchema/outputSchema`，字段名/类型/必填/枚举/默认值/错误码以后端为准；权限码、登录、确认、只读标记与后端一致。
- 角色列：三工具后端均未声明 `requiredRoles`，文档标注"后端未声明硬编码角色（按权限码推导）"，不臆造角色。
- 新文档无 `U+FFFD` 编码损坏；与既有 01–36 份文档的章节结构、页脚口径一致。

## 专项② medical-qc 后端详情组装评估（结论：本轮不落地，列待办）
- **现状**：`GET /api/v1/medical-qc/records/:id` 聚合器 `getQcRecord` 仅返回 `{ nextLevel, status? }`；前端目标态类型期望 `record/visit/patient/reviews/latestRule`。
- **取数能力盘点**：
  - 病历：`recordRepo.getMedicalRecordById` 可取（id/visitId/recordType/title/content/plainText/authorId/status/qualityScore/qualityIssues/…）✓
  - 评审链：`reviewRepo.listReviewsByRecord` 可取（reviewLevel/decision/reviewerId/comment/issues/…，时间正序）✓
  - 就诊/患者：病历仅带 `visitId`，患者脱敏字段（mrn/姓名/科室/就诊号）需按 `visitId` join `visits/patients`；队列 SQL 已有该 join 范式可复用，但详情路径当前未查。
  - 最近规则结果（latestRule）：规则检查为只读纯函数、不落库；无独立"最近一次规则检查快照"表/字段稳定来源。
- **未决依赖（需裁决，本轮不扩契约）**：
  1. **响应体扩字段属上线契约变更**：由 `{nextLevel, status}` 扩为嵌套 `record/visit/patient/reviews` 是向后兼容加字段，但形状需与前端目标类型对齐并补集成测试断言，属 M2-B 接口收尾设计决策。
  2. **详情查看数据权限口径未定**：当前 `getQcRecord` 未做权限校验（`_view` 未使用）；补患者脱敏信息前须先定详情接口权限码与 dataScope 科室过滤。
  3. **latestRule 无落库快照来源**：强行从 `review.issues`/`qualityIssues` 拼会与规则引擎真实口径不一致。
  4. issue 字段规范化别名（后端 `code/level` ↔ 前端 `ruleId/severity/source`）未决。
- 本轮未改后端聚合器、未扩接口形状、未新增 repo 查询。

## 专项③ 注释编码损坏还原（5 修 / 9 留）
- 损坏模式：原字符位置被 `U+FFFD(EF BF BD)` + ASCII `?`(3F) 顶替。
- **已可靠还原（5 处，均有代码佐证）**：6756 `seq 为 outbox`；6789 升级请求的 Token（`?token=` 或 `Sec-WebSocket-Protocol`）；6833 `ws 已关闭`；6969 `直连客户端 IP`；7032 `beginProcessing 后 handler`。
- **保留未改（9 处，整词损坏或多行粘连，原意不可考，不猜改）**：
  - 文件头 2 / 4 / 5 行（产品名词、REST 前缀、WS 鉴权等整词粘连）；
  - 6751 WS 升级注释多行粘连；6798 `弢�发��演` 整词；6809 帧定义三处推断词非唯一；6819 agent:start 多行粘连且 `扢�有` 整词不可考；6974 `吊锢`/介词；7244 `逢��` 退出措辞。
- 复核：`git diff --numstat` 与 `--ignore-cr-at-eol` 口径一致（5/5），无整文件 EOL 翻转；新文档与改动文档 `U+FFFD` 扫描 0 匹配。

## 专项④ 低优先静态治理（本轮无可安全批量清理项）
- 后端 `tsconfig` 未开 `noUnusedLocals/noUnusedParameters`；`src` 顶层导出符号约 1.86 万（含 interface/type 重复声明），且存在工具注册表动态注册、repo 索引、框架反射等非静态引用路径，纯 grep 引用计数易误删公共 API。
- 本轮未批量删除未使用导出；`any` 34 处、`console.log` 21 处、未使用导出跨文件扫描、注释乱码剩余 9 处均列入待办，需专门一轮配合 TS 语言服务/引用图工具与编译器未使用项开关处理。

## 回归复核（真实退出码留痕）
| 测试 | 模式 | 结果 | 退出码 |
|---|---|---|---:|
| `tests/integration/medical-record-qc.test.ts` | `TEST_REAL=1`（真实 DB） | **12 pass / 0 fail**（52 expect） | **0** |
| 同上 | 默认 `TEST_REAL!=='1'`（preload 强制 DEMO_MODE=1） | 12 fail：`invalid input syntax for type uuid: "demo-admin"` | 1 |
| `web/tests/unit/store/medicalQcStore.test.ts` | 前端 vitest | **9 pass / 0 fail** | **0** |
| `web/tests/pages/medical-qc-page.test.tsx` | 前端 vitest | **5 pass / 0 fail** | **0** |

- 集成测试默认模式失败研判：preload 在 `TEST_REAL!=='1'` 时强制 `DEMO_MODE=1`，`getUserByUsername` 回退 `DEMO_USER`（id=`demo-admin` 非 UUID），写入 `uuid` 外键列报错；DB 中 `admin/doctor_chen/pharmacist_wang` 均为合法 uuid。属既有测试环境模式与真实 DB 不一致问题，**非本轮注释改动、非真实后端缺陷**；`TEST_REAL=1` 全绿佐证。该 env 模式隔离问题继续列待办（用例内快照/串行或升级 Bun ≥1.2.10）。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 |
|---|---|
| 后端 `tsc --noEmit`（仓库根） | **退出码 0** |
| 前端 `web/ tsc --noEmit` | **退出码 0** |
| BE 质控集成测试（真实模式） | 12/0，**退出码 0** |
| FE medicalQc 两文件 vitest | 14/0，**退出码 0** |
| 文档/源码 `U+FFFD` 扫描 | 新文档 0；server.ts 剩余 9 处不可考保留 |

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **medical-qc 后端详情视图组装**：响应体扩字段、详情数据权限口径、latestRule 快照来源、issue 字段规范化四项待裁决后落地；前端保留目标态类型 + 空状态兜底。
- **role_permissions 全量镜像待拍板**：补 36 缺字典码、清 DB 冗余旧码、定运行时事实来源三条件未具备；未写 DB 授权行、未补字典、未清冗余。
- **四套漂移 DDL + 339 选型待拍板**：256 / 349 / 350 / 369 与 339-twin-deep；拍板前不 ALTER/DROP 既有表、不改上线契约、不回填。HTTP 429 实测受迁移链阻断，门控以现有单测为准，未伪造触顶结果。
- **文档待裁决**：出参嵌套子字段披露粒度、06/24/29 职责漂移、30 动态只读、角色列契约、空权限语义、预留错误码；入参对象数组元素逐字段表未拆。
- **代码质量待办**：34 处 `any` 收窄、21 处 `console` 残留甄别、未使用导出/死代码跨文件扫描（配合 noUnusedLocals 与引用图）、9 处不可考注释乱码、测试 env 模式隔离根治。
- 本轮临时探针/备份不入库；docs CRLF→LF 历史漂移不纳入提交。
