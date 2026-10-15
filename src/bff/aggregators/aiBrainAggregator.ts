/**
 * 健澜科技 jlmedaios - AI 医院大脑实时大屏聚合器（M156-B，集团与科研）
 *
 * 【集团与科研】把全院实时运行态势收敛为一块大屏：
 *   1. buildHospitalBrain(seed?)：聚合实时门诊 / 住院 / 手术 / 预警四类指标，
 *      返回 HospitalBrain；当前为演示模式（demo=true），后续平滑替换为
 *      HIS / EMR / 手麻 / LIS / 药学系统的实时聚合源，函数签名不变。
 *   2. generateAIBrainSuggestion(metrics)：基于实时阈值，产出 AI 建议列表
 *      BrainSuggestion[]（高 / 中 / 低优先级 + 建议处置动作）。
 *
 * 「实时，不能静态」的实现方式：
 *   - 本模块不触碰 WebSocket；由前端定时轮询 GET /api/v1/ai-brain/realtime，
 *     每次轮询 buildHospitalBrain 都按当前分钟桶生成带轻微漂移的演示计数，
 *     配合 generatedAt 时间戳形成「活的大屏」观感；
 *   - seed 可注入（测试固定 seed 保证可复现；路由不传则取当前分钟桶）。
 *
 * 医疗安全红线：本模块仅产出科室 / 院区聚合计数，不含患者 PII；
 *   AI 建议为辅助决策，最终由值班院领导 / 科主任本人确认并执行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 实时门诊量 */
export interface OutpatientMetrics {
  /** 当前在院候诊（大厅 + 候诊区实时排队人数） */
  inWaiting: number;
  /** 今日累计挂号人次 */
  todayRegistered: number;
  /** 今日累计就诊人次 */
  todayVisited: number;
}

/** 实时住院量 */
export interface InpatientMetrics {
  /** 当前在院人数 */
  inHospital: number;
  /** 今日累计入院人数 */
  todayAdmitted: number;
  /** 今日累计出院人数 */
  todayDischarged: number;
  /** 核定床位总数 */
  totalBeds: number;
  /** 床位使用率（%）= 在院 / 核定床位 ×100，保留一位小数 */
  bedRate: number;
}

/** 实时手术 */
export interface SurgeryMetrics {
  /** 此刻正在进行的手术间数 */
  inProgress: number;
  /** 今日已完成手术台数 */
  completedToday: number;
  /** 明日排程手术台数 */
  tomorrowScheduled: number;
}

/** 实时预警计数（待处置条数） */
export interface WarningMetrics {
  /** 危急值待处理（LIS / 心电等） */
  criticalValues: number;
  /** 院感预警待处置 */
  infection: number;
  /** 药品库存低于安全线 */
  drugStock: number;
  /** 关键设备故障待修 */
  equipmentFault: number;
}

/** buildHospitalBrain 返回的全院大脑实时快照 */
export interface HospitalBrain {
  /** 快照生成时刻（ISO 字符串，大屏时钟用） */
  generatedAt: string;
  /** 固定标记：演示模式数据，前端须显式标注「演示数据」 */
  demo: true;
  /** 数据来源：demo 演示 / live 实时聚合（后续替换） */
  dataSource: 'demo' | 'live';
  hospital: {
    code: string;
    name: string;
  };
  outpatient: OutpatientMetrics;
  inpatient: InpatientMetrics;
  surgery: SurgeryMetrics;
  warnings: WarningMetrics;
}

/** AI 建议优先级 */
export type SuggestionPriority = 'high' | 'medium' | 'low';

/** AI 建议所属域 */
export type SuggestionCategory = 'outpatient' | 'inpatient' | 'surgery' | 'warning';

/** generateAIBrainSuggestion 返回的单条 AI 建议 */
export interface BrainSuggestion {
  /** 建议唯一标识（category + 序号） */
  id: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  title: string;
  /** 人话文案：基于哪条实时数据得出 */
  message: string;
  /** 建议处置动作（辅助决策，最终由值班人员确认执行） */
  actions: string[];
}

/** ------- 阈值常量（导出便于单测与审计追溯） ------- */
/** 床位使用率 ≥ 此值（%）→ 高优先级扩容/分流建议 */
export const BED_RATE_HIGH = 90;
/** 危急值待处理 ≥ 此值 → 高优先级 */
export const CRITICAL_VALUE_HIGH = 5;
/** 院感预警待处置 ≥ 此值 → 高优先级 */
export const INFECTION_HIGH = 2;
/** 药品库存预警 ≥ 此值 → 中优先级 */
export const DRUG_STOCK_MID = 3;
/** 设备故障 ≥ 此值 → 中优先级 */
export const EQUIPMENT_MID = 2;
/** 进行中手术间数 ≥ 此值 → 中优先级（手麻资源紧张） */
export const SURGERY_INPROGRESS_MID = 8;

/**
 * 确定性伪随机（mulberry32）：seed 相同时序列一致，保证单测可复现；
 * seed 不同（路由取当前分钟桶）时计数轻微漂移，形成「活大屏」。
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 默认 seed：按当前分钟桶，保证同一分钟内多次轮询数值稳定、跨分钟漂移 */
function defaultSeed(): number {
  const now = new Date();
  const minuteBucket =
    now.getFullYear() * 1000000 +
    (now.getMonth() + 1) * 10000 +
    now.getDate() * 100 +
    now.getHours() * 60 +
    now.getMinutes();
  return minuteBucket;
}

/** 安全取整 */
const round = (n: number): number => Math.round(n);

/**
 * 【集团与科研】buildHospitalBrain —— 聚合全院实时四类指标（演示模式）。
 * 纯函数：不读库、不发请求、不触碰 WebSocket。
 *
 * @param seed 可选随机种子；不传则取当前分钟桶（大屏轮询自然漂移）
 * @returns    HospitalBrain 实时快照（demo=true）
 */
export function buildHospitalBrain(seed?: number): HospitalBrain {
  const s = seed ?? defaultSeed();
  const rand = mulberry32(s);

  // ---- 实时门诊量：基准 + 分钟桶漂移 ----
  const todayRegistered = round(2400 + rand() * 260); // 2400~2660
  const todayVisited = round(todayRegistered * (0.78 + rand() * 0.08)); // 已就诊约八成
  const inWaiting = round(60 + rand() * 120); // 候诊 60~180

  // ---- 实时住院量：核定床位 1200，在院随时间波动 ----
  const totalBeds = 1200;
  const inHospital = round(1080 + rand() * 90); // 1080~1170
  const todayAdmitted = round(40 + rand() * 30);
  const todayDischarged = round(35 + rand() * 28);
  const bedRate = round((inHospital / totalBeds) * 1000) / 10; // 保留一位小数

  // ---- 实时手术 ----
  const inProgress = round(6 + rand() * 5); // 6~11 间手术间
  const completedToday = round(18 + rand() * 14);
  const tomorrowScheduled = round(28 + rand() * 12);

  // ---- 实时预警 ----
  const criticalValues = round(rand() * 7); // 0~7
  const infection = round(rand() * 3); // 0~3
  const drugStock = round(rand() * 5); // 0~5
  const equipmentFault = round(rand() * 3); // 0~3

  return {
    generatedAt: new Date().toISOString(),
    demo: true,
    dataSource: 'demo',
    hospital: { code: 'HQ', name: '杭州健澜示范医院' },
    outpatient: { inWaiting, todayRegistered, todayVisited },
    inpatient: { inHospital, todayAdmitted, todayDischarged, totalBeds, bedRate },
    surgery: { inProgress, completedToday, tomorrowScheduled },
    warnings: { criticalValues, infection, drugStock, equipmentFault },
  };
}

/**
 * 【集团与科研】generateAIBrainSuggestion —— 基于实时指标阈值产出 AI 建议。
 * 纯函数：阈值命中即生成对应建议；无命中返回空数组（不打扰）。
 *
 * @param metrics buildHospitalBrain 产出的实时快照
 * @returns       按优先级 high → medium → low 排序的建议列表
 */
export function generateAIBrainSuggestion(metrics: HospitalBrain): BrainSuggestion[] {
  const list: BrainSuggestion[] = [];
  let seq = 0;
  const nextId = (category: SuggestionCategory): string => {
    seq += 1;
    return `BS-${category}-${seq}`;
  };

  // 1) 住院：床位使用率过高 → 高优先级分流 / 加床
  if (metrics.inpatient.bedRate >= BED_RATE_HIGH) {
    list.push({
      id: nextId('inpatient'),
      category: 'inpatient',
      priority: 'high',
      title: `床位使用率 ${metrics.inpatient.bedRate}% 逼近饱和`,
      message: `当前在院 ${metrics.inpatient.inHospital} 人 / 核定床位 ${metrics.inpatient.totalBeds} 张，床位使用率 ${metrics.inpatient.bedRate}%，已达 ${BED_RATE_HIGH}% 高水位线。`,
      actions: [
        '通知医务处评估择期出院与日间手术分流',
        '护理部启动加床预案并统筹陪护资源',
        '急诊科暂缓非急危重症收治，引导至医联体协作医院',
      ],
    });
  }

  // 2) 预警：危急值待处理积压 → 高优先级
  if (metrics.warnings.criticalValues >= CRITICAL_VALUE_HIGH) {
    list.push({
      id: nextId('warning'),
      category: 'warning',
      priority: 'high',
      title: `危急值待处理 ${metrics.warnings.criticalValues} 条`,
      message: `LIS / 心电危急值待闭环 ${metrics.warnings.criticalValues} 条，超过 ${CRITICAL_VALUE_HIGH} 条高水位线，存在患者安全风险。`,
      actions: [
        '值班科主任立即逐条复核并电话通知临床',
        '信息科排查危急值推送通道是否延迟',
        '按危急值闭环时限纳入当日医疗质量通报',
      ],
    });
  }

  // 3) 预警：院感预警待处置 → 高优先级
  if (metrics.warnings.infection >= INFECTION_HIGH) {
    list.push({
      id: nextId('warning'),
      category: 'warning',
      priority: 'high',
      title: `院感预警待处置 ${metrics.warnings.infection} 条`,
      message: `院感实时预警待处置 ${metrics.warnings.infection} 条，达到 ${INFECTION_HIGH} 条高水位线，需警惕聚集性事件。`,
      actions: [
        '院感科 30 分钟内到现场流调',
        '同病区手卫生与环境消毒督导',
        '必要时启动院感暴发应急预案',
      ],
    });
  }

  // 4) 预警：药品库存低于安全线 → 中优先级
  if (metrics.warnings.drugStock >= DRUG_STOCK_MID) {
    list.push({
      id: nextId('warning'),
      category: 'warning',
      priority: 'medium',
      title: `药品库存预警 ${metrics.warnings.drugStock} 个品规`,
      message: `低于安全库存线的药品品规 ${metrics.warnings.drugStock} 个，可能影响明日手术与急救用药。`,
      actions: [
        '药学部核对紧缺品规并启动紧急采购',
        '优先保障急诊 / 手术 / 抢救药品供应',
        '与药库联动评估替代品规',
      ],
    });
  }

  // 5) 预警：关键设备故障 → 中优先级
  if (metrics.warnings.equipmentFault >= EQUIPMENT_MID) {
    list.push({
      id: nextId('warning'),
      category: 'warning',
      priority: 'medium',
      title: `关键设备故障 ${metrics.warnings.equipmentFault} 台`,
      message: `待修关键医疗设备 ${metrics.warnings.equipmentFault} 台，可能影响检查 / 手术排程。`,
      actions: [
        '设备科派单维修并启用备用机',
        '受影响科室检查 / 手术排程动态调整',
        '超 24 小时未修复启动外送维修流程',
      ],
    });
  }

  // 6) 手术：进行中手术间数过多 → 中优先级
  if (metrics.surgery.inProgress >= SURGERY_INPROGRESS_MID) {
    list.push({
      id: nextId('surgery'),
      category: 'surgery',
      priority: 'medium',
      title: `正在进行手术 ${metrics.surgery.inProgress} 间`,
      message: `此刻 ${metrics.surgery.inProgress} 间手术室同时开工（阈值 ${SURGERY_INPROGRESS_MID}），手麻 / 护理资源高位运行。`,
      actions: [
        '麻醉科统筹排班，避免单点疲劳',
        'PACU 床位与术后转运提前预留',
        `明日排程 ${metrics.surgery.tomorrowScheduled} 台按需错峰`,
      ],
    });
  }

  // 7) 门诊：候诊排队过长 → 低优先级疏导
  if (metrics.outpatient.inWaiting >= 150) {
    list.push({
      id: nextId('outpatient'),
      category: 'outpatient',
      priority: 'low',
      title: `候诊排队 ${metrics.outpatient.inWaiting} 人`,
      message: `当前候诊 ${metrics.outpatient.inWaiting} 人，今日已就诊 ${metrics.outpatient.todayVisited} / 挂号 ${metrics.outpatient.todayRegistered}，高峰时段疏导建议。`,
      actions: [
        '导诊台加开机动诊室与自助报到',
        '检查候诊叫号系统是否正常',
        '高峰时段增派志愿者维持秩序',
      ],
    });
  }

  // 按优先级排序：high → medium → low
  const weight: Record<SuggestionPriority, number> = { high: 0, medium: 1, low: 2 };
  list.sort((a, b) => weight[a.priority] - weight[b.priority]);

  return list;
}
