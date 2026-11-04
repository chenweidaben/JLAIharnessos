/**
 * 健澜AI原生医院操作系统OS - P2-2 CDS 深度规则引擎路由
 *
 * 前缀 /api/v1/cds/checks（与既有 M543 POST /api/v1/cds/checks 精确路径不冲突）：
 *  - POST /medication                开方前预审（hard-stop 409；warning+force 留痕）
 *  - POST /lab-critical             危急值 → 自动建 alert
 *  - POST /alerts/:alertId/acknowledge  医生确认
 *  - GET  /alerts?visitId=           提醒列表
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  CdsError,
  evaluateMedication,
  checkLabCritical,
  acknowledge,
  listAlerts,
  logOverride,
} from '../aggregators/cdsChecksAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof CdsError) {
    const s = err.status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : s === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

const aid = (c: Ctx): string => String(c.params?.alertId ?? '');

export const cdsChecksRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/cds/checks/medication',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const roles = c.user?.roles ?? [];
        if (!roles.includes('doctor') && !roles.includes('pharmacist') && !roles.includes('admin')) {
          throw new CdsError(403, '开方预审需 doctor/pharmacist');
        }
        const result = evaluateMedication({
          drugCode: String(b.drugCode ?? ''), dose: Number(b.dose ?? 0), route: String(b.route ?? 'po'),
          durationDays: Number(b.durationDays ?? 0), patientAge: Number(b.patientAge ?? 0),
          isPregnant: Boolean(b.isPregnant), hasRenalDysfunction: Boolean(b.hasRenalDysfunction),
          hasHepaticDysfunction: Boolean(b.hasHepaticDysfunction),
          currentDiagnoses: Array.isArray(b.currentDiagnoses) ? (b.currentDiagnoses as string[]) : [],
          concurrentDrugs: Array.isArray(b.concurrentDrugs) ? (b.concurrentDrugs as string[]) : [],
        });
        // hard-stop 直接 409
        if (result.level === 'hard-stop') {
          return json({ code: ErrorCode.CONFLICT, message: 'CDS hard-stop', data: result, timestamp: new Date().toISOString() }, 409);
        }
        // warning 需 force + overrideReason 才能强制提交
        if (result.level === 'warning' && !b.force) {
          return json({ code: ErrorCode.SUCCESS, message: 'warning 需要 force=true 强制提交', data: result, timestamp: new Date().toISOString() }, 200);
        }
        if (result.level === 'warning' && b.force) {
          if (!b.overrideReason) throw new CdsError(400, '强制提交需 overrideReason');
          logOverride({
            visitId: String(b.visitId ?? ''), drugCode: String(b.drugCode ?? ''),
            findings: result.findings, overrideReason: String(b.overrideReason),
            doctorId: c.user?.id ?? '',
          });
        }
        return json(ok(result));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/cds/checks/lab-critical',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const a = checkLabCritical({
          visitId: String(b.visitId ?? ''), patientId: String(b.patientId ?? ''),
          labCode: String(b.labCode ?? ''), value: Number(b.value ?? 0), unit: String(b.unit ?? ''),
        });
        return json(ok({ triggered: !!a, alert: a }));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/cds/checks/alerts/:alertId/acknowledge',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        if (!(c.user?.roles ?? []).some((r) => r === 'doctor' || r === 'nurse' || r === 'admin')) {
          throw new CdsError(403, '确认告警需 doctor/nurse');
        }
        return json(ok(acknowledge(aid(c), c.user?.id ?? '', b.note === undefined ? undefined : String(b.note))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/cds/checks/alerts',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const visitId = new URL(c.req.url).searchParams.get('visitId') ?? undefined;
        return json(ok(listAlerts(visitId || undefined)));
      } catch (e) { return mapError(e); }
    },
  },
];
