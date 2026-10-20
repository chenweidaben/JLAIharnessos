/**
 * 健澜科技 jlmedaios - 合理用药/处方审核深度（medication-review）
 *
 * 待审处方列表/药物相互作用/过敏警示/剂量审核/处方审核记录/用药审计日志
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/medication-review/prescriptions - 待审处方列表（处方号/患者/药品数/医生/时间）5 条 */
async function handleMrPrescriptions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRP-001', rxNo: '处方号：RX-2026-1001（门诊待审）', patient: '患者：张***（男，65 岁，冠心病）', drugCount: '药品数：3 种（阿司匹林、阿托伐他汀、美托洛尔）', doctor: '医生：王***（心内科主任医师）', time: '开方时间：2026-10-20 09:12:30' },
    { id: 'MRP-002', rxNo: '处方号：RX-2026-1002（门诊待审）', patient: '患者：李***（女，58 岁，2 型糖尿病）', drugCount: '药品数：2 种（二甲双胍缓释片、格列美脲）', doctor: '医生：刘***（内分泌科主治医师）', time: '开方时间：2026-10-20 09:40:15' },
    { id: 'MRP-003', rxNo: '处方号：RX-2026-1003（急诊待审）', patient: '患者：王***（男，72 岁，肺部感染）', drugCount: '药品数：4 种（头孢曲松、氨溴索、布洛芬、氯化钠输液）', doctor: '医生：周***（急诊主治医师）', time: '开方时间：2026-10-20 10:05:42' },
    { id: 'MRP-004', rxNo: '处方号：RX-2026-1004（住院待审）', patient: '患者：陈***（男，45 岁，术后镇痛）', drugCount: '药品数：2 种（氨酚待因片、奥美拉唑）', doctor: '医生：赵***（骨科主任医师）', time: '开方时间：2026-10-20 10:30:08' },
    { id: 'MRP-005', rxNo: '处方号：RX-2026-1005（儿科待审）', patient: '患者：赵***（女，3 岁，上呼吸道感染）', drugCount: '药品数：2 种（对乙酰氨基酚混悬液、小儿感冒颗粒）', doctor: '医生：孙***（儿科住院医师）', time: '开方时间：2026-10-20 11:00:25' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/medication-review/interactions - 药物相互作用（药品A/药品B/严重等级/机制/建议）5 条 */
async function handleMrInteractions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRI-001', drugA: '药品A：华法林钠片（抗凝）', drugB: '药品B：阿司匹林肠溶片（抗血小板）', severity: '严重等级：高危（红色预警）', mechanism: '机制：两者叠加显著增强抗凝作用，INR 升高，出血风险增加', advice: '建议：避免联用；如必须联用需密切监测 INR 并下调华法林剂量' },
    { id: 'MRI-002', drugA: '药品A：克拉霉素（大环内酯抗生素）', drugB: '药品B：阿托伐他汀钙（他汀）', severity: '严重等级：中高危（橙色预警）', mechanism: '机制：克拉霉素抑制 CYP3A4，升高他汀血药浓度，增加肌病/横纹肌溶解风险', advice: '建议：联用期间暂停阿托伐他汀或更换为非 CYP3A4 代谢的瑞舒伐他汀' },
    { id: 'MRI-003', drugA: '药品A：二甲双胍（双胍类降糖）', drugB: '药品B：碘造影剂（增强 CT）', severity: '严重等级：中危（黄色提示）', mechanism: '机制：造影剂可诱发急性肾损伤，叠加二甲双胍增加乳酸酸中毒风险', advice: '建议：造影前后 48 小时暂停二甲双胍，肾功能恢复后再恢复使用' },
    { id: 'MRI-004', drugA: '药品A：ACEI 类降压药（依那普利）', drugB: '药品B：螺内酯（保钾利尿剂）', severity: '严重等级：中高危（橙色预警）', mechanism: '机制：两者均升血钾，联用易致高钾血症，尤其肾功能不全者', advice: '建议：联用期间监测血钾与肾功能，必要时改用排钾利尿剂' },
    { id: 'MRI-005', drugA: '药品A：布洛芬（NSAID）', drugB: '药品B：甲氨蝶呤（免疫抑制剂）', severity: '严重等级：中危（黄色提示）', mechanism: '机制：NSAID 减少肾灌注并竞争排泄，升高甲氨蝶呤血药浓度致毒性', advice: '建议：避免长期联用，必要时监测甲氨蝶呤血药浓度' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/medication-review/allergies - 过敏警示（药品/过敏类型/反应/严重度/状态）5 条 */
async function handleMrAllergies(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRA-001', drug: '药品：青霉素 G（β-内酰胺类）', allergyType: '过敏类型：IgE 介导速发型过敏', reaction: '反应：注射后 5 分钟出现皮疹、喉头水肿、血压下降（过敏性休克）', severity: '严重度：极重度（禁忌，红牌）', status: '状态：已标记为永久禁忌，系统开方时强制拦截' },
    { id: 'MRA-002', drug: '药品：头孢氨苄（第一代头孢）', allergyType: '过敏类型：交叉过敏（青霉素相关）', reaction: '反应：口服后出现荨麻疹、瘙痒，无呼吸困难', severity: '严重度：中度（慎用，黄牌）', status: '状态：已标记，开方同类药时弹窗提示谨慎' },
    { id: 'MRA-003', drug: '药品：磺胺类（复方新诺明）', allergyType: '过敏类型：药物疹', reaction: '反应：躯干散在斑丘疹，停药后消退', severity: '严重度：中度（禁忌，黄牌）', status: '状态：已标记为慎用，磺胺及含磺胺结构药物提示' },
    { id: 'MRA-004', drug: '药品：阿司匹林（NSAID）', allergyType: '过敏类型：阿司匹林不耐受（哮喘加重）', reaction: '反应：服药后诱发支气管痉挛、喘息（AERD）', severity: '严重度：中重度（慎用，橙牌）', status: '状态：已标记，NSAID 类交叉不耐受提示' },
    { id: 'MRA-005', drug: '药品：造影剂（碘海醇）', allergyType: '过敏类型：造影剂迟发反应', reaction: '反应：注射后 1 小时出现皮肤潮红、恶心', severity: '严重度：轻度（记录，绿牌）', status: '状态：已记录，下次使用前预评估并备抗过敏药' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/medication-review/dose-checks - 剂量审核（药品/当前剂量/日极量/适配性/警示）5 条 */
async function handleMrDoseChecks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRD-001', drug: '药品：对乙酰氨基酚（成人）', currentDose: '当前剂量：单次 500mg，每日 4 次（2000mg/日）', dailyMax: '日极量：2000mg/日（老年人上限），成人常规不超 2000-4000mg', fit: '适配性：剂量处于安全范围', warning: '警示：老年患者避免超 2000mg/日，防肝损伤' },
    { id: 'MRD-002', drug: '药品：布洛芬片（成人）', currentDose: '当前剂量：单次 400mg，每日 3 次（1200mg/日）', dailyMax: '日极量：2400mg/日（OTC 上限），处方上限 3200mg/日', fit: '适配性：剂量低于日极量，安全', warning: '警示：胃溃疡病史者慎用，饭后服用' },
    { id: 'MRD-003', drug: '药品：地高辛片（心衰）', currentDose: '当前剂量：0.25mg/日', dailyMax: '日极量：维持量 0.125-0.25mg/日，需按血药浓度调整', fit: '适配性：接近上限，需结合肾功能与血药浓度', warning: '警示：治疗窗窄，监测地高辛血药浓度（0.5-0.9ng/ml）' },
    { id: 'MRD-004', drug: '药品：头孢曲松钠（成人抗感染）', currentDose: '当前剂量：2g 静滴，每日 1 次', dailyMax: '日极量：4g/日（严重感染上限）', fit: '适配性：剂量在安全范围', warning: '警示：勿与含钙输液同管路，新生儿禁用' },
    { id: 'MRD-005', drug: '药品：二甲双胍缓释片（糖尿病）', currentDose: '当前剂量：0.5g，每日 2 次（1000mg/日）', dailyMax: '日极量：2000mg/日（缓释片上限）', fit: '适配性：剂量低于上限，可逐步滴定', warning: '警示：eGFR<30 禁用，随餐服用减少胃肠反应' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/medication-review/reviews - 处方审核记录（处方号/审核人/结果/时间/意见）5 条 */
async function handleMrReviews(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRR-001', rxNo: '处方号：RX-2026-0998（心内科）', reviewer: '审核人：李***（主任药师，工号 P-015）', result: '结果：审核通过', time: '审核时间：2026-10-20 08:55:10', opinion: '意见：用药合理，剂量适宜，无相互作用与过敏冲突，同意发药' },
    { id: 'MRR-002', rxNo: '处方号：RX-2026-0999（内分泌科）', reviewer: '审核人：王***（主管药师，工号 P-022）', result: '结果：退回修改', time: '审核时间：2026-10-20 09:05:33', opinion: '意见：格列美脲起始剂量偏大，建议从 1mg 起始并监测空腹血糖，退回医生调整' },
    { id: 'MRR-003', rxNo: '处方号：RX-2026-1000（急诊）', reviewer: '审核人：李***（主任药师，工号 P-015）', result: '结果：通过（附提示）', time: '审核时间：2026-10-20 09:20:48', opinion: '意见：头孢曲松无过敏，剂量合理；布洛芬与口服补液间隔 2 小时，已备注' },
    { id: 'MRR-004', rxNo: '处方号：RX-2026-0996（骨科）', reviewer: '审核人：赵***（药师，工号 P-031）', result: '结果：拦截（禁忌）', time: '审核时间：2026-10-19 16:40:12', opinion: '意见：患者青霉素过敏史，处方开具青霉素类，触发红牌禁忌拦截，退回更换抗生素' },
    { id: 'MRR-005', rxNo: '处方号：RX-2026-0997（儿科）', reviewer: '审核人：王***（主管药师，工号 P-022）', result: '结果：审核通过', time: '审核时间：2026-10-19 17:10:25', opinion: '意见：按体重计算剂量合理，对乙酰氨基酚退热间隔≥4 小时，已向家长交代' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/medication-review/audit-log - 用药审计日志（操作/药品/操作人/时间/IP）5 条 */
async function handleMrAuditLog(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRAU-001', action: '操作：处方审核通过', drug: '药品：阿司匹林+阿托伐他汀+美托洛尔（RX-2026-0998）', operator: '操作人：李***（主任药师 P-015）', time: '时间：2026-10-20 08:55:10', ip: 'IP：10.20.3.41（药学部终端）' },
    { id: 'MRAU-002', action: '操作：处方退回修改', drug: '药品：格列美脲（RX-2026-0999）', operator: '操作人：王***（主管药师 P-022）', time: '时间：2026-10-20 09:05:33', ip: 'IP：10.20.3.45（药学部终端）' },
    { id: 'MRAU-003', action: '操作：禁忌拦截', drug: '药品：青霉素类（RX-2026-0996）', operator: '操作人：系统自动（过敏规则引擎）', time: '时间：2026-10-19 16:40:12', ip: 'IP：127.0.0.1（服务端规则引擎）' },
    { id: 'MRAU-004', action: '操作：药师修改剂量建议', drug: '药品：地高辛片（RX-2026-0995）', operator: '操作人：赵***（药师 P-031）', time: '时间：2026-10-19 15:22:07', ip: 'IP：10.20.3.52（药学部终端）' },
    { id: 'MRAU-005', action: '操作：患者过敏史录入', drug: '药品：青霉素 G（档案 PA-10086）', operator: '操作人：孙***（门诊护士 N-018）', time: '时间：2026-10-19 11:08:50', ip: 'IP：10.20.5.18（门诊分诊终端）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m431MedReviewRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/medication-review/prescriptions', handle: handleMrPrescriptions, auth: true },
  { method: 'GET', path: '/api/v1/medication-review/interactions', handle: handleMrInteractions, auth: true },
  { method: 'GET', path: '/api/v1/medication-review/allergies', handle: handleMrAllergies, auth: true },
  { method: 'GET', path: '/api/v1/medication-review/dose-checks', handle: handleMrDoseChecks, auth: true },
  { method: 'GET', path: '/api/v1/medication-review/reviews', handle: handleMrReviews, auth: true },
  { method: 'GET', path: '/api/v1/medication-review/audit-log', handle: handleMrAuditLog, auth: true },
];
