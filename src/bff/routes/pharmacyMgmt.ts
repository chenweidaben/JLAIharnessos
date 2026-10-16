/**
 * 健澜科技 jlmedaios — 【护理院感医保药事】医院药事管理深化路由（M179-D）
 *
 *   GET /api/v1/pharmacy/mgmt?period=2026-Q4&drugId=D-AMOX-001&monitor=1
 *
 *   一次返回药事管理深化体系：
 *     system    buildDeepPharmacyMgmt（四大维度 + 控制点 + 安全红线，总在返回）；
 *     monitor   monitorDrugUse（带 drugId 且 monitor=1 才返回，用药监测）；
 *     report    generatePharmacyReport（带 period 才返回，周期药事报告）；
 *     audit     处方点评为 POST 语义，本 GET 仅返回空点评结构，供前端演示。
 *
 * 薄壳路由：业务规则全部在 aggregators/pharmacyMgmtAggregator.ts 纯函数层。
 * 不写 SQL、不触库；不触碰 WebSocket；不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildDeepPharmacyMgmt,
  generatePharmacyReport,
  monitorDrugUse,
} from '../aggregators/pharmacyMgmtAggregator';

export const pharmacyMgmtRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/pharmacy/mgmt',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        // 1) 深度药事管理总览（总在返回）
        const system = buildDeepPharmacyMgmt();

        // 2) 用药监测（带 drugId 且 monitor=1 才跑）
        let monitor = null;
        if (c.query.get('monitor') === '1') {
          const drugId = (c.query.get('drugId') ?? '').trim();
          if (!drugId) {
            return json(fail(ErrorCode.BAD_REQUEST, 'monitor=1 时 drugId 不能为空', c.traceId), 400);
          }
          const period = Number(c.query.get('periodDays') ?? '30') || 30;
          monitor = monitorDrugUse(drugId, period);
        }

        // 3) 周期药事报告（带 period 才跑）
        const period = (c.query.get('period') ?? '').trim();
        const report = period ? generatePharmacyReport(period) : null;

        return json(ok({
          system,
          monitor,
          report,
          generatedAt: new Date().toISOString(),
        }, '药事管理体系已加载（采购/库存/使用/质量，安全无差错）'));
      } catch (err) {
        console.error(`[pharmacyMgmt] GET /mgmt [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '药事管理计算失败', c.traceId),
          500,
        );
      }
    },
  },
];
