/**
 * 健澜AI原生医院操作系统OS - P1-7 医嘱执行机读核对路由
 *
 * 前缀 /api/v1/medication-verification（避开 /medication-admin/* /pda/*）：
 *  - POST /orders                                          创建待执行医嘱（doctor）
 *  - POST /orders/:orderNo/scan-wristband                  扫腕带
 *  - POST /orders/:orderNo/scan-barcode                    扫药品条码（不符 422）
 *  - POST /orders/:orderNo/execute                          执行
 *  - POST /orders/:orderNo/reject                           拒接
 *  - POST /orders/:orderNo/pause                            暂停
 *  - POST /orders/:orderNo/resume                          恢复
 *  - POST /orders/:orderNo/discontinue                      停药（L5+ 需 approverId）
 *  - GET  /orders?visitId=                                  列表
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  MedVerifError,
  createOrder,
  scanWristband,
  scanBarcode,
  execute,
  rejectOrder,
  pauseOrder,
  resumeOrder,
  discontinueOrder,
  listOrders,
} from '../aggregators/medicationVerificationAggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof MedVerifError) {
    const s = err.status;
    let code: number;
    if (s === 403) code = ErrorCode.FORBIDDEN;
    else if (s === 404) code = ErrorCode.NOT_FOUND;
    else if (s === 409) code = ErrorCode.CONFLICT;
    else if (s === 422) code = 42200; // 药品条码不符
    else code = ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

const on = (c: Ctx): string => String(c.params?.orderNo ?? '');

export const medicationVerificationRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/medication-verification/orders',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(createOrder({
          visitId: String(b.visitId ?? ''), patientId: String(b.patientId ?? ''),
          orderNo: String(b.orderNo ?? ''), drugName: String(b.drugName ?? ''),
          drugCode: String(b.drugCode ?? ''), dose: String(b.dose ?? ''), route: String(b.route ?? ''),
          scheduledAt: Number(b.scheduledAt ?? 0),
          safetyLevel: Number(b.safetyLevel ?? 1) as 1|2|3|4|5|6,
          isHighAlert: Boolean(b.isHighAlert), roles: c.user?.roles ?? [],
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/medication-verification/orders/:orderNo/scan-wristband',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(scanWristband(on(c), String(b.patientIdScanned ?? ''), String(b.nurseId ?? ''), b.witnessNurseId === undefined ? undefined : String(b.witnessNurseId), c.user?.roles ?? [])));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/medication-verification/orders/:orderNo/scan-barcode',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(scanBarcode(on(c), String(b.drugCodeScanned ?? ''), String(b.nurseId ?? ''), b.witnessNurseId === undefined ? undefined : String(b.witnessNurseId), c.user?.roles ?? [])));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/medication-verification/orders/:orderNo/execute',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(execute(on(c), String(b.nurseId ?? ''), b.note === undefined ? undefined : String(b.note), c.user?.roles ?? [])));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/medication-verification/orders/:orderNo/reject',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(rejectOrder(on(c), String(b.nurseId ?? ''), String(b.reason ?? ''), c.user?.roles ?? [])));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/medication-verification/orders/:orderNo/pause',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(pauseOrder(on(c), String(b.nurseId ?? ''), String(b.reason ?? ''), c.user?.roles ?? [])));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/medication-verification/orders/:orderNo/resume',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(resumeOrder(on(c), String(b.nurseId ?? ''), c.user?.roles ?? [])));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/medication-verification/orders/:orderNo/discontinue',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(discontinueOrder(on(c), String(b.nurseId ?? ''), b.approverId === undefined ? undefined : String(b.approverId), c.user?.roles ?? [])));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/medication-verification/orders',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const url = new URL(c.req.url);
        const visitId = url.searchParams.get('visitId') ?? undefined;
        return json(ok(listOrders(visitId || undefined)));
      } catch (e) { return mapError(e); }
    },
  },
];
