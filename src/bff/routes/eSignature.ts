/**
 * 健澜科技 jlmedaios - 电子签名路由（M138-B · 电子签名）
 *
 * 【新业务场景】电子签名（法律效力留痕）
 *   POST /api/v1/esignature/sign            提交一份手写签名（病历/处方/手术同意书）
 *   GET  /api/v1/esignature/verify/:id      按签名 id 验证是否有效（未篡改、未作废）
 *
 * 法律意识：路由层负责把「签署来源 IP」这一法律效力要素从请求上下文（c.clientIp）
 *   取出，连同签署人一并交给聚合器封存；不采信前端自报 IP。
 *
 * 医疗安全：签名动作本身不改变诊疗结论，仅作为责任留痕；最终诊疗由医师本人负责。
 * 权限：仅登录医护可用；签署人缺省取当前登录用户，越权代签需显式 staffId。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  createSignature,
  DOCUMENT_TYPES,
  type DocumentType,
  persistSignature,
  verifySignature,
} from '../aggregators/eSignatureAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 提交签名请求体 */
interface SignBody {
  /** 单据类型：病历 / 处方 / 手术同意书 */
  documentType?: DocumentType;
  /** 被签业务单据 id */
  documentId?: string;
  /** 手写签名笔迹 PNG（base64 data URL） */
  signatureData?: string;
  /** 显式指定签署人；缺省 = 当前登录用户 */
  staffId?: string;
}

export const eSignatureRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/esignature/sign',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      let body: SignBody;
      try {
        body = await c.body<SignBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      const documentType = body.documentType;
      if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
        return json(
          fail(
            ErrorCode.BAD_REQUEST,
            `documentType 必须为 ${DOCUMENT_TYPES.join(' / ')} 之一`,
            c.traceId,
          ),
          400,
        );
      }
      if (!body.documentId || typeof body.documentId !== 'string') {
        return json(fail(ErrorCode.BAD_REQUEST, 'documentId 不能为空', c.traceId), 400);
      }
      if (!body.signatureData || typeof body.signatureData !== 'string') {
        return json(fail(ErrorCode.BAD_REQUEST, 'signatureData（手写笔迹）不能为空', c.traceId), 400);
      }

      // 签署人缺省取当前登录用户；法律效力：谁登录、谁负责
      const staffId = body.staffId?.trim() || c.user?.id || '';

      try {
        const signature = createSignature(
          staffId,
          documentType,
          body.documentId.trim(),
          body.signatureData,
          { clientIp: c.clientIp },
        );
        // best-effort 落库电子证据（时间/IP/笔迹/封存指纹），失败不阻断
        await persistSignature(signature);
        return json(ok({ signature }, '签名成功'));
      } catch (err) {
        console.error(`[eSignature] POST /sign [${c.traceId}]`, err);
        return json(
          fail(
            ErrorCode.BAD_REQUEST,
            err instanceof Error ? err.message : '签名失败',
            c.traceId,
          ),
          400,
        );
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/esignature/verify/:id',
    auth: true,
    handle: (c: Ctx): Response => {
      const id = c.params.id || '';
      if (!id) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少签名 id', c.traceId), 400);
      }
      const valid = verifySignature(id);
      return json(ok({ id, valid }, valid ? '签名有效' : '签名无效或已作废'));
    },
  },
];
