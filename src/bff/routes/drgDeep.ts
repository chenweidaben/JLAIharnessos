/**
 * 健澜科技 jlmedaios - 【临床核心深化】DRG/DIP 付费深度分析 BFF 路由（M176-A）
 *
 *   GET /api/v1/admin/drg/deep-analysis?dept=xxx&period=2026-09
 *     读取出院病例 DRG 分组结果（clinical.drg_group_results），交由纯函数聚合器
 *     （aggregators/drgDeepAggregator.ts）完成：
 *       1) checkGrouping            —— 分组正确性反查（主诊断+ORP vs 实际入组）
 *       2) calculateDRGProfitLoss  —— 单病例盈亏（标准付费-实际费用）
 *       3) identifyDRGInlier        —— 离群病例识别（特例单议/低标入院嫌疑）
 *       4) optimizeDRGPerformance   —— 科室 DRG 绩效优化建议
 *
 * 降级原则：DEMO_MODE 不连 PostgreSQL，返回内置演示样例并显式标注 demo=true；
 * 未查到病例时返回 hasData=false，不虚构数字。
 * 权限码：drg:deep:view（医保办/运营处/admin 只读）。
 * 医疗安全红线：仅运营辅助，不触发诊疗、不自动改医嘱/结算。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDeepDRGAnalysis,
  optimizeDRGPerformance,
  type DRGCase,
} from '../aggregators/drgDeepAggregator';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

interface GroupResultRow {
  visit_id: string;
  department: string;
  primary_dx_code: string | null;
  has_orp: boolean;
  group_code: string;
  total_fee: number | null;
}

/**
 * 演示样例：覆盖正确入组/内外组错配/结余/超支/高费用离群/低费用短住院六类情形。
 * 仅 DEMO_MODE 使用，便于前端直接演示。
 */
function demoCases(): DRGCase[] {
  return [
    // 正确入组·内科肺炎，费用贴组均 → 基本结余
    { visitId: 'v-demo-001', dept: '呼吸内科', primaryDx: 'J18.9', hasOrp: false, groupCode: 'ES29', actualCost: 7800, losDays: 8 },
    // 正确入组·心衰内科
    { visitId: 'v-demo-002', dept: '心内科', primaryDx: 'I50.9', hasOrp: false, groupCode: 'FB29', actualCost: 8600, losDays: 7 },
    // 冠脉介入：费用超支 → 超支病例
    { visitId: 'v-demo-003', dept: '心内科', primaryDx: 'I21.0', hasOrp: false, groupCode: 'FC25', actualCost: 14800, losDays: 9 },
    // 主诊断指向外科胆囊（K80）却无 ORP 手术 → 分组 wrong
    { visitId: 'v-demo-004', dept: '普外科', primaryDx: 'K80.2', hasOrp: false, groupCode: 'GB25', actualCost: 14200, losDays: 9 },
    // 正确入组·胆囊切除，正常
    { visitId: 'v-demo-005', dept: '普外科', primaryDx: 'K80.3', hasOrp: true, groupCode: 'GB25', actualCost: 14600, losDays: 9 },
    // 高费用离群：费用 > 胆囊组均 2 倍 → 特例单议
    { visitId: 'v-demo-006', dept: '普外科', primaryDx: 'K80.3', hasOrp: true, groupCode: 'GB25', actualCost: 33000, losDays: 11 },
    // 低费用短住院：疑似低标入院
    { visitId: 'v-demo-007', dept: '普外科', primaryDx: 'K35.9', hasOrp: true, groupCode: 'IB29', actualCost: 3200, losDays: 3 },
  ];
}

export const drgDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/drg/deep-analysis',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'drg:deep:view');
      if (denied) return denied;

      const dept = c.query.get('dept')?.trim() ?? '';
      const period = c.query.get('period')?.trim() ?? '';
      if (!dept) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 dept 参数', c.traceId), 400);
      }

      // DEMO 模式：内置样例，前端直接可演示
      if (isDemo) {
        const cases = demoCases().map((cs) => ({ ...cs, dept }));
        const analysis = buildDeepDRGAnalysis({ dept, period: period || '2026-09', cases });
        const optimization = optimizeDRGPerformance(dept, period || '2026-09', cases);
        return json(ok({
          demo: true,
          hasData: true,
          message: '演示模式：使用内置样例数据，未连接 PostgreSQL',
          ...analysis,
          optimization,
          generatedAt: new Date().toISOString(),
        }));
      }

      try {
        const db = getDb();
        // 从分组结果表取该科室近期出院病例（按周期过滤 grouped_at）
        const periodStart = period ? `${period}-01` : null;
        const rows = (await db`
          SELECT visit_id, department, primary_dx_code, has_orp, group_code, total_fee
          FROM clinical.drg_group_results
          WHERE department = ${dept}
            AND (${periodStart}::text IS NULL OR grouped_at >= ${periodStart}::date)
          ORDER BY grouped_at DESC
          LIMIT 500
        `) as GroupResultRow[];

        if (!rows || rows.length === 0) {
          return json(ok({
            dept, period, demo: false, hasData: false,
            message: '该科室暂无 DRG 分组出院病例，完成本地分组后再分析',
          }));
        }

        const cases: DRGCase[] = rows.map((r) => ({
          visitId: r.visit_id,
          dept: r.department,
          primaryDx: r.primary_dx_code ?? '',
          hasOrp: r.has_orp,
          groupCode: r.group_code,
          actualCost: Number(r.total_fee ?? 0),
          losDays: 0, // 住院日由病案首页补全；此处缺省 0，离群识别按费用维度保守判定
        }));

        const analysis = buildDeepDRGAnalysis({ dept, period: period || 'latest', cases });
        const optimization = optimizeDRGPerformance(dept, period || 'latest', cases);
        return json(ok({
          demo: false,
          hasData: true,
          ...analysis,
          optimization,
          generatedAt: new Date().toISOString(),
        }));
      } catch (err) {
        console.error(`[drgDeep] GET /admin/drg/deep-analysis [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'DRG 深度分析加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
