/**
 * 健澜科技 jlmedaios - MUSE 能力市场与可插拔技能 V5 纯函数（M284-D）
 *
 * registerSkillV5 / enableSkillV5 / invokeSkillV5 / buildMuseSkillsV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 技能元数据 */
export interface SkillMeta {
  skillName: string;
  role: string;
  description: string;
  endpoint: string;
  version: string;
}

/** 技能安装 */
export interface SkillInstall {
  skillId: string;
  role: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * 注册技能 V5（纯函数）：默认 pending。
 *
 * @param meta 技能元数据
 * @returns 注册结果
 */
export function registerSkillV5(meta: SkillMeta): { skillId: string; status: string } {
  return {
    skillId: `skill-${meta.skillName}-${meta.version}`,
    status: "pending",
  };
}

/**
 * 启用技能 V5（纯函数）：按角色启用。
 *
 * @param skillId 技能ID
 * @param role 角色
 * @param config 配置
 * @returns 安装记录
 */
export function enableSkillV5(skillId: string, role: string, config: Record<string, unknown>): SkillInstall {
  return {
    skillId,
    role,
    enabled: true,
    config,
  };
}

/**
 * 调用技能 V5（纯函数）：模拟调用，返回处理结果。
 *
 * @param skill 技能
 * @param input 输入
 * @returns 调用结果
 */
export function invokeSkillV5(skill: { skillId: string; endpoint: string; enabled: boolean }, input: Record<string, unknown>): {
  invoked: boolean;
  output: Record<string, unknown>;
} {
  if (!skill.enabled) return { invoked: false, output: { error: "skill disabled" } };
  return {
    invoked: true,
    output: { skillId: skill.skillId, echo: input, endpoint: skill.endpoint },
  };
}

/** 技能市场看板输出 */
export interface MuseSkillsV5Report {
  totalSkills: number;
  enabledCount: number;
  byRole: Record<string, number>;
}

/**
 * 构建技能市场看板（纯函数）。
 *
 * @param installs 安装列表
 * @returns 看板
 */
export function buildMuseSkillsV5Report(installs: SkillInstall[]): MuseSkillsV5Report {
  const byRole: Record<string, number> = {};
  for (const i of installs) {
    byRole[i.role] = (byRole[i.role] ?? 0) + 1;
  }
  return {
    totalSkills: installs.length,
    enabledCount: installs.filter((i) => i.enabled).length,
    byRole,
  };
}
