/**
 * 健澜科技 jlmedaios - 护士交接班记录路由（214）
 *
 * POST /api/v1/nurse/handoff        登记交班记录（交班本）
 * GET  /api/v1/nurse/handoff?wardId= 按病区列交班记录（接班本）
 *
 * 权限复用 nursing:record；不触碰 WebSocket、不新增权限码。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView, recordView, NurseHandoffError } from '../aggregators/nurseHandoffAggregator.js';

/** DEMO_MODE 下不连 PostgreSQL，返回内存演示交班本（M198 空数据修复）。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

function demoHandoffList() {
  return [
    { id: 'demo-handoff-01', wardId: 'ward_3f', shift: 'day', patientId: 'P001', summary: '患者：王*英 / 08床\n诊断：冠心病 急性心梗\n护理级别：特级护理\n生命体征：T 36.8℃，P 78次/分，BP 128/76mmHg，SpO₂ 98%\n护理要点：1.[监护]持续心电监护；2.[用药]阿司匹林 qd\n风险提示：高危（压疮/跌倒/坠床风险，重点交接防护措施）\n接班待办：1)18:00 测量血压；2)观察胸痛变化', createdBy: 'u_2002', createdAt: '2026-10-19 08:00' },
    { id: 'demo-handoff-02', wardId: 'ward_3f', shift: 'evening', patientId: 'P002', summary: '患者：刘*梅 / 11床\n诊断：2型糖尿病 糖尿病酮症\n护理级别：一级护理\n生命体征：T 36.5℃，P 92次/分，BP 110/68mmHg，SpO₂ 99%\n护理要点：1.[饮食]糖尿病饮食；2.[监测]每小时血糖\n风险提示：高危（低血糖风险）\n接班待办：1)20:00 复查血糖；2)胰岛素泵监测', createdBy: 'u_2002', createdAt: '2026-10-19 16:00' },
    { id: 'demo-handoff-03', wardId: 'ward_3f', shift: 'night', patientId: 'P003', summary: '患者：张*华 / 10床\n诊断：社区获得性肺炎\n护理级别：一级护理\n生命体征：T 38.6℃，P 96次/分，BP 118/72mmHg，SpO₂ 95%\n护理要点：1.[呼吸]雾化吸入 tid；2.[体温]每4小时测量\n风险提示：中危（加强巡视与宣教）\n接班待办：1)22:00 物理降温；2)记录出入量', createdBy: 'u_2002', createdAt: '2026-10-19 22:00' },
  ];
}

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof NurseHandoffError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const nurseHandoffRoutes: RouteDef[] = [
  {
    method: 'GET', path: '/api/v1/nurse/handoff', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok(demoHandoffList()));
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        return json(ok(await listView(view, c.query.get('wardId') ?? '')));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST', path: '/api/v1/nurse/handoff', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        return json(ok(await recordView(view, (await c.body()) as Record<string, unknown>)));
      } catch (e) { return mapError(e); }
    },
  },
];
