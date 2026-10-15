/**
 * 健澜科技 jlmedaios - 护理交接班智能助手路由（M120-C，依据宪法第七章）
 *
 * GET /api/v1/assistant/handover?wardId=xxx&shift=day
 *   一键生成本病区本班次的交班结构化结果 + 交班报告文本。
 *
 * 数据装配：生产环境由护理记录 / 风险评估 / 待办任务 / 经验教训库汇聚后注入
 * buildNursingHandover；本路由先以院内演示数据集走通聚合与报告链路（依据宪法第七章）。
 * 权限复用既有 nursing:record；不触碰 WebSocket、不新增依赖与权限码。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildNursingHandover,
  formatHandoverReport,
  type NursingHandoverData,
} from '../aggregators/nursingHandoverAggregator.js';

/** DEMO_MODE 下不连 PostgreSQL，直接返回演示数据集聚合结果。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 演示数据集：生产环境替换为各业务系统实时聚合（依据宪法第七章：脱敏后入参） */
function fixtureData(wardId: string): NursingHandoverData {
  const all: NursingHandoverData = {
    patients: [
      { patientId: 'P001', name: '王桂英', bedNo: '12', diagnosis: '肺部感染', nursingLevel: 'level1', riskScore: 82, riskFlags: ['fall', 'bedsore'], notes: '今晨体温38.2℃，物理降温后复查' },
      { patientId: 'P002', name: '李建国', bedNo: '08', diagnosis: '冠心病', nursingLevel: 'special', riskScore: 75, riskFlags: ['tube'], notes: '留置中心静脉导管，夜间巡视穿刺点' },
      { patientId: 'P003', name: '张兰', bedNo: '15', diagnosis: '2型糖尿病', nursingLevel: 'level2', riskScore: 24, riskFlags: [], notes: '血糖控制平稳' },
      { patientId: 'P004', name: '赵德柱', bedNo: '21', diagnosis: '股骨颈骨折术后', nursingLevel: 'level1', riskScore: 63, riskFlags: ['fall', 'vte'], notes: '术后第2天，指导踝泵运动' },
    ],
    carePoints: [
      { patientId: 'P001', category: '呼吸道护理', content: '体位引流每日2次，餐后1小时进行' },
      { patientId: 'P002', category: '管路护理', content: 'CVC敷料每班评估渗血渗液，按周更换' },
      { patientId: 'P004', category: '跌倒预防', content: '床栏拉起，呼叫器置于随手可及处' },
    ],
    pendingTasks: [
      { taskId: 'T01', patientId: 'P001', patientName: '王桂英', content: '复查血常规+CRP', priority: 1 },
      { taskId: 'T02', patientId: 'P002', patientName: '李建国', content: '记录24小时出入量并小结', priority: 2 },
      { taskId: 'T03', patientId: 'P003', patientName: '张兰', content: '空腹血糖监测', priority: 3 },
      { taskId: 'T04', patientId: 'P004', patientName: '赵德柱', content: '已完成：患肢按摩', priority: 1, done: true },
    ],
    lessons: [
      { lessonId: 'L01', title: '夜间坠床风险交接', summary: '躁动患者需双人核对约束带并床头交班', level: 'warn' },
      { lessonId: 'L02', title: '交班本规范', summary: '生命体征须记录实测值，禁止补记估写', level: 'tip' },
    ],
  };
  // 演示态下 wardId 不影响数据集合，仅透传展示
  void wardId;
  return all;
}

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 业务错误：交班助手专用（依据宪法第七章：权限与参数错误显式提示） */
export class NursingHandoverError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function mapError(err: unknown): Response {
  if (err instanceof NursingHandoverError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const assistantHandoverRoutes: RouteDef[] = [
  {
    method: 'GET', path: '/api/v1/assistant/handover', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const wardId = c.query.get('wardId') ?? '';
      const shift = c.query.get('shift') ?? 'day';

      // DEMO 态：不鉴权直出演示结果，便于前端联调三态
      if (isDemo) {
        const handover = buildNursingHandover('demo-nurse', wardId, shift, fixtureData(wardId));
        return json(ok({ handover, report: formatHandoverReport(handover) }));
      }

      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        if (!view.permissions.includes('nursing:record')) {
          throw new NursingHandoverError(403, '无交接班查看权限');
        }
        const handover = buildNursingHandover(view.id, wardId, shift, fixtureData(wardId));
        return json(ok({ handover, report: formatHandoverReport(handover) }));
      } catch (e) { return mapError(e); }
    },
  },
];
