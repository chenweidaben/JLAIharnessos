/**
 * 健澜科技 jlmedaios - M227 护理深度 + 院感深度 + 药事管理
 *
 * 护理交班本/质控明细/压疮评估 + 院感病例详情/监测明细 + 药品详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、护理深度 ==================== */

/** GET /api/v1/nursing/handover - 护理交班本 */
async function handleNursingHandover(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const handovers = [
    { id: 'HND-001', shift: '白班', dept: '心内科', keyPatients: ['12床-冠心病心衰加重', '15床-急性心梗术后'], special: '12床今日需复查心电图', handler: '王护士' },
    { id: 'HND-002', shift: '夜班', dept: '心内科', keyPatients: ['12床-凌晨心电监护正常', '15床-无不适'], special: '无特殊情况', handler: '李护士' },
    { id: 'HND-003', shift: '白班', dept: '普外科', keyPatients: ['08床-胆囊切除术后第2天', '11床-肠梗阻保守治疗'], special: '08床伤口换药', handler: '张护士' },
    { id: 'HND-004', shift: '夜班', dept: '普外科', keyPatients: ['08床-体温正常', '11床-腹痛缓解'], special: '无特殊情况', handler: '赵护士' },
    { id: 'HND-005', shift: '白班', dept: 'ICU', keyPatients: ['01床-多脏器功能衰竭', '03床-术后呼吸机支持'], special: '01床需每小时评估尿量', handler: '孙护士长' },
  ];

  return json(ok({ handovers, totalCount: handovers.length }));
}

/** GET /api/v1/nursing/quality-detail - 护理质控明细 */
async function handleNursingQualityDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    basicNursingPassRate: 98.5,
    specialNursingPassRate: 99.2,
    level1NursingPassRate: 97.8,
    emergencyDrugsIntegrity: 100.0,
    errorIncidentRate: 0.02,
    targets: {
      basicNursing: { target: 95.0, status: '达标' },
      specialNursing: { target: 95.0, status: '达标' },
      level1Nursing: { target: 95.0, status: '达标' },
      emergencyDrugs: { target: 100.0, status: '达标' },
      errorIncident: { target: 0.1, status: '达标' },
    },
  }));
}

/** GET /api/v1/nursing/pressure-ulcer - 压疮评估 */
async function handleNursingPressureUlcer(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const pressureUlcers = [
    { id: 'PU-001', patient: '张演示', stage: 'I 期', area: 4.5, location: '骶尾部', bradenScore: 14, treatment: '减压贴+定时翻身（q2h）' },
    { id: 'PU-002', patient: '李患者', stage: 'II 期', area: 6.0, location: '足跟', bradenScore: 12, treatment: '水胶体敷料+营养支持' },
    { id: 'PU-003', patient: '王先生', stage: 'III 期', area: 12.0, location: '骶尾部', bradenScore: 9, treatment: '清创换药+减压床垫+营养支持' },
    { id: 'PU-004', patient: '赵女士', stage: 'I 期', area: 3.0, location: '髋部', bradenScore: 16, treatment: '减压贴+定时翻身（q2h）' },
    { id: 'PU-005', patient: '刘大爷', stage: 'II 期', area: 5.5, location: '足跟', bradenScore: 13, treatment: '水胶体敷料+定时翻身' },
  ];

  return json(ok({ pressureUlcers, totalCount: pressureUlcers.length }));
}

/* ==================== 二、院感深度 ==================== */

/** GET /api/v1/infection/detail - 院感病例详情 */
async function handleInfectionDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    patient: '张演示',
    infectionSite: '肺部（呼吸机相关性肺炎）',
    pathogen: '鲍曼不动杆菌（多重耐药）',
    drugSensitivity: ['阿米卡星：敏感', '头孢哌酮/舒巴坦：中介', '亚胺培南：耐药'],
    treatmentPlan: '停用亚胺培南，改用阿米卡星+头孢哌酮/舒巴坦联合治疗，加强气道管理',
    outcome: '好转',
  }));
}

/** GET /api/v1/infection/surveillance-detail - 院感监测明细 */
async function handleInfectionSurveillanceDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    handHygieneCompliance: 92.5,
    clabsiRate: 1.2,
    cautiRate: 0.8,
    ssiRate: 1.5,
    mdroDetectionRate: 3.2,
    targets: {
      handHygiene: { current: 92.5, target: 90.0, status: '达标' },
      clabsi: { current: 1.2, target: 1.5, status: '达标' },
      cauti: { current: 0.8, target: 1.0, status: '达标' },
      ssi: { current: 1.5, target: 2.0, status: '达标' },
      mdro: { current: 3.2, target: 5.0, status: '达标' },
    },
  }));
}

/* ==================== 三、药事管理 ==================== */

/** GET /api/v1/pharmacy/detail - 药品详情 */
async function handlePharmacyDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    drugName: '阿司匹林肠溶片',
    spec: '100mg × 30 片',
    dosageForm: '片剂',
    insuranceCategory: '甲类',
    currentStock: 520,
    unitPrice: 0.50,
    manufacturer: '拜耳医药保健有限公司',
    indication: '用于预防心肌梗死复发、中风的二级预防，降低稳定性和不稳定性心绞痛患者的发病风险。',
  }));
}

export const m227Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nursing/handover', handle: handleNursingHandover, auth: true },
  { method: 'GET', path: '/api/v1/nursing/quality-detail', handle: handleNursingQualityDetail, auth: true },
  { method: 'GET', path: '/api/v1/nursing/pressure-ulcer', handle: handleNursingPressureUlcer, auth: true },
  { method: 'GET', path: '/api/v1/infection/detail', handle: handleInfectionDetail, auth: true },
  { method: 'GET', path: '/api/v1/infection/surveillance-detail', handle: handleInfectionSurveillanceDetail, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/detail', handle: handlePharmacyDetail, auth: true },
];
