/**
 * 健澜科技 jlmedaios — 【科研教学后勤】医院后勤智能化深化聚合器（M171-C，纯函数）
 *
 * 后勤派单要高效，不能推诿。本聚合器把传统「电话喊人、谁空谁上、互相踢皮球」的
 * 后勤调度，升级为「按规则自动派单 + 最近路线 + 需求预测 + 满意度闭环」的四件套：
 *
 *   - deepLogisticsDispatch：深度派单。四类工单统一排序（紧急优先、餐饮按时），
 *     按「技能匹配（维修）+ 距离最近 + 负载均衡」打分选人；被服单核库存、餐饮单核
 *     禁忌饮食与准时窗；凡是派不出去的工单必须给出明确原因（缺技能 / 超负载 / 无库存），
 *     系统不允许「无理由滞留」，从机制上杜绝推诿。
 *   - optimizeLogisticsRoute：路线优化。对配送任务做最近邻 + 容量约束的车辆路径规划
 *     （VRP 贪心版），输出每辆车的停靠顺序与总里程，减少空驶与绕路。
 *   - predictLogisticsDemand：后勤需求预测。以历史基期量 × 季节系数（工作日/季节/
 *     开学季）× 趋势系数外推未来各时段工单量，用于提前排班与备货。
 *   - trackLogisticsSatisfaction：满意度跟踪。汇总完工工单的准时率、SLA 达成率、
 *     评价均分与投诉率，按四类后勤分别打分，低分/投诉工单自动列入回访清单。
 *
 * 全部无副作用、不触库、不写 SQL，便于单测；本切片仅纯函数 + 路由 + 前端，无新表。
 * 不触碰 WebSocket；不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 通用类型 ============================== */

/** 后勤工单大类：维修 / 被服 / 餐饮 / 保洁（科研教学后勤四大主业） */
export type LogisticsTaskType = 'repair' | 'linen' | 'meal' | 'cleaning';

/** 四类工单中文名 */
export const TASK_TYPE_LABEL: Record<LogisticsTaskType, string> = {
  repair: '维修派单',
  linen: '被服配送',
  meal: '餐饮配送',
  cleaning: '保洁调度',
};

/** 院内平面坐标（米，相对医院原点的网格坐标） */
export interface Point {
  x: number;
  y: number;
}

/**
 * 一条后勤工单（科研教学后勤）。
 * 四类工单共用结构，差异字段按大类取用：
 *  - repair：requiredSkills（电工/管道/空调…），靠技能匹配派单；
 *  - linen：demandQty（被服件数），派单时核库存；
 *  - meal：dueMinute（须在该时刻前送达，分钟数自 0:00 起）与 dietaryRestrictions
 *    （糖尿病餐/低盐/清真等禁忌饮食）；
 *  - cleaning：demandQty 表示待清洁面积（m²）。
 */
export interface LogisticsTask extends Point {
  id: string;
  type: LogisticsTaskType;
  /** 发起科室 / 区域名称 */
  locationName: string;
  /** 紧急度 1..5（5 最高，派单排序优先） */
  priority: number;
  /** 需求量：维修=工时(人·次)，被服=件，餐饮=份，保洁=m² */
  demandQty: number;
  /** 餐饮：期望送达时刻（分钟，自 0:00 起，如 7:30 = 450） */
  dueMinute?: number;
  /** 餐饮：禁忌饮食标签（diabetes / lowSalt / halal …） */
  dietaryRestrictions?: string[];
  /** 维修：所需技能标签（electrician / plumber / hvac …） */
  requiredSkills?: string[];
}

/** 一名后勤人员（维修技工 / 配送员 / 保洁员） */
export interface LogisticsResource extends Point {
  id: string;
  name: string;
  /** 可承接的工单大类（与本人岗位一致） */
  type: LogisticsTaskType;
  /** 维修：本人掌握的技能标签 */
  skills?: string[];
  /** 餐饮配送：是否经过禁忌饮食专配培训（可送特殊治疗膳食） */
  handlesDietary?: boolean;
}

/** 派单约束 */
export interface LogisticsConstraints {
  /** 单人每班次最大承接工作量（维修=次，被服/餐饮=件，保洁=m²） */
  maxLoadPerResource: number;
  /** 步行 / 配送速度（米/分钟），用于 ETA */
  speedMpm: number;
  /** 被服可用库存：key=品类，value=件数（仅被服单扣减） */
  linenInventory?: Record<string, number>;
  /** 被服工单默认扣减的库存品类（工单未带品类时用它） */
  linenCategory?: string;
}

/** 单条派单结果 */
export interface DispatchAssignment {
  taskId: string;
  taskType: LogisticsTaskType;
  taskTypeLabel: string;
  locationName: string;
  priority: number;
  resourceId: string;
  resourceName: string;
  /** 综合得分（越高越优） */
  score: number;
  /** 人到工单点的直线距离（米） */
  distanceM: number;
  /** 预计到场耗时（分钟） */
  etaMin: number;
  /** 派单理由（可追溯、可申诉，杜绝推诿） */
  rationale: string;
}

/** 派不出去的工单（必须给原因，不允许静默滞留） */
export interface UnassignedTask {
  taskId: string;
  taskType: LogisticsTaskType;
  locationName: string;
  reason: string;
}

/** deepLogisticsDispatch 的输出 */
export interface DispatchResult {
  assignments: DispatchAssignment[];
  unassigned: UnassignedTask[];
  /** 每个资源本次承接工作量 */
  resourceLoad: Record<string, number>;
  /** 平均响应距离（米） */
  avgResponseM: number;
  /** 准时覆盖率（餐饮单中 ETA 落在送达窗内的比例，0..1） */
  mealOnTimeRate: number;
}

/** 欧氏距离（米） */
function dist(a: Point, b: Point): number {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 10) / 10;
}

function clampPriority(p: number): number {
  return Math.min(5, Math.max(1, Math.floor(p) || 1));
}

/* ============================== 1. 深度派单 ============================== */

/**
 * 深度后勤派单（纯函数）：紧急优先、技能匹配、距离最近、负载均衡，被服核库存、
 * 餐饮核禁忌饮食与准时窗。派不出去的工单逐条给出原因。
 *
 * 打分模型（综合得分越高越优）：
 *   score = 紧急权重(priority×20)
 *         + 技能/禁忌匹配加分（维修技能齐全 +40；餐饮禁忌专配 +20）
 *         - 距离惩罚（直线距离 / 50，越近扣分越少）
 *
 * @param tasks      待派工单（四类可混排）
 * @param resources  在岗后勤人员
 * @param constraints 负载上限 / 步行速度 / 被服库存
 */
export function deepLogisticsDispatch(
  tasks: LogisticsTask[],
  resources: LogisticsResource[],
  constraints: LogisticsConstraints,
): DispatchResult {
  const maxLoad = Math.max(1, constraints.maxLoadPerResource || 1);
  const speed = Math.max(1, constraints.speedMpm || 60);
  const inventory: Record<string, number> = { ...(constraints.linenInventory ?? {}) };
  const defaultCat = constraints.linenCategory ?? 'bed_linen';

  // 每人已承接工作量
  const load: Record<string, number> = {};
  for (const r of resources) load[r.id] = 0;

  // 工单排序：紧急度降序 → 餐饮送达时刻升序（时间敏感）→ id 升序（确定性）
  const ordered = [...tasks].sort((a, b) => {
    if (b.priority !== a.priority) return clampPriority(b.priority) - clampPriority(a.priority);
    const da = a.dueMinute ?? Number.POSITIVE_INFINITY;
    const db = b.dueMinute ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });

  const assignments: DispatchAssignment[] = [];
  const unassigned: UnassignedTask[] = [];
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  for (const task of ordered) {
    const prio = clampPriority(task.priority);

    // —— 硬性门槛：按大类过滤可承接资源 ——
    const candidates = resources.filter((r) => r.type === task.type);

    if (candidates.length === 0) {
      unassigned.push({
        taskId: task.id, taskType: task.type, locationName: task.locationName,
        reason: `无${TASK_TYPE_LABEL[task.type]}在岗人员，需临时调度或跨岗支援`,
      });
      continue;
    }

    // 维修：技能不匹配直接淘汰
    if (task.type === 'repair' && task.requiredSkills && task.requiredSkills.length > 0) {
      const skilled = candidates.filter((r) =>
        (task.requiredSkills ?? []).every((s) => (r.skills ?? []).includes(s)),
      );
      if (skilled.length === 0) {
        unassigned.push({
          taskId: task.id, taskType: task.type, locationName: task.locationName,
          reason: `在岗人员均不具备技能【${task.requiredSkills.join('/')}】，须派对应工种`,
        });
        continue;
      }
      // 缩小候选集
      candidates.length = 0;
      candidates.push(...skilled);
    }

    // 被服：库存不足则滞留（扣减在选定后进行）
    if (task.type === 'linen') {
      const stock = inventory[defaultCat] ?? 0;
      if (stock < task.demandQty) {
        unassigned.push({
          taskId: task.id, taskType: task.type, locationName: task.locationName,
          reason: `被服库存不足：需 ${task.demandQty} 件，可用 ${stock} 件，需先补充洗涤库存`,
        });
        continue;
      }
    }

    // 餐饮：带禁忌饮食且无人具备专配资质 → 滞留
    if (task.type === 'meal' && task.dietaryRestrictions && task.dietaryRestrictions.length > 0) {
      const qualified = candidates.filter((r) => r.handlesDietary);
      if (qualified.length === 0) {
        unassigned.push({
          taskId: task.id, taskType: task.type, locationName: task.locationName,
          reason: `特殊治疗膳食【${task.dietaryRestrictions.join('/')}】无专配资质人员配送`,
        });
        continue;
      }
      candidates.length = 0;
      candidates.push(...qualified);
    }

    // —— 在候选中打分选最优（负载未满优先） ——
    let best: { r: LogisticsResource; score: number; d: number; note: string } | null = null;
    for (const r of candidates) {
      if ((load[r.id] ?? 0) >= maxLoad) continue; // 已满载
      const d = dist(r, task);
      let score = prio * 20 - Math.floor(d / 50);
      let note = '';
      if (task.type === 'repair' && (task.requiredSkills ?? []).length > 0) {
        score += 40;
        note = '技能匹配；';
      }
      if (task.type === 'meal' && task.dietaryRestrictions && task.dietaryRestrictions.length > 0) {
        score += 20;
        note = '具备禁忌饮食专配资质；';
      }
      // 负载越轻越略占优，促进均衡（小于 1 分，不压过距离/紧急）
      score += (maxLoad - (load[r.id] ?? 0)) / maxLoad;
      if (!best || score > best.score) best = { r, score, d, note };
    }

    if (!best) {
      unassigned.push({
        taskId: task.id, taskType: task.type, locationName: task.locationName,
        reason: `所有可承接人员本班次负载已达上限（${maxLoad}），需加派班次`,
      });
      continue;
    }

    const etaMin = Math.round((best.d / speed) * 10) / 10;
    load[best.r.id] = (load[best.r.id] ?? 0) + task.demandQty;
    if (task.type === 'linen') inventory[defaultCat] = (inventory[defaultCat] ?? 0) - task.demandQty;

    assignments.push({
      taskId: task.id,
      taskType: task.type,
      taskTypeLabel: TASK_TYPE_LABEL[task.type],
      locationName: task.locationName,
      priority: prio,
      resourceId: best.r.id,
      resourceName: best.r.name,
      score: Math.round(best.score * 10) / 10,
      distanceM: best.d,
      etaMin,
      rationale: `${best.note}距 ${best.d}m（约 ${etaMin} 分钟到场）；紧急度 ${prio}/5`,
    });
  }

  // 汇总指标
  const avgResponseM = assignments.length > 0
    ? Math.round((assignments.reduce((s, a) => s + a.distanceM, 0) / assignments.length) * 10) / 10
    : 0;

  // 餐饮准时率：ETA 后仍能在 dueMinute 前送达（简化为预计到场 ≤ 剩余窗）
  const mealAssignments = assignments.filter((a) => {
    const t = taskById.get(a.taskId);
    return t && t.type === 'meal' && typeof t.dueMinute === 'number';
  });
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const onTime = mealAssignments.filter((a) => {
    const t = taskById.get(a.taskId)!;
    return now + a.etaMin <= (t.dueMinute ?? Number.POSITIVE_INFINITY);
  }).length;
  const mealOnTimeRate = mealAssignments.length > 0
    ? Math.round((onTime / mealAssignments.length) * 1000) / 1000
    : 1;

  return { assignments, unassigned, resourceLoad: load, avgResponseM, mealOnTimeRate };
}

/* ============================== 2. 路线优化 ============================== */

/** 一辆配送车 / 配送人 */
export interface Vehicle extends Point {
  id: string;
  name: string;
  /** 容量：被服件 / 餐份数（保洁/维修忽略时给足够大） */
  capacity: number;
}

/** 一个配送停靠点 */
export interface RouteStop extends Point {
  taskId: string;
  locationName: string;
  qty: number;
}

/** 单车规划结果 */
export interface VehicleRoute {
  vehicleId: string;
  vehicleName: string;
  stops: RouteStop[];
  /** 总行驶里程（米，含回库到起点） */
  totalDistanceM: number;
  /** 已装载量 */
  loadQty: number;
  /** 是否在容量内 */
  feasible: boolean;
}

/** optimizeLogisticsRoute 输出 */
export interface RouteOptimizationResult {
  routes: VehicleRoute[];
  /** 全部车辆总里程（米） */
  totalDistanceM: number;
  /** 装不下的任务 */
  infeasible: { taskId: string; reason: string }[];
}

/**
 * 后勤配送路线优化（纯函数，贪心最近邻 + 容量约束 VRP）。
 *
 * 规则：每辆车从各自当前位置出发，反复选取「距离本车当前位置最近且未超剩余容量」
 * 的停靠点加入路线；直到没有可装下的点为止。剩余无人能装的任务列入 infeasible。
 *
 * @param tasks  配送任务（需带坐标与 qty）
 * @param vehicles 可用车辆 / 配送人
 */
export function optimizeLogisticsRoute(
  tasks: Array<Omit<LogisticsTask, 'priority' | 'dueMinute' | 'requiredSkills' | 'dietaryRestrictions'>> & Partial<Point>,
  vehicles: Vehicle[],
): RouteOptimizationResult {
  const routes: VehicleRoute[] = vehicles.map((v) => ({
    vehicleId: v.id,
    vehicleName: v.name,
    stops: [] as RouteStop[],
    totalDistanceM: 0,
    loadQty: 0,
    feasible: true,
  }));

  const remaining = new Map<string, RouteStop>();
  for (const t of tasks) {
    remaining.set(t.id, {
      taskId: t.id,
      locationName: t.locationName,
      qty: t.demandQty,
      x: typeof t.x === 'number' ? t.x : 0,
      y: typeof t.y === 'number' ? t.y : 0,
    });
  }

  const cur = new Map<string, Point>(vehicles.map((v) => [v.id, { x: v.x, y: v.y }]));
  const traveled = new Map<string, number>(vehicles.map((v) => [v.id, 0]));

  // 多轮：每轮为每辆车挑最近可达点；任一车能装则继续，直到全局无可装
  let progress = true;
  while (progress && remaining.size > 0) {
    progress = false;
    for (let vi = 0; vi < vehicles.length; vi++) {
      const v = vehicles[vi];
      const route = routes[vi];
      if (route.loadQty >= v.capacity) continue;

      let bestId: string | null = null;
      let bestD = Number.POSITIVE_INFINITY;
      let bestStop: RouteStop | null = null;
      const here = cur.get(v.id)!;
      for (const [id, stop] of remaining) {
        if (route.loadQty + stop.qty > v.capacity) continue;
        const d = dist(here, stop);
        if (d < bestD) { bestD = d; bestId = id; bestStop = stop; }
      }
      if (bestId && bestStop) {
        route.stops.push(bestStop);
        route.loadQty += bestStop.qty;
        traveled.set(v.id, (traveled.get(v.id) ?? 0) + bestD);
        cur.set(v.id, { x: bestStop.x, y: bestStop.y });
        remaining.delete(bestId);
        progress = true;
      }
    }
  }

  // 每辆车回程到起点，计入总里程
  for (let vi = 0; vi < vehicles.length; vi++) {
    const v = vehicles[vi];
    const route = routes[vi];
    const last = cur.get(v.id)!;
    const back = dist(last, v);
    route.totalDistanceM = Math.round(((traveled.get(v.id) ?? 0) + back) * 10) / 10;
    route.feasible = route.loadQty <= v.capacity;
  }

  const infeasible = Array.from(remaining.values()).map((s) => ({
    taskId: s.taskId,
    reason: `所有车辆剩余容量之和不足以装载 ${s.qty} 件，需增车或拆单`,
  }));

  const totalDistanceM = Math.round(routes.reduce((s, r) => s + r.totalDistanceM, 0) * 10) / 10;
  return { routes, totalDistanceM, infeasible };
}

/* ============================== 3. 需求预测 ============================== */

/** 一个待预测时段（科研教学后勤用于排班备货） */
export interface DemandPeriod {
  /** 时段标签（如 周一 / 2026-W42 / 供暖季） */
  label: string;
  /** 历史基期工单量（过去同期日均/周均） */
  baseline: number;
}

/** 季节与趋势参数 */
export interface Seasonality {
  /** 时段 → 季节系数（1=平峰；开学季/降温季被服餐饮需求走高） */
  factors: Record<string, number>;
  /** 趋势系数（如月环比 1.05；缺省 1） */
  trend?: number;
}

/** 单个时段预测 */
export interface DemandForecastItem {
  label: string;
  baseline: number;
  factor: number;
  trend: number;
  /** 预测工单量（向上取整为整件） */
  predicted: number;
}

/** predictLogisticsDemand 输出 */
export interface DemandForecast {
  items: DemandForecastItem[];
  /** 预测总量 */
  totalPredicted: number;
  /** 高峰时段标签（预测量最大者） */
  peakLabel: string;
}

/**
 * 后勤需求预测（纯函数）：基期量 × 季节系数 × 趋势系数，向上取整为整件工单。
 * 用于提前安排保洁排班、被服洗涤量与餐饮备餐量，避免「事到临头缺人缺料」。
 *
 * @param periods   待预测时段列表
 * @param seasonality 季节系数表与趋势
 */
export function predictLogisticsDemand(
  periods: DemandPeriod[],
  seasonality: Seasonality,
): DemandForecast {
  const trend = seasonality.trend && seasonality.trend > 0 ? seasonality.trend : 1;
  let peakLabel = '';
  let peak = -1;

  const items: DemandForecastItem[] = periods.map((p) => {
    const factor = seasonality.factors[p.label] ?? 1;
    // toFixed(2) 吸收浮点噪声（如 0.5×1.1=0.5500…1），再向上取整为整件工单
    const predicted = Math.ceil(Number(((p.baseline || 0) * factor * trend).toFixed(2)));
    if (predicted > peak) { peak = predicted; peakLabel = p.label; }
    return { label: p.label, baseline: p.baseline, factor, trend, predicted };
  });

  const totalPredicted = items.reduce((s, i) => s + i.predicted, 0);
  return { items, totalPredicted, peakLabel };
}

/* ============================== 4. 满意度跟踪 ============================== */

/** 一条已完工工单 */
export interface CompletedTask {
  id: string;
  type: LogisticsTaskType;
  /** 是否准时 */
  onTime: boolean;
  /** 是否在 SLA 承诺时长内完成 */
  withinSla: boolean;
}

/** 对某工单的反馈 */
export interface TaskFeedback {
  taskId: string;
  /** 满意度评分 1..5 */
  rating: number;
  /** 是否投诉 */
  complaint?: boolean;
}

/** 分类别满意度汇总 */
export interface TypeSatisfaction {
  count: number;
  avgRating: number;
  onTimeRate: number;
}

/** trackLogisticsSatisfaction 输出 */
export interface SatisfactionReport {
  totalTasks: number;
  feedbackCount: number;
  /** 整体评价均分（0..5） */
  avgRating: number;
  /** 整体准时率（0..1） */
  onTimeRate: number;
  /** 整体 SLA 达成率（0..1） */
  slaRate: number;
  /** 投诉率（0..1） */
  complaintRate: number;
  /** 四类后勤分别满意度 */
  byType: Partial<Record<LogisticsTaskType, TypeSatisfaction>>;
  /** 需回访工单（≤3 分或被投诉） */
  atRisk: { taskId: string; rating: number; complaint: boolean }[];
}

/**
 * 后勤满意度跟踪（纯函数）：汇总完工工单的准时率 / SLA 率 / 评价均分 / 投诉率，
 * 按四类后勤拆分，并把低分或被投诉工单列入回访清单，形成闭环。
 *
 * @param tasks    已完工工单
 * @param feedback  科室 / 患者反馈
 */
export function trackLogisticsSatisfaction(
  tasks: CompletedTask[],
  feedback: TaskFeedback[],
): SatisfactionReport {
  const fbByTask = new Map(feedback.map((f) => [f.taskId, f]));

  let ratingSum = 0;
  let rated = 0;
  let complaintCount = 0;
  const typeAgg = new Map<LogisticsTaskType, { count: number; ratingSum: number; rated: number; onTime: number }>();

  for (const t of tasks) {
    const agg = typeAgg.get(t.type) ?? { count: 0, ratingSum: 0, rated: 0, onTime: 0 };
    agg.count += 1;
    if (t.onTime) agg.onTime += 1;
    const fb = fbByTask.get(t.id);
    if (fb) {
      const r = Math.min(5, Math.max(1, fb.rating));
      agg.ratingSum += r;
      agg.rated += 1;
      ratingSum += r;
      rated += 1;
      if (fb.complaint) complaintCount += 1;
    }
    typeAgg.set(t.type, agg);
  }

  const total = tasks.length;
  const onTimeCount = tasks.filter((t) => t.onTime).length;
  const slaCount = tasks.filter((t) => t.withinSla).length;

  const byType: SatisfactionReport['byType'] = {};
  for (const [type, agg] of typeAgg) {
    byType[type] = {
      count: agg.count,
      avgRating: agg.rated > 0 ? Math.round((agg.ratingSum / agg.rated) * 100) / 100 : 0,
      onTimeRate: agg.count > 0 ? Math.round((agg.onTime / agg.count) * 1000) / 1000 : 0,
    };
  }

  const atRisk = feedback
    .filter((f) => f.rating <= 3 || f.complaint)
    .map((f) => ({ taskId: f.taskId, rating: f.rating, complaint: !!f.complaint }))
    .sort((a, b) => a.rating - b.rating);

  return {
    totalTasks: total,
    feedbackCount: feedback.length,
    avgRating: rated > 0 ? Math.round((ratingSum / rated) * 100) / 100 : 0,
    onTimeRate: total > 0 ? Math.round((onTimeCount / total) * 1000) / 1000 : 0,
    slaRate: total > 0 ? Math.round((slaCount / total) * 1000) / 1000 : 0,
    complaintRate: feedback.length > 0
      ? Math.round((complaintCount / feedback.length) * 1000) / 1000
      : 0,
    byType,
    atRisk,
  };
}
