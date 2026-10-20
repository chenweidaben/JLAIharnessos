/**
 * 健澜科技 jlmedaios - M507 P0 合规重点（互联互通四甲·FHIR R4）：FHIR 资源交换网关 1 端点缺口
 *
 * fhir/patient、fhir/observation 已 200（已有确认不重建）；本批补建 fhir/consistency 一致性验证。
 * 与 M492 护理 NQI、M496 健康教育、M506 /emr/version/*、M505b /complaint/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/fhir/consistency - FHIR 一致性验证（资源类型/交换条数/成功率Tag/校验时间）5 条 */
async function handleFhirConsistency(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FC-001', resource: '资源类型：Patient（患者主索引）', count: '交换条数：今日累计 1,286 条（向上级平台 862 / 向下级医疗机构 424）', rate: '成功率Tag：≥99% 绿（99.6%，1,280/1,286 条校验通过）', time: '校验时间：2026-10-20 14:00（每小时自动校验）' },
    { id: 'FC-002', resource: '资源类型：Observation（检验结果）', count: '交换条数：今日累计 3,860 条', rate: '成功率Tag：≥99% 绿（99.2%，3,829/3,860 条通过，31 条失败为字段缺失）', time: '校验时间：2026-10-20 14:00' },
    { id: 'FC-003', resource: '资源类型：Condition（诊断）', count: '交换条数：今日累计 620 条', rate: '成功率Tag：95-99% 橙（97.4%，604/620 条通过，16 条 ICD-10 编码不规范）', time: '校验时间：2026-10-20 14:00' },
    { id: 'FC-004', resource: '资源类型：Encounter（就诊记录）', count: '交换条数：今日累计 486 条', rate: '成功率Tag：≥99% 绿（99.8%，485/486 条通过）', time: '校验时间：2026-10-20 14:00' },
    { id: 'FC-005', resource: '资源类型：MedicationRequest（用药记录）', count: '交换条数：今日累计 1,860 条', rate: '成功率Tag：95-99% 橙（96.8%，1,798/1,860 条通过，62 条药品编码不匹配）', time: '校验时间：2026-10-20 14:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m507Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/fhir/consistency', handle: handleFhirConsistency, auth: true },
];
