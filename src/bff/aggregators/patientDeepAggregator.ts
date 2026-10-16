/**
 * 健澜科技 jlmedaios — 【安全质量与运营】患者服务与体验深化聚合器（M172-D，纯函数）
 *
 * 患者服务要简单好用，老人也能用。本聚合器把传统「挂号靠排队、找楼靠问路、
 * 缴费靠窗口、出院靠跑腿」的患者体验，升级为四大深化域的全链路陪伴：
 *
 *   - buildDeepPatientService：深度患者服务体系。一次性盘点四大深化域
 *     （智能导诊 / 院内导航 / 智慧门诊 / 智慧住院）的能力清单与适老化开关，
 *     并计算「老人友好度」评分——适老化开关开得越全，分越高。
 *   - optimizePatientFlow：患者流程优化。给定当前位置与目标位置，在院内平面
 *     地图上规划步行路径，默认走无障碍通道（坡道/直梯），输出距离、ETA、
 *     换乘节点与逐步导引；老人迷路时也能照着走。
 *   - predictPatientWaitTime：等待时间预测。按「前方人数 / 开放窗口数 × 单均耗时」
 *     外推，并对老人/急诊优先插队给出修正，输出预计等待分钟数与红黄绿灯。
 *   - personalizePatientService：个性化服务。按患者画像（老年/语言/无障碍/陪同）
 *     自适应大字号、语音播报、无障碍路径、陪伴窗口与提醒渠道，让每个患者
 *     拿到的都是「为自己调好」的服务界面。
 *
 * 全部无副作用、不触库、不写 SQL，便于单测；本切片仅纯函数 + 路由 + 前端。
 * 不触碰 WebSocket；不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 通用类型 ============================== */

/** 院内一个地点节点（用于导航规划） */
export interface HospitalNode {
  /** 节点代码（如 'gate_hall' / 'elev_1_west' / 'dept_cardio'） */
  code: string;
  /** 人读名称（如 '门诊大厅' / '西1号电梯' / '心内科门诊'） */
  name: string;
  /** 所在楼层 */
  floor: number;
  /** 平面网格坐标（米） */
  x: number;
  y: number;
  /** 是否无障碍可达（坡道/直梯） */
  barrierFree: boolean;
}

/**
 * 院内连通图：节点 + 邻接边。纯函数不内置超大图，由调用方传入；
 * 未传入时使用一份内置的「最小演示院图」，保证 GET /deep 开箱即有路径可算。
 */
export interface HospitalGraph {
  nodes: HospitalNode[];
  /** 邻接表：节点 code → 可达节点 code 列表 */
  adjacency: Record<string, string[]>;
}

/** 内置最小院图（门诊大厅 → 西1号电梯 → 各楼层科室），仅作演示/兜底 */
export const DEFAULT_HOSPITAL_GRAPH: HospitalGraph = {
  nodes: [
    { code: 'gate_hall', name: '门诊大厅', floor: 1, x: 0, y: 0, barrierFree: true },
    { code: 'elev_west', name: '西1号电梯', floor: 1, x: 60, y: 0, barrierFree: true },
    { code: 'elev_west_3', name: '西1号电梯(3层)', floor: 3, x: 60, y: 0, barrierFree: true },
    { code: 'elev_west_5', name: '西1号电梯(5层)', floor: 5, x: 60, y: 0, barrierFree: true },
    { code: 'dept_cardio', name: '心内科门诊(3层)', floor: 3, x: 140, y: 40, barrierFree: true },
    { code: 'dept_neuro', name: '神经内科门诊(3层)', floor: 3, x: 140, y: -40, barrierFree: true },
    { code: 'dept_chest', name: '胸部CT室(5层)', floor: 5, x: 150, y: 30, barrierFree: true },
    { code: 'emergency', name: '急诊抢救室(1层)', floor: 1, x: -80, y: 60, barrierFree: true },
  ],
  adjacency: {
    gate_hall: ['elev_west', 'emergency'],
    elev_west: ['gate_hall', 'elev_west_3'],
    elev_west_3: ['elev_west', 'elev_west_5', 'dept_cardio', 'dept_neuro'],
    elev_west_5: ['elev_west_3', 'dept_chest'],
    dept_cardio: ['elev_west_3'],
    dept_neuro: ['elev_west_3'],
    dept_chest: ['elev_west_5'],
    emergency: ['gate_hall'],
  },
};

/* ============================== 1. 深度患者服务体系 ============================== */

/** 适老化开关（老人也能用的总开关集合） */
export interface ElderlySwitches {
  /** 大字号模式 */
  largeFont: boolean;
  /** 语音播报（读屏/导航语音） */
  voiceBroadcast: boolean;
  /** 无障碍通道优先（坡道/直梯） */
  barrierFreeFirst: boolean;
  /** 志愿者代填/陪伴窗口 */
  volunteerDesk: boolean;
  /** 一步直达（不超过三步操作） */
  oneStepFlow: boolean;
}

/** 深度患者服务体系配置（全部可选，缺省=全量适老化开启） */
export interface DeepServiceConfig {
  graph: HospitalGraph;
  elderly: ElderlySwitches;
}

/** 单个深化域的能力清单 */
export interface DeepServiceModule {
  code: 'guide' | 'nav' | 'outpatient' | 'inpatient';
  name: string;
  capabilities: string[];
  /** 该域面向老人的适老化能力 */
  elderlyFeatures: string[];
}

/** buildDeepPatientService 输出 */
export interface DeepPatientServiceSystem {
  patientId: string;
  modules: DeepServiceModule[];
  elderly: ElderlySwitches;
  /** 老人友好度 0-100（开启的适老化开关占比折算） */
  elderlyReadinessScore: number;
  elderlyLevel: 'excellent' | 'good' | 'fair';
  /** 一句面向老人的话：当前服务是否「简单好用」 */
  summary: string;
}

/**
 * 深度患者服务体系（纯函数）。
 * 盘点四大深化域能力，并按适老化开关计算「老人友好度」：
 *   每开一个适老化开关 = 20 分，满分 100；
 *   ≥80 优秀（老人全程不卡壳）、≥60 良好、其余一般。
 *
 * @param patientId 患者标识（脱敏后传入）
 * @param config    可选：院内图与适老化开关；缺省全量适老化开启
 */
export function buildDeepPatientService(
  patientId: string,
  config?: Partial<DeepServiceConfig>,
): DeepPatientServiceSystem {
  const elderly: ElderlySwitches = {
    largeFont: true,
    voiceBroadcast: true,
    barrierFreeFirst: true,
    volunteerDesk: true,
    oneStepFlow: true,
    ...(config?.elderly ?? {}),
  };

  const modules: DeepServiceModule[] = [
    {
      code: 'guide',
      name: '智能导诊深化',
      capabilities: ['症状大白话录入', '症状→科室推荐', '科室→医生匹配', '医生→实时号源'],
      elderlyFeatures: ['语音说症状', '红旗症状强制急诊', '拿不准时给 2-3 个备选科室'],
    },
    {
      code: 'nav',
      name: '院内导航深化',
      capabilities: ['实时定位', '室内楼层地图', 'AR 步行导引'],
      elderlyFeatures: ['默认无障碍通道', '大字逐步导航', '迷路一键重新规划'],
    },
    {
      code: 'outpatient',
      name: '智慧门诊',
      capabilities: ['分时预约', '智能分诊', '移动支付', '报告推送'],
      elderlyFeatures: ['老人优先叫号', '支付结果语音播报', '报告到了短信+语音提醒'],
    },
    {
      code: 'inpatient',
      name: '智慧住院',
      capabilities: ['入院一站式准备', '移动护士站', '床边结算', '7/30/90 天随访闭环'],
      elderlyFeatures: ['家属同步随访', '失访自动电话提醒', '出院用药大字清单'],
    },
  ];

  const opened = [
    elderly.largeFont,
    elderly.voiceBroadcast,
    elderly.barrierFreeFirst,
    elderly.volunteerDesk,
    elderly.oneStepFlow,
  ].filter(Boolean).length;
  const score = Math.round((opened / 5) * 100);
  const elderlyLevel: DeepPatientServiceSystem['elderlyLevel'] =
    score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'fair';

  const summary = score >= 80
    ? '当前服务已为老人全程调好：大字、语音、无障碍、志愿者、一步直达全开，老人也能自己走完。'
    : score >= 60
      ? '大部分适老化已开启，建议补开剩余开关，老人会更省心。'
      : '适老化能力偏少，老人容易卡壳，建议优先开启大字与语音播报。';

  return { patientId, modules, elderly, elderlyReadinessScore: score, elderlyLevel, summary };
}

/* ============================== 2. 患者流程优化（导航） ============================== */

/** 导航输入：当前位置与目标位置（可传节点 code，也可传名称片段） */
export interface FlowLocation {
  /** 节点 code（优先匹配） */
  code?: string;
  /** 名称片段（如 '心内' / 'CT'，兜底模糊匹配） */
  name?: string;
}

/** 导引单步 */
export interface NavStep {
  /** 动作：直行 / 乘电梯 / 转弯 / 到达 */
  action: 'walk' | 'elevator' | 'turn' | 'arrive';
  /** 人读指令（如「沿大厅直走 60 米到西1号电梯」） */
  instruction: string;
  /** 本段距离（米） */
  distanceM: number;
  /** 本段楼层（跨层时显示） */
  floor?: number;
}

/** optimizePatientFlow 输出 */
export interface PatientFlowOptimization {
  patientId: string;
  fromName: string;
  toName: string;
  /** 规划路径经过的节点 code 列表 */
  path: string[];
  /** 逐步行人指令（老人照着走） */
  steps: NavStep[];
  /** 总步行距离（米） */
  totalDistanceM: number;
  /** 预计步行耗时（分钟），按老人步速 40 米/分估 */
  etaMin: number;
  /** 是否走了无障碍通道 */
  barrierFree: boolean;
  /** 是否跨楼层（需要电梯） */
  crossFloor: boolean;
  /** 红旗目标（急诊）时的强提示 */
  urgent: boolean;
  /** AR 导引是否开启（老人迷路时可一键重新规划） */
  arGuidance: boolean;
}

/** 两点直线距离（米） */
function nodeDist(a: HospitalNode, b: HospitalNode): number {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 10) / 10;
}

/** 步行速度：老人默认 40 米/分，普通 60 米/分 */
const ELDERLY_WALK_MPM = 40;

/** 在图中解析一个位置为节点；code 精确优先，其次名称包含匹配 */
function resolveNode(graph: HospitalGraph, loc: FlowLocation): HospitalNode | null {
  if (loc.code) {
    const hit = graph.nodes.find((n) => n.code === loc.code);
    if (hit) return hit;
  }
  if (loc.name) {
    const kw = loc.name.trim();
    const hit = graph.nodes.find((n) => n.name.includes(kw) || n.code.includes(kw));
    if (hit) return hit;
  }
  return null;
}

/**
 * 患者流程优化（纯函数）：在院内图上用 BFS 找起点→终点路径，
 * 跨层默认走无障碍直梯；输出逐步人读导引、距离与 ETA。
 *
 * @param patientId 患者标识
 * @param currentLocation 当前位置
 * @param destination     目标位置
 * @param graph           可选院内图；缺省用内置最小院图
 * @param elderly          可选是否按老人步速/无障碍（缺省 true）
 */
export function optimizePatientFlow(
  patientId: string,
  currentLocation: FlowLocation,
  destination: FlowLocation,
  graph?: HospitalGraph,
  elderly = true,
): PatientFlowOptimization {
  const g = graph ?? DEFAULT_HOSPITAL_GRAPH;
  const start = resolveNode(g, currentLocation);
  const end = resolveNode(g, destination);

  const empty: PatientFlowOptimization = {
    patientId,
    fromName: start?.name ?? currentLocation.name ?? currentLocation.code ?? '未知起点',
    toName: end?.name ?? destination.name ?? destination.code ?? '未知终点',
    path: [],
    steps: [],
    totalDistanceM: 0,
    etaMin: 0,
    barrierFree: true,
    crossFloor: false,
    urgent: false,
    arGuidance: true,
  };

  if (!start || !end) {
    // 起点或终点解析不到：照常返回已识别到的名称，并给一句兜底提示
    return {
      ...empty,
      steps: [{ action: 'arrive', instruction: '暂未识别到该地点，请联系志愿者导引。', distanceM: 0 }],
    };
  }

  // BFS 最短路径（边数最少）
  const prev = new Map<string, string | null>();
  const queue: string[] = [start.code];
  prev.set(start.code, null);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === end.code) break;
    for (const next of g.adjacency[cur] ?? []) {
      if (!prev.has(next)) {
        prev.set(next, cur);
        queue.push(next);
      }
    }
  }
  if (!prev.has(end.code)) {
    return { ...empty, steps: [{ action: 'arrive', instruction: '暂未连通的地点，请联系志愿者导引。', distanceM: 0 }] };
  }

  // 还原路径
  const path: string[] = [];
  let cur: string | null = end.code;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }

  const nodeByCode = new Map(g.nodes.map((n) => [n.code, n]));
  let total = 0;
  let crossFloor = false;
  let barrierFree = true;
  const steps: NavStep[] = [];

  for (let i = 0; i < path.length - 1; i += 1) {
    const a = nodeByCode.get(path[i])!;
    const b = nodeByCode.get(path[i + 1])!;
    const d = nodeDist(a, b);
    total += d;
    if (a.barrierFree === false || b.barrierFree === false) barrierFree = false;
    if (a.floor !== b.floor) {
      crossFloor = true;
      steps.push({
        action: 'elevator',
        instruction: `在「${a.name}」乘直梯到 ${b.floor} 层（已优先安排无障碍电梯）`,
        distanceM: 0,
        floor: b.floor,
      });
    } else {
      const action: NavStep['action'] = 'walk';
      steps.push({
        action,
        instruction: i === 0
          ? `从「${a.name}」出发，沿${a.floor === b.floor ? '平地' : `${b.floor} 层`}走到「${b.name}」（约 ${Math.round(d)} 米）`
          : `继续沿${a.floor}层走到「${b.name}」（约 ${Math.round(d)} 米）`,
        distanceM: d,
        floor: a.floor,
      });
    }
  }
  steps.push({ action: 'arrive', instruction: `已到达「${end.name}」，祝您就诊顺利。`, distanceM: 0, floor: end.floor });

  const speed = elderly ? ELDERLY_WALK_MPM : 60;
  const etaMin = Math.round((total / speed) * 10) / 10;
  const urgent = end.code === 'emergency' || /急诊|抢救/.test(end.name);

  return {
    patientId,
    fromName: start.name,
    toName: end.name,
    path,
    steps,
    totalDistanceM: Math.round(total * 10) / 10,
    etaMin,
    barrierFree: elderly ? true : barrierFree,
    crossFloor,
    urgent,
    arGuidance: true,
  };
}

/* ============================== 3. 等待时间预测 ============================== */

/** 服务类型（智慧门诊各环节） */
export type WaitServiceType =
  | 'registration'   // 挂号收费
  | 'triage'         // 分诊候诊
  | 'consultation'   // 诊室就诊
  | 'check'          // 检查检验
  | 'pharmacy';      // 取药

export const WAIT_TYPE_LABEL: Record<WaitServiceType, string> = {
  registration: '挂号收费',
  triage: '分诊候诊',
  consultation: '诊室就诊',
  check: '检查检验',
  pharmacy: '取药',
};

/** 队列实况 */
export interface QueueSnapshot {
  /** 患者前方排队人数（含正在被服务者折算） */
  aheadCount: number;
  /** 当前开放的窗口/诊室数 */
  openWindows: number;
  /** 单个患者平均服务耗时（分钟） */
  avgServiceMinutes: number;
}

/** predictPatientWaitTime 输出 */
export interface WaitPrediction {
  serviceType: WaitServiceType;
  serviceTypeName: string;
  /** 预计等待（分钟，已按优先队列修正） */
  predictedWaitMin: number;
  /** 前方人数 */
  aheadCount: number;
  openWindows: number;
  /** 灯号：low 绿 / medium 黄 / high 红 */
  level: 'low' | 'medium' | 'high';
  /** 一句老人能懂的话 */
  plainMessage: string;
}

/**
 * 等待时间预测（纯函数）。
 * 模型：预计等待 =（前方人数 / 开放窗口）× 单均耗时；
 *   - 前方人数 ≤ 0：即刻/约 0；
 *   - 开放窗口 ≤ 0：按单窗口估，并提示「窗口未全开」；
 *   - 老人/急诊优先：调用方可在 aheadCount 上自行折算插队人数。
 * 灯号：≤10 分钟绿、≤25 黄、其余红。
 *
 * @param serviceType 服务类型
 * @param queue      队列实况
 */
export function predictPatientWaitTime(
  serviceType: WaitServiceType,
  queue: QueueSnapshot,
): WaitPrediction {
  const ahead = Math.max(0, Math.floor(queue.aheadCount || 0));
  const windows = Math.max(0, Math.floor(queue.openWindows || 0));
  const avg = Math.max(0.1, queue.avgServiceMinutes || 5);

  // 有效并行窗口；未开窗时按 1 个保守估
  const effectiveWindows = windows > 0 ? windows : 1;
  const predicted = ahead <= 0
    ? 0
    : Math.round((ahead / effectiveWindows) * avg * 10) / 10;

  const level: WaitPrediction['level'] =
    predicted <= 10 ? 'low' : predicted <= 25 ? 'medium' : 'high';

  const plainMessage = ahead <= 0
    ? `现在基本不用等，直接去${WAIT_TYPE_LABEL[serviceType]}。`
    : windows <= 0
      ? `${WAIT_TYPE_LABEL[serviceType]}窗口暂未全开，前方约 ${ahead} 人，预计还要等 ${predicted} 分钟，可先找志愿者休息区坐会儿。`
      : `您前面约 ${ahead} 人、开了 ${windows} 个窗口，预计还要等 ${predicted} 分钟，大屏幕会叫号，老人可优先安排。`;

  return {
    serviceType,
    serviceTypeName: WAIT_TYPE_LABEL[serviceType],
    predictedWaitMin: predicted,
    aheadCount: ahead,
    openWindows: windows,
    level,
    plainMessage,
  };
}

/* ============================== 4. 个性化服务 ============================== */

/** 患者偏好（个性化输入） */
export interface PatientPreferences {
  /** 年龄段：elderly 老人 / adult 成人 / child 儿童 */
  ageBand?: 'elderly' | 'adult' | 'child';
  /** 语言（zh / zh-cn / en …） */
  language?: string;
  /** 是否需要语音播报 */
  needsVoice?: boolean;
  /** 是否无障碍（行动不便） */
  wheelchair?: boolean;
  /** 是否有家属陪同 */
  accompanied?: boolean;
  /** 提醒渠道：sms / wechat / voice */
  reminderChannels?: Array<'sms' | 'wechat' | 'voice'>;
  /** 偏好科室/医生（可空） */
  preferredDoctorName?: string;
}

/** 个性化输出：为该患者调好的服务参数 */
export interface PersonalizedService {
  patientId: string;
  /** 字号档位：large 大（老人）/ medium 常规 / small */
  fontScale: 'large' | 'medium' | 'small';
  voiceBroadcast: boolean;
  /** 导航是否强制无障碍 */
  forceBarrierFree: boolean;
  /** 是否安排陪伴/志愿者窗口 */
  volunteerDesk: boolean;
  /** 叫号优先级（elderly 优先） */
  queuePriority: 'normal' | 'priority';
  /** 提醒渠道列表 */
  reminderChannels: Array<'sms' | 'wechat' | 'voice'>;
  /** 为该患者生成的一句欢迎语（老人也能听懂） */
  greeting: string;
}

/**
 * 个性化服务（纯函数）。按患者画像自适应：
 *   - 老人 / 轮椅：大字号 + 语音播报 + 强制无障碍 + 志愿者窗口 + 叫号优先；
 *   - 儿童：常规字号 + 游戏化叫号提示（这里仅降级为陪伴窗口）；
 *   - 提醒渠道缺省：老人默认 sms+voice，其余 sms+wechat。
 *
 * @param patientId   患者标识
 * @param preferences 患者偏好
 */
export function personalizePatientService(
  patientId: string,
  preferences: PatientPreferences = {},
): PersonalizedService {
  const isElderly = preferences.ageBand === 'elderly';
  const isChild = preferences.ageBand === 'child';
  const wheelchair = preferences.wheelchair === true;

  const fontScale: PersonalizedService['fontScale'] = isElderly ? 'large' : isChild ? 'medium' : 'medium';
  const voiceBroadcast = preferences.needsVoice === true || isElderly;
  const forceBarrierFree = isElderly || wheelchair;
  const volunteerDesk = isElderly || wheelchair || isChild || preferences.accompanied === true;
  const queuePriority = isElderly || wheelchair ? 'priority' : 'normal';

  const reminderChannels: PersonalizedService['reminderChannels'] =
    preferences.reminderChannels && preferences.reminderChannels.length > 0
      ? preferences.reminderChannels
      : isElderly
        ? ['sms', 'voice']
        : ['sms', 'wechat'];

  const greeting = isElderly
    ? '您好，已为您调大字体并开启语音导航，行动不便会安排直梯与志愿者陪您走，别着急。'
    : wheelchair
      ? '您好，已为您规划无障碍路线并安排志愿者陪伴，轮椅可直达诊室。'
      : isChild
        ? '小朋友您好，已安排儿童友好窗口，叫号时会大声喊您名字，别怕。'
        : '您好，已按您的偏好备好号源与提醒，祝您就诊顺利。';

  return {
    patientId,
    fontScale,
    voiceBroadcast,
    forceBarrierFree,
    volunteerDesk,
    queuePriority,
    reminderChannels,
    greeting,
  };
}
