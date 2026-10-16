/**
 * 健澜科技 jlmedaios - AI 大脑 2.0 门诊试点聚合器（M182-C，v5.0启动）
 *
 * 【v5.0启动】AI 大脑 2.0 先门诊试点，不铺大摊子：
 *   1. buildAIBrainV2Outpatient(seed?)：门诊实时监控快照
 *      - 门诊量实时监控：当前在诊 / 候诊 / 平均等待（分钟）
 *      - 医生负荷实时监控：当前接诊医生数 / 今日接诊人次 / 平均接诊时长
 *      - 患者等待预警：候诊时长 > 30 分钟的患者队列（仅计数 + 候诊区间桶，不含 PII）
 *   2. predictOutpatientPeak(period)：门诊高峰预测
 *      - period ∈ 'today' | 'tomorrow' | 'week'
 *      - 输出高峰时段列表（小时桶 + 预测人次 + 紧张度）
 *   3. suggestOutpatientOptimization(metrics)：门诊优化建议
 *      - 高峰 → 增开窗口 / 增派医生
 *      - 低峰 → 合并诊室 / 医生下沉支援病房或教学
 *      - 候诊 > 30 分钟 → 自动提醒（分诊台 / 科室主任）
 *
 * 「实时，不能静态」：前端定时轮询 GET /api/v1/ai-brain/v2/outpatient，
 *   每次轮询按当前分钟桶生成带轻微漂移的演示计数；本模块不触碰 WebSocket（红线）。
 *
 * 医疗安全红线：本模块仅输出科室 / 诊室聚合计数，不含患者 PII；
 *   AI 建议为辅助决策，最终由门诊办公室 / 科室主任本人确认并执行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 门诊量实时监控 */
export interface OutpatientVolumeMetrics {
  /** 当前在诊人数（诊室中正在接诊的患者数） */
  nowConsulting: number;
  /** 当前候诊人数（候诊区 + 大厅排队） */
  nowWaiting: number;
  /** 平均等待时长（分钟，候诊患者从叫号到进入诊室的均值，保留一位小数） */
  avgWaitMinutes: number;
  /** 今日累计挂号人次 */
  todayRegistered: number;
  /** 今日累计已就诊人次 */
  todayVisited: number;
}

/** 医生负荷实时监控 */
export interface DoctorLoadMetrics {
  /** 当前正在接诊的医生数 */
  nowSeeing: number;
  /** 今日累计接诊人次（全门诊） */
  todaySeen: number;
  /** 平均单次接诊时长（分钟，保留一位小数） */
  avgMinutesPerPatient: number;
  /** 已开诊诊室数 */
  openRooms: number;
  /** 医生负荷率（%，当前接诊医生 / 今日排班医生，保留一位小数） */
  loadRate: number;
}

/** 患者等待预警条目（仅候诊区间桶，不含姓名 / 卡号） */
export interface WaitingAlert {
  /** 候诊时长区间桶：例如 '30-40' 表示 30~40 分钟 */
  bucket: string;
  /** 该区间桶内患者数 */
  count: number;
}

/** 门诊试点实时快照 */
export interface AIBrainV2Outpatient {
  /** 快照生成时刻（ISO 字符串） */
  generatedAt: string;
  /** 固定标记：演示模式数据，前端须显式标注「演示数据」 */
  demo: true;
  /** 数据来源：demo 演示 / live 实时聚合（后续平滑替换） */
  dataSource: 'demo' | 'live';
  hospital: { code: string; name: string };
  volume: OutpatientVolumeMetrics;
  doctorLoad: DoctorLoadMetrics;
  /** 候诊 > 30 分钟的患者区间桶列表（自动提醒触发依据） */
  waitingAlerts: WaitingAlert[];
  /** 候诊 > 30 分钟的患者总数（角标用） */
  waitingOver30Count: number;
}

/** 高峰预测时段 */
export interface PeakSlot {
  /** 小时桶，例如 '09:00-10:00' */
  slot: string;
  /** 预测人次（演示模式为确定性曲线） */
  predictedVisits: number;
  /** 紧张度：high 高峰 / mid 平峰 / low 低峰 */
  pressure: 'high' | 'mid' | 'low';
}

/** predictOutpatientPeak 返回 */
export interface OutpatientPeakForecast {
  /** 预测周期 */
  period: 'today' | 'tomorrow' | 'week';
  /** 当日高峰时段标签，例如 '09:00-10:30' */
  peakWindow: string;
  /** 各小时桶预测 */
  slots: PeakSlot[];
  /** 周期内预测总人次 */
  totalPredicted: number;
}

/** 优化建议优先级 */
export type OutpatientSuggestionPriority = 'high' | 'medium' | 'low';

/** 优化建议 */
export interface OutpatientSuggestion {
  id: string;
  priority: OutpatientSuggestionPriority;
  title: string;
  message: string;
  /** 建议处置动作（辅助决策，最终由门诊办 / 科主任确认执行） */
  actions: string[];
}

/** ------- 阈值常量（导出便于单测与审计追溯） ------- */
/** 候诊 > 此值（分钟）→ 自动提醒（高优先级） */
export const WAIT_ALERT_MINUTES = 30;
/** 候诊人数 ≥ 此值 → 高峰压力 */
export const WAIT_PEAK_COUNT = 120;
/** 医生负荷率 ≥ 此值（%）→ 增派医生 */
export const DOCTOR_LOAD_HIGH = 90;
/** 医生负荷率 ≤ 此值（%）→ 合并诊室 / 低峰调度 */
export const DOCTOR_LOAD_LOW = 50;

/**
 * 确定性伪随机（mulberry32）：seed 相同时序列一致，单测可复现；
 * seed 不同（路由取当前分钟桶）时计数轻微漂移，形成「活看板」。
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

/** 默认 seed：按当前分钟桶，同一分钟内多次轮询数值稳定、跨分钟漂移 */
function defaultSeed(): number {
  const now = new Date();
  return (
    now.getFullYear() * 1000000 +
    (now.getMonth() + 1) * 10000 +
    now.getDate() * 100 +
    now.getHours() * 60 +
    now.getMinutes()
  );
}

const round = (n: number): number => Math.round(n);
const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * 【v5.0启动】buildAIBrainV2Outpatient —— 门诊试点实时监控快照（演示模式）。
 * 纯函数：不读库、不发请求、不触碰 WebSocket。
 *
 * @param seed 可选随机种子；不传则取当前分钟桶（前端轮询自然漂移）
 * @returns    AIBrainV2Outpatient 实时快照（demo=true）
 */
export function buildAIBrainV2Outpatient(seed?: number): AIBrainV2Outpatient {
  const s = seed ?? defaultSeed();
  const rand = mulberry32(s);

  // ---- 门诊量：基准 + 分钟桶漂移 ----
  const nowConsulting = round(40 + rand() * 30); // 40~70
  const nowWaiting = round(60 + rand() * 140); // 60~200
  const avgWaitMinutes = round1(12 + rand() * 28); // 12~40 分钟
  const todayRegistered = round(2200 + rand() * 300); // 2200~2500
  const todayVisited = round(todayRegistered * (0.7 + rand() * 0.1));

  // ---- 医生负荷 ----
  const nowSeeing = round(35 + rand() * 20); // 35~55 位医生正在接诊
  const todaySeen = round(todayVisited * (0.95 + rand() * 0.04));
  const avgMinutesPerPatient = round1(6 + rand() * 8); // 6~14 分钟
  const openRooms = round(40 + rand() * 20); // 40~60 间
  // 排班医生数固定 60，负荷率 = 当前接诊 / 60
  const scheduledDoctors = 60;
  const loadRate = round1((nowSeeing / scheduledDoctors) * 100);

  // ---- 候诊 > 30 分钟预警：按区间桶聚合，不暴露 PII ----
  // 平均等待拉高时，>30 分钟的人数也随之增多
  const over30Ratio = Math.max(0, Math.min(0.6, (avgWaitMinutes - 20) / 40));
  const waitingOver30Count = round(nowWaiting * over30Ratio);
  const b1 = round(waitingOver30Count * 0.55); // 30~40 分钟
  const b2 = round(waitingOver30Count * 0.3); // 40~50 分钟
  const b3 = waitingOver30Count - b1 - b2; // >50 分钟
  const waitingAlerts: WaitingAlert[] = [];
  if (b1 > 0) waitingAlerts.push({ bucket: '30-40', count: b1 });
  if (b2 > 0) waitingAlerts.push({ bucket: '40-50', count: b2 });
  if (b3 > 0) waitingAlerts.push({ bucket: '50+', count: b3 });

  return {
    generatedAt: new Date().toISOString(),
    demo: true,
    dataSource: 'demo',
    hospital: { code: 'HQ', name: '杭州健澜示范医院' },
    volume: { nowConsulting, nowWaiting, avgWaitMinutes, todayRegistered, todayVisited },
    doctorLoad: { nowSeeing, todaySeen, avgMinutesPerPatient, openRooms, loadRate },
    waitingAlerts,
    waitingOver30Count,
  };
}

/**
 * 【v5.0启动】predictOutpatientPeak —— 门诊高峰预测。
 * 纯函数：基于门诊典型双峰曲线（上午 9-10 点 / 下午 14-15 点）生成确定性预测。
 *
 * @param period 预测周期：today 今日 / tomorrow 明日 / week 本周
 * @returns      OutpatientPeakForecast 高峰预测
 */
export function predictOutpatientPeak(
  period: 'today' | 'tomorrow' | 'week' = 'today',
): OutpatientPeakForecast {
  // 门诊开放时段 08:00-17:00，按小时桶
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  // 典型门诊双峰曲线权重
  const curve: Record<number, number> = {
    8: 0.08,
    9: 0.18,
    10: 0.16,
    11: 0.1,
    12: 0.05,
    13: 0.06,
    14: 0.15,
    15: 0.13,
    16: 0.06,
    17: 0.03,
  };

  const scale = period === 'today' ? 2400 : period === 'tomorrow' ? 2350 : 12000;

  const slots: PeakSlot[] = hours.map((h) => {
    const predictedVisits = round(scale * curve[h]);
    const pressure: PeakSlot['pressure'] =
      curve[h] >= 0.15 ? 'high' : curve[h] >= 0.08 ? 'mid' : 'low';
    return {
      slot: `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`,
      predictedVisits,
      pressure,
    };
  });

  const totalPredicted = slots.reduce((sum, s) => sum + s.predictedVisits, 0);

  // 找高峰窗口：连续 high 时段合并
  const highIdx = slots.map((s, i) => (s.pressure === 'high' ? i : -1)).filter((i) => i >= 0);
  let peakWindow = '';
  if (highIdx.length > 0) {
    const first = highIdx[0];
    const last = highIdx[highIdx.length - 1];
    peakWindow = `${slots[first].slot.split('-')[0]} - ${slots[last].slot.split('-')[1]}`;
  }

  return { period, peakWindow, slots, totalPredicted };
}

/**
 * 【v5.0启动】suggestOutpatientOptimization —— 基于实时指标产出门诊优化建议。
 * 纯函数：阈值命中即生成建议；无命中返回空数组（不打扰）。
 *
 * @param metrics buildAIBrainV2Outpatient 产出的实时快照
 * @returns       按优先级 high → medium → low 排序的建议列表
 */
export function suggestOutpatientOptimization(
  metrics: AIBrainV2Outpatient,
): OutpatientSuggestion[] {
  const list: OutpatientSuggestion[] = [];
  let seq = 0;
  const nextId = (): string => {
    seq += 1;
    return `OP-SUGGEST-${seq}`;
  };

  // 1) 候诊 > 30 分钟 → 高优先级自动提醒
  if (metrics.waitingOver30Count > 0) {
    const detail = metrics.waitingAlerts
      .map((a) => `${a.bucket}分钟段 ${a.count} 人`)
      .join('、');
    list.push({
      id: nextId(),
      priority: 'high',
      title: `候诊超 ${WAIT_ALERT_MINUTES} 分钟患者 ${metrics.waitingOver30Count} 人`,
      message: `当前候诊区共 ${metrics.volume.nowWaiting} 人，其中等待超过 ${WAIT_ALERT_MINUTES} 分钟者 ${metrics.waitingOver30Count} 人（${detail}），平均等待 ${metrics.volume.avgWaitMinutes} 分钟。`,
      actions: [
        '分诊台立即通过叫号屏 / 自助机向超长等待患者推送致歉与预估等待时间',
        '科室主任现场协调：高峰时段临时加开诊室、弹性加号',
        '门诊办将超 30 分钟队列纳入今日服务质量通报',
      ],
    });
  }

  // 2) 候诊人数高 → 高峰增开窗口（中/高）
  if (metrics.volume.nowWaiting >= WAIT_PEAK_COUNT) {
    list.push({
      id: nextId(),
      priority: metrics.volume.nowWaiting >= WAIT_PEAK_COUNT * 1.5 ? 'high' : 'medium',
      title: `候诊 ${metrics.volume.nowWaiting} 人，建议高峰增开窗口`,
      message: `当前候诊 ${metrics.volume.nowWaiting} 人，已达 ${WAIT_PEAK_COUNT} 人高水位线，结合高峰预测（${predictOutpatientPeak('today').peakWindow}），门诊压力较大。`,
      actions: [
        '门诊办在高峰窗口前 30 分钟增开 2~3 个普通内科 / 外科窗口',
        '导诊台对轻症患者引导至全科医学科 / 便民门诊分流',
        '检查检验科室同步延长午间开放，避免患者二次排队',
      ],
    });
  }

  // 3) 医生负荷率过高 → 增派医生
  if (metrics.doctorLoad.loadRate >= DOCTOR_LOAD_HIGH) {
    list.push({
      id: nextId(),
      priority: 'high',
      title: `医生负荷率 ${metrics.doctorLoad.loadRate}%，接近饱和`,
      message: `当前 ${metrics.doctorLoad.nowSeeing} 位医生在诊，排班 60 位，负荷率 ${metrics.doctorLoad.loadRate}%，平均单次接诊 ${metrics.doctorLoad.avgMinutesPerPatient} 分钟。`,
      actions: [
        '医务处协调二线 / 休班医生在高峰时段回岗支援',
        '对长接诊科室（如心内科 / 神经内科）启动限时接诊与转诊',
        '高峰时段暂停非紧急院内会诊，保障门诊主线',
      ],
    });
  }

  // 4) 医生负荷率过低 → 低峰合并诊室
  if (metrics.doctorLoad.loadRate <= DOCTOR_LOAD_LOW) {
    list.push({
      id: nextId(),
      priority: 'low',
      title: `医生负荷率 ${metrics.doctorLoad.loadRate}%，低峰可合并诊室`,
      message: `当前负荷率 ${metrics.doctorLoad.loadRate}% 低于 ${DOCTOR_LOAD_LOW}% 低水位线，${metrics.doctorLoad.openRooms} 间诊室存在资源闲置。`,
      actions: [
        '门诊办合并相邻同专业诊室，安排医生下病房查房或参与教学',
        '利用低峰时段整理病历、开展 MD T 病例讨论',
        '将省出的号源向次日高峰时段平移，平滑全天曲线',
      ],
    });
  }

  // 按优先级排序：high → medium → low
  const order: Record<OutpatientSuggestionPriority, number> = { high: 0, medium: 1, low: 2 };
  list.sort((a, b) => order[a.priority] - order[b.priority]);

  return list;
}
