/**
 * 健澜科技 jlmedaios - M392 P1 业务扩展：互联网医院深度打磨（详情版）
 *
 * 在线问诊详情/在线处方详情/在线支付详情/药品配送详情/在线随访详情/互联网医院报告详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/telemed/consultations-detail - 在线问诊详情 5 条 */
async function handleTelemedConsultationsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TCD-001', consultationId: 'CON-2026-1001', patientComplaint: '患者李***（55 岁男性）主诉：反复咳嗽咳痰 1 周，伴发热 38.5℃ 2 天（图文问诊）', doctorDiagnosis: '呼吸科医生张***（主任医师）诊断：急性支气管炎（细菌性），建议抗感染治疗', prescription: '已开具处方：阿莫西林胶囊 0.5g × 24 粒（每日 3 次，每次 1 粒）+ 氨溴索口服液 100ml（每日 3 次，每次 10ml）', suggestion: '建议多喝水、注意休息、避免受凉；如发热超过 3 天或咳嗽加重，请及时到医院就诊' },
    { id: 'TCD-002', consultationId: 'CON-2026-1002', patientComplaint: '患者王***（60 岁女性）主诉：头晕乏力 3 天，伴心慌不适（视频问诊）', doctorDiagnosis: '心内科医生李***（副主任医师）诊断：心律失常（早搏），建议完善心电图检查', prescription: '已开具处方：参松养心胶囊 0.4g × 36 粒（每日 3 次，每次 4 粒）+ 美托洛尔缓释片 47.5mg × 7 片（每日 1 次，每次 1 片）', suggestion: '建议避免劳累、保持情绪稳定；如心慌加重或胸痛，请立即到医院就诊（建议 24 小时内完善心电图检查）' },
    { id: 'TCD-003', consultationId: 'CON-2026-1003', patientComplaint: '患者张***（45 岁男性）主诉：胃痛反酸 2 周，伴恶心呕吐（图文问诊）', doctorDiagnosis: '消化科医生王***（主治医师）诊断：慢性胃炎（活动期），建议规范治疗', prescription: '已开具处方：奥美拉唑肠溶胶囊 20mg × 14 粒（每日 2 次，每次 1 粒）+ 莫沙必利片 5mg × 24 片（每日 3 次，每次 1 片）', suggestion: '建议清淡饮食、避免辛辣刺激食物、规律进餐；如症状持续 2 周无改善，请及时到医院就诊（建议完善胃镜检查）' },
    { id: 'TCD-004', consultationId: 'CON-2026-1004', patientComplaint: '患者刘***（50 岁女性）主诉：血糖控制不佳 1 个月，空腹血糖 8.5mmol/L（图文问诊）', doctorDiagnosis: '内分泌科医生刘***（副主任医师）诊断：2 型糖尿病（血糖控制不佳），建议调整治疗方案', prescription: '已开具处方：二甲双胍缓释片 0.5g × 30 片（每日 2 次，每次 2 片）+ 格列美脲片 2mg × 30 片（每日 1 次，每次 1 片）', suggestion: '建议控制饮食、加强运动、定期监测血糖；如血糖持续升高或出现低血糖症状，请及时到医院就诊' },
    { id: 'TCD-005', consultationId: 'CON-2026-1005', patientComplaint: '患者陈***（35 岁女性）主诉：皮肤瘙痒 3 天，伴皮疹（图文问诊）', doctorDiagnosis: '皮肤科医生陈***（主治医师）诊断：荨麻疹（过敏性），建议抗过敏治疗', prescription: '已开具处方：氯雷他定片 10mg × 7 片（每日 1 次，每次 1 片）+ 炉甘石洗剂 100ml（外用，每日 3 次）', suggestion: '建议避免接触过敏原（如海鲜、花粉等）、保持皮肤清洁；如皮疹加重或出现呼吸困难，请立即到医院就诊' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/prescriptions-detail - 在线处方详情 5 条 */
async function handleTelemedPrescriptionsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TPD-001', prescriptionId: 'RX-2026-1001', drugDetails: '阿莫西林胶囊 0.5g × 24 粒（1 盒）；氨溴索口服液 100ml × 1 瓶', dosage: '阿莫西林：每日 3 次，每次 1 粒（0.5g）；氨溴索：每日 3 次，每次 10ml', usage: '口服（饭后服用）；氨溴索口服液直接口服', doctor: '呼吸科医生张***（主任医师）（已电子签名）' },
    { id: 'TPD-002', prescriptionId: 'RX-2026-1002', drugDetails: '参松养心胶囊 0.4g × 36 粒（1 盒）；美托洛尔缓释片 47.5mg × 7 片（1 盒）', dosage: '参松养心：每日 3 次，每次 4 粒；美托洛尔：每日 1 次，每次 1 片（47.5mg）', usage: '口服（饭后服用）；美托洛尔缓释片整片吞服，不可掰开', doctor: '心内科医生李***（副主任医师）（已电子签名）' },
    { id: 'TPD-003', prescriptionId: 'RX-2026-1003', drugDetails: '奥美拉唑肠溶胶囊 20mg × 14 粒（1 盒）；莫沙必利片 5mg × 24 片（1 盒）', dosage: '奥美拉唑：每日 2 次，每次 1 粒（20mg）；莫沙必利：每日 3 次，每次 1 片（5mg）', usage: '口服（饭前 30 分钟服用）；奥美拉唑肠溶胶囊整片吞服，不可咀嚼', doctor: '消化科医生王***（主治医师）（已电子签名）' },
    { id: 'TPD-004', prescriptionId: 'RX-2026-1004', drugDetails: '二甲双胍缓释片 0.5g × 30 片（1 盒）；格列美脲片 2mg × 30 片（1 盒）', dosage: '二甲双胍：每日 2 次，每次 2 片（1.0g）；格列美脲：每日 1 次，每次 1 片（2mg）', usage: '口服（饭中或饭后服用）；二甲双胍缓释片整片吞服，不可掰开', doctor: '内分泌科医生刘***（副主任医师）（已电子签名）' },
    { id: 'TPD-005', prescriptionId: 'RX-2026-1005', drugDetails: '氯雷他定片 10mg × 7 片（1 盒）；炉甘石洗剂 100ml × 1 瓶', dosage: '氯雷他定：每日 1 次，每次 1 片（10mg）；炉甘石洗剂：外用，每日 3 次', usage: '氯雷他定口服（饭后服用）；炉甘石洗剂外用（摇匀后涂抹患处）', doctor: '皮肤科医生陈***（主治医师）（已电子签名）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/payments-detail - 在线支付详情 5 条 */
async function handleTelemedPaymentsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TPD-002', paymentId: 'PAY-2026-1001', itemDetails: '图文问诊费：50 元；处方药品费：阿莫西林胶囊 25 元 + 氨溴索口服液 15 元 = 40 元', amount: '合计：90 元（问诊费 50 元 + 药品费 40 元）', method: '微信支付（已支付，支付时间：2026-10-20 09:30:00）', time: '2026-10-20 09:30:00（支付时间）' },
    { id: 'TPD-006', paymentId: 'PAY-2026-1002', itemDetails: '视频问诊费：100 元；处方药品费：参松养心胶囊 45 元 + 美托洛尔缓释片 30 元 = 75 元', amount: '合计：175 元（问诊费 100 元 + 药品费 75 元）', method: '支付宝支付（已支付，支付时间：2026-10-20 10:30:00）', time: '2026-10-20 10:30:00（支付时间）' },
    { id: 'TPD-007', paymentId: 'PAY-2026-1003', itemDetails: '图文问诊费：50 元；处方药品费：奥美拉唑肠溶胶囊 20 元 + 莫沙必利片 18 元 = 38 元', amount: '合计：88 元（问诊费 50 元 + 药品费 38 元）', method: '微信支付（已支付，支付时间：2026-10-20 11:30:00）', time: '2026-10-20 11:30:00（支付时间）' },
    { id: 'TPD-008', paymentId: 'PAY-2026-1004', itemDetails: '图文问诊费：80 元（内分泌科副主任医师）；处方药品费：二甲双胍缓释片 25 元 + 格列美脲片 28 元 = 53 元', amount: '合计：133 元（问诊费 80 元 + 药品费 53 元）', method: '支付宝支付（已支付，支付时间：2026-10-20 14:30:00）', time: '2026-10-20 14:30:00（支付时间）' },
    { id: 'TPD-009', paymentId: 'PAY-2026-1005', itemDetails: '图文问诊费：50 元；处方药品费：氯雷他定片 15 元 + 炉甘石洗剂 8 元 = 23 元', amount: '合计：73 元（问诊费 50 元 + 药品费 23 元）', method: '微信支付（已支付，支付时间：2026-10-20 15:30:00）', time: '2026-10-20 15:30:00（支付时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/delivery-detail - 药品配送详情 5 条 */
async function handleTelemedDeliveryDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TDD-001', deliveryId: 'DEL-2026-1001', drugDetails: '阿莫西林胶囊 0.5g × 24 粒（1 盒）；氨溴索口服液 100ml × 1 瓶', address: '杭州市西湖区文三路 XXX 号 XXX 小区 XXX 幢 XXX 室（收件人：李***，联系电话：138****5678）', logistics: '顺丰速运（运单号：SF-2026-1001-1234，已发货，预计 2026-10-22 送达）', signoff: '待签收（预计送达时间：2026-10-22 14:00-18:00）' },
    { id: 'TDD-002', deliveryId: 'DEL-2026-1002', drugDetails: '参松养心胶囊 0.4g × 36 粒（1 盒）；美托洛尔缓释片 47.5mg × 7 片（1 盒）', address: '杭州市拱墅区莫干山路 XXX 号 XXX 小区 XXX 幢 XXX 室（收件人：王***，联系电话：139****8765）', logistics: '京东物流（运单号：JD-2026-1002-5678，已发货，预计 2026-10-22 送达）', signoff: '待签收（预计送达时间：2026-10-22 09:00-12:00）' },
    { id: 'TDD-003', deliveryId: 'DEL-2026-1003', drugDetails: '奥美拉唑肠溶胶囊 20mg × 14 粒（1 盒）；莫沙必利片 5mg × 24 片（1 盒）', address: '杭州市滨江区江南大道 XXX 号 XXX 小区 XXX 幢 XXX 室（收件人：张***，联系电话：137****4321）', logistics: '顺丰速运（运单号：SF-2026-1003-9012，已发货，预计 2026-10-22 送达）', signoff: '待签收（预计送达时间：2026-10-22 14:00-18:00）' },
    { id: 'TDD-004', deliveryId: 'DEL-2026-1004', drugDetails: '二甲双胍缓释片 0.5g × 30 片（1 盒）；格列美脲片 2mg × 30 片（1 盒）', address: '杭州市余杭区文一西路 XXX 号 XXX 小区 XXX 幢 XXX 室（收件人：刘***，联系电话：136****8765）', logistics: '京东物流（运单号：JD-2026-1004-3456，已发货，预计 2026-10-22 送达）', signoff: '待签收（预计送达时间：2026-10-22 09:00-12:00）' },
    { id: 'TDD-005', deliveryId: 'DEL-2026-1005', drugDetails: '氯雷他定片 10mg × 7 片（1 盒）；炉甘石洗剂 100ml × 1 瓶', address: '杭州市上城区延安路 XXX 号 XXX 小区 XXX 幢 XXX 室（收件人：陈***，联系电话：135****2345）', logistics: '顺丰速运（运单号：SF-2026-1005-7890，已发货，预计 2026-10-22 送达）', signoff: '待签收（预计送达时间：2026-10-22 14:00-18:00）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/followup-detail - 在线随访详情 5 条 */
async function handleTelemedFollowupDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TFD-001', followupId: 'FLW-2026-1001', patient: '李***（55 岁男性，急性支气管炎治疗后随访）', followupContent: '患者服药 3 天后反馈：咳嗽咳痰症状明显减轻，体温恢复正常（36.8℃），无发热', doctorSuggestion: '呼吸科医生张***建议：继续服药至疗程结束（共 7 天），注意休息、多喝水；如症状复发，请及时复诊', nextTime: '下次随访时间：2026-10-27（服药 7 天后，评估疗效）' },
    { id: 'TFD-002', followupId: 'FLW-2026-1002', patient: '王***（60 岁女性，心律失常治疗后随访）', followupContent: '患者服药 1 周后反馈：心慌症状明显减轻，头晕乏力症状改善，无明显不适', doctorSuggestion: '心内科医生李***建议：继续服药，注意监测心率（建议每日早晚各测 1 次）；如心慌加重或出现胸痛，请立即复诊', nextTime: '下次随访时间：2026-11-03（服药 2 周后，评估疗效，建议完善心电图复查）' },
    { id: 'TFD-003', followupId: 'FLW-2026-1003', patient: '张***（45 岁男性，慢性胃炎治疗后随访）', followupContent: '患者服药 1 周后反馈：胃痛反酸症状明显减轻，恶心呕吐症状消失，食欲改善', doctorSuggestion: '消化科医生王***建议：继续服药至疗程结束（共 4 周），注意饮食调理（清淡饮食、规律进餐）；如症状复发，建议完善胃镜检查', nextTime: '下次随访时间：2026-11-17（服药 4 周后，评估疗效）' },
    { id: 'TFD-004', followupId: 'FLW-2026-1004', patient: '刘***（50 岁女性，2 型糖尿病治疗后随访）', followupContent: '患者服药 1 周后反馈：空腹血糖降至 7.2mmol/L（较前下降 1.3mmol/L），无低血糖症状', doctorSuggestion: '内分泌科医生刘***建议：继续服药，注意监测血糖（建议每日监测空腹及餐后 2 小时血糖）；如血糖持续升高或出现低血糖症状，请及时复诊', nextTime: '下次随访时间：2026-10-27（服药 1 周后，评估血糖控制情况）' },
    { id: 'TFD-005', followupId: 'FLW-2026-1005', patient: '陈***（35 岁女性，荨麻疹治疗后随访）', followupContent: '患者服药 3 天后反馈：皮肤瘙痒症状明显减轻，皮疹消退 80%，无新发皮疹', doctorSuggestion: '皮肤科医生陈***建议：继续服药至疗程结束（共 7 天），注意避免接触过敏原；如皮疹复发或加重，请及时复诊', nextTime: '下次随访时间：2026-10-27（服药 7 天后，评估疗效）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/reports-detail - 互联网医院报告详情 5 条 */
async function handleTelemedReportsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRD-001', reportName: '2026 年 10 月互联网医院运营月报', dataDetails: '在线问诊量：1200 人次（环比增长 10%）；在线处方量：800 张（环比增长 8%）；药品配送量：750 单（环比增长 9%）；在线随访量：300 人次（环比增长 12%）', conclusion: '互联网医院运营整体良好，各项指标均保持增长态势，患者满意度达到 4.5 分（满分 5 分）', suggestion: '建议继续优化在线问诊流程、提高药品配送效率、加强在线随访服务；同时加强与线下医院的联动，提供更完整的医疗服务', time: '2026-11-05 10:00:00（报告生成时间）' },
    { id: 'TRD-002', reportName: '2026 年 Q4 互联网医院运营季报', dataDetails: 'Q4 在线问诊量：3500 人次（同比增长 15%）；Q4 在线处方量：2400 张（同比增长 12%）；Q4 药品配送量：2200 单（同比增长 14%）；Q4 在线随访量：900 人次（同比增长 18%）', conclusion: 'Q4 互联网医院运营整体良好，各项指标同比增长均超过 10%，在线随访量增长最快（18%），说明患者对在线随访服务的需求持续增加', suggestion: '建议加大在线随访服务投入、完善随访体系；同时加强互联网医院品牌宣传，提高知名度和影响力', time: '2027-01-10 14:00:00（报告生成时间）' },
    { id: 'TRD-003', reportName: '2026 年 10 月互联网医院科室运营月报（呼吸科）', dataDetails: '呼吸科在线问诊量：150 人次（占全院 12.5%）；呼吸科在线处方量：120 张（占全院 15%）；呼吸科患者满意度：4.6 分（高于全院平均 4.5 分）', conclusion: '呼吸科互联网医院运营表现优秀，患者满意度高于全院平均水平，说明呼吸科医生在线服务质量较高', suggestion: '建议继续保持呼吸科在线服务质量、总结经验推广到其他科室；同时加强呼吸科慢性病管理（如慢阻肺、哮喘等）的在线服务', time: '2026-11-06 11:00:00（报告生成时间）' },
    { id: 'TRD-004', reportName: '2026 年 10 月互联网医院药品配送效率报告', dataDetails: '药品配送平均时效：2.1 天（从下单到签收）；配送准时率：95%；药品破损率：0.1%；患者对配送服务满意度：4.4 分', conclusion: '互联网医院药品配送效率整体良好，平均时效 2.1 天，配送准时率 95%，药品破损率极低（0.1%），患者满意度较高', suggestion: '建议继续优化药品配送流程、缩短配送时效（目标：24 小时内送达）；同时加强与物流公司的合作、提高配送服务质量', time: '2026-11-07 15:00:00（报告生成时间）' },
    { id: 'TRD-005', reportName: '2026 年 10 月互联网医院患者满意度调查报告', dataDetails: '在线问诊满意度：4.5 分（满分 5 分）；在线处方满意度：4.4 分；药品配送满意度：4.4 分；在线随访满意度：4.6 分；整体满意度：4.5 分', conclusion: '互联网医院患者整体满意度 4.5 分，在线随访满意度最高（4.6 分），说明患者对在线随访服务评价最好', suggestion: '建议继续保持在线随访服务质量、总结经验推广到其他服务环节；同时加强在线问诊和药品配送服务的改进，提高患者满意度', time: '2026-11-08 09:00:00（报告生成时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m392Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/telemed/consultations-detail', handle: handleTelemedConsultationsDetail, auth: true },
  { method: 'GET', path: '/api/v1/telemed/prescriptions-detail', handle: handleTelemedPrescriptionsDetail, auth: true },
  { method: 'GET', path: '/api/v1/telemed/payments-detail', handle: handleTelemedPaymentsDetail, auth: true },
  { method: 'GET', path: '/api/v1/telemed/delivery-detail', handle: handleTelemedDeliveryDetail, auth: true },
  { method: 'GET', path: '/api/v1/telemed/followup-detail', handle: handleTelemedFollowupDetail, auth: true },
  { method: 'GET', path: '/api/v1/telemed/reports-detail', handle: handleTelemedReportsDetail, auth: true },
];
