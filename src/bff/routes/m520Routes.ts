/**
 * 健澜科技 jlmedaios - M520 P0 合规重点（医院管理·放射防护）：放射防护监控 3 端点
 *
 * radiation/doses 放射剂量、radiation/equipment 设备巡检、radiation/personnel 个人剂量计。
 * 走 radiation/ 新前缀；与 M519 /transfusion/*、M518 /pharmacy/*、M517 /anesthesia/*、/outpatient/* 路由区分。
 *
 * 字段结构化铁律（M520 起）：枚举字符串、number、boolean、嵌套对象，禁止拼字符串。
 * 前端直接用 enum map 渲染 Tag、用 number 算 KPI、用 boolean 判断状态。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/radiation/doses - 放射剂量（结构化：examType 枚举、doseMSv 数字）5 条 */
async function handleRadiationDoses(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RD-001', patient: '张**', examType: 'CT' as const, doseMSv: 8.5, dept: '放射科', examDate: '2026-10-20' },
    { id: 'RD-002', patient: '李**', examType: 'DR' as const, doseMSv: 0.2, dept: '放射科', examDate: '2026-10-20' },
    { id: 'RD-003', patient: '王**', examType: 'MRI' as const, doseMSv: 0, dept: '放射科', examDate: '2026-10-19' },
    { id: 'RD-004', patient: '赵**', examType: 'CARM' as const, doseMSv: 12.0, dept: '介入导管室', examDate: '2026-10-19' },
    { id: 'RD-005', patient: '孙**', examType: 'CT' as const, doseMSv: 15.5, dept: '放射科', examDate: '2026-10-18' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiation/equipment - 设备巡检（结构化：deviceType 枚举、status 枚举）5 条 */
async function handleRadiationEquipment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RE-001', deviceName: '西门子 SOMATOM CT', deviceType: 'CT' as const, lastInspectionAt: '2026-10-01', status: 'normal' as const, nextInspectionDue: '2026-11-01' },
    { id: 'RE-002', deviceName: '飞利浦 DigitalDiagnost DR', deviceType: 'DR' as const, lastInspectionAt: '2026-09-15', status: 'normal' as const, nextInspectionDue: '2026-12-15' },
    { id: 'RE-003', deviceName: 'GE Signa MRI', deviceType: 'MRI' as const, lastInspectionAt: '2026-08-20', status: 'attention' as const, nextInspectionDue: '2026-11-20' },
    { id: 'RE-004', deviceName: '飞利浦 Allura Xper CARM', deviceType: 'CARM' as const, lastInspectionAt: '2026-09-01', status: 'abnormal' as const, nextInspectionDue: '2026-10-31' },
    { id: 'RE-005', deviceName: '联影 uCT 760', deviceType: 'CT' as const, lastInspectionAt: '2026-10-10', status: 'normal' as const, nextInspectionDue: '2026-11-10' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiation/personnel - 个人剂量计（结构化：role 枚举、monthlyDoseMSv/limitMSv 数字、overLimit 布尔）5 条 */
async function handleRadiationPersonnel(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RP-001', staffName: '王医师', role: 'radiologist' as const, badgeId: 'BADGE-001', monthlyDoseMSv: 0.8, limitMSv: 20, overLimit: false },
    { id: 'RP-002', staffName: '李护士', role: 'nurse' as const, badgeId: 'BADGE-002', monthlyDoseMSv: 0.3, limitMSv: 20, overLimit: false },
    { id: 'RP-003', staffName: '张技师', role: 'technician' as const, badgeId: 'BADGE-003', monthlyDoseMSv: 1.5, limitMSv: 20, overLimit: false },
    { id: 'RP-004', staffName: '刘医师', role: 'radiologist' as const, badgeId: 'BADGE-004', monthlyDoseMSv: 22.5, limitMSv: 20, overLimit: true },
    { id: 'RP-005', staffName: '陈技师', role: 'technician' as const, badgeId: 'BADGE-005', monthlyDoseMSv: 0.6, limitMSv: 20, overLimit: false },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m520Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/radiation/doses', handle: handleRadiationDoses, auth: true },
  { method: 'GET', path: '/api/v1/radiation/equipment', handle: handleRadiationEquipment, auth: true },
  { method: 'GET', path: '/api/v1/radiation/personnel', handle: handleRadiationPersonnel, auth: true },
];
