/**
 * 健澜科技 jlmedaios - 行政办公协同（M456 DEMO_MODE=1 短路）
 * 说明：避开 M451 KPI、M452 审计日志、M447 通知中心；独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/admin/official-docs       公文流转
 * GET /api/v1/admin/meetings            会议管理
 * GET /api/v1/admin/announcements        通知公告
 * GET /api/v1/admin/duty-roster         行政值班排班
 * GET /api/v1/admin/vehicle-dispatch     车辆调度
 * GET /api/v1/admin/general-procurement 通用采购申请（区别于耗材采购单）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `ao-${i + 1}`, ...builder(i + 1) })) };
}

export const adminOfficeM456Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/official-docs',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ docNo: `JLAN-${35000 + n}`, title: `公文标题-${n}`, drafter: `拟稿人-${n}`, flowStatus: n % 2 === 0 ? 'circulating' : 'archived', date: new Date(Date.now() - n * 86400000).toISOString().slice(0, 10) })))),
  },
  {
    method: 'GET',
    path: '/api/v1/admin/meetings',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ meetingNo: `MT-${36000 + n}`, topic: `会议主题-${n}`, time: new Date(Date.now() + n * 86400000).toISOString(), location: `会议室-${n}`, attendees: `参会人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/admin/announcements',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ annNo: `AN-${37000 + n}`, title: `公告标题-${n}`, dept: `发布部门-${n}`, audience: `受众-${n}`, publishedAt: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/admin/duty-roster',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ onDuty: `值班人-${n}`, date: new Date(Date.now() + n * 86400000).toISOString().slice(0, 10), shift: n % 2 === 0 ? '白班' : '夜班', phone: `1380000000${n}`, substitute: `替班人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/admin/vehicle-dispatch',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ dispatchNo: `VD-${38000 + n}`, requester: `用车人-${n}`, destination: `目的地-${n}`, driver: `司机-${n}`, status: n % 2 === 0 ? 'dispatched' : 'completed' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/admin/general-procurement',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ reqNo: `GP-${39000 + n}`, item: `品项-${n}`, qty: n * 2, budget: n * 5000, approvalStatus: n % 2 === 0 ? 'approved' : 'pending' })))),
  },
];