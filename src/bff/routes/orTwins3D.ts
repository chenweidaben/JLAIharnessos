/**
 * 健澜科技 jlmedaios - 数字孪生 3D 手术室路由（M185-B）
 *
 * GET /api/v1/twin3d/or
 *
 * 权限：twin3d:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import {
  buildORTwins3D,
  simulateORFlow,
  type ORRoom,
} from '../aggregators/orTwins3DAggregator.js';

function demoRooms(): ORRoom[] {
  return [
    {
      orId: 'or-1',
      name: '1号手术室',
      status: 'in_surgery',
      scheduledSurgery: '腹腔镜胆囊切除',
      scheduledStartTime: '09:00',
      actualStartTime: '09:20',
      plannedDuration: 90,
      actualElapsed: 75,
      equipment: [
        { name: '麻醉机', status: 'ok' },
        { name: '监护仪', status: 'ok' },
        { name: '腹腔镜', status: 'warning' },
      ],
    },
    {
      orId: 'or-2',
      name: '2号手术室',
      status: 'idle',
      scheduledSurgery: null,
      scheduledStartTime: null,
      actualStartTime: null,
      plannedDuration: 0,
      actualElapsed: 0,
      equipment: [
        { name: '麻醉机', status: 'ok' },
        { name: '监护仪', status: 'ok' },
      ],
    },
    {
      orId: 'or-3',
      name: '3号手术室',
      status: 'preparing',
      scheduledSurgery: '阑尾切除',
      scheduledStartTime: '13:00',
      actualStartTime: null,
      plannedDuration: 60,
      actualElapsed: 0,
      equipment: [
        { name: '麻醉机', status: 'fault' },
        { name: '监护仪', status: 'ok' },
      ],
    },
  ];
}

export const orTwins3DRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/twin3d/or',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'twin3d:view');
      if (denied) return denied;

      const result = buildORTwins3D('2026-10-16', demoRooms());
      const flow = simulateORFlow('2026-10-16', 'or-1');
      return json(ok({ ...result, flow }));
    },
  },
];
