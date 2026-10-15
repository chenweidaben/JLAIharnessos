/**
 * 健澜科技 jlmedaios - 报表中心导出 BFF 路由（M148-D 产品化收尾，仅 admin）
 *
 *  GET /api/v1/admin/export?type=xxx&format=pdf
 *    - type：opd_daily 门诊日报 / inp_monthly 住院月报 / dept_perf 科室绩效 / qc_report 质控报告；
 *    - format：pdf（打印级 HTML，浏览器另存为 PDF）/ excel（.xls，零依赖）；
 *    - 可选筛选：date（基准日）/ department（科室）。
 *
 * 产物：
 *    - PDF 报表：完整打印模板 HTML（医院抬头 / 深海蓝 VI / 水印 / 页脚 / A4 分页），
 *      前端 window.print() 即可另存为 PDF，不引外部 PDF 库；
 *    - Excel 报表：零依赖 .xls 表格文本。
 *
 * 安全：仅 admin 角色（requireRole 内部已处理 401/403）；不触碰 WebSocket；
 *       不暴露患者个体 PII，仅返回科室级聚合统计量。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  CENTER_REPORT_TYPES,
  generateReport,
} from '../aggregators/exportReportAggregator';

/**
 * GET /api/v1/admin/export
 * 下载报表（打印级 HTML / Excel）。
 */
async function handleExport(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const type = c.query.get('type') ?? '';
  const format = c.query.get('format') ?? '';
  const date = c.query.get('date') ?? undefined;
  const department = c.query.get('department') ?? undefined;

  try {
    const result = generateReport(type, format, { date, department });
    return new Response(result.content, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Report-Type': result.reportType,
        'X-Report-Row-Count': String(result.rowCount),
        'X-Report-Generated-At': result.generatedAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '报表导出失败';
    // 未知报表类型 / 非法参数 → 400
    return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
  }
}

/**
 * GET /api/v1/admin/export/meta
 * 返回支持的报表类型与格式枚举，供前端渲染下拉（JSON 信封）。
 */
async function handleMeta(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;
  return json(
    ok({
      reportTypes: CENTER_REPORT_TYPES.map((t) => ({
        value: t,
        label:
          t === 'opd_daily'
            ? '门诊日报'
            : t === 'inp_monthly'
              ? '住院月报'
              : t === 'dept_perf'
                ? '科室绩效'
                : '质控报告',
      })),
      formats: [
        { value: 'pdf', label: 'PDF（浏览器打印）' },
        { value: 'excel', label: 'Excel' },
      ],
    }),
  );
}

export const exportReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/export/meta',
    auth: true,
    handle: handleMeta,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/export',
    auth: true,
    handle: handleExport,
  },
];
