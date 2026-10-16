/**
 * 健澜科技 jlmedaios - 【安全质量与运营】医院应急管理深化聚合器（纯函数）
 *
 * 应急预案要真能用，不能纸上谈兵。本模块把应急管理从"一本手册"做成"可运转体系"：
 *   - buildDeepEmergencySystem：十类突发情景全预案库（火灾/地震/停电/停水/信息系统故障/
 *     传染病暴发/批量伤员/危化品泄漏/恐怖袭击/患者猝死），每套预案含指挥体系、响应阶段、
 *     关键动作、物资清单、通报链条——拿到就能照做，不是原则口号；
 *   - calculateEmergencyRisk：按情景固有风险 × 科室暴露度（在院人数/危重占比/
 *     上次演练成绩/物资缺口）量化打分，分出 high/medium/low，谁该先补短板一目了然；
 *   - optimizeEmergencyDrillSchedule：按风险等级定演练周期（高危 90 天 / 中危 180 天 /
 *     低危 365 天），上次演练不及格自动缩半周期补课——演练不是凑次数，是补能力；
 *   - trackEmergencySupply：物资在库 vs 定额 → 库存缺口；效期 → 30 天内到期预警 / 已过期；
 *     应急物资"账上有"不算数，"效期内、拿得出"才算数；
 *   - evaluateEmergencyTrigger：响应自动化——传感器/监测信号命中触发条件，
 *     自动生成通知链与自动启动动作，把"打电话叫人"压缩成秒级联动。
 *
 * 本模块全部为无副作用纯函数，不触库、便于单测；数据持久化由路由层负责。
 * 医疗安全：本模块为医院安全运营辅助，不替代现场指挥员判断；
 *           自动通知/自动启动仅做"首报与预启动"，现场处置决策仍由值班院领导下达。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

/** 十类应急情景码 */
export type EmergencyScenario =
  | 'fire'
  | 'earthquake'
  | 'power_outage'
  | 'water_outage'
  | 'it_failure'
  | 'outbreak'
  | 'mass_casualty'
  | 'hazmat_spill'
  | 'terror_attack'
  | 'cardiac_arrest';

/** 风险等级 */
export type RiskLevel = 'high' | 'medium' | 'low';

/** 单套深度预案 */
export interface DeepEmergencyPlan {
  scenario: EmergencyScenario;
  scenarioName: string;
  /** 固有风险等级 */
  riskLevel: RiskLevel;
  /** 指挥体系：总指挥 / 现场指挥 / 各专业组 */
  command: { chief: string; onScene: string; groups: string[] };
  /** 响应阶段：预警 → 启动 → 处置 → 恢复，含时限 */
  phases: { phase: string; goal: string; deadline: string }[];
  /** 分阶段关键动作（可直接照做） */
  actions: string[];
  /** 所需物资 / 资源 */
  resources: string[];
  /** 内外部通报链条与时限 */
  communication: { target: string; channel: string; deadlineMin: number }[];
  /** 建议演练周期（天） */
  drillIntervalDays: number;
}

/** 科室风险上下文输入 */
export interface DeptRiskContext {
  /** 在院人数（占用率 0~1） */
  occupancy: number;
  /** 危重/脆弱患者占比（0~1，ICU/新生儿/老年科更高） */
  vulnerableRatio: number;
  /** 科室上次该情景演练成绩 0~100（未演练记 0） */
  lastDrillScore: number;
  /** 该情景物资缺口率 0~1（缺额/定额） */
  supplyGapRatio: number;
}

/** 风险评估结果 */
export interface EmergencyRiskAssessment {
  scenario: EmergencyScenario;
  scenarioName: string;
  score: number;
  level: RiskLevel;
  factors: { name: string; weight: number; contribution: number }[];
  suggestions: string[];
}

/** 演练记录输入 */
export interface LastDrill {
  /** 演练日期 ISO 串 */
  date: string;
  /** 实测加权总分 0~100 */
  score: number;
}

/** 演练排期条目 */
export interface DrillScheduleItem {
  scenario: EmergencyScenario;
  scenarioName: string;
  riskLevel: RiskLevel;
  /** 推荐下次演练日期 ISO */
  nextDrillDate: string;
  /** 距今天数 */
  daysUntil: number;
  /** 因上次不及格而加密排期 */
  accelerated: boolean;
  reason: string;
}

/** 应急物资条目输入 */
export interface EmergencySupplyItem {
  itemCode: string;
  itemName: string;
  location: string;
  scenario: EmergencyScenario;
  requiredQty: number;
  currentQty: number;
  unit: string;
  /** 效期 ISO 串；无保质期物资传 null */
  expiryDate: string | null;
}

/** 物资跟踪结果 */
export interface SupplyTrackResult {
  itemCode: string;
  itemName: string;
  location: string;
  requiredQty: number;
  currentQty: number;
  unit: string;
  expiryDate: string | null;
  /** ok / low_stock / expired / expiring_soon */
  status: 'ok' | 'low_stock' | 'expired' | 'expiring_soon';
  issue: string | null;
}

export interface SupplyTrackSummary {
  total: number;
  okCount: number;
  lowStockCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  items: SupplyTrackResult[];
}

/** 响应自动化：触发信号 */
export interface EmergencyTrigger {
  /** 信号来源，如 fire_panel / ups_monitor / infection_warn / server_watchdog */
  source: string;
  /** 信号关键值，如 { alarm: true, zone: '病房楼' } / { offline: true } */
  values: Record<string, string | number | boolean>;
}

/** 响应自动化：规则 */
export interface ResponseRule {
  ruleCode: string;
  scenario: EmergencyScenario;
  /** 简单触发条件 key == expected，如 { alarm: true } */
  when: Record<string, string | number | boolean>;
  notify: { role: string; channel: string; withinMin: number }[];
  autoActions: string[];
}

/** 响应自动化：命中结果 */
export interface TriggerMatch {
  ruleCode: string;
  scenario: EmergencyScenario;
  notifications: { role: string; channel: string; withinMin: number }[];
  autoActions: string[];
}

/* ============================== 常量 ============================== */

/** 十类情景中文名与固有基础风险分（0~100） */
const SCENARIO_BASE: Record<EmergencyScenario, { name: string; base: number }> = {
  fire: { name: '火灾疏散', base: 85 },
  earthquake: { name: '地震应急', base: 80 },
  power_outage: { name: '停电应急', base: 65 },
  water_outage: { name: '停水应急', base: 45 },
  it_failure: { name: '信息系统故障', base: 70 },
  outbreak: { name: '传染病暴发', base: 80 },
  mass_casualty: { name: '批量伤员', base: 90 },
  hazmat_spill: { name: '危化品泄漏', base: 75 },
  terror_attack: { name: '暴力恐怖袭击', base: 85 },
  cardiac_arrest: { name: '患者猝死抢救', base: 88 },
};

/* ============================== 1. 深度应急体系 ============================== */

/**
 * buildDeepEmergencySystem：十类情景全预案库。
 * 每套预案给出指挥体系 / 四阶段（预警→启动→处置→恢复）/ 关键动作 / 物资 / 通报链条，
 * 拿到就能照做——这是"真能用"的底线：动作清单不空泛、通报有时限、物资有去处。
 */
export function buildDeepEmergencySystem(): DeepEmergencyPlan[] {
  const mk = (
    scenario: EmergencyScenario,
    riskLevel: RiskLevel,
    command: DeepEmergencyPlan['command'],
    phases: DeepEmergencyPlan['phases'],
    actions: string[],
    resources: string[],
    communication: DeepEmergencyPlan['communication'],
    drillIntervalDays: number,
  ): DeepEmergencyPlan => ({
    scenario,
    scenarioName: SCENARIO_BASE[scenario].name,
    riskLevel,
    command,
    phases,
    actions,
    resources,
    communication,
    drillIntervalDays,
  });

  return [
    mk(
      'fire', 'high',
      { chief: '院长 / 值班院领导', onScene: '保卫处处长', groups: ['灭火行动组', '疏散引导组', '医疗救护组', '后勤保障组', '通讯联络组'] },
      [
        { phase: '预警', goal: '确认火情、启动广播', deadline: '1 分钟内' },
        { phase: '启动', goal: '按楼层疏散、初起火灾扑救', deadline: '3 分钟内' },
        { phase: '处置', goal: '清点人员、移交消防', deadline: '10 分钟内' },
        { phase: '恢复', goal: '现场警戒、安置患者', deadline: '2 小时内' },
      ],
      ['按下手动报警按钮并拨打院内线 119', '切断着火区域非消防电源', '按疏散方向引导患者低姿撤离', '危重患者由护理组双人平移转运', '急诊预留绿色通道接收转移患者'],
      ['灭火器 / 消火栓', '应急照明手电筒', '疏散引导棒', '轮椅与平车', '防烟呼吸面罩'],
      [
        { target: '全院广播', channel: '应急广播', deadlineMin: 1 },
        { target: '市消防 119', channel: '电话', deadlineMin: 3 },
        { target: '卫健委值班室', channel: '电话', deadlineMin: 30 },
      ],
      90,
    ),
    mk(
      'earthquake', 'high',
      { chief: '值班院领导', onScene: '医务处处长', groups: ['避震疏散组', '医疗抢救组', '设施抢险组', '安全警戒组'] },
      [
        { phase: '预警', goal: '强报系统触发就地避险', deadline: '即刻' },
        { phase: '启动', goal: '主震后有序疏散、排查伤员', deadline: '5 分钟内' },
        { phase: '处置', goal: '帐篷医院展开、危楼封控', deadline: '1 小时内' },
        { phase: '恢复', goal: '结构安全鉴定后回迁', deadline: '24 小时内' },
      ],
      ['指导患者就近桌下避险', '远离玻璃窗与高大设备', '主震间隙组织疏散', '电梯迫停首层、禁止乘梯', '燃气阀门远程切断'],
      ['应急帐篷', '便携式急救箱', '发电机', '担架', '警戒带'],
      [
        { target: '全院广播', channel: '应急广播', deadlineMin: 1 },
        { target: '应急管理局', channel: '电话', deadlineMin: 15 },
      ],
      180,
    ),
    mk(
      'power_outage', 'high',
      { chief: '后勤保障处处长', onScene: '设备科科长', groups: ['电力切换组', '医疗保障组', '患者安抚组'] },
      [
        { phase: '预警', goal: 'UPS 自动投入、确认市电中断', deadline: '即刻' },
        { phase: '启动', goal: '发电机 15 分钟内带载', deadline: '15 分钟内' },
        { phase: '处置', goal: 'ICU/手术室/急诊优先供电', deadline: '30 分钟内' },
        { phase: '恢复', goal: '市电恢复后有序切回', deadline: '2 小时内' },
      ],
      ['确认 ICU/手术室供电已切 UPS', '启动备用发电机并核载', '非必要科室关闭照明减负', '麻醉机/呼吸机人工备份就位', '电梯迫首层、安抚被困'],
      ['备用发电机', 'UPS 电池组', '应急照明', '手电筒', '人工呼吸囊'],
      [
        { target: '重点科室', channel: '内部对讲', deadlineMin: 2 },
        { target: '供电公司', channel: '电话', deadlineMin: 10 },
      ],
      180,
    ),
    mk(
      'water_outage', 'medium',
      { chief: '后勤保障处处长', onScene: '总务科科长', groups: ['储水调配组', '诊疗保障组'] },
      [
        { phase: '预警', goal: '确认市政停水、启动储水', deadline: '10 分钟内' },
        { phase: '启动', goal: '手术室/ICU 储水优先', deadline: '30 分钟内' },
        { phase: '处置', goal: '启用瓶装/罐装配水', deadline: '1 小时内' },
        { phase: '恢复', goal: '来水后管道冲洗消毒', deadline: '6 小时内' },
      ],
      ['关闭水箱出水阀防倒灌', '优先保障手术与透析用水', '暂停非必要用水诊疗', '紧急水车配送到位', '来水后水箱清洗'],
      ['储水罐', '瓶装水', '送水水车', ['手消凝胶', '消毒湿巾'].join('/')],
      [
        { target: '各科室', channel: '内线电话', deadlineMin: 15 },
        { target: '自来水公司', channel: '电话', deadlineMin: 30 },
      ],
      365,
    ),
    mk(
      'it_failure', 'high',
      { chief: '信息中心主任', onScene: '运维当班工程师', groups: ['系统切换组', '手工诊疗组', '数据恢复组'] },
      [
        { phase: '预警', goal: '监控告警、判定宕机范围', deadline: '5 分钟内' },
        { phase: '启动', goal: '切换手工应急预案（HIS/EMR/PACS）', deadline: '15 分钟内' },
        { phase: '处置', goal: '核心业务降级运行、数据补录', deadline: '2 小时内' },
        { phase: '恢复', goal: '系统回切、数据核对一致', deadline: '4 小时内' },
      ],
      ['启用纸质处方与检查申请单', '门诊改用手工挂号收费', '检查报告电话/纸质传达', '核心数据库主备切换', '事后 24 小时内补录双核对'],
      ['纸质表单箱', '备用病历夹', '离线打印机', '备用服务器'],
      [
        { target: '临床科室', channel: '工作群广播', deadlineMin: 10 },
        { target: '维保厂商', channel: '电话', deadlineMin: 15 },
      ],
      180,
    ),
    mk(
      'outbreak', 'high',
      { chief: '院长', onScene: '感染管理科科长', groups: ['流调组', '隔离管控组', '采样检测组', '物资保障组'] },
      [
        { phase: '预警', goal: '疑似聚集病例上报', deadline: '2 小时内' },
        { phase: '启动', goal: '三区两通道改造、闭环管理', deadline: '4 小时内' },
        { phase: '处置', goal: '全员核酸、密接隔离', deadline: '24 小时内' },
        { phase: '恢复', goal: '连续多轮阴性后解控', deadline: '按卫健指令' },
      ],
      ['启动传染病网络直报', '划定隔离/缓冲/清洁三区', '医护二级以上防护', '限制探视与陪护', '环境终末消毒'],
      ['防护服/N95', ['手消', '消毒剂'].join('/'), '采样拭子', ['隔离病房', '负压病房'].join('/')],
      [
        { target: '疾控中心', channel: '网络直报+电话', deadlineMin: 120 },
        { target: '全院职工', channel: 'OA 通知', deadlineMin: 60 },
      ],
      90,
    ),
    mk(
      'mass_casualty', 'high',
      { chief: '院长', onScene: '急诊医学科主任', groups: ['检伤分类组', '抢救组', '后送组', '血库保障组'] },
      [
        { phase: '预警', goal: '接到批量伤员通知、预估人数', deadline: '10 分钟内' },
        { phase: '启动', goal: '红色/黄色/绿色分区检伤', deadline: '15 分钟内' },
        { phase: '处置', goal: '手术/输血/ICU 床位腾空', deadline: '30 分钟内' },
        { phase: '恢复', goal: '伤员分流后送、物资补给', deadline: '6 小时内' },
      ],
      ['开通绿色通道免挂号先救治', 'START 检伤分类挂牌', '取消择期手术腾空手术室', '血库紧急备血', '协调兄弟医院后送分流'],
      ['检伤分类牌', '夹板/止血带', '紧急用血', '空床平车', '对讲机'],
      [
        { target: '120 指挥中心', channel: '电话', deadlineMin: 10 },
        { target: '卫健委', channel: '电话', deadlineMin: 30 },
      ],
      90,
    ),
    mk(
      'hazmat_spill', 'medium',
      { chief: '后勤保障处处长', onScene: '保卫处处长', groups: ['洗消组', '疏散组', '监测组'] },
      [
        { phase: '预警', goal: '确认泄漏物品种类与量', deadline: '5 分钟内' },
        { phase: '启动', goal: '划定警戒区、人员向上风疏散', deadline: '10 分钟内' },
        { phase: '处置', goal: '吸附围堵、专业洗消', deadline: '30 分钟内' },
        { phase: '恢复', goal: '空气检测达标后解封', deadline: '2 小时内' },
      ],
      ['查阅 MSDS 确认危害性', '切断火源/电源', '疏散下风向人员', '穿戴防护后围堵吸附', '接触人员医学观察'],
      ['防化服', '吸附棉/围堵栏', ['洗眼器', '冲淋装置'].join('/'), '气体检测仪'],
      [
        { target: '现场人员', channel: '广播', deadlineMin: 5 },
        { target: '应急管理/生态环境', channel: '电话', deadlineMin: 30 },
      ],
      365,
    ),
    mk(
      'terror_attack', 'high',
      { chief: '保卫处处长（现场）', onScene: '值班院领导', groups: ['封控组', '报警联络组', '医疗救治组'] },
      [
        { phase: '预警', goal: '一键报警、启动安防联动', deadline: '即刻' },
        { phase: '启动', goal: '出入口封控、就近人员隐蔽', deadline: '3 分钟内' },
        { phase: '处置', goal: '配合警方、伤员救治', deadline: '10 分钟内' },
        { phase: '恢复', goal: '现场保护与心理疏导', deadline: '事件结束后' },
      ],
      ['按下一键报警按钮联动 110', '锁闭科室门禁', '指导患者家属就地隐蔽', '伤员按批量伤员预案救治', '配合警方调取监控'],
      ['防暴钢叉/盾牌', '门禁电控锁', '一键报警装置', '急救箱'],
      [
        { target: '110', channel: '一键报警', deadlineMin: 1 },
        { target: '全院', channel: '应急广播', deadlineMin: 3 },
      ],
      180,
    ),
    mk(
      'cardiac_arrest', 'high',
      { chief: '值班护士长按应急代码启动', onScene: '值班医师', groups: ['CPR 组', '气道组', '记录组'] },
      [
        { phase: '预警', goal: '发现患者倒地、呼叫代码蓝', deadline: '即刻' },
        { phase: '启动', goal: '3 分钟内抢救团队到位', deadline: '3 分钟内' },
        { phase: '处置', goal: 'CPR + AED + 气道管理', deadline: '持续至复苏' },
        { phase: '恢复', goal: '复苏后 ICU 交接、事件复盘', deadline: '24 小时内复盘' },
      ],
      ['立即胸外按压不停顿', '推抢救车与 AED 到位', '建立气道与给药通路', '记录抢救时间节点', '复苏后转入 ICU'],
      ['抢救车', 'AED', '喉镜/气管插管包', '急救药品'],
      [
        { target: '抢救团队', channel: '代码广播', deadlineMin: 1 },
        { target: '科主任', channel: '电话', deadlineMin: 5 },
      ],
      90,
    ),
  ];
}

/* ============================== 2. 应急风险评估 ============================== */

/**
 * calculateEmergencyRisk：情景固有风险为底数，按科室暴露度折算。
 * score = 基础分×0.5 + 占用率×15 + 脆弱患者占比×20 + (1-上次演练达标率)×15 + 物资缺口×10，
 * 截到 0~100。≥70 high / 40~69 medium / <40 low。
 */
export function calculateEmergencyRisk(
  scenario: EmergencyScenario,
  dept: DeptRiskContext,
): EmergencyRiskAssessment {
  const meta = SCENARIO_BASE[scenario];
  const drillGap = Math.max(0, 1 - dept.lastDrillScore / 100);

  const factors = [
    { name: '情景固有风险', weight: 0.5, contribution: meta.base * 0.5 },
    { name: '在院占用压力', weight: 15, contribution: Math.min(1, dept.occupancy) * 15 },
    { name: '危重脆弱患者占比', weight: 20, contribution: Math.min(1, dept.vulnerableRatio) * 20 },
    { name: '上次演练不达标缺口', weight: 15, contribution: drillGap * 15 },
    { name: '应急物资缺口', weight: 10, contribution: Math.min(1, dept.supplyGapRatio) * 10 },
  ];

  const score = Math.round(
    Math.max(0, Math.min(100, factors.reduce((s, f) => s + f.contribution, 0))),
  );
  const level: RiskLevel = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

  const suggestions: string[] = [];
  if (drillGap > 0.3) suggestions.push('上次演练成绩偏低，建议 90 天内安排复训演练');
  if (dept.supplyGapRatio > 0.2) suggestions.push('应急物资低于定额，优先补齐');
  if (dept.vulnerableRatio > 0.5) suggestions.push('脆弱患者占比高，疏散/转运预案需双人复核');
  if (suggestions.length === 0) suggestions.push('当前风险可控，按周期例行演练即可');

  return { scenario, scenarioName: meta.name, score, level, factors, suggestions };
}

/* ============================== 3. 演练排期优化 ============================== */

/**
 * optimizeEmergencyDrillSchedule：
 * 风险等级定周期（high 90 / medium 180 / low 365 天）；
 * 上次演练 <70 分者周期减半补课；距上次演练越久越优先。
 */
export function optimizeEmergencyDrillSchedule(
  plans: DeepEmergencyPlan[],
  lastDrills: Partial<Record<EmergencyScenario, LastDrill>>,
  nowIso: string,
): DrillScheduleItem[] {
  const now = new Date(nowIso).getTime();
  const DAY = 24 * 3600 * 1000;

  const items = plans.map((p) => {
    const drill = lastDrills[p.scenario];
    const baseDays = p.riskLevel === 'high' ? 90 : p.riskLevel === 'medium' ? 180 : 365;
    // 上次不及格（<70）自动加密排期
    const accelerated = !!drill && drill.score < 70;
    const intervalDays = accelerated ? Math.floor(baseDays / 2) : baseDays;

    const lastTime = drill ? new Date(drill.date).getTime() : now; // 从未演练视同"今天就该练"
    const nextTime = drill ? lastTime + intervalDays * DAY : now;
    const daysUntil = Math.round((nextTime - now) / DAY);
    const overdue = !drill || daysUntil <= 0;

    return {
      scenario: p.scenario,
      scenarioName: p.scenarioName,
      riskLevel: p.riskLevel,
      nextDrillDate: new Date(nextTime).toISOString().slice(0, 10),
      daysUntil,
      accelerated,
      reason: drill
        ? accelerated
          ? `上次演练 ${drill.score} 分不达标，周期加密至 ${intervalDays} 天`
          : `按${p.riskLevel === 'high' ? '高危' : p.riskLevel === 'medium' ? '中危' : '低危'} ${intervalDays} 天周期排期`
        : '从未演练，立即排入首轮实战演练',
      overdue,
    } as DrillScheduleItem & { overdue: boolean };
  });

  // 逾期最急在前：已逾期(overdue)优先，其次距今天数小者
  return items.sort((a, b) => {
    const ax = a as DrillScheduleItem & { overdue: boolean };
    const bx = b as DrillScheduleItem & { overdue: boolean };
    if (ax.overdue !== bx.overdue) return ax.overdue ? -1 : 1;
    return a.daysUntil - b.daysUntil;
  });
}

/* ============================== 4. 应急物资跟踪 ============================== */

/**
 * trackEmergencySupply：库存 < 定额记 low_stock；
 * 效期已过记 expired；30 天内到期记 expiring_soon；其余 ok。
 */
export function trackEmergencySupply(
  items: EmergencySupplyItem[],
  nowIso: string,
): SupplyTrackSummary {
  const now = new Date(nowIso).getTime();
  const DAY = 24 * 3600 * 1000;
  const results: SupplyTrackResult[] = items.map((it) => {
    let status: SupplyTrackResult['status'] = 'ok';
    let issue: string | null = null;

    if (it.expiryDate) {
      const exp = new Date(it.expiryDate).getTime();
      const daysToExpiry = Math.round((exp - now) / DAY);
      if (daysToExpiry < 0) {
        status = 'expired';
        issue = `已过期 ${-daysToExpiry} 天，须立即下架更换`;
      } else if (daysToExpiry <= 30) {
        status = 'expiring_soon';
        issue = `${daysToExpiry} 天内到期，提前请领更换`;
      }
    }
    if (it.currentQty < it.requiredQty) {
      status = 'low_stock';
      issue = `库存 ${it.currentQty}${it.unit}，低于定额 ${it.requiredQty}${it.unit}`;
    }

    return {
      itemCode: it.itemCode,
      itemName: it.itemName,
      location: it.location,
      requiredQty: it.requiredQty,
      currentQty: it.currentQty,
      unit: it.unit,
      expiryDate: it.expiryDate,
      status,
      issue,
    };
  });

  return {
    total: results.length,
    okCount: results.filter((r) => r.status === 'ok').length,
    lowStockCount: results.filter((r) => r.status === 'low_stock').length,
    expiredCount: results.filter((r) => r.status === 'expired').length,
    expiringSoonCount: results.filter((r) => r.status === 'expiring_soon').length,
    items: results,
  };
}

/* ============================== 5. 响应自动化 ============================== */

/**
 * evaluateEmergencyTrigger：触发信号命中规则 when 全部键值相等，即输出
 * 自动通知链与自动启动动作。多规则可同时命中（如火灾同时触发疏散+通报）。
 */
export function evaluateEmergencyTrigger(
  trigger: EmergencyTrigger,
  rules: ResponseRule[],
): TriggerMatch[] {
  return rules
    .filter((rule) =>
      Object.entries(rule.when).every(
        ([k, v]) => trigger.values[k] !== undefined && trigger.values[k] === v,
      ),
    )
    .map((rule) => ({
      ruleCode: rule.ruleCode,
      scenario: rule.scenario,
      notifications: rule.notify.map((n) => ({ ...n })),
      autoActions: [...rule.autoActions],
    }));
}
