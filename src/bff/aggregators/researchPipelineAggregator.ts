/**
 * 健澜科技 jlmedaios - 【科研教学后勤】医院科研智能化深化·全流程辅助聚合器（M171-A）
 *
 * 全流程七步（选题→文献→设计→实施→分析→写作→投稿），每步给出可执行的
 * 方法学任务、交付物与质量红线，不写外行话：
 *   - 样本量估算采用两独立样本均值比较的经典公式（Cohen's d 效应量）；
 *   - 统计方法推荐按「研究设计 × 结局数据类型」正交映射到检验、前提假设、报告规范；
 *   - 偏倚风险识别对齐 Cochrane RoB 2 / ROBINS-I / QUADAS-2 领域。
 *
 * 纯函数约定：
 *   - buildFullResearchPipeline / estimateSampleSize / recommendStatisticalMethod /
 *     identifyBiasRisk 均为纯计算，不触库、不发网络、不读时钟、不改入参；
 *   - 任何入参非法（空 topic、越界 alpha/power/effectSize、未知设计/数据类型）
 *     一律抛错，由路由层收敛为 400 结构化错误信封；
 *   - 不预造任何实验数据、p 值、效应量数字。
 *
 * 不触碰 WebSocket，不新增依赖，不写 SQL（本切片纯函数，无新表）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型与口径                                                          */
/* ------------------------------------------------------------------ */

/** 科研全流程七步阶段 id */
export type PipelineStageId =
  | 'topic'        // 选题
  | 'literature'   // 文献
  | 'design'      // 设计
  | 'implement'   // 实施
  | 'analysis'    // 分析
  | 'writing'     // 写作
  | 'submission'; // 投稿

/** 七步中的单个任务条目 */
export interface PipelineTask {
  /** 任务要点（方法学口径，一句话可执行） */
  point: string;
  /** 交付物（该任务完成后应产出的文件/记录） */
  deliverable: string;
}

/** 七步中的一个阶段 */
export interface PipelineStage {
  id: PipelineStageId;
  /** 阶段名（中文） */
  name: string;
  /** 阶段方法学定位（一句话说明该步在科研方法论中的作用） */
  focus: string;
  tasks: PipelineTask[];
  /** 该阶段的质量红线（踩线即返工） */
  redFlags: string[];
}

/** 全流程辅助总产物 */
export interface FullResearchPipeline {
  topic: string;
  stages: PipelineStage[];
  /** 全程合规与伦理总提示 */
  governanceNotes: string[];
}

/* ------------------------------------------------------------------ */
/* 工具函数                                                            */
/* ------------------------------------------------------------------ */

/** 宽松收敛为 trim 后字符串 */
function toText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/**
 * 标准正态分布反函数（分位数 z），Peter Acklam 有理逼近。
 * 用于由 alpha / power 求 z_{1-alpha/2}、z_{1-beta}。
 * 输入 p ∈ (0,1)，输出 Φ⁻¹(p)。
 */
function inverseNormalCdf(p: number): number {
  if (!(p > 0 && p < 1)) {
    throw new Error(`正态分位数输入须为 (0,1)：${p}`);
  }
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e-1, 3.754408661907416e0];

  const plow = 0.02425;
  const phigh = 1 - plow;

  let q: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      (((d[0] * q + d[1]) * q + d[2]) * q + d[3]);
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      (((d[0] * q + d[1]) * q + d[2]) * q + d[3]);
  }
  q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* ------------------------------------------------------------------ */
/* 1) 科研全流程七步                                                    */
/* ------------------------------------------------------------------ */

/**
 * 【科研教学后勤·M171-A】构建科研全流程七步辅助（纯函数）。
 *
 * 七步口径（每步 focus / tasks / redFlags 均为方法学专业表述）：
 *   选题：热点分析 + 创新性评估 + 可行性判断（PICOT 雏形）；
 *   文献：系统检索 + 综述 + 趋势 + 方法对比（PRISMA 思路）；
 *   设计：研究类型 + 样本量 + 分组 + 统计方法（按报告规范预注册）；
 *   实施：数据采集 + 质量控制 + 偏倚控制（伦理批件先行）；
 *   分析：统计方法 + 结果解读 + 图表制作（ITC/ITT 口径一致）；
 *   写作：IMRaD 大纲 + 结果描述 + 讨论 + 结论（结果只写实测数字）；
 *   投稿：期刊推荐 + 格式调整 + 审稿回复（point-by-cycle 逐条回应）。
 *
 * @param topic 研究主题（必填）
 */
export function buildFullResearchPipeline(topic: unknown): FullResearchPipeline {
  const topicText = toText(topic);
  if (!topicText) throw new Error('研究主题 topic 不能为空');

  const stages: PipelineStage[] = [
    {
      id: 'topic',
      name: '① 选题',
      focus: '从临床/科研真问题收敛到可检验的科学假设，完成创新性与可行性双评估',
      tasks: [
        {
          point: `热点分析：围绕「${topicText}」梳理近 3~5 年指南更新、基金资助方向与未满足临床需求`,
          deliverable: '选题依据一页纸（问题来源 + 现有证据缺口）',
        },
        {
          point: '创新性评估：与近 3 年同类研究做增量对比，明确「新人群 / 新干预 / 新终点 / 新方法」之一',
          deliverable: '创新性对照表（含直接竞品研究及其局限）',
        },
        {
          point: '可行性判断：目标人群可及性、病例年流量、关键变量可采集性、经费与周期测算',
          deliverable: 'PICOT 要素表（人群/干预/对照/结局/时间）+ 可行性结论',
        },
      ],
      redFlags: [
        '题目贪大求全、单一研究无法回答（须聚焦一个主要终点）',
        '可行性仅凭经验估计，未用科室真实病例流数据校验',
      ],
    },
    {
      id: 'literature',
      name: '② 文献',
      focus: '系统检索既有证据，完成综述与方法学对比，定位本研究的证据空位',
      tasks: [
        {
          point: '检索：在 PubMed / Embase / CNKI / 万方 用 Mesh 与自由词组合，记录检索式与命中量',
          deliverable: '检索策略表（数据库/检索式/命中日期/命中数）',
        },
        {
          point: '综述：按 PICO 框架归纳纳入研究的设计、效应量与异质性',
          deliverable: '叙述性/系统综述初稿（含纳入排除流程图）',
        },
        {
          point: '趋势与方法对比：按年份与研究方法学归类，比较各设计的优势/偏倚风险',
          deliverable: '方法对比表 + 研究热点演变图',
        },
      ],
      redFlags: [
        '只检索中文或只检索近 1 年，证据基础不完整',
        '选择性引用阳性结果（发表偏倚未评估）',
      ],
    },
    {
      id: 'design',
      name: '③ 设计',
      focus: '确定研究类型、样本量、分组与统计方法，并完成预注册',
      tasks: [
        {
          point: '研究类型：按因果/关联/诊断/预后目标选择 RCT、队列、病例对照或诊断准确性设计',
          deliverable: '研究设计类型判定书（含为何不用其他设计的理由）',
        },
        {
          point: '样本量：以主要终点的预期效应量、α=0.05、把握度 0.80 反推，并加失访冗余',
          deliverable: '样本量估算说明书（公式、参数来源、每组 n）',
        },
        {
          point: '分组与统计：随机化/匹配/分层方案、主要与次要终点、预设统计方法',
          deliverable: '统计分析计划（SAP）+ 分组随机表生成方案',
        },
      ],
      redFlags: [
        '样本量用「方便样本」替代功效推算',
        '主要终点在数据出来后才选定（HARKing）',
      ],
    },
    {
      id: 'implement',
      name: '④ 实施',
      focus: '伦理先行，标准化采集与质控，把偏倚控制在设计阶段就埋好',
      tasks: [
        {
          point: '数据采集：按 CRF/电子数据采集系统（EDC）录入，变量字典与编码表先行',
          deliverable: 'CRF 表单 + 变量字典 + 数据质控规则',
        },
        {
          point: '质量控制：双人录入核查、源数据稽查（SDV）比例、关键变量逻辑校验',
          deliverable: '质控记录与稽查轨迹',
        },
        {
          point: '偏倚控制：随机分配隐藏、盲法实施、混杂因素预设、失访与缺失预案',
          deliverable: '偏倚控制清单（对应 RoB/ROBINS-I 各领域）',
        },
      ],
      redFlags: [
        '未取得伦理批件即开始入组',
        '关键结局由知晓分组的同一医师判定（检测偏倚）',
      ],
    },
    {
      id: 'analysis',
      name: '⑤ 分析',
      focus: '按 SAP 执行主分析与敏感性分析，结果解读与图表制作规范一致',
      tasks: [
        {
          point: '统计方法：连续/二分类/生存/有序结局各归其法，先校验分布与前提假设',
          deliverable: '分析代码与日志（可复现）+ 前提假设检验记录',
        },
        {
          point: '结果解读：报告效应量与 95%CI，p 值只作辅助，区分统计学与临床意义',
          deliverable: '结果表（Table 1 基线 + 主结果表）',
        },
        {
          point: '图表制作：森林图、Kaplan-Meier 曲线、ROC 曲线按报告规范出图',
          deliverable: '结果图集（矢量图，字号/坐标规范统一）',
        },
      ],
      redFlags: [
        '用 p<0.05 倒推删数据 / 反复试探分析（p-hacking）',
        '缺失值直接剔除且未做敏感性分析',
      ],
    },
    {
      id: 'writing',
      name: '⑥ 写作',
      focus: '按 IMRaD 组织论文，结果段只复述实测数据，讨论回到研究问题本身',
      tasks: [
        {
          point: 'IMRaD 大纲：Introduction 讲缺口、Methods 可复现、Results 摆数据、Discussion 做对照',
          deliverable: 'IMRaD 详细大纲（逐节要点与引注位置）',
        },
        {
          point: '结果描述：数字与分析表/图一一对应，不把「趋势」写成「显著」',
          deliverable: 'Results 初稿（仅含实测数字）',
        },
        {
          point: '讨论与结论：先答假设、再对照文献、坦诚局限，结论不外推到样本外人群',
          deliverable: 'Discussion + Conclusion 初稿',
        },
      ],
      redFlags: [
        '结果段出现未经实测的「预期数字」',
        '讨论夸大临床意义，与效应量幅度不符',
      ],
    },
    {
      id: 'submission',
      name: '⑦ 投稿',
      focus: '选刊匹配、格式合规，审稿意见逐条 point-by-cycle 回应',
      tasks: [
        {
          point: '期刊推荐：按影响因子、审稿周期、主题匹配与开放获取成本列候选期刊清单',
          deliverable: '候选期刊对比表（3~5 本）',
        },
        {
          point: '格式调整：目标稿的参考文献体例、图表嵌入顺序、字数与伦理声明核查',
          deliverable: '投稿格式自查清单（cover letter + 推荐审稿人）',
        },
        {
          point: '审稿回复：逐条回应 Reviewer 意见，补充实验/分析时保留修改痕迹',
          deliverable: 'point-by-cycle 回复信（含修订稿对照）',
        },
      ],
      redFlags: [
        '一稿多投 / 重复发表',
        '审稿意见未实质回应、仅态度性致歉',
      ],
    },
  ];

  return {
    topic: topicText,
    stages,
    governanceNotes: [
      '全程经医院伦理委员会审批，前瞻性研究须在 ChiCTR / ClinicalTrials.gov 预注册',
      '受试者个人信息按《个人信息保护法》《医疗卫生机构网络安全管理办法》脱敏存储',
      '主要终点与统计方案在揭盲前锁定，任何事后改动均须留痕并说明理由',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 2) 样本量估算                                                        */
/* ------------------------------------------------------------------ */

/** 样本量估算产物 */
export interface SampleSizeEstimate {
  /** 检验水准 α（双侧） */
  alpha: number;
  /** 检验效能 power = 1-β */
  power: number;
  /** 效应量 d（Cohen's d） */
  effectSize: number;
  /** 每组样本量（向上取整） */
  perGroup: number;
  /** 两组合计样本量 */
  total: number;
  /** 公式表述 */
  formula: string;
  /** 参数取值依据说明 */
  assumptions: string;
}

/**
 * 【科研教学后勤·M171-A】两独立样本均值/率比较的样本量估算（纯函数）。
 *
 * 采用经典公式（双侧检验、两组等样本）：
 *   n/组 = 2 · ( z_{1-α/2} + z_{1-β} )² / d²
 * 其中 d 为标准化效应量（Cohen's d）：小效应 d=0.2、中效应 d=0.5、大效应 d=0.8。
 *
 * 入参约束：
 *   - α ∈ (0, 0.2]（常规 0.05）；
 *   - power ∈ [0.5, 0.99]（常规 0.8 / 0.9）；
 *   - effectSize ∈ (0, 3]（Cliff 经验范围，过大无实际意义）。
 *
 * 注意：本结果为「每组」样本量的功效下限，实际入组须另加失访/不合格冗余
 * （常见 10%~20%），该冗余由调用方在实施阶段自行叠加。
 */
export function estimateSampleSize(
  alpha: unknown,
  power: unknown,
  effectSize: unknown,
): SampleSizeEstimate {
  const a = typeof alpha === 'number' ? alpha : Number(alpha);
  const pw = typeof power === 'number' ? power : Number(power);
  const d = typeof effectSize === 'number' ? effectSize : Number(effectSize);

  if (!Number.isFinite(a) || a <= 0 || a > 0.2) {
    throw new Error(`α 须为 (0,0.2]：${String(alpha)}`);
  }
  if (!Number.isFinite(pw) || pw < 0.5 || pw > 0.99) {
    throw new Error(`power 须为 [0.5,0.99]：${String(power)}`);
  }
  if (!Number.isFinite(d) || d <= 0 || d > 3) {
    throw new Error(`效应量 d 须为 (0,3]：${String(effectSize)}`);
  }

  const zAlpha = inverseNormalCdf(1 - a / 2); // 双侧
  const zBeta = inverseNormalCdf(pw);          // 1-β
  const perGroupRaw = (2 * Math.pow(zAlpha + zBeta, 2)) / (d * d);
  const perGroup = Math.ceil(perGroupRaw);

  const dLabel =
    d < 0.3 ? '小效应' : d < 0.6 ? '中等效应' : d < 0.9 ? '较大效应' : '大效应';

  return {
    alpha: a,
    power: pw,
    effectSize: d,
    perGroup,
    total: perGroup * 2,
    formula: 'n/组 = 2 · ( z_{1-α/2} + z_{1-β} )² / d²（两独立样本，等样本，双侧）',
    assumptions:
      `双侧 α=${a}、把握度 ${pw}、${dLabel}（Cohen's d=${d}）。` +
      `结果为每组功效下限，未含失访冗余（实施时另加 10%~20%）。`,
  };
}

/* ------------------------------------------------------------------ */
/* 3) 统计方法推荐                                                    */
/* ------------------------------------------------------------------ */

/** 研究设计类型 */
export type StudyDesign =
  | 'rct'             // 随机对照试验
  | 'prospective-cohort' // 前瞻性队列
  | 'retrospective-cohort'// 回顾性队列
  | 'case-control'    // 病例对照
  | 'diagnostic'      // 诊断准确性研究
  | 'cross-sectional';// 横断面研究

/** 结局数据类型 */
export type DataType =
  | 'continuous' // 连续变量
  | 'binary'     // 二分类
  | 'survival'   // 生存/时间-事件
  | 'ordinal';   // 有序分类

const DESIGN_LABEL: Record<StudyDesign, string> = {
  'rct': '随机对照试验（RCT）',
  'prospective-cohort': '前瞻性队列研究',
  'retrospective-cohort': '回顾性队列研究',
  'case-control': '病例对照研究',
  'diagnostic': '诊断准确性研究',
  'cross-sectional': '横断面研究',
};

/** 各设计对应的报告规范（CONSORT/STROBE/STARD/DECLINE） */
const DESIGN_STANDARD: Record<StudyDesign, string> = {
  'rct': 'CONSORT 2010',
  'prospective-cohort': 'STROBE',
  'retrospective-cohort': 'STROBE',
  'case-control': 'STROBE',
  'diagnostic': 'STARD 2015',
  'cross-sectional': 'STROBE',
};

/** 统计方法推荐条目 */
export interface StatisticalRecommendation {
  studyDesign: StudyDesign;
  designLabel: string;
  dataType: DataType;
  /** 主分析方法 */
  primaryTest: string;
  /** 前提假设/适用条件 */
  assumptions: string[];
  /** 备选/校正方法 */
  alternatives: string[];
  /** 效应量报告口径 */
  effectMeasure: string;
  /** 报告规范 */
  reportingStandard: string;
}

/**
 * 【科研教学后勤·M171-A】按「研究设计 × 结局数据类型」推荐统计方法（纯函数）。
 *
 * 映射口径（临床流行病学主流做法）：
 *   - rct + continuous → 协方差分析/两样本 t（ANCOVA 调基线）；
 *   - rct + binary → 卡方/Fisher，校正用 logistic；
 *   - rct + survival → log-rank + Cox（ITT）；
 *   - cohort + survival → KM + Cox HR；
 *   - cohort + binary → logistic OR；
 *   - case-control → 条件 logistic OR；
 *   - diagnostic → 灵敏度/特异度/AUC（DeLong）；
 *   - cross-sectional → 率/构成比比较、χ²/t。
 */
export function recommendStatisticalMethod(
  studyDesign: unknown,
  dataType: unknown,
): StatisticalRecommendation {
  const sd = toText(studyDesign) as StudyDesign;
  const dt = toText(dataType) as DataType;
  if (!(sd in DESIGN_LABEL)) {
    throw new Error(
      `研究设计非法：${String(studyDesign)}，须为 ${Object.keys(DESIGN_LABEL).join('/')}`,
    );
  }
  if (!['continuous', 'binary', 'survival', 'ordinal'].includes(dt)) {
    throw new Error(
      `结局数据类型非法：${String(dataType)}，须为 continuous/binary/survival/ordinal`,
    );
  }

  const base = {
    studyDesign: sd,
    designLabel: DESIGN_LABEL[sd],
    dataType: dt,
    reportingStandard: DESIGN_STANDARD[sd],
  };

  // 主分析 + 备选 + 前提假设，按 (设计, 数据类型) 取主分支
  const grid: Record<string, Omit<StatisticalRecommendation, 'studyDesign' | 'designLabel' | 'dataType' | 'reportingStandard'>> = {
    'rct|continuous': {
      primaryTest: '协方差分析（ANCOVA）调基线，辅以两独立样本 t 检验',
      assumptions: ['结局近似正态', '方差齐性（Levene）', '基线协变量与结局线性相关'],
      alternatives: ['非正态时用 Mann-Whitney U + 对数变换', '多中心/分层用混合效应模型'],
      effectMeasure: '组间均数差（MD, 95%CI）',
    },
    'rct|binary': {
      primaryTest: '卡方检验 / Fisher 精确检验（理论频数<5 时）',
      assumptions: ['独立样本', '期望频数不宜过小（校正规则触发 Fisher）'],
      alternatives: ['校正混杂用 logistic 回归（OR, 95%CI）', '多中心用 CMH 检验'],
      effectMeasure: '率差 / RR / OR（95%CI）',
    },
    'rct|survival': {
      primaryTest: 'Kaplan-Meier + Log-rank 检验（ITT 口径）',
      assumptions: ['比例风险假定（Schoenfeld 残差）', '删失独立'],
      alternatives: ['Cox 比例风险回归（HR, 95%CI）', '不满足 PH 时用时依 Cox'],
      effectMeasure: '风险比 HR（95%CI）+ 中位生存时间',
    },
    'rct|ordinal': {
      primaryTest: 'Wilcoxon 秩和 / 有序 logistic 回归（Proportional Odds）',
      assumptions: ['比例优势假定成立', '有序类别间距可解释'],
      alternatives: ['Breslow-Day 检验', '非参数趋势检验'],
      effectMeasure: 'OR（累计）+ 95%CI',
    },

    'prospective-cohort|continuous': {
      primaryTest: '多重线性回归（暴露组 vs 非暴露组均数差，调混杂）',
      assumptions: ['线性', '残差正态/独立/方差齐'],
      alternatives: ['倾向评分加权后的均数差', 'GEE 处理重复测量'],
      effectMeasure: '调整后均数差（95%CI）',
    },
    'prospective-cohort|binary': {
      primaryTest: 'Cox/Logistic 回归估计暴露与结局关联（OR/RR）',
      assumptions: ['混杂因素预设', '无严重共线性'],
      alternatives: ['边际结构模型控制时依混杂', 'PSM 对照'],
      effectMeasure: 'RR / OR（95%CI）',
    },
    'prospective-cohort|survival': {
      primaryTest: 'Kaplan-Meier 累积发生率 + Cox 比例风险回归（HR）',
      assumptions: ['比例风险假定', '删失独立'],
      alternatives: ['Fine-Gray 竞争风险模型', '时依暴露用 landmark 分析'],
      effectMeasure: 'HR（95%CI）',
    },
    'prospective-cohort|ordinal': {
      primaryTest: '有序 logistic 回归（比例优势模型）',
      assumptions: ['比例优势假定', '混杂校正'],
      alternatives: ['偏比例优势模型', '广义有序模型'],
      effectMeasure: '累计 OR（95%CI）',
    },

    'retrospective-cohort|continuous': {
      primaryTest: 'PSM/IPTW 校正后两组均数比较（线性回归）',
      assumptions: ['可观测混杂充分', '重叠支撑成立'],
      alternatives: ['E-value 评估未测量混杂', '双重稳健估计'],
      effectMeasure: '加权/匹配后均数差（95%CI）',
    },
    'retrospective-cohort|binary': {
      primaryTest: '倾向评分匹配后 logistic 回归（OR）',
      assumptions: ['匹配后 SMD<0.1', 'EPV≥10'],
      alternatives: ['IPTW 对照', 'E-value 敏感性分析'],
      effectMeasure: 'OR（95%CI）',
    },
    'retrospective-cohort|survival': {
      primaryTest: 'PSM/IPTW 后 Cox 回归（HR）',
      assumptions: ['PH 假定', '匹配后协变量均衡'],
      alternatives: ['累积发生率函数（竞争风险）', 'landmark 分析'],
      effectMeasure: 'HR（95%CI）',
    },
    'retrospective-cohort|ordinal': {
      primaryTest: '匹配后有序 logistic 回归',
      assumptions: ['PSM 后均衡', '比例优势假定'],
      alternatives: ['广义有序模型', '非参数趋势检验'],
      effectMeasure: '累计 OR（95%CI）',
    },

    'case-control|binary': {
      primaryTest: '条件 logistic 回归（匹配设计下 OR）',
      assumptions: ['匹配比例固定', '剂量-反应单调性'],
      alternatives: ['Unconditional logistic 粗匹配时备用', 'Mantel-Haenszel OR'],
      effectMeasure: 'OR（95%CI）',
    },
    'case-control|continuous': {
      primaryTest: '匹配后均数比较 / 线性回归估计暴露效应',
      assumptions: ['正态或稳健标准误', '混杂匹配充分'],
      alternatives: ['Mann-Whitney 非参数', '分数多项式拟合剂量关系'],
      effectMeasure: '均数差（95%CI）',
    },
    'case-control|ordinal': {
      primaryTest: '条件有序 logistic 回归',
      assumptions: ['比例优势假定', '匹配设计'],
      alternatives: ['趋势检验', '非参数秩和'],
      effectMeasure: '累计 OR（95%CI）',
    },
    'case-control|survival': {
      primaryTest: '病例对照为现患/新发病例，若做时间关联用嵌套病例对照 Cox',
      assumptions: ['发病密度抽样', '时间依存性协变量处理'],
      alternatives: ['条件 Cox 回归', '风险集抽样分析'],
      effectMeasure: 'HR（95%CI）',
    },

    'diagnostic|binary': {
      primaryTest: '灵敏度、特异度、约登指数 + ROC（AUC, DeLong 检验）',
      assumptions: ['盲法与金标准独立判读', '连续样本覆盖目标谱'],
      alternatives: ['似然比 / 预测值（附患病率）', 'McNemar 比较两种诊断'],
      effectMeasure: 'AUC（95%CI）+ 灵敏度/特异度',
    },
    'diagnostic|continuous': {
      primaryTest: 'ROC 连续变量阈值（约登指数最佳截断）',
      assumptions: ['金标准盲法', '谱效应覆盖'],
      alternatives: ['Logistic 回归建模预测概率', '校准曲线 + Brier'],
      effectMeasure: 'AUC（95%CI）+ 最佳阈值',
    },
    'diagnostic|survival': {
      primaryTest: '诊断/预测模型时间依赖 AUC + C-index',
      assumptions: ['删失独立', '模型外部验证'],
      alternatives: ['Decision Curve Analysis 临床净获益', '校准图'],
      effectMeasure: '时间依赖 AUC / C-index（95%CI）',
    },
    'diagnostic|ordinal': {
      primaryTest: '有序诊断分类的加权 κ / ROC 多类别分析',
      assumptions: ['判读者间一致性评估', '金标准盲法'],
      alternatives: ['多分类 AUC', 'Likert 量表秩相关'],
      effectMeasure: '加权 Cohen κ + AUC',
    },

    'cross-sectional|continuous': {
      primaryTest: '单样本/两样本 t 检验或方差分析（组间比较）',
      assumptions: ['随机抽样', '正态/稳健'],
      alternatives: ['线性回归校正混杂', '非参数 Kruskal-Wallis'],
      effectMeasure: '均数差（95%CI）',
    },
    'cross-sectional|binary': {
      primaryTest: 'χ² 检验比较暴露率/构成比',
      assumptions: ['独立样本', '期望频数'],
      alternatives: ['logistic 回归 OR', 'CMH 分层'],
      effectMeasure: 'OR / 率比（95%CI）',
    },
    'cross-sectional|survival': {
      primaryTest: '横断面无随访，若含既往时长数据用 Kaplan-Meier 描述',
      assumptions: ['现患率不等于发病率', '回忆偏倚已评估'],
      alternatives: ['患病率比（PR）', 'logistic 替代 Cox'],
      effectMeasure: '患病率比 PR（95%CI）',
    },
    'cross-sectional|ordinal': {
      primaryTest: 'Mantel-Haenszel 趋势检验 / 有序 logistic',
      assumptions: ['等级间距', '抽样代表性'],
      alternatives: ['Kruskal-Wallis 秩和', 'Spearman 相关'],
      effectMeasure: '趋势 OR（95%CI）',
    },
  };

  const hit = grid[`${sd}|${dt}`];
  if (!hit) {
    // 兜底：理论上 (设计, 数据类型) 全组合已覆盖，这里防御性抛错
    throw new Error(`未覆盖的统计推荐组合：${sd} × ${dt}`);
  }

  return { ...base, ...hit };
}

/* ------------------------------------------------------------------ */
/* 4) 偏倚风险识别                                                      */
/* ------------------------------------------------------------------ */

/** 偏倚风险等级 */
export type BiasRiskLevel = 'low' | 'moderate' | 'serious' | 'critical';

/** 偏倚领域（对齐 RoB 2 / ROBINS-I / QUADAS-2） */
export interface BiasDomain {
  /** 偏倚领域 id */
  domain: string;
  /** 中文领域名 */
  label: string;
  /** 风险等级 */
  risk: BiasRiskLevel;
  /** 风险来源一句话说明 */
  source: string;
  /** 缓解措施（实施阶段应落实的动作） */
  mitigation: string;
}

/** 偏倚风险识别产物 */
export interface BiasRiskReport {
  studyDesign: StudyDesign;
  designLabel: string;
  domains: BiasDomain[];
  /** 总体风险等级（取各域最高） */
  overallRisk: BiasRiskLevel;
  /** 工具名（对齐的偏倚评估框架） */
  tool: string;
}

const RISK_LABEL: Record<BiasRiskLevel, string> = {
  low: '低风险',
  moderate: '中等风险',
  serious: '严重风险',
  critical: '关键风险',
};

/**
 * 【科研教学后勤·M171-A】按研究设计识别偏倚风险领域（纯函数）。
 *
 * - RCT → 对齐 Cochrane RoB 2：随机过程、偏离干预、缺失数据、结局测量、选择性报告；
 * - 观察性（队列/病例对照/横断面）→ 对齐 ROBINS-I：混杂、选择、分类、随访、选择性报告；
 * - 诊断准确性 → 对齐 QUADAS-2：病例选择、待评价试验、金标准、流程与时机。
 */
export function identifyBiasRisk(studyDesign: unknown): BiasRiskReport {
  const sd = toText(studyDesign) as StudyDesign;
  if (!(sd in DESIGN_LABEL)) {
    throw new Error(
      `研究设计非法：${String(studyDesign)}，须为 ${Object.keys(DESIGN_LABEL).join('/')}`,
    );
  }

  let domains: BiasDomain[] = [];
  let tool: string;

  if (sd === 'rct') {
    tool = "Cochrane RoB 2（随机对照偏倚评估）";
    domains = [
      {
        domain: 'randomization', label: '随机过程偏倚',
        risk: 'low', source: '仅在随机序列可预测或分配未隐藏时升高',
        mitigation: '中央随机化 + 分配隐藏信封/系统，随机表独立第三方保管',
      },
      {
        domain: 'deviations', label: '偏离既定干预偏倚',
        risk: 'moderate', source: '破盲、不依从、跨组治疗在开放试验中常见',
        mitigation: '标准化干预手册 + ITT 主分析 + 符合方案集敏感性分析',
      },
      {
        domain: 'missing', label: '缺失结局数据偏倚',
        risk: 'moderate', source: '失访集中于某组或与结局相关时升高',
        mitigation: '失访率预设上限 20%，多重插补 + 完整病例双口径对照',
      },
      {
        domain: 'detection', label: '结局测量偏倚',
        risk: 'low', source: '主观结局由知晓分组者评估时升高',
        mitigation: '结局评估者盲法 + 客观终点优先 + 独立终点裁决委员会',
      },
      {
        domain: 'reporting', label: '选择性报告偏倚',
        risk: 'serious', source: '主要终点/分析在结果出来后被替换',
        mitigation: '方案预注册（ChiCTR/CT.gov），ICH-E9 SAP 揭盲前锁定',
      },
    ];
  } else if (sd === 'diagnostic') {
    tool = 'QUADAS-2（诊断准确性偏倚评估）';
    domains = [
      {
        domain: 'selection', label: '病例选择偏倚',
        risk: 'serious', source: '连续/随机入组未落实、病例-对照式抽样会高估精度',
        mitigation: '前瞻性连续入组，避免健康对照与重症病例的谱偏倚',
      },
      {
        domain: 'index-test', label: '待评价试验实施偏倚',
        risk: 'low', source: '判读者知晓金标准结果时升高',
        mitigation: '待评价试验判读盲法 + 预先声明阈值',
      },
      {
        domain: 'reference', label: '金标准偏倚',
        risk: 'moderate', source: '金标准对部分病例判定不一致或延迟',
        mitigation: '金标准独立盲法复核 + 对不一致病例第三专家仲裁',
      },
      {
        domain: 'flow', label: '流程与时机偏倚',
        risk: 'moderate', source: '待评价试验与金标准间隔过长、中途失访',
        mitigation: '两试验同期完成，记录所有入组/排除例数（流程图）',
      },
    ];
  } else {
    // 观察性研究：prospective/retrospective cohort, case-control, cross-sectional
    tool = 'ROBINS-I（非随机干预研究偏倚评估）';
    const isRetro = sd === 'retrospective-cohort' || sd === 'case-control';
    domains = [
      {
        domain: 'confounding', label: '混杂偏倚',
        risk: sd === 'case-control' ? 'serious' : 'serious',
        source: '适应/选择指征、病情严重程度等时依或未测量混杂',
        mitigation: '预设混杂因素集 + PSM/IPTW/多因素回归 + E-value 敏感性分析',
      },
      {
        domain: 'selection', label: '参与者选择偏倚',
        risk: isRetro ? 'serious' : 'moderate',
        source: '回顾性数据按可用病历入组，病例对照更易选择偏倚',
        mitigation: '明确源人群与时间窗 + 纳入排除标准化 + 重叠支撑核验',
      },
      {
        domain: 'classification', label: '暴露/结局分类偏倚',
        risk: isRetro ? 'moderate' : 'low',
        source: 'EHR 暴露编码错误或回忆偏倚（病例对照）',
        mitigation: '暴露/结局操作化定义 + 双源核对 + 盲法分类',
      },
      {
        domain: 'followup', label: '随访/时间偏倚',
        risk: sd === 'retrospective-cohort' ? 'serious' : 'moderate',
        source: '回顾性队列随访长度不一、失访与结局相关',
        mitigation: '固定随访窗 + 竞争风险模型 + 失访多重插补对照',
      },
      {
        domain: 'reporting', label: '选择性报告偏倚',
        risk: 'serious',
        source: '事后挑选有显著结果的亚组/模型',
        mitigation: '分析方案预登记 + 全部预设亚组与模型均报告',
      },
    ];
  }

  const order: BiasRiskLevel[] = ['low', 'moderate', 'serious', 'critical'];
  const overallRisk = domains.reduce<BiasRiskLevel>((acc, d) =>
    order.indexOf(d.risk) > order.indexOf(acc) ? d.risk : acc, 'low');

  return {
    studyDesign: sd,
    designLabel: DESIGN_LABEL[sd],
    domains,
    overallRisk,
    tool,
  };
}

/** 偏倚风险等级中文标签（前端可复用） */
export function biasRiskLabel(level: BiasRiskLevel): string {
  return RISK_LABEL[level] ?? level;
}
