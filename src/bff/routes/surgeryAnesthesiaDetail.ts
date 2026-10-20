/**
 * 健澜科技 jlmedaios - 手术麻醉深度补建（M437 DEMO_MODE=1 短路）
 * 说明：schedule/records/recovery/consent 4 个既有接口已 200，
 *       本文件仅补建缺失的 instruments-detail 与 followup-detail。
 *
 * GET /api/v1/surgery/instruments-detail  器械清点
 * GET /api/v1/surgery/followup-detail      术后随访
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

export const surgeryAnesthesiaDetailRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/surgery/instruments-detail',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({
      items: Array.from({ length: 5 }, (_, i) => ({
        id: `surg-ins-${i + 1}`,
        surgeryNo: `SURG-${1000 + i + 1}`,
        instrumentKit: `器械包-${i + 1}`,
        checkResult: i % 2 === 0 ? 'counted' : 'checked',
        nurse: `巡回护士-${i + 1}`,
        time: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
      })),
    })),
  },
  {
    method: 'GET',
    path: '/api/v1/surgery/followup-detail',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({
      items: Array.from({ length: 5 }, (_, i) => ({
        id: `surg-fu-${i + 1}`,
        patient: `患者-${i + 1}`,
        surgeryDate: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
        recovery: i % 2 === 0 ? 'good' : 'fair',
        complication: i % 3 === 0 ? '切口红肿' : '无',
        doctor: `随访医生-${i + 1}`,
      })),
    })),
  },
];