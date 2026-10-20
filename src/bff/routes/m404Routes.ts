/**
 * 健澜科技 jlmedaios - M404 P1 业务扩展：门诊住院深度打磨（详情版）
 *
 * 门诊排队详情/门诊就诊详情/门诊处方详情/入院管理详情/出院管理详情/转科管理详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/outpatient/queue-detail - 门诊排队详情 5 条 */
async function handleOutpatientQueueDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OQD-001', patient: '患者张***（55 岁男性，心内科门诊候诊）', queueNo: '候诊号：A015（心内科普通门诊，上午）', department: '科室：心内科', doctor: '医生：王***（主任医师，心内科）', waitingCount: '等待人数：前面还有 8 人（预计等待 20 分钟）' },
    { id: 'OQD-002', patient: '患者李***（45 岁女性，妇产科门诊候诊）', queueNo: '候诊号：B023（妇产科普通门诊，上午）', department: '科室：妇产科', doctor: '医生：刘***（副主任医师，妇产科）', waitingCount: '等待人数：前面还有 12 人（预计等待 30 分钟）' },
    { id: 'OQD-003', patient: '患者王***（60 岁男性，消化内科门诊候诊）', queueNo: '候诊号：C008（消化内科专家门诊，下午）', department: '科室：消化内科', doctor: '医生：陈***（主任医师，消化内科）', waitingCount: '等待人数：前面还有 3 人（预计等待 10 分钟）' },
    { id: 'OQD-004', patient: '患者刘***（30 岁女性，儿科门诊候诊）', queueNo: '候诊号：D031（儿科普通门诊，上午）', department: '科室：儿科', doctor: '医生：赵***（主治医师，儿科）', waitingCount: '等待人数：前面还有 15 人（预计等待 40 分钟）' },
    { id: 'OQD-005', patient: '患者陈***（50 岁男性，骨科门诊候诊）', queueNo: '候诊号：E010（骨科普通门诊，下午）', department: '科室：骨科', doctor: '医生：孙***（副主任医师，骨科）', waitingCount: '等待人数：前面还有 5 人（预计等待 15 分钟）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/outpatient/visits-detail - 门诊就诊详情 5 条 */
async function handleOutpatientVisitsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OVD-001', patient: '患者张***（55 岁男性，心内科门诊就诊）', chiefComplaint: '主诉：反复胸闷、胸痛 1 周，加重 1 天', diagnosis: '诊断：冠心病不稳定型心绞痛', prescription: '处方：1. 阿司匹林 100mg × 30 片，每次 1 片，每日 1 次（晚餐后）；2. 阿托伐他汀 20mg × 14 片，每次 1 片，每晚 1 次；3. 单硝酸异山梨酯 20mg × 20 片，每次 1 片，每日 2 次', doctor: '医生：王***（主任医师，心内科）' },
    { id: 'OVD-002', patient: '患者李***（45 岁女性，妇产科门诊就诊）', chiefComplaint: '主诉：体检发现胆囊结石 1 周，伴右上腹隐痛', diagnosis: '诊断：胆囊结石伴慢性胆囊炎', prescription: '处方：1. 消炎利胆片 100 片，每次 6 片，每日 3 次（餐后）；2. 建议：如反复胆绞痛，建议手术治疗（腹腔镜胆囊切除术）', doctor: '医生：刘***（副主任医师，妇产科/普外科）' },
    { id: 'OVD-003', patient: '患者王***（60 岁男性，消化内科门诊就诊）', chiefComplaint: '主诉：反复上腹痛 3 个月，加重伴黑便 1 周', diagnosis: '诊断：胃溃疡（A1 期）', prescription: '处方：1. 奥美拉唑 20mg × 14 片，每次 1 片，每日 1 次（晨起空腹）；2. 铝碳酸镁 20 片，每次 1 片，每日 3 次（餐后 1-2 小时）；3. 建议：胃镜活检病理检查 + 幽门螺杆菌检测', doctor: '医生：陈***（主任医师，消化内科）' },
    { id: 'OVD-004', patient: '患者刘***（30 岁女性，儿科门诊就诊（患儿母亲））', chiefComplaint: '主诉：患儿（2 岁男性）发热 2 天，伴咳嗽、流涕', diagnosis: '诊断：急性上呼吸道感染', prescription: '处方：1. 布洛芬混悬液 100ml，每次 5ml，必要时（体温 > 38.5℃）；2. 小儿氨酚黄那敏颗粒 10 袋，每次 1 袋，每日 3 次；3. 建议：多饮水，注意休息，如发热超过 3 天或出现呼吸急促，立即就诊', doctor: '医生：赵***（主治医师，儿科）' },
    { id: 'OVD-005', patient: '患者陈***（50 岁男性，骨科门诊就诊）', chiefComplaint: '主诉：右小腿外伤后疼痛、肿胀 2 小时', diagnosis: '诊断：右胫骨骨折（闭合性）', prescription: '处方：1. 帕瑞昔布 40mg × 2 支，肌肉注射（每次 1 支，必要时）；2. 建议：立即住院手术治疗（骨折切开复位内固定术）', doctor: '医生：孙***（副主任医师，骨科）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/outpatient/prescriptions-detail - 门诊处方详情 5 条 */
async function handleOutpatientPrescriptionsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OPD-001', prescriptionNo: 'RX-2026-001（患者张***，心内科门诊处方）', patient: '患者张***（55 岁男性）', medicationDetails: '药品明细：1. 阿司匹林肠溶片（100mg × 30 片/盒）；2. 阿托伐他汀钙片（20mg × 14 片/盒）；3. 单硝酸异山梨酯缓释片（20mg × 20 片/盒）', dosage: '剂量：1. 阿司匹林：100mg/次；2. 阿托伐他汀：20mg/次；3. 单硝酸异山梨酯：20mg/次', usage: '用法：1. 阿司匹林：每次 1 片，每日 1 次（晚餐后）；2. 阿托伐他汀：每次 1 片，每晚 1 次；3. 单硝酸异山梨酯：每次 1 片，每日 2 次（早晚）' },
    { id: 'OPD-002', prescriptionNo: 'RX-2026-002（患者李***，妇产科门诊处方）', patient: '患者李***（45 岁女性）', medicationDetails: '药品明细：1. 消炎利胆片（100 片/瓶）', dosage: '剂量：1. 消炎利胆片：6 片/次', usage: '用法：1. 消炎利胆片：每次 6 片，每日 3 次（餐后）' },
    { id: 'OPD-003', prescriptionNo: 'RX-2026-003（患者王***，消化内科门诊处方）', patient: '患者王***（60 岁男性）', medicationDetails: '药品明细：1. 奥美拉唑肠溶胶囊（20mg × 14 粒/盒）；2. 铝碳酸镁咀嚼片（20 片/盒）', dosage: '剂量：1. 奥美拉唑：20mg/次；2. 铝碳酸镁：0.5g/次', usage: '用法：1. 奥美拉唑：每次 1 粒，每日 1 次（晨起空腹）；2. 铝碳酸镁：每次 1 片，每日 3 次（餐后 1-2 小时咀嚼）' },
    { id: 'OPD-004', prescriptionNo: 'RX-2026-004（患儿，儿科门诊处方）', patient: '患儿（2 岁男性，患儿母亲刘***代取）', medicationDetails: '药品明细：1. 布洛芬混悬液（100ml/瓶）；2. 小儿氨酚黄那敏颗粒（10 袋/盒）', dosage: '剂量：1. 布洛芬：5ml/次（按体重计算）；2. 小儿氨酚黄那敏：1 袋/次', usage: '用法：1. 布洛芬：每次 5ml，必要时（体温 > 38.5℃）；2. 小儿氨酚黄那敏：每次 1 袋，每日 3 次（温开水冲服）' },
    { id: 'OPD-005', prescriptionNo: 'RX-2026-005（患者陈***，骨科门诊处方）', patient: '患者陈***（50 岁男性）', medicationDetails: '药品明细：1. 帕瑞昔布钠粉针剂（40mg × 2 支/盒）', dosage: '剂量：1. 帕瑞昔布：40mg/次', usage: '用法：1. 帕瑞昔布：每次 1 支，肌肉注射（必要时止痛）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/inpatient/admissions-detail - 入院管理详情 5 条 */
async function handleInpatientAdmissionsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IAD-001', patient: '患者张***（55 岁男性，心内科入院）', department: '科室：心内科（CCU 监护病房）', bed: '床位：CCU-03 床（监护床位）', admissionDiagnosis: '入院诊断：冠心病不稳定型心绞痛（急性冠脉综合征）', doctor: '管床医生：王***（主任医师，心内科）' },
    { id: 'IAD-002', patient: '患者李***（45 岁女性，普外科入院）', department: '科室：普外科', bed: '床位：普外-12 床（普通床位）', admissionDiagnosis: '入院诊断：胆囊结石伴慢性胆囊炎（拟行腹腔镜胆囊切除术）', doctor: '管床医生：刘***（副主任医师，普外科）' },
    { id: 'IAD-003', patient: '患者王***（60 岁男性，消化内科入院）', department: '科室：消化内科', bed: '床位：消化-08 床（普通床位）', admissionDiagnosis: '入院诊断：胃溃疡（A1 期，伴上消化道出血）', doctor: '管床医生：陈***（主任医师，消化内科）' },
    { id: 'IAD-004', patient: '患者刘***（30 岁女性，妇产科入院）', department: '科室：妇产科（产科）', bed: '床位：产科-05 床（普通床位）', admissionDiagnosis: '入院诊断：宫内妊娠 39 周，胎位不正（拟行剖宫产术）', doctor: '管床医生：赵***（副主任医师，妇产科）' },
    { id: 'IAD-005', patient: '患者陈***（50 岁男性，骨科入院）', department: '科室：骨科', bed: '床位：骨科-15 床（普通床位）', admissionDiagnosis: '入院诊断：右胫骨骨折（闭合性，拟行切开复位内固定术）', doctor: '管床医生：孙***（副主任医师，骨科）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/inpatient/discharges-detail - 出院管理详情 5 条 */
async function handleInpatientDischargesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IDD-001', patient: '患者张***（55 岁男性，心内科出院）', dischargeDiagnosis: '出院诊断：1. 冠心病不稳定型心绞痛（已行冠状动脉支架植入术）；2. 高血压病 1 级（很高危）', treatmentResult: '治疗结果：治愈（胸闷、胸痛症状消失，支架植入成功，术后恢复良好）', dischargeMedication: '出院带药：1. 阿司匹林 100mg × 30 片，每次 1 片，每日 1 次；2. 阿托伐他汀 20mg × 30 片，每次 1 片，每晚 1 次；3. 单硝酸异山梨酯 20mg × 30 片，每次 1 片，每日 2 次', doctor: '管床医生：王***（主任医师，心内科）' },
    { id: 'IDD-002', patient: '患者李***（45 岁女性，普外科出院）', dischargeDiagnosis: '出院诊断：1. 胆囊结石伴慢性胆囊炎（已行腹腔镜胆囊切除术）', treatmentResult: '治愈（胆囊结石已切除，术后恢复良好，切口愈合佳）', dischargeMedication: '出院带药：1. 头孢呋辛酯 250mg × 12 片，每次 1 片，每日 2 次（术后预防感染，疗程 5 天）；2. 建议：清淡饮食，避免油腻食物', doctor: '管床医生：刘***（副主任医师，普外科）' },
    { id: 'IDD-003', patient: '患者王***（60 岁男性，消化内科出院）', dischargeDiagnosis: '出院诊断：1. 胃溃疡（A1 期，伴上消化道出血）；2. 幽门螺杆菌阳性', treatmentResult: '好转（上消化道出血已停止，腹痛减轻，幽门螺杆菌已根除治疗）', dischargeMedication: '出院带药：1. 奥美拉唑 20mg × 28 片，每次 1 片，每日 1 次（晨起空腹，疗程 4 周）；2. 铝碳酸镁 20 片，每次 1 片，每日 3 次（餐后 1-2 小时）；3. 建议：4 周后复查胃镜 + 幽门螺杆菌检测', doctor: '管床医生：陈***（主任医师，消化内科）' },
    { id: 'IDD-004', patient: '患者刘***（30 岁女性，妇产科出院）', dischargeDiagnosis: '出院诊断：1. 宫内妊娠 39 周，剖宫产分娩（男婴，体重 3500g，Apgar 10 分）', treatmentResult: '治愈（母子平安，术后恢复良好，切口愈合佳）', dischargeMedication: '出院带药：1. 头孢呋辛酯 250mg × 12 片，每次 1 片，每日 2 次（术后预防感染，疗程 5 天）；2. 益母草颗粒 10 袋，每次 1 袋，每日 3 次（促进子宫复旧）；3. 建议：产后 42 天复查', doctor: '管床医生：赵***（副主任医师，妇产科）' },
    { id: 'IDD-005', patient: '患者陈***（50 岁男性，骨科出院）', dischargeDiagnosis: '出院诊断：1. 右胫骨骨折（已行切开复位内固定术）', treatmentResult: '好转（骨折复位良好，内固定位置满意，术后恢复良好，切口愈合佳）', dischargeMedication: '出院带药：1. 头孢呋辛酯 250mg × 12 片，每次 1 片，每日 2 次（术后预防感染，疗程 5 天）；2. 塞来昔布 200mg × 10 片，每次 1 片，每日 1 次（术后镇痛，必要时）；3. 建议：术后 2 周拆线，定期复查 X 线（每 4 周 1 次）', doctor: '管床医生：孙***（副主任医师，骨科）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/inpatient/transfers-detail - 转科管理详情 5 条 */
async function handleInpatientTransfersDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ITD-001', patient: '患者张***（55 岁男性，心内科转 CCU）', fromDepartment: '原科室：心内科普通病房（心内-05 床）', toDepartment: '新科室：心内科 CCU（CCU-03 床）', transferReason: '转科原因：患者入院后胸闷、胸痛加重，心电图提示急性前壁心肌梗死，需转入 CCU 监护治疗', time: '转科时间：2026-10-15 20:00:00（入院后 12 小时）' },
    { id: 'ITD-002', patient: '患者王***（60 岁男性，消化内科转内镜中心）', fromDepartment: '原科室：消化内科普通病房（消化-08 床）', toDepartment: '新科室：内镜中心（胃镜室）', transferReason: '转科原因：患者胃溃疡伴上消化道出血，需行胃镜检查 + 内镜下止血治疗', time: '转科时间：2026-10-16 09:00:00（入院后第 2 天）' },
    { id: 'ITD-003', patient: '患者刘***（30 岁女性，妇产科转手术室）', fromDepartment: '原科室：妇产科普通病房（产科-05 床）', toDepartment: '新科室：手术室（妇产科手术间 2 号）', transferReason: '转科原因：患者宫内妊娠 39 周，胎位不正，拟行剖宫产术', time: '转科时间：2026-10-18 08:00:00（入院后第 1 天，急诊手术）' },
    { id: 'ITD-004', patient: '患者陈***（50 岁男性，骨科转手术室）', fromDepartment: '原科室：骨科普通病房（骨科-15 床）', toDepartment: '新科室：手术室（骨科手术间 4 号）', transferReason: '转科原因：患者右胫骨骨折，拟行切开复位内固定术', time: '转科时间：2026-10-19 10:00:00（入院后第 2 天）' },
    { id: 'ITD-005', patient: '患者赵***（70 岁男性，神经内科转康复科）', fromDepartment: '原科室：神经内科普通病房（神经-10 床）', toDepartment: '新科室：康复科（康复-05 床）', transferReason: '转科原因：患者脑梗死急性期已过，病情稳定，需转入康复科进行肢体功能康复训练', time: '转科时间：2026-10-20 10:00:00（入院后第 14 天）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m404Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/outpatient/queue-detail', handle: handleOutpatientQueueDetail, auth: true },
  { method: 'GET', path: '/api/v1/outpatient/visits-detail', handle: handleOutpatientVisitsDetail, auth: true },
  { method: 'GET', path: '/api/v1/outpatient/prescriptions-detail', handle: handleOutpatientPrescriptionsDetail, auth: true },
  { method: 'GET', path: '/api/v1/inpatient/admissions-detail', handle: handleInpatientAdmissionsDetail, auth: true },
  { method: 'GET', path: '/api/v1/inpatient/discharges-detail', handle: handleInpatientDischargesDetail, auth: true },
  { method: 'GET', path: '/api/v1/inpatient/transfers-detail', handle: handleInpatientTransfersDetail, auth: true },
];
