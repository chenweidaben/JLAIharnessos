/**
 * 健澜科技 jlmedaios - 大模型微调与人在环反馈 V5 路由（M280-D）
 *
 * POST /api/v1/finetune-loop/job（提交微调任务）
 * GET  /api/v1/finetune-loop/queue（反馈队列）
 * POST /api/v1/finetune-loop/annotate（人工标注）
 *
 * 权限：finetune-loop:read / finetune-loop:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildFinetuneLoopV5Report,
  loopFeedbackV5,
  prepareTrainDataV5,
  type HumanFeedback,
} from "../aggregators/finetuneLoopV5Aggregator.js";

const feedbackStore: HumanFeedback[] = [
  { adviceId: "adv-1", accepted: true, rejected: false, correction: "", reviewer: "张医生" },
  { adviceId: "adv-2", accepted: false, rejected: true, correction: "应改为阿司匹林100mg", reviewer: "李药师" },
  { adviceId: "adv-3", accepted: false, rejected: false, correction: "", reviewer: "" },
];

export const finetuneLoopV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/finetune-loop/job",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "finetune-loop:write");
      if (denied) return denied;

      const body = await c.req.json() as { baseModel: string; epochs: number };
      const train = prepareTrainDataV5(feedbackStore);
      return json(ok({ submitted: true, ...body, trainSamples: train.samples, status: "queued" }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/finetune-loop/queue",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "finetune-loop:read");
      if (denied) return denied;

      return json(ok(loopFeedbackV5(feedbackStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/finetune-loop/annotate",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "finetune-loop:write");
      if (denied) return denied;

      const body = await c.req.json() as HumanFeedback;
      feedbackStore.push(body);
      return json(ok({ annotated: true, queue: loopFeedbackV5(feedbackStore) }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/finetune-loop/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "finetune-loop:read");
      if (denied) return denied;

      return json(ok(buildFinetuneLoopV5Report(feedbackStore, [3.5, 5.2])));
    },
  },
];
