/**
 * 健澜科技 jlmedaios - 家庭医生签约与健康管理（M445 DEMO_MODE=1 短路）
 * 说明：公卫 chronic-followups、体检 archives 已做，本批聚焦基层签约与居民门户。
 *
 * GET /api/v1/family-doctor/contracts         签约合同
 * GET /api/v1/family-doctor/teams             家医团队
 * GET /api/v1/family-doctor/packages         签约服务包
 * GET /api/v1/family-doctor/referrals         双向转诊
 * GET /api/v1/health-manager/resident-portal 居民健康门户
 * GET /api/v1/health-manager/packages-plan  慢病管理包
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `fd-${i + 1}`, ...builder(i + 1) })) };
}

export const fdM445Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/family-doctor/contracts',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ signer: `签约人-${n}`, team: `团队-${n}`, packageType: `包型-${n}`, period: '1年', status: n % 2 === 0 ? 'active' : 'expired' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/family-doctor/teams',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ teamName: `家医团队-${n}`, gpDoctor: `全科医生-${n}`, nurse: `护士-${n}`, publicHealth: `公卫-${n}`, coveredHouseholds: n * 80 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/family-doctor/packages',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ packageName: `服务包-${n}`, includes: `含项-${n}`, price: n * 50, target: `适用人群-${n}`, duration: '12个月' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/family-doctor/referrals',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, direction: n % 2 === 0 ? 'up' : 'down', org: `机构-${n}`, disease: `病种-${n}`, status: n % 2 === 0 ? 'completed' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/health-manager/resident-portal',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ resident: `居民-${n}`, boundDevice: `设备-${n}`, message: `消息-${n}`, serviceRecord: `服务记录-${n}`, loginState: 'online' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/health-manager/packages-plan',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, disease: n % 2 === 0 ? '高血压' : '糖尿病', goal: `管理目标-${n}`, intervention: `干预项-${n}`, manager: `管理医生-${n}` })))),
  },
];