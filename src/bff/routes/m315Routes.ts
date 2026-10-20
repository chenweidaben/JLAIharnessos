/**
 * 健澜科技 jlmedaios - M315 病历管理域
 *
 * 病历归档/病历调阅/病历打印/病历复印/病历盖章/病历水印
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/medical-records/archive - 病历归档 5 条 */
async function handleMedicalRecordsArchive(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRA-001', recordNo: 'BL-2026-001234', patient: '王***', archiveTime: '2026-10-15 10:30', location: '病案室 A 架-12 层', status: '已归档' },
    { id: 'MRA-002', recordNo: 'BL-2026-001235', patient: '李***', archiveTime: '2026-10-15 11:00', location: '病案室 A 架-12 层', status: '已归档' },
    { id: 'MRA-003', recordNo: 'BL-2026-001236', patient: '张***', archiveTime: '2026-10-16 09:15', location: '病案室 B 架-08 层', status: '已归档' },
    { id: 'MRA-004', recordNo: 'BL-2026-001237', patient: '赵***', archiveTime: '2026-10-16 14:20', location: '病案室 B 架-09 层', status: '待归档（出院 7 天内）' },
    { id: 'MRA-005', recordNo: 'BL-2026-001238', patient: '孙***', archiveTime: '2026-10-17 08:45', location: '病案室 C 架-03 层', status: '已归档' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/medical-records/retrieve - 病历调阅 5 条 */
async function handleMedicalRecordsRetrieve(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRR-001', recordNo: 'BL-2026-001200', applicant: '医务科 陈***', retrieveTime: '2026-10-20 09:00', purpose: '医疗质量检查', status: '已借出（7 日内归还）' },
    { id: 'MRR-002', recordNo: 'BL-2026-001201', applicant: '医保办 王***', retrieveTime: '2026-10-19 14:30', purpose: '医保结算审核', status: '已归还' },
    { id: 'MRR-003', recordNo: 'BL-2026-001202', applicant: '骨科 李***主任医师', retrieveTime: '2026-10-18 10:15', purpose: '病例讨论/科研', status: '已归还' },
    { id: 'MRR-004', recordNo: 'BL-2026-001203', applicant: '法务科 赵***', retrieveTime: '2026-10-21 08:30', purpose: '医疗纠纷处理', status: '待审批' },
    { id: 'MRR-005', recordNo: 'BL-2026-001204', applicant: '信息科 孙***', retrieveTime: '2026-10-17 16:00', purpose: '病历数字化扫描', status: '已归还' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/medical-records/print - 病历打印 5 条 */
async function handleMedicalRecordsPrint(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRP-001', recordNo: 'BL-2026-001210', copies: '2 份', printer: '病案室 吴***', time: '2026-10-20 10:00', purpose: '患者出院小结打印' },
    { id: 'MRP-002', recordNo: 'BL-2026-001211', copies: '1 份', printer: '病案室 郑***', time: '2026-10-19 15:30', purpose: '门诊病历打印（医生工作站）' },
    { id: 'MRP-003', recordNo: 'BL-2026-001212', copies: '3 份', printer: '病案室 吴***', time: '2026-10-18 11:20', purpose: '住院病历全套打印（医保审核用）' },
    { id: 'MRP-004', recordNo: 'BL-2026-001213', copies: '1 份', printer: '病案室 王***', time: '2026-10-17 09:45', purpose: '检验报告打印' },
    { id: 'MRP-005', recordNo: 'BL-2026-001214', copies: '2 份', printer: '病案室 郑***', time: '2026-10-16 14:15', purpose: '手术记录打印（科室留存）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/medical-records/copy - 病历复印 5 条 */
async function handleMedicalRecordsCopy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRC-001', recordNo: 'BL-2026-001220', applicant: '王***（患者本人）', copies: '5 份', time: '2026-10-20 09:30', fee: '25.00 元（按页收费）' },
    { id: 'MRC-002', recordNo: 'BL-2026-001221', applicant: '李***（患者家属，授权委托）', copies: '3 份', time: '2026-10-19 14:00', fee: '15.00 元' },
    { id: 'MRC-003', recordNo: 'BL-2026-001222', applicant: '保险公司（理赔用）', copies: '10 份', time: '2026-10-18 10:30', fee: '50.00 元' },
    { id: 'MRC-004', recordNo: 'BL-2026-001223', applicant: '张***（患者本人，医保报销用）', copies: '2 份', time: '2026-10-17 16:30', fee: '10.00 元' },
    { id: 'MRC-005', recordNo: 'BL-2026-001224', applicant: '法院（诉讼用，公函调取）', copies: '15 份', time: '2026-10-16 11:00', fee: '0 元（司法调取免费）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/medical-records/seal - 病历盖章 5 条 */
async function handleMedicalRecordsSeal(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRS-001', recordNo: 'BL-2026-001230', sealType: '复印专用章', applicant: '王***（患者本人）', time: '2026-10-20 10:15', status: '已盖章' },
    { id: 'MRS-002', recordNo: 'BL-2026-001231', sealType: '出院诊断证明章', applicant: '李***（患者家属）', time: '2026-10-19 15:00', status: '已盖章' },
    { id: 'MRS-003', recordNo: 'BL-2026-001232', sealType: '医疗纠纷专用章', applicant: '法务科 赵***', time: '2026-10-18 09:30', status: '已盖章' },
    { id: 'MRS-004', recordNo: 'BL-2026-001233', sealType: '医保审核专用章', applicant: '医保办 王***', time: '2026-10-17 14:45', status: '待盖章' },
    { id: 'MRS-005', recordNo: 'BL-2026-001234', sealType: '病历复印骑缝章', applicant: '保险公司理赔员', time: '2026-10-16 11:20', status: '已盖章' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/medical-records/watermark - 病历水印 5 条 */
async function handleMedicalRecordsWatermark(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRW-001', recordNo: 'BL-2026-001240', watermark: '仅供医保审核使用 | 健澜科技附属医院 | 2026-10-20', applicant: '医保办 王***', time: '2026-10-20 09:00', status: '已添加' },
    { id: 'MRW-002', recordNo: 'BL-2026-001241', watermark: '复印无效 | 健澜科技附属医院 | 病案室', applicant: '病案室 吴***', time: '2026-10-19 14:30', status: '已添加' },
    { id: 'MRW-003', recordNo: 'BL-2026-001242', watermark: '仅供商业保险理赔使用 | 2026-10-18', applicant: '保险公司理赔员', time: '2026-10-18 10:00', status: '已添加' },
    { id: 'MRW-004', recordNo: 'BL-2026-001243', watermark: '科研使用（脱敏后） | 健澜科技附属医院', applicant: '科研科 李***', time: '2026-10-17 16:15', status: '待添加' },
    { id: 'MRW-005', recordNo: 'BL-2026-001244', watermark: '司法调取件 | 健澜科技附属医院 | 2026-10-16', applicant: '法务科 赵***', time: '2026-10-16 11:30', status: '已添加' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m315Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/medical-records/archive', handle: handleMedicalRecordsArchive, auth: true },
  { method: 'GET', path: '/api/v1/medical-records/retrieve', handle: handleMedicalRecordsRetrieve, auth: true },
  { method: 'GET', path: '/api/v1/medical-records/print', handle: handleMedicalRecordsPrint, auth: true },
  { method: 'GET', path: '/api/v1/medical-records/copy', handle: handleMedicalRecordsCopy, auth: true },
  { method: 'GET', path: '/api/v1/medical-records/seal', handle: handleMedicalRecordsSeal, auth: true },
  { method: 'GET', path: '/api/v1/medical-records/watermark', handle: handleMedicalRecordsWatermark, auth: true },
];
