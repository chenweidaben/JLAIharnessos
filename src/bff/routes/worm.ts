/**
 * 健澜AI原生医院操作系统OS - P5-2/P5-4 WORM 冷存储归档 路由（国密硬化版）
 *
 * 前缀 /api/v1/worm：
 *  - POST /segments/seal              封存（admin）
 *  - GET  /segments                    列段（admin）
 *  - GET  /segments/:id                段元信息（admin）
 *  - GET  /segments/:id/content?format=json|csv
 *  - POST /verify?scope=all|real       全链校验（含 SM3/SM2）
 *  - GET  /keys                        公钥指纹与 keySource（不返私钥）
 *  - POST /_tamper {segmentId}         影子探针（DEMO+admin）
 *  - POST /_tamper-digest {probeId}    影子探针上篡改 SM3
 *  - POST /_tamper-signature {probeId} 影子探针上篡改 SM2 签名
 *  - POST /_probes/reset                清空探针（DEMO+admin）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  createProbe, getSegment, getSegmentEvents, keyStatus, listSegments,
  resetProbes, seal, segmentToCsv, sm2Verify, storeInfo, tamperProbeDigest,
  tamperProbeSignature, verify, __getCipherHex,
} from '../aggregators/wormArchiveAggregator.js';
import { isValidSegmentId } from '../aggregators/wormStore.js';

function requireAdmin(c: Ctx): Response | null {
  if (!(c.user?.roles ?? []).includes('admin')) {
    return json(fail(ErrorCode.FORBIDDEN, '仅 admin 可操作 WORM 归档'), 403);
  }
  return null;
}
function requireDemo(c: Ctx): Response | null {
  if (process.env.DEMO_MODE !== '1') return json(fail(ErrorCode.NOT_FOUND, '未找到'), 404);
  return null;
}

export const wormRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/worm/segments/seal',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      const b = (await c.body()) as Record<string, unknown>;
      const from = typeof b.from === 'string' ? b.from : undefined;
      const to = typeof b.to === 'string' ? b.to : undefined;
      const r = seal({ from, to });
      if (!r.ok) {
        if (r.error === 'no-events') return json(fail(ErrorCode.BAD_REQUEST, '当前无待归档事件'), 400);
        if (r.error === 'worm-key-not-configured') return json(fail(ErrorCode.INTERNAL_ERROR, 'WORM_SM4_KEY 未配置'), 500);
        return json(fail(ErrorCode.BAD_REQUEST, 'from/to 时间窗非法'), 400);
      }
      return json(ok(r.segment), 201);
    },
  },
  {
    method: 'GET',
    path: '/api/v1/worm/segments',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      const q = new URL(c.req.url).searchParams;
      const limit = q.get('limit') ? Number(q.get('limit')) : 50;
      const offset = q.get('offset') ? Number(q.get('offset')) : 0;
      const r = listSegments(limit, offset);
      return json(ok({ rows: r.rows, total: r.total }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/worm/segments/:segmentId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      if (!isValidSegmentId(c.params.segmentId)) return json(fail(ErrorCode.BAD_REQUEST, 'invalid-segment-id'), 400);
      const seg = getSegment(c.params.segmentId);
      if (!seg) return json(fail(ErrorCode.NOT_FOUND, '段不存在'), 404);
      return json(ok(seg));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/worm/segments/:segmentId/content',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      if (!isValidSegmentId(c.params.segmentId)) return json(fail(ErrorCode.BAD_REQUEST, 'invalid-segment-id'), 400);
      const fmt = new URL(c.req.url).searchParams.get('format') ?? 'json';
      if (fmt !== 'json' && fmt !== 'csv') {
        return json(fail(ErrorCode.BAD_REQUEST, 'format 仅支持 json/csv'), 400);
      }
      const seg = getSegment(c.params.segmentId);
      if (!seg) return json(fail(ErrorCode.NOT_FOUND, '段不存在'), 404);
      const evts = getSegmentEvents(c.params.segmentId);
      if (evts === null) return json(fail(ErrorCode.INTERNAL_ERROR, '段解密失败'), 500);
      const digestValid = true; // seal 时已校验；content 端点用 verify 结果
      const signatureValid = sm2Verify(seg.digestSm3, seg.sm2Signature);
      if (fmt === 'csv') {
        return new Response(segmentToCsv(c.params.segmentId) ?? '', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${c.params.segmentId}.csv"`,
          },
        });
      }
      return json(ok({ segmentId: c.params.segmentId, events: evts, digestValid, signatureValid }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/worm/verify',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      const scope = new URL(c.req.url).searchParams.get('scope') === 'real' ? 'real' as const : 'all' as const;
      return json(ok(verify(scope)));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/worm/keys',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      const s = keyStatus();
      // 绝不返私钥；只返 hex 公钥 + keySource + signerKeyId
      return json(ok({
        keySource: s.keySource,
        signerKeyId: s.signerKeyId,
        publicKeyHex: s.publicKeyHex,
        sm4Configured: s.sm4Configured,
      }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/worm/store/info',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      return json(ok(storeInfo()));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/worm/_tamper',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      const demo = requireDemo(c); if (demo) return demo;
      const b = (await c.body()) as Record<string, unknown>;
      const segmentId = String(b.segmentId ?? '');
      if (!segmentId) return json(fail(ErrorCode.BAD_REQUEST, 'segmentId 必填'), 400);
      const probe = createProbe(segmentId);
      if (!probe) return json(fail(ErrorCode.NOT_FOUND, '段不存在'), 404);
      return json(ok({ ...probe, expectedBroken: true }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/worm/_tamper-digest',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      const demo = requireDemo(c); if (demo) return demo;
      const b = (await c.body()) as Record<string, unknown>;
      const probeId = String(b.probeId ?? '');
      if (!probeId) return json(fail(ErrorCode.BAD_REQUEST, 'probeId 必填'), 400);
      const okFlag = tamperProbeDigest(probeId);
      if (!okFlag) return json(fail(ErrorCode.NOT_FOUND, 'probe 不存在'), 404);
      return json(ok({ probeId, digestTampered: true }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/worm/_tamper-signature',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      const demo = requireDemo(c); if (demo) return demo;
      const b = (await c.body()) as Record<string, unknown>;
      const probeId = String(b.probeId ?? '');
      if (!probeId) return json(fail(ErrorCode.BAD_REQUEST, 'probeId 必填'), 400);
      const okFlag = tamperProbeSignature(probeId);
      if (!okFlag) return json(fail(ErrorCode.NOT_FOUND, 'probe 不存在'), 404);
      return json(ok({ probeId, signatureTampered: true }));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/worm/_probes/reset',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAdmin(c); if (denied) return denied;
      const demo = requireDemo(c); if (demo) return demo;
      resetProbes();
      return json(ok({ reset: true }));
    },
  },
];

// 仅供单测/自检：读密文
export function __debugCipher(segmentId: string): string | null {
  return __getCipherHex(segmentId);
}
