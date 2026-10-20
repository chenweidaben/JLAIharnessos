/**
 * 健澜科技 jlmedaios - M384 P1 业务扩展：CDS临床决策支持深度打磨
 *
 * CDS推荐/药物相互作用/禁忌症提示（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/cds/recommendations - CDS推荐 5 条 */
async function handleCdsRecommendations(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CR-001', recommendationName: '高血压患者降压目标推荐', scenario: '成人高血压患者（1-3 级）', content: '对于一般高血压患者，建议将血压控制在 140/90 mmHg 以下；对于合并糖尿病或慢性肾病的患者，建议将血压控制在 130/80 mmHg 以下', evidence: '《中国高血压防治指南（2024 年修订版）》', level: 'Ⅰ级推荐（A级证据）' },
    { id: 'CR-002', recommendationName: '2 型糖尿病患者降糖目标推荐', scenario: '成人 2 型糖尿病患者', content: '对于大多数 2 型糖尿病患者，建议将糖化血红蛋白（HbA1c）控制在 7.0% 以下；对于老年患者或合并严重并发症的患者，可适当放宽至 7.5%-8.0%', evidence: '《中国 2 型糖尿病防治指南（2024 年版）》', level: 'Ⅰ级推荐（A级证据）' },
    { id: 'CR-003', recommendationName: '冠心病患者抗血小板治疗推荐', scenario: '冠心病（稳定性心绞痛）患者', content: '对于冠心病患者，建议长期服用阿司匹林 100mg/日（除非有禁忌症）；对于急性冠脉综合征患者，建议双联抗血小板治疗（阿司匹林 + 氯吡格雷或替格瑞洛）12 个月', evidence: '《中国冠心病防治指南（2024 年修订版）》', level: 'Ⅰ级推荐（A级证据）' },
    { id: 'CR-004', recommendationName: '社区获得性肺炎患者经验性抗感染治疗推荐', scenario: '成人社区获得性肺炎患者（门诊治疗）', content: '对于无基础疾病的成人社区获得性肺炎患者，建议首选大环内酯类抗生素（如阿奇霉素）或青霉素类抗生素（如阿莫西林）；对于有基础疾病的患者，建议首选呼吸喹诺酮类抗生素（如左氧氟沙星）', evidence: '《中国成人社区获得性肺炎诊断和治疗指南（2024 年版）》', level: 'Ⅰ级推荐（B级证据）' },
    { id: 'CR-005', recommendationName: '骨质疏松症患者抗骨质疏松治疗推荐', scenario: '绝经后女性骨质疏松症患者', content: '对于绝经后女性骨质疏松症患者，建议首选双膦酸盐类药物（如阿仑膦酸钠）治疗；对于不能耐受双膦酸盐类药物的患者，可选择地舒单抗或特立帕肽治疗', evidence: '《中国原发性骨质疏松症诊疗指南（2024 年修订版）》', level: 'Ⅰ级推荐（A级证据）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/drug-interactions - 药物相互作用 5 条 */
async function handleCdsDrugInteractions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CDI-001', drugA: '阿司匹林', drugB: '华法林', interaction: '阿司匹林与华法林合用显著增加出血风险（消化道出血、颅内出血等）', severity: '严重（出血风险增加 2-3 倍）', recommendation: '避免合用；如需抗血小板治疗，建议选择氯吡格雷替代阿司匹林' },
    { id: 'CDI-002', drugA: '辛伐他汀', drugB: '酮康唑', interaction: '酮康唑抑制 CYP3A4 酶，显著增加辛伐他汀血药浓度，增加肌病和横纹肌溶解风险', severity: '严重（肌病风险增加 5-10 倍）', recommendation: '避免合用；如需抗真菌治疗，建议选择氟康唑或伊曲康唑' },
    { id: 'CDI-003', drugA: '二甲双胍', drugB: '造影剂（碘对比剂）', interaction: '造影剂可能加重二甲双胍相关乳酸酸中毒风险（尤其是肾功能不全患者）', severity: '中等（乳酸酸中毒风险增加）', recommendation: '在使用造影剂前 48 小时停用二甲双胍，检查肾功能正常后再恢复用药' },
    { id: 'CDI-004', drugA: '奥美拉唑', drugB: '氯吡格雷', interaction: '奥美拉唑抑制 CYP2C19 酶，降低氯吡格雷抗血小板作用（可能增加心血管事件风险）', severity: '中等（氯吡格雷抗血小板作用降低 20%-30%）', recommendation: '避免合用；如需抑酸治疗，建议选择泮托拉唑或雷贝拉唑' },
    { id: 'CDI-005', drugA: '地高辛', drugB: '呋塞米', interaction: '呋塞米导致低钾血症，增加地高辛毒性（心律失常风险）', severity: '中等（地高辛毒性风险增加）', recommendation: '合用时应监测血钾浓度，必要时补钾治疗' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/contraindications - 禁忌症提示 5 条 */
async function handleCdsContraindications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CC-001', drugName: '阿司匹林', contraindicationType: '消化道禁忌症', description: '活动性消化道溃疡或消化道出血患者禁用阿司匹林（可能加重出血风险）', population: '活动性消化道溃疡或消化道出血患者', recommendation: '禁用阿司匹林；如需抗血小板治疗，建议选择氯吡格雷' },
    { id: 'CC-002', drugName: '二甲双胍', contraindicationType: '肾功能禁忌症', description: '严重肾功能不全（eGFR <30 mL/min/1.73m²）患者禁用二甲双胍（可能增加乳酸酸中毒风险）', population: '严重肾功能不全患者（eGFR <30 mL/min/1.73m²）', recommendation: '禁用二甲双胍；如需降糖治疗，建议选择胰岛素或 DPP-4 抑制剂' },
    { id: 'CC-003', drugName: '辛伐他汀', contraindicationType: '肝功能禁忌症', description: '活动性肝病或转氨酶持续升高（超过正常上限 3 倍）患者禁用辛伐他汀（可能加重肝损伤）', population: '活动性肝病或转氨酶持续升高患者', recommendation: '禁用辛伐他汀；如需调脂治疗，建议选择普伐他汀（对肝功能影响较小）' },
    { id: 'CC-004', drugName: '华法林', contraindicationType: '出血禁忌症', description: '活动性出血或出血倾向患者禁用华法林（可能加重出血风险）', population: '活动性出血或出血倾向患者', recommendation: '禁用华法林；如需抗凝治疗，建议选择低分子肝素（出血风险较低）' },
    { id: 'CC-005', drugName: '布洛芬', contraindicationType: '妊娠禁忌症', description: '妊娠晚期（妊娠 28 周以后）孕妇禁用布洛芬（可能影响胎儿心血管系统发育）', population: '妊娠晚期孕妇（妊娠 28 周以后）', recommendation: '禁用布洛芬；如需止痛治疗，建议选择对乙酰氨基酚（妊娠期间相对安全）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m384Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cds/recommendations', handle: handleCdsRecommendations, auth: true },
  { method: 'GET', path: '/api/v1/cds/drug-interactions', handle: handleCdsDrugInteractions, auth: true },
  { method: 'GET', path: '/api/v1/cds/contraindications', handle: handleCdsContraindications, auth: true },
];
