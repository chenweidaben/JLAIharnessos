/**
 * 健澜科技 jlmedaios - 医院后勤报修聚合器（M142-D）【预防保健与患者服务】
 *
 * 业务目标：后勤报修要跟踪到完成，不能报了没人管。
 *   两个纯函数围绕「报修工单 + 派工流水」展开：
 *     - createLogisticsRequest(requesterId, dept, type, description)：
 *         科室/员工提交一条报修，新工单默认「待派工」；
 *     - assignLogisticsTask(requestId, handlerId, eta)：
 *         后勤主管把工单派给具体处理人，登记预计完成时间（eta），
 *         工单状态由「待派工」推进到「已派工」，同时生成一条派工流水。
 *   配套生命周期纯函数：
 *     - markProcessing(requestId)：处理人接单开工，推进到「处理中」；
 *     - markDone(requestId)：维修完成，闭环到「已完成」；
 *     - getLogisticsReport(now?)：按四态统计工单量，并把「已过 eta 仍未完成」
 *       的工单抛成超时预警清单——这就是「报了没人管」的兜底落点。
 *
 * 设计说明：
 *   本模块为无库依赖的纯函数内核（与 equipmentAggregator 同思路），状态收敛在模块级
 *   内存台账中，id 由确定性计数器生成（lg_0001 / tk_0001 …），同一序列恒等输出，
 *   便于单测与重放；生产环境可在路由层把同名函数对接到 clinical.logistics_request
 *   表，函数内核口径保持不变。eta / now 可注入以便测试，缺省取系统当前时间。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 后勤报修类型：设备维修/水电维修/清洁服务/被服更换/搬运服务 */
export type LogisticsType = '设备维修' | '水电维修' | '清洁服务' | '被服更换' | '搬运服务';

/** 工单状态机：待派工 → 已派工 → 处理中 → 已完成 */
export type RequestStatus = '待派工' | '已派工' | '处理中' | '已完成';

/** 后勤报修工单 */
export interface LogisticsRequest {
  id: string;
  requesterId: string;
  dept: string;
  type: LogisticsType;
  description: string;
  status: RequestStatus;
  /** 处理人工号；null = 尚未派工 */
  handlerId: string | null;
  /** 预计完成时间（ISO 8601）；null = 尚未派工 */
  eta: string | null;
  createdAt: string;
  assignedAt: string | null;
  processingAt: string | null;
  doneAt: string | null;
}

/** 派工流水记录 */
export interface LogisticsTask {
  id: string;
  requestId: string;
  handlerId: string;
  eta: string;
  assignedAt: string;
}

/** 单条超时预警 */
export interface LogisticsAlert {
  requestId: string;
  dept: string;
  type: LogisticsType;
  description: string;
  handlerId: string | null;
  eta: string;
  /** 已超时小时数（正数） */
  overdueHours: number;
}

/** 后勤工单完成统计报告 */
export interface LogisticsReport {
  total: number;
  byStatus: Record<RequestStatus, number>;
  /** 已完成工单数 */
  doneCount: number;
  /** 未闭环工单数（待派工 + 已派工 + 处理中） */
  openCount: number;
  /** 超时未完成预警清单（超时最久排最前） */
  overdueAlerts: LogisticsAlert[];
  overdueCount: number;
}

/** 允许的报修类型白名单 */
export const LOGISTICS_TYPES: readonly LogisticsType[] = [
  '设备维修', '水电维修', '清洁服务', '被服更换', '搬运服务',
];

const HOUR_MS = 60 * 60 * 1000;

// ---- 模块级内存台账（纯函数内核的状态载体，可被 resetLogisticsStore 清空） ---------
const requestStore: LogisticsRequest[] = [];
const taskStore: LogisticsTask[] = [];
let reqSeq = 0;
let taskSeq = 0;

/** 测试辅助：清空台账与计数器，保证用例之间互不污染（不对外暴露为业务 API） */
export function resetLogisticsStore(): void {
  requestStore.length = 0;
  taskStore.length = 0;
  reqSeq = 0;
  taskSeq = 0;
}

function isValidIso(s: string): boolean {
  if (typeof s !== 'string' || !s) return false;
  const t = new Date(s).getTime();
  return !Number.isNaN(t);
}

function assertValidType(type: string): asserts type is LogisticsType {
  if (!LOGISTICS_TYPES.includes(type as LogisticsType)) {
    throw new Error(`后勤类型非法：${type}（应为 ${LOGISTICS_TYPES.join(' / ')} 之一）`);
  }
}

/**
 * 创建一张后勤报修工单（纯函数）。
 * 新工单默认「待派工」，handler / eta 均为空——必须由派工动作显式推进，
 * 从流程上杜绝「报了没人管」。
 */
export function createLogisticsRequest(
  requesterId: string,
  dept: string,
  type: string,
  description: string,
): LogisticsRequest {
  const rid = (requesterId ?? '').trim();
  if (!rid) throw new Error('报修人工号不能为空');
  assertValidType(type);
  const desc = (description ?? '').trim();
  if (!desc) throw new Error('报修内容不能为空');

  reqSeq += 1;
  const req: LogisticsRequest = {
    id: `lg_${String(reqSeq).padStart(4, '0')}`,
    requesterId: rid,
    dept: (dept ?? '').trim(),
    type,
    description: desc,
    status: '待派工',
    handlerId: null,
    eta: null,
    createdAt: new Date().toISOString(),
    assignedAt: null,
    processingAt: null,
    doneAt: null,
  };
  requestStore.push(req);
  return { ...req };
}

/**
 * 派工：把工单派给具体处理人（纯函数）。
 * 仅「待派工」工单可派工；派工后状态推进到「已派工」，
 * 登记 handlerId 与预计完成时间 eta，并生成一条派工流水留痕。
 */
export function assignLogisticsTask(
  requestId: string,
  handlerId: string,
  eta: string,
): LogisticsTask {
  const req = requestStore.find((r) => r.id === requestId);
  if (!req) throw new Error(`工单不存在：${requestId}`);
  if (req.status !== '待派工') {
    throw new Error(`工单当前状态为「${req.status}」，仅「待派工」工单可派工`);
  }
  const hid = (handlerId ?? '').trim();
  if (!hid) throw new Error('处理人工号不能为空');
  if (!isValidIso(eta)) throw new Error(`预计完成时间格式非法：${eta}（应为 ISO 8601 时间串）`);

  taskSeq += 1;
  const now = new Date().toISOString();
  const task: LogisticsTask = {
    id: `tk_${String(taskSeq).padStart(4, '0')}`,
    requestId: req.id,
    handlerId: hid,
    eta,
    assignedAt: now,
  };
  taskStore.push(task);

  req.status = '已派工';
  req.handlerId = hid;
  req.eta = eta;
  req.assignedAt = now;
  return { ...task };
}

/**
 * 处理人接单开工（纯函数）：已派工 → 处理中。
 */
export function markProcessing(requestId: string): LogisticsRequest {
  const req = requestStore.find((r) => r.id === requestId);
  if (!req) throw new Error(`工单不存在：${requestId}`);
  if (req.status !== '已派工') {
    throw new Error(`工单当前状态为「${req.status}」，仅「已派工」工单可开工`);
  }
  req.status = '处理中';
  req.processingAt = new Date().toISOString();
  return { ...req };
}

/**
 * 维修完成，工单闭环（纯函数）：处理中 → 已完成。
 */
export function markDone(requestId: string): LogisticsRequest {
  const req = requestStore.find((r) => r.id === requestId);
  if (!req) throw new Error(`工单不存在：${requestId}`);
  if (req.status !== '处理中') {
    throw new Error(`工单当前状态为「${req.status}」，仅「处理中」工单可完成`);
  }
  req.status = '已完成';
  req.doneAt = new Date().toISOString();
  return { ...req };
}

/** 只读视图：某报修人的全部工单（按创建时间倒序，新报的排最前） */
export function listMyRequests(requesterId: string): LogisticsRequest[] {
  const rid = (requesterId ?? '').trim();
  return requestStore
    .filter((r) => r.requesterId === rid)
    .map((r) => ({ ...r }))
    // createdAt 精确到毫秒，同毫秒创建时按工单 id 倒序兜底，保证排序确定性
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

/** 只读视图：全部工单（供主管看板；不暴露内部可变引用） */
export function listAllRequests(): LogisticsRequest[] {
  return requestStore.map((r) => ({ ...r }));
}

/**
 * 完成统计 + 超时预警（纯函数）。
 * 核心：把「已过 eta 仍未完成」的工单抛成预警清单，落实
 * 「后勤报修要跟踪到完成，不能报了没人管」。
 * @param now 参考时间，测试可注入；缺省取系统当前时间
 */
export function getLogisticsReport(now: Date = new Date()): LogisticsReport {
  const byStatus: Record<RequestStatus, number> = {
    待派工: 0, 已派工: 0, 处理中: 0, 已完成: 0,
  };
  const alerts: LogisticsAlert[] = [];
  const nowMs = now.getTime();

  for (const r of requestStore) {
    byStatus[r.status] += 1;
    if (r.status === '已完成' || !r.eta) continue;
    const etaMs = new Date(r.eta).getTime();
    if (Number.isNaN(etaMs)) continue;
    const overdueHours = (nowMs - etaMs) / HOUR_MS;
    if (overdueHours > 0) {
      alerts.push({
        requestId: r.id,
        dept: r.dept,
        type: r.type,
        description: r.description,
        handlerId: r.handlerId,
        eta: r.eta,
        overdueHours: Math.round(overdueHours * 10) / 10,
      });
    }
  }

  // 超时最久的排最前，后勤主管先处理拖得最久的
  alerts.sort((a, b) => b.overdueHours - a.overdueHours);

  return {
    total: requestStore.length,
    byStatus,
    doneCount: byStatus['已完成'],
    openCount: byStatus['待派工'] + byStatus['已派工'] + byStatus['处理中'],
    overdueAlerts: alerts,
    overdueCount: alerts.length,
  };
}
