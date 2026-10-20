/**
 * 健澜科技 jlmedaios - M380 P1 业务扩展：检验检查深度打磨
 *
 * 检验项目/检查项目（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/lab/items - 检验项目 5 条 */
async function handleLabItems(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LI-001', itemName: '血常规（五分类）', code: 'LAB-CBC-001', price: '25.00 元', type: '临床检验项目（血液学检验）', status: '已启用（当前有效）' },
    { id: 'LI-002', itemName: '尿常规（干化学）', code: 'LAB-UC-001', price: '15.00 元', type: '临床检验项目（尿液检验）', status: '已启用（当前有效）' },
    { id: 'LI-003', itemName: '肝功能（全套）', code: 'LAB-LFT-001', price: '80.00 元', type: '临床检验项目（生物化学检验）', status: '已启用（当前有效）' },
    { id: 'LI-004', itemName: '肾功能（全套）', code: 'LAB-RFT-001', price: '60.00 元', type: '临床检验项目（生物化学检验）', status: '已启用（当前有效）' },
    { id: 'LI-005', itemName: '血糖（空腹）', code: 'LAB-GLU-001', price: '10.00 元', type: '临床检验项目（生物化学检验）', status: '已启用（当前有效）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/items - 检查项目 5 条 */
async function handleRadiologyItems(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RI-001', itemName: '胸部 X 线正位片', code: 'RAD-CXR-001', price: '80.00 元', type: '放射检查项目（X 线摄影）', status: '已启用（当前有效）' },
    { id: 'RI-002', itemName: '胸部 CT（平扫）', code: 'RAD-CT-001', price: '300.00 元', type: '放射检查项目（计算机断层扫描）', status: '已启用（当前有效）' },
    { id: 'RI-003', itemName: '腹部超声（肝胆胰脾）', code: 'RAD-US-001', price: '120.00 元', type: '放射检查项目（超声检查）', status: '已启用（当前有效）' },
    { id: 'RI-004', itemName: '心电图（12 导联）', code: 'RAD-ECG-001', price: '30.00 元', type: '放射检查项目（心电图检查）', status: '已启用（当前有效）' },
    { id: 'RI-005', itemName: '磁共振成像（MRI）（头颅平扫）', code: 'RAD-MRI-001', price: '800.00 元', type: '放射检查项目（磁共振成像）', status: '已启用（当前有效）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m380Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/lab/items', handle: handleLabItems, auth: true },
  { method: 'GET', path: '/api/v1/radiology/items', handle: handleRadiologyItems, auth: true },
];
