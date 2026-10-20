/**
 * 健澜科技 jlmedaios - M453 药事管理深化（pharmacy）
 *
 * 处方点评 / 合理用药监测 / 抗菌药物分级 / 药品不良反应 / 药事质控
 * （consultations 用药咨询已存在，此处不重复）。
 * 聚焦药事质控，不重复抗菌监测、CDS 相互作用、采购供应链、院内调剂口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/pharmacy/prescription-review - 处方点评（处方号/点评结果/问题类型/点评人/时间）5 条 */
async function handleRxReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PRV-001', rxNo: '处方号：RX-20261020-8821（门诊内分泌）', result: '点评结果：合理（剂量/疗程/配伍均规范）', issueType: '问题类型：无（点评通过，归档）', reviewer: '点评人：临床药师 黄***（P-014）', time: '时间：2026-10-20 10:20:15' },
    { id: 'PRV-002', rxNo: '处方号：RX-20261019-7740（急诊外科）', result: '点评结果：不合理（抗菌药物无指征联用）', issueType: '问题类型：无指征联合用药（两种抗菌叠加）', reviewer: '点评人：临床药师 郑***（P-022）', time: '时间：2026-10-19 16:40:33' },
    { id: 'PRV-003', rxNo: '处方号：RX-20261019-6618（门诊儿科）', result: '点评结果：不合理（剂量超说明书按体重折算）', issueType: '问题类型：剂量不适宜（儿童剂量偏高）', reviewer: '点评人：临床药师 林***（P-009）', time: '时间：2026-10-19 11:05:48' },
    { id: 'PRV-004', rxNo: '处方号：RX-20261018-5532（心内科住院）', result: '点评结果：合理（二级预防方案规范）', issueType: '问题类型：无（点评通过）', reviewer: '点评人：临床药师 黄***（P-014）', time: '时间：2026-10-18 15:30:22' },
    { id: 'PRV-005', rxNo: '处方号：RX-20261018-4409（呼吸科门诊）', result: '点评结果：不合理（重复用药，同类吸入剂叠加）', issueType: '问题类型：重复给药（同机制药物重复开具）', reviewer: '点评人：临床药师 郑***（P-022）', time: '时间：2026-10-18 09:12:50' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/rational-monitor - 合理用药监测（药品/科室/合理率/异常/月份）5 条 */
async function handleRationalMonitor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RRM-001', drug: '药品：头孢类注射剂（三代头孢）', dept: '科室：普外科', rate: '合理率：96.2%（本月抽查 260 张处方）', anomaly: '异常：2 例无指征预防使用，已反馈整改', month: '月份：2026-10' },
    { id: 'RRM-002', drug: '药品：质子泵抑制剂（PPI 静脉制剂）', dept: '科室：消化内科', rate: '合理率：88.5%（超疗程使用偏多）', anomaly: '异常：11 例无指征/超疗程，需重点点评', month: '月份：2026-10' },
    { id: 'RRM-003', drug: '药品：他汀类调脂药', dept: '科室：心内科', rate: '合理率：98.1%（剂量与监测规范）', anomaly: '异常：无明显异常', month: '月份：2026-10' },
    { id: 'RRM-004', drug: '药品：喹诺酮类口服（左氧氟沙星）', dept: '科室：呼吸科', rate: '合理率：91.0%（注意肌腱/QT 风险）', anomaly: '异常：3 例老年患者未评估 QT 与肌腱风险', month: '月份：2026-10' },
    { id: 'RRM-005', drug: '药品：糖皮质激素（口服泼尼松）', dept: '科室：皮肤科', rate: '合理率：94.4%（疗程与减量规范）', anomaly: '异常：1 例长期使用未监测血糖血压', month: '月份：2026-10' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/abx-grading - 抗菌药物分级（药品/分级/权限/使用限制/备注）5 条 */
async function handleAbxGrading(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ABG-001', drug: '药品：阿莫西林/克拉维酸钾（口服广谱青霉素）', grade: '分级：非限制使用级', authority: '权限：经培训的执业医师均可开具', limit: '使用限制：无特殊审批，常规处方', note: '备注：门诊一线经验用药，疗程规范' },
    { id: 'ABG-002', drug: '药品：头孢呋辛（二代头孢，注射）', grade: '分级：限制使用级', authority: '权限：主治医师及以上职称开具', limit: '使用限制：需评估指征，门诊限特定感染', note: '备注：需病历记录感染依据与药敏' },
    { id: 'ABG-003', drug: '药品：美罗培南（碳青霉烯类，注射）', grade: '分级：特殊使用级', authority: '权限：副主任医师及以上 + 抗菌专家组会诊', limit: '使用限制：须会诊审批，急诊可越级使用 24h 内补办', note: '备注：限重症/耐药菌感染，严格控制使用' },
    { id: 'ABG-004', drug: '药品：莫西沙星（喹诺酮，口服/注射）', grade: '分级：限制使用级', authority: '权限：主治医师及以上开具', limit: '使用限制：注意 QT 间期与肌腱风险，老年慎用', note: '备注：避免无指征呼吸道经验滥用' },
    { id: 'ABG-005', drug: '药品：万古霉素（糖肽类，注射）', grade: '分级：特殊使用级', authority: '权限：副主任医师及以上 + 治疗药物监测（TDM）', limit: '使用限制：须会诊、监测谷浓度，肾功能调整', note: '备注：限 MRSA 等耐药革兰阳性菌感染' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/adverse-reactions - 药品不良反应（报告号/药品/反应/严重度/处置）5 条 */
async function handleAdverseReactions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ADR-001', reportNo: '报告号：ADR-20261020-01', drug: '药品：阿莫西林/克拉维酸钾（口服）', reaction: '反应：皮疹伴瘙痒（躯干散在斑丘疹），无全身症状', severity: '严重度：一般（Ⅰ 型轻中度皮肤反应）', action: '处置：停药、口服抗组胺药，观察好转，上报 ADR 监测' },
    { id: 'ADR-002', reportNo: '报告号：ADR-20261019-02', drug: '药品：左氧氟沙星（口服）', reaction: '反应：用药后肌腱酸痛（跟腱不适），未断裂', severity: '严重度：一般（可逆，及时停药）', action: '处置：立即停药、避免负重、骨科随访，上报并记录回避' },
    { id: 'ADR-003', reportNo: '报告号：ADR-20261019-03', drug: '药品：头孢呋辛（静脉）', reaction: '反应：输液局部静脉炎（沿血管红、痛）', severity: '严重度：一般（局部反应）', action: '处置：更换血管、减慢滴速、局部热敷，调整输注方案' },
    { id: 'ADR-004', reportNo: '报告号：ADR-20261018-04', drug: '药品：万古霉素（静脉输注过快）', reaction: '反应：红人综合征（面部潮红、血压波动）', severity: '严重度：严重（输注相关反应，需紧急处理）', action: '处置：立即停药、补液监护、延长输注至≥60min，上报严重 ADR' },
    { id: 'ADR-005', reportNo: '报告号：ADR-20261017-05', drug: '药品：二甲双胍（口服）', reaction: '反应：轻度胃肠道不适（恶心、腹胀），无低血糖', severity: '严重度：一般（胃肠道耐受反应）', action: '处置：随餐服用、减量观察，症状缓解，持续随访' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/quality-control - 药事质控（项目/指标/本期值/目标值/责任药师）5 条 */
async function handlePharmQc(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PQC-001', item: '项目：门诊处方合理率', metric: '指标：点评处方中合理处方占比', current: '本期值：95.8%（本月点评 1200 张）', target: '目标值：≥95%', pharmacist: '责任药师：药剂科主任 黄***（P-014）' },
    { id: 'PQC-002', item: '项目：住院抗菌药物使用率', metric: '指标：使用抗菌药物出院患者占比', current: '本期值：41.2%（全院住院）', target: '目标值：≤60%', pharmacist: '责任药师：抗菌管理专员 郑***（P-022）' },
    { id: 'PQC-003', item: '项目：特殊使用级抗菌药物占比', metric: '指标：特殊级用量占抗菌药物总量比', current: '本期值：5.6%', target: '目标值：≤10%', pharmacist: '责任药师：抗菌管理专员 郑***（P-022）' },
    { id: 'PQC-004', item: '项目：抗菌药物药敏送检率（治疗用药）', metric: '指标：治疗用抗菌前病原学送检比例', current: '本期值：72.3%', target: '目标值：≥50%', pharmacist: '责任药师：临床药师 林***（P-009）' },
    { id: 'PQC-005', item: '项目：药品不良反应上报例数', metric: '指标：本期 ADR 有效上报例数', current: '本期值：38 例（含 1 例严重）', target: '目标值：应报尽报（无漏报）', pharmacist: '责任药师：ADR 监测员 吴***（P-018）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m453Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/prescription-review', handle: handleRxReview, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/rational-monitor', handle: handleRationalMonitor, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/abx-grading', handle: handleAbxGrading, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/adverse-reactions', handle: handleAdverseReactions, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/quality-control', handle: handlePharmQc, auth: true },
];
