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
  deepTaskStore.length = 0;
  deepSeq = 0;
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

// ============================================================================
// M162-D 医院全场景后勤智能化：维修报修 / 被服管理 / 餐饮配送 / 保洁管理
// 业务目标：后勤派单要高效，不能推诿。
//   每单按类型自动路由到固定责任班组，零等待直派；同班组任务按院内坐标
//   最近邻排巡线路径；效率看板自动汇总准时率与平均闭环时长。
// ============================================================================

/** 后勤四大域 */
export type LogisticsCategory = '维修报修' | '被服管理' | '餐饮配送' | '保洁管理';

/** 全场景任务子类（12 种） */
export type DispatchTaskType =
  | '水电' | '空调' | '设备' | '家具'        // 维修报修
  | '洗涤' | '更换' | '盘点'                  // 被服管理
  | '患者餐' | '员工餐'                        // 餐饮配送
  | '区域划分' | '频次' | '检查';              // 保洁管理

/** 全场景任务状态机：自动派单即「已派单」 → 处理中 → 已完成 */
export type DispatchStatus = '已派单' | '处理中' | '已完成';

/** 任务优先级 */
export type TaskPriority = 'P1' | 'P2' | 'P3';

/** 全场景后勤任务（hospital_ops.logistics_task 的内存形态） */
export interface DeepLogisticsTask {
  id: string;
  category: LogisticsCategory;
  taskType: DispatchTaskType;
  location: string;
  /** 院内网格横坐标（0~100），路线优化输入 */
  x: number;
  /** 院内网格纵坐标（0~100），路线优化输入 */
  y: number;
  description: string;
  /** 自动派单落点班组 */
  handlerTeam: string;
  priority: TaskPriority;
  status: DispatchStatus;
  /** 标准响应时限（分钟） */
  etaMinutes: number;
  estimatedDurationMin: number;
  dispatchedAt: string;
  processingAt: string | null;
  completedAt: string | null;
  actualDurationMin: number | null;
}

/** 一条路线排程结果（最近邻巡线） */
export interface RouteStop {
  seq: number;
  taskId: string;
  location: string;
  x: number;
  y: number;
  /** 从上一站（起点=仓库）到本站的行驶距离（公里） */
  legDistanceKm: number;
}

/** 路线优化结果 */
export interface OptimizedRoute {
  stops: RouteStop[];
  /** 全程总里程（公里） */
  totalDistanceKm: number;
  stopCount: number;
}

/** 效率分析报告 */
export interface LogisticsEfficiency {
  period: string;
  /** 周期内任务总量 */
  total: number;
  /** 已完成数 */
  doneCount: number;
  /** 未闭环数 */
  openCount: number;
  /** 自动派单率：系统直派比例，1 = 全部零等待派单，不推诿 */
  autoDispatchRate: number;
  /** 准时率：实际闭环时长未超 eta 的占比（按已完成任务计） */
  onTimeRate: number;
  /** 平均闭环时长（分钟），未完成任务不计入 */
  avgCloseMinutes: number;
  /** 派单等待（分钟）：创建→派单。自动派单恒为 0，这就是「高效不推诿」的量化 */
  avgDispatchWaitMinutes: number;
  byCategory: Record<LogisticsCategory, number>;
  byPriority: Record<TaskPriority, number>;
}

/** 12 种任务子类白名单（与 327-logistics-deep.sql 的 CHECK 一致） */
export const DISPATCH_TASK_TYPES: readonly DispatchTaskType[] = [
  '水电', '空调', '设备', '家具',
  '洗涤', '更换', '盘点',
  '患者餐', '员工餐',
  '区域划分', '频次', '检查',
];

/** 派单路由表：任务子类 → 大类 + 责任班组 + 优先级 + 标准时限。
 *  路由表写死即「不推诿」：任何单子都有明确落点班组，无人可退。 */
const DISPATCH_ROUTES: Record<DispatchTaskType, {
  category: LogisticsCategory; team: string; priority: TaskPriority; etaMin: number;
}> = {
  水电:   { category: '维修报修', team: '工程组·水电班',   priority: 'P1', etaMin: 60 },
  空调:   { category: '维修报修', team: '工程组·空调班',   priority: 'P1', etaMin: 90 },
  设备:   { category: '维修报修', team: '医工组·设备班',   priority: 'P1', etaMin: 45 },
  家具:   { category: '维修报修', team: '工程组·家具班',   priority: 'P2', etaMin: 120 },
  洗涤:   { category: '被服管理', team: '被服中心·洗涤班', priority: 'P2', etaMin: 480 },
  更换:   { category: '被服管理', team: '被服中心·配送班', priority: 'P2', etaMin: 120 },
  盘点:   { category: '被服管理', team: '被服中心·库房班', priority: 'P3', etaMin: 1440 },
  患者餐: { category: '餐饮配送', team: '营养食堂·送餐班', priority: 'P1', etaMin: 30 },
  员工餐: { category: '餐饮配送', team: '营养食堂·供餐班', priority: 'P3', etaMin: 60 },
  区域划分: { category: '保洁管理', team: '物业组·保洁调度', priority: 'P2', etaMin: 240 },
  频次:   { category: '保洁管理', team: '物业组·保洁调度', priority: 'P2', etaMin: 240 },
  检查:   { category: '保洁管理', team: '物业组·质检班',   priority: 'P2', etaMin: 180 },
};

/** 院内网格比例尺：1 个网格单位 ≈ 0.05 公里 */
const GRID_UNIT_KM = 0.05;

// ---- M162-D 模块级内存台账（与 M142 台账隔离；resetLogisticsStore 一并清空） ----
const deepTaskStore: DeepLogisticsTask[] = [];
let deepSeq = 0;

function isValidDispatchType(t: string): t is DispatchTaskType {
  return (DISPATCH_TASK_TYPES as readonly string[]).includes(t);
}

/** 地点 → 院内网格坐标的确定性散列：同一地点恒等映射，路线优化可重放 */
function hashLocation(loc: string): { x: number; y: number } {
  let h = 0;
  for (let i = 0; i < loc.length; i += 1) {
    h = (h * 31 + loc.charCodeAt(i)) >>> 0;
  }
  const x = Math.round((h % 1000) / 10) / 10;   // 0.0 ~ 99.9
  const y = Math.round(((h >>> 10) % 1000) / 10) / 10;
  return { x, y };
}

/** 两点网格距离（公里） */
function gridDistanceKm(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy) * GRID_UNIT_KM;
}

/**
 * 派单（纯函数）：后勤派单要高效，不能推诿。
 * 按任务类型自动路由到固定责任班组，创建即派单（dispatchedAt = createdAt），
 * 不设「待派单」中间态——系统直接把单子送到班组手上，无处可退。
 * @param taskType 任务子类（水电/空调/设备/家具/洗涤/更换/盘点/患者餐/员工餐/区域划分/频次/检查）
 * @param location 任务地点，如 住院部 3 病区 / 急诊一楼大厅
 * @param description 任务描述
 */
export function dispatchLogisticsTask(
  taskType: string,
  location: string,
  description: string,
): DeepLogisticsTask {
  if (!isValidDispatchType(taskType)) {
    throw new Error(`任务类型非法：${taskType}（应为 ${DISPATCH_TASK_TYPES.join(' / ')} 之一）`);
  }
  const loc = (location ?? '').trim();
  if (!loc) throw new Error('任务地点不能为空');
  const desc = (description ?? '').trim();
  if (!desc) throw new Error('任务描述不能为空');

  const route = DISPATCH_ROUTES[taskType];
  const { x, y } = hashLocation(loc);
  deepSeq += 1;
  const now = new Date().toISOString();
  const task: DeepLogisticsTask = {
    id: `lt_${String(deepSeq).padStart(4, '0')}`,
    category: route.category,
    taskType,
    location: loc,
    x, y,
    description: desc,
    handlerTeam: route.team,
    priority: route.priority,
    status: '已派单',
    etaMinutes: route.etaMin,
    estimatedDurationMin: route.etaMin,
    dispatchedAt: now,
    processingAt: null,
    completedAt: null,
    actualDurationMin: null,
  };
  deepTaskStore.push(task);
  return { ...task };
}

/** 处理人接单开工（纯函数）：已派单 → 处理中 */
export function startDeepTask(taskId: string): DeepLogisticsTask {
  const t = deepTaskStore.find((x) => x.id === taskId);
  if (!t) throw new Error(`任务不存在：${taskId}`);
  if (t.status !== '已派单') throw new Error(`任务当前状态为「${t.status}」，仅「已派单」任务可开工`);
  t.status = '处理中';
  t.processingAt = new Date().toISOString();
  return { ...t };
}

/** 任务闭环（纯函数）：处理中 → 已完成；可注入实际耗时以便效率分析单测 */
export function completeDeepTask(taskId: string, actualDurationMin?: number, now: Date = new Date()): DeepLogisticsTask {
  const t = deepTaskStore.find((x) => x.id === taskId);
  if (!t) throw new Error(`任务不存在：${taskId}`);
  if (t.status === '已完成') throw new Error(`任务 ${taskId} 已完成，不可重复闭环`);
  t.status = '已完成';
  t.completedAt = now.toISOString();
  const minutes = actualDurationMin ?? t.estimatedDurationMin;
  t.actualDurationMin = minutes > 0 ? minutes : t.estimatedDurationMin;
  return { ...t };
}

/** 只读视图：按状态过滤全场景任务（GET /api/v1/logistics/tasks?status=xxx） */
export function listDeepTasks(status?: string): DeepLogisticsTask[] {
  const list = deepTaskStore
    .filter((t) => !status || status === '全部' || t.status === status)
    .map((t) => ({ ...t }));
  // 优先级高的排前面（P1→P2→P3），同优先级按 id 升序，保证输出确定性
  const rank: Record<DispatchStatus, number> = { 已派单: 0, 处理中: 1, 已完成: 2 };
  list.sort((a, b) =>
    (a.priority === b.priority ? 0 : a.priority < b.priority ? -1 : 1)
    || rank[a.status] - rank[b.status]
    || a.id.localeCompare(b.id));
  return list;
}

/**
 * 路线优化（纯函数）：以仓库（0,0）为起点做最近邻巡线，
 * 让保洁/送餐/被服配送一次出门跑完最多的点，少走回头路。
 * 输入任意带坐标的任务列表，输出有序站点 + 全程里程；空输入安全兜底。
 */
export function optimizeLogisticsRoute(
  tasks: ReadonlyArray<Pick<DeepLogisticsTask, 'id' | 'location' | 'x' | 'y'>>,
): OptimizedRoute {
  const unvisited = tasks.map((t) => ({ ...t }));
  const stops: RouteStop[] = [];
  let curX = 0;
  let curY = 0;
  let totalKm = 0;

  while (unvisited.length > 0) {
    // 每次选距当前点最近的下一站；距离并列时按任务 id 升序兜底，保证确定性
    let bestIdx = 0;
    let bestDist = gridDistanceKm(curX, curY, unvisited[0].x, unvisited[0].y);
    for (let i = 1; i < unvisited.length; i += 1) {
      const d = gridDistanceKm(curX, curY, unvisited[i].x, unvisited[i].y);
      if (d < bestDist - 1e-9
        || (Math.abs(d - bestDist) <= 1e-9 && unvisited[i].id.localeCompare(unvisited[bestIdx].id) < 0)) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = unvisited.splice(bestIdx, 1)[0];
    totalKm += bestDist;
    stops.push({
      seq: stops.length + 1,
      taskId: next.id,
      location: next.location,
      x: next.x,
      y: next.y,
      legDistanceKm: Math.round(bestDist * 100) / 100,
    });
    curX = next.x;
    curY = next.y;
  }

  return {
    stops,
    totalDistanceKm: Math.round(totalKm * 100) / 100,
    stopCount: stops.length,
  };
}

/** 周期窗口映射：today 今日 / 7d 近 7 天 / 30d 近 30 天 */
const PERIOD_DAYS: Record<string, number> = { today: 0, '7d': 7, '30d': 30 };

function emptyEfficiency(period: string): LogisticsEfficiency {
  return {
    period, total: 0, doneCount: 0, openCount: 0,
    autoDispatchRate: 1, onTimeRate: 0, avgCloseMinutes: 0, avgDispatchWaitMinutes: 0,
    byCategory: { 维修报修: 0, 被服管理: 0, 餐饮配送: 0, 保洁管理: 0 },
    byPriority: { P1: 0, P2: 0, P3: 0 },
  };
}

/**
 * 效率分析（纯函数）：统计周期内全场景后勤任务的派单与闭环效率。
 * 核心口径：自动派单率恒为 1（创建即派单，无人可退），准时率 / 平均闭环时长
 * 由完成任务的实际时长与标准 eta 比对得出。
 * @param period today | 7d | 30d（缺省 7d）
 * @param now 参考时间，测试可注入；缺省取系统当前时间
 */
export function getLogisticsEfficiency(period: string = '7d', now: Date = new Date()): LogisticsEfficiency {
  const p = PERIOD_DAYS[period] !== undefined ? period : '7d';
  const out = emptyEfficiency(p);
  if (deepTaskStore.length === 0) return out;

  const nowMs = now.getTime();
  const days = PERIOD_DAYS[p];
  const sinceMs = days === 0
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    : nowMs - days * 24 * HOUR_MS;

  const closed: number[] = [];
  let onTime = 0;

  for (const t of deepTaskStore) {
    const created = new Date(t.dispatchedAt).getTime(); // 自动派单：创建即派单
    if (Number.isNaN(created) || created < sinceMs) continue;
    out.total += 1;
    out.byCategory[t.category] += 1;
    out.byPriority[t.priority] += 1;
    if (t.status === '已完成') {
      out.doneCount += 1;
      const actual = t.actualDurationMin ?? t.estimatedDurationMin;
      closed.push(actual);
      if (actual <= t.etaMinutes) onTime += 1;
    } else {
      out.openCount += 1;
    }
  }

  out.avgCloseMinutes = closed.length > 0
    ? Math.round((closed.reduce((s, m) => s + m, 0) / closed.length) * 10) / 10
    : 0;
  out.onTimeRate = out.doneCount > 0
    ? Math.round((onTime / out.doneCount) * 1000) / 1000
    : 0;
  // 自动派单：创建时间即派单时间，等待分钟恒为 0——「派单高效不推诿」的量化落点
  out.avgDispatchWaitMinutes = 0;
  out.autoDispatchRate = out.total > 0 ? 1 : 0;
  return out;
}
