/**
 * 健澜科技 jlmedaios - M518 P0 合规重点（智慧服务三级·药品追溯深度）：药品追溯深度监控
 *
 * 字段契约（严格对齐前端 web/src/services/api/pharmacyTraceBoard.ts）：
 *   TraceRow:     { id, name, batch, traceCode, manufacturer, distributor, dept, tempStatus: 'normal'|'abnormal' }
 *   ColdChainRow: { id, name, tempBand: 'ok'|'low'|'high', recordedAt, alarm: boolean }
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/pharmacy/trace - 药品追溯 5 条（结构化枚举） */
async function handlePharmacyTrace(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PT-001', name: '注射用头孢曲松钠', batch: 'B20260815', traceCode: '8123456789012345', manufacturer: '华北制药', distributor: '浙江医药', dept: '静配中心', tempStatus: 'normal' },
    { id: 'PT-002', name: '重组人胰岛素注射液', batch: 'B20260901', traceCode: '8123456789012346', manufacturer: '诺和诺德', distributor: '国药控股浙江', dept: '内分泌科', tempStatus: 'normal' },
    { id: 'PT-003', name: '注射用泮托拉唑钠', batch: 'B20260720', traceCode: '8123456789012347', manufacturer: '杭州中美华东', distributor: '浙江英特药业', dept: '静配中心', tempStatus: 'normal' },
    { id: 'PT-004', name: '盐酸吗啡注射液', batch: 'B20260810', traceCode: '8123456789012348', manufacturer: '东北制药', distributor: '浙江医药', dept: '麻醉科药房', tempStatus: 'normal' },
    { id: 'PT-005', name: '人血白蛋白', batch: 'B20260615', traceCode: '8123456789012349', manufacturer: '上海莱士', distributor: '国药控股浙江', dept: '输血科', tempStatus: 'abnormal' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/cold-chain - 冷链监控 5 条（结构化枚举/布尔） */
async function handlePharmacyColdChain(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PCC-001', name: '重组人胰岛素注射液', tempBand: 'ok', recordedAt: '2026-10-20T14:00:00+08:00', alarm: false },
    { id: 'PCC-002', name: '人血白蛋白', tempBand: 'ok', recordedAt: '2026-10-20T14:00:00+08:00', alarm: false },
    { id: 'PCC-003', name: '注射用头孢曲松钠', tempBand: 'low', recordedAt: '2026-10-20T06:00:00+08:00', alarm: true },
    { id: 'PCC-004', name: '麻精药品', tempBand: 'ok', recordedAt: '2026-10-20T14:00:00+08:00', alarm: false },
    { id: 'PCC-005', name: '乙肝疫苗', tempBand: 'high', recordedAt: '2026-10-19T15:00:00+08:00', alarm: true },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m518Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/trace', handle: handlePharmacyTrace, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/cold-chain', handle: handlePharmacyColdChain, auth: true },
];
