import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView, createView, rectifyView, MedicalQcError } from '../aggregators/medicalQcAggregator.js';

/** 健澜科技：DEMO_MODE 下不连 PostgreSQL，GET 列表返回内存空兜底。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/**
 * 待质控队列项（与前端 web/src/types/medicalQc.QcQueueItem 契约对齐）。
 */
export interface QcQueueItemView {
  recordId: string;
  recordType: string;
  title: string;
  status: string;
  nextLevel: number | null;
  department: string;
  visitNo: string;
  mrn: string;
  patientName: string;
  updatedAt: string;
}

/**
 * 纯函数：构造待质控病历队列的 demo 数据（DEMO_MODE 兜底，无副作用、可单测）。
 * 形状：`{ items, total }`，与前端 `fetchQcQueue()` 对齐。
 *
 * @returns 待质控队列视图
 */
export function listQueueView(): { items: QcQueueItemView[]; total: number } {
  const items: QcQueueItemView[] = [
    {
      recordId: 'R-20261015-001',
      recordType: 'progress-note',
      title: '2026-10-15 首次病程记录',
      status: 'submitted',
      nextLevel: 1,
      department: '消化内科',
      visitNo: 'ZD20261015001',
      mrn: 'MRN100234',
      patientName: '王*明',
      updatedAt: '2026-10-15T08:30:00.000Z',
    },
    {
      recordId: 'R-20261015-002',
      recordType: 'discharge-note',
      title: '2026-10-14 出院记录',
      status: 'returned',
      nextLevel: 2,
      department: '心血管内科',
      visitNo: 'ZD20261012088',
      mrn: 'MRN100567',
      patientName: '李*华',
      updatedAt: '2026-10-15T06:12:00.000Z',
    },
    {
      recordId: 'R-20261014-018',
      recordType: 'operation-note',
      title: '2026-10-14 手术记录',
      status: 'reviewed',
      nextLevel: null,
      department: '骨科',
      visitNo: 'ZD20261011056',
      mrn: 'MRN100789',
      patientName: '张*芳',
      updatedAt: '2026-10-14T16:45:00.000Z',
    },
  ];
  return { items, total: items.length };
}

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof MedicalQcError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : err.status === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const medicalQcRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/medical-qc/queue', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok(listQueueView(), 'ok', c.traceId));
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      // 真实库队列查询暂未提供，兜底返回内存 demo 队列，保证前端可渲染。
      return json(ok(listQueueView(), 'ok', c.traceId));
    } },
  { method: 'GET', path: '/api/v1/medical-qc', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok([]));
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await listView(view, c.query.get('visitId') ?? ''))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/medical-qc', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await createView(view, (await c.body()) as Record<string, unknown>))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/medical-qc/:id/rectify', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await rectifyView(view, c.params.id))); } catch (e) { return mapError(e); }
    } },
];
