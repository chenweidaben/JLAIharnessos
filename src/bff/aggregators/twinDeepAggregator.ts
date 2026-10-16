/**
 * 健澜科技 jlmedaios - M170-B 医院数字孪生深化——多建筑与仿真聚合器
 *
 * 【自学习与数字孪生】在 M160-B 2D 单楼布局、M161-A 定时快照/流程仿真之上，
 *   把数字孪生升级为「全院多建筑可视化 + 患者流仿真 + 人流密度预测 + 路线优化」：
 *
 *   - buildMultiBuildingTwin(buildings?) 纯函数：构建覆盖四类楼宇的多建筑孪生底图
 *     （门诊楼/住院楼/医技楼/急诊楼 → 楼层/科室/诊室/候诊区/病房/床位/护士站/
 *       检查室/检验室/手术室/抢救室/留观室/输液室），输出 2D 平面坐标与密度分级，
 *     让数字孪生「看得见」而非只有数字。
 *   - simulatePatientFlow(building, scenario) 纯函数：按时间步推演某楼宇患者流
 *     （到院/候诊/已服务/溢出/紧张度），支持常态/门诊高峰/传染病/批量伤员四情景。
 *   - predictCrowdDensity(building, period) 纯函数：按小时/天粒度预测各分区人流
 *     密度（低/中/高/拥挤）与热点分区，供大屏热力渲染。
 *   - optimizePatientRoute(building, start, end) 纯函数：在楼宇分区邻接图上跑
 *     Dijkstra 最短路径（边权含拥挤惩罚），返回路径、预计耗时与拥堵等级，用于导诊。
 *
 * 设计要点：
 *  - 四个函数均为纯函数：不读库、不发网络、不碰 WebSocket，便于单测与前端复用；
 *  - 内置演示台账与 deploy/postgres/init/339-twin-deep.sql 种子对齐，空库可演示；
 *  - 患者仅输出脱敏标识（P-xxxx），不落 PII；密度/路径为确定性种子，可复算；
 *  - crowd_baseline 为冷启动基线，远期由自学习模块用真实叫号/客流数据回写校准。
 *
 * 【远期】3D BIM/Three.js、WebSocket 增量推送、真实排班与历史客流校准（本切片不做）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** 楼宇大类：门诊 / 住院 / 医技 / 急诊 */
export type BuildingKind = 'outpatient' | 'inpatient' | 'medical_tech' | 'emergency';

/** 细粒度分区类型 */
export type ZoneType =
  | 'department' | 'clinic_room' | 'waiting_area'
  | 'ward' | 'bed' | 'nurse_station'
  | 'exam_room' | 'lab_room' | 'operating_room'
  | 'resus' | 'observation' | 'infusion'
  | 'corridor' | 'other';

/** 密度分级：低 / 中 / 高 / 拥挤 */
export type CrowdLevel = 'low' | 'medium' | 'high' | 'crowded';

/** 患者流仿真情景 */
export type FlowScenario = 'normal' | 'morning_peak' | 'epidemic' | 'mass_casualty';

/** 密度预测周期 */
export type DensityPeriod = 'hour' | 'day';

/** 一个孪生分区（2D 平面矩形 + 客流基线 + 邻接走廊） */
export interface TwinZone {
  zoneCode: string;
  zoneName: string;
  zoneType: ZoneType;
  floor: string;
  /** 2D 平面归一化坐标（0..1000 网格） */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 容量（人次/床位） */
  capacity: number;
  /** 基线人流密度（人次/小时，冷启动；远期自学习回写） */
  crowdBaseline: number;
  /** 当前密度分级（由基线派生，用于着色） */
  crowdLevel: CrowdLevel;
  /** 邻接分区编码（走廊连通图） */
  neighbors: string[];
}

/** 多建筑孪生中的一个楼宇视图 */
export interface MultiBuildingView {
  buildingId: string;
  buildingName: string;
  kind: BuildingKind;
  kindName: string;
  floors: string[];
  zones: TwinZone[];
  summary: {
    floors: number;
    zones: number;
    totalCapacity: number;
    totalCrowdBaseline: number;
    /** 拥挤分区数 */
    crowdedZones: number;
  };
}

/** buildMultiBuildingTwin 返回的全院多建筑孪生 */
export interface MultiBuildingTwin {
  buildings: MultiBuildingView[];
  totalBuildings: number;
  totalZones: number;
  totalCapacity: number;
  totalCrowdBaseline: number;
  /** true 表示当前为内置演示台账（无真实 BIM 数据） */
  demo: boolean;
  generatedAt: string;
}

/** 患者流仿真单点 */
export interface FlowTick {
  t: string;
  /** 到院人数 */
  arrivals: number;
  /** 当前候诊/候检队列 */
  waiting: number;
  /** 累计已服务 */
  served: number;
  /** 溢出/滞留人数（超出承接力） */
  overflow: number;
  /** 资源紧张度 0..100 */
  strain: number;
}

export interface PatientFlowResult {
  building: string;
  buildingName: string;
  scenario: FlowScenario;
  scenarioNote: string;
  ticks: FlowTick[];
  peakStrain: number;
  peakWaiting: number;
  actions: string[];
}

/** 密度预测单点 */
export interface DensityPoint {
  t: string;
  /** 预测在院人数（人次） */
  crowd: number;
  level: CrowdLevel;
  /** 该时段热点分区（按预测客流 Top-N） */
  hotZones: string[];
}

export interface CrowdDensityResult {
  building: string;
  buildingName: string;
  period: DensityPeriod;
  points: DensityPoint[];
  peakCrowd: number;
  note: string;
}

/** 路线优化结果 */
export interface OptimizedRoute {
  building: string;
  buildingName: string;
  start: string;
  end: string;
  /** 有序分区编码（含起终点） */
  path: string[];
  /** 有序分区名称（前端渲染用） */
  pathNames: string[];
  /** 路径累计代价（加权跳数） */
  distance: number;
  /** 预计步行耗时（分钟，演示参数） */
  estMinutes: number;
  /** 全程拥堵等级 */
  congestion: 'smooth' | 'moderate' | 'crowded';
}

/* --------------------------- 内置演示台账 --------------------------- */

interface ZoneSeed {
  code: string;
  name: string;
  type: ZoneType;
  floor: string;
  x: number; y: number; w: number; h: number;
  capacity: number;
  crowdBaseline: number;
  neighbors: string[];
}

interface BuildingSeed {
  buildingId: string;
  buildingName: string;
  kind: BuildingKind;
  kindName: string;
  floors: string[];
  zones: ZoneSeed[];
}

/** 四楼宇演示台账（与 339-twin-deep.sql 种子一致；纯函数内存数据，不读库） */
const BUILDINGS: Record<string, BuildingSeed> = {
  /* ------------------------- 门诊楼：楼层/科室/诊室/候诊区 ------------------------- */
  'opd-building': {
    buildingId: 'opd-building',
    buildingName: '门诊楼',
    kind: 'outpatient',
    kindName: '门诊楼',
    floors: ['1', '2', '3'],
    zones: [
      { code: 'OPD-大厅', name: '门诊大厅', type: 'waiting_area', floor: '1', x: 60, y: 80, w: 880, h: 120, capacity: 600, crowdBaseline: 480, neighbors: ['OPD-挂号', 'OPD-导诊', 'OPD-药房', 'OPD-连廊2'] },
      { code: 'OPD-挂号', name: '挂号收费处', type: 'department', floor: '1', x: 60, y: 220, w: 200, h: 100, capacity: 80, crowdBaseline: 200, neighbors: ['OPD-大厅', 'OPD-药房'] },
      { code: 'OPD-导诊', name: '导诊台', type: 'nurse_station', floor: '1', x: 300, y: 220, w: 160, h: 100, capacity: 10, crowdBaseline: 120, neighbors: ['OPD-大厅'] },
      { code: 'OPD-药房', name: '门诊药房', type: 'department', floor: '1', x: 820, y: 220, w: 180, h: 100, capacity: 50, crowdBaseline: 150, neighbors: ['OPD-挂号', 'OPD-大厅'] },
      { code: 'OPD-内科', name: '内科诊室', type: 'clinic_room', floor: '2', x: 60, y: 120, w: 260, h: 160, capacity: 40, crowdBaseline: 180, neighbors: ['OPD-候诊2', 'OPD-连廊2'] },
      { code: 'OPD-外科', name: '外科诊室', type: 'clinic_room', floor: '2', x: 360, y: 120, w: 260, h: 160, capacity: 40, crowdBaseline: 160, neighbors: ['OPD-候诊2', 'OPD-连廊2'] },
      { code: 'OPD-候诊2', name: '二层候诊区', type: 'waiting_area', floor: '2', x: 660, y: 120, w: 280, h: 160, capacity: 200, crowdBaseline: 220, neighbors: ['OPD-内科', 'OPD-外科', 'OPD-连廊2'] },
      { code: 'OPD-连廊2', name: '二层走廊', type: 'corridor', floor: '2', x: 60, y: 320, w: 880, h: 60, capacity: 400, crowdBaseline: 300, neighbors: ['OPD-内科', 'OPD-外科', 'OPD-候诊2', 'OPD-专科3', 'OPD-候诊3', 'OPD-大厅'] },
      { code: 'OPD-专科3', name: '专科诊室', type: 'clinic_room', floor: '3', x: 60, y: 120, w: 400, h: 200, capacity: 30, crowdBaseline: 140, neighbors: ['OPD-候诊3', 'OPD-连廊3'] },
      { code: 'OPD-候诊3', name: '三层候诊区', type: 'waiting_area', floor: '3', x: 500, y: 120, w: 440, h: 200, capacity: 150, crowdBaseline: 160, neighbors: ['OPD-专科3', 'OPD-连廊3'] },
      { code: 'OPD-连廊3', name: '三层走廊', type: 'corridor', floor: '3', x: 60, y: 360, w: 880, h: 60, capacity: 300, crowdBaseline: 200, neighbors: ['OPD-专科3', 'OPD-候诊3', 'OPD-连廊2'] },
    ],
  },
  /* ------------------------- 住院楼：楼层/病房/床位/护士站 ------------------------- */
  'ipd-building': {
    buildingId: 'ipd-building',
    buildingName: '住院楼',
    kind: 'inpatient',
    kindName: '住院楼',
    floors: ['5', '6'],
    zones: [
      { code: 'IPD-5大厅', name: '五层病区大厅', type: 'waiting_area', floor: '5', x: 60, y: 80, w: 880, h: 100, capacity: 120, crowdBaseline: 60, neighbors: ['IPD-5护士站', 'IPD-501', 'IPD-502', 'IPD-电梯厅'] },
      { code: 'IPD-5护士站', name: '五层护士站', type: 'nurse_station', floor: '5', x: 380, y: 200, w: 240, h: 90, capacity: 8, crowdBaseline: 30, neighbors: ['IPD-5大厅', 'IPD-501', 'IPD-502', 'IPD-5CCU'] },
      { code: 'IPD-501', name: '心内科一病房', type: 'ward', floor: '5', x: 60, y: 200, w: 280, h: 180, capacity: 40, crowdBaseline: 25, neighbors: ['IPD-5大厅', 'IPD-5护士站'] },
      { code: 'IPD-502', name: '心内科二病房', type: 'ward', floor: '5', x: 60, y: 400, w: 280, h: 180, capacity: 40, crowdBaseline: 22, neighbors: ['IPD-5大厅', 'IPD-5护士站'] },
      { code: 'IPD-5CCU', name: 'CCU 监护室', type: 'ward', floor: '5', x: 680, y: 200, w: 260, h: 200, capacity: 20, crowdBaseline: 18, neighbors: ['IPD-5护士站'] },
      { code: 'IPD-电梯厅', name: '五层电梯厅', type: 'corridor', floor: '5', x: 680, y: 440, w: 260, h: 80, capacity: 100, crowdBaseline: 90, neighbors: ['IPD-5大厅', 'IPD-6电梯厅'] },
      { code: 'IPD-6大厅', name: '六层病区大厅', type: 'waiting_area', floor: '6', x: 60, y: 80, w: 880, h: 100, capacity: 120, crowdBaseline: 55, neighbors: ['IPD-6护士站', 'IPD-601', 'IPD-602', 'IPD-6电梯厅'] },
      { code: 'IPD-6护士站', name: '六层护士站', type: 'nurse_station', floor: '6', x: 380, y: 200, w: 240, h: 90, capacity: 8, crowdBaseline: 28, neighbors: ['IPD-6大厅', 'IPD-601', 'IPD-602'] },
      { code: 'IPD-601', name: '普外一病房', type: 'ward', floor: '6', x: 60, y: 200, w: 280, h: 180, capacity: 40, crowdBaseline: 24, neighbors: ['IPD-6大厅', 'IPD-6护士站'] },
      { code: 'IPD-602', name: '普外二病房', type: 'ward', floor: '6', x: 60, y: 400, w: 280, h: 180, capacity: 40, crowdBaseline: 20, neighbors: ['IPD-6大厅', 'IPD-6护士站'] },
      { code: 'IPD-6电梯厅', name: '六层电梯厅', type: 'corridor', floor: '6', x: 680, y: 200, w: 260, h: 120, capacity: 100, crowdBaseline: 95, neighbors: ['IPD-6大厅', 'IPD-电梯厅'] },
    ],
  },
  /* ------------------------- 医技楼：检查室/检验室/手术室 ------------------------- */
  'tech-building': {
    buildingId: 'tech-building',
    buildingName: '医技楼',
    kind: 'medical_tech',
    kindName: '医技楼',
    floors: ['2', '3', '4'],
    zones: [
      { code: 'TECH-2大厅', name: '医技大厅', type: 'waiting_area', floor: '2', x: 60, y: 80, w: 880, h: 100, capacity: 250, crowdBaseline: 200, neighbors: ['TECH-电梯', 'TECH-放射', 'TECH-超声'] },
      { code: 'TECH-电梯', name: '电梯厅', type: 'corridor', floor: '2', x: 60, y: 200, w: 160, h: 100, capacity: 80, crowdBaseline: 150, neighbors: ['TECH-2大厅', 'TECH-3大厅', 'TECH-4大厅'] },
      { code: 'TECH-放射', name: 'CT/DR 检查室', type: 'exam_room', floor: '2', x: 260, y: 200, w: 300, h: 200, capacity: 30, crowdBaseline: 120, neighbors: ['TECH-2大厅', 'TECH-候2'] },
      { code: 'TECH-候2', name: '二层候检区', type: 'waiting_area', floor: '2', x: 600, y: 200, w: 340, h: 200, capacity: 150, crowdBaseline: 140, neighbors: ['TECH-放射', 'TECH-超声'] },
      { code: 'TECH-超声', name: 'B 超检查室', type: 'exam_room', floor: '2', x: 260, y: 420, w: 300, h: 160, capacity: 24, crowdBaseline: 100, neighbors: ['TECH-2大厅', 'TECH-候2'] },
      { code: 'TECH-3大厅', name: '三层检验大厅', type: 'waiting_area', floor: '3', x: 60, y: 80, w: 880, h: 100, capacity: 200, crowdBaseline: 160, neighbors: ['TECH-电梯', 'TECH-检验', 'TECH-采血'] },
      { code: 'TECH-检验', name: '检验科', type: 'lab_room', floor: '3', x: 60, y: 200, w: 400, h: 200, capacity: 40, crowdBaseline: 90, neighbors: ['TECH-3大厅'] },
      { code: 'TECH-采血', name: '采血室', type: 'lab_room', floor: '3', x: 500, y: 200, w: 240, h: 200, capacity: 30, crowdBaseline: 110, neighbors: ['TECH-3大厅'] },
      { code: 'TECH-4大厅', name: '四层手术区大厅', type: 'waiting_area', floor: '4', x: 60, y: 80, w: 880, h: 100, capacity: 100, crowdBaseline: 70, neighbors: ['TECH-电梯', 'TECH-OR1', 'TECH-OR2', 'TECH-OR3'] },
      { code: 'TECH-OR1', name: '一号手术室', type: 'operating_room', floor: '4', x: 60, y: 200, w: 280, h: 200, capacity: 10, crowdBaseline: 12, neighbors: ['TECH-4大厅'] },
      { code: 'TECH-OR2', name: '二号手术室', type: 'operating_room', floor: '4', x: 360, y: 200, w: 280, h: 200, capacity: 10, crowdBaseline: 10, neighbors: ['TECH-4大厅'] },
      { code: 'TECH-OR3', name: '三号手术室', type: 'operating_room', floor: '4', x: 660, y: 200, w: 280, h: 200, capacity: 10, crowdBaseline: 8, neighbors: ['TECH-4大厅'] },
    ],
  },
  /* ------------------------- 急诊楼：抢救室/留观室/输液室 ------------------------- */
  'er-building': {
    buildingId: 'er-building',
    buildingName: '急诊楼',
    kind: 'emergency',
    kindName: '急诊楼',
    floors: ['1'],
    zones: [
      { code: 'ER-大厅', name: '急诊大厅', type: 'waiting_area', floor: '1', x: 60, y: 80, w: 880, h: 110, capacity: 300, crowdBaseline: 260, neighbors: ['ER-分诊', 'ER-抢救', 'ER-留观', 'ER-输液', 'ER-诊室'] },
      { code: 'ER-分诊', name: '检伤分诊台', type: 'nurse_station', floor: '1', x: 60, y: 210, w: 200, h: 90, capacity: 6, crowdBaseline: 140, neighbors: ['ER-大厅'] },
      { code: 'ER-抢救', name: '急诊抢救室', type: 'resus', floor: '1', x: 300, y: 210, w: 300, h: 200, capacity: 20, crowdBaseline: 45, neighbors: ['ER-大厅', 'ER-护士站'] },
      { code: 'ER-留观', name: '急诊留观室', type: 'observation', floor: '1', x: 60, y: 430, w: 300, h: 200, capacity: 40, crowdBaseline: 60, neighbors: ['ER-大厅', 'ER-护士站'] },
      { code: 'ER-输液', name: '急诊输液室', type: 'infusion', floor: '1', x: 380, y: 430, w: 300, h: 200, capacity: 60, crowdBaseline: 80, neighbors: ['ER-大厅'] },
      { code: 'ER-诊室', name: '急诊诊室', type: 'clinic_room', floor: '1', x: 640, y: 210, w: 300, h: 160, capacity: 12, crowdBaseline: 90, neighbors: ['ER-大厅'] },
      { code: 'ER-护士站', name: '急诊护士站', type: 'nurse_station', floor: '1', x: 640, y: 400, w: 300, h: 120, capacity: 10, crowdBaseline: 40, neighbors: ['ER-抢救', 'ER-留观'] },
    ],
  },
};

/** 全部合法楼宇编号（顺序即前端渲染顺序） */
const ALL_BUILDING_IDS = Object.keys(BUILDINGS);

/* --------------------------- 工具函数 --------------------------- */

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

/** 由基线人流派生密度分级（0..1000 网格下的演示阈值） */
export function crowdLevelOf(crowdBaseline: number): CrowdLevel {
  if (crowdBaseline >= 260) return 'crowded';
  if (crowdBaseline >= 150) return 'high';
  if (crowdBaseline >= 60) return 'medium';
  return 'low';
}

/** 解析楼宇：未给/非法回退全院；过滤到合法楼宇 */
function resolveBuildings(buildings?: string[] | string | null): BuildingSeed[] {
  if (!buildings || (Array.isArray(buildings) && buildings.length === 0)) {
    return ALL_BUILDING_IDS.map((id) => BUILDINGS[id]);
  }
  const list = Array.isArray(buildings) ? buildings : [buildings];
  const picked = list.map((id) => BUILDINGS[id]).filter(Boolean);
  return picked.length > 0 ? picked : ALL_BUILDING_IDS.map((id) => BUILDINGS[id]);
}

/* --------------------------- buildMultiBuildingTwin --------------------------- */

/** 把一个楼宇种子摊平为多建筑孪生视图（含密度分级与汇总） */
function buildBuildingView(seed: BuildingSeed): MultiBuildingView {
  const zones: TwinZone[] = seed.zones.map((z) => ({
    zoneCode: z.code,
    zoneName: z.name,
    zoneType: z.type,
    floor: z.floor,
    x: z.x, y: z.y, w: z.w, h: z.h,
    capacity: z.capacity,
    crowdBaseline: z.crowdBaseline,
    crowdLevel: crowdLevelOf(z.crowdBaseline),
    neighbors: z.neighbors,
  }));

  const totalCapacity = zones.reduce((s, z) => s + z.capacity, 0);
  const totalCrowdBaseline = zones.reduce((s, z) => s + z.crowdBaseline, 0);
  const crowdedZones = zones.filter((z) => z.crowdLevel === 'crowded').length;

  return {
    buildingId: seed.buildingId,
    buildingName: seed.buildingName,
    kind: seed.kind,
    kindName: seed.kindName,
    floors: seed.floors,
    zones,
    summary: {
      floors: seed.floors.length,
      zones: zones.length,
      totalCapacity,
      totalCrowdBaseline,
      crowdedZones,
    },
  };
}

/**
 * buildMultiBuildingTwin：构建覆盖全院四类楼宇的多建筑数字孪生底图。
 *
 * @param buildings 楼宇编号数组（门诊楼 opd-building / 住院楼 ipd-building /
 *                   医技楼 tech-building / 急诊楼 er-building）；不传或为空=全院
 * @returns         MultiBuildingTwin（每楼 2D 分区坐标 + 密度分级 + 汇总）
 *
 * 纯函数：相同入参必得相同出参（generatedAt 为调用时刻，仅展示用）。
 */
export function buildMultiBuildingTwin(buildings?: string[] | null): MultiBuildingTwin {
  const seeds = resolveBuildings(buildings);
  const views = seeds.map(buildBuildingView);

  return {
    buildings: views,
    totalBuildings: views.length,
    totalZones: views.reduce((s, v) => s + v.summary.zones, 0),
    totalCapacity: views.reduce((s, v) => s + v.summary.totalCapacity, 0),
    totalCrowdBaseline: views.reduce((s, v) => s + v.summary.totalCrowdBaseline, 0),
    demo: true,
    generatedAt: new Date().toISOString(),
  };
}

/* --------------------------- simulatePatientFlow --------------------------- */

/** 情景元信息：到院倍数 / 承接吞吐系数 / 紧张度基准 / 说明 / 建议 */
const FLOW_META: Record<
  FlowScenario,
  { multiplier: number; throughput: number; strainBase: number; note: string; actions: string[] }
> = {
  normal: {
    multiplier: 1.0, throughput: 1.0, strainBase: 30,
    note: '常态运行：患者流平稳，候诊队列短，各楼宇承接充分',
    actions: ['按常规排班运行，保持弹性出诊', '自助机/线上预约分流，维持候诊秩序'],
  },
  morning_peak: {
    multiplier: 1.9, throughput: 0.92, strainBase: 58,
    note: '门诊高峰（周一上午）：8-11 点到院陡增，候诊区与走廊排队堆积',
    actions: ['提前 30 分钟开台、开放弹性诊室与机动医师', '高峰错峰：引导预约患者分时到院', '增派导诊与收费/取药窗口'],
  },
  epidemic: {
    multiplier: 1.4, throughput: 0.85, strainBase: 66,
    note: '传染病聚集：发热/呼吸道患者集中，分诊与隔离压力上升',
    actions: ['开通发热/呼吸道专用通道与物理隔离分区', '加强预检分诊与院感防护，预留隔离候诊', '动态增配采样与输液位'],
  },
  mass_casualty: {
    multiplier: 2.8, throughput: 0.78, strainBase: 84,
    note: '突发批量伤员：短时间大量到院，急诊抢救/留观/输液位告急',
    actions: ['启动突发公共卫生事件应急预案与绿色通道', '按检伤分类（红/黄/绿）分区救治，腾挪留观/备用位', '调用全院机动人力，跨楼宇支援急诊'],
  },
};

/** 12 个时间步标签（每 30 分钟，覆盖上午就诊/事件窗口） */
const FLOW_TICKS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];

/**
 * simulatePatientFlow：按情景仿真某楼宇患者流（到院/候诊/已服务/溢出/紧张度）。
 *
 * @param building  楼宇编号（未知回退门诊楼 opd-building）
 * @param scenario  normal/morning_peak/epidemic/mass_casualty
 * @returns         PatientFlowResult（确定性种子，同参必同结果）
 */
export function simulatePatientFlow(
  building: string | null | undefined,
  scenario: FlowScenario,
): PatientFlowResult {
  const seed = BUILDINGS[building ?? ''] ?? BUILDINGS['opd-building'];
  const meta = FLOW_META[scenario] ?? FLOW_META.normal;
  // 楼宇规模系数：以全院平均基线为基准做缩放（门诊流量大、住院小）
  const scale = Math.max(0.4, seed.zones.reduce((s, z) => s + z.crowdBaseline, 0) / 320);
  const rand = mulberry32(0x20261018 ^ seed.buildingId.length ^ scenario.length);

  let waiting = 0;
  let served = 0;
  let peakStrain = 0;
  let peakWaiting = 0;
  const ticks: FlowTick[] = [];

  for (let i = 0; i < FLOW_TICKS.length; i += 1) {
    // 到院强度：以中段（约 10:00）为峰的钟形曲线
    const bell = Math.exp(-Math.pow((i - 4) / 3.2, 2));
    const arrivals = roundNonNeg(
      60 * scale * meta.multiplier * (1 + bell) * (0.9 + rand() * 0.2),
    );

    // 动态承接力：每步可消化 ≈ 到院的 throughput 系数 + 基础处理量，使队列有界
    const capacity = roundNonNeg(arrivals * meta.throughput + 14 * scale);
    const treated = Math.min(waiting + arrivals, capacity);
    served += treated;
    waiting = Math.max(0, waiting + arrivals - treated);
    // 溢出：候诊队列超过楼宇总容量 60% 部分视为滞留
    const cap = seed.zones.reduce((s, z) => s + z.capacity, 0);
    const overflow = Math.max(0, waiting - Math.round(cap * 0.6));

    const strain = Math.min(
      100,
      Math.round(meta.strainBase + waiting * 0.4 + overflow * 0.6 + (rand() - 0.5) * 5),
    );
    peakStrain = Math.max(peakStrain, strain);
    peakWaiting = Math.max(peakWaiting, waiting);

    ticks.push({ t: FLOW_TICKS[i], arrivals, waiting, served, overflow, strain });
  }

  return {
    building: seed.buildingId,
    buildingName: seed.buildingName,
    scenario,
    scenarioNote: meta.note,
    ticks,
    peakStrain,
    peakWaiting,
    actions: meta.actions,
  };
}

/* --------------------------- predictCrowdDensity --------------------------- */

const DENSITY_LABELS: Record<DensityPeriod, string[]> = {
  hour: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
  day: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
};

/** 密度分级阈值（在院人数） */
function levelOf(crowd: number): CrowdLevel {
  if (crowd >= 260) return 'crowded';
  if (crowd >= 150) return 'high';
  if (crowd >= 60) return 'medium';
  return 'low';
}

/**
 * predictCrowdDensity：按小时/天粒度预测某楼宇人流密度与热点分区。
 *
 * @param building 楼宇编号（未知回退门诊楼）
 * @param period   hour=一天24点 / day=一周7天
 * @returns        CrowdDensityResult（确定性种子；hotZones 为该时段 Top 热点分区）
 */
export function predictCrowdDensity(
  building: string | null | undefined,
  period: DensityPeriod,
): CrowdDensityResult {
  const seed = BUILDINGS[building ?? ''] ?? BUILDINGS['opd-building'];
  const labels = DENSITY_LABELS[period] ?? DENSITY_LABELS.day;
  const rand = mulberry32(0x20261019 ^ seed.buildingId.length ^ period.length);

  // 楼宇基线在院人数 = 全部分区 crowdBaseline 的加权和（走廊/候诊占比更高）
  const base = seed.zones.reduce((s, z) => s + z.crowdBaseline, 0) * 0.55;
  // 热点分区：按基线降序取前 3
  const hot = [...seed.zones].sort((a, b) => b.crowdBaseline - a.crowdBaseline).slice(0, 3);

  const points: DensityPoint[] = labels.map((t, i) => {
    let cycle = 1;
    if (period === 'hour') {
      // 白天双峰（10 点主、19 点次），凌晨回落
      cycle = 0.6
        + 0.45 * Math.exp(-Math.pow((i - 10) / 3.0, 2))
        + 0.22 * Math.exp(-Math.pow((i - 19) / 2.4, 2))
        - 0.35 * Math.exp(-Math.pow((i - 3) / 2.0, 2));
    } else {
      // 工作日高、周末回落（门诊/医技明显，住院平缓——用基线类别近似）
      cycle = i < 5 ? 1.0 : seed.kind === 'inpatient' ? 0.92 : 0.72;
    }

    const noise = (rand() - 0.5) * 0.12;
    const crowd = roundNonNeg(base * Math.max(0.2, cycle + noise));
    const level = levelOf(crowd);

    // 高密度时段热点分区更突出（拥挤时候诊/大厅类优先）
    const hotZones = (level === 'low' ? hot.slice(0, 1) : hot.slice(0, 3)).map((z) => z.name);

    return { t, crowd, level, hotZones };
  });

  const peakCrowd = Math.max(...points.map((p) => p.crowd));
  const note =
    seed.kind === 'emergency'
      ? '急诊楼：全天人流相对平稳但抢救/留观位敏感，建议保持应急通道畅通'
      : seed.kind === 'outpatient'
        ? '门诊楼：10 点前后为主峰，建议高峰错峰与弹性出诊'
        : seed.kind === 'medical_tech'
          ? '医技楼：检查/检验集中在上午，建议预约分时叫号'
          : '住院楼：人流平缓，电梯与护士站为动线关键节点';

  return { building: seed.buildingId, buildingName: seed.buildingName, period, points, peakCrowd, note };
}

/* --------------------------- optimizePatientRoute --------------------------- */

/** 边权：基础跳数 1 + 拥挤惩罚（基线越高代价越大）+ 病房/手术室绕行系数 */
function edgeWeight(from: ZoneSeed, to: ZoneSeed): number {
  const crowdPenalty = Math.min(1.0, to.crowdBaseline / 400);
  const typePenalty = to.type === 'operating_room' || to.type === 'resus' ? 0.3 : 0;
  return roundNonNeg((1 + crowdPenalty + typePenalty) * 10) / 10;
}

/**
 * optimizePatientRoute：在楼宇分区邻接图上跑 Dijkstra 最短（最省代价）路径。
 *
 * @param building 楼宇编号（未知抛错）
 * @param start    起点分区编码（如 OPD-大厅）
 * @param end      终点分区编码（如 TECH-放射；跨楼不支持，须在同一楼宇内）
 * @returns        OptimizedRoute（有序路径 + 累计代价 + 预计耗时 + 拥堵等级）
 * @throws         楼宇/起终点未知、或起终点相同无法寻路时抛 Error（fail-fast）
 *
 * 纯函数：图为内置台账，权重确定性，同参必同结果。
 */
export function optimizePatientRoute(
  building: string | null | undefined,
  start: string,
  end: string,
): OptimizedRoute {
  const seed = BUILDINGS[building ?? ''];
  if (!seed) {
    throw new Error(`optimizePatientRoute: 未知楼宇 "${String(building)}"`);
  }
  const zoneMap = new Map(seed.zones.map((z) => [z.code, z]));
  if (!start || !zoneMap.has(start)) {
    throw new Error(`optimizePatientRoute: 起点分区 "${String(start)}" 不存在于 ${seed.buildingName}`);
  }
  if (!end || !zoneMap.has(end)) {
    throw new Error(`optimizePatientRoute: 终点分区 "${String(end)}" 不存在于 ${seed.buildingName}`);
  }
  if (start === end) {
    throw new Error('optimizePatientRoute: 起点与终点相同，无需寻路');
  }

  // Dijkstra（小图：节点数 < 20，线性扫描即可）
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();
  for (const z of seed.zones) dist.set(z.code, Infinity);
  dist.set(start, 0);
  prev.set(start, null);

  while (true) {
    let cur: string | null = null;
    let best = Infinity;
    for (const z of seed.zones) {
      if (!visited.has(z.code) && (dist.get(z.code) as number) < best) {
        best = dist.get(z.code) as number;
        cur = z.code;
      }
    }
    if (cur === null || cur === end) break;
    visited.add(cur);

    const curZone = zoneMap.get(cur) as ZoneSeed;
    for (const nb of curZone.neighbors) {
      const nbZone = zoneMap.get(nb);
      if (!nbZone || visited.has(nb)) continue;
      const w = edgeWeight(curZone, nbZone);
      const nd = (dist.get(cur) as number) + w;
      if (nd < (dist.get(nb) as number)) {
        dist.set(nb, nd);
        prev.set(nb, cur);
      }
    }
  }

  const endDist = dist.get(end) as number;
  if (!Number.isFinite(endDist)) {
    throw new Error(`optimizePatientRoute: ${start} 与 ${end} 之间无连通路径`);
  }

  // 回溯路径
  const path: string[] = [];
  let walk: string | null = end;
  while (walk) {
    path.unshift(walk);
    walk = prev.get(walk) ?? null;
  }
  const pathNames = path.map((c) => (zoneMap.get(c) as ZoneSeed).name);

  // 拥堵等级：按路径平均拥挤惩罚判定
  const avgCrowd =
    path.slice(1).reduce((s, code) => s + (zoneMap.get(code) as ZoneSeed).crowdBaseline, 0) /
    Math.max(1, path.length - 1);
  const congestion: OptimizedRoute['congestion'] =
    avgCrowd >= 200 ? 'crowded' : avgCrowd >= 100 ? 'moderate' : 'smooth';

  return {
    building: seed.buildingId,
    buildingName: seed.buildingName,
    start,
    end,
    path,
    pathNames,
    distance: Math.round(endDist * 10) / 10,
    // 演示参数：每单位代价约 0.8 分钟步行
    estMinutes: Math.round(endDist * 0.8 * 10) / 10,
    congestion,
  };
}
