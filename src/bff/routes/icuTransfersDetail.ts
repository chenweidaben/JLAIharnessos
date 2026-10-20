/**
 * 健澜科技 jlmedaios - 重症ICU深度补建（M436 DEMO_MODE=1 短路）
 * 说明：admissions/monitoring/ventilator/critical-events/discharges 5 个既有接口已 200，
 *       本文件仅补建缺失的 transfers-detail。
 *
 * GET /api/v1/icu/transfers-detail  转出记录
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

export const icuTransfersDetailRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/icu/transfers-detail',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok({
      items: Array.from({ length: 5 }, (_, i) => ({
        id: `icu-xfer-${i + 1}`,
        patient: `患者-${i + 1}`,
        targetDept: `转出科室-${i + 1}`,
        destination: `去向-${i + 1}`,
        handover: `交接-${i + 1}`,
        time: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
      })),
    })),
  },
];