/**
 * 健澜科技 jlmedaios - 自助服务终端设备管理（M458 DEMO_MODE=1 短路）
 * 说明：避开 M454 门户自助、M457 排队叫号、M439 挂号、M442 收费；独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/kiosk/registration     自助挂号机
 * GET /api/v1/kiosk/checkin          自助报到机
 * GET /api/v1/kiosk/payment          自助缴费机
 * GET /api/v1/kiosk/print            报告打印终端
 * GET /api/v1/kiosk/guide-screen     院内导览屏
 * GET /api/v1/kiosk/bedside-panel    床旁终端屏
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `ks-${i + 1}`, ...builder(i + 1) })) };
}

export const kioskM458Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/kiosk/registration',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ terminalNo: `K-RG-${42000 + n}`, location: `位置-${n}`, todayRegs: 30 + n * 5, status: n % 2 === 0 ? 'online' : 'offline', maintainer: `维护人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/kiosk/checkin',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ terminalNo: `K-CI-${43000 + n}`, department: `科室-${n}`, checkins: 20 + n * 4, status: n % 2 === 0 ? 'online' : 'maintenance', lastUsed: new Date(Date.now() - n * 60000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/kiosk/payment',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ terminalNo: `K-PY-${44000 + n}`, location: `位置-${n}`, txnCount: 15 + n * 3, amountTotal: n * 800, status: n % 2 === 0 ? 'online' : 'offline' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/kiosk/print',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ terminalNo: `K-PR-${45000 + n}`, department: `科室-${n}`, pages: 40 + n * 6, paperOut: n % 2 === 0, lastMaintain: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/kiosk/guide-screen',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ screenNo: `GS-${46000 + n}`, location: `位置-${n}`, content: `导览内容-${n}`, playing: n % 2 === 0, updatedAt: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/kiosk/bedside-panel',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ bedNo: `床-${n}`, ward: `病区-${n}`, modules: `功能模块-${n}`, online: n % 2 === 0, lastActive: new Date(Date.now() - n * 300000).toISOString() })))),
  },
];