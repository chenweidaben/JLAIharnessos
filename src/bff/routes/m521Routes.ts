/**
 * 健澜科技 jlmedaios - M521 P0 合规重点（智慧服务三级·急诊预检分诊）：急诊预检分诊分级监控 2 端点缺口
 *
 * emergency/triage 预检分诊（已 200 不重建）、emergency/waiting 候诊、emergency/accuracy 分诊准确率。
 * 走 emergency/ 新前缀；与 M520 /radiation/*、M519 /transfusion/*、M518 /pharmacy/*、/outpatient/* 路由区分。
 *
 * 字段结构化铁律：枚举字符串、number、boolean，禁止拼字符串。
 * level: level1 红 / level2 橙 / level3 黄 / level4 绿 / level5 蓝（前端 enum map 渲染，后端不拼颜色词）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emergency/waiting - 候诊（level 枚举、waitedMin 数字、inWaiting 布尔）5 条 */
async function handleEmergencyWaiting(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EW-001', patient: '张**', level: 'level1' as const, waitedMin: 2, chiefComplaint: '胸痛 30min', inWaiting: true },
    { id: 'EW-002', patient: '李**', level: 'level2' as const, waitedMin: 8, chiefComplaint: '高热 39.5℃', inWaiting: true },
    { id: 'EW-003', patient: '王**', level: 'level3' as const, waitedMin: 25, chiefComplaint: '腹痛 2h', inWaiting: true },
    { id: 'EW-004', patient: '赵**', level: 'level4' as const, waitedMin: 45, chiefComplaint: '普通感冒', inWaiting: true },
    { id: 'EW-005', patient: '孙**', level: 'level5' as const, waitedMin: 60, chiefComplaint: '体检咨询', inWaiting: false },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/accuracy - 分诊准确率（totalTriage/correctTriage/accuracyRate 均为数字，accuracyRate 单位 %）5 条 */
async function handleEmergencyAccuracy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EA-001', dept: '急诊内科', totalTriage: 1250, correctTriage: 1188, accuracyRate: 95.0, month: '2026-09' },
    { id: 'EA-002', dept: '急诊外科', totalTriage: 980, correctTriage: 921, accuracyRate: 94.0, month: '2026-09' },
    { id: 'EA-003', dept: '急诊儿科', totalTriage: 760, correctTriage: 706, accuracyRate: 92.9, month: '2026-09' },
    { id: 'EA-004', dept: '急诊妇产科', totalTriage: 320, correctTriage: 298, accuracyRate: 93.1, month: '2026-09' },
    { id: 'EA-005', dept: '急诊综合', totalTriage: 540, correctTriage: 502, accuracyRate: 93.0, month: '2026-09' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m521Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emergency/waiting', handle: handleEmergencyWaiting, auth: true },
  { method: 'GET', path: '/api/v1/emergency/accuracy', handle: handleEmergencyAccuracy, auth: true },
];
