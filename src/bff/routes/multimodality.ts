/**
 * MEDMUSE 多模态扩展 BFF 路由 - 检验报告 PDF/图片 OCR 预留。
 *
 * 端点：
 *   POST /api/v1/multimodality/lab-report
 *     DEMO 模式仅接受 fileName / mime 字段，不读取、不解析真实文件，
 *     直接返回 agents/multimodality.parseLabReport 的结构化 mock 结果。
 *
 * 医疗安全：需登录（requireAuth）；当前不暴露文件内容解析，后续接真实
 * OCR 引擎时须叠加文件大小/类型校验与敏感水印。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requireAuth } from '../middleware/auth';
import { parseLabReport } from '../agents/multimodality';

export const multimodalityRoutes: RouteDef[] = [
  // ----- 检验报告结构化解析（DEMO） -----
  {
    method: 'POST',
    path: '/api/v1/multimodality/lab-report',
    auth: true,
    handle: async (c) => {
      const denied = requireAuth(c);
      if (denied) return denied;
      try {
        const body = await c.body<{ fileName?: string; mime?: string }>();
        const fileName = body?.fileName?.trim() || 'lab-report.pdf';
        const mime = body?.mime?.trim() || 'application/pdf';

        // DEMO 骨架：不解析真实文件，仅按 fileName/mime 返回结构化 mock
        const result = parseLabReport(fileName, mime);
        return json(ok(result));
      } catch (err) {
        console.error(`[multimodality error] ${c.req.method} ${c.req.url} [${c.traceId}]`, err);
        return json(fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId), 500);
      }
    },
  },
];
