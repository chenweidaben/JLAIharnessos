/**
 * 健澜科技 jlmedaios - M332 老年医学 + 质量控制域
 *
 * 老年综合评估/跌倒风险/认知障碍 + 质量指标/质量审核/质量整改（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/geriatrics/assessment - 老年综合评估 5 条 */
async function handleGeriatricsAssessment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'GA-001', patient: '张***（男，75 岁，高血压 + 糖尿病 + 冠心病）', assessmentItem: 'ADL（日常生活活动能力）+ IADL（工具性日常生活活动能力）+ 认知功能（MMSE）+ 抑郁筛查（GDS）+ 营养筛查（MNA-SF）', score: 'ADL 80 分（轻度依赖）/ IADL 6 分（中度依赖）/ MMSE 26 分（轻度认知障碍）/ GDS 5 分（无抑郁）/ MNA-SF 11 分（营养不良风险）', grade: '中度衰弱（综合评估）', assessor: '李***（老年医学科主治医师）' },
    { id: 'GA-002', patient: '王***（女，78 岁，骨质疏松 + 骨关节炎）', assessmentItem: 'ADL + IADL + 认知功能（MMSE）+ 跌倒风险（TUG）+ 营养筛查（MNA-SF）', score: 'ADL 90 分（轻度依赖）/ IADL 8 分（轻度依赖）/ MMSE 28 分（正常）/ TUG 14 秒（跌倒风险高）/ MNA-SF 13 分（正常）', grade: '轻度衰弱（综合评估）', assessor: '陈***（老年医学科副主任医师）' },
    { id: 'GA-003', patient: '刘***（男，82 岁，脑卒中后偏瘫 + 高血压）', assessmentItem: 'ADL + IADL + 认知功能（MMSE）+ 吞咽功能（洼田饮水试验）+ 营养筛查（MNA-SF）', score: 'ADL 40 分（重度依赖）/ IADL 2 分（重度依赖）/ MMSE 22 分（中度认知障碍）/ 洼田饮水试验 III 级（吞咽障碍）/ MNA-SF 9 分（营养不良）', grade: '重度衰弱（综合评估）', assessor: '赵***（老年医学科主任医师）' },
    { id: 'GA-004', patient: '孙***（女，70 岁，慢性阻塞性肺疾病）', assessmentItem: 'ADL + IADL + 认知功能（MMSE）+ 抑郁筛查（GDS）+ 营养筛查（MNA-SF）', score: 'ADL 95 分（轻度依赖）/ IADL 10 分（正常）/ MMSE 29 分（正常）/ GDS 3 分（无抑郁）/ MNA-SF 14 分（正常）', grade: '健康（无衰弱）', assessor: '周***（老年医学科主治医师）' },
    { id: 'GA-005', patient: '吴***（男，85 岁，冠心病心衰 + 肾功能不全）', assessmentItem: 'ADL + IADL + 认知功能（MMSE）+ 抑郁筛查（GDS）+ 营养筛查（MNA-SF）+ 多重用药评估（5 种以上药物）', score: 'ADL 60 分（中度依赖）/ IADL 4 分（中度依赖）/ MMSE 24 分（轻度认知障碍）/ GDS 7 分（可能抑郁）/ MNA-SF 10 分（营养不良风险）/ 多重用药（8 种药物）', grade: '中度衰弱（综合评估）', assessor: '郑***（老年医学科副主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/geriatrics/falls - 跌倒风险 5 条 */
async function handleGeriatricsFalls(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'GF-001', patient: '王***（女，78 岁，骨质疏松 + 骨关节炎）', fallRisk: '高风险（TUG 14 秒，>12 秒即为高风险）', riskFactors: '①体位性低血压（站立收缩压下降 20mmHg）②膝关节疼痛（影响平衡）③居家环境不安全（浴室无扶手、地毯松动）④服用降压药（可能导致头晕）', intervention: '①安装浴室扶手 + 移除地毯 ②调整降压药服药时间（睡前）③进行平衡训练（太极拳）④使用助行器', doctor: '陈***（老年医学科副主任医师）' },
    { id: 'GF-002', patient: '张***（男，75 岁，高血压 + 糖尿病）', fallRisk: '中风险（TUG 10 秒，介于 9-12 秒之间）', riskFactors: '①夜间尿频（可能导致夜间起床跌倒）②服用降糖药（可能导致低血糖头晕）③视力下降（白内障）', intervention: '①睡前限制饮水 ②调整降糖药剂量（减少低血糖风险）③建议眼科就诊（白内障手术）', doctor: '李***（老年医学科主治医师）' },
    { id: 'GF-003', patient: '刘***（男，82 岁，脑卒中后偏瘫）', fallRisk: '极高风险（偏瘫 + 平衡功能差）', riskFactors: '①左侧肢体偏瘫（Brunnstrom III 期）②平衡功能差（Berg 平衡量表 30 分，<40 分为跌倒高风险）③居家环境不安全（无轮椅通道）', intervention: '①进行平衡训练（PT）②居家环境改造（安装坡道 + 扶手）③使用轮椅代步', doctor: '赵***（老年医学科主任医师）' },
    { id: 'GF-004', patient: '孙***（女，70 岁，慢阻肺）', fallRisk: '低风险（TUG 8 秒，<9 秒即为低风险）', riskFactors: '①偶发呼吸困难（可能导致头晕）', intervention: '①规律使用吸入剂（控制呼吸困难）②保持现有活动量', doctor: '周***（老年医学科主治医师）' },
    { id: 'GF-005', patient: '吴***（男，85 岁，冠心病心衰 + 肾功能不全）', fallRisk: '高风险（TUG 13 秒，>12 秒即为高风险）', riskFactors: '①体位性低血压（站立收缩压下降 25mmHg）②多重用药（8 种药物，可能有相互作用）③下肢水肿（影响步态）④营养不良（肌肉力量下降）', intervention: '①调整药物（减少不必要的药物）②加强营养支持（补充蛋白质）③使用助行器', doctor: '郑***（老年医学科副主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/geriatrics/dementia - 认知障碍 5 条 */
async function handleGeriatricsDementia(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'GD-001', patient: '张***（男，75 岁，高血压 + 糖尿病）', screeningTool: 'MMSE（简易精神状态量表）+ MoCA（蒙特利尔认知评估量表）', score: 'MMSE 26 分 / MoCA 22 分', grade: '轻度认知障碍（MCI）', suggestions: '①进行认知训练（记忆力训练、智力游戏）②控制血压血糖（预防脑血管病进展）③定期复查（每 6 个月复查 MMSE/MoCA）' },
    { id: 'GD-002', patient: '刘***（男，82 岁，脑卒中后偏瘫）', screeningTool: 'MMSE + MoCA + ADL（评估认知对日常生活的影响）', score: 'MMSE 22 分 / MoCA 18 分 / ADL 40 分（重度依赖）', grade: '中度阿尔茨海默病（AD）', suggestions: '①药物治疗（多奈哌齐 5mg/日）②认知训练（结合日常生活训练）③家属照护指导（防走失、防意外）' },
    { id: 'GD-003', patient: '吴***（男，85 岁，冠心病心衰）', screeningTool: 'MMSE + MoCA + GDS（抑郁筛查，排除假性痴呆）', score: 'MMSE 24 分 / MoCA 20 分 / GDS 7 分（可能抑郁）', grade: '轻度认知障碍（MCI）+ 可能抑郁', suggestions: '①先治疗抑郁（抗抑郁药物）②复查认知功能（抑郁改善后）③进行认知训练' },
    { id: 'GD-004', patient: '王***（女，78 岁，骨质疏松）', screeningTool: 'MMSE + MoCA', score: 'MMSE 28 分 / MoCA 26 分', grade: '正常（无认知障碍）', suggestions: '①保持现有认知活动（阅读、社交）②定期体检（每年复查 MMSE/MoCA）' },
    { id: 'GD-005', patient: '孙***（女，70 岁，慢阻肺）', screeningTool: 'MMSE + MoCA', score: 'MMSE 29 分 / MoCA 27 分', grade: '正常（无认知障碍）', suggestions: '①保持现有认知活动（运动、社交）②定期体检（每年复查 MMSE/MoCA）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/qc/indicators - 质量指标 5 条 */
async function handleQcIndicators(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QCI-001', indicatorName: '住院患者压疮发生率', targetValue: '<0.5%', actualValue: '0.3%', rate: '达标（优于目标）', trend: '↓ 较上季度下降 0.1%' },
    { id: 'QCI-002', indicatorName: '住院患者跌倒发生率', targetValue: '<0.2%', actualValue: '0.15%', rate: '达标（优于目标）', trend: '↓ 较上季度下降 0.05%' },
    { id: 'QCI-003', indicatorName: '手术部位感染率', targetValue: '<1.0%', actualValue: '0.8%', rate: '达标（优于目标）', trend: '→ 与上季度持平' },
    { id: 'QCI-004', indicatorName: '门诊处方合格率', targetValue: '>95%', actualValue: '96.5%', rate: '达标（优于目标）', trend: '↑ 较上季度提升 1.5%' },
    { id: 'QCI-005', indicatorName: '病历甲级率', targetValue: '>90%', actualValue: '92.0%', rate: '达标（优于目标）', trend: '↑ 较上季度提升 2.0%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/qc/audits - 质量审核 5 条 */
async function handleQcAudits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QCA-001', auditNo: 'AUDIT-2026-000001', item: '门诊处方质量抽查（100 张处方）', result: '合格 96 张 / 不合格 4 张（合格率 96%）', auditor: '质控科 李***', time: '2026-10-15' },
    { id: 'QCA-002', auditNo: 'AUDIT-2026-000002', item: '运行病历质量抽查（50 份运行病历）', result: '甲级 46 份 / 乙级 3 份 / 丙级 1 份（甲级率 92%）', auditor: '质控科 陈***', time: '2026-10-10' },
    { id: 'QCA-003', auditNo: 'AUDIT-2026-000003', item: '出院病历质量抽查（100 份出院病历）', result: '甲级 93 份 / 乙级 6 份 / 丙级 1 份（甲级率 93%）', auditor: '质控科 赵***', time: '2026-10-05' },
    { id: 'QCA-004', auditNo: 'AUDIT-2026-000004', item: '护理质量专项检查（基础护理 + 特级护理）', result: '基础护理合格率 95% / 特级护理合格率 98%', auditor: '护理部 周***', time: '2026-10-01' },
    { id: 'QCA-005', auditNo: 'AUDIT-2026-000005', item: '院感防控专项检查（手卫生 + 消毒隔离）', result: '手卫生依从性 90% / 消毒隔离合格率 98%', auditor: '院感科 郑***', time: '2026-09-25' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/qc/corrective - 质量整改 5 条 */
async function handleQcCorrective(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QCC-001', problem: '门诊处方合格率偏低（部分处方存在用药不适宜）', rootCause: '部分医生对新药适应症不熟悉 + 处方审核系统提醒不够', measures: '①组织新药适应症培训（全院医生）②优化处方审核系统（增加新药知识库）', responsible: '医务科 + 信息科', status: '整改中（10 月底完成培训，11 月优化系统）' },
    { id: 'QCC-002', problem: '运行病历丙级率偏高（存在病历书写不及时、内容不完整）', rootCause: '部分医生病历书写习惯不好 + 质控提醒不够', measures: '①加强病历书写培训（重点科室）②增加病历质量实时提醒（系统自动预警）', responsible: '质控科 + 各临床科室', status: '已整改完成（9 月已完成培训，10 月已上线实时提醒）' },
    { id: 'QCC-003', problem: '手卫生依从性偏低（部分医护人员手卫生不规范）', rootCause: '部分医护人员对手卫生重要性认识不足 + 手卫生设施不方便', measures: '①加强手卫生培训（全员）②增加手卫生设施（病房门口、床头）', responsible: '院感科 + 护理部', status: '整改中（10 月完成培训，11 月完成设施增加）' },
    { id: 'QCC-004', problem: '住院患者压疮发生率偏高（部分高危患者未及时采取预防措施）', rootCause: '部分护士对压疮风险评估不及时 + 预防措施不到位', measures: '①加强压疮风险评估培训（全院护士）②优化压疮预防流程（系统自动提醒）', responsible: '护理部 + 质控科', status: '已整改完成（9 月已完成培训，10 月已优化流程）' },
    { id: 'QCC-005', problem: '手术部位感染率偏高（部分手术室消毒隔离不规范）', rootCause: '部分手术室工作人员消毒隔离习惯不好 + 环境监测不够', measures: '①加强消毒隔离培训（手术室全员）②增加环境监测频次（每周 1 次）', responsible: '院感科 + 手术室', status: '整改中（10 月完成培训，持续增加监测）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m332Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/geriatrics/assessment', handle: handleGeriatricsAssessment, auth: true },
  { method: 'GET', path: '/api/v1/geriatrics/falls', handle: handleGeriatricsFalls, auth: true },
  { method: 'GET', path: '/api/v1/geriatrics/dementia', handle: handleGeriatricsDementia, auth: true },
  { method: 'GET', path: '/api/v1/qc/indicators', handle: handleQcIndicators, auth: true },
  { method: 'GET', path: '/api/v1/qc/audits', handle: handleQcAudits, auth: true },
  { method: 'GET', path: '/api/v1/qc/corrective', handle: handleQcCorrective, auth: true },
];
