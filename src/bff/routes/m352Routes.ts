/**
 * 健澜科技 jlmedaios - M352 P0 合规改造：CDS 临床决策支持深度打磨
 *
 * 规则引擎/临床证据/临床试验/指南详情/路径详情（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/cds/rule-engine - 规则引擎 5 条 */
async function handleCdsRuleEngine(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CRE-001', engineName: '药物相互作用规则引擎', ruleCount: '500+ 条规则（覆盖常见药物组合）', executionCount: '今日已执行 1,000+ 次（处方审核时自动触发）', hitRate: '5%（触发了 50 次警报，其中 10 次为严重相互作用）', status: '启用中' },
    { id: 'CRE-002', engineName: '药物剂量规则引擎', ruleCount: '200+ 条规则（按年龄、体重、肝肾功能调整剂量）', executionCount: '今日已执行 2,000+ 次（处方开具时自动触发）', hitRate: '3%（触发了 60 次警报，其中 15 次为剂量偏大）', status: '启用中' },
    { id: 'CRE-003', engineName: '重复用药规则引擎', ruleCount: '100+ 条规则（同类药物重复使用检测）', executionCount: '今日已执行 500+ 次（处方开具时自动触发）', hitRate: '2%（触发了 10 次警报，其中 3 次为同类药物重复使用）', status: '启用中' },
    { id: 'CRE-004', engineName: '检验危急值规则引擎', ruleCount: '50+ 条规则（覆盖常见危急值）', executionCount: '今日已执行 300+ 次（检验结果推送时自动触发）', hitRate: '1%（触发了 3 次警报，其中 1 次为血钾危急值）', status: '启用中' },
    { id: 'CRE-005', engineName: '临床路径规则引擎', ruleCount: '30+ 条规则（覆盖常见临床路径）', executionCount: '今日已执行 200+ 次（住院医嘱开具时自动触发）', hitRate: '5%（触发了 10 次警报，其中 5 次为偏离临床路径）', status: '启用中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/clinical-evidence - 临床证据 5 条 */
async function handleCdsClinicalEvidence(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CCE-001', evidenceName: '阿司匹林用于急性心肌梗死的二级预防', source: 'Cochrane Database of Systematic Reviews（2023 年）', level: '1A 级（最高证据等级，基于多项大样本随机对照试验）', scope: '适用于所有急性心肌梗死患者（无阿司匹林禁忌症）', status: '现行有效' },
    { id: 'CCE-002', evidenceName: '他汀类药物用于冠心病的一级预防', source: 'New England Journal of Medicine（2022 年）', level: '1A 级（最高证据等级，基于多项大样本随机对照试验）', scope: '适用于所有冠心病高危患者（LDL-C > 3.4 mmol/L）', status: '现行有效' },
    { id: 'CCE-003', evidenceName: '二甲双胍用于 2 型糖尿病的一线治疗', source: 'Diabetes Care（2024 年）', level: '1A 级（最高证据等级，基于多项大样本随机对照试验）', scope: '适用于所有新诊断的 2 型糖尿病患者（无二甲双胍禁忌症）', status: '现行有效' },
    { id: 'CCE-004', evidenceName: '布地奈德福莫特罗用于慢阻肺的维持治疗', source: 'Lancet Respiratory Medicine（2023 年）', level: '1B 级（高证据等级，基于大样本随机对照试验）', scope: '适用于所有中重度慢阻肺患者（每年急性加重 ≥ 2 次）', status: '现行有效' },
    { id: 'CCE-005', evidenceName: '低分子肝素用于骨科术后深静脉血栓预防', source: 'Journal of Orthopaedic Trauma（2022 年）', level: '1A 级（最高证据等级，基于多项大样本随机对照试验）', scope: '适用于所有骨科大手术患者（髋关节置换、膝关节置换等）', status: '现行有效' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/clinical-trials - 临床试验 5 条 */
async function handleCdsClinicalTrials(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CCT-001', trialName: '新型抗凝药 XXXX 用于房颤患者的 III 期临床试验', phase: 'III 期（确证性临床试验）', indication: '房颤（非瓣膜性房颤）', status: '进行中（已入组 500 例患者，计划入组 1,000 例）', time: '2025-01-01 启动（预计 2027-01-01 完成）' },
    { id: 'CCT-002', trialName: '新型降糖药 YYYY 用于 2 型糖尿病的 II 期临床试验', phase: 'II 期（探索性临床试验）', indication: '2 型糖尿病', status: '进行中（已入组 100 例患者，计划入组 200 例）', time: '2025-06-01 启动（预计 2026-06-01 完成）' },
    { id: 'CCT-003', trialName: '新型抗肿瘤药 ZZZZ 用于非小细胞肺癌的 I 期临床试验', phase: 'I 期（首次人体试验）', indication: '非小细胞肺癌（晚期，既往治疗失败）', status: '进行中（已入组 30 例患者，计划入组 50 例）', time: '2025-09-01 启动（预计 2026-03-01 完成）' },
    { id: 'CCT-004', trialName: '新型抗生素 AAAA 用于耐药菌感染的 III 期临床试验', phase: 'III 期（确证性临床试验）', indication: '耐药菌感染（MRSA、CRE 等）', status: '已完成（2025-12-01 完成，结果阳性，已提交 NDA）', time: '2023-01-01 启动（2025-12-01 完成）' },
    { id: 'CCT-005', trialName: '新型支气管扩张剂 BBBB 用于慢阻肺的 II 期临床试验', phase: 'II 期（探索性临床试验）', indication: '慢阻肺（中重度）', status: '已完成（2025-09-01 完成，结果阳性，准备进入 III 期）', time: '2024-06-01 启动（2025-09-01 完成）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/clinical-guidelines-detail - 临床指南详情 5 条 */
async function handleCdsClinicalGuidelinesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CCGD-001', guidelineName: '中国高血压防治指南（2024 年修订版）', department: '心内科', content: '高血压诊断标准：收缩压 ≥ 140 mmHg 或舒张压 ≥ 90 mmHg；治疗目标：一般患者 < 140/90 mmHg，老年患者 < 150/90 mmHg；一线降压药物：ACEI/ARB、CCB、利尿剂', publishTime: '2024-05-15', status: '现行有效' },
    { id: 'CCGD-002', guidelineName: '中国 2 型糖尿病防治指南（2024 年版）', department: '内分泌科', content: '2 型糖尿病诊断标准：空腹血糖 ≥ 7.0 mmol/L 或餐后 2 小时血糖 ≥ 11.1 mmol/L；治疗目标：糖化血红蛋白 < 7.0%；一线降糖药物：二甲双胍', publishTime: '2024-08-20', status: '现行有效' },
    { id: 'CCGD-003', guidelineName: '中国急性 ST 段抬高型心肌梗死诊断和治疗指南（2023 年）', department: '心内科', content: 'STEMI 诊断标准：心电图 ST 段抬高 + 心肌酶升高；治疗原则：发病 12 小时内尽快行再灌注治疗（PCI 或溶栓）；抗血小板治疗：阿司匹林 + P2Y12 抑制剂', publishTime: '2023-10-10', status: '现行有效' },
    { id: 'CCGD-004', guidelineName: '中国成人社区获得性肺炎诊断和治疗指南（2024 年版）', department: '呼吸内科', content: 'CAP 诊断标准：新发咳嗽、咳痰 + 发热 + 肺部湿啰音 + 影像学实变影；治疗原则：经验性抗感染治疗（根据病情严重程度选择抗生素）；轻症患者：口服阿莫西林/克拉维酸', publishTime: '2024-03-05', status: '现行有效' },
    { id: 'CCGD-005', guidelineName: '中国骨质疏松症诊疗指南（2024 年修订版）', department: '骨科', content: '骨质疏松诊断标准：骨密度 T 值 ≤ -2.5；治疗原则：基础措施（补钙 + 维生素 D）+ 抗骨质疏松药物（双膦酸盐等）；高危人群筛查：65 岁以上女性、70 岁以上男性', publishTime: '2024-06-18', status: '现行有效' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/clinical-pathways-detail - 临床路径详情 5 条 */
async function handleCdsClinicalPathwaysDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CCPD-001', pathwayName: '急性单纯性阑尾炎临床路径', disease: '急性单纯性阑尾炎', stage: '术后康复期（第 3-7 天）', standard: '① 术后第 1 天：下床活动；② 术后第 2-3 天：进流质饮食；③ 术后第 4-5 天：进半流质饮食；④ 术后第 6-7 天：拆线出院', completionRate: '85%（已完成术前检查、手术、术后第 1-3 天康复）' },
    { id: 'CCPD-002', pathwayName: '计划性剖宫产临床路径', disease: '计划性剖宫产', stage: '术前准备期（入院后第 1-2 天）', standard: '① 入院第 1 天：完善术前检查（血常规、凝血功能、肝肾功能、心电图、B 超）；② 入院第 2 天：术前讨论、签字、备血；③ 入院第 3 天：手术', completionRate: '60%（已完成入院、术前检查）' },
    { id: 'CCPD-003', pathwayName: '社区获得性肺炎临床路径（成人）', disease: '社区获得性肺炎', stage: '抗感染治疗期（入院后第 3-7 天）', standard: '① 入院第 1-3 天：经验性抗感染治疗 + 对症支持治疗；② 入院第 4-7 天：复查胸片、评估疗效、调整抗生素；③ 入院第 7-10 天：出院（症状缓解、影像学吸收）', completionRate: '70%（已完成入院、经验性抗感染治疗 3 天）' },
    { id: 'CCPD-004', pathwayName: '2 型糖尿病临床路径（住院患者）', disease: '2 型糖尿病', stage: '血糖调整期（入院后第 3-7 天）', standard: '① 入院第 1-2 天：完善检查（糖化血红蛋白、C 肽、并发症筛查）；② 入院第 3-7 天：调整降糖方案、监测血糖；③ 入院第 7-10 天：出院（血糖控制达标）', completionRate: '50%（已完成入院、完善检查）' },
    { id: 'CCPD-005', pathwayName: '股骨颈骨折临床路径（老年患者）', disease: '股骨颈骨折', stage: '术后康复期（术后第 3-14 天）', standard: '① 术后第 1-3 天：预防感染、预防深静脉血栓；② 术后第 4-7 天：下床活动（助行器辅助）；③ 术后第 8-14 天：康复训练、出院', completionRate: '40%（已完成手术、术后第 1-3 天康复）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m352Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cds/rule-engine', handle: handleCdsRuleEngine, auth: true },
  { method: 'GET', path: '/api/v1/cds/clinical-evidence', handle: handleCdsClinicalEvidence, auth: true },
  { method: 'GET', path: '/api/v1/cds/clinical-trials', handle: handleCdsClinicalTrials, auth: true },
  { method: 'GET', path: '/api/v1/cds/clinical-guidelines-detail', handle: handleCdsClinicalGuidelinesDetail, auth: true },
  { method: 'GET', path: '/api/v1/cds/clinical-pathways-detail', handle: handleCdsClinicalPathwaysDetail, auth: true },
];
