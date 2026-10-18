/**
 * 健澜科技 jlmedaios - 质控规则模拟测试 V14 路由（M519-C）
 *
 * GET  /api/v1/emr-qc-rule-simulator  （read，auth:true）返回模拟测试基础数据
 * POST /api/v1/emr-qc-rule-simulator  （auth:true）运行模拟测试 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRuleSimulator,
  buildRuleSimulatorReport,
  runRuleSimulation,
  type SimulationResultsV14,
} from "../aggregators/emrQcRuleSimulatorV14Aggregator.js";

export const emrQcRuleSimulatorV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-rule-simulator",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rule-simulator:read");
      if (denied) return denied;
      const simulator = buildRuleSimulator("病程记录及时性", 50);
      return json(ok(simulator));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-rule-simulator",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rule-simulator:write");
      if (denied) return denied;
      const body = await c.req.json();
      const simulator = buildRuleSimulator(
        String(body?.ruleName ?? "病程记录及时性"),
        Number(body?.testCases ?? 50),
      );
      const results: SimulationResultsV14 = {
        pass: Number(body?.results?.pass ?? 0),
        fail: Number(body?.results?.fail ?? 0),
      };
      const result = runRuleSimulation(simulator, results);
      const report = buildRuleSimulatorReport(result);
      return json(ok({ simulator, results, result, report }));
    },
  },
];
