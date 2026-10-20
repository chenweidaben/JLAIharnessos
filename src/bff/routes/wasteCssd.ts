/**
 * 健澜科技 jlmedaios - 医疗废物与消毒供应中心（M459B DEMO_MODE=1 短路）
 * 说明：避开 M444 院感监测、M455 耗材库存、M443 后勤设备；/cssd/sterilization 既有(m212)原样保留。
 * 独立新文件，不改动任何既有路由。
 *
 * GET /api/v1/waste/collection       医废收集
 * GET /api/v1/waste/transport       医废转运
 * GET /api/v1/waste/storage         暂存库管理
 * GET /api/v1/cssd/packaging         消毒包
 * GET /api/v1/cssd/traceability     SPD追溯
 * （/api/v1/cssd/sterilization 灭菌记录已由 m212 提供，不重复建）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `wc-${i + 1}`, ...builder(i + 1) })) };
}

export const wasteCssdM459BRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/waste/collection',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ batchNo: `WC-C${47000 + n}`, department: `科室-${n}`, category: `类别-${n}`, weightKg: n * 1.5, collector: `收集人-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/waste/transport',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ transportNo: `WC-T${48000 + n}`, origin: `起点-${n}`, destination: `终点-${n}`, weightKg: n * 2, transporter: `转运人-${n}`, time: new Date(Date.now() - n * 3600000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/waste/storage',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) =>({ storagePoint: `暂存点-${n}`, stock: n * 3, inboundAt: new Date(Date.now() - n * 86400000).toISOString(), handover: `交接记录-${n}` })))),
  },
  {
    method: 'GET',
    path: '/api/v1/cssd/packaging',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ packNo: `PK-${49000 + n}`, instrumentList: `器械清单-${n}`, packer: `包装人-${n}`, sterilBatch: `灭菌批次-${n}`, expiry: new Date(Date.now() + n * 86400000).toISOString().slice(0, 10) })))),
  },
  {
    method: 'GET',
    path: '/api/v1/cssd/traceability',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ packNo: `PK-${50000 + n}`, useDept: `使用科室-${n}`, usePatient: `使用患者-${n}`, recycler: `回收人-${n}`, closedLoop: n % 2 === 0 ? 'closed' : 'open' })))),
  },
];