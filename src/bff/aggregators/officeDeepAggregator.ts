/**
 * 健澜科技 jlmedaios — 【财务人力行政党建】医院行政办公深化聚合器（M178-C，纯函数）
 *
 * 行政办公要高效，不能踢皮球。本聚合器把行政办公从「谁都能接、谁都不签」升级为
 * 「公文有节点、会议不冲突、档案可追溯、督办有 owner」的闭环：
 *
 *   - buildDeepOfficeMgmt：输出深度行政办公体系蓝图——公文/会议/档案/督办四域、
 *     子模块与管理原则（首问负责、限时办结、节点到人）；
 *   - routeApproval：吃公文与审批链，逐节点留痕后给出下一待办人或最终归档去向，
 *     链断了就显式报错，绝不「公文在系统里飘着没人接」；
 *   - scheduleMeeting：吃会议申请与既有预订，检测会议室/时间冲突，冲突时给出
 *     最近可用时段；容量不足预警；
 *   - trackSupervisionTask：吃督办任务状态，算进度/剩余天数/风险等级，超期自动
 *     升级，owner 永远锁定责任部门，不允许无人牵头。
 *
 * 全部无副作用、不触库，便于单测；数据库读写由路由层负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ---------------------------------------------------------------------------
 * 1. buildDeepOfficeMgmt：深度行政办公体系蓝图
 * ------------------------------------------------------------------------- */

/** 四大办公域 */
export type OfficeDomain = 'document' | 'meeting' | 'archive' | 'supervision';

export const OFFICE_DOMAIN_LABEL: Record<OfficeDomain, string> = {
  document: '公文管理',
  meeting: '会议管理',
  archive: '档案管理',
  supervision: '督查督办',
};

export interface OfficeSubModule {
  key: string;
  name: string;
  principle: string;
}

export interface OfficeDomainSpec {
  key: OfficeDomain;
  name: string;
  managementGoal: string;
  subModules: OfficeSubModule[];
}

export interface DeepOfficeMgmt {
  version: string;
  principles: string[];
  domains: OfficeDomainSpec[];
}

/**
 * 深度行政办公体系（纯函数）：输出四域子模块与管理目标，作为全院行政办公统一口径。
 * 核心原则：首问负责、限时办结、节点到人、办结归档，不踢皮球。
 */
export function buildDeepOfficeMgmt(): DeepOfficeMgmt {
  const domains: OfficeDomainSpec[] = (['document', 'meeting', 'archive', 'supervision'] as OfficeDomain[])
    .map((key) => ({
      key,
      name: OFFICE_DOMAIN_LABEL[key],
      managementGoal: GOAL[key],
      subModules: SUBMODULES[key],
    }));
  return {
    version: 'M178-C',
    principles: [
      '行政办公要高效，不能踢皮球：每件公文/每个会议/每项督办都有明确 owner',
      '节点到人、限时办结、超时升级，系统不接受「流转中无人接」',
      '办结必归档，归档必可查，档案保管期限明确',
    ],
    domains,
  };
}

const GOAL: Record<OfficeDomain, string> = {
  document:   '发文/收文全流程留痕，审批节点到人，办结归档，杜绝公文满天飞无人签',
  meeting:    '会议室按时段预订不冲突，会议纪要跟决议，决议跟责任人',
  archive:    '文书/科技/会计三类分库，归档编号唯一，保管期限明确，到期提醒',
  supervision: '任务必有责任部门，进度按周反馈，超期自动升级，不允许无人牵头',
};

const SUBMODULES: Record<OfficeDomain, OfficeSubModule[]> = {
  document: [
    { key: 'outgoing', name: '发文管理', principle: '拟稿→核稿→会签→签发→编号→用印，节点到人不跳步' },
    { key: 'incoming', name: '收文管理', principle: '来文必登记，登记后 1 个工作日内提出拟办意见' },
    { key: 'approval', name: '审批流转', principle: '审批链固化，当前待办人唯一，不允许两人都以为对方会签' },
    { key: 'filing', name: '归档管理', principle: '办结即归档，归档编号唯一，30 年/10 年/永久分类保管' },
  ],
  meeting: [
    { key: 'apply', name: '会议申请', principle: '提前 1 个工作日申请，写明议题/参会人/时长' },
    { key: 'room_booking', name: '会议室预订', principle: '按 room+时间段排他预订，冲突时系统给出最近可用时段' },
    { key: 'minutes', name: '会议纪要', principle: '会后 1 个工作日出纪要，决议事项自动转督办任务' },
  ],
  archive: [
    { key: 'wen_shu', name: '文书档案', principle: '红头文件/请示批复/会议纪要，按年度-机构-保管期限组卷' },
    { key: 'ke_ji', name: '科技档案', principle: '科研课题/设备论证/基建图纸，项目结项即归档' },
    { key: 'kuai_ji', name: '会计档案', principle: '凭证/账簿/报表按会计年度装订，保管期限 30 年' },
  ],
  supervision: [
    { key: 'assign', name: '任务下达', principle: '任务必有 owner_dept 与 due_at，不允许空泛派活' },
    { key: 'tracking', name: '进度跟踪', principle: '每周反馈进度，系统按 due_at 自动算剩余天数与风险' },
    { key: 'closure', name: '办结反馈', principle: '办结需附成果材料，超期自动升级到分管院领导' },
  ],
};

/* ---------------------------------------------------------------------------
 * 2. routeApproval：公文审批流转
 * ------------------------------------------------------------------------- */

export type DocDirection = 'outgoing' | 'incoming';
export type DocCategory = 'notice' | 'report' | 'request' | 'reply' | 'letter' | 'minute';
export type DocStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';

/** 公文（与 clinical.oa_document 对齐，纯函数入参） */
export interface OfficeDocument {
  id: string;
  title: string;
  direction: DocDirection;
  category: DocCategory;
  applicantId: string;
  deptCode: string;
  status: DocStatus;
  currentStep: number;
}

export type ApproveAction = 'approve' | 'reject';

/** 审批链上的一个节点 */
export interface ApproverNode {
  order: number;
  role: string;                 // dept_head / vice_director / director / office / hr / finance
  approverId: string;
  action?: ApproveAction;       // 未act 时为 undefined
  comment?: string;
  actedAt?: string;
}

export type RouteOutcome =
  | { kind: 'terminal'; status: DocStatus; message: string }
  | { kind: 'next'; currentStep: number; approverId: string; role: string; actionRequired: 'approve' | 'reject' | 'rollback' }
  | { kind: 'routed'; status: DocStatus; routedTo: string; message: string }
  | { kind: 'error'; message: string };

/**
 * 公文审批流转（纯函数）：
 *   - 已终审（approved/rejected/archived）→ 直接返回终态；
 *   - 逐节点扫描，找到第一个未签节点 = 当前待办人；
 *   - 全部通过 → approved，并按文种路由到「文书档案归档」或对应业务部门；
 *   - 任一驳回 → rejected，退回拟稿人；
 *   - 审批链为空 / 当前节点无 approverId → error（不允许公文飘着没人接）。
 *
 * 「不踢皮球」：只要不是终态，返回值里必带明确的 approverId，绝不留空。
 */
export function routeApproval(document: OfficeDocument, approvers: ApproverNode[]): RouteOutcome {
  // 终态：已签出/已退回/已归档，不再流转
  if (document.status === 'approved' || document.status === 'rejected' || document.status === 'archived') {
    return { kind: 'terminal', status: document.status, message: `公文已处于 ${document.status} 终态，不再流转` };
  }
  // 审批链为空：不允许公文无链流转（踢皮球根因）
  if (!approvers || approvers.length === 0) {
    return { kind: 'error', message: '审批链为空：公文无审批节点，无法流转（拒绝踢皮球）' };
  }

  // 按 order 排序，保证流转顺序与节点定义一致
  const chain = [...approvers].sort((a, b) => a.order - b.order);

  // 任一节点已驳回 → 整单退回拟稿人
  const rejectedNode = chain.find((n) => n.action === 'reject');
  if (rejectedNode) {
    return {
      kind: 'routed',
      status: 'rejected',
      routedTo: document.applicantId,
      message: `节点 ${rejectedNode.role} 驳回（${rejectedNode.comment ?? '无意见'}），退回拟稿人 ${document.applicantId}`,
    };
  }

  // 找到第一个未签节点
  const pending = chain.find((n) => n.action === undefined);
  if (!pending) {
    // 全部通过 → 终审：按文种路由归档
    const routedTo = routeByCategory(document.category);
    return {
      kind: 'routed',
      status: 'approved',
      routedTo,
      message: `公文 ${document.title} 已全部签出，路由至 ${routedTo} 归档/执行`,
    };
  }

  if (!pending.approverId) {
    return { kind: 'error', message: `节点 ${pending.role} 未指定 approverId：公文踢皮球，拒绝流转` };
  }

  return {
    kind: 'next',
    currentStep: pending.order,
    approverId: pending.approverId,
    role: pending.role,
    actionRequired: 'approve',
  };
}

/** 按文种决定终审后的去向 */
function routeByCategory(category: DocCategory): string {
  switch (category) {
    case 'notice':   return '文书档案（发文）+ 全院公开';
    case 'report':   return '院办 + 文书档案';
    case 'request':  return '分管院领导批复后 → 文书档案';
    case 'reply':    return '来文单位 + 文书档案';
    case 'letter':   return '对外发文 + 文书档案';
    case 'minute':   return '督查办（决议转督办）+ 文书档案';
    default:         return '文书档案';
  }
}

/* ---------------------------------------------------------------------------
 * 3. scheduleMeeting：会议安排（会议室预订 + 冲突检测）
 * ------------------------------------------------------------------------- */

export interface MeetingRequest {
  id: string;
  title: string;
  requesterDept: string;
  room: string;
  startAt: string;   // ISO
  endAt: string;     // ISO
  attendees: number;
}

export interface RoomBooking {
  id: string;
  room: string;
  startAt: string;
  endAt: string;
  status: string;    // booked / requested
}

export type MeetingOutcome =
  | { kind: 'confirmed'; bookingId: string; room: string; startAt: string; endAt: string }
  | { kind: 'conflict'; room: string; conflictWith: string; suggestedStartAt: string; suggestedEndAt: string }
  | { kind: 'capacity_warn'; room: string; attendees: number; roomCapacity: number }
  | { kind: 'error'; message: string };

/** 会议室容量表（可配置；默认行政楼会议室容量） */
export const ROOM_CAPACITY: Record<string, number> = {
  '行政楼301': 20,
  '行政楼302': 10,
  '行政楼401': 50,
  '学术报告厅': 200,
};

const MEETING_SLOT_MINUTES = 30;

/**
 * 会议安排（纯函数）：
 *   1) 容量校验：参会人 > 会议室容量 → capacity_warn；
 *   2) 时段冲突：与同 room 的 booked/requested 区间重叠 → conflict，并给出
 *      该冲突结束后最近的 30 分钟整点时段作为建议；
 *   3) 无冲突 → confirmed。
 *
 * 「不踢皮球」：会议室预订必有 room 与时段，冲突时给出具体可下单时段，不说「请另约」。
 */
export function scheduleMeeting(meeting: MeetingRequest, bookings: RoomBooking[]): MeetingOutcome {
  if (!meeting.room) return { kind: 'error', message: '未指定会议室' };
  const start = Date.parse(meeting.startAt);
  const end = Date.parse(meeting.endAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return { kind: 'error', message: '会议时间非法：end_at 必须晚于 start_at' };
  }

  // 容量校验
  const capacity = ROOM_CAPACITY[meeting.room];
  if (capacity !== undefined && meeting.attendees > capacity) {
    return { kind: 'capacity_warn', room: meeting.room, attendees: meeting.attendees, roomCapacity: capacity };
  }

  // 冲突检测：同 room 且时间段重叠
  const overlaps = bookings.filter((b) => {
    if (b.room !== meeting.room) return false;
    if (b.status !== 'booked' && b.status !== 'requested') return false;
    const bs = Date.parse(b.startAt);
    const be = Date.parse(b.endAt);
    return start < be && bs < end;
  });

  if (overlaps.length > 0) {
    // 取最晚结束的冲突，作为建议起点
    const latestEnd = Math.max(...overlaps.map((b) => Date.parse(b.endAt)));
    const suggestedStart = ceilToSlot(latestEnd);
    const duration = end - start;
    const suggestedEnd = suggestedStart + duration;
    return {
      kind: 'conflict',
      room: meeting.room,
      conflictWith: overlaps.map((b) => b.id).join(','),
      suggestedStartAt: new Date(suggestedStart).toISOString(),
      suggestedEndAt: new Date(suggestedEnd).toISOString(),
    };
  }

  return { kind: 'confirmed', bookingId: meeting.id, room: meeting.room, startAt: meeting.startAt, endAt: meeting.endAt };
}

/** 向上取整到 30 分钟 */
function ceilToSlot(ms: number): number {
  const slot = MEETING_SLOT_MINUTES * 60 * 1000;
  return Math.ceil(ms / slot) * slot;
}

/* ---------------------------------------------------------------------------
 * 4. trackSupervisionTask：督办跟踪
 * ------------------------------------------------------------------------- */

export type SupervisionStatus = 'open' | 'at_risk' | 'overdue' | 'closed';

export interface SupervisionTask {
  id: string;
  title: string;
  ownerDept: string;
  assignedAt: string;
  dueAt: string;
  progress: number;          // 0..1
  updates: { at: string; note: string; progress: number }[];
  closed: boolean;
  closedAt?: string;
}

export interface SupervisionReport {
  taskId: string;
  title: string;
  ownerDept: string;            // owner 永远锁定，不允许空
  status: SupervisionStatus;
  progressPct: number;          // 0..100
  daysRemaining: number;         // 负为已超期天数
  daysElapsed: number;
  escalated: boolean;            // 是否需要升级到分管院领导
  latestNote: string;
  recommendation: string;
}

/**
 * 督办跟踪（纯函数）：
 *   - 已办结 → closed；
 *   - 当前时间 > due_at → overdue（自动升级）；
 *   - 距到期 ≤ 3 天且进度 < 50% → at_risk（预警 owner）；
 *   - 其余 → open。
 *
 * 「不踢皮球」：ownerDept 为空直接 error；报告里永远带 ownerDept 与下一步建议。
 *
 * @param task 督办任务
 * @param now  当前时间（注入便于单测），默认 new Date()
 */
export function trackSupervisionTask(task: SupervisionTask, now: Date = new Date()): SupervisionReport {
  const due = Date.parse(task.dueAt);
  const assigned = Date.parse(task.assignedAt);
  const nowMs = now.getTime();
  const DAY = 24 * 60 * 60 * 1000;

  const latest = task.updates && task.updates.length > 0
    ? task.updates[task.updates.length - 1]
    : null;

  if (task.closed) {
    return {
      taskId: task.id,
      title: task.title,
      ownerDept: task.ownerDept || '未指定',
      status: 'closed',
      progressPct: 100,
      daysRemaining: 0,
      daysElapsed: Math.round((nowMs - assigned) / DAY),
      escalated: false,
      latestNote: latest?.note ?? '已办结',
      recommendation: '任务已办结，材料归档',
    };
  }

  if (!task.ownerDept) {
    // 无 owner：这是踢皮球，系统显式标红，不静默
    return {
      taskId: task.id,
      title: task.title,
      ownerDept: '未指定（踢皮球！）',
      status: 'overdue',
      progressPct: Math.round(task.progress * 100),
      daysRemaining: Math.round((due - nowMs) / DAY),
      daysElapsed: Math.round((nowMs - assigned) / DAY),
      escalated: true,
      latestNote: latest?.note ?? '',
      recommendation: '无责任部门，立即由院办指定 owner 后重新下达',
    };
  }

  const daysRemaining = Math.round((due - nowMs) / DAY);
  const daysElapsed = Math.round((nowMs - assigned) / DAY);
  const progressPct = Math.round(task.progress * 100);

  let status: SupervisionStatus = 'open';
  let escalated = false;
  let recommendation = '按计划推进，下周反馈进度';

  if (nowMs > due) {
    status = 'overdue';
    escalated = true;
    recommendation = `已超期 ${Math.abs(daysRemaining)} 天，立即升级分管院领导，${task.ownerDept} 需提交书面说明`;
  } else if (daysRemaining <= 3 && task.progress < 0.5) {
    status = 'at_risk';
    recommendation = `距到期仅 ${daysRemaining} 天，进度 ${progressPct}%，${task.ownerDept} 需加派人力或申请延期`;
  } else if (task.progress >= 1) {
    status = 'closed';
    recommendation = '进度已 100%，请及时提交办结材料';
  }

  return {
    taskId: task.id,
    title: task.title,
    ownerDept: task.ownerDept,
    status,
    progressPct,
    daysRemaining,
    daysElapsed,
    escalated,
    latestNote: latest?.note ?? '',
    recommendation,
  };
}
