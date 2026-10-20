/**
 * 健澜科技 jlmedaios - 临床试验与 GCP 管理（trial）
 *
 * 项目立项 / 伦理审查 / 受试者入组 / CRF 病例报告表 / 试验不良事件 / 项目结题
 * 独立文件 m464bRoutes.ts（m464Routes.ts 已被科研课题批次占用，不复用）。
 * 避开科研教学、职业暴露、临床路径既有口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/trial/projects - 项目立项（项目号/名称/PI/机构伦理号/阶段/状态）5 条 */
async function handleTrialProjects(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRP-001', projNo: '项目号：CT-2025-018（Ⅲ 期注册临床试验）', name: '名称：某新型降糖药 2 型糖尿病Ⅲ期注册研究', pi: 'PI：内分泌科 刘***（主要研究者）', ecNo: '机构伦理号：IRB-2025-018（本院伦理批件）', phase: '阶段：Ⅲ 期（多中心，本院为分中心）', status: '状态：进行中（入组完成，随访中）' },
    { id: 'TRP-002', projNo: '项目号：CT-2026-004（Ⅱ 期）', name: '名称：某新型抗凝药剂量探索Ⅱ期研究', pi: 'PI：心内科 王***', ecNo: '机构伦理号：IRB-2026-004', phase: '阶段：Ⅱ 期（剂量爬坡）', status: '状态：入组中（计划 40 例，已入 22 例）' },
    { id: 'TRP-003', projNo: '项目号：CT-2024-011（Ⅰ 期）', name: '名称：某创新疫苗安全性Ⅰ期（健康受试者）', pi: 'PI：感染科 周***（Ⅰ 期病房）', ecNo: '机构伦理号：IRB-2024-011', phase: '阶段：Ⅰ 期（SAD/MAD 递增）', status: '状态：已结题（数据已锁库总结）' },
    { id: 'TRP-004', projNo: '项目号：CT-2026-009（研究者发起 IIT）', name: '名称：本院心梗二级预防方案优化 IIT 研究', pi: 'PI：心内科 王***（自主立项）', ecNo: '机构伦理号：IRB-2026-009', phase: '阶段：IIT（单中心观察性）', status: '状态：伦理通过，准备启动' },
    { id: 'TRP-005', projNo: '项目号：CT-2025-026（Ⅳ 期上市后）', name: '名称：某降压药上市后安全性Ⅳ期观察', pi: 'PI：心内科 赵***', ecNo: '机构伦理号：IRB-2025-026', phase: '阶段：Ⅳ 期（上市后监测）', status: '状态：进行中（被动+主动随访）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/trial/ethics - 伦理审查（审查号/项目/审查类型/结论/日期）5 条 */
async function handleTrialEthics(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ETH-001', reviewNo: '审查号：IRB-2025-018-A1', proj: '项目：CT-2025-018 降糖药Ⅲ期', type: '审查类型：初始审查（会议审查）', conclusion: '结论：同意（附条件，需补充知情同意书风险表述）', date: '日期：2025-03-12（年度跟踪审查另发）' },
    { id: 'ETH-002', reviewNo: '审查号：IRB-2026-004-A0', proj: '项目：CT-2026-004 抗凝药Ⅱ期', type: '审查类型：初始审查（快速审查）', conclusion: '结论：同意（低风险，方案资料齐备）', date: '日期：2026-02-20' },
    { id: 'ETH-003', reviewNo: '审查号：IRB-2025-018-A2', proj: '项目：CT-2025-018 年度跟踪审查', type: '审查类型：年度/持续审查', conclusion: '结论：同意继续（本年度无严重方案违背）', date: '日期：2026-03-12' },
    { id: 'ETH-004', reviewNo: '审查号：IRB-2026-009-S0', proj: '项目：CT-2026-009 IIT 自主研究', type: '审查类型：方案修订修正案审查', conclusion: '结论：同意修订（随访节点调整已备案）', date: '日期：2026-09-08' },
    { id: 'ETH-005', reviewNo: '审查号：IRB-2024-011-F0', proj: '项目：CT-2024-011 疫苗Ⅰ期结题', type: '审查类型：结题/总结审查', conclusion: '结论：同意结题（无未预期严重不良事件）', date: '日期：2025-11-30' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/trial/subjects - 受试者入组（受试者号/项目/入组日期/分组/筛选结果）5 条 */
async function handleTrialSubjects(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SUB-001', subjectNo: '受试者号：S-018-007（CT-2025-018）', proj: '项目：降糖药Ⅲ期', enrollDate: '入组日期：2026-03-05', group: '分组：试验组（随机分配，双盲）', screen: '筛选结果：合格（符合入选/排除标准，签知情）' },
    { id: 'SUB-002', subjectNo: '受试者号：S-018-008（CT-2025-018）', proj: '项目：降糖药Ⅲ期', enrollDate: '入组日期：2026-03-12', group: '分组：安慰剂对照组（双盲）', screen: '筛选结果：合格' },
    { id: 'SUB-003', subjectNo: '受试者号：S-004-009（CT-2026-004）', proj: '项目：抗凝药Ⅱ期', enrollDate: '入组日期：2026-08-18', group: '分组：B 剂量队列（剂量爬坡）', screen: '筛选结果：合格（完成基线评估）' },
    { id: 'SUB-004', subjectNo: '受试者号：SC-018-003（筛选未入组）', proj: '项目：CT-2025-018', enrollDate: '入组日期：未入组（筛选失败）', group: '分组：—（未随机）', screen: '筛选结果：不合格（HbA1c 不满足入组阈值，记录筛选失败原因）' },
    { id: 'SUB-005', subjectNo: '受试者号：S-026-002（CT-2025-026）', proj: '项目：降压药Ⅳ期观察', enrollDate: '入组日期：2026-05-20', group: '分组：开放观察（无随机）', screen: '筛选结果：合格（自愿签署观察知情）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/trial/crf - 病例报告表CRF（受试者/访视/表单项/录入值/质疑状态）5 条 */
async function handleTrialCrf(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CRF-001', subject: '受试者：S-018-007', visit: '访视：V2（第 4 周随访）', field: '表单项：HbA1c 测定值（实验室）', value: '录入值：7.1%（基线 8.2%，下降）', query: '质疑状态：无质疑（数据一致，已稽查）' },
    { id: 'CRF-002', subject: '受试者：S-018-008', visit: '访视：V2（第 4 周随访）', field: '表单项：收缩压（诊室测量）', value: '录入值：132 mmHg', query: '质疑状态：待澄清（与日记卡 138 不一致，已发数据质疑）' },
    { id: 'CRF-003', subject: '受试者：S-004-009', visit: '访视：D1（基线/给药前）', field: '表单项：凝血功能 PT/INR（实验室）', value: '录入值：INR 1.05（基线正常）', query: '质疑状态：无质疑' },
    { id: 'CRF-004', subject: '受试者：S-018-007', visit: '访视：V3（第 12 周随访）', field: '表单项：用药依从性（药片计数）', value: '录入值：依从率 96%（可接受范围）', query: '质疑状态：无质疑' },
    { id: 'CRF-005', subject: '受试者：S-026-002', visit: '访视：M3（3 月随访）', field: '表单项：家庭血压记录均值', value: '录入值：138/86 mmHg', query: '质疑状态：已澄清并关闭（补录缺测日记）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/trial/adverse-events - 试验不良事件（受试者/AE名称/分级/与试验药关系/处理/转归）5 条 */
async function handleTrialAe(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TAE-001', subject: '受试者：S-018-007', ae: 'AE 名称：轻度胃肠道不适（恶心）', grade: '分级：1 级（轻度，CTCAE）', relation: '与试验药关系：可能相关（研究者判断）', action: '处理：观察 + 对症，未停药', outcome: '转归：缓解（随访复现消失）' },
    { id: 'TAE-002', subject: '受试者：S-004-009', ae: 'AE 名称：一过性牙龈出血', grade: '分级：2 级（中度）', relation: '与试验药关系：很可能相关（抗凝药理作用）', action: '处理：暂停剂量 + 复查凝血，退回上一剂量队列', outcome: '转归：缓解（凝血恢复正常）' },
    { id: 'TAE-003', subject: '受试者：S-018-008', ae: 'AE 名称：上呼吸道感染（感冒）', grade: '分级：1 级（轻度）', relation: '与试验药关系：无关（合并感染史）', action: '处理：常规对症治疗，继续试验用药', outcome: '转归：痊愈' },
    { id: 'TAE-004', subject: '受试者：S-026-002', ae: 'AE 名称：头晕（体位性）', grade: '分级：1 级（轻度）', relation: '与试验药关系：可能相关（降压药理）', action: '处理：调整服药时间，监测血压', outcome: '转归：缓解（未退出）' },
    { id: 'TAE-005', subject: '受试者：S-018-010（假设案例）', ae: 'AE 名称：未预期严重不良事件 SAE（低血糖晕厥）', grade: '分级：3 级（严重，需住院评估）', relation: '与试验药关系：待判定（24h 内上报申办者/伦理/药监）', action: '处理：急诊处理 + 破盲评估 + 立即上报', outcome: '转归：恢复（按 SAE 流程处置，专项随访）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/trial/closeout - 项目结题（项目号/完成日期/数据锁库/总结报告/状态）5 条 */
async function handleTrialCloseout(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CLO-001', projNo: '项目号：CT-2024-011（疫苗Ⅰ期）', finishDate: '完成日期：2025-11-20（末例受试者随访完成）', lock: '数据锁库：2025-12-05 已锁库（质疑全部关闭）', report: '总结报告：CSR 总结报告已提交申办者', status: '状态：已结题（档案归档，伦理结题通过）' },
    { id: 'CLO-002', projNo: '项目号：CT-2023-007（已结题旧项目）', finishDate: '完成日期：2024-06-30', lock: '数据锁库：2024-07-15 已锁库', report: '总结报告：CSR 已完成并归档', status: '状态：已结题（长期资料留存备查）' },
    { id: 'CLO-003', projNo: '项目号：CT-2025-018（降糖Ⅲ期）', finishDate: '完成日期：进行中（末例随访待完成）', lock: '数据锁库：未锁库（CRF 质疑处理中）', report: '总结报告：撰写中（待数据库锁定后成稿）', status: '状态：结题准备（随访收尾）' },
    { id: 'CLO-004', projNo: '项目号：CT-2026-004（抗凝Ⅱ期）', finishDate: '完成日期：未完成（入组进行中）', lock: '数据锁库：未锁库', report: '总结报告：未开始', status: '状态：进行中（距结题尚远）' },
    { id: 'CLO-005', projNo: '项目号：CT-2025-026（降压Ⅳ期）', finishDate: '完成日期：预计 2026-12 完成', lock: '数据锁库：未锁库（观察性数据滚动收集）', report: '总结报告：中期分析已出，终稿待末例', status: '状态：收尾阶段（随访接近完成）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m464bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/trial/projects', handle: handleTrialProjects, auth: true },
  { method: 'GET', path: '/api/v1/trial/ethics', handle: handleTrialEthics, auth: true },
  { method: 'GET', path: '/api/v1/trial/subjects', handle: handleTrialSubjects, auth: true },
  { method: 'GET', path: '/api/v1/trial/crf', handle: handleTrialCrf, auth: true },
  { method: 'GET', path: '/api/v1/trial/adverse-events', handle: handleTrialAe, auth: true },
  { method: 'GET', path: '/api/v1/trial/closeout', handle: handleTrialCloseout, auth: true },
];
