/**
 * 健澜科技 jlmedaios - M233 处方审核深度
 *
 * 处方审核（合理用药）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/pharmacy/review - 处方审核 */
async function handlePharmacyReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reviews = [
    { id: 'RX-001', rxNo: 'RX20261020001', patient: '张演示', diagnosis: '冠心病（不稳定型心绞痛）', result: '通过', issues: [], reviewer: '药师-王主任' },
    { id: 'RX-002', patient: '李患者', diagnosis: '2 型糖尿病', result: '警告', issues: ['用法用量不适宜：二甲双胍 0.5g tid 改为 bid'], reviewer: '药师-李药师' },
    { id: 'RX-003', patient: '王先生', diagnosis: '急性上呼吸道感染', result: '拦截', issues: ['遴选药品不适宜：无指征使用抗生素', '联合用药不适宜：重复使用同类解热镇痛药'], reviewer: '药师-张主任' },
    { id: 'RX-004', patient: '赵女士', diagnosis: '高血压 3 级', result: '通过', issues: [], reviewer: '药师-赵药师' },
    { id: 'RX-005', patient: '刘大爷', diagnosis: '社区获得性肺炎', result: '警告', issues: ['联合用药不适宜：头孢类+大环内酯类联用需评估'], reviewer: '药师-陈主任' },
  ];

  return json(ok({ reviews, totalCount: reviews.length }));
}

export const m233Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/review', handle: handlePharmacyReview, auth: true },
];
