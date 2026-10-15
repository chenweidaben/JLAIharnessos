/**
 * 健澜科技 jlmedaios - Doctor MUSE / 全角色 Personal Agent 员工画像聚合器
 *
 * 依据宪法第七章（全角色 Personal Agent）：为医生 / 护士 / 药师 / 行政人员
 *   沉淀「越用越懂这位员工」的个人画像——从其历史决策记忆中聚合专业方向
 *   （specialty）、经验标签（experienceTags）与滚动成功率（successRate）。
 *
 * 设计要点：
 *  - buildStaffMuseProfile / recordDecisionMemory 为纯函数，不修改入参、
 *    不打库，便于单测与前端侧本地复用；
 *  - 画像只存岗位级聚合标签，不落患者直接标识符；
 *  - successRate 保留 4 位小数（0~1），空决策集为 0，输出确定可快照。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 员工岗位（与 medmuse.staff_muse_profile.role CHECK 一致） */
export type StaffMuseRole = 'doctor' | 'nurse' | 'pharma' | 'admin';

/** 决策结局三态（与 medmuse.staff_decision_memory.outcome CHECK 一致） */
export type StaffDecisionOutcome = 'success' | 'failure' | 'mixed';

/**
 * 一条员工决策记忆（对应 medmuse.staff_decision_memory 一行；
 * context 已在入库前脱敏，纯函数侧只读取结构化字段）。
 */
export interface StaffDecision {
  /** 决策内容摘要，如「拒绝该 DIP 病组自费方案」 */
  decision: string;
  /** 结局：成功 / 失败 / 混合 */
  outcome: StaffDecisionOutcome;
  /** 本条决策所在专业方向，如「心血管内科」（可空） */
  specialty?: string;
  /** 本条决策沉淀的经验标签，如「抗凝出血风险」（可空） */
  experienceTag?: string;
  /** 事后复盘 lesson（仅记录用，不参与聚合） */
  lesson?: string;
}

/**
 * 员工 MUSE 画像（聚合视图；对应 staff_muse_profile + staff_muse_stats）。
 * successRate 为 0~1 的小数，保留 4 位；mixed 计入 total 但不计入 success。
 */
export interface StaffMuseProfile {
  /** 员工院内脱敏标识（对应 staff_id） */
  staffId: string;
  /** 岗位 */
  role: StaffMuseRole;
  /** 主流专业方向（历史决策中出现频次最高者；无历史为 null） */
  specialty: string | null;
  /** 经验标签去重集合（按首次出现顺序） */
  experienceTags: string[];
  /** 累计决策数 */
  totalDecisions: number;
  /** 成功决策数 */
  successCount: number;
  /** 失败决策数 */
  failureCount: number;
  /** 混合结局决策数 */
  mixedCount: number;
  /** 成功率 = successCount / totalDecisions（0~1，4 位小数；空集为 0） */
  successRate: number;
}

/* ------------------------------------------------------------------ */
/* 纯函数                                                              */
/* ------------------------------------------------------------------ */

/**
 * roundRate：把成功率四舍五入到 4 位小数，避免浮点噪声导致快照不稳定。
 */
function roundRate(rate: number): number {
  return Math.round(rate * 10000) / 10000;
}

/**
 * buildStaffMuseProfile：从员工历史决策记忆构建个人画像。
 *
 * 聚合口径：
 *   - specialty       出现频次最高的 specialty（并列取字典序最小者，输出确定）；
 *                     全部决策无 specialty 时为 null；
 *   - experienceTags  所有决策的 experienceTag 去重，按首次出现顺序保留；
 *   - totalDecisions  决策条数；success/failure/mixedCount 按 outcome 计数；
 *   - successRate     successCount / totalDecisions（4 位小数，空集 0）。
 *
 * 纯函数：不修改入参；decisions 为 null / undefined / 空数组时返回空画像
 *   （specialty=null、标签为空、计数全 0、successRate=0），不抛错。
 *
 * @param staffId  员工脱敏标识
 * @param role     岗位（doctor / nurse / pharma / admin）
 * @param decisions 历史决策记忆行
 */
export function buildStaffMuseProfile(
  staffId: string,
  role: StaffMuseRole,
  decisions: StaffDecision[] | null | undefined,
): StaffMuseProfile {
  let successCount = 0;
  let failureCount = 0;
  let mixedCount = 0;
  const tagSet: string[] = [];
  const tagSeen = new Set<string>();
  const specialtyCount = new Map<string, number>();

  for (const d of decisions ?? []) {
    if (!d) continue;
    if (d.outcome === 'success') successCount += 1;
    else if (d.outcome === 'failure') failureCount += 1;
    else if (d.outcome === 'mixed') mixedCount += 1;

    const tag = (d.experienceTag ?? '').trim();
    if (tag && !tagSeen.has(tag)) {
      tagSeen.add(tag);
      tagSet.push(tag);
    }

    const sp = (d.specialty ?? '').trim();
    if (sp) specialtyCount.set(sp, (specialtyCount.get(sp) ?? 0) + 1);
  }

  const totalDecisions = successCount + failureCount + mixedCount;

  // 主流专业方向：频次最高者；并列按字典序升序，保证可快照
  let specialty: string | null = null;
  let bestCount = 0;
  for (const [name, count] of specialtyCount) {
    if (count > bestCount || (count === bestCount && name.localeCompare(specialty ?? '', 'zh-CN') < 0)) {
      specialty = name;
      bestCount = count;
    }
  }

  return {
    staffId,
    role,
    specialty,
    experienceTags: tagSet,
    totalDecisions,
    successCount,
    failureCount,
    mixedCount,
    successRate: totalDecisions > 0 ? roundRate(successCount / totalDecisions) : 0,
  };
}

/**
 * recordDecisionMemory：把一条新决策记忆写入画像，返回更新后的新画像。
 *
 * 更新口径：
 *   - totalDecisions / successCount / failureCount / mixedCount 按 outcome +1；
 *   - successRate 按新总数重算（4 位小数）；
 *   - experienceTag 非空且未收录时，追加到 experienceTags 末尾；
 *   - specialty 画像当前为 null 且本条决策携带 specialty 时，补登该方向。
 *
 * 纯函数：返回新对象，不修改入参 profile / decision。
 *
 * @param profile  既有画像
 * @param decision 新记录的决策记忆
 */
export function recordDecisionMemory(
  profile: StaffMuseProfile,
  decision: StaffDecision,
): StaffMuseProfile {
  const successCount =
    profile.successCount + (decision.outcome === 'success' ? 1 : 0);
  const failureCount =
    profile.failureCount + (decision.outcome === 'failure' ? 1 : 0);
  const mixedCount = profile.mixedCount + (decision.outcome === 'mixed' ? 1 : 0);
  const totalDecisions = successCount + failureCount + mixedCount;

  const tag = (decision.experienceTag ?? '').trim();
  const experienceTags =
    tag && !profile.experienceTags.includes(tag)
      ? [...profile.experienceTags, tag]
      : [...profile.experienceTags];

  const incomingSpecialty = (decision.specialty ?? '').trim();
  const specialty = profile.specialty ?? (incomingSpecialty || null);

  return {
    staffId: profile.staffId,
    role: profile.role,
    specialty,
    experienceTags,
    totalDecisions,
    successCount,
    failureCount,
    mixedCount,
    successRate: totalDecisions > 0 ? roundRate(successCount / totalDecisions) : 0,
  };
}
