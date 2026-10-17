/**
 * 健澜科技 jlmedaios - 院间数据共享授权 V5 路由（M281-C）
 *
 * POST /api/v1/data-sharing/consent（授权申请）
 * POST /api/v1/data-sharing/revoke（撤回）
 * GET  /api/v1/data-sharing/audit（共享审计）
 *
 * 权限：data-sharing:read / data-sharing:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDataSharingV5Report,
  checkConsentV5,
  grantConsentV5,
  revokeConsentV5,
  type SharingAudit,
  type SharingConsent,
} from "../aggregators/dataSharingV5Aggregator.js";

const consentStore: SharingConsent[] = [];
const auditStore: SharingAudit[] = [];

export const dataSharingV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/data-sharing/consent",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-sharing:write");
      if (denied) return denied;

      const body = await c.req.json() as {
        patientRef: string;
        requesterOrg: string;
        reason: string;
        resourcesScope: string[];
        days: number;
      };
      const consent = grantConsentV5(body.patientRef, { requesterOrg: body.requesterOrg, reason: body.reason }, body.resourcesScope, body.days);
      consentStore.push(consent);
      return json(ok(consent));
    },
  },
  {
    method: "POST",
    path: "/api/v1/data-sharing/revoke",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-sharing:write");
      if (denied) return denied;

      const body = await c.req.json() as { consentId: string };
      const idx = consentStore.findIndex((c) => c.id === body.consentId);
      if (idx < 0) {
        return json(ok({ found: false }));
      }
      consentStore[idx] = revokeConsentV5(consentStore[idx]);
      return json(ok(consentStore[idx]));
    },
  },
  {
    method: "GET",
    path: "/api/v1/data-sharing/audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-sharing:read");
      if (denied) return denied;

      const resource = c.query.get("resource") ?? "";
      if (resource) {
        const id = c.query.get("consentId") ?? "";
        const consent = consentStore.find((c) => c.id === id);
        if (consent) {
          const allowed = checkConsentV5(consent, resource);
          if (allowed) {
            auditStore.push({ consentId: id, accessedBy: consent.requesterOrg, resource });
          }
          return json(ok({ allowed, audits: auditStore }));
        }
      }
      return json(ok(buildDataSharingV5Report(consentStore, auditStore)));
    },
  },
];
