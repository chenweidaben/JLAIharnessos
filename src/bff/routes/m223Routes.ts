/**
 * 健澜科技 jlmedaios - M223 新生儿 + 产房 + 手术麻醉深度
 *
 * 新生儿列表/监护/接种 + 分娩记录/产程进展 + 手术详情/麻醉记录/术后恢复
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、新生儿管理 ==================== */

/** GET /api/v1/newborn/list - 新生儿列表 */
async function handleNewbornList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const newborns = [
    { id: 'NBO-001', bed: '新生儿1床', mother: '张演示', gender: '男', weight: 3250, length: 50, apgar1: 9, apgar5: 10, status: '正常观察' },
    { id: 'NBO-002', bed: '新生儿2床', mother: '李患者', gender: '女', weight: 2800, length: 48, apgar1: 8, apgar5: 9, status: '正常观察' },
    { id: 'NBO-003', bed: '新生儿3床', mother: '王女士', gender: '男', weight: 2500, length: 46, apgar1: 7, apgar5: 8, status: '监护中' },
    { id: 'NBO-004', bed: '新生儿4床', mother: '赵女士', gender: '女', weight: 3400, length: 51, apgar1: 9, apgar5: 10, status: '已出院' },
    { id: 'NBO-005', bed: '新生儿5床', mother: '刘女士', gender: '男', weight: 3100, length: 49, apgar1: 9, apgar5: 10, status: '正常观察' },
  ];

  return json(ok({ newborns, totalCount: newborns.length }));
}

/** GET /api/v1/newborn/monitoring - 新生儿监护数据 */
async function handleNewbornMonitoring(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const monitoring = [
    { id: 'MON-001', newborn: '新生儿3床（王女士之子）', heartRate: 135, resp: 42, temp: 36.8, spo2: 95, glucose: 3.2, time: '2026-10-20 10:00' },
    { id: 'MON-002', newborn: '新生儿1床（张演示之子）', heartRate: 128, resp: 38, temp: 36.5, spo2: 98, glucose: 4.5, time: '2026-10-20 10:00' },
    { id: 'MON-003', newborn: '新生儿2床（李患者之女）', heartRate: 132, resp: 40, temp: 36.6, spo2: 97, glucose: 4.2, time: '2026-10-20 10:00' },
  ];

  return json(ok({ monitoring, totalCount: monitoring.length }));
}

/** GET /api/v1/newborn/vaccines - 新生儿接种记录 */
async function handleNewbornVaccines(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const vaccines = [
    { id: 'VAC-001', name: '乙肝疫苗第 1 剂', date: '2026-10-18', site: '右上臂', injector: '预防保健科-王医生', reaction: '无' },
    { id: 'VAC-002', name: '卡介苗', date: '2026-10-18', site: '左上臂', injector: '预防保健科-李医生', reaction: '轻微红肿' },
    { id: 'VAC-003', name: '维生素 K1', date: '2026-10-17', site: '肌内注射', injector: '产科-陈医生', reaction: '无' },
  ];

  return json(ok({ vaccines, totalCount: vaccines.length }));
}

/* ==================== 二、产房管理 ==================== */

/** GET /api/v1/maternity/delivery - 分娩记录 */
async function handleMaternityDelivery(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const deliveries = [
    { id: 'DEL-001', mother: '张演示', gestationalWeeks: 39, method: '顺产', newbornWeight: 3250, apgar: 9, doctor: '产科-陈主任' },
    { id: 'DEL-002', mother: '李患者', gestationalWeeks: 38, method: '剖宫产', newbornWeight: 2800, apgar: 8, doctor: '产科-陈主任' },
    { id: 'DEL-003', mother: '王女士', gestationalWeeks: 36, method: '顺产（侧切）', newbornWeight: 2500, apgar: 7, doctor: '产科-刘医生' },
    { id: 'DEL-004', mother: '赵女士', gestationalWeeks: 40, method: '顺产', newbornWeight: 3400, apgar: 9, doctor: '产科-陈主任' },
    { id: 'DEL-005', mother: '刘女士', gestationalWeeks: 39, method: '产钳助产', newbornWeight: 3100, apgar: 9, doctor: '产科-刘医生' },
  ];

  return json(ok({ deliveries, totalCount: deliveries.length }));
}

/** GET /api/v1/maternity/labor - 产程进展 */
async function handleMaternityLabor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const labor = [
    { id: 'LAB-001', mother: '孙女士', cervicalDilation: 5, fetalHead: 'S=-2', contraction: '3 次/10 分钟', fetalHeartRate: 140, status: '第一产程' },
    { id: 'LAB-002', mother: '周女士', cervicalDilation: 8, fetalHead: 'S=0', contraction: '4 次/10 分钟', fetalHeartRate: 135, status: '第一产程' },
    { id: 'LAB-003', mother: '吴女士', cervicalDilation: 10, fetalHead: 'S=+2', contraction: '5 次/10 分钟', fetalHeartRate: 145, status: '第二产程' },
  ];

  return json(ok({ labor, totalCount: labor.length }));
}

/* ==================== 三、手术麻醉深度 ==================== */

/** GET /api/v1/surgery/detail - 手术详情 */
async function handleSurgeryDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    patient: '张演示',
    surgeryName: '腹腔镜下胆囊切除术',
    surgeon: '普外科-张主任',
    assistants: ['普外科-王医生', '普外科-李医生'],
    anesthesia: '全麻（气管插管）',
    incisionClass: 'II 类（清洁-污染切口）',
    bloodLoss: 150,
    bloodTransfusion: 0,
    duration: '2 小时 30 分钟',
    start: '2026-10-20 09:00',
    end: '2026-10-20 11:30',
  }));
}

/** GET /api/v1/anesthesia/detail - 麻醉记录详情 */
async function handleAnesthesiaDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    patient: '张演示',
    anesthesiologist: '麻醉科-刘主任',
    drugs: [
      { name: '丙泊酚', dose: '150mg 诱导 + 8mg/kg/h 维持' },
      { name: '瑞芬太尼', dose: '0.5μg/kg/min' },
      { name: '七氟烷', dose: '1.5 MAC' },
      { name: '罗库溴铵', dose: '50mg 诱导' },
    ],
    vitals: { heartRate: 75, bloodPressure: '110/70', spo2: 99 },
    bis: 45,
    anesthesiaDuration: '2 小时 45 分钟',
  }));
}

/** GET /api/v1/surgery/postop - 术后恢复 */
async function handleSurgeryPostop(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const postop = [
    { id: 'POS-001', patient: '张演示', surgery: '腹腔镜下胆囊切除术', recoveryTime: 60, painScore: 3, drainage: '引流管通畅，引流液 50ml', status: '恢复中' },
    { id: 'POS-002', patient: '李患者', surgery: '阑尾切除术', recoveryTime: 45, painScore: 2, drainage: '无引流管', status: '已出室' },
    { id: 'POS-003', patient: '王先生', surgery: '胃癌根治术', recoveryTime: 120, painScore: 5, drainage: '腹腔引流管 2 根，引流液 200ml', status: '转 ICU' },
  ];

  return json(ok({ postop, totalCount: postop.length }));
}

export const m223Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/newborn/list', handle: handleNewbornList, auth: true },
  { method: 'GET', path: '/api/v1/newborn/monitoring', handle: handleNewbornMonitoring, auth: true },
  { method: 'GET', path: '/api/v1/newborn/vaccines', handle: handleNewbornVaccines, auth: true },
  { method: 'GET', path: '/api/v1/maternity/delivery', handle: handleMaternityDelivery, auth: true },
  { method: 'GET', path: '/api/v1/maternity/labor', handle: handleMaternityLabor, auth: true },
  { method: 'GET', path: '/api/v1/surgery/detail', handle: handleSurgeryDetail, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/detail', handle: handleAnesthesiaDetail, auth: true },
  { method: 'GET', path: '/api/v1/surgery/postop', handle: handleSurgeryPostop, auth: true },
];
