/**
 * 健澜科技 jlmedaios - M137-D 关键业务流程 E2E 测试【测试覆盖率冲刺 · 生产就绪质量门禁】
 *
 * GET /api/v1/admin/test/e2e（仅 admin，依据宪法第三章）
 *
 * 行为约定：
 *  - 基于 aggregator 的 ALL_E2E_FLOW_NAMES（四条关键主链路）逐条执行纯函数 E2E 编排；
 *  - 默认执行器为 simulatedUserRunner：零网络副作用，只做「流程定义完整、步骤顺序
 *    可走通」的结构级验证（模拟真实用户操作成功），替代对全部业务端点发起真实调用；
 *  - 每条流程逐步骤记录：通过(绿) / 失败(红) / 耗时(elapsedMs)；
 *  - 输出整份 E2EReport：流程级与步骤级通过率、红项流程明细、平均耗时、门禁结论；
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403。
 *
 * 用途：发版 / 回归期快速识别关键业务主链路（门诊 / 住院 / 处方审核 / Personal Agent）
 *       是否完整可走通；前端红绿报告页（web/src/pages/admin/test/E2E）直读本接口。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import {
  ALL_E2E_FLOW_NAMES,
  generateE2EReport,
  runE2ETestFlow,
} from '../aggregators/e2eTestAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

export const e2eTestRoutes: RouteDef[] = [
  {
    // M137-D 关键业务流程 E2E：四条主链路红绿报告（仅 admin）
    method: 'GET',
    path: '/api/v1/admin/test/e2e',
    handle: (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403（依据宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      // 纯函数编排：逐条跑四条关键主链路 → 汇总成整份红绿报告
      const results = ALL_E2E_FLOW_NAMES.map((name) => runE2ETestFlow(name));
      const report = generateE2EReport(results);

      return json(ok(report));
    },
    auth: true,
  },
];
