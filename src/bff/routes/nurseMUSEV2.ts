/**
 * 健澜科技 jlmedaios - Nurse MUSE V2 护理智能体路由（M185-C）
 *
 * GET /api/v1/personal-agent/nurse-muse
 *
 * 权限：nurse_muse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildNurseMUSE, type NursingTaskV2 } from '../aggregators/nurseMUSEV2Aggregator.js';

function demoTasks(): NursingTaskV2[] {
  return [
    { taskId: 't1', patientName: '张大爷', taskType: 'infusion', scheduledTime: '09:00', priority: 'high' },
    { taskId: 't2', patientName: '李奶奶', taskType: 'turnover', scheduledTime: '10:00', priority: 'medium' },
    { taskId: 't3', patientName: '王大爷', taskType: 'dressing', scheduledTime: '11:00', priority: 'low' },
    { taskId: 't4', patientName: '赵奶奶', taskType: 'oral_care', scheduledTime: '14:00', priority: 'medium' },
  ];
}

export const nurseMUSEV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/personal-agent/nurse-muse-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'nurse_muse:view');
      if (denied) return denied;

      const nurseId = c.query.get('nurseId') ?? 'nurse-001';
      const result = buildNurseMUSE(nurseId, '2026-10-16', demoTasks());
      return json(ok(result));
    },
  },
];
