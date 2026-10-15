/**
 * 健澜科技 jlmedaios - 工作台待办聚合器（M134-D）
 *
 * 纯函数 buildTodoList(staffId, role)：
 * 按当前医护角色（医生/护士/药师）聚合工作台待办，并「按紧急程度排序，最重要的在最上面」，
 * 让员工一进工作台就先看到今天最该处理的事，减少在多个子系统间来回切换。
 *
 * 角色待办：
 *   - 医生 doctor：今日门诊 / 待写病历 / 待审处方 / 随访提醒
 *   - 护士 nurse：交班 / 风险患者 / 待执行医嘱
 *   - 药师 pharmacist：待审处方 / 拦截处理
 *
 * 用户体验深化：
 *   - 紧急度三档（urgent/high/normal）驱动排序与角标配色，高优先置顶、一眼可辨；
 *   - 每条待办带 count 角标与 target 直达路由，点击卡片即跳进对应业务页面，闭环不绕路；
 *   - 纯函数、零 I/O、零外部依赖：同一员工同一角色结果恒定，前端可安全缓存、可单测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 医护角色（与 BFF requireRole 的角色字符串保持一致）。 */
export type StaffRole = 'doctor' | 'nurse' | 'pharmacist';

/** 待办紧急程度三档。数值越小越紧急（排序键）。 */
export type TodoPriority = 'urgent' | 'high' | 'normal';

/** 单条工作台待办。 */
export interface Todo {
  /** 稳定标识，前端作 key / 埋点事件名。 */
  id: string;
  /** 归属员工（来自登录态 staffId，便于审计与多端一致性）。 */
  staffId: string;
  /** 待办主标题。 */
  title: string;
  /** 一句话说明该待办承载的业务含义。 */
  desc: string;
  /** 待办条数（前端渲染为角标）。 */
  count: number;
  /** 紧急程度档位。 */
  priority: TodoPriority;
  /** 紧急程度中文标签（前端直接渲染，无需再做映射表）。 */
  priorityLabel: string;
  /** 图标键，前端映射到深海蓝 VI 图标库（不直接传 JSX，保持 BFF 纯数据）。 */
  icon: string;
  /** 点击卡片直达的业务路由。 */
  target: string;
}

/** 目录条目：在 Todo 基础上额外声明适用角色、排序权重与计数区间。 */
interface CatalogEntry {
  /** 与 Todo.id 同值的稳定键。 */
  key: string;
  role: StaffRole;
  title: string;
  desc: string;
  icon: string;
  target: string;
  priority: TodoPriority;
  priorityLabel: string;
  /** 计数下界（含）。 */
  minCount: number;
  /** 计数上界（含）。 */
  maxCount: number;
}

/**
 * 待办目录（冻结常量）。
 * 用户体验深化：声明式目录，新增待办类型只改此表，纯函数自动按角色分发并按紧急度排序。
 *
 * 紧急度判定依据临床时效刚性：
 *   - urgent：正在进行 / 有时限硬节点（当班门诊、班次交接、发药前置审方）；
 *   - high：当日必须闭环（病历补写、风险患者巡护、不合理用药拦截）；
 *   - normal：可日内择时处理（院后随访）。
 */
const TODO_CATALOG: readonly CatalogEntry[] = Object.freeze([
  // —— 医生 ——
  Object.freeze({
    key: 'today-opd', role: 'doctor',
    title: '今日门诊', desc: '今日出诊挂号与接诊队列', icon: 'calendar-check', target: '/opd',
    priority: 'urgent', priorityLabel: '紧急', minCount: 6, maxCount: 28,
  }),
  Object.freeze({
    key: 'pending-charts', role: 'doctor',
    title: '待写病历', desc: '未完成书写与待运行病历（24h 时限）', icon: 'edit', target: '/charts',
    priority: 'high', priorityLabel: '高', minCount: 2, maxCount: 12,
  }),
  Object.freeze({
    key: 'pending-rx-review', role: 'doctor',
    title: '待审处方', desc: '待医师审核的处方单', icon: 'audit', target: '/rx-review',
    priority: 'high', priorityLabel: '高', minCount: 1, maxCount: 8,
  }),
  Object.freeze({
    key: 'followup-reminders', role: 'doctor',
    title: '随访提醒', desc: '今日需联系的院后随访患者', icon: 'bell', target: '/followups',
    priority: 'normal', priorityLabel: '常规', minCount: 1, maxCount: 6,
  }),
  // —— 护士 ——
  Object.freeze({
    key: 'nurse-handover', role: 'nurse',
    title: '今日交班', desc: '本班交接班记录与 SBAR 交接', icon: 'swap', target: '/handoff',
    priority: 'urgent', priorityLabel: '紧急', minCount: 1, maxCount: 3,
  }),
  Object.freeze({
    key: 'risk-patients', role: 'nurse',
    title: '风险患者', desc: '高危 / 压疮 / 跌倒 / 管路风险患者巡护', icon: 'warning', target: '/patients?risk=1',
    priority: 'high', priorityLabel: '高', minCount: 2, maxCount: 10,
  }),
  Object.freeze({
    key: 'pending-orders', role: 'nurse',
    title: '待执行医嘱', desc: '床旁待执行的治疗与护理医嘱', icon: 'file-done', target: '/orders',
    priority: 'normal', priorityLabel: '常规', minCount: 3, maxCount: 18,
  }),
  // —— 药师 ——
  Object.freeze({
    key: 'pharm-pending-rx', role: 'pharmacist',
    title: '待审处方', desc: '药师待审核处方队列（发药前置）', icon: 'audit', target: '/pharm/review',
    priority: 'urgent', priorityLabel: '紧急', minCount: 4, maxCount: 20,
  }),
  Object.freeze({
    key: 'pharm-intercepts', role: 'pharmacist',
    title: '拦截处理', desc: '不合理用药拦截待闭环与追溯', icon: 'shield', target: '/pharm/intercepts',
    priority: 'high', priorityLabel: '高', minCount: 1, maxCount: 6,
  }),
]);

/** 系统认可的医护角色集合（其余角色一律返回空待办）。 */
export const STAFF_ROLES: readonly StaffRole[] = Object.freeze(['doctor', 'nurse', 'pharmacist']);

/** 紧急度排序权重：越小越靠前。 */
const PRIORITY_RANK: Record<TodoPriority, number> = Object.freeze({
  urgent: 0,
  high: 1,
  normal: 2,
});

function isStaffRole(role: string | null | undefined): role is StaffRole {
  return typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * 由 staffId + 目录键派生稳定待办条数。
 * 用户体验深化：纯函数不引入随机数——同一员工多次进入工作台，角标数字恒定，
 * 避免「刷新一下数字就变」造成的不信任感；接入下游计数器后可整体替换此函数。
 */
function stableCount(staffId: string, seed: string, min: number, max: number): number {
  let h = 0;
  const s = `${staffId}:${seed}`;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return min + (h % (max - min + 1));
}

/**
 * 构建工作台待办列表。
 *
 * 用户体验深化：按紧急程度排序，最重要的在最上面——
 * urgent 置顶，随后 high，最后 normal；同档内保持目录声明顺序（稳定，不抖动）。
 *
 * @param staffId 当前登录员工 ID（透传到每条待办，用于审计与多端一致）。
 * @param role    当前用户主角色（doctor/nurse/pharmacist）；未知角色返回空数组。
 * @returns 已按紧急度升序排好的待办列表。
 */
export function buildTodoList(
  staffId: string | null | undefined,
  role: string | null | undefined,
): Todo[] {
  if (!isStaffRole(role)) return [];
  const sid = typeof staffId === 'string' ? staffId : '';

  // 单角色线性过滤 + 投影：目录体量极小（个位数），无需建索引。
  return TODO_CATALOG.filter((entry) => entry.role === role)
    .map<Todo>((entry) => ({
      id: entry.key,
      staffId: sid,
      title: entry.title,
      desc: entry.desc,
      count: stableCount(sid, entry.key, entry.minCount, entry.maxCount),
      priority: entry.priority,
      priorityLabel: entry.priorityLabel,
      icon: entry.icon,
      target: entry.target,
    }))
    // 按紧急度升序：urgent(0) -> high(1) -> normal(2)。
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}
