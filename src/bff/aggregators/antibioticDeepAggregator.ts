/**
 * 健澜科技 jlmedaios — 【临床核心深化】医院抗菌药物管理深化聚合器（M176-B，纯函数）
 *
 * 抗菌药物管理要国家口径：国卫办医发〔2015〕42 号《抗菌药物临床应用指导原则
 * （2015 年版）》。本聚合器把抗菌药物管理从「开方记录」升级为「按国家指标
 * 逐张处方可点评、可统计、可追溯」的闭环体系，四个纯函数各司其职：
 *
 *   - buildDeepAntibioticMgmt：深度抗菌药物管理体系。一次盘点六大管理维度——
 *       ① 分级管理（非限制/限制/特殊使用，特殊使用级会诊审批、不得门诊使用）；
 *       ② 使用率监测（门诊 ≤20% / 住院 ≤60% / I 类切口预防 ≤30%）；
 *       ③ 使用强度（AUD = DDDs/100 人天，国家 ≤40）；
 *       ④ 微生物送检率（治疗性使用前送检 ≥30%，限制级 ≥50%，特殊级 ≥80%）；
 *       ⑤ 合理性评价（适应症/选药/剂量/疗程逐项点评）；
 *       ⑥ 围术期预防用药（切皮前 30~60min 给药，疗程通常 ≤24h、≤48h 封顶）。
 *   - classifyAntibioticLevel：抗菌药物分级。按药品通用名关键词确定性归入
 *       非限制/限制/特殊使用级；命中特殊使用级即触发会诊审批红线。
 *   - calculateAntibioticDDDs：DDDs 计算。逐张处方 消耗量(g) ÷ DDD(g/日)，
 *       汇总总 DDDs、分级分布、分目的分布，并折算 AUD（DDDs/100 人天）。
 *   - evaluateAntibioticRationality：合理性评价。处方 × 患者画像 × 微生物
 *       送检结果三方比对，逐项命中「无指征/超量/超疗程/时机不当/未送检/
 *       过敏冲突/妊娠禁忌」，输出不合理项明细与扣分，辅助药师点评。
 *
 * 全部无副作用、不触库、不写 SQL，便于单测；本切片仅纯函数 + 路由 + 前端。
 * 医疗安全红线：AI 不自主开抗菌药，特殊使用级未会诊审批不得使用；
 * 合理性评价为辅助判定，最终结论由药师签名后生效。
 * 不触碰 WebSocket；不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 通用类型 ============================== */

/** 抗菌药物分级（国卫办医发〔2015〕42 号三级分类） */
export type AntibioticLevel = 'unrestricted' | 'restricted' | 'special';

/** 使用目的：治疗性 / 预防性（围术期） */
export type AbxPurpose = 'therapeutic' | 'prophylactic';

/** 手术切口分类 */
export type IncisionClass = 'I' | 'II' | 'III';

/** 不合理项严重度：error 硬性不合理 / warn 需关注 */
export type IssueSeverity = 'error' | 'warn';

/* ============================== 0. 体系总览 ============================== */

/** 一个管理维度的国家口径指标 */
export interface AbxDimensionKpi {
  /** 国家口径目标值（人可读，如 "≤20%"） */
  nationalTarget: string;
  /** 指标监控口径说明（分子÷分母怎么算） */
  monitorNote: string;
}

/** 深度抗菌药物管理的一个维度 */
export interface AbxDimension {
  code: string;
  name: string;
  description: string;
  /** 落地动作清单（真管控，不是看板功能） */
  actions: string[];
  kpi: AbxDimensionKpi;
}

/** 深度抗菌药物管理体系总览 */
export interface DeepAntibioticMgmtSystem {
  dimensions: AbxDimension[];
  /** 依据文号 */
  nationalStandard: string;
  /** 一句话价值主张：真把抗菌药管到哪一步 */
  valueStatement: string;
  /** 安全红线（系统不可逾越的边界） */
  guardrails: string[];
}

/* ============================== 1. 分级 ============================== */

/** 分级结果 */
export interface AntibioticLevelResult {
  drugName: string;
  level: AntibioticLevel;
  /** 中文分级名 */
  levelName: string;
  /** 判定命中的关键词 */
  matchedKeyword: string;
  /** 该级别的处方权限与管理要求说明 */
  ruleNote: string;
}

/* ============================== 2. DDDs ============================== */

/** 进入 DDDs 计算的处方快照 */
export interface AbxPrescriptionDose {
  drugName: string;
  /** 周期累计消耗量（g） */
  totalAmountG: number;
  /** 限定日剂量 DDD（g/日） */
  ddd: number;
  /** 分级（缺省由 drugName 推导） */
  level?: AntibioticLevel;
  /** 使用目的 */
  purpose?: AbxPurpose;
  /** 同期患者人天数（任一处方携带即可，取最大值折算 AUD） */
  patientDays?: number;
}

/** 单药 DDDs 明细 */
export interface AbxDddsItem {
  drugName: string;
  totalAmountG: number;
  ddd: number;
  /** 该药 DDDs（= 消耗量 / DDD，保留 2 位小数） */
  ddds: number;
  level: AntibioticLevel;
}

/** DDDs 聚合结果 */
export interface AntibioticDddsSummary {
  /** 总 DDDs（保留 2 位小数） */
  totalDdds: number;
  /** 分级别 DDDs */
  byLevel: Record<AntibioticLevel, number>;
  /** 分目的 DDDs（治疗性/预防性） */
  byPurpose: Record<AbxPurpose, number>;
  /** 使用强度 AUD = DDDs / 同期人天 × 100（无人天则为 0） */
  aud: number;
  /** 同期患者人天数（用于 AUD） */
  patientDays: number;
  items: AbxDddsItem[];
  note: string;
}

/* ============================== 3. 合理性评价 ============================== */

/** 处方快照（进入合理性评价的最小字段集） */
export interface RationalityPrescription {
  drugName: string;
  /** 分级（缺省由 drugName 推导） */
  level?: AntibioticLevel;
  /** 有无明确适应症 */
  hasIndication: boolean;
  /** 单日剂量（mg/日） */
  dailyDoseMg: number;
  /** 说明书推荐单日剂量上限（mg/日） */
  recommendedDoseMg: number;
  /** 疗程（天） */
  durationDays: number;
  purpose: AbxPurpose;
  /** 特殊使用级是否已经过会诊审批 */
  specialApproved?: boolean;
  // —— 围术期预防用药字段 ——
  incisionClass?: IncisionClass;
  /** 切皮前给药距切皮分钟数（30~60 为合理窗） */
  timingMinutes?: number;
  /** 预防用药疗程（小时），通常 ≤24h，≤48h 封顶 */
  prophylaxisDurationHours?: number;
}

/** 患者画像快照 */
export interface RationalityPatient {
  age: number;
  /** 是否妊娠/哺乳 */
  pregnant?: boolean;
  /** 是否肾功能不全 */
  renalImpairment?: boolean;
  /** 已知过敏史（药品/成分名，小写匹配） */
  allergies: string[];
}

/** 微生物送检快照 */
export interface RationalityCulture {
  /** 是否治疗性使用（预防性使用不要求送检） */
  therapeutic: boolean;
  /** 使用前是否已送微生物培养 */
  cultureSent: boolean;
  /** 培养结果 */
  result?: 'none' | 'pending' | 'positive' | 'negative' | null;
}

/** 单条不合理项 */
export interface RationalityIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
}

/** 合理性评价结果 */
export interface RationalityResult {
  /** 是否合理（无 error 级问题即合理；warn 不阻断但须记录） */
  rational: boolean;
  /** 百分制得分（100 起，error -15 / warn -5，封底 0） */
  score: number;
  issues: RationalityIssue[];
  summary: string;
  /** 国家口径依据 */
  standard: string;
}

/* ============================== 内置规则常量 ============================== */

/** 特殊使用级药品关键词（命中即须会诊审批、不得门诊使用） */
const SPECIAL_KEYWORDS = [
  '亚胺培南', '美罗培南', '比阿培南', '帕尼培南', '厄他培南',
  '万古霉素', '去甲万古', '替考拉宁', '利奈唑胺', '达托霉素',
  '头孢吡肟', '头孢洛林', '头孢他啶阿维巴坦',
  '两性霉素', '卡泊芬净', '米卡芬净', '伏立康唑', '泊沙康唑',
];

/** 限制使用级药品关键词（命中即须主治医师以上授权） */
const RESTRICTED_KEYWORDS = [
  '头孢曲松', '头孢噻肟', '头孢他啶', '头孢哌酮', '头孢地尼', '头孢克肟',
  '头孢唑肟', '头孢西丁', '头孢美唑', '头孢米诺',
  '左氧氟沙星', '莫西沙星', '加替沙星', '环丙沙星',
  '阿米卡星', '依替米星', '奈替米星',
  '氟康唑', '伊曲康唑', '奥硝唑',
  '哌拉西林他唑巴坦', '阿莫西林克拉维酸', '氨曲南', '舒巴坦',
];

/** 妊娠/哺乳禁忌抗菌药（命中且患者妊娠 → error） */
const PREGNANCY_ABX_KEYWORDS = [
  '四环素', '多西环素', '喹诺酮', '左氧氟沙星', '莫西沙星', '环丙沙星',
  '阿米卡星', '依替米星', '万古霉素', '氨基糖苷',
];

/** 肾功能不全需调整剂量抗菌药（命中且患者肾损 → warn） */
const RENAL_ABX_KEYWORDS = [
  '氨基糖苷', '阿米卡星', '依替米星', '万古霉素', '去甲万古',
  '头孢他啶', '亚胺培南', '美罗培南',
];

/** 分级中文名 */
const LEVEL_NAME: Record<AntibioticLevel, string> = {
  unrestricted: '非限制使用级',
  restricted: '限制使用级',
  special: '特殊使用级',
};

/** 各级别处方权限说明 */
const LEVEL_RULE: Record<AntibioticLevel, string> = {
  unrestricted: '住院医师及以上可直接开具，按适应症常规使用',
  restricted: '须主治医师以上职称（或专项授权）方可开具，门诊/住院按规定使用',
  special: '须会诊审批并电子签名后使用，不得在门诊开具，病原学送检率要求 ≥80%',
};

/** 国家口径文号 */
const NATIONAL_STANDARD = '国卫办医发〔2015〕42号《抗菌药物临床应用指导原则（2015年版）》';

/* ============================== 工具函数 ============================== */

/** 取整到 2 位小数 */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ============================== 0. 深度抗菌药物管理体系 ============================== */

/**
 * buildDeepAntibioticMgmt：盘点抗菌药物管理六大维度。
 * 每个维度的 KPI 都挂国家口径目标值与监控口径——不是展示多少块屏，
 * 而是门诊使用率、住院使用率、AUD、送检率、合理率逐项对标国家红线。
 */
export function buildDeepAntibioticMgmt(): DeepAntibioticMgmtSystem {
  const dimensions: AbxDimension[] = [
    {
      code: 'classification',
      name: '分级管理',
      description: '非限制/限制/特殊使用三级目录，医师处方授权与药品级别严格匹配',
      actions: [
        '分级目录：药品按通用名归入非限制/限制/特殊使用三级，动态维护',
        '处方授权：住院医师=非限制、主治=限制、主任=特殊使用，越权开方即拦截',
        '特殊使用级：须会诊审批+电子签名后生成医嘱，不得门诊开具',
        '处方权动态管理：考核不合格医师暂停限制/特殊使用级处方权',
      ],
      kpi: {
        nationalTarget: '特殊使用级门诊使用 = 0',
        monitorNote: '特殊使用级处方中门诊处方数 ÷ 全部特殊使用级处方数（红线值应为 0）',
      },
    },
    {
      code: 'utilization_rate',
      name: '使用率监测',
      description: '门诊/住院/手术预防三条线的抗菌药物使用率，逐项对标国家上限',
      actions: [
        '门诊使用率：按日统计门诊抗菌药处方占比，超 20% 即黄色预警',
        '住院使用率：住院患者中使用抗菌药者占比，超 60% 即红色预警',
        'I 类切口预防用药率：清洁切口预防用药占比，超 30% 须专项点评',
        '按科室下钻：超标的科室自动推送药事管理委员会限期整改',
      ],
      kpi: {
        nationalTarget: '门诊 ≤20% · 住院 ≤60% · I类切口预防 ≤30%',
        monitorNote: '门诊(住院/手术)抗菌药处方数 ÷ 同期门诊(住院/手术)总处方数',
      },
    },
    {
      code: 'intensity',
      name: '使用强度（AUD）',
      description: 'DDDs/100 人天衡量抗菌药总使用强度，防止「人人都用一点」的隐性超标',
      actions: [
        'DDDs 归集：每张抗菌药处方 消耗量(g)÷DDD(g/日)，按日滚动汇总',
        'AUD 折算：总 DDDs ÷ 同期收治患者人天 ×100，全院/科室两级展示',
        '强度超标：科室 AUD >40 时，自动提示「缩短疗程/降级选药/减少联用」',
        '排名通报：各科室 AUD 月度排名公示，纳入科室绩效考核',
      ],
      kpi: {
        nationalTarget: 'AUD ≤ 40 DDDs/100人天',
        monitorNote: '同期抗菌药总 DDDs ÷ 同期收治患者人天数 × 100',
      },
    },
    {
      code: 'culture_rate',
      name: '微生物送检率',
      description: '治疗性使用前必须送检，依据培养结果目标治疗，减少经验性广覆盖',
      actions: [
        '治疗性送检：开治疗性抗菌药前强制留取培养标本，未送检开方即软拦截',
        '分级送检率：限制使用级治疗送检 ≥50%、特殊使用级 ≥80%，逐月达标通报',
        '结果回链：培养阳性后自动提示降阶梯治疗（广覆盖 → 窄谱目标药）',
        '未送检清单：按周列出治疗性未送检处方，药师逐张点评反馈',
      ],
      kpi: {
        nationalTarget: '治疗性送检 ≥30% · 限制级 ≥50% · 特殊级 ≥80%',
        monitorNote: '治疗性使用前已送检例数 ÷ 同期治疗性使用总例数（按分级分层）',
      },
    },
    {
      code: 'rationality',
      name: '合理性评价',
      description: '适应症/选药/剂量/疗程四维逐张点评，不合理处方退回修改并留痕',
      actions: [
        '适应症点评：无指征用药一律判不合理，退回医生补充诊断',
        '剂量点评：单日剂量超说明书上限 2 倍即超量警示',
        '疗程点评：治疗性用药 >14 天须说明理由，围术期预防 >48h 判不合理',
        '选药点评：I 类切口首选一/二代头孢，越线选药自动提示降级',
      ],
      kpi: {
        nationalTarget: '处方合理率 ≥80%（专项整治逐年提升）',
        monitorNote: '点评合理处方数 ÷ 同期抽样点评处方总数',
      },
    },
    {
      code: 'perioperative',
      name: '围术期预防用药',
      description: '切皮前 30~60 分钟给药、疗程通常 ≤24h 必要时 ≤48h，杜绝「术后连输三天」',
      actions: [
        '时机管控：切皮前 0.5~1h 给药，剖宫产断脐后给药，时间窗外给药记点评',
        '疗程管控：预防用药通常 24h 内停药，延长至 48h 须有明确病程记录',
        '选药管控：I 类切口首选一/二代头孢，喹诺酮不作为围术期预防用药',
        '专项点评：每月抽查 I/II 类切口病历，时机/疗程/选药三项合格率通报',
      ],
      kpi: {
        nationalTarget: '预防用药时机合理率 ≥90% · 疗程合格率 ≥90%',
        monitorNote: '时机(疗程)合格的 I 类切口预防用药例数 ÷ 同期 I 类切口预防用药总数',
      },
    },
  ];

  return {
    dimensions,
    nationalStandard: NATIONAL_STANDARD,
    valueStatement:
      '六大维度把抗菌药从「事后统计」变成「开方即分级、用药即算强度、治疗前必送检、' +
      '每张处方可点评」——门诊 ≤20%、住院 ≤60%、AUD ≤40、治疗送检 ≥30% 全部按国家口径可复算。',
    guardrails: [
      'AI 不自主开具抗菌药物，特殊使用级须会诊审批+电子签名后才生成医嘱',
      '特殊使用级不得在门诊使用，越权开方系统级拦截',
      '治疗性使用未送微生物培养即开方，软拦截并记录纳入送检率考核',
      '合理性评价为辅助判定，最终结论由药师签名后生效，点评留痕可追溯',
    ],
  };
}

/* ============================== 1. 抗菌药物分级 ============================== */

/**
 * classifyAntibioticLevel：抗菌药物分级。
 * @param drug 药品名（字符串）或带显式级别的药品对象；显式级别优先，否则按通用名关键词确定性判定。
 *
 * 判定顺序：特殊使用级 → 限制使用级 → 非限制使用级（兜底）。
 */
export function classifyAntibioticLevel(
  drug: string | { drugName: string; level?: AntibioticLevel },
): AntibioticLevelResult {
  const name = typeof drug === 'string' ? drug : (drug?.drugName ?? '');
  const explicit = typeof drug === 'object' ? drug?.level : undefined;

  // 显式级别优先（已在分级目录中维护的药品）
  if (explicit && (explicit === 'unrestricted' || explicit === 'restricted' || explicit === 'special')) {
    return {
      drugName: name,
      level: explicit,
      levelName: LEVEL_NAME[explicit],
      matchedKeyword: '目录显式标注',
      ruleNote: LEVEL_RULE[explicit],
    };
  }

  const lower = name ?? '';
  // ① 特殊使用级
  for (const kw of SPECIAL_KEYWORDS) {
    if (lower.includes(kw)) {
      return {
        drugName: name,
        level: 'special',
        levelName: LEVEL_NAME.special,
        matchedKeyword: kw,
        ruleNote: LEVEL_RULE.special,
      };
    }
  }
  // ② 限制使用级
  for (const kw of RESTRICTED_KEYWORDS) {
    if (lower.includes(kw)) {
      return {
        drugName: name,
        level: 'restricted',
        levelName: LEVEL_NAME.restricted,
        matchedKeyword: kw,
        ruleNote: LEVEL_RULE.restricted,
      };
    }
  }
  // ③ 非限制使用级（兜底：常见一线口服/一线注射抗菌药默认归入）
  return {
    drugName: name,
    level: 'unrestricted',
    levelName: LEVEL_NAME.unrestricted,
    matchedKeyword: '未命中特殊/限制关键词，按非限制使用级兜底',
    ruleNote: LEVEL_RULE.unrestricted,
  };
}

/* ============================== 2. DDDs 计算 ============================== */

/**
 * calculateAntibioticDDDs：DDDs 计算。
 * 逐张处方 DDDs = 周期消耗量(g) ÷ DDD(g/日)；汇总总 DDDs、分级/分目的分布，
 * 并在携带患者人天时折算使用强度 AUD（DDDs/100 人天，国家 ≤40）。
 *
 * 任何处方 totalAmountG≤0 或 ddd≤0 时该药 DDDs 记 0，不抛错。
 */
export function calculateAntibioticDDDs(
  prescriptions: AbxPrescriptionDose[],
): AntibioticDddsSummary {
  const list = Array.isArray(prescriptions) ? prescriptions : [];
  const items: AbxDddsItem[] = [];
  let totalDdds = 0;
  let patientDays = 0;

  const byLevel: Record<AntibioticLevel, number> = {
    unrestricted: 0, restricted: 0, special: 0,
  };
  const byPurpose: Record<AbxPurpose, number> = {
    therapeutic: 0, prophylactic: 0,
  };

  for (const rx of list) {
    const amount = Number(rx?.totalAmountG) || 0;
    const ddd = Number(rx?.ddd) || 0;
    const ddds = ddd > 0 ? r2(amount / ddd) : 0;
    const level = rx?.level ?? classifyAntibioticLevel(rx?.drugName ?? '').level;
    const purpose = rx?.purpose ?? 'therapeutic';

    items.push({ drugName: rx?.drugName ?? '', totalAmountG: amount, ddd, ddds, level });
    totalDdds = r2(totalDdds + ddds);
    byLevel[level] = r2((byLevel[level] ?? 0) + ddds);
    byPurpose[purpose] = r2((byPurpose[purpose] ?? 0) + ddds);
    if (Number(rx?.patientDays) > patientDays) {
      patientDays = Number(rx.patientDays);
    }
  }

  const aud = patientDays > 0 ? r2((totalDdds / patientDays) * 100) : 0;
  const audit =
    patientDays > 0
      ? `；同期患者 ${patientDays} 人天，使用强度 AUD = ${aud} DDDs/100人天（国家 ≤40）`
      : '；未提供患者人天，AUD 暂不折算';

  return {
    totalDdds,
    byLevel,
    byPurpose,
    aud,
    patientDays,
    items,
    note: `共 ${list.length} 张抗菌药处方，总 DDDs = ${totalDdds}（治疗性 ${byPurpose.therapeutic} / 预防性 ${byPurpose.prophylactic}）` + audit,
  };
}

/* ============================== 3. 合理性评价 ============================== */

/**
 * evaluateAntibioticRationality：合理性评价。
 * 处方（适应症/分级/剂量/疗程/围术期时机）× 患者画像（妊娠/肾损/过敏）×
 * 微生物送检（治疗性使用前是否送检）三方比对，逐项命中不合理项；
 * 无 error 级问题即判合理，warn 级问题记录但不阻断。
 */
export function evaluateAntibioticRationality(
  prescription: RationalityPrescription,
  patient: RationalityPatient,
  culture: RationalityCulture,
): RationalityResult {
  const issues: RationalityIssue[] = [];
  const rx = prescription ?? ({} as RationalityPrescription);
  const p = patient ?? ({} as RationalityPatient);
  const c = culture ?? ({} as RationalityCulture);

  const drugName = rx.drugName ?? '';
  const level = rx.level ?? classifyAntibioticLevel(drugName).level;
  const allergies = (p.allergies ?? []).map((a) => (a ?? '').toLowerCase());

  // ① 适应症：无指征用药 = 不合理核心项
  if (!rx.hasIndication) {
    issues.push({
      code: 'no_indication',
      severity: 'error',
      message: '无明确用药指征（诊断未记录感染证据），建议补充诊断或停用',
    });
  }

  // ② 特殊使用级：未会诊审批不得使用（红线）
  if (level === 'special' && rx.specialApproved !== true) {
    issues.push({
      code: 'special_without_approval',
      severity: 'error',
      message: '特殊使用级抗菌药未经会诊审批，按国家规定不得使用',
    });
  }

  // ③ 剂量：单日剂量超说明书推荐上限 2 倍即超量
  const dose = Number(rx.dailyDoseMg) || 0;
  const recommended = Number(rx.recommendedDoseMg) || 0;
  if (recommended > 0 && dose > recommended * 2) {
    issues.push({
      code: 'overdose',
      severity: 'error',
      message: `单日剂量 ${dose}mg 超说明书上限（${recommended}mg/日）2 倍以上，请核剂量`,
    });
  }

  // ④ 疗程：治疗性用药 >14 天须说明理由
  const duration = Number(rx.durationDays) || 0;
  if (rx.purpose === 'therapeutic' && duration > 14) {
    issues.push({
      code: 'over_duration',
      severity: 'warn',
      message: `治疗性用药已 ${duration} 天（>14 天），请复核是否降阶梯或停药`,
    });
  }

  // ⑤ 围术期预防用药：时机窗 30~60 分钟；疗程通常 ≤24h、≤48h 封顶
  if (rx.purpose === 'prophylactic') {
    if (rx.timingMinutes !== undefined && rx.timingMinutes !== null) {
      const t = Number(rx.timingMinutes);
      if (!Number.isNaN(t) && (t < 30 || t > 60)) {
        issues.push({
          code: 'timing_incorrect',
          severity: 'warn',
          message: `切皮前给药距切皮 ${t} 分钟，不在 30~60 分钟合理窗内`,
        });
      }
    }
    const pdh = Number(rx.prophylaxisDurationHours) || 0;
    if (pdh > 48) {
      issues.push({
        code: 'prophylaxis_too_long',
        severity: 'error',
        message: `围术期预防用药 ${pdh}h（>48h），按国口径应在 24h 内停药、48h 封顶`,
      });
    }
  }

  // ⑥ 微生物送检：治疗性使用前未送检（国家治疗性送检率 ≥30% 导向）
  if (c.therapeutic && !c.cultureSent) {
    issues.push({
      code: 'missing_culture',
      severity: 'warn',
      message: '治疗性使用前未送微生物培养，经验性广覆盖宜在留取标本后启动',
    });
  }

  // ⑦ 过敏史冲突：患者过敏药/成分 ⊂ 本品名 → 硬拦截
  for (const allergy of allergies) {
    if (!allergy) continue;
    if (drugName.toLowerCase().includes(allergy)) {
      issues.push({
        code: 'allergy_conflict',
        severity: 'error',
        message: `患者已知过敏「${allergy}」与本品（${drugName}）匹配，必须停药换药`,
      });
      break;
    }
  }

  // ⑧ 妊娠禁忌
  if (p.pregnant && PREGNANCY_ABX_KEYWORDS.some((k) => drugName.includes(k))) {
    issues.push({
      code: 'pregnancy_contraindication',
      severity: 'error',
      message: '妊娠/哺乳患者使用了妊娠禁忌类抗菌药（喹诺酮/氨基糖苷/四环素类），请更换妊娠安全级别药物',
    });
  }

  // ⑨ 肾功能不全剂量警示
  if (p.renalImpairment && RENAL_ABX_KEYWORDS.some((k) => drugName.includes(k))) {
    issues.push({
      code: 'renal_dose_warning',
      severity: 'warn',
      message: '肾功能不全患者使用了肾清除为主的抗菌药，请按 eGFR 调整剂量或延长给药间隔',
    });
  }

  // 评分：100 起，error -15 / warn -5，封底 0
  const deductions =
    issues.filter((i) => i.severity === 'error').length * 15 +
    issues.filter((i) => i.severity === 'warn').length * 5;
  const score = Math.max(0, 100 - deductions);
  const rational = !issues.some((i) => i.severity === 'error');

  return {
    rational,
    score,
    issues,
    summary: rational
      ? `合理性评价通过（${score} 分）：适应症/选药/剂量/疗程符合国卫办医发〔2015〕42号口径`
      : `合理性评价不通过（${score} 分）：${issues.filter((i) => i.severity === 'error').map((i) => i.code).join('、')}`,
    standard: NATIONAL_STANDARD,
  };
}
