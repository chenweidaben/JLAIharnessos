/**
 * 健澜科技 jlmedaios — 【质量与新场景】AI 医院大脑 · 深度智能预警体系（M175-B）
 *
 * 「AI 预警要真有用，不能只说建议关注」：
 *   - 每条预警必须带证据链（当前值 vs 阈值、偏离幅度、事实条目），不是一句空话；
 *   - 每条预警必须给出可落地处置（具体措施 / 责任岗 / SLA 时限 / 量化目标），
 *     而不是「建议关注」；
 *   - 预警全生命周期闭环：检出 → 优先级排序 → 处置 → 闭环跟踪（是否按时限解决）。
 *
 * 四大类预警（共 12 类阈值化触发，阈值取行业通行警戒线，不自创预警语义）：
 *   - 医疗质量：病历缺陷率 / 不合理处方率 / 手术并发症发生率；
 *   - 运营效率：床位占用率 / 门诊平均候诊时长 / 重点药品缺货天数；
 *   - 安全合规：7 日院感聚集病例 / 关键医疗设备停机 / 核心业务系统可用率；
 *   - 财务经营：DRG 病组超支率 / 医保拒付率 / 科室成本超预算率。
 *
 * 四个纯函数（不触库、不发网络、无副作用，便于单测）：
 *   - buildDeepAIAlert(signals, nowIso?)：按阈值目录把院级信号评估成结构化预警；
 *   - prioritizeAIAlert(alerts)：按 严重度 × 类别权重 × 偏离度 算优先级分并降序；
 *   - generateAIAlertAction(alert)：按预警编码映射可落地处置建议（措施/责任/SLA/目标）；
 *   - trackAIAlertResolution(alertId, resolution)：闭环跟踪，判定是否 SLA 内销项。
 *
 * 医疗安全红线：
 *   * 院感聚集、核心系统不可用、关键设备停机等安全类预警，任何越线即至少 warning，
 *     严重越线直接 critical，禁止淡化；
 *   * 预警仅为管理辅助，不替代临床诊疗与院感流行病学调查；
 *   * 未登记入阈值目录的信号一律忽略，防止「自创预警」污染告警。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 四大预警类别 */
export type AlertCategory = 'quality' | 'operations' | 'safety' | 'finance';

/** 预警严重度：critical 红线 / warning 黄线 / info 提示 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/** 指标方向：lower_better 越低越好（越线即向上突破），higher_better 越高越好（向下跌破） */
export type AlertDirection = 'lower_better' | 'higher_better';

/** 一条预警阈值定义（唯一事实来源） */
export interface AlertDef {
  /** 预警编码（稳定主键） */
  code: string;
  /** 预警名称 */
  name: string;
  /** 所属类别 */
  category: AlertCategory;
  /** 计量单位 */
  unit: string;
  /** 方向 */
  direction: AlertDirection;
  /** 警戒线：lower_better 时 current>threshold 触发；higher_better 时 current<threshold 触发 */
  threshold: number;
  /** 口径说明 */
  caliber: string;
}

/** 一条院级实时信号（一次采样） */
export interface AlertSignal {
  code: string;
  current: number;
}

/** 结构化深度 AI 预警 */
export interface DeepAIAlert {
  /** 预警实例 ID（由 code + 检出时间派生，纯函数确定性） */
  id: string;
  code: string;
  title: string;
  category: AlertCategory;
  severity: AlertSeverity;
  unit: string;
  current: number;
  threshold: number;
  direction: AlertDirection;
  /** 向坏方向的绝对偏离（current - threshold，越线时为正） */
  deviation: number;
  /** 向坏方向的相对偏离百分比（%） */
  deviationPct: number;
  /** 证据链：具体事实条目，不空泛 */
  evidence: string[];
  /** 优先级综合分（0~100），越大越优先 */
  score: number;
  /** 预警状态：检出即 open */
  status: 'open';
  detectedAt: string;
}

/** 深度预警体系输出 */
export interface DeepAIAlertSystem {
  generatedAt: string;
  alerts: DeepAIAlert[];
  /** 各类别预警计数 */
  summary: Record<AlertCategory, number>;
  /** critical 条数 */
  criticalCount: number;
}

/** 处置建议输出 */
export interface AIAlertAction {
  alertId: string;
  code: string;
  /** 处置措施（具体动作，不是「建议关注」） */
  measure: string;
  /** 责任岗位 */
  owner: string;
  /** SLA 时限（小时） */
  slaHours: number;
  /** 量化目标 */
  target: string;
  /** 建议先做的第一步（30 分钟内可启动） */
  firstStep: string;
}

/** 闭环处置录入 */
export interface AlertResolution {
  /** 处置人岗位 */
  resolvedBy: string;
  /** 实际闭环时间 ISO */
  resolvedAt: string;
  /** 处置结果：已整改 / 接受风险 / 误报 */
  outcome: 'fixed' | 'accepted_risk' | 'false_alarm';
  /** 整改说明 */
  note?: string;
  /** 预警检出时间（由告警记录带回，便于纯函数计算 SLA） */
  detectedAt: string;
  /** 预警等级（用于查 SLA 时限） */
  severity: AlertSeverity;
  /** 预警编码（回填闭环记录） */
  code: string;
}

/** 闭环跟踪记录 */
export interface AlertResolutionRecord {
  alertId: string;
  code: string;
  resolvedBy: string;
  resolvedAt: string;
  outcome: AlertResolution['outcome'];
  /** closed 已整改销项 / accepted 接受风险 / dismissed 误报排除 */
  closedLoopStatus: 'closed' | 'accepted' | 'dismissed';
  /** 该等级允许的 SLA 时限（小时） */
  slaHours: number;
  /** 检出 → 闭环实际耗时（小时） */
  actualHours: number;
  /** 是否在 SLA 内闭环 */
  slaMet: boolean;
  /** 一句话闭环结论 */
  summary: string;
}

// ---------------------------------------------------------------------------
// 预警阈值目录（唯一事实来源；不自创预警语义）
// ---------------------------------------------------------------------------

export const ALERT_CATEGORY_NAMES: Record<AlertCategory, string> = {
  quality: '医疗质量',
  operations: '运营效率',
  safety: '安全合规',
  finance: '财务经营',
};

/**
 * 12 类预警阈值目录。
 * 阈值为行业通行警戒线；安全类任何越线即预警，严重越线直接 critical。
 */
export const ALERT_CATALOG: AlertDef[] = [
  // —— 医疗质量 ——
  { code: 'MED_RECORD_DEFECT_RATE', name: '病历缺陷率', category: 'quality', unit: '%', direction: 'lower_better', threshold: 5, caliber: '抽查运行/出院病历中缺陷病历占比' },
  { code: 'MED_PRESCRIPTION_IRRATIONAL_RATE', name: '不合理处方率', category: 'quality', unit: '%', direction: 'lower_better', threshold: 3, caliber: '处方点评中不合理处方占比' },
  { code: 'MED_SURGICAL_COMPLICATION_RATE', name: '手术并发症发生率', category: 'quality', unit: '%', direction: 'lower_better', threshold: 3, caliber: '手术并发症例数 / 同期手术总例数' },

  // —— 运营效率 ——
  { code: 'OPS_BED_OCCUPANCY', name: '床位占用率', category: 'operations', unit: '%', direction: 'lower_better', threshold: 95, caliber: '实际占用总床日 / 实际开放总床日' },
  { code: 'OPS_OUTPATIENT_WAIT_MIN', name: '门诊平均候诊时长', category: 'operations', unit: '分钟', direction: 'lower_better', threshold: 40, caliber: '挂号到就诊平均等待时间' },
  { code: 'OPS_KEY_DRUG_SHORTAGE_DAYS', name: '重点药品缺货天数', category: 'operations', unit: '天', direction: 'lower_better', threshold: 3, caliber: '急救/重点监控药品连续缺货天数' },

  // —— 安全合规 ——
  { code: 'SAF_HAI_CLUSTER_7D', name: '7 日院感聚集病例数', category: 'safety', unit: '例', direction: 'lower_better', threshold: 3, caliber: '同一病区 7 日内同源/疑似同源院感病例数' },
  { code: 'SAF_KEY_EQUIP_DOWN_HOURS', name: '关键医疗设备停机时长', category: 'safety', unit: '小时/周', direction: 'lower_better', threshold: 4, caliber: 'CT/核磁/呼吸机/监护等关键设备非计划停机周累计时长' },
  { code: 'SAF_SYSTEM_AVAILABILITY', name: '核心业务系统可用率', category: 'safety', unit: '%', direction: 'higher_better', threshold: 99.9, caliber: 'HIS/EMR/PACS 月度可用率（在线时长/总时长）' },

  // —— 财务经营 ——
  { code: 'FIN_DRG_OVERRUN_RATE', name: 'DRG 病组超支率', category: 'finance', unit: '%', direction: 'lower_better', threshold: 8, caliber: '超支病组费用 / 相应 DRG 支付标准' },
  { code: 'FIN_INSURANCE_REJECT_RATE', name: '医保拒付率', category: 'finance', unit: '%', direction: 'lower_better', threshold: 2, caliber: '医保拒付金额 / 当期医保申报金额' },
  { code: 'FIN_COST_OVER_BUDGET_RATE', name: '科室成本超预算率', category: 'finance', unit: '%', direction: 'lower_better', threshold: 5, caliber: '(实际成本-预算成本)/预算成本' },
];

/** 由 code 查预警定义；未登记返回 undefined（禁止自创预警参与计算） */
export function findAlertDef(code: string): AlertDef | undefined {
  return ALERT_CATALOG.find((a) => a.code === code);
}

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 是否越线（向坏方向突破阈值） */
function isBreached(def: AlertDef, current: number): boolean {
  return def.direction === 'lower_better' ? current > def.threshold : current < def.threshold;
}

/** 向坏方向的绝对偏离（越线为正） */
function badDeviation(def: AlertDef, current: number): number {
  return def.direction === 'lower_better' ? current - def.threshold : def.threshold - current;
}

/**
 * 判定严重度：
 *   - 安全类越线，且偏离 ≥ 50% 或系统可用率跌破 99.5% → critical；
 *   - 偏离 ≥ 50%（其他类别）→ critical；
 *   - 越线但偏离 < 50% → warning；
 *   - 理论 info 预留（本目录越线即至少 warning）。
 */
function resolveSeverity(def: AlertDef, deviationPct: number): AlertSeverity {
  if (def.category === 'safety') {
    if (deviationPct >= 50) return 'critical';
    // 核心系统可用率跌破 99.5% 视为红线
    if (def.code === 'SAF_SYSTEM_AVAILABILITY' && deviationPct >= 0.4) return 'critical';
    return 'warning';
  }
  return deviationPct >= 50 ? 'critical' : 'warning';
}

/** 类别权重（安全 > 质量 > 财务 > 运营），用于优先级分 */
const CATEGORY_WEIGHT: Record<AlertCategory, number> = {
  safety: 25,
  quality: 15,
  finance: 10,
  operations: 5,
};

/** 严重度权重 */
const SEVERITY_WEIGHT: Record<AlertSeverity, number> = {
  critical: 60,
  warning: 30,
  info: 10,
};

/** SLA 时限（小时）：红线 2h / 黄线 24h / 提示 72h */
export const ALERT_SLA_HOURS: Record<AlertSeverity, number> = {
  critical: 2,
  warning: 24,
  info: 72,
};

// ---------------------------------------------------------------------------
// 纯函数一：构建深度 AI 预警体系
// ---------------------------------------------------------------------------

/**
 * 把院级实时信号按阈值目录评估成结构化预警。
 *
 * - 仅评估目录内 code（未登记信号忽略，防自创预警）；
 * - 未越线不产出预警；
 * - 越线即生成：证据链（当前 vs 阈值 / 偏离）+ 初始优先级分；
 * - id 由 code + 检出时间派生，纯函数确定性。
 *
 * @param signals 院级实时信号采样
 * @param nowIso  检出时间（可选，便于测试断言；缺省当前 ISO）
 */
export function buildDeepAIAlert(signals: AlertSignal[], nowIso?: string): DeepAIAlertSystem {
  const detectedAt = nowIso ?? new Date().toISOString();
  const summary: Record<AlertCategory, number> = { quality: 0, operations: 0, safety: 0, finance: 0 };
  const alerts: DeepAIAlert[] = [];

  for (const s of signals) {
    const def = findAlertDef(s.code);
    if (!def) continue; // 未登记预警，不参与判定
    if (!Number.isFinite(s.current)) continue;
    if (!isBreached(def, s.current)) continue; // 未越线，不预警

    const deviation = round2(badDeviation(def, s.current));
    const base = Math.abs(def.threshold) < 1e-9 ? 1 : Math.abs(def.threshold);
    const deviationPct = round2((deviation / base) * 100);
    const severity = resolveSeverity(def, deviationPct);

    const badWord = def.direction === 'lower_better' ? '高于警戒线' : '低于警戒线';
    const evidence = [
      `${def.name}当前 ${s.current}${def.unit}，${badWord} ${def.threshold}${def.unit}`,
      `向坏方向偏离 ${deviation}${def.unit}（${deviationPct}%）`,
      `口径：${def.caliber}`,
    ];

    const score = round2(
      Math.min(100, SEVERITY_WEIGHT[severity] + CATEGORY_WEIGHT[def.category] + Math.min(25, deviationPct / 2)),
    );

    alerts.push({
      id: `ALT-${def.code}-${detectedAt.slice(0, 10)}`,
      code: def.code,
      title: `${ALERT_CATEGORY_NAMES[def.category]}预警：${def.name}越线`,
      category: def.category,
      severity,
      unit: def.unit,
      current: s.current,
      threshold: def.threshold,
      direction: def.direction,
      deviation,
      deviationPct,
      evidence,
      score,
      status: 'open',
      detectedAt,
    });

    summary[def.category] += 1;
  }

  return {
    generatedAt: detectedAt,
    alerts,
    summary,
    criticalCount: alerts.filter((a) => a.severity === 'critical').length,
  };
}

// ---------------------------------------------------------------------------
// 纯函数二：预警优先级排序
// ---------------------------------------------------------------------------

/**
 * 对预警做优先级排序。
 * 排序键：综合分 score 降序 → 同级按偏离度 deviationPct 降序 → 同级按类别权重降序。
 * 返回新数组，不修改入参（纯函数）。
 *
 * @param alerts 检出的预警列表
 */
export function prioritizeAIAlert(alerts: DeepAIAlert[]): DeepAIAlert[] {
  return [...alerts].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.deviationPct !== a.deviationPct) return b.deviationPct - a.deviationPct;
    return CATEGORY_WEIGHT[b.category] - CATEGORY_WEIGHT[a.category];
  });
}

// ---------------------------------------------------------------------------
// 纯函数三：预警处置建议（可落地，不是「建议关注」）
// ---------------------------------------------------------------------------

/** 处置措施规则库：按预警 code 映射到具体措施 + 责任岗 + 第一步动作 */
const ACTION_RULES: Array<{
  match: RegExp;
  measure: string;
  owner: string;
  firstStep: string;
  target: string;
}> = [
  { match: /RECORD_DEFECT/i, measure: '运行病历质控前置：48h 内拉出缺陷病历清单反馈主管医师返修，缺陷率偏高医师纳入一对一带教与月度通报', owner: '质控科 / 病案室', firstStep: '立即导出本周缺陷病历清单，按科室与主管医师分组', target: '病历缺陷率回落至 ≤5%' },
  { match: /PRESCRIPTION_IRRATIONAL/i, measure: '处方前置审核药师 100% 拦截：不合理处方当日反馈医师修正，周度不合理处方专项点评并约谈 Top3 科室', owner: '药学部', firstStep: '调取当日前置审核拦截记录，定位高频不合理用药类别', target: '不合理处方率回落至 ≤3%' },
  { match: /SURGICAL_COMPLICATION/i, measure: '围术期并发症日清单追踪：主刀 24h 内根因分析（RCA），复核手术分级授权与术前讨论执行率', owner: '医务科 / 外科教研室', firstStep: '逐例登记近 7 日并发症，按术式与主刀分层', target: '手术并发症发生率回落至 ≤3%' },
  { match: /BED_OCCUPANCY/i, measure: '启动床位应急调度：开放加床/日间手术分流/平均住院日专项压减，与门诊错峰预约联动', owner: '医务科 / 护理部 / 门诊部', firstStep: '统计各病区空床与待入院名单，优先调度急危重症', target: '床位占用率回落至 ≤95%' },
  { match: /OUTPATIENT_WAIT/i, measure: '门诊峰时扩容：增加高峰时段医师出诊与弹性窗口，检查检验分时段预约，实时叫号大屏引导', owner: '门诊部', firstStep: '按时段拆解今日候诊分布，找出排队最长的科室与号源池', target: '平均候诊时长压减至 ≤40 分钟' },
  { match: /KEY_DRUG_SHORTAGE/i, measure: '重点药品应急补货：启用应急采购/院内替代用药清单，联动药学部与供货厂商 24h 内补货，发布临床替代指引', owner: '药学部 / 设备物资科', firstStep: '核对缺货急救药库存与在途订单，确认替代药品可用性', target: '重点药品连续缺货天数压减至 ≤3 天' },
  { match: /HAI_CLUSTER/i, measure: '院感暴发应急：立即隔离同源病例、封闭相关病区环境采样、手卫生与消毒灭菌强化督查，上报院感委员会并启动流调', owner: '院感科 / 相关病区', firstStep: '核实聚集病例的时间-空间-病原体分布，划定疫点范围', target: '7 日同源聚集病例控制在 ≤3 例并阻断续发' },
  { match: /KEY_EQUIP_DOWN/i, measure: '关键设备应急：启用备用设备/院内跨区调度，联系厂商驻场抢修，建立设备预防性维护台账', owner: '医学工程科', firstStep: '确认停机设备清单与临床替代方案，优先恢复急救/生命支持类', target: '关键设备周停机时长压减至 ≤4 小时' },
  { match: /SYSTEM_AVAILABILITY/i, measure: '信息系统应急切换：启动降级预案（手工/离线流程），排查故障根因并复盘高可用架构，关键系统双活校验', owner: '信息科', firstStep: '确认 HIS/EMR/PACS 当前可用性与影响科室，切换手工应急流程', target: '核心系统可用率恢复至 ≥99.9%' },
  { match: /DRG_OVERRUN/i, measure: 'DRG 超支病组专项：梳理高倍率/低倍率病例，规范临床路径与成本采集，不合理用药与耗材事前管控', owner: '医保办 / 医务科', firstStep: '拉出超支 TOP10 病组，拆解药品/耗材/检查成本结构', target: 'DRG 病组超支率压减至 ≤8%' },
  { match: /INSURANCE_REJECT/i, measure: '医保拒付复盘：逐笔核对拒付理由（病案首页/适应症/收费明细），反馈临床与收费窗口整改，建立拒付预警规则', owner: '医保办 / 收费处', firstStep: '导出近月拒付明细，按拒付原因归类占比', target: '医保拒付率压减至 ≤2%' },
  { match: /COST_OVER_BUDGET/i, measure: '科室预算执行分析：超支科目（人力/耗材/能耗）逐项归因，启动月度预算纠偏与耗材高值管控', owner: '财务科 / 绩效办', firstStep: '比对各科目预算执行进度，锁定超支最快的 3 个科目', target: '科室成本超预算率压减至 ≤5%' },
];

/** 兜底处置（未命中规则库） */
const DEFAULT_ACTION = {
  measure: '按 PDCA 开展根因分析（RCA），制定量化整改目标并在下一周期复测前后对比',
  owner: '质控科',
  firstStep: '拉取该指标近 30 日明细数据，确认异常范围与关联因素',
  target: '指标回落至警戒线以内',
};

/**
 * 生成单条预警的可落地处置建议。
 *
 * @param alert 已检出的深度预警
 */
export function generateAIAlertAction(alert: DeepAIAlert): AIAlertAction {
  const hit = ACTION_RULES.find((r) => r.match.test(alert.code));
  const rule = hit ?? DEFAULT_ACTION;
  const slaHours = ALERT_SLA_HOURS[alert.severity];

  return {
    alertId: alert.id,
    code: alert.code,
    measure: rule.measure,
    owner: rule.owner,
    slaHours,
    target: rule.target,
    firstStep: rule.firstStep,
  };
}

// ---------------------------------------------------------------------------
// 纯函数四：预警闭环跟踪
// ---------------------------------------------------------------------------

/**
 * 预警闭环跟踪：判定是否在 SLA 时限内销项，并生成一句话闭环结论。
 *
 * @param alertId   预警实例 ID
 * @param resolution 闭环录入（含检出时间与等级，用于 SLA 计算）
 */
export function trackAIAlertResolution(
  alertId: string,
  resolution: AlertResolution,
): AlertResolutionRecord {
  const slaHours = ALERT_SLA_HOURS[resolution.severity];
  const detectedMs = new Date(resolution.detectedAt).getTime();
  const resolvedMs = new Date(resolution.resolvedAt).getTime();
  const actualHours = Number.isFinite(detectedMs) && Number.isFinite(resolvedMs)
    ? round2(Math.max(0, (resolvedMs - detectedMs) / 3_600_000))
    : 0;
  const slaMet = actualHours <= slaHours;

  const closedLoopStatus: AlertResolutionRecord['closedLoopStatus'] =
    resolution.outcome === 'fixed' ? 'closed'
    : resolution.outcome === 'accepted_risk' ? 'accepted'
    : 'dismissed';

  const statusText =
    closedLoopStatus === 'closed' ? '已整改销项'
    : closedLoopStatus === 'accepted' ? '接受风险并备案'
    : '误报已排除';

  const summary =
    `预警 ${alertId} 由 ${resolution.resolvedBy} 于 ${resolution.resolvedAt} 闭环，` +
    `${statusText}；实际耗时 ${actualHours}h（SLA ${slaHours}h，${slaMet ? '达标' : '超时'}）。` +
    (resolution.note ? ` 整改说明：${resolution.note}` : '');

  return {
    alertId,
    code: resolution.code,
    resolvedBy: resolution.resolvedBy,
    resolvedAt: resolution.resolvedAt,
    outcome: resolution.outcome,
    closedLoopStatus,
    slaHours,
    actualHours,
    slaMet,
    summary,
  };
}
