/**
 * 健澜科技 jlmedaios - 处方前置审核规则引擎 V7 路由（M289-A）
 *
 * GET  /api/v1/cds/rules 规则列表
 * GET  /api/v1/cds/rules/:id 规则详情
 * POST /api/v1/cds/audit 处方审核
 * GET  /api/v1/cds/hits 命中记录
 *
 * 权限：cds:read / cds:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  auditPrescriptionV7,
  type CdsRule,
  type PrescriptionV7,
} from "../aggregators/cdsRuleEngineV7Aggregator.js";

const ruleStore: CdsRule[] = [
  { id: "r1", type: "interaction", drugCode: "WARFARIN", target: "ASPIRIN", severity: "critical", message: "华法林+阿司匹林出血风险", enabled: true },
  { id: "r2", type: "contraindication", drugCode: "METFORMIN", target: "CKD3", severity: "warning", message: "二甲双胍禁用于CKD3期", enabled: true },
  { id: "r3", type: "dose", drugCode: "AMOXICILLIN", target: "2000", severity: "warning", message: "阿莫西林日剂量>2g", enabled: true },
];

const hitStore: { prescriptionId: string; hits: CdsRule[]; pass: boolean }[] = [];

export const cdsRuleEngineV7Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cds/rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cds:read");
      if (denied) return denied;

      return json(ok(ruleStore));
    },
  },
  {
    method: "GET",
    path: "/api/v1/cds/rules/:id",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cds:read");
      if (denied) return denied;

      const id = c.params.id;
      const rule = ruleStore.find((r) => r.id === id);
      if (!rule) {
        return json(ok({ found: false }));
      }
      return json(ok(rule));
    },
  },
  {
    method: "POST",
    path: "/api/v1/cds/audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cds:write");
      if (denied) return denied;

      const body = await c.req.json() as { prescriptionId: string; prescription: PrescriptionV7; patientTags: string[] };
      const result = auditPrescriptionV7(ruleStore, body.prescription, body.patientTags);
      hitStore.push({ prescriptionId: body.prescriptionId, hits: result.hits, pass: result.pass });
      return json(ok(result));
    },
  },
  {
    method: "GET",
    path: "/api/v1/cds/hits",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cds:read");
      if (denied) return denied;

      return json(ok({
        total: hitStore.length,
        passCount: hitStore.filter((h) => h.pass).length,
        hits: hitStore,
      }));
    },
  },
];
