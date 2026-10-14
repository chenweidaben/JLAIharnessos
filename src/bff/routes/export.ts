/**
 * 健澜科技 jlmedaios - 数据导出中心 BFF 路由
 *
 * 三类报表导出为 text/csv（UTF-8 带 BOM，Excel 中文不乱码）：
 *  - GET /api/v1/export/qc.csv        病历质控单明细（medical_qc:view）
 *  - GET /api/v1/export/drg.csv       DRG 分组结算明细（drg:view）
 *  - GET /api/v1/export/dept-kpi.csv  科室当日 KPI（dept_cockpit:view）
 *
 * 安全：全部登录 + 业务权限码守卫；复用各域既有权限码（最小授权），
 *       不引入新的导出权限码。CSV 由 aggregator/exportCsv 纯函数生成，不引 Excel 库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { listRecent } from '@/db/repositories/medicalQcRepo';
import { listDrgResults } from '@/db/repositories/drgRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { loadDeptDaily } from '../aggregators/deptCockpitAggregator';
import {
  buildDeptKpiCsv,
  buildDrgReportCsv,
  buildQcReportCsv,
  type DeptKpiExportRow,
} from '../aggregators/exportCsv';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 统一 CSV 响应头（ASCII 文件名，避免 Content-Disposition 编码兼容问题） */
function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function serverError(message: string): Response {
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

/**
 * 导出端点守卫：先权限码 → 再解析登录用户 → 执行取数与 CSV 生成。
 * 与 settlementReport.ts 的导出写法保持一致。
 */
function exportCsv(
  permission: string,
  filename: string,
  build: (view: AuthView) => Promise<string>,
) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, permission);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const csv = await build(view);
      return csvResponse(csv, filename);
    } catch (err) {
      return serverError(err instanceof Error ? err.message : '报表导出失败');
    }
  };
}

export const exportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/export/qc.csv',
    handle: exportCsv('medical_qc:view', 'qc-report.csv', async () => {
      const records = await listRecent(500);
      return buildQcReportCsv(
        records.map((r) => ({
          id: r.id,
          visitId: r.visitId,
          qcType: r.qcType,
          checker: r.checker,
          checkDate: r.checkDate,
          score: r.score,
          errorCount: r.errors?.length ?? 0,
          status: r.status,
          suggestions: r.suggestions,
        })),
      );
    }),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/export/drg.csv',
    handle: exportCsv('drg:view', 'drg-report.csv', async () => {
      const rows = await listDrgResults(null);
      return buildDrgReportCsv(rows);
    }),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/export/dept-kpi.csv',
    handle: exportCsv('dept_cockpit:view', 'dept-kpi.csv', async (view) => {
      const result = await loadDeptDaily(view);
      const row: DeptKpiExportRow = {
        deptName: result.deptName,
        date: result.date,
        demo: result.demo,
        bedTurnoverRate: result.kpis.bedTurnoverRate,
        avgLod: result.kpis.avgLod,
        avgCost: result.kpis.avgCost,
        gradeARate: result.kpis.gradeARate,
      };
      return buildDeptKpiCsv([row]);
    }),
    auth: true,
  },
];
