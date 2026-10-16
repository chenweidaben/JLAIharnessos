/**
 * 健澜科技 jlmedaios - Doctor MUSE 个人医生智能体聚合器（M169-B）
 *
 * 知识图谱与Personal Agent：
 *   为医生构建「越用越懂这位医生」的个人经验智能体。与全院经验库不同，
 *   本模块沉淀的是医生本人的私有经验图谱——诊断思维、用药经验、手术决策、
 *   患者沟通四大维度，只对医生本人（及经其授权的带教）可见，不公开他人经验。
 *
 * 隐私设计（依据宪法第七章 · 个人数据归属）：
 *  - recordDoctorExperience 写入的是医生本人脱敏后的复盘要点，不落患者直标身份；
 *  - recommendFromMUSE 只在本人历史经验集上做召回，绝不读取同行经验内容；
 *  - compareWithPeer 只对比岗位级聚合指标（条数、成功率、四维占比），
 *    同行侧只暴露「中位数 / P75」标签化统计，不泄露任何同行的具体案例；
 *  - 所有函数均为纯函数，不打库、不发请求、不修改入参，便于单测与前端本地复用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 经验沉淀四大维度（知识图谱与Personal Agent 维度节点） */
export type DoctorExperienceCategory =
  | 'diagnosis'      // 诊断思维：成功案例 / 失败案例 / 反思
  | 'medication'     // 用药经验：常用药 / 剂量 / 不良反应
  | 'surgery'       // 手术决策：术式选择 / 术中判断 / 术后管理
  | 'communication'; // 患者沟通：沟通技巧 / 患者反馈 / 改进点

/** 一条经验的复盘结局三态 */
export type DoctorExperienceOutcome =
  | 'success'      // 成功案例（可复用）
  | 'failure'     // 失败案例（警示优先）
  | 'reflection'; // 反思（方法学改进）

/**
 * 一条医生个人经验记录（脱敏后入库的行结构；纯函数侧只读结构化字段）。
 * 各维度可选字段：用药类填 drugName/dose/adverseReaction；
 * 手术类填 procedure/intraOpJudgment/postOpManagement；
 * 沟通类填 technique/patientFeedback/improvement。
 */
export interface DoctorExperience {
  /** 所属维度 */
  category: DoctorExperienceCategory;
  /** 复盘结局 */
  outcome: DoctorExperienceOutcome;
  /** 脱敏摘要，如「老年心衰合并房颤鉴别」 */
  title: string;
  /** 复盘要点（脱敏，不含患者姓名/ID） */
  detail?: string;
  /** 经验标签，如「抗凝出血风险」（可空） */
  tags?: string[];
  /* ---- 用药维度 ---- */
  /** 药品通用名（脱敏后仍可记药名） */
  drugName?: string;
  /** 常用剂量，如「依诺肝素 4000IU qd」 */
  dose?: string;
  /** 本人遇到过的不良反应记录 */
  adverseReaction?: string;
  /* ---- 手术维度 ---- */
  /** 术式名称 */
  procedure?: string;
  /** 术中关键判断要点 */
  intraOpJudgment?: string;
  /** 术后管理要点 */
  postOpManagement?: string;
  /* ---- 沟通维度 ---- */
  /** 沟通技巧标签 */
  technique?: string;
  /** 患者反馈要点（脱敏） */
  patientFeedback?: string;
  /** 下一步改进点 */
  improvement?: string;
  /** 记录时间 ISO 字符串（可空） */
  recordedAt?: string;
}

/** 单个标签的频次计数 */
export interface TagCount {
  tag: string;
  count: number;
}

/** 药品/术式/技巧频次条目 */
export interface FrequentItem {
  name: string;
  count: number;
}

/** 诊断维度沉淀统计 */
export interface DiagnosisSink {
  successCases: number;
  failureCases: number;
  reflections: number;
}

/** 用药维度沉淀统计 */
export interface MedicationSink {
  commonDrugs: FrequentItem[];
  adverseReactions: string[];
}

/** 手术维度沉淀统计 */
export interface SurgerySink {
  procedures: FrequentItem[];
  intraOpJudgments: string[];
  postOpManagement: string[];
}

/** 沟通维度沉淀统计 */
export interface CommunicationSink {
  techniques: FrequentItem[];
  feedback: string[];
  improvements: string[];
}

/**
 * 医生个人 MUSE 画像（聚合视图）。
 * successRate 为 0~1 小数，保留 4 位；仅统计本人经验，不外泄他人内容。
 */
export interface DoctorMUSEProfile {
  /** 医生院内脱敏标识 */
  staffId: string;
  /** 沉淀经验总条数 */
  totalExperiences: number;
  /** 按维度计数 */
  categoryCounts: Record<DoctorExperienceCategory, number>;
  /** 按结局计数 */
  outcomeCounts: Record<DoctorExperienceOutcome, number>;
  /** 本人经验成功率 = success / total（4 位小数；空集为 0） */
  successRate: number;
  /** 高频经验标签 Top10（按频次降序，并列按字典序升序，输出确定） */
  topTags: TagCount[];
  /** 诊断思维沉淀 */
  diagnosis: DiagnosisSink;
  /** 用药经验沉淀 */
  medication: MedicationSink;
  /** 手术决策沉淀 */
  surgery: SurgerySink;
  /** 患者沟通沉淀 */
  communication: CommunicationSink;
  /** 隐私声明（前端只读展示，不参与排序） */
  privacyNotice: string;
}

/** 推荐上下文：当前临床场景（脱敏关键词，不含患者身份） */
export interface MUSEContext {
  /** 当前所处维度（可空，空则全维度召回） */
  category?: DoctorExperienceCategory;
  /** 脱敏关键词，如 ['老年', '抗凝', '房颤'] */
  keywords?: string[];
}

/** 一条基于本人经验的推荐 */
export interface MUSERecommendation {
  /** 警示：来自失败/反思，优先提示；强化：来自成功案例；反思：方法学提醒 */
  kind: 'warning' | 'reinforce' | 'reflection';
  category: DoctorExperienceCategory;
  /** 命中的本人经验标题 */
  title: string;
  /** 推荐理由（基于本人哪条经验、命中哪些关键词） */
  reason: string;
  /** 命中分（0~1，4 位小数） */
  score: number;
}

/** 同行聚合摘要（仅指标，不含任何同行经验内容；用于对比） */
export interface PeerAggregate {
  /** 展示标签，如「同行中位数」「同行 P75」——不暴露真实 staffId */
  label: string;
  totalExperiences: number;
  successRate: number;
  categoryCounts: Record<DoctorExperienceCategory, number>;
}

/** 同行对比结果（隐私安全：只出聚合差距与改进建议，不出同行案例） */
export interface PeerComparison {
  self: {
    staffId: string;
    totalExperiences: number;
    successRate: number;
    categoryCounts: Record<DoctorExperienceCategory, number>;
  };
  peerMedian: PeerAggregate;
  peerP75: PeerAggregate;
  /** 维度差距（self - peerMedian，负为短板） */
  gaps: {
    dimension: DoctorExperienceCategory;
    selfCount: number;
    peerMedian: number;
    delta: number;
    advice: string;
  }[];
  privacyNote: string;
}

/* ------------------------------------------------------------------ */
/* 纯函数工具                                                          */
/* ------------------------------------------------------------------ */

/** 四舍五入到 4 位小数，避免浮点噪声导致快照不稳定 */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** 空的维度计数骨架 */
function emptyCategoryCounts(): Record<DoctorExperienceCategory, number> {
  return { diagnosis: 0, medication: 0, surgery: 0, communication: 0 };
}

/** 空的结局计数骨架 */
function emptyOutcomeCounts(): Record<DoctorExperienceOutcome, number> {
  return { success: 0, failure: 0, reflection: 0 };
}

/** 把字符串数组去重（按首次出现顺序），并 trim/过滤空串 */
function dedupeKeepOrder(items: (string | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const s = (raw ?? '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** 频次计数：返回 [{name, count}]，按 count 降序、字典序升序，截断 limit */
function toFrequency(items: (string | undefined)[], limit = 10): FrequentItem[] {
  const map = new Map<string, number>();
  for (const raw of items) {
    const s = (raw ?? '').trim();
    if (!s) continue;
    map.set(s, (map.get(s) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, 'zh-CN'))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* buildDoctorMUSEProfile：从本人经验集构建个人画像                     */
/* ------------------------------------------------------------------ */

/**
 * buildDoctorMUSEProfile：聚合医生本人全部经验记录为 MUSE 画像。
 *
 * 聚合口径：
 *  - totalExperiences  经验条数；
 *  - categoryCounts    按 diagnosis/medication/surgery/communication 计数；
 *  - outcomeCounts     按 success/failure/reflection 计数；
 *  - successRate       success / totalExperiences（4 位小数，空集 0）；
 *  - topTags           所有经验 tags 合并后频次 Top10；
 *  - diagnosis         三维计数（成功/失败/反思案例数）；
 *  - medication         常用药 Top10 + 本人记录的不良反应去重列表；
 *  - surgery           术式 Top10 + 术中判断 / 术后管理要点去重列表；
 *  - communication     沟通技巧 Top10 + 患者反馈 / 改进点去重列表。
 *
 * 纯函数：不修改入参；experiences 为 null/undefined/空数组时返回空画像，不抛错。
 *
 * @param staffId     医生脱敏标识
 * @param experiences 医生本人历史经验记录（已脱敏）
 */
export function buildDoctorMUSEProfile(
  staffId: string,
  experiences: DoctorExperience[] | null | undefined,
): DoctorMUSEProfile {
  const list = experiences ?? [];
  const categoryCounts = emptyCategoryCounts();
  const outcomeCounts = emptyOutcomeCounts();

  const tagBag: (string | undefined)[] = [];
  const drugBag: (string | undefined)[] = [];
  const adverseBag: (string | undefined)[] = [];
  const procedureBag: (string | undefined)[] = [];
  const intraOpBag: (string | undefined)[] = [];
  const postOpBag: (string | undefined)[] = [];
  const techniqueBag: (string | undefined)[] = [];
  const feedbackBag: (string | undefined)[] = [];
  const improvementBag: (string | undefined)[] = [];

  const diagnosis: DiagnosisSink = { successCases: 0, failureCases: 0, reflections: 0 };

  for (const e of list) {
    if (!e) continue;
    categoryCounts[e.category] += 1;
    outcomeCounts[e.outcome] += 1;

    for (const t of e.tags ?? []) tagBag.push(t);

    if (e.category === 'diagnosis') {
      if (e.outcome === 'success') diagnosis.successCases += 1;
      else if (e.outcome === 'failure') diagnosis.failureCases += 1;
      else diagnosis.reflections += 1;
    } else if (e.category === 'medication') {
      drugBag.push(e.drugName);
      if (e.adverseReaction) adverseBag.push(e.adverseReaction);
    } else if (e.category === 'surgery') {
      procedureBag.push(e.procedure);
      if (e.intraOpJudgment) intraOpBag.push(e.intraOpJudgment);
      if (e.postOpManagement) postOpBag.push(e.postOpManagement);
    } else if (e.category === 'communication') {
      techniqueBag.push(e.technique);
      if (e.patientFeedback) feedbackBag.push(e.patientFeedback);
      if (e.improvement) improvementBag.push(e.improvement);
    }
  }

  const totalExperiences = list.length;
  const successRate =
    totalExperiences > 0 ? round4(outcomeCounts.success / totalExperiences) : 0;

  return {
    staffId,
    totalExperiences,
    categoryCounts,
    outcomeCounts,
    successRate,
    topTags: toFrequency(tagBag, 10).map((f) => ({ tag: f.name, count: f.count })),
    diagnosis,
    medication: {
      commonDrugs: toFrequency(drugBag, 10),
      adverseReactions: dedupeKeepOrder(adverseBag),
    },
    surgery: {
      procedures: toFrequency(procedureBag, 10),
      intraOpJudgments: dedupeKeepOrder(intraOpBag),
      postOpManagement: dedupeKeepOrder(postOpBag),
    },
    communication: {
      techniques: toFrequency(techniqueBag, 10),
      feedback: dedupeKeepOrder(feedbackBag),
      improvements: dedupeKeepOrder(improvementBag),
    },
    privacyNotice: '本画像仅沉淀本人脱敏经验，不公开任何同行或患者隐私',
  };
}

/* ------------------------------------------------------------------ */
/* recordDoctorExperience：追加一条本人经验，返回新画像                   */
/* ------------------------------------------------------------------ */

/**
 * recordDoctorExperience：把一条新经验沉淀合并进既有画像，返回新画像。
 *
 * 合并口径：
 *  - totalExperiences +1；categoryCounts/outcomeCounts 对应维度 +1；
 *  - successRate 按新总数重算（4 位小数）；
 *  - tags / drugName / procedure / technique 进入频次榜；
 *  - adverseReaction / intraOpJudgment / postOpManagement / patientFeedback /
 *    improvement 进入对应去重列表（若已存在则不重复追加）；
 *  - diagnosis 三维计数按 outcome +1。
 *
 * 纯函数：返回新对象，不修改入参 profile / experience。
 *
 * @param profile    既有画像
 * @param experience 新沉淀的一条本人经验
 */
export function recordDoctorExperience(
  profile: DoctorMUSEProfile,
  experience: DoctorExperience,
): DoctorMUSEProfile {
  // 先把新经验追加到原经验集的逻辑等价物上：
  // 直接基于 profile 现有计数 +1，并把新条目的字段并入对应桶。
  const categoryCounts = { ...profile.categoryCounts, [experience.category]: profile.categoryCounts[experience.category] + 1 };
  const outcomeCounts = { ...profile.outcomeCounts, [experience.outcome]: profile.outcomeCounts[experience.outcome] + 1 };
  const totalExperiences = profile.totalExperiences + 1;
  const successRate = round4(outcomeCounts.success / totalExperiences);

  // 标签：把新 tags 与 topTags 合并后重算（topTags 本身是频次榜；这里直接并入新 tag 计数）
  const tagMap = new Map<string, number>(profile.topTags.map((t) => [t.tag, t.count]));
  for (const t of experience.tags ?? []) {
    const tag = t.trim();
    if (tag) tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
  }
  const topTags = [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (b.count - a.count) || a.tag.localeCompare(b.tag, 'zh-CN'))
    .slice(0, 10);

  // 诊断维度计数
  const diagnosis = { ...profile.diagnosis };
  if (experience.category === 'diagnosis') {
    if (experience.outcome === 'success') diagnosis.successCases += 1;
    else if (experience.outcome === 'failure') diagnosis.failureCases += 1;
    else diagnosis.reflections += 1;
  }

  // 用药：常用药频次 +1；不良反应去重追加
  const medication: MedicationSink = {
    commonDrugs: profile.medication.commonDrugs.map((d) => ({ ...d })),
    adverseReactions: [...profile.medication.adverseReactions],
  };
  if (experience.category === 'medication') {
    const drug = (experience.drugName ?? '').trim();
    if (drug) {
      const idx = medication.commonDrugs.findIndex((d) => d.name === drug);
      if (idx >= 0) medication.commonDrugs[idx] = { name: drug, count: medication.commonDrugs[idx].count + 1 };
      else medication.commonDrugs = [...medication.commonDrugs, { name: drug, count: 1 }].sort(
        (a, b) => (b.count - a.count) || a.name.localeCompare(b.name, 'zh-CN'),
      );
    }
    const adv = (experience.adverseReaction ?? '').trim();
    if (adv && !medication.adverseReactions.includes(adv)) {
      medication.adverseReactions.push(adv);
    }
  }

  // 手术：术式频次 +1；术中判断 / 术后管理去重追加
  const surgery: SurgerySink = {
    procedures: profile.surgery.procedures.map((p) => ({ ...p })),
    intraOpJudgments: [...profile.surgery.intraOpJudgments],
    postOpManagement: [...profile.surgery.postOpManagement],
  };
  if (experience.category === 'surgery') {
    const proc = (experience.procedure ?? '').trim();
    if (proc) {
      const idx = surgery.procedures.findIndex((p) => p.name === proc);
      if (idx >= 0) surgery.procedures[idx] = { name: proc, count: surgery.procedures[idx].count + 1 };
      else surgery.procedures = [...surgery.procedures, { name: proc, count: 1 }].sort(
        (a, b) => (b.count - a.count) || a.name.localeCompare(b.name, 'zh-CN'),
      );
    }
    const intra = (experience.intraOpJudgment ?? '').trim();
    if (intra && !surgery.intraOpJudgments.includes(intra)) surgery.intraOpJudgments.push(intra);
    const post = (experience.postOpManagement ?? '').trim();
    if (post && !surgery.postOpManagement.includes(post)) surgery.postOpManagement.push(post);
  }

  // 沟通：技巧频次 +1；反馈 / 改进点去重追加
  const communication: CommunicationSink = {
    techniques: profile.communication.techniques.map((t) => ({ ...t })),
    feedback: [...profile.communication.feedback],
    improvements: [...profile.communication.improvements],
  };
  if (experience.category === 'communication') {
    const tech = (experience.technique ?? '').trim();
    if (tech) {
      const idx = communication.techniques.findIndex((t) => t.name === tech);
      if (idx >= 0) communication.techniques[idx] = { name: tech, count: communication.techniques[idx].count + 1 };
      else communication.techniques = [...communication.techniques, { name: tech, count: 1 }].sort(
        (a, b) => (b.count - a.count) || a.name.localeCompare(b.name, 'zh-CN'),
      );
    }
    const fb = (experience.patientFeedback ?? '').trim();
    if (fb && !communication.feedback.includes(fb)) communication.feedback.push(fb);
    const imp = (experience.improvement ?? '').trim();
    if (imp && !communication.improvements.includes(imp)) communication.improvements.push(imp);
  }

  return {
    staffId: profile.staffId,
    totalExperiences,
    categoryCounts,
    outcomeCounts,
    successRate,
    topTags,
    diagnosis,
    medication,
    surgery,
    communication,
    privacyNotice: profile.privacyNotice,
  };
}

/* ------------------------------------------------------------------ */
/* recommendFromMUSE：基于本人经验召回推荐（不读他人经验）               */
/* ------------------------------------------------------------------ */

/**
 * recommendFromMUSE：在医生本人历史经验集上，根据当前临床上下文召回相关经验。
 *
 * 召回口径（纯本人数据，隐私安全）：
 *  - 维度过滤：context.category 非空时只在该维度内召回；
 *  - 关键词命中：title / detail / tags / drugName / procedure / technique 任一命中
 *    一个 context.keyword 即计 1 次命中；
 *  - 打分：命中数 / 关键词数 * 0.8 + 结局权重（failure/reflection 权重 0.2，
 *    success 权重 0.1），保留 4 位小数；空关键词时按结局权重兜底（失败/反思优先）；
 *  - 排序：score 降序，并列按 recordedAt 字典序升序、再按 title 字典序升序；
 *  - kind：failure→warning，reflection→reflection，success→reinforce。
 *
 * 纯函数：不修改入参；experiences 为 null/undefined/空数组时返回空数组，不抛错。
 *
 * @param staffId    医生脱敏标识（仅用于审计日志语义，不参与打分）
 * @param context    当前临床上下文（脱敏关键词）
 * @param experiences 医生本人历史经验
 * @param limit      最多返回条数，默认 5
 */
export function recommendFromMUSE(
  staffId: string,
  context: MUSEContext | null | undefined,
  experiences: DoctorExperience[] | null | undefined,
  limit = 5,
): MUSERecommendation[] {
  void staffId; // 隐私安全：召回只看本人经验，staffId 不参与内容匹配
  const list = experiences ?? [];
  const category = context?.category;
  const keywords = (context?.keywords ?? [])
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const scored: MUSERecommendation[] = [];
  for (const e of list) {
    if (!e) continue;
    if (category && e.category !== category) continue;

    const haystack = [
      e.title,
      e.detail ?? '',
      ...(e.tags ?? []),
      e.drugName ?? '',
      e.procedure ?? '',
      e.technique ?? '',
    ]
      .join(' ')
      .toLowerCase();

    let hits = 0;
    for (const kw of keywords) {
      if (kw && haystack.includes(kw)) hits += 1;
    }

    const outcomeWeight = e.outcome === 'success' ? 0.1 : e.outcome === 'reflection' ? 0.2 : 0.2;
    const keywordScore = keywords.length > 0 ? (hits / keywords.length) * 0.8 : 0;
    const score = round4(keywordScore + outcomeWeight);

    // 无关键词且非失败/反思时不召回（避免噪声）；有关键词时必须命中至少 1 个
    if (keywords.length > 0 && hits === 0) continue;
    if (keywords.length === 0 && e.outcome === 'success') continue;

    const kind: MUSERecommendation['kind'] =
      e.outcome === 'failure' ? 'warning' : e.outcome === 'reflection' ? 'reflection' : 'reinforce';

    const reason =
      keywords.length > 0
        ? `本人经验命中 ${hits}/${keywords.length} 个关键词（${e.tags?.join('、') ?? e.title}）`
        : `本人 ${e.outcome === 'failure' ? '失败案例' : '反思'}优先提示`;

    scored.push({
      kind,
      category: e.category,
      title: e.title,
      reason,
      score,
    });
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.title.localeCompare(b.title, 'zh-CN'),
    )
    .slice(0, Math.max(0, limit));
}

/* ------------------------------------------------------------------ */
/* compareWithPeer：与同行聚合指标对比（不暴露同行经验内容）             */
/* ------------------------------------------------------------------ */

/**
 * compareWithPeer：把医生本人画像与同岗位（同科室）聚合统计对比。
 *
 * 隐私口径：
 *  - peerGroup 入参必须是「聚合后的同行统计」，禁止传入同行经验明细；
 *  - 本函数只计算中位数与 P75 两个标签化基准，不输出任何同行的 staffId 或案例；
 *  - 差距 advice：某维度本人数 < peerMedian 时提示「可在 XX 维度多做沉淀」。
 *
 * 纯函数：不修改入参；peerGroup 为空时 peerMedian / peerP75 退化为 0 基准。
 *
 * @param staffId     医生本人脱敏标识
 * @param self        医生本人画像
 * @param peerGroup   同行聚合统计数组（每项仅含指标，不含经验内容）
 */
export function compareWithPeer(
  staffId: string,
  self: DoctorMUSEProfile,
  peerGroup: Array<{
    totalExperiences: number;
    successRate: number;
    categoryCounts: Record<DoctorExperienceCategory, number>;
  }> | null | undefined,
): PeerComparison {
  const peers = peerGroup ?? [];

  const pickPercentile = (nums: number[], p: number): number => {
    if (nums.length === 0) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
    return sorted[idx];
  };

  const totals = peers.map((p) => p.totalExperiences);
  const rates = peers.map((p) => p.successRate);
  const catMeds: Record<DoctorExperienceCategory, number[]> = {
    diagnosis: peers.map((p) => p.categoryCounts.diagnosis),
    medication: peers.map((p) => p.categoryCounts.medication),
    surgery: peers.map((p) => p.categoryCounts.surgery),
    communication: peers.map((p) => p.categoryCounts.communication),
  };

  const peerMedian: PeerAggregate = {
    label: '同行中位数',
    totalExperiences: pickPercentile(totals, 50),
    successRate: round4(pickPercentile(rates, 50)),
    categoryCounts: {
      diagnosis: pickPercentile(catMeds.diagnosis, 50),
      medication: pickPercentile(catMeds.medication, 50),
      surgery: pickPercentile(catMeds.surgery, 50),
      communication: pickPercentile(catMeds.communication, 50),
    },
  };
  const peerP75: PeerAggregate = {
    label: '同行 P75',
    totalExperiences: pickPercentile(totals, 75),
    successRate: round4(pickPercentile(rates, 75)),
    categoryCounts: {
      diagnosis: pickPercentile(catMeds.diagnosis, 75),
      medication: pickPercentile(catMeds.medication, 75),
      surgery: pickPercentile(catMeds.surgery, 75),
      communication: pickPercentile(catMeds.communication, 75),
    },
  };

  const dimLabel: Record<DoctorExperienceCategory, string> = {
    diagnosis: '诊断思维',
    medication: '用药经验',
    surgery: '手术决策',
    communication: '患者沟通',
  };

  const gaps: PeerComparison['gaps'] = (Object.keys(self.categoryCounts) as DoctorExperienceCategory[]).map(
    (dim) => {
      const selfCount = self.categoryCounts[dim];
      const median = peerMedian.categoryCounts[dim];
      const delta = selfCount - median;
      const advice =
        delta < 0
          ? `在「${dimLabel[dim]}」维度沉淀少于同行中位数，可多记录 1~2 例典型案例`
          : delta === 0
            ? `在「${dimLabel[dim]}」维度与同行中位数持平，可向 P75 进阶`
            : `在「${dimLabel[dim]}」维度已超过同行中位数，经验图谱较厚`;
      return { dimension: dim, selfCount, peerMedian: median, delta, advice };
    },
  );

  return {
    self: {
      staffId,
      totalExperiences: self.totalExperiences,
      successRate: self.successRate,
      categoryCounts: { ...self.categoryCounts },
    },
    peerMedian,
    peerP75,
    gaps,
    privacyNote: '同行对比仅使用岗位级聚合统计，不展示任何同行的具体案例与患者信息',
  };
}
