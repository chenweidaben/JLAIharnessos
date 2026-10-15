/**
 * 健澜科技 jlmedaios - M136-C 测试覆盖率报告 BFF 路由（运维质量门禁）
 *
 * GET /api/v1/admin/test/coverage（仅 admin，依据宪法第三章）
 *
 * 行为约定：
 *  - 扫描 tests/unit/*.test.ts 作为「已发现测试文件」清单；
 *  - 以 aggregator 的 CORE_AGGREGATOR_INVENTORY（doctor / nurse / pharma / admin
 *    四桶核心 aggregator）为考核范围；
 *  - 调用纯函数 calculateTestCoverage：按命名约定匹配「源文件 ↔ 测试文件」，
 *    得出整体覆盖率、分桶覆盖率、未覆盖明细与门禁结论；
 *  - 门禁阈值默认 80%：核心四桶全部 ≥ 80% 即 coreGateOk=true；
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403。
 *
 * 用途：发版 / 持续集成期快速识别核心业务 aggregator 的测试缺口，
 *       前端报告页（web/src/pages/admin/test/Coverage）直读本接口。
 *
 * 持续优化：后续可接入 lcov/json 覆盖率解析，把「测试文件存在性」粗口径
 *          升级为行 / 分支覆盖率；当前以文件级匹配为考核口径。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { requireRole } from '../middleware/auth';
import {
  calculateTestCoverage,
  CORE_AGGREGATOR_INVENTORY,
  type TestFileInput,
} from '../aggregators/testCoverageAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

/** tests/unit 目录（相对项目根） */
const TESTS_UNIT_DIR = join(process.cwd(), 'tests', 'unit');

/**
 * 扫描 tests/unit 目录下的 *.test.ts 文件，返回相对路径清单。
 *
 * 纯 I/O 封装：目录不存在 / 读取异常时返回空数组（保守降级，不冒充覆盖）。
 * 路径统一为 `tests/unit/<filename>`，与 aggregator 的 normalizeTestKey 对齐。
 */
function discoverUnitTests(): TestFileInput[] {
  try {
    const entries = readdirSync(TESTS_UNIT_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && /\.test\.(ts|tsx|js|jsx)$/i.test(e.name))
      .map((e) => ({ path: `tests/unit/${e.name}` }));
  } catch {
    // 目录不存在 / 无权限：保守降级为空清单，由 aggregator 算出 0% 覆盖
    return [];
  }
}

export const testCoverageRoutes: RouteDef[] = [
  {
    // M136-C 核心业务模块测试覆盖率报告（仅 admin）
    method: 'GET',
    path: '/api/v1/admin/test/coverage',
    handle: (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403（依据宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      const testFiles = discoverUnitTests();
      // 纯函数编排：核心 aggregator 清单 × 已发现测试 → 覆盖率报告
      const report = calculateTestCoverage(CORE_AGGREGATOR_INVENTORY, testFiles, {
        generatedAt: new Date().toISOString(),
      });

      return json(ok(report));
    },
    auth: true,
  },
];
