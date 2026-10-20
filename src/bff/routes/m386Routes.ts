/**
 * 健澜科技 jlmedaios - M386 P1 业务扩展：系统管理配置深度打磨
 *
 * 菜单管理/缓存管理（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/system/menus - 菜单管理 5 条 */
async function handleSystemMenus(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SM-001', menuName: '首页（工作台）', path: '/dashboard', icon: 'home', sort: 1, status: '已启用（当前显示）' },
    { id: 'SM-002', menuName: '门诊管理', path: '/outpatient', icon: 'clinic', sort: 2, status: '已启用（当前显示）' },
    { id: 'SM-003', menuName: '住院管理', path: '/inpatient', icon: 'hospital', sort: 3, status: '已启用（当前显示）' },
    { id: 'SM-004', menuName: '病历管理', path: '/emr', icon: 'file-text', sort: 4, status: '已启用（当前显示）' },
    { id: 'SM-005', menuName: '系统管理', path: '/system', icon: 'setting', sort: 5, status: '已启用（当前显示）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/cache - 缓存管理 5 条 */
async function handleSystemCache(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SC-001', cacheName: '用户会话缓存（Redis）', keyCount: '10,000 个键', size: '50 MB', expireTime: '30 分钟（自动过期）', status: '运行正常（命中率 95%）' },
    { id: 'SC-002', cacheName: '字典数据缓存（Redis）', keyCount: '500 个键', size: '10 MB', expireTime: '24 小时（自动过期）', status: '运行正常（命中率 98%）' },
    { id: 'SC-003', cacheName: '系统配置缓存（Redis）', keyCount: '200 个键', size: '5 MB', expireTime: '1 小时（自动过期）', status: '运行正常（命中率 99%）' },
    { id: 'SC-004', cacheName: '患者信息缓存（Redis）', keyCount: '5,000 个键', size: '20 MB', expireTime: '15 分钟（自动过期）', status: '运行正常（命中率 92%）' },
    { id: 'SC-005', cacheName: '药品库存缓存（Redis）', keyCount: '1,000 个键', size: '8 MB', expireTime: '10 分钟（自动过期）', status: '运行正常（命中率 96%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m386Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/system/menus', handle: handleSystemMenus, auth: true },
  { method: 'GET', path: '/api/v1/system/cache', handle: handleSystemCache, auth: true },
];
