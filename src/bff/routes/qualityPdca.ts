/**
 * 健澜科技 jlmedaios — 【质量与合规】医院质量管理 PDCA 路由（M155-A）
 *
 * POST /api/v1/quality/pdca
 *   body.action = 'create'  → 新建改进项目（Plan 阶段）
 *   body.action = 'advance' → 阶段推进（Plan→Do→Check→Act→Plan 下一循环）
 *   body.action = 'effect'  → Check 阶段 before/after 效果计算
 *
 * 本路由为薄壳：鉴权 + 参数透传给纯函数聚合器 qualityPdcaAggregator。
 * 状态机校验与效果数学全部在纯函数层完成，路由不重复实现业务规则。
 *
 * 权限：登录即可访问（auth:true）；后续接 medmuse.rbac 时按
 * quality_pdca:manage / quality_pdca:view 收紧。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  advancePDCAPhase,
  calculatePDCAEffect,
  createPDCAProject,
  PdcaError,
  type PDCAProject,
  type PDCAPhase,
} from '../aggregators/qualityPdcaAggregator';

function mapError(err: unknown): Response {
  if (err instanceof PdcaError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(
    fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'PDCA 处理失败'),
    500,
  );
}

interface CreateBody {
  action: 'create';
  name?: string;
  dept?: string;
  leader?: string;
  target?: PDCAProject['target'];
}

interface AdvanceBody {
  action: 'advance';
  project?: PDCAProject;
  nextPhase?: PDCAPhase;
  note?: string;
}

interface EffectBody {
  action: 'effect';
  project?: PDCAProject;
}

async function handlePost(c: Ctx): Promise<Response> {
  const body = await c.body<CreateBody | AdvanceBody | EffectBody>();
  try {
    if (!body || typeof body !== 'object' || !body.action) {
      throw new PdcaError(400, '缺少 action 字段（create / advance / effect）');
    }
    if (body.action === 'create') {
      const b = body as CreateBody;
      if (!b.target) throw new PdcaError(400, '缺少 target 量化目标');
      const project = createPDCAProject(b.name ?? '', b.dept ?? '', b.leader ?? '', b.target);
      return json(ok(project, 'PDCA 项目已创建'));
    }
    if (body.action === 'advance') {
      const b = body as AdvanceBody;
      if (!b.project) throw new PdcaError(400, '缺少 project');
      if (!b.nextPhase) throw new PdcaError(400, '缺少 nextPhase');
      const next = advancePDCAPhase(b.project, b.nextPhase, { note: b.note });
      return json(ok(next, `已推进到 ${next.phase} 阶段`));
    }
    if (body.action === 'effect') {
      const b = body as EffectBody;
      if (!b.project) throw new PdcaError(400, '缺少 project');
      const effect = calculatePDCAEffect(b.project);
      return json(ok(effect, '效果计算完成'));
    }
    throw new PdcaError(400, `未知 action：${(body as { action: string }).action}`);
  } catch (err) {
    return mapError(err);
  }
}

export const qualityPdcaRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/quality/pdca',
    handle: handlePost,
    auth: true,
  },
];
