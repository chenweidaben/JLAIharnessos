/**
 * 健澜科技 jlmedaios - P0合规（病历质控 + 智慧服务三级）M473b
 *
 * EMPI 患者主索引接口清单 / 智慧服务报告查询率
 * （emr/quality-defects、smart-service/appointment、payment、followup 已存在，不重复建）。
 * 避开 M471/M472/M473 各端点、M433 智慧服务既有、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/interop/base-resources - EMPI 患者主索引接口清单（资源编码/资源名/提供方/订阅方/同步状态）5 条 */
async function handleInteropBaseResources(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EMPI-001', code: '资源编码：EMPI-PAT-MAIN-01', name: '资源名：患者主索引（EMPI）注册与合并', provider: '提供方：本院患者主索引服务（HIS 患者主页域）', subscriber: '订阅方：区域平台、医联体、互联网医院', sync: '同步状态：已上线（主索引自动去重合并，SLA 99.9%）' },
    { id: 'EMPI-002', code: '资源编码：EMPI-ID-LINK-02', name: '资源名：多院内卡映射（就诊号↔EMPI）', provider: '提供方：本院患者主索引服务', subscriber: '订阅方：LIS、PACS、EMR、互联网医院', sync: '同步状态：已上线（各系统就诊号统一挂 EMPI）' },
    { id: 'EMPI-003', code: '资源编码：EMPI-MERGE-AUDIT-03', name: '资源名：主索引合并/拆分审计', provider: '提供方：本院患者主索引服务 + 病案室', subscriber: '订阅方：区域平台、质控科', sync: '同步状态：已上线（合并操作可审计回溯）' },
    { id: 'EMPI-004', code: '资源编码：EMPI-PUSH-REGION-04', name: '资源名：患者主索引向区域平台同步', provider: '提供方：本院患者主索引服务', subscriber: '订阅方：区域健康档案平台', sync: '同步状态：已上线（增量实时 + 每日全量校对）' },
    { id: 'EMPI-005', code: '资源编码：EMPI-FAMILY-05', name: '资源名：家属/紧急联系人索引（授权场景）', provider: '提供方：本院患者主索引服务', subscriber: '订阅方：互联网医院、随访平台', sync: '同步状态：灰度（授权委托场景下同步，合规脱敏）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/smart-service/report-query - 智慧服务报告查询率（报告类型/查询量/覆盖率/手机端占比）5 条 */
async function handleSmartServiceReportQuery(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SRQ-001', reportType: '报告类型：检验报告（LIS）', queryCount: '查询量：本月 38,642 次', coverage: '覆盖率：应查患者中 78.4% 已通过手机端查询', mobile: '手机端占比：86%（公众号/App 为主）' },
    { id: 'SRQ-002', reportType: '报告类型：检查报告（PACS/放射/超声）', queryCount: '查询量：本月 12,305 次', coverage: '覆盖率：应查患者中 64.1% 已查询', mobile: '手机端占比：71%（影像摘要可查，原图走院内）' },
    { id: 'SRQ-003', reportType: '报告类型：病理报告', queryCount: '查询量：本月 1,186 次', coverage: '覆盖率：应查患者中 52.3%（等待正式报告为主）', mobile: '手机端占比：68%（报告出具后推送提醒）' },
    { id: 'SRQ-004', reportType: '报告类型：出院小结/诊断证明', queryCount: '查询量：本月 5,420 次', coverage: '覆盖率：应出院患者中 70.2% 已查询', mobile: '手机端占比：79%（电子证明下载）' },
    { id: 'SRQ-005', reportType: '报告类型：心电图/肺功能等功能检查', queryCount: '查询量：本月 3,210 次', coverage: '覆盖率：应查患者中 58.0%', mobile: '手机端占比：74%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m473bRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/interop/base-resources', handle: handleInteropBaseResources, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/report-query', handle: handleSmartServiceReportQuery, auth: true },
];
