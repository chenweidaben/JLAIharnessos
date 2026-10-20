/**
 * 健澜科技 jlmedaios - M406 P1 业务扩展：CDS临床决策支持深度打磨（详情版）
 *
 * CDS规则详情/CDS预警详情/CDS推荐详情/药物相互作用详情/禁忌症提示详情/临床指南详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/cds/rules-detail - CDS规则详情 5 条 */
async function handleCdsRulesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CRD-001', ruleName: 'Rule-001：高血压患者阿司匹林适应症审查', triggerCondition: '触发条件：处方阿司匹林 + 患者诊断为高血压 + 年龄 ≥ 55 岁 + 无出血性疾病史', action: '动作：1. 弹窗提示："患者为高血压患者，年龄 ≥ 55 岁，阿司匹林可降低心血管事件风险，请确认是否有适应症"；2. 要求医生确认：如确认有适应症（冠心病、脑梗死等），点击"确认"继续处方；如无适应症，点击"取消"停止处方', priority: '优先级：高（P1）', status: '状态：启用中' },
    { id: 'CRD-002', ruleName: 'Rule-002：糖尿病患者二甲双胍肾功能审查', triggerCondition: '触发条件：处方二甲双胍 + 患者诊断为 2 型糖尿病 + eGFR < 45 ml/min', action: '动作：1. 弹窗警告："患者 eGFR < 45 ml/min，二甲双胍有乳酸酸中毒风险，请调整剂量或停用"；2. 提供建议："建议减量至 500mg 每日 2 次，或改用胰岛素治疗"', priority: '优先级：高（P1）', status: '状态：启用中' },
    { id: 'CRD-003', ruleName: 'Rule-003：老年患者苯二氮䓬类药物跌倒风险审查', triggerCondition: '触发条件：处方苯二氮䓬类药物（如地西泮、阿普唑仑）+ 患者年龄 ≥ 75 岁 + 有跌倒史', action: '动作：1. 弹窗警告："患者为老年患者（≥ 75 岁），有跌倒史，苯二氮䓬类药物可增加跌倒风险，请谨慎使用"；2. 提供替代建议："建议改用非苯二氮䓬类催眠药（如唑吡坦）或非药物治疗（睡眠卫生教育）"', priority: '优先级：中（P2）', status: '状态：启用中' },
    { id: 'CRD-004', ruleName: 'Rule-004：抗菌药物使用合理性审查', triggerCondition: '触发条件：处方抗菌药物（如头孢类、青霉素类）+ 无细菌感染证据（血常规、CRP 正常）', action: '动作：1. 弹窗提示："患者无细菌感染证据（血常规、CRP 正常），抗菌药物使用无指征，请确认是否有感染"；2. 要求医生确认：如确有感染（如影像学、临床表现），点击"确认"继续处方；如无感染，点击"取消"停止处方', priority: '优先级：中（P2）', status: '状态：启用中' },
    { id: 'CRD-005', ruleName: 'Rule-005：化疗药物剂量审查', triggerCondition: '触发条件：处方化疗药物（如培美曲塞、顺铂）+ 患者体表面积计算错误', action: '动作：1. 弹窗警告："患者体表面积计算错误，化疗药物剂量可能不准确，请重新计算"；2. 提供计算公式："体表面积（m²）= 0.0061 × 身高（cm）+ 0.0128 × 体重（kg）- 0.1529"', priority: '优先级：高（P1）', status: '状态：启用中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/alerts-detail - CDS预警详情 5 条 */
async function handleCdsAlertsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CAD-001', alertNo: 'ALERT-2026-001（患者张***，CDS 预警）', patient: '患者张***（55 岁男性，冠心病 + 高血压）', alertType: '预警类型：药物相互作用预警（阿司匹林 + 布洛芬）', content: '预警内容：患者正在服用阿司匹林（抗血小板），现处方布洛芬（非甾体抗炎药）；布洛芬可抑制阿司匹林的抗血小板作用，增加心血管事件风险；建议：避免合用，如必须合用，先服阿司匹林，间隔 2 小时后再服布洛芬', processingResult: '处理结果：医生王***（主任医师）已查看预警，确认患者因关节痛需短期服用布洛芬（3 天），调整为：先服阿司匹林，间隔 2 小时后再服布洛芬；已记录处理意见' },
    { id: 'CAD-002', alertNo: 'ALERT-2026-002（患者李***，CDS 预警）', patient: '患者李***（45 岁女性，胆囊结石术后）', alertType: '预警类型：抗菌药物无指征预警', content: '预警内容：患者术后血常规、CRP 正常，无细菌感染证据，处方头孢呋辛酯无指征；建议：停用抗菌药物，或等待细菌培养结果后再决定', processingResult: '处理结果：医生刘***（副主任医师）已查看预警，确认术后预防感染需使用抗菌药物（腹腔镜胆囊切除术），继续使用头孢呋辛酯 5 天；已记录处理意见' },
    { id: 'CAD-003', alertNo: 'ALERT-2026-003（患者王***，CDS 预警）', patient: '患者王***（60 岁男性，胃溃疡 + 幽门螺杆菌阳性）', alertType: '预警类型：禁忌症预警（奥美拉唑 + 氯吡格雷）', content: '预警内容：患者正在服用氯吡格雷（抗血小板），现处方奥美拉唑（质子泵抑制剂）；奥美拉唑可抑制氯吡格雷的活化，增加血栓风险；建议：改用泮托拉唑或雷贝拉唑（对氯吡格雷影响较小）', processingResult: '处理结果：医生陈***（主任医师）已查看预警，调整为：改用泮托拉唑 40mg 每日 1 次；已记录处理意见' },
    { id: 'CAD-004', alertNo: 'ALERT-2026-004（患者刘***，CDS 预警）', patient: '患者刘***（30 岁女性，剖宫产术后）', alertType: '预警类型：剂量预警（缩宫素剂量过大）', content: '预警内容：患者术后处方缩宫素 40U（静脉滴注），超过推荐剂量（20U）；大剂量缩宫素可导致低血压、心律失常；建议：减量至 20U', processingResult: '处理结果：医生赵***（副主任医师）已查看预警，确认患者子宫收缩乏力，需较大剂量缩宫素（30U），已调整为 30U；已记录处理意见' },
    { id: 'CAD-005', alertNo: 'ALERT-2026-005（患者陈***，CDS 预警）', patient: '患者陈***（50 岁男性，右胫骨骨折术后）', alertType: '预警类型：药物过敏预警（头孢类）', content: '预警内容：患者有青霉素过敏史，现处方头孢呋辛酯；头孢类与青霉素类有交叉过敏反应（约 10%）；建议：避免使用头孢类，改用克林霉素或左氧氟沙星', processingResult: '处理结果：医生孙***（副主任医师）已查看预警，确认患者青霉素过敏为轻度（皮疹），头孢类皮试阴性，继续使用头孢呋辛酯；已记录处理意见' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/recommendations-detail - CDS推荐详情 5 条 */
async function handleCdsRecommendationsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CRecD-001', recommendationName: 'Rec-001：冠心病患者他汀类药物治疗推荐', scenario: '场景：患者诊断为冠心病（不稳定型心绞痛），年龄 ≥ 55 岁', content: '推荐内容：1. 建议使用他汀类药物（如阿托伐他汀 20-40mg 每晚 1 次）；2. 目标 LDL-C < 1.8 mmol/L；3. 定期监测肝功能（每 3 个月 1 次）', evidenceLevel: '证据级别：I 级证据（AHA/ACC 2026 年冠心病指南推荐）', doctorFeedback: '医生反馈：王***（主任医师）采纳推荐，已处方阿托伐他汀 20mg 每晚 1 次；患者已服用 2 周，无不良反应' },
    { id: 'CRecD-002', recommendationName: 'Rec-002：2 型糖尿病患者二甲双胍治疗推荐', scenario: '场景：患者诊断为 2 型糖尿病，BMI ≥ 25 kg/m²，无肾功能不全（eGFR ≥ 60 ml/min）', content: '推荐内容：1. 建议使用二甲双胍（0.5g 每日 3 次，餐前服用）；2. 目标空腹血糖 4.4-7.0 mmol/L，餐后 2 小时血糖 < 10.0 mmol/L；3. 定期监测肝肾功能（每 6 个月 1 次）', evidenceLevel: '证据级别：I 级证据（ADA 2026 年糖尿病指南推荐）', doctorFeedback: '医生反馈：李***（副主任医师）采纳推荐，已处方二甲双胍 0.5g 每日 3 次；患者已服用 1 个月，空腹血糖从 8.5 mmol/L 降至 6.0 mmol/L' },
    { id: 'CRecD-003', recommendationName: 'Rec-003：老年高血压患者降压目标推荐', scenario: '场景：患者为老年高血压患者（≥ 65 岁），无糖尿病、冠心病', content: '推荐内容：1. 建议降压目标 < 140/90 mmHg；2. 如能耐受，可进一步降至 < 130/80 mmHg；3. 避免降压过快（收缩压每 2 周下降不超过 10 mmHg）', evidenceLevel: '证据级别：IIa 级证据（ESC/ESH 2026 年高血压指南推荐）', doctorFeedback: '医生反馈：王***（主任医师）采纳推荐，患者目前血压 145/90 mmHg，建议继续服用氨氯地平 5mg 每日 1 次，2 周后复查血压' },
    { id: 'CRecD-004', recommendationName: 'Rec-004：急性心肌梗死患者急诊 PCI 推荐', scenario: '场景：患者诊断为急性 ST 段抬高型心肌梗死（STEMI），发病时间 < 12 小时', content: '推荐内容：1. 建议立即行急诊冠状动脉介入治疗（PCI）；2. 目标：门球时间（door-to-balloon time）< 90 分钟；3. 如不能在 90 分钟内行 PCI，建议静脉溶栓治疗（发病 < 3 小时）', evidenceLevel: '证据级别：I 级证据（AHA/ACC 2026 年 STEMI 指南推荐）', doctorFeedback: '医生反馈：李***（主任医师）采纳推荐，患者已行急诊 PCI（门球时间 60 分钟），支架植入成功，术后恢复良好' },
    { id: 'CRecD-005', recommendationName: 'Rec-005：胃溃疡患者幽门螺杆菌根除推荐', scenario: '场景：患者诊断为胃溃疡，幽门螺杆菌阳性', content: '推荐内容：1. 建议幽门螺杆菌根除治疗（四联疗法：PPI + 两种抗生素 + 铋剂，疗程 14 天）；2. 推荐方案：奥美拉唑 20mg 每日 2 次 + 阿莫西林 1g 每日 2 次 + 克拉霉素 500mg 每日 2 次 + 枸橼酸铋钾 220mg 每日 2 次；3. 根除治疗结束后 4 周，复查幽门螺杆菌（C13 呼气试验）', evidenceLevel: '证据级别：I 级证据（Maastricht VI 2026 年幽门螺杆菌共识推荐）', doctorFeedback: '医生反馈：陈***（主任医师）采纳推荐，患者已开始四联疗法（14 天），无明显不良反应' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/drug-interactions-detail - 药物相互作用详情 5 条 */
async function handleCdsDrugInteractionsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CDID-001', drugA: '药物 A：阿司匹林（抗血小板）', drugB: '药物 B：布洛芬（非甾体抗炎药）', interactionMechanism: '相互作用机制：布洛芬可不可逆抑制血小板 COX-1 酶，阻断阿司匹林的抗血小板作用；同时布洛芬可增加胃肠道出血风险', severity: '严重程度：中度（增加心血管事件风险 + 胃肠道出血风险）', handlingAdvice: '处理建议：1. 避免合用；2. 如必须合用，先服阿司匹林，间隔 2 小时后再服布洛芬；3. 建议改用对乙酰氨基酚（对阿司匹林抗血小板作用影响较小）' },
    { id: 'CDID-002', drugA: '药物 A：氯吡格雷（抗血小板）', drugB: '药物 B：奥美拉唑（质子泵抑制剂）', interactionMechanism: '相互作用机制：奥美拉唑可抑制 CYP2C19 酶，阻断氯吡格雷的活化（氯吡格雷需经 CYP2C19 代谢为活性形式），降低氯吡格雷的抗血小板作用', severity: '严重程度：中度（增加血栓风险）', handlingAdvice: '处理建议：1. 避免合用；2. 改用泮托拉唑或雷贝拉唑（对 CYP2C19 影响较小）；3. 如必须使用奥美拉唑，建议增加氯吡格雷剂量（75mg 每日 2 次）' },
    { id: 'CDID-003', drugA: '药物 A：辛伐他汀（他汀类）', drugB: '药物 B：克拉霉素（大环内酯类抗生素）', interactionMechanism: '相互作用机制：克拉霉素可抑制 CYP3A4 酶，减慢辛伐他汀的代谢，增加辛伐他汀的血药浓度，增加横纹肌溶解风险', severity: '严重程度：高度（横纹肌溶解风险）', handlingAdvice: '处理建议：1. 避免合用；2. 改用阿托伐他汀（对 CYP3A4 依赖性较低）或瑞舒伐他汀（不经 CYP3A4 代谢）；3. 如必须合用，辛伐他汀剂量不超过 20mg/天' },
    { id: 'CDID-004', drugA: '药物 A：华法林（抗凝）', drugB: '药物 B：胺碘酮（抗心律失常）', interactionMechanism: '相互作用机制：胺碘酮可抑制 CYP2C9 酶，减慢华法林的代谢，增加华法林的血药浓度，增加出血风险', severity: '严重程度：高度（出血风险）', handlingAdvice: '处理建议：1. 避免合用；2. 如必须合用，华法林剂量减量 30-50%；3. 密切监测 INR（每 2-3 天 1 次），目标 INR 2.0-3.0' },
    { id: 'CDID-005', drugA: '药物 A：二甲双胍（降糖）', drugB: '药物 B：造影剂（如碘海醇）', interactionMechanism: '相互作用机制：造影剂可导致急性肾损伤，增加二甲双胍的乳酸酸中毒风险', severity: '严重程度：中度（乳酸酸中毒风险）', handlingAdvice: '处理建议：1. 造影前 48 小时停用二甲双胍；2. 造影后 48 小时复查肾功能，如肾功能正常，恢复二甲双胍；3. 造影期间改用胰岛素治疗' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/contraindications-detail - 禁忌症提示详情 5 条 */
async function handleCdsContraindicationsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CCD-001', drug: '药品：阿司匹林（抗血小板）', contraindicatedPopulation: '禁忌人群：1. 活动性出血患者（如消化道出血、脑出血）；2. 血友病患者；3. 阿司匹林过敏患者', contraindicationReason: '禁忌原因：阿司匹林可抑制血小板聚集，增加出血风险；活动性出血患者使用阿司匹林可加重出血', evidence: '证据：FDA 说明书 + AHA/ACC 指南', advice: '建议：活动性出血患者禁用阿司匹林；如需抗血小板治疗，待出血停止后再评估' },
    { id: 'CCD-002', drug: '药品：二甲双胍（降糖）', contraindicatedPopulation: '禁忌人群：1. eGFR < 30 ml/min 患者；2. 急性代谢性酸中毒患者；3. 严重肝功能不全患者', contraindicationReason: '禁忌原因：二甲双胍主要经肾脏排泄，eGFR < 30 ml/min 患者二甲双胍排泄减慢，乳酸酸中毒风险增加', evidence: '证据：FDA 说明书 + ADA 指南', advice: '建议：eGFR < 30 ml/min 患者禁用二甲双胍；改用胰岛素治疗' },
    { id: 'CCD-003', drug: '药品：他汀类药物（如阿托伐他汀）', contraindicatedPopulation: '禁忌人群：1. 活动性肝病患者；2. 孕妇及哺乳期妇女；3. 他汀类药物过敏患者', contraindicationReason: '禁忌原因：他汀类药物可导致肝酶升高，活动性肝病患者使用他汀类可加重肝损伤；他汀类药物可通过胎盘，孕妇使用可导致胎儿畸形', evidence: '证据：FDA 说明书 + AHA/ACC 指南', advice: '建议：活动性肝病患者禁用他汀类；孕妇及哺乳期妇女禁用他汀类；改用其他降脂药物（如依折麦布）' },
    { id: 'CCD-004', drug: '药品：华法林（抗凝）', contraindicatedPopulation: '禁忌人群：1. 活动性出血患者；2. 严重高血压未控制患者（> 180/110 mmHg）；3. 孕妇（妊娠早期）', contraindicationReason: '禁忌原因：华法林可抑制凝血因子合成，增加出血风险；活动性出血患者使用华法林可加重出血；华法林可通过胎盘，妊娠早期使用可导致胎儿畸形', evidence: '证据：FDA 说明书 + ACCP 指南', advice: '建议：活动性出血患者禁用华法林；严重高血压未控制患者禁用华法林；妊娠早期禁用华法林，改用低分子肝素' },
    { id: 'CCD-005', drug: '药品：非甾体抗炎药（如布洛芬）', contraindicatedPopulation: '禁忌人群：1. 活动性消化道溃疡患者；2. 严重心力衰竭患者（NYHA III-IV 级）；3. 妊娠晚期（妊娠 30 周以后）', contraindicationReason: '禁忌原因：非甾体抗炎药可抑制胃肠道前列腺素合成，损伤胃黏膜，活动性消化道溃疡患者使用非甾体抗炎药可加重溃疡、出血；非甾体抗炎药可导致水钠潴留，加重心力衰竭；妊娠晚期使用非甾体抗炎药可导致胎儿动脉导管早闭', evidence: '证据：FDA 说明书 + ACR 指南', advice: '建议：活动性消化道溃疡患者禁用非甾体抗炎药；严重心力衰竭患者禁用非甾体抗炎药；妊娠晚期禁用非甾体抗炎药' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/guidelines-detail - 临床指南详情 5 条 */
async function handleCdsGuidelinesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CGD-001', guidelineName: 'AHA/ACC 2026 年冠心病指南', publisher: '发布机构：美国心脏协会（AHA）+ 美国心脏病学会（ACC）', version: '版本：2026 年版（2026 年 3 月发布）', applicableDisease: '适用疾病：冠心病（稳定型心绞痛、不稳定型心绞痛、急性心肌梗死）', coreRecommendations: '核心推荐：1. 所有冠心病患者应使用他汀类药物（目标 LDL-C < 1.8 mmol/L）；2. 所有冠心病患者应使用阿司匹林（75-100mg 每日 1 次）；3. 急性 ST 段抬高型心肌梗死（STEMI）患者应立即行急诊 PCI（门球时间 < 90 分钟）；4. 稳定型心绞痛患者应给予最优药物治疗（OMT），如药物治疗无效，可行 PCI' },
    { id: 'CGD-002', guidelineName: 'ADA 2026 年糖尿病指南', publisher: '发布机构：美国糖尿病协会（ADA）', version: '版本：2026 年版（2026 年 1 月发布）', applicableDisease: '适用疾病：1 型糖尿病、2 型糖尿病、妊娠糖尿病', coreRecommendations: '核心推荐：1. 2 型糖尿病患者首选二甲双胍（如无禁忌症）；2. 目标糖化血红蛋白（HbA1c）< 7.0%（大多数患者）；3. 合并心血管疾病的 2 型糖尿病患者应使用 SGLT-2 抑制剂或 GLP-1 受体激动剂（具有心血管获益）；4. 糖尿病患者应定期筛查糖尿病并发症（视网膜病变、肾病、神经病变）' },
    { id: 'CGD-003', guidelineName: 'ESC/ESH 2026 年高血压指南', publisher: '发布机构：欧洲心脏病学会（ESC）+ 欧洲高血压学会（ESH）', version: '版本：2026 年版（2026 年 6 月发布）', applicableDisease: '适用疾病：原发性高血压、继发性高血压', coreRecommendations: '核心推荐：1. 一般高血压患者降压目标 < 140/90 mmHg，如能耐受，可进一步降至 < 130/80 mmHg；2. 老年高血压患者（≥ 65 岁）降压目标 < 140/90 mmHg，避免收缩压 < 120 mmHg；3. 首选降压药物：ACEI/ARB、CCB、利尿剂（根据患者情况选择）；4. 单药治疗不达标的患者，推荐联合治疗（如 ACEI + CCB）' },
    { id: 'CGD-004', guidelineName: 'Maastricht VI 2026 年幽门螺杆菌共识', publisher: '发布机构：世界胃肠病学组织（WGO）幽门螺杆菌研究组', version: '版本：2026 年版（2026 年 4 月发布）', applicableDisease: '适用疾病：幽门螺杆菌感染（慢性胃炎、消化性溃疡、胃癌前病变）', coreRecommendations: '核心推荐：1. 所有幽门螺杆菌阳性的消化性溃疡患者应行根除治疗；2. 首选根除方案：四联疗法（PPI + 两种抗生素 + 铋剂，疗程 14 天）；3. 推荐一线方案：PPI + 阿莫西林 + 克拉霉素 + 铋剂（如克拉霉素耐药率 < 15%）；4. 根除治疗结束后 4 周，复查幽门螺杆菌（C13 呼气试验）' },
    { id: 'CGD-005', guidelineName: 'NCCN 2026 年乳腺癌指南', publisher: '发布机构：美国国家综合癌症网络（NCCN）', version: '版本：2026 年版（2026 年 2 月发布）', applicableDisease: '适用疾病：乳腺癌（早期、局部晚期、转移性）', coreRecommendations: '核心推荐：1. 早期乳腺癌（I-II 期）首选手术治疗（保乳手术 + 前哨淋巴结活检，或乳腺癌根治术）；2. 术后辅助治疗：根据分子分型（Luminal A/B、HER2 阳性、三阴性）选择辅助化疗、内分泌治疗、抗 HER2 治疗；3. 转移性乳腺癌首选全身治疗（化疗、内分泌治疗、抗 HER2 治疗）；4. 所有乳腺癌患者应定期复查（每 3-6 个月 1 次）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m406Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cds/rules-detail', handle: handleCdsRulesDetail, auth: true },
  { method: 'GET', path: '/api/v1/cds/alerts-detail', handle: handleCdsAlertsDetail, auth: true },
  { method: 'GET', path: '/api/v1/cds/recommendations-detail', handle: handleCdsRecommendationsDetail, auth: true },
  { method: 'GET', path: '/api/v1/cds/drug-interactions-detail', handle: handleCdsDrugInteractionsDetail, auth: true },
  { method: 'GET', path: '/api/v1/cds/contraindications-detail', handle: handleCdsContraindicationsDetail, auth: true },
  { method: 'GET', path: '/api/v1/cds/guidelines-detail', handle: handleCdsGuidelinesDetail, auth: true },
];
