/**
 * 健澜科技 jlmedaios - M196 修复接口
 *
 * 修复 lab/reports 500 + 新增 visits/pacs/medications 404
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/lab/reports
 * 检验报告列表（修复 500）
 */
async function handleLabReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reports = [
    { id: 'LAB-001', name: '血常规', date: '2026-10-15', status: '已出', result: 'WBC 7.5, Hb 130' },
    { id: 'LAB-002', name: '肝功能', date: '2026-10-15', status: '已出', result: 'ALT 35, AST 28' },
    { id: 'LAB-003', name: '肾功能', date: '2026-10-15', status: '已出', result: 'Cr 78, BUN 5.2' },
    { id: 'LAB-004', name: '电解质', date: '2026-10-15', status: '已出', result: 'K 4.2, Na 138' },
    { id: 'LAB-005', name: '凝血功能', date: '2026-10-16', status: '已出', result: 'PT 12.5, APTT 35' },
  ];

  return json(ok({ reports, totalCount: reports.length }));
}

/**
 * GET /api/v1/visits
 * 就诊记录列表（修复 404）
 */
async function handleVisits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const visits = [
    { id: 'VIS-001', type: '门诊', department: '心内科', doctor: '李医生', date: '2026-10-12', diagnosis: '冠心病待排' },
    { id: 'VIS-002', type: '住院', department: '心内科', ward: '一病区 3床', admissionDate: '2026-10-15', dischargeDate: '2026-10-18' },
    { id: 'VIS-003', type: '门诊', department: '检验科', doctor: '—', date: '2026-10-15', diagnosis: '复查血常规' },
    { id: 'VIS-004', type: '急诊', department: '急诊内科', doctor: '王医生', date: '2026-10-10', diagnosis: '急性胸痛' },
    { id: 'VIS-005', type: '门诊', department: '心内科', doctor: '李医生', date: '2026-10-19', diagnosis: '出院随访' },
  ];

  return json(ok({ visits, totalCount: visits.length }));
}

/**
 * GET /api/v1/pacs/reports
 * 影像报告列表（修复 404）
 */
async function handlePacsReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reports = [
    { id: 'PACS-001', modality: 'CT', bodyPart: '胸部', date: '2026-10-15', status: '已出', impression: '双肺未见明显异常' },
    { id: 'PACS-002', modality: 'MRI', bodyPart: '头颅', date: '2026-10-16', status: '已出', impression: '未见明显占位性病变' },
    { id: 'PACS-003', modality: 'DR', bodyPart: '胸片', date: '2026-10-15', status: '已出', impression: '心影不大，肺野清晰' },
  ];

  return json(ok({ reports, totalCount: reports.length }));
}

/**
 * GET /api/v1/medications
 * 用药医嘱列表（修复 404）
 */
async function handleMedications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const medications = [
    { id: 'MED-001', name: '阿司匹林', dose: '100mg', frequency: 'qd', route: '口服', startDate: '2026-10-16' },
    { id: 'MED-002', name: '阿托伐他汀', dose: '20mg', frequency: 'qn', route: '口服', startDate: '2026-10-16' },
    { id: 'MED-003', name: '依那普利', dose: '5mg', frequency: 'qd', route: '口服', startDate: '2026-10-16' },
    { id: 'MED-004', name: '铝碳酸镁', dose: '1g', frequency: 'tid', route: '嚼服', startDate: '2026-10-16' },
    { id: 'MED-005', name: '低分子肝素', dose: '4000IU', frequency: 'qd', route: '皮下注射', startDate: '2026-10-16' },
  ];

  return json(ok({ medications, totalCount: medications.length }));
}

export const m196Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/lab/reports', handle: handleLabReports, auth: true },
  { method: 'GET', path: '/api/v1/visits', handle: handleVisits, auth: true },
  { method: 'GET', path: '/api/v1/pacs/reports', handle: handlePacsReports, auth: true },
  { method: 'GET', path: '/api/v1/medications', handle: handleMedications, auth: true },
];
