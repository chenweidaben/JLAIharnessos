/**
 * 健澜科技 jlmedaios - v5.0启动 数字孪生 3D 住院试点聚合器（M182-D）
 *
 * 【v5.0 路线图 · 数字孪生 3D 深化】先住院试点，不做全院重建：
 *   - buildTwin3DInpatient(buildingId?)   住院楼 3D 楼层建模（病房/护士站/治疗室/配药室）；
 *   - trackBedStatus3D(building, floor)   3D 床位状态实时映射（空/占/隔离/出院准备 四态）；
 *   - simulateInpatientFlow(scenario)     住院流仿真（入院→住院→治疗→出院准备→出院）。
 *
 * 设计要点：
 *  - 三个核心函数均为纯函数：不读库、不发网络、不碰 WebSocket，便于单测与前端复用；
 *  - 试点边界：仅住院楼（7F 心内科病区 / 8F 普外科病区）两层，不做门诊/急诊/医技全院重建；
 *  - 床位四态（住院口径）：available 空（绿）/ occupied 占（深海蓝）/
 *    isolation 隔离（橙）/ discharge_ready 出院准备（青）；
 *  - 护士站工作负荷：当前待执行医嘱 + 待执行护理任务 + 在岗护士 → 负荷等级；
 *  - 患者位置只输出脱敏标识（P-xxxx），不落姓名/身份证，符合隐私合规；
 *  - 不新增依赖：前端用 SVG 画楼层图与床位散点，不引入 Three.js。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** 住院床位四态：空 available / 占 occupied / 隔离 isolation / 出院准备 discharge_ready */
export type InpatientBedState = 'available' | 'occupied' | 'isolation' | 'discharge_ready';

/** 住院楼房间类型：病房 / 护士站 / 治疗室 / 配药室 / 走廊 */
export type InpatientRoomType = 'ward' | 'nurse_station' | 'treatment_room' | 'dispensing_room' | 'corridor';

/** 三维向量（世界坐标：x/y 网格单位，z 米） */
export interface TwinVec3 {
  x: number;
  y: number;
  z: number;
}

/** 三维包围盒（min 角 + max 角） */
export interface TwinBox3 {
  min: TwinVec3;
  max: TwinVec3;
}

/** 住院床位（三维位置：床中心地面投影 + 床垫面标高） */
export interface InpatientBed3D {
  bedId: string;
  bedNo: string;
  state: InpatientBedState;
  patientRef: string | null;
  /** 床中心在世界坐标中的位置（z=床垫面高，约 0.45m） */
  position: TwinVec3;
  /** 四态色值（与前端 VI 对齐） */
  color: string;
}

/** 一个住院房间（三维挤出盒） */
export interface InpatientRoom3D {
  roomId: string;
  buildingId: string;
  floor: string;
  roomCode: string;
  roomName: string;
  roomType: InpatientRoomType;
  deptName: string;
  /** 三维包围盒（min=地面一角，max=顶棚对角） */
  box: TwinBox3;
  beds: InpatientBed3D[];
}

/** 护士站工作负荷监控 */
export interface NurseStationLoad {
  stationId: string;
  stationName: string;
  floor: string;
  deptName: string;
  /** 当前待执行医嘱数 */
  pendingOrders: number;
  /** 当前待执行护理任务数 */
  pendingNursingTasks: number;
  /** 在岗护士人数 */
  staffOnDuty: number;
  /** 负荷等级：空闲 idle / 正常 normal / 繁忙 busy / 过载 overload */
  loadLevel: 'idle' | 'normal' | 'busy' | 'overload';
  /** 护士站三维位置（用于 3D 标注） */
  position: TwinVec3;
}

/** 住院楼层（含底面标高） */
export interface InpatientFloor3D {
  floor: string;
  /** 楼层底面标高（米） */
  z: number;
  /** 本楼层高（米） */
  height: number;
  rooms: InpatientRoom3D[];
  nurseStation: NurseStationLoad;
}

/** 数字孪生 3D 住院试点聚合结果 */
export interface InpatientTwin {
  buildingId: string;
  buildingName: string;
  /** 试点标记：true 表示仅住院楼两层，不做全院重建 */
  pilot: true;
  floors: InpatientFloor3D[];
  summary: {
    totalRooms: number;
    totalBeds: number;
    available: number;
    occupied: number;
    isolation: number;
    dischargeReady: number;
    /** 占用率 = (占+隔离+出院准备)/总床 ×100，保留 1 位小数 */
    occupancyRate: number;
  };
  generatedAt: string;
}

/* --------------------------- trackBedStatus3D 产出 --------------------------- */

/** 单床 3D 状态映射项 */
export interface BedStatus3DItem {
  bedId: string;
  bedNo: string;
  floor: string;
  roomCode: string;
  roomName: string;
  state: InpatientBedState;
  patientRef: string | null;
  position: TwinVec3;
  color: string;
}

/** 3D 床位状态实时映射结果 */
export interface BedStatus3DResult {
  buildingId: string;
  buildingName: string;
  floor: string;
  beds: BedStatus3DItem[];
  counts: Record<InpatientBedState, number>;
  /** 占用率 = (占+隔离+出院准备)/总床 ×100 */
  occupancyRate: number;
  updatedAt: string;
}

/* --------------------------- 住院流仿真 --------------------------- */

export type InpatientFlowScenario = 'normal' | 'busy' | 'surge';

/** 住院流阶段：入院 → 住院 → 治疗 → 出院准备 → 出院 */
export type InpatientStage = 'admission' | 'inpatient' | 'treatment' | 'discharge_ready' | 'discharge';

/** 单个患者仿真帧（脱敏） */
export interface InpatientFlowFrame {
  patientRef: string;
  /** 仿真时间步（0..N-1，每步=1 天） */
  t: number;
  stage: InpatientStage;
  position: TwinVec3;
}

/** 住院流仿真结果 */
export interface InpatientFlowResult {
  scenario: InpatientFlowScenario;
  /** 仿真天数 */
  days: number;
  /** 平均每日入院人数 */
  admissionsPerDay: number;
  /** 平均每日出院人数 */
  dischargesPerDay: number;
  /** 平均住院日（天） */
  avgLOSDays: number;
  /** 每日在院 / 待出院人数曲线 */
  censusCurve: { t: number; inpatient: number; awaitingDischarge: number }[];
  /** 轨迹样本（脱敏患者动线，供前端画流向） */
  trajectories: InpatientFlowFrame[][];
  /** 瓶颈阶段（平均滞留最久的阶段） */
  bottleneck: { stage: InpatientStage; avgStayDays: number };
  note: string;
}

/* --------------------------- 内置演示台账 --------------------------- */

interface InpatientRoomSeed {
  roomCode: string;
  roomName: string;
  roomType: InpatientRoomType;
  deptName: string;
  /** 2D footprint（0..1000 × 0..560 网格） */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 房间净高（米） */
  ceilingH: number;
  bedStates: InpatientBedState[];
}

/** 护士站负荷种子 */
interface NurseStationSeed {
  floor: string;
  stationId: string;
  stationName: string;
  deptName: string;
  pendingOrders: number;
  pendingNursingTasks: number;
  staffOnDuty: number;
  x: number;
  y: number;
}

/** 住院楼 3D 演示台账（纯函数内存数据，不读库；7F=27.0m，8F=31.5m，层高 4.5m） */
const INPATIENT_BUILDING = {
  buildingId: 'inpatient',
  buildingName: '住院楼',
  floors: [
    { floor: '7', z: 27.0, height: 4.5 },
    { floor: '8', z: 31.5, height: 4.5 },
  ],
  nurseStations: [
    {
      floor: '7', stationId: 'NS-7', stationName: '心内护士站', deptName: '心血管内科',
      pendingOrders: 24, pendingNursingTasks: 40, staffOnDuty: 8, x: 190, y: 370,
    },
    {
      floor: '8', stationId: 'NS-8', stationName: '普外护士站', deptName: '普通外科',
      pendingOrders: 10, pendingNursingTasks: 18, staffOnDuty: 8, x: 190, y: 370,
    },
  ] as NurseStationSeed[],
  rooms: [
    // ---- 7F 心血管内科病区 ----
    {
      roomCode: '701', roomName: '心内一病房', roomType: 'ward', deptName: '心血管内科',
      x: 60, y: 90, width: 240, height: 180, ceilingH: 4.5,
      bedStates: ['occupied', 'occupied', 'occupied', 'occupied', 'available', 'available', 'discharge_ready'],
    },
    {
      roomCode: '702', roomName: '心内二病房', roomType: 'ward', deptName: '心血管内科',
      x: 340, y: 90, width: 240, height: 180, ceilingH: 4.5,
      bedStates: ['occupied', 'occupied', 'occupied', 'isolation', 'available', 'available'],
    },
    {
      roomCode: '703', roomName: '心内三病房', roomType: 'ward', deptName: '心血管内科',
      x: 620, y: 90, width: 240, height: 180, ceilingH: 4.5,
      bedStates: ['occupied', 'occupied', 'occupied', 'occupied', 'occupied', 'discharge_ready', 'discharge_ready'],
    },
    {
      roomCode: '7-N', roomName: '心内护士站', roomType: 'nurse_station', deptName: '心血管内科',
      x: 60, y: 320, width: 260, height: 100, ceilingH: 4.5, bedStates: [],
    },
    {
      roomCode: '7-T', roomName: '心内治疗室', roomType: 'treatment_room', deptName: '心血管内科',
      x: 360, y: 320, width: 180, height: 100, ceilingH: 4.5, bedStates: [],
    },
    {
      roomCode: '7-D', roomName: '心内配药室', roomType: 'dispensing_room', deptName: '心血管内科',
      x: 580, y: 320, width: 180, height: 100, ceilingH: 4.5, bedStates: [],
    },
    // ---- 8F 普通外科病区 ----
    {
      roomCode: '801', roomName: '普外一病房', roomType: 'ward', deptName: '普通外科',
      x: 60, y: 90, width: 240, height: 180, ceilingH: 4.5,
      bedStates: ['occupied', 'occupied', 'occupied', 'occupied', 'occupied', 'available'],
    },
    {
      roomCode: '802', roomName: '普外二病房', roomType: 'ward', deptName: '普通外科',
      x: 340, y: 90, width: 240, height: 180, ceilingH: 4.5,
      bedStates: ['occupied', 'occupied', 'isolation', 'isolation', 'discharge_ready'],
    },
    {
      roomCode: '803', roomName: '普外三病房', roomType: 'ward', deptName: '普通外科',
      x: 620, y: 90, width: 240, height: 180, ceilingH: 4.5,
      bedStates: ['occupied', 'occupied', 'occupied', 'occupied', 'available', 'available', 'available'],
    },
    {
      roomCode: '8-N', roomName: '普外护士站', roomType: 'nurse_station', deptName: '普通外科',
      x: 60, y: 320, width: 260, height: 100, ceilingH: 4.5, bedStates: [],
    },
    {
      roomCode: '8-T', roomName: '普外治疗室', roomType: 'treatment_room', deptName: '普通外科',
      x: 360, y: 320, width: 180, height: 100, ceilingH: 4.5, bedStates: [],
    },
    {
      roomCode: '8-D', roomName: '普外配药室', roomType: 'dispensing_room', deptName: '普通外科',
      x: 580, y: 320, width: 180, height: 100, ceilingH: 4.5, bedStates: [],
    },
  ] as InpatientRoomSeed[],
};

/** 住院床位四态配色（深海蓝 VI：占床用主色，出院准备用青色区别于维护灰） */
const BED_COLOR_INPATIENT: Record<InpatientBedState, string> = {
  available: '#52C41A',
  occupied: '#1E5AA8',
  isolation: '#FA8C16',
  discharge_ready: '#13C2C2',
};

/** 房间种子 → 楼层归属（7xx/7-x → 7F，8xx/8-x → 8F） */
function roomBelongsToInpatientFloor(room: InpatientRoomSeed, floor: string): boolean {
  if (room.roomCode.startsWith('7')) return floor === '7';
  if (room.roomCode.startsWith('8')) return floor === '8';
  return false;
}

/** 把一个房间种子摊平为 InpatientRoom3D（含床位三维位置） */
function buildInpatientRoom(floorInfo: { floor: string; z: number }, seed: InpatientRoomSeed): InpatientRoom3D {
  const zFloor = floorInfo.z;
  const zCeil = zFloor + seed.ceilingH;
  const box: TwinBox3 = {
    min: { x: seed.x, y: seed.y, z: zFloor },
    max: { x: seed.x + seed.width, y: seed.y + seed.height, z: zCeil },
  };

  // 床位在病房内按 2 列网格排布（床垫面标高 = 楼层底 + 0.45m）
  const cols = 2;
  const cellW = 70;
  const cellH = 46;
  const beds: InpatientBed3D[] = seed.bedStates.map((state, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const gx = seed.x + 24 + col * cellW;
    const gy = seed.y + 26 + row * cellH;
    const hasPatient = state !== 'available';
    return {
      bedId: `${INPATIENT_BUILDING.buildingId}-${floorInfo.floor}-${seed.roomCode}-B${i + 1}`,
      bedNo: `${i + 1}`,
      state,
      patientRef: hasPatient ? `P-${5000 + floorInfo.floor.charCodeAt(0) * 37 + seed.bedStates.length * 11 + i * 17}` : null,
      position: { x: gx, y: gy, z: zFloor + 0.45 },
      color: BED_COLOR_INPATIENT[state],
    };
  });

  return {
    roomId: `${INPATIENT_BUILDING.buildingId}-${floorInfo.floor}-${seed.roomCode}`,
    buildingId: INPATIENT_BUILDING.buildingId,
    floor: floorInfo.floor,
    roomCode: seed.roomCode,
    roomName: seed.roomName,
    roomType: seed.roomType,
    deptName: seed.deptName,
    box,
    beds,
  };
}

/** 由护士站种子推导负荷等级（任务强度 = 待执行医嘱×0.5 + 护理任务，除以在岗护士） */
function deriveLoadLevel(seed: NurseStationSeed): NurseStationLoad['loadLevel'] {
  const intensity = (seed.pendingOrders * 0.5 + seed.pendingNursingTasks) / Math.max(1, seed.staffOnDuty);
  if (intensity < 3) return 'idle';
  if (intensity < 6) return 'normal';
  if (intensity < 10) return 'busy';
  return 'overload';
}

/* --------------------------- buildTwin3DInpatient --------------------------- */

/**
 * buildTwin3DInpatient：数字孪生 3D 住院试点（仅住院楼 7F/8F，不做全院重建）。
 *
 * @param buildingId 楼宇编号（固定试点楼 'inpatient'；未知时同样回退住院楼）
 * @returns InpatientTwin（楼层/房间三维包围盒/床位四态/护士站工作负荷 + 汇总）
 *
 * 纯函数：相同入参必得相同布局（generatedAt 为调用时刻，不参与布局逻辑）。
 */
export function buildTwin3DInpatient(buildingId: string = 'inpatient'): InpatientTwin {
  // 试点边界：入参楼宇名不影响模型——v5.0 先住院试点，不做全院重建
  void buildingId;

  const floors: InpatientFloor3D[] = INPATIENT_BUILDING.floors.map((f) => {
    const rooms: InpatientRoom3D[] = INPATIENT_BUILDING.rooms
      .filter((r) => roomBelongsToInpatientFloor(r, f.floor))
      .map((r) => buildInpatientRoom(f, r));
    const nsSeed = INPATIENT_BUILDING.nurseStations.find((n) => n.floor === f.floor) as NurseStationSeed;
    const nurseStation: NurseStationLoad = {
      stationId: nsSeed.stationId,
      stationName: nsSeed.stationName,
      floor: f.floor,
      deptName: nsSeed.deptName,
      pendingOrders: nsSeed.pendingOrders,
      pendingNursingTasks: nsSeed.pendingNursingTasks,
      staffOnDuty: nsSeed.staffOnDuty,
      loadLevel: deriveLoadLevel(nsSeed),
      position: { x: nsSeed.x, y: nsSeed.y, z: f.z + 0.2 },
    };
    return { floor: f.floor, z: f.z, height: f.height, rooms, nurseStation };
  });

  const allBeds = floors.flatMap((f) => f.rooms.flatMap((r) => r.beds));
  const inUse =
    allBeds.filter((b) => b.state === 'occupied').length +
    allBeds.filter((b) => b.state === 'isolation').length +
    allBeds.filter((b) => b.state === 'discharge_ready').length;
  const totalBeds = allBeds.length;

  return {
    buildingId: INPATIENT_BUILDING.buildingId,
    buildingName: INPATIENT_BUILDING.buildingName,
    pilot: true,
    floors,
    summary: {
      totalRooms: floors.reduce((s, f) => s + f.rooms.length, 0),
      totalBeds,
      available: allBeds.filter((b) => b.state === 'available').length,
      occupied: allBeds.filter((b) => b.state === 'occupied').length,
      isolation: allBeds.filter((b) => b.state === 'isolation').length,
      dischargeReady: allBeds.filter((b) => b.state === 'discharge_ready').length,
      occupancyRate: totalBeds === 0 ? 0 : Math.round((inUse / totalBeds) * 1000) / 10,
    },
    generatedAt: new Date().toISOString(),
  };
}

/* --------------------------- trackBedStatus3D --------------------------- */

/**
 * trackBedStatus3D：3D 床位状态实时映射（指定住院楼某一层）。
 *
 * @param building 楼宇编号（固定试点住院楼，入参兼容但不切换模型）
 * @param floor    楼层（'7' / '8'）；未知楼层返回空床位列表
 * @returns        BedStatus3DResult（每张床的状态/三维位置/颜色 + 四态计数 + 占用率）
 *
 * 纯函数：相同入参必得相同映射。空床无 patientRef；出院准备床仍有患者（待出院）。
 */
export function trackBedStatus3D(building: string, floor: string): BedStatus3DResult {
  void building; // 试点期仅住院楼
  const twin = buildTwin3DInpatient();
  const fl = twin.floors.find((f) => f.floor === floor);

  if (!fl) {
    return {
      buildingId: twin.buildingId,
      buildingName: twin.buildingName,
      floor: floor ?? '',
      beds: [],
      counts: { available: 0, occupied: 0, isolation: 0, discharge_ready: 0 },
      occupancyRate: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  const beds: BedStatus3DItem[] = fl.rooms.flatMap((room) =>
    room.beds.map((bed) => ({
      bedId: bed.bedId,
      bedNo: bed.bedNo,
      floor: fl.floor,
      roomCode: room.roomCode,
      roomName: room.roomName,
      state: bed.state,
      patientRef: bed.patientRef,
      position: bed.position,
      color: bed.color,
    })),
  );

  const counts: Record<InpatientBedState, number> = {
    available: beds.filter((b) => b.state === 'available').length,
    occupied: beds.filter((b) => b.state === 'occupied').length,
    isolation: beds.filter((b) => b.state === 'isolation').length,
    discharge_ready: beds.filter((b) => b.state === 'discharge_ready').length,
  };
  const inUse = counts.occupied + counts.isolation + counts.discharge_ready;
  const occupancyRate =
    beds.length === 0 ? 0 : Math.round((inUse / beds.length) * 1000) / 10;

  return {
    buildingId: twin.buildingId,
    buildingName: twin.buildingName,
    floor: fl.floor,
    beds,
    counts,
    occupancyRate,
    updatedAt: new Date().toISOString(),
  };
}

/* --------------------------- simulateInpatientFlow --------------------------- */

/** 确定性伪随机数（mulberry32），保证仿真轨迹可复算、单测稳定 */
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

/** 情景参数：日均入院 / 平均住院日系数 / 说明 */
const INPATIENT_FLOW_META: Record<
  InpatientFlowScenario,
  { admissionsPerDay: number; losDays: number; note: string }
> = {
  normal: { admissionsPerDay: 4, losDays: 6, note: '常态：日均入院约 4 人，平均住院日 6 天，床位周转平稳' },
  busy: { admissionsPerDay: 7, losDays: 7, note: '忙碌：日间手术与转诊集中，日均入院 7 人，出院准备区积压' },
  surge: { admissionsPerDay: 11, losDays: 9, note: '高峰：流感/批量创伤致入院激增，隔离床与走廊加床压力上升' },
};

/** 住院流阶段锚点（住院楼 7F 世界坐标，z=0.9 人体中心） */
const INPATIENT_STAGE_ANCHOR: Record<InpatientStage, TwinVec3> = {
  admission: { x: 120, y: 470, z: 27.9 },
  inpatient: { x: 380, y: 180, z: 27.9 },
  treatment: { x: 450, y: 370, z: 27.9 },
  discharge_ready: { x: 660, y: 370, z: 27.9 },
  discharge: { x: 120, y: 470, z: 27.9 },
};

/** 阶段推进顺序：入院 → 住院 → 治疗 → 出院准备 → 出院 */
const INPATIENT_STAGE_ORDER: InpatientStage[] = [
  'admission',
  'inpatient',
  'treatment',
  'discharge_ready',
  'discharge',
];

/**
 * simulateInpatientFlow：仿真患者住院全程流动（入院→住院→治疗→出院准备→出院）。
 *
 * @param scenario normal / busy / surge
 * @returns        InpatientFlowResult（确定性种子，同参必同结果）
 *
 * 纯函数：不读当前时间、不读库；seed 固定，便于回放与单测。
 */
export function simulateInpatientFlow(scenario: InpatientFlowScenario): InpatientFlowResult {
  const meta = INPATIENT_FLOW_META[scenario] ?? INPATIENT_FLOW_META.normal;
  const days = 30; // 仿真 30 天
  const rand = mulberry32(0x5f1e2a);

  // 每个患者：在某一天入院，按 LOS 天数推进阶段
  const trajectories: InpatientFlowFrame[][] = [];
  const censusCurve: { t: number; inpatient: number; awaitingDischarge: number }[] = [];
  const stageStayAccum: Record<InpatientStage, number> = {
    admission: 0, inpatient: 0, treatment: 0, discharge_ready: 0, discharge: 0,
  };
  let totalAdmissions = 0;
  let totalDischarges = 0;
  let totalLos = 0;

  for (let t = 0; t < days; t++) {
    // 当日新入院（泊松近似）
    const admissions = Math.max(0, Math.round(meta.admissionsPerDay * (0.75 + rand() * 0.5)));
    totalAdmissions += admissions;

    for (let a = 0; a < admissions; a++) {
      const patientRef = `P-${6000 + totalAdmissions * 13 + a * 7}`;
      const los = Math.max(2, Math.round(meta.losDays * (0.7 + rand() * 0.7)));
      totalLos += los;
      const frames: InpatientFlowFrame[] = [];

      // 阶段时间分配：入院 1 天，治疗占大头，出院准备 1-2 天
      const stayTreatment = Math.max(1, Math.round(los * 0.6));
      const stayReady = Math.max(1, los - stayTreatment - 1);
      const stagePlan: { stage: InpatientStage; days: number }[] = [
        { stage: 'admission', days: 1 },
        { stage: 'inpatient', days: 1 },
        { stage: 'treatment', days: stayTreatment },
        { stage: 'discharge_ready', days: stayReady },
      ];

      let dayOffset = 0;
      for (const seg of stagePlan) {
        for (let d = 0; d < seg.days && t + dayOffset < days; d++) {
          frames.push({
            patientRef,
            t: t + dayOffset,
            stage: seg.stage,
            position: { ...INPATIENT_STAGE_ANCHOR[seg.stage] },
          });
          stageStayAccum[seg.stage] += 1;
          dayOffset += 1;
        }
      }
      // 出院帧
      if (t + dayOffset < days) {
        frames.push({
          patientRef,
          t: t + dayOffset,
          stage: 'discharge',
          position: { ...INPATIENT_STAGE_ANCHOR.discharge },
        });
        totalDischarges += 1;
      }
      trajectories.push(frames);
    }

    // 当日在院（处于 inpatient/treatment/discharge_ready 阶段）人数
    const inpatient = trajectories.filter((tr) =>
      tr.some((f) => f.t === t && (f.stage === 'inpatient' || f.stage === 'treatment')),
    ).length;
    const awaitingDischarge = trajectories.filter((tr) =>
      tr.some((f) => f.t === t && f.stage === 'discharge_ready'),
    ).length;
    censusCurve.push({ t, inpatient, awaitingDischarge });
  }

  // 瓶颈阶段：平均滞留天数最长（除 discharge 终点外）
  let bottleneck: { stage: InpatientStage; avgStayDays: number } = { stage: 'treatment', avgStayDays: 0 };
  for (const stage of INPATIENT_STAGE_ORDER.slice(0, -1)) {
    const patientsAtStage = trajectories.filter((tr) => tr.some((f) => f.stage === stage)).length || 1;
    const avgStay = Math.round((stageStayAccum[stage] / patientsAtStage) * 10) / 10;
    if (avgStay > bottleneck.avgStayDays) {
      bottleneck = { stage, avgStayDays: avgStay };
    }
  }

  return {
    scenario,
    days,
    admissionsPerDay: Math.round((totalAdmissions / days) * 10) / 10,
    dischargesPerDay: Math.round((totalDischarges / days) * 10) / 10,
    avgLOSDays: totalAdmissions === 0 ? 0 : Math.round((totalLos / totalAdmissions) * 10) / 10,
    censusCurve,
    trajectories: trajectories.slice(0, 20), // 只回传前 20 条轨迹样本（前端画动线）
    bottleneck,
    note: meta.note,
  };
}
