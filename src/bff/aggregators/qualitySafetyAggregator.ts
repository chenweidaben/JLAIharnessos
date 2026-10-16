/**
 * 健澜科技 jlmedaios — 【质量与体验】医院质量与安全管理深化聚合器（M180-A，纯函数）
 *
 * 质量管理要国家口径，不能自创。本模块把「填表式质控」升级为「国家指标可算、
 * 差距可定位、改进可落地、迎检可举证」的闭环体系，四个纯函数各司其职：
 *
 *   - buildDeepQualitySafety：深度质量安全体系。一次盘点四大管理维度——
 *       ① 医疗质量：三级公立医院绩效考核国家监测指标、电子病历五级、互联互通四甲；
 *       ② 患者安全：十大安全目标、不良事件上报、根因分析 RCA；
 *       ③ 质量改进：PDCA / 品管圈 QCC / 六西格玛 DMAIC / 精益 Lean；
 *       ④ 评审准备：三甲评审条款、证据链、差距分析、整改跟踪。
 *   - trackQualityIndicator：质量指标跟踪。按科室 × 周期把实测值对照国家达标线，
 *       真算偏差率与红/黄/绿状态；患者安全零容忍项阳性即红线。
 *   - identifyQualityGap：质量差距分析。把「现状值 vs 国家/评审标准」折算成
 *       差距绝对值、差距百分比与优先级，红黄线项排序输出。
 *   - generateQualityImprovement：改进措施生成。按根因（人/机/料/法/环/测）
 *       匹配改进方法论（PDCA/QCC/DMAIC/Lean），输出可落地措施清单与责任建议。
 *
 * 全部无副作用、不触库、不写 SQL，便于单测。
 * 医疗安全红线：输出仅提示改进方向，不自动启停医嘱或隔离；最终处置由质控科
 * 专职人员签认后生效。
 * 不触碰 WebSocket；不新增依赖。
 *
 * 依据：《医疗质量管理办法》（国家卫生计生委令第 10 号）、
 *       《三级医院评审标准（2022 年版）》第四章、
 *       《国务院办公厅关于加强三级公立医院绩效考核工作的意见》（国办发〔2019〕4 号）、
 *       国家卫生健康委《电子病历系统应用水平分级评价管理办法》、
 *       《医院信息互联互通标准化成熟度测评方案》、
 *       中国医院协会《患者安全目标》。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 通用类型 ============================== */

/** 质量与安全四大管理维度 */
export type QualitySafetyDimension =
  | 'medical_quality'      // 医疗质量：国考 / 电子病历五级 / 互联互通四甲
  | 'patient_safety'       // 患者安全：十大目标 / 不良事件 / 根因分析
  | 'quality_improvement'  // 质量改进：PDCA / QCC / 六西格玛 / 精益
  | 'review_readiness';    // 评审准备：三甲条款 / 证据链 / 差距 / 整改

/** 指标方向：lower_better 越低越好（感染率），higher_better 越高越好（合规率） */
export type MetricDirection = 'lower_better' | 'higher_better';

/** 差距 / 状态三档 */
export type GapSeverity = 'red' | 'yellow' | 'green';

/** 质量改进方法论 */
export type ImprovementMethod = 'PDCA' | 'QCC' | 'DMAIC' | 'LEAN';

/** 纯函数错误（路由层映射为 HTTP 4xx） */
export class QualitySafetyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'QualitySafetyError';
  }
}

function assertFiniteNum(v: number, field: string): void {
  if (!Number.isFinite(v)) throw new QualitySafetyError(400, `${field} 必须是数字`);
}

/* ============================== 0. 体系总览 ============================== */

/** 一个管理维度下的国家口径条目 */
export interface NationalItem {
  code: string;
  name: string;
  /** 国家口径目标 / 要求（人可读） */
  nationalTarget: string;
}

/** 深度质量安全体系的一个维度 */
export interface QualitySafetyDimBlock {
  code: QualitySafetyDimension;
  name: string;
  description: string;
  /** 国家口径条目（不自创） */
  nationalItems: NationalItem[];
  /** 落地动作清单（真管控，不是看板功能） */
  actions: string[];
}

/** buildDeepQualitySafety 输出 */
export interface DeepQualitySafetySystem {
  dimensions: QualitySafetyDimBlock[];
  /** 依据文号 */
  nationalStandard: string;
  /** 一句话价值主张 */
  valueStatement: string;
  /** 安全红线（系统不可逾越的边界） */
  guardrails: string[];
}

/**
 * 中国医院协会《患者安全目标》十大目标（固定口径，不增删）。
 * 编号与官方一致：1 正确识别患者身份 …… 10 防范和减少伤害患者的事件。
 */
export const PATIENT_SAFETY_GOALS: NationalItem[] = [
  { code: 'PSG-01', name: '正确识别患者身份', nationalTarget: '至少使用两种身份识别方式，禁止仅以房间号作为识别依据' },
  { code: 'PSG-02', name: '强化有效沟通', nationalTarget: '重要电话/口头医嘱复述确认，关键数据 5 分钟内回读' },
  { code: 'PSG-03', name: '确保用药与用血安全', nationalTarget: '高警示药品单独存放，用药前双人核对，输血双人双签' },
  { code: 'PSG-04', name: '减少相关医疗区域感染风险', nationalTarget: '手卫生依从率 ≥95%，环境物表采样合格率达标' },
  { code: 'PSG-05', name: '降低相关伤害事件风险', nationalTarget: '防跌倒/防压疮/防坠床评估入院即做，高风险挂牌' },
  { code: 'PSG-06', name: '确保手术安全', nationalTarget: '手术部位标记、三方核查 Time-out 100% 执行' },
  { code: 'PSG-07', name: '防范医疗器械相关不良事件', nationalTarget: '器械溯源、高危器械使用前核查' },
  { code: 'PSG-08', name: '防范重点环节诊疗差错', nationalTarget: '标本核对、危急值闭环管理' },
  { code: 'PSG-09', name: '鼓励患者参与患者安全', nationalTarget: '入院宣教告知安全注意事项，主动报告隐患' },
  { code: 'PSG-10', name: '防范和减少伤害患者的事件', nationalTarget: '不良事件主动上报非惩罚，根因分析 RCA 闭环' },
];

/**
 * 三级公立医院绩效考核（国办发〔2019〕4 号）国家监测指标——
 * 这里列「医疗质量」相关核心代表项（口径来自国家监测平台，不杜撰数值目标）。
 */
export const KPI_MEDICAL_ITEMS: NationalItem[] = [
  { code: 'KPI-MQ-01', name: '出院患者四级手术比例', nationalTarget: '逐年提升，反映疑难重症诊治能力' },
  { code: 'KPI-MQ-02', name: '手术患者并发症发生率', nationalTarget: '越低越好，国家监测核心质量指标' },
  { code: 'KPI-MQ-03', name: 'I 类切口手术部位感染率', nationalTarget: '越低越好，目标 ≤1.5%（行业基准）' },
  { code: 'KPI-MQ-04', name: '低风险组病例死亡率', nationalTarget: '趋近于 0，监测诊疗安全底线' },
  { code: 'KPI-MQ-05', name: '麻醉医疗服务质量', nationalTarget: '麻醉前评估完备，麻醉非计划插管率监测' },
  { code: 'KPI-MQ-06', name: '住院患者死亡率（低风险）', nationalTarget: '趋近于 0，不可接受升高需 RCA' },
];

/**
 * buildDeepQualitySafety —— 深度质量安全体系（四大维度，总在返回）。
 * 纯函数：无入参、无副作用，返回固定国家口径目录。
 */
export function buildDeepQualitySafety(): DeepQualitySafetySystem {
  return {
    dimensions: [
      {
        code: 'medical_quality',
        name: '医疗质量',
        description: '以国家监测指标为主轴，电子病历五级与互联互通四甲为信息化支撑',
        nationalItems: [
          ...KPI_MEDICAL_ITEMS,
          { code: 'EMR-L5', name: '电子病历系统应用水平五级', nationalTarget: 'CDSS 闭环、全流程数据贯通，达到五级要求' },
          { code: 'IHE-L4A', name: '医院信息互联互通标准化成熟度四级甲等', nationalTarget: '平台整合、院内信息统一交互，测评定级四甲' },
        ],
        actions: [
          '按国家监测指标口径采集分子分母，杜绝口径漂移',
          '电子病历五级：CDSS 预警-干预-记录闭环留痕',
          '互联互通四甲：平台主数据统一、接口标准化可测',
        ],
      },
      {
        code: 'patient_safety',
        name: '患者安全',
        description: '十大安全目标落地到床旁，不良事件主动上报非惩罚，根因分析对事不对人',
        nationalItems: PATIENT_SAFETY_GOALS,
        actions: [
          '十大目标逐项分解到科室与岗位，月查月通报',
          '不良事件 24h 内上报，主动上报不与个人考核挂钩',
          '严重事件 72h 内完成根因分析（5Why / 鱼骨图）',
        ],
      },
      {
        code: 'quality_improvement',
        name: '质量改进',
        description: '用 PDCA/品管圈/六西格玛/精益四种方法论把问题改到根上',
        nationalItems: [
          { code: 'METHOD-PDCA', name: 'PDCA 循环', nationalTarget: 'Plan-Do-Check-Act 闭环，遗留问题转入下一循环' },
          { code: 'METHOD-QCC', name: '品管圈 QCC', nationalTarget: '一线组队、数据说话、对策标准化' },
          { code: 'METHOD-DMAIC', name: '六西格玛 DMAIC', nationalTarget: 'Define-Measure-Analyze-Improve-Control，降缺陷波动' },
          { code: 'METHOD-LEAN', name: '精益管理 Lean', nationalTarget: '识别并消除等待/搬运/返工等七种浪费' },
        ],
        actions: [
          '一个问题匹配一种方法论，不一把尺子量到底',
          '改进前后必有 before/after 数据对比，不空喊效果',
          '有效对策写入制度/流程/SOP，标准化固化',
        ],
      },
      {
        code: 'review_readiness',
        name: '评审准备',
        description: '对照《三级医院评审标准（2022 年版）》条款，证据链随做随存，整改闭环可追',
        nationalItems: [
          { code: 'REV-CLAUSE', name: '三甲评审条款', nationalTarget: '第四章质量与安全条款逐条自查' },
          { code: 'REV-EVIDENCE', name: '证据链', nationalTarget: '每条条款有制度、有执行、有监测、有改进' },
          { code: 'REV-GAP', name: '差距分析', nationalTarget: '现状 vs 条款要求，红黄分级' },
          { code: 'REV-RECTIFY', name: '整改跟踪', nationalTarget: '问题到人、到期、可验证、有复核' },
        ],
        actions: [
          '条款-证据-责任人-期限四件套建档',
          '证据链随业务产生时同步归档，不迎检前补料',
          '红黄线问题挂账督办，闭环后销号',
        ],
      },
    ],
    nationalStandard:
      '《医疗质量管理办法》、《三级医院评审标准（2022 年版）》、国办发〔2019〕4 号、' +
      '电子病历系统应用水平分级评价、互联互通标准化成熟度测评、中国医院协会患者安全目标',
    valueStatement: '质量指标国家口径可算、差距红黄可定位、改进方法论可落地、迎检条款可举证',
    guardrails: [
      '患者安全不良事件零容忍，任何阳性读数在跟踪层即判红线',
      '改进输出仅为建议，不自动启停医嘱/隔离；处置由质控岗签认生效',
      '证据链只存管理台账，不关联患者个体 PII，访问受权限码控制',
    ],
  };
}

/* ============================== 1. 质量指标跟踪 ============================== */

/** 一条待跟踪的质量指标实测（国家口径） */
export interface QualityIndicatorInput {
  /** 指标编码（国家口径，如 KPI-MQ-02 / PSG-04） */
  code: string;
  /** 指标规范名，如「手术患者并发症发生率」 */
  name: string;
  /** 计量单位：% / ‰ / DDDs / 例 */
  unit: string;
  /** 方向 */
  direction: MetricDirection;
  /** 国家/行业达标线（higher_better：actual>=target 达标；lower_better：actual<=target 达标） */
  target: number;
  /** 本期实测值 */
  actual: number;
  /** 样本量（可空），n<30 视为 underpowered */
  sampleSize?: number;
  /** 是否患者安全零容忍项（threshold=0，阳性即红线） */
  zeroTolerance?: boolean;
}

/** trackQualityIndicator 输出 */
export interface TrackedQualityIndicator {
  dept: string;
  period: string;
  code: string;
  name: string;
  unit: string;
  direction: MetricDirection;
  target: number;
  actual: number;
  sampleSize?: number;
  /** 与达标线的偏差（带符号；lower_better 下 actual-target 为正即恶化） */
  deviation: number;
  /** 偏差百分比（%，相对 target；target=0 时以 actual 自身计） */
  deviationPct: number;
  /** 红/黄/绿 */
  severity: GapSeverity;
  /** 样本量不足提示 */
  underpowered: boolean;
  /** 一句话结论 */
  summary: string;
}

/**
 * trackQualityIndicator —— 质量指标跟踪。
 * 把某科室某一期的实测值对照国家达标线，真算偏差并判红黄绿。
 * @param indicator 指标实测（国家口径）
 * @param dept      责任科室
 * @param period    统计期（自然月，如 2026-10）
 */
export function trackQualityIndicator(
  indicator: QualityIndicatorInput,
  dept: string,
  period: string,
): TrackedQualityIndicator {
  if (!indicator || !indicator.code) {
    throw new QualitySafetyError(400, '指标编码不能为空');
  }
  if (!indicator.name?.trim()) throw new QualitySafetyError(400, '指标名不能为空');
  assertFiniteNum(indicator.target, '达标线');
  assertFiniteNum(indicator.actual, '实测值');
  if (indicator.direction !== 'lower_better' && indicator.direction !== 'higher_better') {
    throw new QualitySafetyError(400, '指标方向必须是 lower_better 或 higher_better');
  }
  const deptSafe = dept?.trim() || '全院';
  const periodSafe = period?.trim() || new Date().toISOString().slice(0, 7);

  // 是否达标
  const met =
    indicator.direction === 'lower_better'
      ? indicator.actual <= indicator.target
      : indicator.actual >= indicator.target;

  // 偏差（带符号）：lower_better 下 actual>target 为正（恶化）；higher_better 下 actual<target 为负（恶化）
  const deviation = Number((indicator.actual - indicator.target).toFixed(4));

  // 偏差百分比（相对 target；target=0 时零容忍，有读数即 100% 恶化）
  let deviationPct = 0;
  if (indicator.target !== 0) {
    deviationPct = Math.abs(deviation) / Math.abs(indicator.target) * 100;
  } else {
    deviationPct = indicator.actual === 0 ? 0 : 100;
  }
  deviationPct = Number(deviationPct.toFixed(2));

  // 三档判定
  let severity: GapSeverity;
  if (indicator.zeroTolerance && indicator.actual > 0) {
    severity = 'red'; // 零容忍阳性即红线
  } else if (met) {
    severity = 'green';
  } else {
    // 未达标：偏离 ≥20% 红线，否则黄线
    severity = deviationPct >= 20 ? 'red' : 'yellow';
  }

  const underpowered =
    typeof indicator.sampleSize === 'number' && indicator.sampleSize >= 0 && indicator.sampleSize < 30;

  const verb =
    indicator.direction === 'lower_better'
      ? met ? '低于达标线，达标' : `超出达标线 ${deviation}${indicator.unit}（恶化）`
      : met ? '高于达标线，达标' : `低于达标线 ${Math.abs(deviation)}${indicator.unit}（不足）`;

  const summary =
    `${deptSafe} ${periodSafe}「${indicator.name}」实测 ${indicator.actual}${indicator.unit}，` +
    `国家达标线 ${indicator.target}${indicator.unit}，${verb}，偏差 ${deviationPct}%，` +
    `判定：${severity === 'red' ? '红线' : severity === 'yellow' ? '黄线' : '达标'}` +
    `${underpowered ? '（样本量不足，结论需谨慎）' : ''}`;

  return {
    dept: deptSafe,
    period: periodSafe,
    code: indicator.code,
    name: indicator.name,
    unit: indicator.unit,
    direction: indicator.direction,
    target: indicator.target,
    actual: indicator.actual,
    sampleSize: indicator.sampleSize,
    deviation,
    deviationPct,
    severity,
    underpowered,
    summary,
  };
}

/* ============================== 2. 质量差距分析 ============================== */

/** 差距分析的一条对照项（现状 vs 国家/评审标准） */
export interface GapItem {
  /** 条款/指标编码 */
  code: string;
  /** 名称（如「I 类切口手术部位感染率」或「评审条款 4.3.1.2」） */
  name: string;
  /** 方向 */
  direction: MetricDirection;
  /** 国家/评审标准值 */
  standard: number;
  /** 科室现状值 */
  current: number;
  /** 单位 */
  unit: string;
}

/** identifyQualityGap 输出中的一条差距 */
export interface QualityGap {
  code: string;
  name: string;
  unit: string;
  direction: MetricDirection;
  standard: number;
  current: number;
  /** 差距绝对值（现状距标准还差多少，恒为非负） */
  gap: number;
  /** 差距百分比（%） */
  gapPct: number;
  severity: GapSeverity;
  /** 优先级：red→high，yellow→medium，green→low */
  priority: 'high' | 'medium' | 'low';
  /** 整改建议（人可读，落到方法） */
  suggestion: string;
}

/** identifyQualityGap 输出 */
export interface QualityGapReport {
  dept: string;
  total: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  gaps: QualityGap[];
  /** 按严重程度排序后的总体结论 */
  summary: string;
}

/**
 * identifyQualityGap —— 质量差距分析。
 * 把科室现状逐项对照国家/评审标准，折算差距、分档、排序输出。
 * @param dept    责任科室
 * @param target  对照清单（现状 vs 标准）
 */
export function identifyQualityGap(dept: string, target: GapItem[]): QualityGapReport {
  if (!Array.isArray(target)) {
    throw new QualitySafetyError(400, '对照清单必须是数组');
  }
  const deptSafe = dept?.trim() || '全院';

  const gaps: QualityGap[] = target.map((item) => {
    if (!item.code) throw new QualitySafetyError(400, '差距项编码不能为空');
    assertFiniteNum(item.standard, '标准值');
    assertFiniteNum(item.current, '现状值');
    if (item.direction !== 'lower_better' && item.direction !== 'higher_better') {
      throw new QualitySafetyError(400, `差距项 ${item.code} 方向非法`);
    }

    // 差距绝对值：lower_better 现状高于标准的部分；higher_better 现状低于标准的部分
    const gap =
      item.direction === 'lower_better'
        ? Math.max(0, item.current - item.standard)
        : Math.max(0, item.standard - item.current);

    const gapPct =
      item.standard !== 0
        ? Number((gap / Math.abs(item.standard) * 100).toFixed(2))
        : gap === 0 ? 0 : 100;

    const met = gap === 0;
    const severity: GapSeverity = met ? 'green' : gapPct >= 20 ? 'red' : 'yellow';
    const priority: QualityGap['priority'] =
      severity === 'red' ? 'high' : severity === 'yellow' ? 'medium' : 'low';

    const suggestion =
      severity === 'green'
        ? '已达国家/评审标准，保持监测，纳入标准化制度固化成果'
        : severity === 'red'
          ? `差距 ${gapPct}%，列为红线挂账督办，根因分析后 1 周内出整改方案`
          : `差距 ${gapPct}%，列入黄线限期整改，责任到人、到期复核`;

    return {
      code: item.code,
      name: item.name,
      unit: item.unit,
      direction: item.direction,
      standard: item.standard,
      current: item.current,
      gap: Number(gap.toFixed(4)),
      gapPct,
      severity,
      priority,
      suggestion,
    };
  });

  // 严重程度排序：red → yellow → green
  const order: Record<GapSeverity, number> = { red: 0, yellow: 1, green: 2 };
  gaps.sort((a, b) => order[a.severity] - order[b.severity] || b.gapPct - a.gapPct);

  const redCount = gaps.filter((g) => g.severity === 'red').length;
  const yellowCount = gaps.filter((g) => g.severity === 'yellow').length;
  const greenCount = gaps.filter((g) => g.severity === 'green').length;

  const summary =
    `${deptSafe} 共对照国家/评审标准 ${gaps.length} 项：红线 ${redCount}、` +
    `黄线 ${yellowCount}、达标 ${greenCount}。` +
    (redCount > 0
      ? `红线项须优先根因分析与限期整改。`
      : yellowCount > 0
        ? '无红线项，黄线项按计划整改即可。'
        : '全部达标，保持常态化监测。');

  return { dept: deptSafe, total: gaps.length, redCount, yellowCount, greenCount, gaps, summary };
}

/* ============================== 3. 改进措施生成 ============================== */

/** 根因分类（鱼骨图：人/机/料/法/环/测） */
export type RootCause =
  | '人员'   // 培训不足/资质/疏忽
  | '机器'   // 设备老化/故障/报警疲劳
  | '物料'   // 药品耗材/标本/物资
  | '方法'   // 流程缺陷/制度缺失/交接不清
  | '环境'   // 布局/光线/人力配置/高峰拥堵
  | '测量';  // 数据/监测口径/检验结果

/** generateQualityImprovement 输出中的一条措施 */
export interface ImprovementMeasure {
  /** 措施动作 */
  action: string;
  /** 建议责任角色 */
  owner: string;
  /** 建议完成时限 */
  timeline: string;
  /** 预期可测效果 */
  expectedEffect: string;
}

/** generateQualityImprovement 输出 */
export interface QualityImprovementPlan {
  issue: string;
  rootCause: RootCause;
  /** 推荐方法论（按根因匹配） */
  method: ImprovementMethod;
  methodRationale: string;
  measures: ImprovementMeasure[];
  /** 闭环要求 */
  closedLoop: string;
}

/** 根因 → 推荐方法论 + 措施模板（国家口径常用组合，不杜撰） */
const ROOT_CAUSE_PLAYBOOK: Record<
  RootCause,
  { method: ImprovementMethod; rationale: string; measures: ImprovementMeasure[] }
> = {
  人员: {
    method: 'PDCA',
    rationale: '人的能力与意识问题，适合 PDCA 循环培训-考核-再培训',
    measures: [
      { action: '针对薄弱环节开展专项培训并考核留痕', owner: '科室护士长/教学秘书', timeline: '2 周内', expectedEffect: '考核合格率 ≥95%' },
      { action: '关键操作双人核对 + 现场旁站带教 1 个月', owner: '带教老师', timeline: '1 个月', expectedEffect: '同类差错环比下降' },
      { action: '建立岗位资质矩阵，未授权不独立操作', owner: '科主任', timeline: '1 个月内', expectedEffect: '资质不符操作 0 发生' },
    ],
  },
  机器: {
    method: 'DMAIC',
    rationale: '设备相关缺陷波动，适合六西格玛 DMAIC 降变异、提可靠',
    measures: [
      { action: 'Define：界定设备故障/报警造成的流程损失', owner: '设备科 + 使用科室', timeline: '1 周内', expectedEffect: '损失量化到小时/例' },
      { action: 'Measure：统计设备故障率与报警源分布', owner: '设备科工程师', timeline: '2 周内', expectedEffect: '故障 MTBF 可测' },
      { action: 'Improve：高危设备预防性维护 + 报警阈值优化', owner: '设备科', timeline: '1 个月内', expectedEffect: '非计划停机下降' },
      { action: 'Control：点检表与维保周期固化入 SOP', owner: '设备科', timeline: '持续', expectedEffect: '故障复发可控' },
    ],
  },
  物料: {
    method: 'LEAN',
    rationale: '药品耗材/物资相关浪费与差错，适合精益消除等待、错配、过期',
    measures: [
      { action: '高警示/抢救药品耗材定点定位、效期 FEFO 管理', owner: '药库/护士长', timeline: '2 周内', expectedEffect: '过期/错拿 0 发生' },
      { action: '补货看板拉动，消除断货等待与积压', owner: '耗材管理员', timeline: '1 个月内', expectedEffect: '断货次数下降' },
      { action: '标本/物资交接条码核对闭环', owner: '检验科/运送中心', timeline: '1 个月内', expectedEffect: '标本错送率下降' },
    ],
  },
  方法: {
    method: 'QCC',
    rationale: '流程与制度缺陷，适合品管圈一线组队、数据找真因、对策标准化',
    measures: [
      { action: '组建品管圈，用查现状把握找到真因', owner: '圈长（一线骨干）', timeline: '2 周内', expectedEffect: '真因数据化，不凭感觉' },
      { action: '重设计交接/核查流程并做新旧对比', owner: '流程 owner', timeline: '1 个月内', expectedEffect: '关键节点耗时/差错下降' },
      { action: '有效对策写入制度与 SOP 培训落地', owner: '质控科', timeline: '2 个月内', expectedEffect: '对策标准化固化' },
    ],
  },
  环境: {
    method: 'LEAN',
    rationale: '布局/人力/拥堵类浪费，适合精益 5S 与快速响应排程',
    measures: [
      { action: '高峰时段人力弹性调配 + 分诊前置', owner: '科护士长', timeline: '2 周内', expectedEffect: '平均等待时间下降' },
      { action: '关键区域 5S 定置管理，消除找物/找路浪费', owner: '科室', timeline: '1 个月内', expectedEffect: '动线交叉点下降' },
      { action: '高风险时段增加巡查与双人值守', owner: '科主任', timeline: '立即', expectedEffect: '高峰差错/跌倒下降' },
    ],
  },
  测量: {
    method: 'DMAIC',
    rationale: '监测口径与数据质量问题，适合六西格玛统一测量系统、降数据波动',
    measures: [
      { action: '统一指标分子分母口径并发布口径手册', owner: '质控科/病案科', timeline: '2 周内', expectedEffect: '跨科室口径一致' },
      { action: '危急值/关键指标闭环登记与超时提醒', owner: '信息科 + 科室', timeline: '1 个月内', expectedEffect: '危急值及时闭环率 100%' },
      { action: '监测数据月度复盘，异常波动即 RCA', owner: '质控科', timeline: '持续', expectedEffect: '数据可溯、异常可警' },
    ],
  },
};

/**
 * generateQualityImprovement —— 改进措施生成。
 * 按问题与根因（鱼骨图六类）匹配国家常用改进方法论，输出可落地措施。
 * @param issue     问题描述（如「住院患者跌倒发生率偏高」）
 * @param rootCause 根因分类（人/机/料/法/环/测）
 */
export function generateQualityImprovement(issue: string, rootCause: RootCause): QualityImprovementPlan {
  if (!issue?.trim()) throw new QualitySafetyError(400, '问题描述不能为空');
  const playbook = ROOT_CAUSE_PLAYBOOK[rootCause];
  if (!playbook) {
    throw new QualitySafetyError(400, `根因必须是：人员/机器/物料/方法/环境/测量 之一`);
  }

  return {
    issue: issue.trim(),
    rootCause,
    method: playbook.method,
    methodRationale: playbook.rationale,
    measures: playbook.measures.map((m) => ({ ...m })),
    closedLoop:
      '措施落地后必须采集 before/after 数据对比效果；有效对策写入制度/SOP 标准化；' +
      '遗留问题转入下一 PDCA 循环，禁止静默丢弃。',
  };
}
