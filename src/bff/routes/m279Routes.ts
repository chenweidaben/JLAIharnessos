/**
 * 健澜科技 jlmedaios - M279 业务域扩展
 *
 * 护理查房/生命体征/药房发药/输血申请/知情同意/病历归档
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/nursing/ward-rounds - 护理查房记录 5 条 */
async function handleNursingWardRounds(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const rounds = [
    { id: 'WR-001', patient: '张***', nurse: '陈护士', time: '2026-10-20 08:30', measure: '检查术后切口敷料，更换引流袋', note: '切口愈合良好，无渗液' },
    { id: 'WR-002', patient: '李***', nurse: '刘护士', time: '2026-10-20 09:00', measure: '测量血糖并记录', note: '空腹血糖 7.2mmol/L，已通知医生' },
    { id: 'WR-003', patient: '王***', nurse: '王护士', time: '2026-10-20 09:30', measure: '协助翻身，预防压疮', note: '皮肤完整，减压贴使用中' },
    { id: 'WR-004', patient: '赵***', nurse: '孙护士', time: '2026-10-20 10:00', measure: '雾化吸入指导', note: '患者配合良好' },
    { id: 'WR-005', patient: '陈***', nurse: '周护士', time: '2026-10-20 10:30', measure: '观察输液部位有无渗漏', note: '输液通畅，无红肿' },
  ];
  return json(ok({ rounds, totalCount: rounds.length }));
}

/** GET /api/v1/nursing/vitals - 生命体征记录 5 条 */
async function handleNursingVitals(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const vitals = [
    { id: 'NV-001', patient: '张***', temperature: '36.8℃', pulse: '72 次/分', respiration: '18 次/分', bloodPressure: '128/82 mmHg', time: '2026-10-20 08:00' },
    { id: 'NV-002', patient: '李***', temperature: '37.2℃', pulse: '80 次/分', respiration: '20 次/分', bloodPressure: '135/85 mmHg', time: '2026-10-20 08:00' },
    { id: 'NV-003', patient: '王***', temperature: '36.5℃', pulse: '68 次/分', respiration: '16 次/分', bloodPressure: '120/75 mmHg', time: '2026-10-20 08:30' },
    { id: 'NV-004', patient: '赵***', temperature: '38.5℃', pulse: '95 次/分', respiration: '22 次/分', bloodPressure: '145/90 mmHg', time: '2026-10-20 09:00' },
    { id: 'NV-005', patient: '陈***', temperature: '36.7℃', pulse: '75 次/分', respiration: '18 次/分', bloodPressure: '130/80 mmHg', time: '2026-10-20 09:30' },
  ];
  return json(ok({ vitals, totalCount: vitals.length }));
}

/** GET /api/v1/pharmacy/dispense - 药房发药记录 5 条 */
async function handlePharmacyDispense(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const records = [
    { id: 'PD-001', rxNo: 'RX-20261020-001', patient: '张***', medication: '阿司匹林肠溶片 100mg×30片', pharmacist: '李药师', time: '2026-10-20 09:00' },
    { id: 'PD-002', rxNo: 'RX-20261020-002', patient: '李***', medication: '二甲双胍片 0.5g×60片', pharmacist: '王药师', time: '2026-10-20 09:30' },
    { id: 'PD-003', rxNo: 'RX-20261020-003', patient: '王***', medication: '阿托伐他汀钙片 20mg×14片', pharmacist: '张药师', time: '2026-10-20 10:00' },
    { id: 'PD-004', rxNo: 'RX-20261020-004', patient: '赵***', medication: '头孢呋辛酯片 0.25g×12片', pharmacist: '刘药师', time: '2026-10-20 10:30' },
    { id: 'PD-005', rxNo: 'RX-20261020-005', patient: '陈***', medication: '布洛芬缓释胶囊 0.3g×20粒', pharmacist: '陈药师', time: '2026-10-20 11:00' },
  ];
  return json(ok({ records, totalCount: records.length }));
}

/** GET /api/v1/transfusion/list - 输血申请列表 5 条 */
async function handleTransfusionList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const requests = [
    { id: 'TR-001', applyNo: 'TF-20261020-001', patient: '王***', bloodType: 'A 型 Rh 阳性', amount: '悬浮红细胞 2U', status: '已发血' },
    { id: 'TR-002', applyNo: 'TF-20261020-002', patient: '李***', bloodType: 'O 型 Rh 阳性', amount: '血浆 400ml', status: '配血中' },
    { id: 'TR-003', applyNo: 'TF-20261020-003', patient: '张***', bloodType: 'B 型 Rh 阳性', amount: '血小板 1治疗量', status: '已发血' },
    { id: 'TR-004', applyNo: 'TF-20261020-004', patient: '赵***', bloodType: 'AB 型 Rh 阴性', amount: '悬浮红细胞 4U', status: '待发血' },
    { id: 'TR-005', applyNo: 'TF-20261020-005', patient: '陈***', bloodType: 'A 型 Rh 阳性', amount: '全血 200ml', status: '已输完' },
  ];
  return json(ok({ requests, totalCount: requests.length }));
}

/** GET /api/v1/consent/list - 知情同意书列表 5 条 */
async function handleConsentList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const consents = [
    { id: 'CL-001', patient: '王***', consentType: '手术知情同意书（腹腔镜胆囊切除术）', signTime: '2026-10-19 16:00', doctor: '陈***', status: '已签署' },
    { id: 'CL-002', patient: '张***', consentType: '介入治疗知情同意书（冠脉支架植入）', signTime: '2026-10-20 08:00', doctor: '李***', status: '已签署' },
    { id: 'CL-003', patient: '赵***', consentType: '输血治疗知情同意书', signTime: '2026-10-20 09:00', doctor: '周***', status: '已签署' },
    { id: 'CL-004', patient: '李***', consentType: '特殊检查知情同意书（MRI 增强）', signTime: '2026-10-20 10:00', doctor: '刘***', status: '待签署' },
    { id: 'CL-005', patient: '孙***', consentType: '麻醉知情同意书', signTime: '2026-10-20 11:00', doctor: '郑***', status: '已签署' },
  ];
  return json(ok({ consents, totalCount: consents.length }));
}

/** GET /api/v1/records/archive - 病历归档记录 5 条 */
async function handleRecordsArchive(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const records = [
    { id: 'RA-001', recordNo: 'EMR-2026-101', patient: '王***', archiveTime: '2026-10-18 17:00', archiveRoom: '病案室 A 架 3 层', status: '已归档' },
    { id: 'RA-002', recordNo: 'EMR-2026-102', patient: '李***', archiveTime: '2026-10-19 16:30', archiveRoom: '病案室 A 架 4 层', status: '已归档' },
    { id: 'RA-003', recordNo: 'EMR-2026-103', patient: '张***', archiveTime: '2026-10-20 10:00', archiveRoom: '—', status: '待归档' },
    { id: 'RA-004', recordNo: 'EMR-2026-104', patient: '赵***', archiveTime: '2026-10-20 11:00', archiveRoom: '—', status: '待归档' },
    { id: 'RA-005', recordNo: 'EMR-2026-105', patient: '陈***', archiveTime: '2026-10-15 15:00', archiveRoom: '病案室 B 架 2 层', status: '已归档' },
  ];
  return json(ok({ records, totalCount: records.length }));
}

export const m279Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nursing/ward-rounds', handle: handleNursingWardRounds, auth: true },
  { method: 'GET', path: '/api/v1/nursing/vitals', handle: handleNursingVitals, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/dispense', handle: handlePharmacyDispense, auth: true },
  { method: 'GET', path: '/api/v1/transfusion/list', handle: handleTransfusionList, auth: true },
  { method: 'GET', path: '/api/v1/consent/list', handle: handleConsentList, auth: true },
  { method: 'GET', path: '/api/v1/records/archive', handle: handleRecordsArchive, auth: true },
];
