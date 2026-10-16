/**
 * 健澜科技 jlmedaios - 医院人才管理深化聚合器（纯函数）
 *
 * 【绩效与人才】人才管理要发展人，不是监控人：
 *   - buildTalentInventory：按科室汇总人才画像（技能/证书/培训/绩效），
 *     用「绩效 60% + 潜力 40%」折算人才分，把人分成
 *     继任就绪 / 骨干 / 后备 / 普通 四档——目的是看清谁该被培养，
 *     而不是给人贴标签排队挨盯；
 *   - identifySkillGap：把科室岗位所需技能 vs 科室现有技能盘对比，
 *     找出「覆盖面不足」的技能缺口，缺口是培养方向，不是扣分项；
 *   - recommendTraining：针对某人的具体技能缺口，给出培训课程建议
 *     （课程名/学时/优先级），缺口 → 学习路径，发展导向；
 *   - identifySuccessor：关键岗位继任者识别，按「绩效 + 潜力 + 技能匹配」
 *     综合打分，排出 ready / 1-2年 / 3年 三档就绪度，避免关键岗位断层。
 *
 * 本模块全部为无副作用纯函数，不触库、便于单测；
 * 数据库读写由路由层（routes/talentDeep.ts）负责。
 *
 * 医疗安全：本模块为人力资源管理辅助，不影响临床诊疗决策；
 *           绩效与潜力数据仅用于培养与继任规划，禁止用于末位淘汰式监控。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

/** 员工人才画像输入：绩效与人才四维（技能/证书/培训/绩效）+ 潜力 */
export interface StaffProfile {
  /** 员工工号 */
  staffId: string;
  /** 姓名（演示/聚合用，不存 PII 到日志） */
  name: string;
  /** 所属科室编码 */
  dept: string;
  /** 职称：主任医师/副主任医师/主治医师/住院医师/护师/… */
  title: string;
  /** 已掌握技能列表（如 '冠脉介入','重症超声','DRG/DIP 病案'） */
  skills: string[];
  /** 持证列表（如 '执业医师资格证','BLS','PACS 诊断上岗证'） */
  certificates: string[];
  /** 已完成培训列表 */
  completedTrainings: string[];
  /** 近一年综合绩效 0-100 */
  performanceScore: number;
  /** 潜力评估 0-100（360/上级+自评校准后的发展潜力分） */
  potentialScore: number;
  /** 本岗/本院工龄（年） */
  yearsOfService: number;
}

/** 人才梯队档位：发展导向，不是绩效排序 */
export type TalentTier = 'successor_ready' | 'backbone' | 'backup' | 'ordinary';

/** 人才盘点单条目 */
export interface TalentInventoryItem {
  staffId: string;
  name: string;
  title: string;
  tier: TalentTier;
  /** 人才分 = 绩效×0.6 + 潜力×0.4（保留 1 位小数） */
  talentScore: number;
  skillCount: number;
  certificateCount: number;
  trainingCount: number;
}

/** 人才盘点结果 */
export interface TalentInventory {
  dept: string;
  generatedAt: string;
  total: number;
  items: TalentInventoryItem[];
  tiers: Record<TalentTier, number>;
  summary: {
    avgPerformance: number;
    avgPotential: number;
    /** 继任就绪率 = successor_ready / total */
    readinessRate: number;
  };
}

/** 技能缺口条目 */
export interface SkillGap {
  /** 岗位所需技能名 */
  skill: string;
  /** 期望覆盖人数（至少 N 人掌握，避免单点依赖） */
  requiredCoverage: number;
  /** 科室现掌握人数 */
  currentCoverage: number;
  /** 缺口人数 */
  shortage: number;
  /** 严重度：high（0 人掌握）/ medium（不足半数）/ low（接近达标） */
  severity: 'high' | 'medium' | 'low';
}

/** 培训推荐条目 */
export interface TrainingRecommendation {
  skill: string;
  /** 建议课程名（规则库映射） */
  course: string;
  /** 建议学时 */
  hours: number;
  /** 优先级：high / medium / low（与缺口严重度对齐） */
  priority: 'high' | 'medium' | 'low';
}

/** 继任者候选人打分结果 */
export interface SuccessorCandidate {
  staffId: string;
  name: string;
  title: string;
  /** 综合分 = 绩效×0.4 + 潜力×0.4 + 技能匹配率×0.2×100 */
  score: number;
  /** 技能匹配率 0-1（候选人掌握的岗位必备技能占比） */
  skillMatch: number;
  /** 就绪度：ready（可即刻接替）/ one_to_two_year（1-2 年）/ three_plus_year（3 年+） */
  readiness: 'ready' | 'one_to_two_year' | 'three_plus_year';
}

/** 关键岗位输入 */
export interface KeyPosition {
  /** 岗位编码/名，如 '心内科主任' */
  position: string;
  /** 岗位必备技能 */
  requiredSkills: string[];
  /** 候选员工池（通常为同科室或同专业） */
  candidates: StaffProfile[];
  /** 现任者工号（识别继任者时排除本人），可空 */
  incumbentStaffId?: string;
}

/* ============================== 阈值常量 ============================== */

/** 人才分权重：绩效占 60%，潜力占 40%（发展人：潜力与绩效并重） */
export const PERFORMANCE_WEIGHT = 0.6;
export const POTENTIAL_WEIGHT = 0.4;

/** 继任就绪线：人才分 ≥ 85 且工龄 ≥ 5 年 */
export const SUCCESSOR_SCORE_LINE = 85;
export const SUCCESSOR_YEARS_LINE = 5;

/** 骨干线：人才分 ≥ 75 */
export const BACKBONE_SCORE_LINE = 75;

/** 后备线：人才分 ≥ 60 */
export const BACKUP_SCORE_LINE = 60;

/** 技能缺口默认期望覆盖人数（至少 2 人掌握，避免单点依赖） */
export const DEFAULT_REQUIRED_COVERAGE = 2;

/** 培训课程规则库：技能关键字 → 课程映射（零外部数据，纯规则） */
const COURSE_CATALOG: Array<{ match: RegExp; course: string; hours: number }> = [
  { match: /介入|导管|PCI/i, course: '心血管介入诊疗进阶（导管室准入实训）', hours: 40 },
  { match: /重症|ICU|呼吸机/i, course: '重症医学高级生命支持（BLS/ACLS 复训）', hours: 24 },
  { match: /超声|超声心动/i, course: '床旁超声诊断进阶（POCUS  workshop）', hours: 32 },
  { match: /DRG|DIP|病案|医保/i, course: 'DRG/DIP 支付方式改革与病案首页质控', hours: 16 },
  { match: /感控|院感/i, course: '医院感染预防与控制专项培训', hours: 12 },
  { match: /护理|护/i, course: '专科护理岗位胜任力进阶', hours: 20 },
  { match: /科研|论文|课题/i, course: '临床研究方法学与论文写作工作坊', hours: 24 },
  { match: /AI|人工智能|大数据/i, course: '医疗 AI 工具应用与数据素养', hours: 16 },
];

/** 默认课程（技能未命中规则库时兜底） */
const DEFAULT_COURSE = '岗位胜任力通用培训（科室带教 + 在线课程）';
const DEFAULT_HOURS = 16;

/* ============================== 纯函数实现 ============================== */

/** 保留 1 位小数 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 保留 2 位小数 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 折算人才分：绩效×0.6 + 潜力×0.4。
 * 发展人导向：潜力权重不低，避免只看当期绩效错失高潜。
 */
export function talentScoreOf(staff: StaffProfile): number {
  return round1(staff.performanceScore * PERFORMANCE_WEIGHT + staff.potentialScore * POTENTIAL_WEIGHT);
}

/**
 * 由人才分与工龄判定人才梯队档位。
 *
 * 规则：
 *   - successor_ready：人才分 ≥85 且工龄 ≥5（可即刻/近期接任关键岗）；
 *   - backbone：人才分 ≥75（科室骨干，承担带教与二线值班）；
 *   - backup：人才分 ≥60（后备力量，纳入培养计划）；
 *   - ordinary：其余（在岗胜任，按常规发展路径培养）。
 */
export function tierOf(staff: StaffProfile): TalentTier {
  const score = talentScoreOf(staff);
  if (score >= SUCCESSOR_SCORE_LINE && staff.yearsOfService >= SUCCESSOR_YEARS_LINE) {
    return 'successor_ready';
  }
  if (score >= BACKBONE_SCORE_LINE) return 'backbone';
  if (score >= BACKUP_SCORE_LINE) return 'backup';
  return 'ordinary';
}

/**
 * 【绩效与人才】构建科室人才盘点盘。
 *
 * 输入一个科室的员工画像列表，输出按人才分降序的盘点结果，
 * 含四档人数分布与科室级均值（绩效/潜力/继任就绪率）。
 * 这是「发展人」的底子：看清谁是骨干、谁是后备、谁该继任，
 * 而不是把绩效差的人挑出来盯。
 *
 * @param dept 科室员工列表（含 dept 编码字段）
 * @param nowIso 生成时间（可选，便于测试断言；缺省用当前 ISO 时间）
 */
export function buildTalentInventory(
  dept: { dept: string; staff: StaffProfile[] },
  nowIso?: string,
): TalentInventory {
  const items: TalentInventoryItem[] = dept.staff.map((s) => {
    const tier = tierOf(s);
    return {
      staffId: s.staffId,
      name: s.name,
      title: s.title,
      tier,
      talentScore: talentScoreOf(s),
      skillCount: s.skills.length,
      certificateCount: s.certificates.length,
      trainingCount: s.completedTrainings.length,
    };
  });

  // 按人才分降序，高潜在前（发展视角，不是末位淘汰视角）
  items.sort((a, b) => b.talentScore - a.talentScore);

  const tiers: Record<TalentTier, number> = {
    successor_ready: 0,
    backbone: 0,
    backup: 0,
    ordinary: 0,
  };
  for (const it of items) tiers[it.tier] += 1;

  const n = dept.staff.length;
  const avg = (pick: (s: StaffProfile) => number): number =>
    n === 0 ? 0 : round1(dept.staff.reduce((acc, s) => acc + pick(s), 0) / n);

  return {
    dept: dept.dept,
    generatedAt: nowIso ?? new Date().toISOString(),
    total: n,
    items,
    tiers,
    summary: {
      avgPerformance: avg((s) => s.performanceScore),
      avgPotential: avg((s) => s.potentialScore),
      readinessRate: n === 0 ? 0 : round2(tiers.successor_ready / n),
    },
  };
}

/**
 * 【绩效与人才】识别科室技能缺口。
 *
 * 把岗位所需技能 requiredSkills 与科室现有员工技能盘对比：
 *   - 每个技能统计「科室有多少人掌握」currentCoverage；
 *   - 期望至少 DEFAULT_REQUIRED_COVERAGE 人掌握（避免单点依赖）；
 *   - shortage = max(0, requiredCoverage - currentCoverage)；
 *   - 严重度：0 人掌握 = high；不足半数 = medium；接近达标 = low。
 *
 * 缺口是培养方向（下一步送谁去学什么），不是扣分依据。
 *
 * @param dept 科室员工列表
 * @param requiredSkills 岗位/科室所需技能列表
 * @param requiredCoverage 期望每技能覆盖人数（默认 2）
 */
export function identifySkillGap(
  dept: { dept: string; staff: StaffProfile[] },
  requiredSkills: string[],
  requiredCoverage: number = DEFAULT_REQUIRED_COVERAGE,
): SkillGap[] {
  const gaps: SkillGap[] = [];
  for (const skill of requiredSkills) {
    const normalized = skill.trim();
    if (!normalized) continue;
    const currentCoverage = dept.staff.filter((s) =>
      s.skills.some((sk) => sk.toLowerCase() === normalized.toLowerCase()),
    ).length;
    const shortage = Math.max(0, requiredCoverage - currentCoverage);
    let severity: SkillGap['severity'] = 'low';
    if (currentCoverage === 0) severity = 'high';
    else if (currentCoverage < Math.ceil(requiredCoverage / 2)) severity = 'medium';
    gaps.push({ skill: normalized, requiredCoverage, currentCoverage, shortage, severity });
  }
  // 缺口大的排前面（发展优先级）
  gaps.sort((a, b) => b.shortage - a.shortage || (a.severity === 'high' ? -1 : 1));
  return gaps;
}

/**
 * 【绩效与人才】为某员工的技能缺口推荐培训计划。
 *
 * 根据缺口技能名命中课程规则库（介入/重症/超声/DRG/感控/护理/科研/AI…），
 * 未命中走通用课程兜底；优先级与缺口严重度对齐。
 *
 * 发展人导向：给的是「学什么、学多久、多紧急」，不是「谁不行」。
 *
 * @param staffId 员工工号
 * @param gap     单项技能缺口（由 identifySkillGap 产出）
 */
export function recommendTraining(
  staffId: string,
  gap: Pick<SkillGap, 'skill' | 'severity'>,
): TrainingRecommendation {
  const hit = COURSE_CATALOG.find((c) => c.match.test(gap.skill));
  return {
    skill: gap.skill,
    course: hit ? hit.course : DEFAULT_COURSE,
    hours: hit ? hit.hours : DEFAULT_HOURS,
    priority: gap.severity,
  };
}

/**
 * 【绩效与人才】识别关键岗位继任者。
 *
 * 综合分 = 绩效×0.4 + 潜力×0.4 + 技能匹配率×0.2×100：
 *   - 绩效 40%（当期胜任力）
 *   - 潜力 40%（发展空间，发展人核心权重）
 *   - 技能匹配 20%（岗位必备技能掌握度）
 *
 * 就绪度：
 *   - ready：综合分 ≥80 且技能匹配率 ≥0.8（可即刻接任）；
 *   - one_to_two_year：综合分 ≥65（1-2 年培养可接任）；
 *   - three_plus_year：其余（3 年以上成长路径）。
 *
 * 排除现任者本人；返回按综合分降序的候选人列表（取前 3 名），
 * 第一名即推荐继任者。目的是防断层，不是搞末位淘汰。
 */
export function identifySuccessor(keyPosition: KeyPosition): {
  position: string;
  recommended: SuccessorCandidate | null;
  candidates: SuccessorCandidate[];
} {
  const pool = keyPosition.candidates.filter((c) => c.staffId !== keyPosition.incumbentStaffId);
  const needed = keyPosition.requiredSkills.map((s) => s.trim().toLowerCase()).filter(Boolean);

  const scored: SuccessorCandidate[] = pool.map((c) => {
    const owned = new Set(c.skills.map((s) => s.toLowerCase()));
    const match = needed.length === 0 ? 0 : needed.filter((s) => owned.has(s)).length / needed.length;
    const score = round1(
      c.performanceScore * 0.4 + c.potentialScore * 0.4 + match * 100 * 0.2,
    );
    let readiness: SuccessorCandidate['readiness'] = 'three_plus_year';
    if (score >= 80 && match >= 0.8) readiness = 'ready';
    else if (score >= 65) readiness = 'one_to_two_year';
    return {
      staffId: c.staffId,
      name: c.name,
      title: c.title,
      score,
      skillMatch: round2(match),
      readiness,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  return {
    position: keyPosition.position,
    recommended: top.length > 0 ? top[0] : null,
    candidates: top,
  };
}
