/**
 * 健澜科技 jlmedaios - M221 预防保健 + 社区卫生 + 远程医疗
 *
 * 预防接种/健康体检 + 社区中心/家庭医生 + 远程会诊/病历/设备 + 病历质控看板
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、预防保健 ==================== */

/** GET /api/v1/preventive/immunizations - 预防接种 */
async function handlePreventiveImmunizations(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'IMM-001', vaccine: '乙肝疫苗', target: '新生儿（出生 24h 内）', date: '2026-10-15', dose: '第 1 剂', doctor: '预防保健科-王医生', status: '已接种' },
    { id: 'IMM-002', vaccine: '流感疫苗', target: '60 岁以上老年人', date: '2026-10-18', dose: '第 1 剂', doctor: '预防保健科-李医生', status: '已接种' },
    { id: 'IMM-003', vaccine: '肺炎疫苗', target: '慢性呼吸道疾病患者', date: '2026-10-20', dose: '第 1 剂', doctor: '预防保健科-王医生', status: '待接种' },
    { id: 'IMM-004', vaccine: 'HPV 疫苗', target: '女性 9-45 岁', date: '2026-11-01', dose: '第 2 剂', doctor: '预防保健科-李医生', status: '已预约' },
    { id: 'IMM-005', vaccine: '新冠疫苗', target: '全人群（加强针）', date: '2026-10-25', dose: '第 4 剂', doctor: '预防保健科-王医生', status: '已预约' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/** GET /api/v1/preventive/health-check - 健康体检 */
async function handlePreventiveHealthCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const exams = [
    { id: 'EXM-001', person: '张演示', type: '年度体检', date: '2026-10-15', result: '合格', reportDoctor: '体检中心-赵医生' },
    { id: 'EXM-002', person: '李患者', type: '入职体检', date: '2026-10-16', result: '合格', reportDoctor: '体检中心-钱医生' },
    { id: 'EXM-003', person: '王先生', type: '从业体检（食品）', date: '2026-10-17', result: '合格', reportDoctor: '体检中心-赵医生' },
    { id: 'EXM-004', person: '赵女士', type: '老年体检', date: '2026-10-18', result: '需复查（血糖偏高）', reportDoctor: '体检中心-孙医生' },
    { id: 'EXM-005', person: '刘大爷', type: '老年体检', date: '2026-10-19', result: '不合格（血压偏高）', reportDoctor: '体检中心-孙医生' },
  ];

  return json(ok({ exams, totalCount: exams.length }));
}

/* ==================== 二、社区卫生 ==================== */

/** GET /api/v1/community/centers - 社区卫生中心 */
async function handleCommunityCenters(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const centers = [
    { id: 'CCC-001', name: '文晖街道社区卫生服务中心', address: '杭州市拱墅区文晖路 123 号', population: 52000, familyDoctors: 12, serviceTime: '周一至周日 8:00-17:00' },
    { id: 'CCC-002', name: '朝晖街道社区卫生服务中心', address: '杭州市拱墅区朝晖路 456 号', population: 48000, familyDoctors: 10, serviceTime: '周一至周日 8:00-17:00' },
    { id: 'CCC-003', name: '长庆街道社区卫生服务中心', address: '杭州市拱墅区长庆街 789 号', population: 35000, familyDoctors: 8, serviceTime: '周一至周五 8:00-17:00' },
    { id: 'CCC-004', name: '米市巷街道社区卫生服务中心', address: '杭州市拱墅区米市巷 101 号', population: 42000, familyDoctors: 9, serviceTime: '周一至周日 8:00-17:00' },
    { id: 'CCC-005', name: '小河街道社区卫生服务中心', address: '杭州市拱墅区小河路 202 号', population: 38000, familyDoctors: 7, serviceTime: '周一至周五 8:00-17:00' },
  ];

  return json(ok({ centers, totalCount: centers.length }));
}

/** GET /api/v1/community/family-doctors - 家庭医生签约 */
async function handleCommunityFamilyDoctors(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const contracts = [
    { id: 'FDC-001', resident: '张演示', team: '文晖中心-家庭医生 1 组', type: '基础包', signDate: '2025-10-01', status: '服务中' },
    { id: 'FDC-002', resident: '李患者', team: '朝晖中心-家庭医生 2 组', type: '高级包', signDate: '2026-01-15', status: '服务中' },
    { id: 'FDC-003', resident: '王先生', team: '长庆中心-家庭医生 1 组', type: '基础包', signDate: '2025-06-01', status: '已到期' },
    { id: 'FDC-004', resident: '赵女士', team: '米市巷中心-家庭医生 3 组', type: '高级包', signDate: '2026-03-20', status: '服务中' },
    { id: 'FDC-005', resident: '刘大爷', team: '小河中心-家庭医生 1 组', type: '基础包', signDate: '2025-12-01', status: '服务中' },
  ];

  return json(ok({ contracts, totalCount: contracts.length }));
}

/* ==================== 三、远程医疗 ==================== */

/** GET /api/v1/telemed/consultations - 远程会诊 */
async function handleTelemedConsultations(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const consults = [
    { id: 'TEL-001', patient: '张演示', dept: '心内科', expert: '浙大一院-心内科 王主任', type: '远程门诊', time: '2026-10-20 09:00', status: '待会诊' },
    { id: 'TEL-002', patient: '李患者', dept: '放射科', expert: '浙大二院-放射科 李主任', type: '远程影像', time: '2026-10-20 10:00', status: '已会诊' },
    { id: 'TEL-003', patient: '王先生', dept: '病理科', expert: '省肿瘤医院-病理科 张主任', type: '远程病理', time: '2026-10-19 14:00', status: '已出报告' },
    { id: 'TEL-004', patient: '赵女士', dept: '妇产科', expert: '省妇保-妇产科 陈主任', type: '远程门诊', time: '2026-10-19 15:00', status: '已会诊' },
    { id: 'TEL-005', patient: '刘大爷', dept: '神经内科', expert: '浙大一院-神经内科 刘主任', type: '远程门诊', time: '2026-10-21 09:00', status: '待会诊' },
  ];

  return json(ok({ consults, totalCount: consults.length }));
}

/** GET /api/v1/telemed/records - 远程病历 */
async function handleTelemedRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'TER-001', patient: '张演示', hospital: '浙大一院（远程）', diagnosis: '冠心病 不稳定型心绞痛', treatment: '建议冠脉造影+支架植入', time: '2026-10-20 09:30' },
    { id: 'TER-002', patient: '李患者', hospital: '浙大二院（远程）', diagnosis: '肺部结节（建议随访）', treatment: '3 个月后复查胸部 CT', time: '2026-10-20 10:30' },
    { id: 'TER-003', patient: '王先生', hospital: '省肿瘤医院（远程）', diagnosis: '结肠腺癌（病理确认）', treatment: '建议手术治疗+辅助化疗', time: '2026-10-19 14:30' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/** GET /api/v1/telemed/devices - 远程设备 */
async function handleTelemedDevices(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const devices = [
    { id: 'TED-001', name: '远程心电监测仪', location: '心内科病房（3 楼）', online: true, todayUploads: 45 },
    { id: 'TED-002', name: '远程血压监测仪', location: '社区卫生服务中心（文晖）', online: true, todayUploads: 120 },
    { id: 'TED-003', name: '远程血糖监测仪', location: '内分泌科门诊（2 楼）', online: false, todayUploads: 0 },
  ];

  return json(ok({ devices, totalCount: devices.length }));
}

/* ==================== 四、病历质控看板 ==================== */

/** GET /api/v1/emr/quality-dashboard - 病历质控看板 */
async function handleEmrQualityDashboard(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    todayReviewed: 156,
    passRate: 92.3,
    defectCount: 12,
    avgDeduction: 3.5,
    pendingDoctors: 8,
    rectificationRate: 78.5,
  }));
}

export const m221Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/preventive/immunizations', handle: handlePreventiveImmunizations, auth: true },
  { method: 'GET', path: '/api/v1/preventive/health-check', handle: handlePreventiveHealthCheck, auth: true },
  { method: 'GET', path: '/api/v1/community/centers', handle: handleCommunityCenters, auth: true },
  { method: 'GET', path: '/api/v1/community/family-doctors', handle: handleCommunityFamilyDoctors, auth: true },
  { method: 'GET', path: '/api/v1/telemed/consultations', handle: handleTelemedConsultations, auth: true },
  { method: 'GET', path: '/api/v1/telemed/records', handle: handleTelemedRecords, auth: true },
  { method: 'GET', path: '/api/v1/telemed/devices', handle: handleTelemedDevices, auth: true },
  { method: 'GET', path: '/api/v1/emr/quality-dashboard', handle: handleEmrQualityDashboard, auth: true },
];
