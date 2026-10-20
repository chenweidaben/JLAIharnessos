/**
 * 健澜科技 jlmedaios - M287 缺口域补充
 *
 * 麻醉记录/麻醉并发症/中药处方/方剂库/牙科预约/眼科检查
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/anesthesia/records - 麻醉记录 5 条 */
async function handleAnesthesiaRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const records = [
    { id: 'AR-001', patient: '王***', surgery: '腹腔镜胆囊切除术', anesthesiologist: '郑***', method: '全身麻醉（气管插管）', startTime: '2026-10-21 08:30', duration: '2.5 小时', status: '已完成' },
    { id: 'AR-002', patient: '李***', surgery: '人工髋关节置换术', anesthesiologist: '吴***', method: '硬膜外麻醉', startTime: '2026-10-21 14:00', duration: '3.0 小时', status: '已完成' },
    { id: 'AR-003', patient: '张***', surgery: '冠脉支架植入术', anesthesiologist: '郑***', method: '局部麻醉（局麻+镇静）', startTime: '2026-10-22 09:00', duration: '1.5 小时', status: '待执行' },
    { id: 'AR-004', patient: '赵***', surgery: '甲状腺次全切除术', anesthesiologist: '王***', method: '颈丛阻滞麻醉', startTime: '2026-10-22 10:00', duration: '2.0 小时', status: '待执行' },
    { id: 'AR-005', patient: '孙***', surgery: '阑尾切除术', anesthesiologist: '吴***', method: '全身麻醉（喉罩）', startTime: '2026-10-20 13:30', duration: '1.0 小时', status: '已完成' },
  ];
  return json(ok({ records, totalCount: records.length }));
}

/** GET /api/v1/anesthesia/complications - 麻醉并发症 5 条 */
async function handleAnesthesiaComplications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const complications = [
    { id: 'AC-001', patient: '王***', type: '术后恶心呕吐（PONV）', severity: '轻度', treatment: '已使用止吐药，缓解', time: '术后 2 小时', status: '已处理' },
    { id: 'AC-002', patient: '李***', type: '低血压（麻醉诱导期）', severity: '中度', treatment: '已使用升压药，恢复正常', time: '诱导后 5 分钟', status: '已处理' },
    { id: 'AC-003', patient: '张***', type: '术后咽痛（气管插管后）', severity: '轻度', treatment: '自行缓解', time: '术后 4 小时', status: '已处理' },
    { id: 'AC-004', patient: '赵***', type: '局麻药中毒（轻度）', severity: '中度', treatment: '已停止注药，吸氧观察', time: '注药后 3 分钟', status: '观察中' },
    { id: 'AC-005', patient: '孙***', type: '术后寒战', severity: '轻度', treatment: '保暖后缓解', time: '术后 1 小时', status: '已处理' },
  ];
  return json(ok({ complications, totalCount: complications.length }));
}

/** GET /api/v1/tcm/prescriptions - 中药处方 5 条 */
async function handleTcmPrescriptions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const prescriptions = [
    { id: 'TP-001', patient: '张***', formula: '银翘散加减', herbs: '金银花 15g、连翘 12g、桔梗 10g、薄荷 6g', doctor: '陈***主任中医师', date: '2026-10-20', status: '已发药' },
    { id: 'TP-002', patient: '李***', formula: '六味地黄丸加减', herbs: '熟地黄 20g、山茱萸 12g、山药 15g、泽泻 10g', doctor: '王***副主任中医师', date: '2026-10-20', status: '已审核' },
    { id: 'TP-003', patient: '王***', formula: '归脾汤加减', herbs: '黄芪 20g、党参 15g、白术 12g、当归 10g', doctor: '李***主治中医师', date: '2026-10-20', status: '已发药' },
    { id: 'TP-004', patient: '赵***', formula: '半夏白术天麻汤', herbs: '半夏 9g、白术 12g、天麻 10g、茯苓 15g', doctor: '陈***主任中医师', date: '2026-10-19', status: '已发药' },
    { id: 'TP-005', patient: '陈***', formula: '逍遥散加减', herbs: '柴胡 10g、当归 12g、白芍 15g、白术 12g', doctor: '王***副主任中医师', date: '2026-10-19', status: '已审核' },
  ];
  return json(ok({ prescriptions, totalCount: prescriptions.length }));
}

/** GET /api/v1/tcm/formulas - 方剂库 5 条 */
async function handleTcmFormulas(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const formulas = [
    { id: 'TF-001', name: '银翘散', category: '解表剂', composition: '金银花、连翘、桔梗、薄荷、竹叶、生甘草、荆芥穗、淡豆豉、牛蒡子', indication: '温病初起，发热无汗，咽痛', usageCount: 1250 },
    { id: 'TF-002', name: '六味地黄丸', category: '补益剂', composition: '熟地黄、山茱萸、山药、泽泻、牡丹皮、茯苓', indication: '肾阴亏损，头晕耳鸣，腰膝酸软', usageCount: 3200 },
    { id: 'TF-003', name: '归脾汤', category: '补益剂', composition: '黄芪、党参、白术、当归、茯神、酸枣仁、龙眼肉、木香、远志、甘草', indication: '心脾两虚，气短心悸，失眠多梦', usageCount: 2100 },
    { id: 'TF-004', name: '半夏白术天麻汤', category: '祛湿剂', composition: '半夏、白术、天麻、茯苓、橘红、甘草、生姜、大枣', indication: '风痰上扰，眩晕头痛，胸闷呕恶', usageCount: 850 },
    { id: 'TF-005', name: '逍遥散', category: '和解剂', composition: '柴胡、当归、白芍、白术、茯苓、炙甘草、薄荷、生姜', indication: '肝郁血虚，胁肋胀痛，头痛目眩', usageCount: 1800 },
  ];
  return json(ok({ formulas, totalCount: formulas.length }));
}

/** GET /api/v1/dental/appointments - 牙科预约 5 条 */
async function handleDentalAppointments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const appointments = [
    { id: 'DA-001', patient: '刘***', service: '种植牙复诊', doctor: '周***主治医师', time: '2026-10-21 09:00', status: '已确认' },
    { id: 'DA-002', patient: '吴***', service: '牙齿矫正（复诊）', doctor: '郑***副主任医师', time: '2026-10-21 10:30', status: '已确认' },
    { id: 'DA-003', patient: '孙***', service: '拔牙（智齿）', doctor: '王***主治医师', time: '2026-10-21 14:00', status: '待确认' },
    { id: 'DA-004', patient: '钱***', service: '洗牙（洁治）', doctor: '李***住院医师', time: '2026-10-22 08:30', status: '已确认' },
    { id: 'DA-005', patient: '赵***', service: '根管治疗', doctor: '周***主治医师', time: '2026-10-22 15:00', status: '已确认' },
  ];
  return json(ok({ appointments, totalCount: appointments.length }));
}

/** GET /api/v1/ophthalmology/exams - 眼科检查 5 条 */
async function handleOphthalmologyExams(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const exams = [
    { id: 'OE-001', patient: '张***', item: '视力检查（裸眼/矫正）', result: '右眼 0.8 / 1.0，左眼 0.6 / 1.0', doctor: '陈***副主任医师', time: '2026-10-20 09:00' },
    { id: 'OE-002', patient: '李***', item: '眼压检查（非接触式）', result: '右眼 15 mmHg，左眼 17 mmHg（正常范围）', doctor: '王***主治医师', time: '2026-10-20 09:30' },
    { id: 'OE-003', patient: '王***', item: '裂隙灯检查', result: '结膜轻度充血，角膜透明，晶状体混浊（初发期白内障）', doctor: '陈***副主任医师', time: '2026-10-20 10:00' },
    { id: 'OE-004', patient: '赵***', item: '眼底照相', result: '视盘边界清，黄斑中心凹反光可见，视网膜平伏', doctor: '刘***住院医师', time: '2026-10-20 10:30' },
    { id: 'OE-005', patient: '陈***', item: '验光（电脑+主觉）', result: '右眼 -2.00DS/-0.50DC×180°，左眼 -1.75DS/-0.25DC×175°', doctor: '王***主治医师', time: '2026-10-20 11:00' },
  ];
  return json(ok({ exams, totalCount: exams.length }));
}

export const m287Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/anesthesia/records', handle: handleAnesthesiaRecords, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/complications', handle: handleAnesthesiaComplications, auth: true },
  { method: 'GET', path: '/api/v1/tcm/prescriptions', handle: handleTcmPrescriptions, auth: true },
  { method: 'GET', path: '/api/v1/tcm/formulas', handle: handleTcmFormulas, auth: true },
  { method: 'GET', path: '/api/v1/dental/appointments', handle: handleDentalAppointments, auth: true },
  { method: 'GET', path: '/api/v1/ophthalmology/exams', handle: handleOphthalmologyExams, auth: true },
];
