/**
 * 健澜科技 jlmedaios - AI 大脑 2.0 住院试点路由（M185-A）
 *
 * GET /api/v1/ai-brain/v2/inpatient?dept=xxx
 *
 * 权限：ai_brain:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInpatientBrainV2 } from '../aggregators/inpatientBrainV2Aggregator.js';

/** 演示数据 */
function demoInput(dept: string) {
  return {
    dept,
    date: '2026-10-16',
    totalBeds: 50,
    occupiedBeds: 46,
    inPatients: 46,
    dischargedToday: 8,
    admittedToday: 6,
    doctors: [
      { doctorId: 'd1', name: '张主任', bedsManaged: 18, ordersToday: 35, surgeriesToday: 2 },
      { doctorId: 'd2', name: '李医生', bedsManaged: 12, ordersToday: 20, surgeriesToday: 1 },
      { doctorId: 'd3', name: '王医生', bedsManaged: 16, ordersToday: 28, surgeriesToday: 3 },
    ],
    nurses: [
      { nurseId: 'n1', name: '陈护士', bedsManaged: 10, nursingActionsToday: 45 },
      { nurseId: 'n2', name: '林护士', bedsManaged: 8, nursingActionsToday: 35 },
    ],
  };
}

export const inpatientBrainV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/ai-brain/v2/inpatient',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'ai_brain:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '内科';
      const result = buildInpatientBrainV2(demoInput(dept));
      return json(ok(result));
    },
  },
];
