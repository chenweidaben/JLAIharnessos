/**
 * 健澜科技 jlmedaios - 五角色 MUSE 飞轮总览 V13 纯函数（M321-A）
 *
 * buildRoleComparisonV13 / computeTotalCallsV13 / identifyLeadingRoleV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 五角色飞轮数据 */
export interface RoleFlywheelV13 {
  role: "doctor" | "nurse" | "pharmacist" | "admin" | "patient";
  callCount: number;
  hitRate: number;
  adoptionRate: number;
}

/** 角色对比项 */
export interface RoleComparisonItemV13 {
  role: RoleFlywheelV13["role"];
  callCount: number;
  hitRate: number;
  adoptionRate: number;
}

/**
 * 五角色并排对比（纯函数）：调用量/命中率/采纳率。
 *
 * @param roles 五角色飞轮数据列表
 * @returns 角色对比列表
 */
export function buildRoleComparisonV13(roles: RoleFlywheelV13[]): RoleComparisonItemV13[] {
  return roles.map((r) => ({
    role: r.role,
    callCount: r.callCount,
    hitRate: r.hitRate,
    adoptionRate: r.adoptionRate,
  }));
}

/**
 * 总调用量加总（纯函数）。
 *
 * @param roles 五角色飞轮数据列表
 * @returns 总调用量
 */
export function computeTotalCallsV13(roles: RoleFlywheelV13[]): number {
  return roles.reduce((sum, r) => sum + r.callCount, 0);
}

/**
 * 领先角色（纯函数）：命中率最高的角色。
 *
 * @param roles 五角色飞轮数据列表
 * @returns 领先角色名，空列表返回 null
 */
export function identifyLeadingRoleV13(roles: RoleFlywheelV13[]): RoleFlywheelV13["role"] | null {
  if (roles.length === 0) return null;
  let leading = roles[0];
  for (const r of roles) {
    if (r.hitRate > leading.hitRate) leading = r;
  }
  return leading.role;
}
