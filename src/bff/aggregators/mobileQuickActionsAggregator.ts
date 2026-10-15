/**
 * 健澜科技 jlmedaios - 医生移动端快捷操作聚合器（M128-B）
 *
 * 纯函数 buildMobileQuickActions(role, permissions)：
 * 按当前医护角色（医生/护士/药师）输出移动端首页大按钮快捷操作列表，
 * 并依据权限码做二次过滤（无权限的操作不下发，避免前端渲染越权入口）。
 *
 * 移动端+性能优化：
 *  - 纯函数、零 I/O、零外部依赖，结果可被前端按角色缓存（角色不变即列表不变）；
 *  - 目录以冻结常量表声明，构建期即可完成树摇，运行期仅做一次线性过滤；
 *  - 返回结构化数据（icon/target/label），前端直接映射大按钮，无需二次拼装。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 医护移动端角色（与 BFF requireRole 的角色字符串保持一致）。 */
export type StaffRole = 'doctor' | 'nurse' | 'pharmacist';

/** 单个快捷操作。 */
export interface QuickAction {
  /** 稳定标识，前端作 key / 埋点事件名。 */
  key: string;
  /** 主标题（大按钮文案）。 */
  label: string;
  /** 副标题，一句话说明该操作承载的业务含义。 */
  desc: string;
  /** 图标键，前端映射到深海蓝 VI 图标库（不直接传 JSX，保持 BFF 纯数据）。 */
  icon: string;
  /** 点击跳转的移动端路由。 */
  target: string;
  /** 需要的业务权限码；未授予则不向该用户下发此操作。缺省表示登录即可见。 */
  perm?: string;
}

/** 目录条目：在 QuickAction 基础上额外声明适用角色。 */
interface CatalogEntry extends QuickAction {
  role: StaffRole;
}

/**
 * 快捷操作目录（冻结常量）。
 * 移动端+性能优化：声明式目录，新增操作只改此表，纯函数自动按角色/权限分发。
 */
const QUICK_ACTION_CATALOG: readonly CatalogEntry[] = Object.freeze([
  // —— 医生 ——
  Object.freeze({ key: 'today-opd', role: 'doctor', label: '今日门诊', desc: '今日出诊挂号与接诊队列', icon: 'calendar-check', target: '/m/opd' }),
  Object.freeze({ key: 'pending-orders', role: 'doctor', label: '待处理医嘱', desc: '待确认、待退回与待下达医嘱', icon: 'file-done', target: '/m/orders' }),
  Object.freeze({ key: 'rx-review', role: 'doctor', label: '处方审核', desc: '待医师审核的处方单', icon: 'audit', target: '/m/rx-review', perm: 'rx:review' }),
  Object.freeze({ key: 'chart-complete', role: 'doctor', label: '病历补全', desc: '未完成书写与待运行病历', icon: 'edit', target: '/m/charts' }),
  // —— 护士 ——
  Object.freeze({ key: 'nurse-handover', role: 'nurse', label: '今日交班', desc: '本班交接班记录与 SBAR', icon: 'swap', target: '/m/handoff' }),
  Object.freeze({ key: 'risk-patients', role: 'nurse', label: '风险患者', desc: '高危/压疮/跌倒/管路风险患者', icon: 'warning', target: '/m/patients?risk=1' }),
  Object.freeze({ key: 'pending-care', role: 'nurse', label: '待执行护理', desc: '床旁待执行护理任务', icon: 'care', target: '/m/tasks' }),
  // —— 药师 ——
  Object.freeze({ key: 'pharm-pending-rx', role: 'pharmacist', label: '待审处方', desc: '药师待审核处方队列', icon: 'audit', target: '/m/pharm/review' }),
  Object.freeze({ key: 'pharm-intercepts', role: 'pharmacist', label: '拦截记录', desc: '不合理用药拦截与追溯', icon: 'shield', target: '/m/pharm/intercepts' }),
]);

/** 系统认可的医护角色集合（其余角色一律不下发任何快捷操作）。 */
export const STAFF_ROLES: readonly StaffRole[] = Object.freeze(['doctor', 'nurse', 'pharmacist']);

function isStaffRole(role: string | null | undefined): role is StaffRole {
  return typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * 构建移动端快捷操作列表。
 *
 * @param role 当前用户主角色（doctor/nurse/pharmacist）；未知角色返回空数组。
 * @param permissions 当前用户已授予的权限码；缺省时不下发任何「需权限」的操作，
 *   但仍返回该角色下登录即可见的操作（路由层总会显式传入权限集合）。
 *
 * 移动端+性能优化：纯函数，结果仅取决于入参，可安全做前端缓存。
 */
export function buildMobileQuickActions(
  role: string | null | undefined,
  permissions?: readonly string[],
): QuickAction[] {
  if (!isStaffRole(role)) return [];
  const granted = new Set(permissions ?? []);
  // 线性单次过滤：目录体量极小（个位数），无需建索引。
  // 显式投影出 QuickAction（去掉内部 role 字段，不向客户端泄漏目录元数据）。
  return QUICK_ACTION_CATALOG.filter(
    (entry) => entry.role === role && (!entry.perm || granted.has(entry.perm)),
  ).map((entry) => ({
    key: entry.key,
    label: entry.label,
    desc: entry.desc,
    icon: entry.icon,
    target: entry.target,
    ...(entry.perm ? { perm: entry.perm } : {}),
  }));
}
