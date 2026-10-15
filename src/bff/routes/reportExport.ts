/**
 * 健澜科技 jlmedaios - 数据报表导出 BFF 路由（M138-D 新业务场景，仅 admin）
 *
 *  GET /api/v1/admin/reports/export?type=xxx&format=csv
 *    - type：opd_daily 门诊日报 / inp_daily 住院日报 / rx_stat 处方统计 / qc_monthly 质控月报；
 *    - format：csv（text/csv，UTF-8 BOM）/ excel（.xls，零依赖）；
 *    - 可选筛选：startDate / endDate / department / page / pageSize。
 *
 * 性能：导出只序列化「当前页」（page/pageSize，pageSize 上限由聚合器约束），
 *       大数据量分页查询不卡死；正文由 exportReport 纯函数生成。
 *
 * 安全：仅 admin 角色（requireRole 内部已处理 401/403）；不触碰 WebSocket；
 *       不暴露患者个体 PII，仅返回聚合统计量。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  exportReport,
  type ExportFormat,
  type ReportFilters,
} from '../aggregators/reportExportAggregator';

/** 从 query 解析分页/数值参数，非法时忽略（宽松筛选）。 */
function num(c: Ctx, key: string): number | undefined {
  const raw = c.query.get(key);
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** 组装导出筛选条件 */
function parseFilters(c: Ctx): ReportFilters {
  return {
    startDate: c.query.get('startDate') ?? undefined,
    endDate: c.query.get('endDate') ?? undefined,
    department: c.query.get('department') ?? undefined,
    page: num(c, 'page'),
    pageSize: num(c, 'pageSize'),
  };
}

/**
 * GET /api/v1/admin/reports/export
 * 下载报表文件（CSV / Excel）。
 */
async function handleExport(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const type = c.query.get('type') ?? '';
  const formatRaw = (c.query.get('format') ?? 'csv').toLowerCase();
  const format: ExportFormat = formatRaw === 'excel' ? 'excel' : 'csv';

  try {
    const result = exportReport(type, parseFilters(c), format);
    // 文件下载响应：ASCII 文件名，避免 Content-Disposition 编码兼容问题
    return new Response(result.content, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Report-Row-Count': String(result.rowCount),
        'X-Report-Total-Rows': String(result.totalRows),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '报表导出失败';
    // 未知报表类型 / 非法格式 → 400
    return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
  }
}

/**
 * GET /api/v1/admin/reports/export/meta
 * 返回支持的报表类型与格式枚举，供前端渲染下拉（JSON 信封）。
 */
async function handleMeta(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;
  return json(
    ok({
      reportTypes: [
        { value: 'opd_daily', label: '门诊日报' },
        { value: 'inp_daily', label: '住院日报' },
        { value: 'rx_stat', label: '处方统计' },
        { value: 'qc_monthly', label: '质控月报' },
      ],
      formats: [
        { value: 'csv', label: 'CSV' },
        { value: 'excel', label: 'Excel' },
      ],
    }),
  );
}

export const reportExportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/reports/export/meta',
    auth: true,
    handle: handleMeta,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/reports/export',
    auth: true,
    handle: handleExport,
  },
];
