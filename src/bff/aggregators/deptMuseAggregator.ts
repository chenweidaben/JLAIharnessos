/**
 * 健澜科技 jlmedaios - 科室经验聚合 Dept MUSE（M114-C）
 *
 * 依据宪法第七章「Doctor MUSE」：
 *  - 7.2 科室层：汇聚科室医生/护士/药师全部个人智能体的决策经验，
 *    形成科室诊疗规范（组织级智能的二级沉淀）；
 *  - 7.7 经验记录铁律：失败经验价值更高，单独标记「教训」类，
 *    与高频成功决策分桶输出；
 *  - 7.8 后继者机制：新员工入职时 newHireStartingPoint 自动加载
 *    科室基线（deptBaseline），并配发必读教训与推荐上手决策。
 *
 * 纯函数核心（不触库、无副作用、可直接单测）：
 *  - buildDeptMuse(deptCode, allStaffMuses, options?)：
 *      按科室过滤 → 成功/失败分桶 → 跨角色按主题合并 → 频次排序，
 *      返回 { deptBaseline, topDecisions, topFailures, newHireStartingPoint }；
 *  - aggregateTopics(entries)：单桶内按 topic 合并，累加次数、
 *      去重人员与角色、加权成功率；
 *  - rankTopics(topics)：按 totalCount → staffCount → topic 字典序
 *      三级排序，保证结果确定、可单测。
 *
 * 入参 allStaffMuses 为全院 Personal Agent 已沉淀的决策经验行（camelCase），
 * 本聚合器只消费与 deptCode 匹配的行，其余科室数据一律忽略。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 科室角色（全角色 Personal Agent：医生 / 护士 / 药师） */
export type StaffRole = 'doctor' | 'nurse' | 'pharmacist';

/**
 * 员工 MUSE 单条决策经验（个人层 Doctor/Nurse/Pharma MUSE 的最小沉淀单元）。
 * 由调用方从 medmuse 学习画像装入，本聚合器只读不写。
 */
export interface StaffMuseEntry {
  /** 员工主键 */
  staffId: string;
  /** 员工姓名（溯源用，聚合结果不外露） */
  staffName: string;
  /** 角色码 */
  role: StaffRole;
  /** 所属科室编码 */
  deptCode: string;
  /** 决策要点主题（跨员工合并的主键，如「CAP 经验性抗感染首选」） */
  topic: string;
  /** 经验正文（做法 / 注意事项） */
  content: string;
  /** 该员工做出此决策的累计次数 */
  decisionCount: number;
  /** 是否为失败经验（true → 「教训」桶） */
  isFailure: boolean;
  /** 该决策点的有效率 0~1（成功次数 / 累计次数） */
  successRate: number;
}

/** 聚合后的科室主题条目（跨角色、跨员工合并） */
export interface AggregatedMuseTopic {
  /** 决策要点主题 */
  topic: string;
  /** 代表性经验正文（取次数最高员工的写法） */
  content: string;
  /** 跨员工累计决策次数（高频度口径） */
  totalCount: number;
  /** 参与该决策的员工数 */
  staffCount: number;
  /** 涉及角色（canonical 顺序：doctor → nurse → pharmacist，去重） */
  roles: StaffRole[];
  /** 「教训」类标记：失败经验聚合为 true，成功决策为 false */
  lesson: boolean;
  /** 按决策次数加权的平均有效率 0~1 */
  avgSuccessRate: number;
}

/** 科室基线（新员工入职自动加载的「上岗底数」） */
export interface DeptBaseline {
  /** 科室编码 */
  deptCode: string;
  /** 有经验沉淀的员工数（按 staffId 去重） */
  staffSize: number;
  /** 有沉淀的角色覆盖（canonical 顺序，去重） */
  roleCoverage: StaffRole[];
  /** 本聚合消费的原始经验条数 */
  totalEntries: number;
  /** 累计决策次数（所有员工、所有主题求和） */
  totalDecisionCount: number;
  /** 基线主题清单（高频成功决策的 topic 名，按频次降序） */
  baselineTopics: string[];
}

/** 新员工入职起点（7.8 后继者机制） */
export interface NewHireStartingPoint {
  /** 科室编码 */
  deptCode: string;
  /** 自动加载的科室基线 */
  deptBaseline: DeptBaseline;
  /** 必读教训（topFailures 全量下发，先避坑再上手） */
  mustKnowLessons: AggregatedMuseTopic[];
  /** 推荐上手决策（topDecisions，按科室惯例优先模仿） */
  recommendedDecisions: AggregatedMuseTopic[];
}

/** buildDeptMuse 总产出 */
export interface DeptMuse {
  /** 科室基线统计 */
  deptBaseline: DeptBaseline;
  /** 高频成功决策 TOP 榜（不含教训） */
  topDecisions: AggregatedMuseTopic[];
  /** 高频失败教训榜（lesson=true，失败经验单独成桶） */
  topFailures: AggregatedMuseTopic[];
  /** 新员工入职起点：基线 + 教训 + 推荐决策一体下发 */
  newHireStartingPoint: NewHireStartingPoint;
}

/** buildDeptMuse 可选项 */
export interface BuildDeptMuseOptions {
  /** topDecisions / recommendedDecisions 条数上限，默认 10 */
  maxDecisions?: number;
  /** topFailures / mustKnowLessons 条数上限，默认 5 */
  maxFailures?: number;
}

/* ------------------------------- 常量与工具 ------------------------------- */

/** 角色 canonical 顺序权重（doctor 0 / nurse 1 / pharmacist 2） */
const ROLE_ORDER: Record<StaffRole, number> = {
  doctor: 0,
  nurse: 1,
  pharmacist: 2,
};

/** 默认成功决策上榜条数 */
const DEFAULT_MAX_DECISIONS = 10;
/** 默认教训上榜条数（失败经验价值更高，但榜单更短以便精读） */
const DEFAULT_MAX_FAILURES = 5;

/** 按 canonical 顺序排序并去重角色 */
function dedupRoles(roles: Iterable<StaffRole>): StaffRole[] {
  const set = new Set<StaffRole>();
  for (const r of roles) set.add(r);
  return [...set].sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]);
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * rankTopics：对聚合主题列表按频次降序排序。
 *
 * 口径（三级确定性排序，与 deptKnowledgeAggregator 的排序哲学一致）：
 *  - 主排序键 totalCount 降序（高频决策靠前）；
 *  - 次数相同则 staffCount 降序（参与员工多、共识度高者优先）；
 *  - 仍相同则 topic 字典序升序，保证排序结果确定、可单测。
 *
 * 纯函数：返回排序后的新数组，不修改入参数组。
 *
 * @param topics 待排序聚合主题（只读视图）
 * @returns 排序后的新主题数组
 */
export function rankTopics(
  topics: readonly AggregatedMuseTopic[],
): AggregatedMuseTopic[] {
  return [...topics].sort((a, b) => {
    if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
    if (b.staffCount !== a.staffCount) return b.staffCount - a.staffCount;
    return a.topic.localeCompare(b.topic);
  });
}

/**
 * aggregateTopics：在单一分桶内，按 topic 合并员工经验。
 *
 * 合并口径：
 *  - totalCount = Σ decisionCount（跨员工累加）；
 *  - staffCount = 按 staffId 去重的员工数；
 *  - roles = 去重并按 doctor→nurse→pharmacist 排序的角色覆盖；
 *  - content = 取该桶内 decisionCount 最高员工的正文（最具代表性）；
 *  - avgSuccessRate = 按 decisionCount 加权的有效率均值，保留 4 位小数；
 *  - lesson = 透传入参桶标记（成功桶 false / 教训桶 true）。
 *
 * 纯函数：不修改入参数组，返回全新对象数组。
 *
 * @param entries 同一分桶（成功 or 失败）的员工经验行
 * @param lesson 该桶是否为「教训」桶
 * @returns 按 topic 合并后的聚合主题列表（未排序）
 */
export function aggregateTopics(
  entries: readonly StaffMuseEntry[],
  lesson: boolean,
): AggregatedMuseTopic[] {
  const groups = new Map<string, AggregatedMuseTopic>();

  for (const e of entries) {
    const topic = (e.topic ?? '').trim();
    if (!topic) continue;

    const count = Math.max(0, Number(e.decisionCount) || 0);
    const rate = Math.min(1, Math.max(0, Number(e.successRate) || 0));
    const role = e.role in ROLE_ORDER ? e.role : 'doctor';

    const existing = groups.get(topic);
    if (!existing) {
      groups.set(topic, {
        topic,
        content: e.content ?? '',
        totalCount: count,
        staffCount: 1,
        roles: [role],
        lesson,
        avgSuccessRate: rate,
      });
      continue;
    }

    existing.totalCount += count;
    existing.staffCount += 1;
    existing.roles = dedupRoles([...existing.roles, role]);
    // 加权成功率：(旧率 × 旧次数 + 本次率 × 本次次数) / 新次数
    const prevWeighted = existing.avgSuccessRate * (existing.totalCount - count);
    existing.avgSuccessRate = Math.round(
      ((prevWeighted + rate * count) / existing.totalCount) * 10000,
    ) / 10000;
  }

  // 代表性正文二次校正：取本桶内单员工 decisionCount 最大者的写法
  for (const e of entries) {
    const topic = (e.topic ?? '').trim();
    const g = groups.get(topic);
    if (!g) continue;
    const count = Math.max(0, Number(e.decisionCount) || 0);
    const best = g as AggregatedMuseTopic & { _bestCount?: number };
    if ((best._bestCount ?? -1) < count) {
      best._bestCount = count;
      g.content = e.content ?? '';
    }
  }
  for (const g of groups.values()) {
    delete (g as AggregatedMuseTopic & { _bestCount?: number })._bestCount;
  }

  return [...groups.values()];
}

/**
 * buildDeptMuse：科室经验聚合总入口（依据宪法第七章 7.2 / 7.7 / 7.8）。
 *
 * 流程：
 *  1. 按 deptCode 过滤 allStaffMuses（防御性：只消费本科室数据）；
 *  2. 成功经验（isFailure=false）与失败经验（isFailure=true）分桶；
 *  3. 两桶分别 aggregateTopics 合并 → rankTopics 按频次降序 → 截 TOP N；
 *  4. 构建 deptBaseline（员工数 / 角色覆盖 / 累计次数 / 基线主题）；
 *  5. 构建 newHireStartingPoint：自动挂载科室基线 + 必读教训 +
 *     推荐上手决策（新员工入职即加载，7.8 后继者机制）。
 *
 * 纯函数：不修改入参，空科室/空经验均返回结构完整的零值结果，
 * 绝不抛异常（聚合口径见 7.7「不评判对错，只记录事实」）。
 *
 * @param deptCode 科室编码
 * @param allStaffMuses 全院 Personal Agent 已沉淀的决策经验行
 * @param options 上榜条数上限（maxDecisions / maxFailures）
 * @returns 科室基线、高频决策、教训榜与新员工起点四件套
 */
export function buildDeptMuse(
  deptCode: string,
  allStaffMuses: readonly StaffMuseEntry[],
  options?: BuildDeptMuseOptions,
): DeptMuse {
  const code = (deptCode ?? '').trim();
  const muses = (allStaffMuses ?? []).filter(
    (e) => (e?.deptCode ?? '').trim() === code,
  );

  const maxDecisions = options?.maxDecisions ?? DEFAULT_MAX_DECISIONS;
  const maxFailures = options?.maxFailures ?? DEFAULT_MAX_FAILURES;

  /* 成功 / 失败分桶（7.7：失败经验单独成桶） */
  const successEntries = muses.filter((e) => !e.isFailure);
  const failureEntries = muses.filter((e) => e.isFailure);

  const topDecisions = rankTopics(aggregateTopics(successEntries, false)).slice(
    0,
    Math.max(0, maxDecisions),
  );
  const topFailures = rankTopics(aggregateTopics(failureEntries, true)).slice(
    0,
    Math.max(0, maxFailures),
  );

  /* 科室基线（7.2 科室层沉淀口径） */
  const staffIds = new Set(muses.map((e) => e.staffId));
  const deptBaseline: DeptBaseline = {
    deptCode: code,
    staffSize: staffIds.size,
    roleCoverage: dedupRoles(muses.map((e) => (e.role in ROLE_ORDER ? e.role : 'doctor'))),
    totalEntries: muses.length,
    totalDecisionCount: muses.reduce(
      (sum, e) => sum + Math.max(0, Number(e.decisionCount) || 0),
      0,
    ),
    baselineTopics: topDecisions.map((t) => t.topic),
  };

  /* 新员工起点（7.8 后继者机制：自动加载基线 + 教训 + 推荐决策） */
  const newHireStartingPoint: NewHireStartingPoint = {
    deptCode: code,
    deptBaseline,
    mustKnowLessons: topFailures,
    recommendedDecisions: topDecisions,
  };

  return { deptBaseline, topDecisions, topFailures, newHireStartingPoint };
}
