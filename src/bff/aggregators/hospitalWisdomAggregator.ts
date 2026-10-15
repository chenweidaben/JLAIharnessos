/**
 * 健澜科技 jlmedaios - 全院智慧资产看板 Hospital MUSE 总览（M116-D）
 *
 * 依据宪法第七章「Doctor MUSE / 全角色 Personal Agent」：
 *  - 7.2 组织级智能三级沉淀：员工个人 MUSE → 科室 MUSE → 全院 MUSE；
 *    本聚合器即「全院层」总装：把分散在各科室医生/护士/药师个人智能体
 *    的决策经验、科室知识资产与失败教训，汇总为院长视角的智慧资产看板；
 *  - 7.7 经验记录铁律：失败经验（教训）价值更高，单独成桶、单独计数，
 *    与高频成功经验分桶输出，不混算；
 *  - 7.9 全院知识反哺：按科室横向对比（deptComparison）暴露经验洼地，
 *    按主题检索全院专家（rankExpertsByTopic）支撑跨科会诊与人才调度。
 *
 * 纯函数核心（不触库、无副作用、可直接单测）：
 *  - buildHospitalWisdomDashboard(allStaffMuse, knowledge, lessons)：
 *      全院经验总量 / 教训总量 / 活跃沉淀员工数 / 科室经验横向对比 /
 *      按月增长趋势，五件套一次产出；
 *  - rankExpertsByTopic(topic, allStaffMuse)：
 *      按主题归集全院专家，按决策频次 → 成功率 → 姓名字典序三级排序，
 *      输出确定、可快照。
 *
 * 入参均为 camelCase 结构化行；本聚合器只读不写，空输入一律返回结构完整
 * 的零值结果，绝不抛异常（依据宪法第七章 7.7「只记录事实，不评判对错」）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 全院角色（医生 / 护士 / 药师，与 deptMuse 口径一致） */
export type HospitalStaffRole = 'doctor' | 'nurse' | 'pharmacist';

/**
 * 员工 MUSE 单条决策经验（个人层 Doctor/Nurse/Pharma MUSE 最小沉淀单元）。
 * 由路由层从 medmuse 学习画像 + profile 行装入，本聚合器只读不写。
 */
export interface HospitalStaffMuseEntry {
  /** 员工脱敏主键 */
  staffId: string;
  /** 员工姓名（专家榜展示用；聚合统计不外露明细） */
  staffName: string;
  /** 角色码 */
  role: HospitalStaffRole;
  /** 所属科室编码 */
  deptCode: string;
  /** 科室名称（可空，缺省时回落 deptCode） */
  deptName?: string;
  /** 决策要点主题（跨员工合并主键，如「CAP 经验性抗感染首选」） */
  topic: string;
  /** 经验正文（做法 / 注意事项） */
  content: string;
  /** 该员工做出此决策的累计次数 */
  decisionCount: number;
  /** 是否为失败经验（true → 教训桶，不计入经验总量） */
  isFailure: boolean;
  /** 该决策点有效率 0~1 */
  successRate: number;
  /** 沉淀时间 ISO 串（用于按月增长趋势分桶；可空，空则不进入趋势） */
  createdAt?: string;
}

/** 全院知识资产条目（科室知识沉淀 / 临床路径 / SOP） */
export interface KnowledgeAsset {
  /** 知识条目主键 */
  knowledgeId: string;
  /** 知识标题 */
  title: string;
  /** 归属科室编码（可空，代表全院通用知识） */
  deptCode?: string;
  /** 关联主题（可空） */
  topic?: string;
  /** 沉淀时间 ISO 串（可空） */
  createdAt?: string;
}

/** 全院教训记录（依据 7.7 单独成桶的失败经验台账） */
export interface LessonRecord {
  /** 教训主键 */
  lessonId: string;
  /** 教训主题 */
  topic: string;
  /** 归属科室编码（可空） */
  deptCode?: string;
  /** 沉淀时间 ISO 串（可空） */
  createdAt?: string;
}

/** 科室经验横向对比行 */
export interface DeptComparisonRow {
  /** 科室编码 */
  deptCode: string;
  /** 科室名称 */
  deptName: string;
  /** 活跃沉淀员工数（按 staffId 去重） */
  staffCount: number;
  /** 成功经验决策总量（Σ decisionCount，失败不计入） */
  experienceCount: number;
  /** 知识资产条数 */
  knowledgeCount: number;
  /** 教训条数（7.7 失败经验单独计数） */
  lessonCount: number;
}

/** 按月增长趋势点（period 取 ISO 时间前 7 位 YYYY-MM，字典序即时间序） */
export interface GrowthTrendPoint {
  /** 统计月（YYYY-MM） */
  period: string;
  /** 当月新增成功经验决策次数 */
  experiences: number;
  /** 当月新增知识资产条数 */
  knowledge: number;
  /** 当月新增教训条数 */
  lessons: number;
}

/** buildHospitalWisdomDashboard 总产出 */
export interface HospitalWisdomDashboard {
  /** 全院成功经验决策总量（Σ 非失败行 decisionCount） */
  totalExperiences: number;
  /** 全院教训资产总量（教训台账条数） */
  totalLessons: number;
  /** 活跃沉淀员工数（按 staffId 去重） */
  activeStaff: number;
  /** 科室经验横向对比（按经验总量降序 → 员工数降序 → 科室编码升序） */
  deptComparison: DeptComparisonRow[];
  /** 按月增长趋势（period 升序） */
  growthTrend: GrowthTrendPoint[];
}

/** 专家榜条目（某主题下全院专家画像） */
export interface TopicExpert {
  /** 员工脱敏主键 */
  staffId: string;
  /** 员工姓名 */
  staffName: string;
  /** 所属科室编码 */
  deptCode: string;
  /** 科室名称 */
  deptName: string;
  /** 角色码 */
  role: HospitalStaffRole;
  /** 累计决策次数（该主题下） */
  decisionCount: number;
  /** 按次数加权的有效率 0~1（4 位小数） */
  successRate: number;
}

/* ------------------------------- 常量与工具 ------------------------------- */

/** 安全收敛为非负整数次数 */
function asCount(n: unknown): number {
  const v = Math.floor(Number(n) || 0);
  return v > 0 ? v : 0;
}

/** 安全收敛 0~1 有效率 */
function asRate(n: unknown): number {
  const v = Number(n) || 0;
  return Math.min(1, Math.max(0, v));
}

/** 安全收敛角色码 */
function asRole(r: unknown): HospitalStaffRole {
  return r === 'nurse' || r === 'pharmacist' ? r : 'doctor';
}

/** 取 ISO 时间的统计月前缀（YYYY-MM）；空/非法返回空串（不进趋势） */
function periodOf(iso?: string): string {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4}-\d{2})/);
  return m ? m[1] : '';
}

/** 四舍五入到 4 位小数，避免浮点噪声导致快照不稳定 */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * buildHospitalWisdomDashboard：全院智慧资产总览（依据宪法第七章 7.2 / 7.7 / 7.9）。
 *
 * 流程：
 *  1. 遍历员工经验行：成功经验（isFailure=false）累加进经验总量与按科分桶；
 *     失败经验不进经验总量（7.7 教训单独成桶）；
 *  2. 按 deptCode 归集科室对比行：员工去重数 / 成功经验次数 / 知识条数 / 教训条数；
 *  3. 按统计月（createdAt 前 7 位）归集增长趋势：经验次数 + 知识条数 + 教训条数；
 *  4. 科室对比按 experienceCount → staffCount → deptCode 三级降/升序；
 *     增长趋势按 period 字典序升序（YYYY-MM 字典序即时间序）。
 *
 * 纯函数：不修改入参；任一入参为 null/undefined/空数组均返回结构完整零值，
 * 绝不抛异常。
 *
 * @param allStaffMuse 全院 Personal Agent 决策经验行
 * @param knowledge    全院知识资产条目
 * @param lessons      全院失败教训台账
 * @returns 经验总量 / 教训总量 / 活跃员工 / 科室对比 / 增长趋势五件套
 */
export function buildHospitalWisdomDashboard(
  allStaffMuse: readonly HospitalStaffMuseEntry[] | null | undefined,
  knowledge: readonly KnowledgeAsset[] | null | undefined,
  lessons: readonly LessonRecord[] | null | undefined,
): HospitalWisdomDashboard {
  const staff = allStaffMuse ?? [];
  const knowledges = knowledge ?? [];
  const lessonRows = lessons ?? [];

  /* 科室分桶累积器 */
  interface DeptAcc {
    deptCode: string;
    deptName: string;
    staffIds: Set<string>;
    experienceCount: number;
    knowledgeCount: number;
    lessonCount: number;
  }
  const depts = new Map<string, DeptAcc>();
  const ensureDept = (code: string, name?: string): DeptAcc => {
    const key = code || '__no_dept__';
    let acc = depts.get(key);
    if (!acc) {
      acc = {
        deptCode: key,
        deptName: (name ?? '').trim() || code || '未分科室',
        staffIds: new Set<string>(),
        experienceCount: 0,
        knowledgeCount: 0,
        lessonCount: 0,
      };
      depts.set(key, acc);
    }
    return acc;
  };

  /* 趋势分桶累积器 */
  interface PeriodAcc {
    period: string;
    experiences: number;
    knowledge: number;
    lessons: number;
  }
  const periods = new Map<string, PeriodAcc>();
  const ensurePeriod = (period: string): PeriodAcc => {
    let acc = periods.get(period);
    if (!acc) {
      acc = { period, experiences: 0, knowledge: 0, lessons: 0 };
      periods.set(period, acc);
    }
    return acc;
  };

  /* 1) 员工经验行 */
  const activeStaffSet = new Set<string>();
  let totalExperiences = 0;
  for (const e of staff) {
    if (!e) continue;
    const count = asCount(e.decisionCount);
    const code = (e.deptCode ?? '').trim();
    activeStaffSet.add((e.staffId ?? '').trim() || '__unknown_staff__');

    const acc = ensureDept(code, e.deptName);
    if ((e.staffId ?? '').trim()) acc.staffIds.add((e.staffId ?? '').trim());

    if (!e.isFailure) {
      totalExperiences += count;
      acc.experienceCount += count;
      const period = periodOf(e.createdAt);
      if (period) ensurePeriod(period).experiences += count;
    }
  }

  /* 2) 知识资产 */
  for (const k of knowledges) {
    if (!k) continue;
    const code = (k.deptCode ?? '').trim();
    ensureDept(code).knowledgeCount += 1;
    const period = periodOf(k.createdAt);
    if (period) ensurePeriod(period).knowledge += 1;
  }

  /* 3) 教训台账（7.7 单独成桶计数） */
  for (const l of lessonRows) {
    if (!l) continue;
    const code = (l.deptCode ?? '').trim();
    ensureDept(code).lessonCount += 1;
    const period = periodOf(l.createdAt);
    if (period) ensurePeriod(period).lessons += 1;
  }

  /* 科室对比：经验降序 → 员工数降序 → 编码升序（确定性） */
  const deptComparison: DeptComparisonRow[] = [...depts.values()]
    .map((a) => ({
      deptCode: a.deptCode,
      deptName: a.deptName,
      staffCount: a.staffIds.size,
      experienceCount: a.experienceCount,
      knowledgeCount: a.knowledgeCount,
      lessonCount: a.lessonCount,
    }))
    .sort((x, y) => {
      if (y.experienceCount !== x.experienceCount)
        return y.experienceCount - x.experienceCount;
      if (y.staffCount !== x.staffCount) return y.staffCount - x.staffCount;
      return x.deptCode.localeCompare(y.deptCode);
    });

  /* 增长趋势：period 字典序升序（YYYY-MM 即时间序） */
  const growthTrend: GrowthTrendPoint[] = [...periods.values()].sort((a, b) =>
    a.period.localeCompare(b.period),
  );

  return {
    totalExperiences,
    totalLessons: lessonRows.length,
    activeStaff: activeStaffSet.size,
    deptComparison,
    growthTrend,
  };
}

/**
 * rankExpertsByTopic：按主题归集全院专家（依据宪法第七章 7.9 跨科人才调度）。
 *
 * 口径：
 *  - 只消费 topic 与入参主题（trim 后）一致的成功经验行（失败教训不评专家）；
 *  - 按 staffId 合并：同一员工在该主题下多条经验累加 decisionCount，
 *    successRate 按 decisionCount 加权（4 位小数）；
 *  - 排序三级：decisionCount 降序 → successRate 降序 → staffName 字典序升序，
 *    保证结果确定、可快照；
 *  - staffName / deptName 缺省时回落空串展示，不报错。
 *
 * 纯函数：不修改入参；主题为空或无匹配返回空数组。
 *
 * @param topic        决策要点主题（trim 后精确匹配）
 * @param allStaffMuse 全院 Personal Agent 决策经验行
 * @returns 专家榜（按频次与成功率排序）
 */
export function rankExpertsByTopic(
  topic: string,
  allStaffMuse: readonly HospitalStaffMuseEntry[] | null | undefined,
): TopicExpert[] {
  const wanted = (topic ?? '').trim();
  if (!wanted) return [];

  const staff = allStaffMuse ?? [];
  const experts = new Map<string, TopicExpert & { _w?: number }>();

  for (const e of staff) {
    if (!e || e.isFailure) continue;
    if ((e.topic ?? '').trim() !== wanted) continue;

    const sid = (e.staffId ?? '').trim();
    if (!sid) continue;

    const count = asCount(e.decisionCount);
    const rate = asRate(e.successRate);
    const existing = experts.get(sid);

    if (!existing) {
      experts.set(sid, {
        staffId: sid,
        staffName: (e.staffName ?? '').trim(),
        deptCode: (e.deptCode ?? '').trim(),
        deptName: (e.deptName ?? '').trim() || (e.deptCode ?? '').trim(),
        role: asRole(e.role),
        decisionCount: count,
        successRate: count > 0 ? rate : 0,
        _w: count,
      });
      continue;
    }

    /* 加权成功率：(旧率×旧次数 + 新率×新次数) / 新总次数 */
    const prevWeighted = existing.successRate * (existing._w ?? 0);
    existing.decisionCount += count;
    existing._w = existing.decisionCount;
    existing.successRate =
      existing.decisionCount > 0
        ? round4((prevWeighted + rate * count) / existing.decisionCount)
        : 0;
    /* 科室 / 角色取首个非空（同一员工理论上唯一） */
    if (!existing.deptName && e.deptName) existing.deptName = e.deptName.trim();
  }

  const list: TopicExpert[] = [...experts.values()].map(({ _w, ...rest }) => rest);
  return list.sort((a, b) => {
    if (b.decisionCount !== a.decisionCount) return b.decisionCount - a.decisionCount;
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    return (a.staffName || a.staffId).localeCompare(b.staffName || b.staffId, 'zh-CN');
  });
}
