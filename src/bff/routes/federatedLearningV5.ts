/**
 * 健澜科技 jlmedaios - 隐私计算与联邦学习 V5 路由（M282-D）
 *
 * POST /api/v1/federated-learning/job（提交联邦任务）
 * GET  /api/v1/federated-learning/progress（任务进度）
 * GET  /api/v1/federated-learning/metrics（指标看板）
 *
 * 权限：federated-learning:read / federated-learning:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateModelV5,
  buildFederatedLearningV5Report,
  evalFederatedV5,
  initFederatedV5,
  type FederatedEval,
  type FederatedTask,
} from "../aggregators/federatedLearningV5Aggregator.js";

const taskStore: FederatedTask[] = [
  { taskName: "院间慢病预测", orgs: ["医院A", "医院B", "医院C"], modelType: "xgb", rounds: 10 },
];

const evalStore: FederatedEval[] = [
  { globalAccuracy: 88, localAccuracies: { "医院A": 82, "医院B": 80, "医院C": 79 } },
];

export const federatedLearningV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/federated-learning/job",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "federated-learning:write");
      if (denied) return denied;

      const body = await c.req.json() as FederatedTask;
      taskStore.push(body);
      const init = initFederatedV5(body);
      return json(ok(init));
    },
  },
  {
    method: "GET",
    path: "/api/v1/federated-learning/progress",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "federated-learning:read");
      if (denied) return denied;

      const updates = [
        { org: "医院A", weights: [0.6], sampleSize: 600 },
        { org: "医院B", weights: [0.4], sampleSize: 400 },
      ];
      const agg = aggregateModelV5(updates);
      return json(ok({ rounds: taskStore[0]?.rounds ?? 0, aggregatedWeights: agg.globalWeights, totalSamples: agg.totalSamples }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/federated-learning/metrics",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "federated-learning:read");
      if (denied) return denied;

      const evalResult = evalStore[0];
      const benefit = evalResult ? evalFederatedV5(evalResult) : null;
      return json(ok({ ...buildFederatedLearningV5Report(taskStore, evalStore), benefit }));
    },
  },
];
