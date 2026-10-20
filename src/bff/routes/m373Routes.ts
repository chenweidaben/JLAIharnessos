/**
 * 健澜科技 jlmedaios - M373 P1 业务扩展：急诊急救深度打磨
 *
 * 灾害救援（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emergency/disaster - 灾害救援 5 条 */
async function handleEmergencyDisaster(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ED-001', event: '2026 年杭州西湖区交通事故（多车连环相撞）', location: '杭州市西湖区文三路（事故地点）', casualties: '10 人（伤员总数：轻伤 8 人、重伤 2 人）', rescueForce: '本院急诊科派出 5 名医生、3 辆救护车（已到达现场）', time: '2026-10-20 09:00:00（事故发生时间）' },
    { id: 'ED-002', event: '2026 年杭州拱墅区火灾事故（居民楼火灾）', location: '杭州市拱墅区某某小区（事故地点）', casualties: '5 人（伤员总数：轻伤 4 人、重伤 1 人）', rescueForce: '本院急诊科派出 3 名医生、2 辆救护车（已到达现场）', time: '2026-10-20 10:00:00（事故发生时间）' },
    { id: 'ED-003', event: '2026 年杭州余杭区食物中毒事件（学校集体食物中毒）', location: '杭州市余杭区某某学校（事故地点）', casualties: '50 人（伤员总数：轻度中毒 45 人、中度中毒 5 人）', rescueForce: '本院急诊科派出 10 名医生、5 辆救护车（已到达现场）', time: '2026-10-20 11:00:00（事故发生时间）' },
    { id: 'ED-004', event: '2026 年杭州滨江区地震（轻微地震）', location: '杭州市滨江区（震中地点）', casualties: '0 人（无人员伤亡）', rescueForce: '本院急诊科待命（未派出救援力量）', time: '2026-10-20 14:00:00（地震发生时间）' },
    { id: 'ED-005', event: '2026 年杭州萧山区洪水灾害（暴雨引发洪水）', location: '杭州市萧山区某某街道（灾害地点）', casualties: '15 人（伤员总数：轻伤 12 人、重伤 3 人）', rescueForce: '本院急诊科派出 8 名医生、4 辆救护车（已到达现场）', time: '2026-10-20 15:00:00（灾害发生时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m373Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emergency/disaster', handle: handleEmergencyDisaster, auth: true },
];
