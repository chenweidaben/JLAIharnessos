/**
 * 健澜科技 jlmedaios - M161-D 医院资源智能调配 BFF 路由（管理驾驶舱，仅 admin）
 *
 * POST /api/v1/admin/resource/optimize
 *  - 对床位 / 手术室 / 人员三类资源做一次智能调配，并给出资源利用率体检；
 *  - 【核心约束】调配公平：人员派工按「本周已加班最少者优先」，守住加班上限，
 *    杜绝任何人被反复安排连轴加班；
 *  - 【本切片边界】纯函数 + 路由 + 前端，不写 SQL、无新表；
 *    传入空 body（或 demo=true）时返回确定性演示样本，由真实纯函数折算；
 *    真实接入后仅替换数据来源，纯函数签名不变；
 *  - 【远期深化】接入 operation.bed_dynamic / operation.or_schedule /
 *    hr.shift_roster 后，结果自动落库并推送排班中台，实现周级滚动自动排班。
 *
 * 医疗安全：仅 admin 角色（requireRole 内部处理 401/403），只读聚合、无写副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  getResourceUtilization,
  optimizeBedAllocation,
  optimizeOperatingRoom,
  optimizeStaffAssignment,
  type BedDeptInput,
  type BedDemand,
  type OperatingRoom,
  type StaffDemand,
  type StaffMember,
  type SurgerySlot,
  type UtilizationObservation,
} from '../aggregators/resourceOptimizeAggregator';

/** 请求体：可空，空则走演示样本 */
interface OptimizeBody {
  demo?: boolean;
  bedDept?: BedDeptInput;
  bedDemand?: BedDemand;
  orSchedule?: SurgerySlot[];
  orRooms?: OperatingRoom[];
  staffDemand?: StaffDemand;
  staffPool?: StaffMember[];
  utilizationObs?: UtilizationObservation;
  period?: string;
}

/**
 * 构造确定性演示样本（与 adminHealth / autoLearn 一致的风格）：
 *  - 床位：骨科偏紧（预测过载→借床），内科偏松（可释放支援）；
 *  - 手术室：1 间房、若干台手术，含 1 台急诊插队；
 *  - 人员：麻醉科 4 名候选，其中 1 人已加班接近上限（应被公平跳过）。
 */
function buildDemoPayload(): Required<Pick<OptimizeBody,
  | 'bedDept' | 'bedDemand' | 'orSchedule' | 'orRooms'
  | 'staffDemand' | 'staffPool' | 'utilizationObs'>> & { period: string } {
  return {
    period: 'day',
    bedDept: { deptId: 'dept_ortho', deptName: '骨科', totalBeds: 60, occupiedBeds: 56 },
    bedDemand: { expectedAdmissions: 12, expectedDischarges: 6, criticalCareNeeded: 2 },
    orSchedule: [
      { surgeryId: 's001', specialty: 'general', durationMin: 90, urgency: 'routine', requestedStartMin: 8 * 60 },
      { surgeryId: 's002', specialty: 'general', durationMin: 60, urgency: 'routine', requestedStartMin: 8 * 60 },
      { surgeryId: 's003', specialty: 'ortho', durationMin: 120, urgency: 'urgent', requestedStartMin: 9 * 60 },
      { surgeryId: 's004', specialty: 'general', durationMin: 45, urgency: 'emergency', requestedStartMin: 10 * 60 },
    ],
    orRooms: [{ roomId: 'OR-1', openMin: 8 * 60, closeMin: 17 * 60 }],
    staffDemand: { requiredSkill: 'anesthesia', shift: 'day', requiredCount: 2, expectedHours: 4 },
    staffPool: [
      { staffId: 'p1', name: '张医生', skills: ['anesthesia', 'nursing'], weeklyOvertimeHours: 2, maxOvertimeAllowed: 8, availableShifts: ['day', 'night'] },
      { staffId: 'p2', name: '李医生', skills: ['anesthesia'], weeklyOvertimeHours: 6, maxOvertimeAllowed: 8, availableShifts: ['day'] },
      { staffId: 'p3', name: '王医生', skills: ['anesthesia'], weeklyOvertimeHours: 9, maxOvertimeAllowed: 8, availableShifts: ['day', 'swing'] },
      { staffId: 'p4', name: '赵医生', skills: ['general'], weeklyOvertimeHours: 1, maxOvertimeAllowed: 8, availableShifts: ['day'] },
    ],
    utilizationObs: {
      bedOccupied: 56, bedTotal: 60,
      orUsedMin: 315, orTotalMin: 540,
      staffHoursUsed: 120, staffHoursBudget: 140,
    },
  };
}

/** POST /api/v1/admin/resource/optimize */
async function handleOptimize(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  let body: OptimizeBody | null = null;
  try {
    body = (await c.body()) as OptimizeBody | null;
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
  }

  const demoSource = buildDemoPayload();
  const input: OptimizeBody = body ?? {};
  const demo = input.demo !== false; // 默认演示；显式 demo=false 才严格使用传入数据

  try {
    const bedDept = input.bedDept ?? demoSource.bedDept;
    const bedDemand = input.bedDemand ?? demoSource.bedDemand;
    const orSchedule = input.orSchedule ?? demoSource.orSchedule;
    const orRooms = input.orRooms ?? demoSource.orRooms;
    const staffDemand = input.staffDemand ?? demoSource.staffDemand;
    const staffPool = input.staffPool ?? demoSource.staffPool;
    const utilizationObs = input.utilizationObs ?? demoSource.utilizationObs;
    const period = input.period ?? demoSource.period;

    const bed = optimizeBedAllocation(bedDept, bedDemand);
    const orResult = optimizeOperatingRoom(orSchedule, orRooms);
    // 公平派工：第二参数为科室上下文（本切片未使用），第三参数为人员池
    const staff = optimizeStaffAssignment({}, staffDemand, staffPool);
    const utilization = getResourceUtilization({ deptName: bedDept.deptName }, period, utilizationObs);

    return json(
      ok(
        {
          bed,
          or: orResult,
          staff,
          utilization,
          fairnessNote: '人员派工按本周已加班最少者优先，触及加班上限者自动跳过，避免个别人总加班。',
          demo,
          notice: demo
            ? '演示模式：输入为确定性演示样本；接入床位/手术/排班表后，调配结果自动切换为真实数据'
            : undefined,
        },
        '资源调配方案已生成',
        c.traceId,
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '资源调配计算失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const resourceOptimizeRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/admin/resource/optimize',
    auth: true,
    handle: handleOptimize,
  },
];
