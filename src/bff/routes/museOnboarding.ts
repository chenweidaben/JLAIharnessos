/**
 * 健澜科技 jlmedaios - 后继者入职向导路由（M115-C）
 * GET /api/v1/muse/onboarding — 新员工入职引导数据
 *
 * 依据宪法第七章 7.8「后继者机制」：登录新员工进入岗位工作台时，
 * 自动加载本科室基线 + Top5 高频成功经验 + Top3 必读教训 + 推荐路径。
 *
 * 数据源：当前为院内 Personal Agent 经验行的进程内演示快照
 *（与 medmuse 路由 demo 模式同风格，不连 PostgreSQL、不抛错）；
 * 后续接入 medmuse 经验库仓库后，仅需替换 STAFF_MUSE_SNAPSHOT 的
 * 取数来源，buildDeptMuse / buildNewHireOnboarding 纯函数不变。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDeptMuse,
  type StaffMuseEntry,
  type StaffRole,
} from '../aggregators/deptMuseAggregator.js';
import { buildNewHireOnboarding } from '../aggregators/onboardingAggregator.js';

/**
 * 院内 Personal Agent 经验行快照（演示用，camelCase，与 M114 契约一致）。
 * 仅用于打通 7.8 后继者机制链路；不依赖数据库。
 */
const STAFF_MUSE_SNAPSHOT: StaffMuseEntry[] = [
  // —— 内科 DEP-IM：成功经验 ——
  { staffId: 'im-d1', staffName: '王医生', role: 'doctor', deptCode: 'DEP-IM', topic: 'CAP 经验性抗感染首选', content: '社区获得性肺炎首选 β-内酰胺类联合大环内酯类，48~72h 复评降阶梯。', decisionCount: 32, isFailure: false, successRate: 0.89 },
  { staffId: 'im-d2', staffName: '李医生', role: 'doctor', deptCode: 'DEP-IM', topic: 'CAP 经验性抗感染首选', content: '先按 CURB-65 分层再选药，门诊轻症单用大环内酯类即可。', decisionCount: 18, isFailure: false, successRate: 0.92 },
  { staffId: 'im-d3', staffName: '赵医生', role: 'doctor', deptCode: 'DEP-IM', topic: '降糖路径：出院前调稳基础量', content: '出院前 3 天把空腹血糖调到 7mmol/L 以下再办出院，随访复住院率明显下降。', decisionCount: 24, isFailure: false, successRate: 0.86 },
  { staffId: 'im-n1', staffName: '张护士', role: 'nurse', deptCode: 'DEP-IM', topic: '跌倒初筛入院即做', content: '入院 24h 内完成 Morse 跌倒初筛，高风险患者床头挂警示牌并每班交班。', decisionCount: 21, isFailure: false, successRate: 0.95 },
  { staffId: 'im-n2', staffName: '陈护士', role: 'nurse', deptCode: 'DEP-IM', topic: '跌倒初筛入院即做', content: '初筛结果与医嘱联动，高风险者宣教陪伴如厕。', decisionCount: 9, isFailure: false, successRate: 0.9 },
  { staffId: 'im-p1', staffName: '周药师', role: 'pharmacist', deptCode: 'DEP-IM', topic: '华法林起始必查基线 INR', content: '华法林起始剂量前务必确认基线 INR 与合并用药，胺碘酮联用减半。', decisionCount: 15, isFailure: false, successRate: 0.93 },
  // —— 内科 DEP-IM：失败教训（7.7 失败经验单独成桶）——
  { staffId: 'im-d4', staffName: '孙医生', role: 'doctor', deptCode: 'DEP-IM', topic: '皮试结果误判', content: '青霉素皮试弱阳性被误判为阴性，术后过敏性休克，教训：可疑阳性一律按阳性处理并备肾上腺素。', decisionCount: 4, isFailure: true, successRate: 0.25 },
  { staffId: 'im-n3', staffName: '吴护士', role: 'nurse', deptCode: 'DEP-IM', topic: '交接班遗漏危急值', content: '交班时漏交一次血钾危急值，次日才发现，教训：危急值必须书面 + 口头双交班并签字闭环。', decisionCount: 3, isFailure: true, successRate: 0.33 },
  { staffId: 'im-d5', staffName: '郑医生', role: 'doctor', deptCode: 'DEP-IM', topic: '出院带药超量', content: '出院带药量超过 14 天被稽核退回，教训：慢性病带药不超过 14 天并嘱复诊。', decisionCount: 2, isFailure: true, successRate: 0.5 },
  { staffId: 'im-d6', staffName: '冯医生', role: 'doctor', deptCode: 'DEP-IM', topic: '未复查影像即停抗凝', content: '肺栓塞患者未复查 D-二聚体擅自停抗凝，复发再入院，教训：停药指征必须有复查依据。', decisionCount: 2, isFailure: true, successRate: 0.5 },
];

/** iam 原始角色码 → 院内 StaffRole（未知回落 doctor） */
function toStaffRole(rawRoles: readonly string[]): StaffRole {
  const head = rawRoles[0] ?? '';
  if (head === 'nurse' || head === 'pharmacist') return head;
  return 'doctor';
}

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

export const museOnboardingRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/onboarding',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录', c.traceId), 401);
      try {
        const role = toStaffRole(view.rawRoles);
        const deptCode = view.deptCode;
        // 7.8：按科室聚合经验基线 → 组装入职向导（纯函数，空科室自动兜底）
        const deptMuse = buildDeptMuse(deptCode, STAFF_MUSE_SNAPSHOT);
        const onboarding = buildNewHireOnboarding(role, deptCode, deptMuse);
        return json(
          ok({
            deptCode,
            deptName: view.deptName,
            role,
            ...onboarding,
          }),
        );
      } catch (err) {
        console.error(`[muse-onboarding error] ${c.req.url} [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, '入职向导加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
