/**
 * 健澜科技 jlmedaios - M161-A 医院数字孪生深化聚合器（实时数据推送与仿真）
 *
 * 【本期定位】在 M160-B 2D 布局之上做「实时推送 + 流程仿真 + 资源预测」深化：
 *   - streamDigitalTwinState(buildingId, floor)  纯函数：产出一次「定时快照」
 *     （单调版本号 version + 全量房间/床位/设备/脱敏患者 + 关键增量事件流），
 *     供前端以轮询（setInterval）拉取，模拟稳定的实时推送——同一轮询窗口内
 *     多次拉取返回同一版本号，避免抖动/频繁断线；不引入 WebSocket。
 *   - simulateHospitalFlow(scenario)             纯函数：医院就诊流程仿真
 *     （门诊高峰周一上午 / 突发公共卫生事件批量伤员 / 手术室设备故障三情景），
 *     按时间步推演到院流量、候诊队列、已收治、急诊占用与资源紧张度及处置建议
 *     （确定性种子，可复算）。
 *   - predictResourceNeed(period, scenario)       纯函数：按周期粒度预测未来
 *     资源需求（床位 / 医师 / 护士 / 手术室 / 急诊抢救位），并给出相对常态的峰值缺口。
 *
 * 设计要点：
 *  - 三个核心函数均为纯函数：不读库、不发网络、不碰 WebSocket，便于单测与前端复用；
 *  - 实时推送以「定时快照 + 版本号」模拟：version 由轮询窗口派生（窗口内恒定），
 *    前端对比版本号增量渲染，稳定不断线；
 *  - 患者仅输出脱敏标识（P-xxxx），不落 PII，符合隐私合规；
 *  - 与 digitalTwinAggregator 的 2D 布局 / 床位四态语义完全对齐。
 *
 * 【远期深化】
 *  - 实时推送：升级为 WebSocket / MQTT 长连接 + 增量事件订阅（本切片不做）；
 *  - 3D：接入 BIM/IFC + Three.js，坐标升级为三维包围盒；
 *  - 仿真引擎：接入真实排班 / 历史门诊量对参数做校准。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  buildDigitalTwinBuilding,
  type TwinBuilding,
  type TwinRoom,
} from './digitalTwinAggregator.js';

/* ------------------------------- 类型定义 ------------------------------- */

/** 医院流程仿真情景（M161-A）：门诊高峰 / 批量伤员 / 手术室故障 */
export type DeepFlowScenario = 'opd_peak' | 'mass_casualty' | 'or_failure';

/** 资源预测周期：hour=一天24点 / day=一周7天 / week=12周 */
export type PredictPeriod = 'hour' | 'day' | 'week';

/** 快照内的关键增量事件（用于前端滚动提示） */
export interface TwinStreamEvent {
  /** 事件序号（快照版本号派生，单调递增） */
  seq: number;
  roomId: string;
  /** 事件类型：床位变更 / 预警 / 设备 */
  type: 'bed_change' | 'alert' | 'equipment';
  message: string;
}

/** streamDigitalTwinState 产出的一次定时快照 */
export interface TwinStreamSnapshot {
  buildingId: string;
  buildingName: string;
  floor: string | null;
  /** 快照版本号（轮询窗口派生，前端对比增量渲染） */
  version: number;
  /** 演示时钟（分钟，0..1439 循环），仅用于页面展示 */
  clockMinutes: number;
  /** 房间/床位/四态汇总（复用 2D 布局结果） */
  summary: TwinBuilding['summary'];
  rooms: TwinRoom[];
  /** 本快照周期内的关键增量事件流 */
  events: TwinStreamEvent[];
  pushedAt: string;
  /** true 表示当前为内置演示数据 */
  demo: boolean;
}

/** 流程仿真单点 */
export interface FlowStep {
  /** 时间标签（如 "08:00"） */
  t: string;
  /** 到院/伤员数 */
  arrivals: number;
  /** 候诊/候床队列长度 */
  waiting: number;
  /** 累计已收治 */
  admitted: number;
  /** 急诊/抢救位占用 */
  erBedsUsed: number;
  /** 资源紧张度 0..100 */
  strain: number;
}

export interface HospitalFlowResult {
  scenario: DeepFlowScenario;
  scenarioNote: string;
  steps: FlowStep[];
  /** 峰值资源紧张度 0..100 */
  peakStrain: number;
  /** 关键处置建议 */
  actions: string[];
}

/** 资源预测单点 */
export interface ResourceNeedPoint {
  t: string;
  /** 需要床位数 */
  beds: number;
  /** 需要医师数 */
  physicians: number;
  /** 需要护士数 */
  nurses: number;
  /** 需要手术室间数 */
  orRooms: number;
  /** 需要急诊抢救位数 */
  erResus: number;
}

/** 相对常态的峰值资源缺口（向上取整） */
export interface ResourceGap {
  beds: number;
  physicians: number;
  nurses: number;
  orRooms: number;
  erResus: number;
}

export interface ResourceNeedResult {
  period: PredictPeriod;
  scenario: DeepFlowScenario;
  points: ResourceNeedPoint[];
  gap: ResourceGap;
  note: string;
}

/* --------------------------- 确定性随机工具 --------------------------- */

/** 确定性伪随机数（mulberry32），保证仿真/预测曲线可复算、单测稳定 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 安全取整到非负整数 */
function roundNonNeg(n: number): number {
  return Math.max(0, Math.round(n));
}

/* --------------------------- streamDigitalTwinState --------------------------- */

/**
 * 轮询窗口（毫秒）：同一窗口内多次拉取返回同一版本号，模拟稳定推送、
 * 避免前端因版本频繁跳变而抖动/重连（远期深化再切 WebSocket）。
 */
const POLL_WINDOW_MS = 30_000;

/** 由 2D 布局快照派生增量事件（占用率偏高预警 / 隔离床提示 / 设备维护） */
function deriveStreamEvents(b: TwinBuilding, version: number): TwinStreamEvent[] {
  const events: TwinStreamEvent[] = [];
  let idx = 0;
  const push = (roomId: string, type: TwinStreamEvent['type'], message: string) => {
    events.push({ seq: version * 1000 + idx, roomId, type, message });
    idx += 1;
  };

  for (const r of b.rooms) {
    if (r.beds.length === 0) continue;
    const inUse = r.beds.filter(
      (x) => x.state === 'occupied' || x.state === 'isolation',
    ).length;
    const rate = inUse / r.beds.length;

    if (rate >= 0.8) {
      push(r.roomId, 'alert', `${r.roomName} 占用率约 ${Math.round(rate * 100)}%，接近满负荷`);
    }
    const iso = r.beds.filter((x) => x.state === 'isolation').length;
    if (iso > 0) {
      push(r.roomId, 'bed_change', `${r.roomName} 有 ${iso} 张隔离床位在管`);
    }
    const maint = r.beds.filter((x) => x.state === 'maintenance').length;
    if (maint > 0) {
      push(r.roomId, 'bed_change', `${r.roomName} ${maint} 张床位维护中，暂不可用`);
    }
  }

  // 设备事件：手术室/抢救室设备在位提示
  for (const r of b.rooms) {
    if (r.equipment.length > 0 && (r.roomType === 'operating_room' || r.roomType === 'er' || r.roomType === 'icu')) {
      push(r.roomId, 'equipment', `${r.roomName} ${r.equipment.length} 台关键设备在位`);
    }
  }

  return events;
}

/**
 * streamDigitalTwinState：产出一次数字孪生「定时快照」（模拟实时推送）。
 *
 * @param buildingId 楼宇编号（未知回退 main）
 * @param floor       可选楼层过滤
 * @returns           TwinStreamSnapshot（版本号 + 全量布局 + 增量事件流）
 *
 * 纯函数：布局数据来自 2D 聚合器（确定性）；version/pushedAt 派生自轮询窗口与
 * 调用时刻，仅用于页面时钟与增量渲染，不参与布局/事件计算。前端以 setInterval
 * 轮询本接口，对比 version 决定是否增量刷新——窗口内恒定，稳定不断线。
 */
export function streamDigitalTwinState(
  buildingId: string,
  floor?: string | null,
): TwinStreamSnapshot {
  const base = buildDigitalTwinBuilding(buildingId, floor);

  // 版本号 = 当前时刻落在第几个轮询窗口（窗口内恒定 → 稳定推送）
  const version = Math.floor(Date.now() / POLL_WINDOW_MS);
  // 演示时钟：把版本号映射到一天的分钟轴（循环，仅展示用）
  const clockMinutes = version % (24 * 60);

  const events = deriveStreamEvents(base, version);

  return {
    buildingId: base.buildingId,
    buildingName: base.buildingName,
    floor: base.floor,
    version,
    clockMinutes,
    summary: base.summary,
    rooms: base.rooms,
    events,
    pushedAt: new Date().toISOString(),
    demo: base.demo,
  };
}

/* --------------------------- simulateHospitalFlow --------------------------- */

/** 情景元信息：起步到院强度 / 峰值倍数 / 基础吞吐 / 急诊占用基准 / 紧张度基准 / 说明 / 建议 */
const FLOW_META: Record<
  DeepFlowScenario,
  {
    baseArrivals: number;
    peakMultiplier: number;
    baseThroughput: number;
    erBase: number;
    strainBase: number;
    note: string;
    actions: string[];
  }
> = {
  opd_peak: {
    baseArrivals: 90,
    peakMultiplier: 1.9,
    baseThroughput: 12,
    erBase: 18,
    strainBase: 45,
    note: '门诊高峰（周一上午）：8-11 点到院量陡增，候诊队列堆积，急诊相对平稳',
    actions: [
      '开放弹性出诊诊室与机动医师，提前 30 分钟开台',
      '门诊高峰分流：自助机/线上预约优先，引导预约患者错峰',
      '增派导诊与收费窗口，缩短排队时长',
    ],
  },
  mass_casualty: {
    baseArrivals: 40,
    peakMultiplier: 3.2,
    baseThroughput: 18,
    erBase: 42,
    strainBase: 78,
    note: '突发公共卫生事件（批量伤员）：短时间大量伤员到院，急诊抢救位告急',
    actions: [
      '启动突发公共卫生事件应急预案，开通绿色通道',
      '腾挪急诊留观/备用床位，扩充临时抢救位',
      '按检伤分类（红/黄/绿）分区救治，调用全院机动人力',
    ],
  },
  or_failure: {
    baseArrivals: 60,
    peakMultiplier: 1.2,
    baseThroughput: 10,
    erBase: 20,
    strainBase: 52,
    note: '设备故障（手术室临时不可用）：手术台次下降，术后病房积压，择期手术顺延',
    actions: [
      '立即启用备用手术室，故障设备挂停用牌并报修',
      '重排手术排班，优先急诊/限期手术，择期手术顺延并告知患者',
      '加速术后周转，提前协调 ICU/麻醉恢复床位',
    ],
  },
};

/** 12 个时间步标签：模拟一个上午/事件窗口（每 15 分钟） */
const FLOW_TICKS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];

/**
 * simulateHospitalFlow：按情景仿真医院就诊流程（到院/候诊/收治/急诊/紧张度）。
 *
 * @param scenario opd_peak=门诊高峰 / mass_casualty=批量伤员 / or_failure=手术室故障
 * @returns        HospitalFlowResult（确定性种子，同参必同结果）
 */
export function simulateHospitalFlow(scenario: DeepFlowScenario): HospitalFlowResult {
  const meta = FLOW_META[scenario] ?? FLOW_META.opd_peak;
  const rand = mulberry32(0x20261016 ^ scenario.length);

  let admitted = 0;
  let waiting = 0;
  const steps: FlowStep[] = [];
  let peakStrain = 0;

  for (let i = 0; i < FLOW_TICKS.length; i += 1) {
    // 到院强度：以中段（i=4 附近，约 10:00）为峰值的钟形曲线
    const bell = Math.exp(-Math.pow((i - 4) / 3.2, 2));
    const arrivals = roundNonNeg(
      meta.baseArrivals * (1 + (meta.peakMultiplier - 1) * bell) * (0.9 + rand() * 0.2),
    );

    // 动态吞吐：每步可消化 ≈ 到院的 88% + 基础吞吐（真实医院随到随处理），
    // 使候诊队列有界（数十量级，而非无界累积），三情景紧张度梯度可区分。
    const capacity = roundNonNeg(arrivals * 0.88 + meta.baseThroughput);
    const treated = Math.min(waiting + arrivals, capacity);
    admitted += treated;
    waiting = Math.max(0, waiting + arrivals - treated);

    // 急诊占用：情景基准 + 到院带动 + 噪声
    const erBedsUsed = roundNonNeg(
      meta.erBase + arrivals * 0.15 + (rand() - 0.5) * 4,
    );

    // 紧张度：候诊队列 + 急诊占用共同驱动，封顶 100；
    // 系数压低，避免门诊高峰的队列把紧张度也顶到 100，保证梯度可区分
    const strain = Math.min(
      100,
      Math.round(meta.strainBase + waiting * 0.5 + erBedsUsed * 0.35 + (rand() - 0.5) * 5),
    );
    peakStrain = Math.max(peakStrain, strain);

    steps.push({
      t: FLOW_TICKS[i],
      arrivals,
      waiting,
      admitted,
      erBedsUsed,
      strain,
    });
  }

  return {
    scenario,
    scenarioNote: meta.note,
    steps,
    peakStrain,
    actions: meta.actions,
  };
}

/* --------------------------- predictResourceNeed --------------------------- */

const PREDICT_LABELS: Record<PredictPeriod, string[]> = {
  hour: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
  day: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  week: Array.from({ length: 12 }, (_, i) => `W${i + 1}`),
};

/** 资源基准（常态，演示规模：2000 床、日门诊 1W 口径下的缩放值） */
const RESOURCE_BASE = {
  beds: 420,
  physicians: 120,
  nurses: 260,
  orRooms: 8,
  erResus: 16,
};

/** 情景相对常态的资源倍数（峰值需求） */
const SCENARIO_LOAD: Record<DeepFlowScenario, Partial<ResourceGap>> = {
  opd_peak: { beds: 1.10, physicians: 1.35, nurses: 1.25, orRooms: 1.0, erResus: 1.15 },
  mass_casualty: { beds: 1.45, physicians: 1.60, nurses: 1.55, orRooms: 1.1, erResus: 2.10 },
  or_failure: { beds: 1.15, physicians: 1.10, nurses: 1.20, orRooms: 0.85, erResus: 1.05 },
};

/**
 * predictResourceNeed：按周期粒度预测未来资源需求并给出峰值缺口。
 *
 * @param period   hour=一天24点 / day=一周7天 / week=12周
 * @param scenario opd_peak / mass_casualty / or_failure
 * @returns        ResourceNeedResult（确定性种子；gap 为相对常态的峰值缺口）
 *
 * 纯函数：不读库；倍数与基准为演示参数，远期可由历史排班/门诊量校准。
 */
export function predictResourceNeed(
  period: PredictPeriod,
  scenario: DeepFlowScenario,
): ResourceNeedResult {
  const labels = PREDICT_LABELS[period] ?? PREDICT_LABELS.day;
  const load = SCENARIO_LOAD[scenario] ?? SCENARIO_LOAD.opd_peak;
  const rand = mulberry32(0x20261017 ^ period.length ^ scenario.length);

  const points: ResourceNeedPoint[] = labels.map((t, i) => {
    // 周期因子：hour 白天高 / day 工作日高 / week 平缓爬坡
    let cycle = 1;
    if (period === 'hour') {
      const h = i;
      cycle = 0.7 + 0.3 * Math.exp(-Math.pow((h - 10) / 3.5, 2))
            + 0.18 * Math.exp(-Math.pow((h - 19) / 2.6, 2))
            - 0.25 * Math.exp(-Math.pow((h - 3) / 2.2, 2));
    } else if (period === 'day') {
      cycle = i < 5 ? 1.0 : 0.8;
    } else {
      cycle = 0.9 + 0.1 * (i / (labels.length - 1));
    }

    const noise = (rand() - 0.5) * 0.1;
    const factor = Math.max(0.3, cycle + noise);

    return {
      t,
      beds: roundNonNeg(RESOURCE_BASE.beds * (load.beds ?? 1) * factor),
      physicians: roundNonNeg(RESOURCE_BASE.physicians * (load.physicians ?? 1) * factor),
      nurses: roundNonNeg(RESOURCE_BASE.nurses * (load.nurses ?? 1) * factor),
      orRooms: Math.max(1, roundNonNeg(RESOURCE_BASE.orRooms * (load.orRooms ?? 1) * factor)),
      erResus: Math.max(1, roundNonNeg(RESOURCE_BASE.erResus * (load.erResus ?? 1) * factor)),
    };
  });

  // 峰值缺口 = 各资源峰值需求 − 常态基准（向上取整，非负）
  const peak = (key: keyof ResourceGap): number =>
    Math.max(0, Math.ceil(Math.max(...points.map((p) => p[key])) - RESOURCE_BASE[key]));

  const gap: ResourceGap = {
    beds: peak('beds'),
    physicians: peak('physicians'),
    nurses: peak('nurses'),
    orRooms: peak('orRooms'),
    erResus: peak('erResus'),
  };

  const note =
    scenario === 'mass_casualty'
      ? '批量伤员情景：急诊抢救位与床位缺口最突出，建议预置应急储备'
      : scenario === 'or_failure'
        ? '手术室故障情景：有效手术产能下降，建议启用备用手术室并加速周转'
        : '门诊高峰情景：医师/护士弹性需求上升，建议机动排班与错峰分流';

  return { period, scenario, points, gap, note };
}
