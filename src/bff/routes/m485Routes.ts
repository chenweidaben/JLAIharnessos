/**
 * 健澜科技 jlmedaios - M485 P0 合规：病案统计 + 病案编码质量（新前缀 /medical-record/）
 *
 * 病案统计（甲级率/乙级率/丙级率/平均住院日）/ 病案编码质量（ICD-10·ICD-9-CM-3 准确率）
 * （research/projects、papers、patents、awards 已存在，不重复建）。
 * 避开 M464·M478 research 既有、M457 coding 既有、M472·M473·M475 病案既有、M483b hr、M484 pharmacy·hr、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/medical-record/stats - 病案统计（科室/甲级率/乙级率/丙级率/平均住院日）5 条 */
async function handleMedicalRecordStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRS-001', dept: '科室：全院病案质量汇总（本月归档 3,860 份）', gradeA: '甲级率：96.8%', gradeB: '乙级率：3.0%（限期整改后归档）', gradeC: '丙级率：0.2%（2 份，已退回科室重写）', los: '平均住院日：8.6 天（同比缩短 0.4 天）' },
    { id: 'MRS-002', dept: '科室：心血管内科', gradeA: '甲级率：98.2%', gradeB: '乙级率：1.8%', gradeC: '丙级率：0%', los: '平均住院日：7.2 天（介入后周转快）' },
    { id: 'MRS-003', dept: '科室：骨科', gradeA: '甲级率：95.0%', gradeB: '乙级率：4.8%', gradeC: '丙级率：0.2%（1 份手术记录缺项）', los: '平均住院日：11.5 天（术后康复周期）' },
    { id: 'MRS-004', dept: '科室：神经内科', gradeA: '甲级率：97.0%', gradeB: '乙级率：3.0%', gradeC: '丙级率：0%', los: '平均住院日：9.8 天' },
    { id: 'MRS-005', dept: '科室：儿科', gradeA: '甲级率：98.0%', gradeB: '乙级率：2.0%', gradeC: '丙级率：0%', los: '平均住院日：5.2 天（周转快）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/medical-record/coding - 病案编码质量（科室/ICD-10 准确率/ICD-9-CM-3 准确率/编码错误数）5 条 */
async function handleMedicalRecordCoding(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MRC-001', dept: '科室：全院编码质量汇总（病案室复核 3,860 份）', icd10: 'ICD-10 编码准确率：96.5%', icd9: 'ICD-9-CM-3 手术编码准确率：95.8%', errors: '编码错误数：138 条（已退回修正，主要为主诊断选择不当）' },
    { id: 'MRC-002', dept: '科室：心血管内科（含介入）', icd10: 'ICD-10 准确率：97.8%', icd9: 'ICD-9-CM-3 准确率：96.5%', errors: '编码错误数：26 条（介入操作编码映射需细化）' },
    { id: 'MRC-003', dept: '科室：骨科', icd10: 'ICD-10 准确率：95.0%', icd9: 'ICD-9-CM-3 准确率：94.0%（术式细分易错）', errors: '编码错误数：42 条（内固定/关节置换术式编码）' },
    { id: 'MRC-004', dept: '科室：神经外科', icd10: 'ICD-10 准确率：96.2%', icd9: 'ICD-9-CM-3 准确率：95.5%', errors: '编码错误数：20 条' },
    { id: 'MRC-005', dept: '科室：妇产科', icd10: 'ICD-10 准确率：97.0%', icd9: 'ICD-9-CM-3 准确率：96.8%', errors: '编码错误数：18 条（产科并发症编码）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m485Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/medical-record/stats', handle: handleMedicalRecordStats, auth: true },
  { method: 'GET', path: '/api/v1/medical-record/coding', handle: handleMedicalRecordCoding, auth: true },
];
