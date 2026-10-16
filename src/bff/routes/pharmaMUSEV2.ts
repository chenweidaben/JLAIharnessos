/**
 * 健澜科技 jlmedaios - Pharma MUSE V2 药事智能体路由（M185-D）
 *
 * GET /api/v1/personal-agent/pharma-muse-v2
 *
 * 权限：pharma_muse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPharmaMUSE, type DrugInventoryV2 } from '../aggregators/pharmaMUSEV2Aggregator.js';

const demoDrugs = ['warfarin', 'aspirin', 'metformin'];
const demoInventory: DrugInventoryV2[] = [
  { drugName: '华法林', currentStock: 5, minStock: 20, expiryMonths: 6 },
  { drugName: '阿司匹林', currentStock: 100, minStock: 50, expiryMonths: 2 },
];

export const pharmaMUSEV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/personal-agent/pharma-muse-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'pharma_muse:view');
      if (denied) return denied;

      const pharmacistId = c.query.get('pharmacistId') ?? 'pharmacist-001';
      const result = buildPharmaMUSE(pharmacistId, '2026-10-16', demoDrugs, demoInventory);
      return json(ok(result));
    },
  },
];
