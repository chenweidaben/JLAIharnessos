/**
 * 健澜科技 jlmedaios - 医院资源智能调配聚合器（M161-D · 资源公平调度）
 *
 * 【核心原则：资源调配要公平，不能有人总加班】
 * 在床位利用率最大化（>85%）、手术室周转提速（减少等待）、人员技能对症上岗、
 * 患者等待最短的同时，硬性约束「轮班公平」——把加班摊薄到周均加班最少的人身上，
 * 任何人不得被反复安排到超过其加班上限，杜绝「老实人连轴转」。
 *
 * 四个纯函数（无副作用、不直连数据库、不触碰 WebSocket）：
 *  - optimizeBedAllocation(dept, demand)
 *      床位再分配：按预计出入院推算占用率，超压科建议借床/转出，低占用科释放支援；
 *  - optimizeOperatingRoom(surgerySchedule)
 *      手术室排程：急诊优先 + 贪心最早可用房间，最小化总等待与空置；
 *  - optimizeStaffAssignment(dept, demand, staffSkills)
 *      人员匹配：技能硬过滤后，按「本周已加班最少」优先派工，守住加班上限；
 *  - getResourceUtilization(dept, period)
 *      资源利用率体检：床位/手术室/人员三维度，定位瓶颈。
 *
 * 【远期深化】当前切片为进程内纯函数 + 路由 + 前端，不写 SQL、无新表；
 *   远期接入 operation.bed_dynamic / operation.or_schedule / hr.shift_roster 三表后，
 *   本模块签名不变，仅替换数据来源，并由 AI 健康大脑做周级滚动预测与自动排班。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                 */
/* ------------------------------------------------------------------ */

/** 床位调配的目标占用区间（%）：低于 85% 视为资源闲置，高于 92% 视为过载 */
export const BED_TARGET_LOW = 0.85;
export const BED_TARGET_HIGH = 0.92;

/** 科室床位现状（入参） */
export interface BedDeptInput {
  deptId: string;
  deptName: string;
  /** 编制/可用总床位数 */
  totalBeds: number;
  /** 当前已占用床位数 */
  occupiedBeds: number;
}

/** 床位需求预测（入参） */
export interface BedDemand {
  /** 预计入院人数 */
  expectedAdmissions: number;
  /** 预计出院人数 */
  expectedDischarges: number;
  /** 需转入监护/抢救床位数 */
  criticalCareNeeded?: number;
  /** 需隔离床位数 */
  isolationNeeded?: number;
}

/** 床位调剂建议 */
export interface BedTransfer {
  fromDept: string;
  toDept: string;
  beds: number;
  reason: string;
}

/** 床位调配结果（出参） */
export interface BedAllocationResult {
  deptId: string;
  deptName: string;
  /** 当前占用率 0-1 */
  currentUtilization: number;
  /** 调配后预计占用率 0-1 */
  projectedUtilization: number;
  /** 目标占用率 */
  targetUtilization: number;
  /** 建议申请借床（本空间不足时） */
  requestedBeds: number;
  /** 可对外支援/释放的床位数 */
  spareBeds: number;
  /** 需监护/隔离等特殊床位数 */
  specialBedsNeeded: number;
  /** 调剂建议列表 */
  transfers: BedTransfer[];
  /** 结论说明 */
  notes: string[];
}

/** 手术室排程：一台待排手术（入参） */
export interface SurgerySlot {
  surgeryId: string;
  /** 手术专科（决定适合的房间类型） */
  specialty: string;
  /** 预计手术时长（分钟） */
  durationMin: number;
  /** 紧急度：急诊最高优先级 */
  urgency: 'routine' | 'urgent' | 'emergency';
  /** 期望开始时刻（当日 0 点起的分钟数） */
  requestedStartMin: number;
}

/** 手术室可用窗口（入参） */
export interface OperatingRoom {
  roomId: string;
  /** 当日开放起（分钟） */
  openMin: number;
  /** 当日关闭止（分钟） */
  closeMin: number;
}

/** 已排定的手术（出参） */
export interface AssignedSurgery {
  surgeryId: string;
  roomId: string;
  startMin: number;
  endMin: number;
  /** 相对期望时刻的等待分钟（>0 表示延后等待） */
  waitMin: number;
}

/** 手术室排程结果（出参） */
export interface OrOptimizeResult {
  schedule: AssignedSurgery[];
  /** 排不进当日窗口而顺延的手术 */
  deferred: SurgerySlot[];
  /** 总等待分钟（患者/术者视角） */
  totalWaitMin: number;
  /** 当日最后一台结束时刻（makespan） */
  makespanMin: number;
  /** 房间总空置分钟 */
  idleMin: number;
  /** 房间整体利用率 0-1 */
  utilization: number;
}

/** 人员档案（入参）：技能 + 加班负荷是公平派工的两个关键维度 */
export interface StaffMember {
  staffId: string;
  name: string;
  /** 持证/擅长技能标签，如 'general_surgery' | 'nursing' | 'anesthesia' */
  skills: string[];
  /** 本周已累计加班小时（公平依据：越少越优先派工） */
  weeklyOvertimeHours: number;
  /** 本周允许的加班上限（小时） */
  maxOvertimeAllowed: number;
  /** 可上的班次 */
  availableShifts: Array<'day' | 'night' | 'swing'>;
}

/** 班次人力需求（入参） */
export interface StaffDemand {
  /** 需要的技能（硬性匹配，不对症不上岗） */
  requiredSkill: string;
  /** 目标班次 */
  shift: 'day' | 'night' | 'swing';
  /** 需要的人数 */
  requiredCount: number;
  /** 本次派工预计占用/加班小时 */
  expectedHours: number;
}

/** 一次派工结果（出参） */
export interface StaffAssignment {
  staffId: string;
  name: string;
  /** 技能是否对症命中 */
  skillMatched: boolean;
  /** 本次分配小时 */
  assignedHours: number;
  /** 派工后该员工本周累计加班（小时） */
  projectedOvertimeHours: number;
  /** 是否触及加班上限 */
  atLimit: boolean;
}

/** 人员调配结果（出参） */
export interface StaffAssignResult {
  requiredSkill: string;
  shift: string;
  assignments: StaffAssignment[];
  /** 公平性得分 0-1：越接近 1，加班越摊薄、无人被反复压榨 */
  fairnessScore: number;
  /** 仍超加班上限（需主管介入调休）的员工 */
  overloadedStaff: string[];
  /** 未被满足的需求人数 */
  unmetDemand: number;
}

/** 资源利用率体检输入 */
export interface UtilizationObservation {
  /** 床位：已占用 / 总数 */
  bedOccupied: number;
  bedTotal: number;
  /** 手术室：当日已用分钟 / 可用分钟 */
  orUsedMin: number;
  orTotalMin: number;
  /** 人员：已投入工时 / 预算工时 */
  staffHoursUsed: number;
  staffHoursBudget: number;
}

/** 资源利用率体检结果 */
export interface UtilizationResult {
  period: string;
  bedUtilization: number;
  orUtilization: number;
  staffUtilization: number;
  /** 综合负载得分 0-1 */
  overallScore: number;
  /** 最紧张的环节 */
  bottleneck: 'beds' | 'or' | 'staff' | 'balanced';
}

/* ------------------------------------------------------------------ */
/* 工具                                                                 */
/* ------------------------------------------------------------------ */

/** 安全的比率计算，避免除零，截断到 [0,1] */
function ratio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  const r = numerator / denominator;
  if (r < 0) return 0;
  return r > 1 ? 1 : r;
}

/** 紧急度权重：急诊最先排 */
function urgencyWeight(u: SurgerySlot['urgency']): number {
  if (u === 'emergency') return 0;
  if (u === 'urgent') return 1;
  return 2;
}

/* ------------------------------------------------------------------ */
/* 1. 床位调配                                                          */
/* ------------------------------------------------------------------ */

/**
 * optimizeBedAllocation —— 床位再分配
 *
 * 逻辑：
 *  1. 用「占用 + 入院 - 出院」推算下一周期占用率；
 *  2. 投影占用率 > 92%（过载）→ 计算缺床量，建议借床并把稳定术后患者转出；
 *  3. 投影占用率 < 85%（闲置）→ 计算可释放床位对外支援；
 *  4. 特殊床位（监护/隔离）单列需求，不挤占普通床位结论。
 *
 * 【远期深化】接入区域床位调度中心后，transfers 的 toDept 由「就近低占用科」
 *   升级为「实时预测缺口最小的兄弟科室」，并自动生成转科单。
 */
export function optimizeBedAllocation(dept: BedDeptInput, demand: BedDemand): BedAllocationResult {
  const total = Math.max(0, Math.floor(dept.totalBeds));
  const occupied = Math.min(Math.max(0, Math.floor(dept.occupiedBeds)), total);
  const admissions = Math.max(0, Math.floor(demand.expectedAdmissions));
  const discharges = Math.max(0, Math.floor(demand.expectedDischarges));

  const projected = Math.max(0, occupied + admissions - discharges);
  const currentUtilization = ratio(occupied, total);
  const projectedUtilization = ratio(projected, total);
  const specialBedsNeeded = Math.max(0, Math.floor(demand.criticalCareNeeded ?? 0)) + Math.max(0, Math.floor(demand.isolationNeeded ?? 0));

  const notes: string[] = [];
  const transfers: BedTransfer[] = [];
  let requestedBeds = 0;
  let spareBeds = 0;

  if (projectedUtilization > BED_TARGET_HIGH) {
    // 过载：缺床量 = 投影 - 92% 上限对应的床数（向上取整）
    const overTarget = Math.ceil(projected - total * BED_TARGET_HIGH);
    requestedBeds = Math.max(0, overTarget);
    notes.push(`预测占用率 ${(projectedUtilization * 100).toFixed(1)}% 高于 ${(BED_TARGET_HIGH * 100).toFixed(0)}% 警戒线，建议向兄弟科室借床 ${requestedBeds} 张。`);
    if (requestedBeds > 0) {
      transfers.push({
        fromDept: dept.deptName,
        toDept: '低占用兄弟科室',
        beds: requestedBeds,
        reason: '将病情稳定、可转后养的患者转出，为急重症腾位',
      });
    }
  } else if (projectedUtilization < BED_TARGET_LOW) {
    // 闲置：可释放到目标下限与实际之间的余量
    spareBeds = Math.floor(total * BED_TARGET_LOW - projected);
    spareBeds = Math.max(0, spareBeds);
    notes.push(`预测占用率 ${(projectedUtilization * 100).toFixed(1)}% 低于 ${(BED_TARGET_LOW * 100).toFixed(0)}% 目标线，可释放 ${spareBeds} 张支援高峰科室。`);
  } else {
    notes.push(`预测占用率 ${(projectedUtilization * 100).toFixed(1)}% 处于 ${(BED_TARGET_LOW * 100).toFixed(0)}%-${(BED_TARGET_HIGH * 100).toFixed(0)}% 健康区间，床位配置合理。`);
  }

  if (specialBedsNeeded > 0) {
    notes.push(`另有监护/隔离等特殊床位需求 ${specialBedsNeeded} 张，需单独预留，不计入普通床位调剂。`);
  }

  return {
    deptId: dept.deptId,
    deptName: dept.deptName,
    currentUtilization,
    projectedUtilization,
    targetUtilization: BED_TARGET_LOW,
    requestedBeds,
    spareBeds,
    specialBedsNeeded,
    transfers,
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* 2. 手术室优化                                                        */
/* ------------------------------------------------------------------ */

/**
 * optimizeOperatingRoom —— 手术室当日排程
 *
 * 策略：紧急度优先（emergency > urgent > routine），同级内按期望开始时间先后；
 * 对每台手术，挑选「能容纳它且最早开始」的房间，实现最小等待与高周转。
 * 排不进当日窗口的手术顺延到 deferred，不强行塞入造成超时。
 *
 * 【远期深化】接入手术排程系统后，可在房间内叠加「清扫缓冲 15min」与
 *   连台患者接送时间窗，进一步压缩空台；并按专科偏好做房间固化。
 */
export function optimizeOperatingRoom(
  slots: SurgerySlot[],
  rooms: OperatingRoom[],
): OrOptimizeResult {
  // 各房间的可用游标（当前已排到的时刻）
  const roomCursor = rooms.map((r) => ({
    roomId: r.roomId,
    openMin: r.openMin,
    closeMin: r.closeMin,
    busyFrom: r.openMin,
  }));

  const sorted = [...slots].sort((a, b) => {
    const uw = urgencyWeight(a.urgency) - urgencyWeight(b.urgency);
    if (uw !== 0) return uw;
    return a.requestedStartMin - b.requestedStartMin;
  });

  const schedule: AssignedSurgery[] = [];
  const deferred: SurgerySlot[] = [];

  for (const s of sorted) {
    const duration = Math.max(5, Math.floor(s.durationMin));
    // 在所有房间中，找「能最早在 requestedStart 之后放下这台手术」的房间
    let best: { idx: number; start: number } | null = null;
    for (let i = 0; i < roomCursor.length; i += 1) {
      const room = roomCursor[i];
      const earliestStart = Math.max(room.busyFrom, s.requestedStartMin);
      if (earliestStart + duration > room.closeMin) continue; // 排不下
      if (best === null || earliestStart < best.start) {
        best = { idx: i, start: earliestStart };
      }
    }

    if (best === null) {
      deferred.push(s);
      continue;
    }

    const room = roomCursor[best.idx];
    const start = best.start;
    const end = start + duration;
    room.busyFrom = end;
    schedule.push({
      surgeryId: s.surgeryId,
      roomId: room.roomId,
      startMin: start,
      endMin: end,
      waitMin: Math.max(0, start - s.requestedStartMin),
    });
  }

  const totalWaitMin = schedule.reduce((sum, x) => sum + x.waitMin, 0);
  const makespanMin = schedule.reduce((m, x) => Math.max(m, x.endMin), 0);
  // 房间总可用与总占用，算空置
  const totalAvailable = roomCursor.reduce((sum, r) => sum + (r.closeMin - r.openMin), 0);
  const totalBusy = schedule.reduce((sum, x) => sum + (x.endMin - x.startMin), 0);
  const idleMin = Math.max(0, totalAvailable - totalBusy);
  const utilization = ratio(totalBusy, totalAvailable);

  return { schedule, deferred, totalWaitMin, makespanMin, idleMin, utilization };
}

/* ------------------------------------------------------------------ */
/* 3. 人员匹配（公平核心）                                              */
/* ------------------------------------------------------------------ */

/**
 * optimizeStaffAssignment —— 技能对症 + 加班摊薄的公平派工
 *
 * 两阶段：
 *  1. 硬过滤：必须具备 requiredSkill，且能上目标班次，否则绝不上岗（医疗安全）；
 *  2. 公平选优：在合格者中，按「本周已加班小时升序」派工——
 *     即总是先安排加班最少的人，任何人若本次派工会突破 maxOvertimeAllowed，
 *     则跳过、顺延给下一个合格者，从机制上杜绝「总让那几个人加班」。
 *
 * fairnessScore：基于被派工者之间加班增量的离散度（方差越小越公平），
 *   结合是否有人触及上限综合打分。
 */
export function optimizeStaffAssignment(
  _dept: unknown,
  demand: StaffDemand,
  staffPool: StaffMember[],
): StaffAssignResult {
  const hours = Math.max(0, Math.floor(demand.expectedHours));

  // 第一阶段：技能 + 班次双硬过滤
  const eligible = staffPool.filter(
    (p) => p.skills.includes(demand.requiredSkill) && p.availableShifts.includes(demand.shift),
  );

  // 第二阶段：按已加班升序（少加班者优先），公平派工
  const sorted = [...eligible].sort(
    (a, b) => a.weeklyOvertimeHours - b.weeklyOvertimeHours,
  );

  const assignments: StaffAssignment[] = [];
  const overloadedStaff: string[] = [];
  let need = Math.max(0, Math.floor(demand.requiredCount));

  for (const p of sorted) {
    if (need <= 0) break;
    const projectedOvertime = p.weeklyOvertimeHours + hours;
    const atLimit = projectedOvertime > p.maxOvertimeAllowed;
    // 若这个人已经会超上限，不再压给他，留给下一个
    if (atLimit) {
      overloadedStaff.push(`${p.name}(预计${projectedOvertime}h，超上限${p.maxOvertimeAllowed}h)`);
      continue;
    }
    assignments.push({
      staffId: p.staffId,
      name: p.name,
      skillMatched: true,
      assignedHours: hours,
      projectedOvertimeHours: projectedOvertime,
      atLimit: false,
    });
    need -= 1;
  }

  const unmetDemand = need;

  // 公平性：被派工者投影加班的均值与标准差；标准差越小，摊得越匀
  //   标准差 0h → 1.0；每多 2h 标准差扣 0.25，最低 0.4；
  //   仍有未满足需求再扣 0.1（需求没接干净，谈不上公平）。
  let fairnessScore = 1;
  if (assignments.length > 0) {
    const values = assignments.map((a) => a.projectedOvertimeHours);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);
    fairnessScore = Math.max(0.4, 1 - (std / 2) * 0.25);
    if (unmetDemand > 0) fairnessScore = Math.max(0.3, fairnessScore - 0.1);
  } else {
    fairnessScore = 0;
  }

  return {
    requiredSkill: demand.requiredSkill,
    shift: demand.shift,
    assignments,
    fairnessScore: Math.round(fairnessScore * 100) / 100,
    overloadedStaff,
    unmetDemand,
  };
}

/* ------------------------------------------------------------------ */
/* 4. 资源利用率体检                                                    */
/* ------------------------------------------------------------------ */

/**
 * getResourceUtilization —— 床位/手术室/人员三维度利用率与瓶颈定位
 *
 * 综合得分 = 三维度加权平均；瓶颈取「最接近过载（>0.9）」的维度，
 * 若三维度都在健康区间则返回 balanced。
 */
export function getResourceUtilization(
  dept: { deptId?: string; deptName?: string },
  period: string,
  obs: UtilizationObservation,
): UtilizationResult {
  const bedUtilization = ratio(obs.bedOccupied, obs.bedTotal);
  const orUtilization = ratio(obs.orUsedMin, obs.orTotalMin);
  const staffUtilization = ratio(obs.staffHoursUsed, obs.staffHoursBudget);

  // 床位权重略高（患者安全相关）
  const overallScore =
    bedUtilization * 0.4 + orUtilization * 0.3 + staffUtilization * 0.3;

  // 找瓶颈：取利用率最高的维度；都 < 0.8 视为均衡
  const scored: Array<{ key: 'beds' | 'or' | 'staff'; v: number }> = [
    { key: 'beds', v: bedUtilization },
    { key: 'or', v: orUtilization },
    { key: 'staff', v: staffUtilization },
  ];
  scored.sort((a, b) => b.v - a.v);
  const top = scored[0];
  const bottleneck = top.v >= 0.8 ? top.key : 'balanced';

  void dept; // 透传科室信息，本切片仅做聚合，不依赖其值
  return {
    period,
    bedUtilization: Math.round(bedUtilization * 1000) / 1000,
    orUtilization: Math.round(orUtilization * 1000) / 1000,
    staffUtilization: Math.round(staffUtilization * 1000) / 1000,
    overallScore: Math.round(overallScore * 1000) / 1000,
    bottleneck,
  };
}
