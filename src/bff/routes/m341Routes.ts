/**
 * 健澜科技 jlmedaios - M341 CDS 临床决策支持域
 *
 * 临床警报/干预/指南/路径/药物相互作用/重复用药（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/cds/alerts - 临床警报 5 条 */
async function handleCdsAlerts(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CA-001', alertNo: 'ALERT-2026-000001', type: '药物禁忌警报', patient: '张***（男，65 岁，高血压住院患者）', content: '患者有青霉素过敏史，当前医嘱开具了头孢类抗生素（头孢呋辛钠），存在交叉过敏风险', level: '高级（需立即审核）' },
    { id: 'CA-002', alertNo: 'ALERT-2026-000002', type: '检验危急值警报', patient: '王***（女，58 岁，普外科住院患者）', content: '患者血钾 6.8 mmol/L（危急值，正常范围 3.5-5.5 mmol/L），存在心律失常风险', level: '危急（需立即处理）' },
    { id: 'CA-003', alertNo: 'ALERT-2026-000003', type: '重复用药警报', patient: '刘***（男，72 岁，骨科住院患者）', content: '患者同时开具了低分子肝素钠（抗凝）和阿司匹林肠溶片（抗血小板），存在出血风险叠加', level: '中级（需评估后继续）' },
    { id: 'CA-004', alertNo: 'ALERT-2026-000004', type: '年龄剂量警报', patient: '孙***（女，45 岁，普外科住院患者）', content: '患者体重 55kg，当前医嘱开具了甲硝唑片 0.4g 每日 3 次，剂量偏大（建议 0.2g 每日 3 次）', level: '低级（建议调整剂量）' },
    { id: 'CA-005', alertNo: 'ALERT-2026-000005', type: '药物相互作用警报', patient: '吴***（男，60 岁，胸外科住院患者）', content: '患者同时使用了布地奈德（吸入激素）和酮康唑（抗真菌药），存在药物相互作用（酮康唑会增加布地奈德血药浓度）', level: '中级（需评估后继续）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/interventions - 临床干预 5 条 */
async function handleCdsInterventions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CI-001', interventionNo: 'INT-2026-000001', type: '药物干预（停用/换药）', patient: '张***（男，65 岁，高血压住院患者）', measure: '停用头孢呋辛钠，改用阿奇霉素（无交叉过敏风险）', result: '已执行（患者未发生过敏反应，感染控制良好）' },
    { id: 'CI-002', interventionNo: 'INT-2026-000002', type: '检验危急值干预（立即处理）', patient: '王***（女，58 岁，普外科住院患者）', measure: '立即给予葡萄糖酸钙 10ml 静脉推注 + 胰岛素 4U 静脉推注 + 呋塞米 20mg 静脉推注', result: '已执行（患者血钾降至 4.5 mmol/L，恢复正常）' },
    { id: 'CI-003', interventionNo: 'INT-2026-000003', type: '重复用药干预（评估后继续）', patient: '刘***（男，72 岁，骨科住院患者）', measure: '评估后继续使用低分子肝素钠 + 阿司匹林，但需监测凝血功能和出血风险', result: '已执行（患者凝血功能正常，未发生出血事件）' },
    { id: 'CI-004', interventionNo: 'INT-2026-000004', type: '剂量调整干预（减量）', patient: '孙***（女，45 岁，普外科住院患者）', measure: '甲硝唑片剂量从 0.4g 每日 3 次调整为 0.2g 每日 3 次', result: '已执行（患者不良反应减轻，治疗效果良好）' },
    { id: 'CI-005', interventionNo: 'INT-2026-000005', type: '药物相互作用干预（调整用药时间）', patient: '吴***（男，60 岁，胸外科住院患者）', measure: '布地奈德吸入时间与酮康唑口服时间间隔 4 小时（减少相互作用）', result: '已执行（患者血药浓度稳定，治疗效果良好）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/guidelines - 临床指南 5 条 */
async function handleCdsGuidelines(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CG-001', guidelineName: '中国高血压防治指南（2024 年修订版）', department: '心内科', content: '高血压诊断标准：收缩压 ≥ 140 mmHg 或舒张压 ≥ 90 mmHg；治疗目标：一般患者 < 140/90 mmHg，老年患者 < 150/90 mmHg', publishTime: '2024-05-15', status: '现行有效' },
    { id: 'CG-002', guidelineName: '中国 2 型糖尿病防治指南（2024 年版）', department: '内分泌科', content: '2 型糖尿病诊断标准：空腹血糖 ≥ 7.0 mmol/L 或餐后 2 小时血糖 ≥ 11.1 mmol/L；治疗目标：糖化血红蛋白 < 7.0%', publishTime: '2024-08-20', status: '现行有效' },
    { id: 'CG-003', guidelineName: '中国急性 ST 段抬高型心肌梗死诊断和治疗指南（2023 年）', department: '心内科', content: 'STEMI 诊断标准：心电图 ST 段抬高 + 心肌酶升高；治疗原则：发病 12 小时内尽快行再灌注治疗（PCI 或溶栓）', publishTime: '2023-10-10', status: '现行有效' },
    { id: 'CG-004', guidelineName: '中国成人社区获得性肺炎诊断和治疗指南（2024 年版）', department: '呼吸内科', content: 'CAP 诊断标准：新发咳嗽、咳痰 + 发热 + 肺部湿啰音 + 影像学实变影；治疗原则：经验性抗感染治疗（根据病情严重程度选择抗生素）', publishTime: '2024-03-05', status: '现行有效' },
    { id: 'CG-005', guidelineName: '中国骨质疏松症诊疗指南（2024 年修订版）', department: '骨科', content: '骨质疏松诊断标准：骨密度 T 值 ≤ -2.5；治疗原则：基础措施（补钙 + 维生素 D）+ 抗骨质疏松药物（双膦酸盐等）', publishTime: '2024-06-18', status: '现行有效' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/checklists - 临床路径 5 条 */
async function handleCdsChecklists(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CC-001', pathwayName: '急性单纯性阑尾炎临床路径', disease: '急性单纯性阑尾炎', stage: '术后康复期（第 3-7 天）', standard: '① 术后第 1 天：下床活动；② 术后第 2-3 天：进流质饮食；③ 术后第 4-5 天：进半流质饮食；④ 术后第 6-7 天：拆线出院', completionRate: '85%（已完成术前检查、手术、术后第 1-3 天康复）' },
    { id: 'CC-002', pathwayName: '计划性剖宫产临床路径', disease: '计划性剖宫产', stage: '术前准备期（入院后第 1-2 天）', standard: '① 入院第 1 天：完善术前检查（血常规、凝血功能、肝肾功能、心电图、B 超）；② 入院第 2 天：术前讨论、签字、备血；③ 入院第 3 天：手术', completionRate: '60%（已完成入院、术前检查）' },
    { id: 'CC-003', pathwayName: '社区获得性肺炎临床路径（成人）', disease: '社区获得性肺炎', stage: '抗感染治疗期（入院后第 3-7 天）', standard: '① 入院第 1-3 天：经验性抗感染治疗 + 对症支持治疗；② 入院第 4-7 天：复查胸片、评估疗效、调整抗生素；③ 入院第 7-10 天：出院（症状缓解、影像学吸收）', completionRate: '70%（已完成入院、经验性抗感染治疗 3 天）' },
    { id: 'CC-004', pathwayName: '2 型糖尿病临床路径（住院患者）', disease: '2 型糖尿病', stage: '血糖调整期（入院后第 3-7 天）', standard: '① 入院第 1-2 天：完善检查（糖化血红蛋白、C 肽、并发症筛查）；② 入院第 3-7 天：调整降糖方案、监测血糖；③ 入院第 7-10 天：出院（血糖控制达标）', completionRate: '50%（已完成入院、完善检查）' },
    { id: 'CC-005', pathwayName: '股骨颈骨折临床路径（老年患者）', disease: '股骨颈骨折', stage: '术后康复期（术后第 3-14 天）', standard: '① 术后第 1-3 天：预防感染、预防深静脉血栓；② 术后第 4-7 天：下床活动（助行器辅助）；③ 术后第 8-14 天：康复训练、出院', completionRate: '40%（已完成手术、术后第 1-3 天康复）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/drugs-interaction - 药物相互作用 5 条 */
async function handleCdsDrugsInteraction(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CDI-001', drugA: '华法林（抗凝药）', drugB: '阿司匹林肠溶片（抗血小板药）', interaction: '华法林与阿司匹林合用会显著增加出血风险（两者均抑制凝血功能）', severity: '严重（出血风险增加 2-3 倍）', suggestion: '避免合用；如需抗凝 + 抗血小板，需在医生指导下使用，并密切监测凝血功能（INR）和出血症状' },
    { id: 'CDI-002', drugA: '他汀类药物（阿托伐他汀）', drugB: '克拉霉素（抗生素）', interaction: '克拉霉素会抑制他汀类药物的代谢（CYP3A4），增加他汀血药浓度，增加横纹肌溶解风险', severity: '中度（横纹肌溶解风险增加）', suggestion: '避免合用；如需使用抗生素，可改用阿奇霉素（无 CYP3A4 抑制作用）' },
    { id: 'CDI-003', drugA: 'ACEI（依那普利）', drugB: '保钾利尿剂（螺内酯）', interaction: '两者合用会显著增加高钾血症风险（ACEI 抑制醛固酮，螺内酯也保钾）', severity: '严重（高钾血症风险增加 3-4 倍）', suggestion: '避免合用；如需合用，需密切监测血钾水平（每 2-4 周复查），并根据血钾调整剂量' },
    { id: 'CDI-004', drugA: 'SSRI（氟西汀）', drugB: 'MAOI（苯乙肼）', interaction: '两者合用会导致 5-羟色胺综合征（高热、肌肉强直、意识障碍）', severity: '极严重（可能危及生命）', suggestion: '严禁合用；停用 MAOI 后需间隔 14 天才能使用 SSRI' },
    { id: 'CDI-005', drugA: '地高辛（强心药）', drugB: '胺碘酮（抗心律失常药）', interaction: '胺碘酮会增加地高辛血药浓度（抑制地高辛的肾小管排泄）', severity: '中度（地高辛中毒风险增加）', suggestion: '合用时需减少地高辛剂量（通常减少 50%），并密切监测地高辛血药浓度（目标 0.8-2.0 ng/ml）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/duplicate-therapy - 重复用药 5 条 */
async function handleCdsDuplicateTherapy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CDT-001', patient: '张***（男，65 岁，高血压住院患者）', drug: '硝苯地平缓释片（钙通道阻滞剂） + 氨氯地平片（钙通道阻滞剂）', duplicateType: '同类药物重复使用（两种钙通道阻滞剂合用）', suggestion: '停用一种（建议停用氨氯地平，保留硝苯地平缓释片，因其为缓释剂型，血药浓度更稳定）', doctor: '李***（心内科主治医师，已确认调整）' },
    { id: 'CDT-002', patient: '王***（女，58 岁，普外科住院患者）', drug: '头孢呋辛钠（二代头孢） + 头孢哌酮钠（三代头孢）', duplicateType: '同类药物重复使用（两种头孢类抗生素合用）', suggestion: '停用一种（建议停用头孢哌酮钠，保留头孢呋辛钠，因其为二代头孢，对常见革兰阴性菌覆盖足够）', doctor: '王***（普外科副主任医师，已确认调整）' },
    { id: 'CDT-003', patient: '刘***（男，72 岁，骨科住院患者）', drug: '阿司匹林肠溶片（抗血小板） + 氯吡格雷片（抗血小板）', duplicateType: '同类药物重复使用（两种抗血小板药合用）', suggestion: '评估后决定：如为急性冠脉综合征或支架术后，可短期合用（双抗治疗，通常 1-12 个月）；如为单纯预防，建议停用一种（保留阿司匹林）', doctor: '赵***（骨科主任医师，已评估后决定保留双抗治疗 1 个月）' },
    { id: 'CDT-004', patient: '孙***（女，45 岁，普外科住院患者）', drug: '左甲状腺素钠片（补充甲状腺素） + 甲状腺片（动物来源甲状腺素）', duplicateType: '同类药物重复使用（两种甲状腺素制剂合用）', suggestion: '停用一种（建议停用甲状腺片，保留左甲状腺素钠片，因其为人工合成、剂量稳定）', doctor: '周***（普外科副主任医师，已确认调整）' },
    { id: 'CDT-005', patient: '吴***（男，60 岁，胸外科住院患者）', drug: '布地奈德福莫特罗吸入剂（含激素 + 长效支气管扩张剂） + 沙美特罗替卡松吸入剂（含激素 + 长效支气管扩张剂）', duplicateType: '同类药物重复使用（两种复方吸入剂合用，均含激素 + 长效支气管扩张剂）', suggestion: '停用一种（建议停用沙美特罗替卡松吸入剂，保留布地奈德福莫特罗吸入剂，因其起效更快）', doctor: '郑***（胸外科主任医师，已确认调整）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m341Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cds/alerts', handle: handleCdsAlerts, auth: true },
  { method: 'GET', path: '/api/v1/cds/interventions', handle: handleCdsInterventions, auth: true },
  { method: 'GET', path: '/api/v1/cds/guidelines', handle: handleCdsGuidelines, auth: true },
  { method: 'GET', path: '/api/v1/cds/checklists', handle: handleCdsChecklists, auth: true },
  { method: 'GET', path: '/api/v1/cds/drugs-interaction', handle: handleCdsDrugsInteraction, auth: true },
  { method: 'GET', path: '/api/v1/cds/duplicate-therapy', handle: handleCdsDuplicateTherapy, auth: true },
];
