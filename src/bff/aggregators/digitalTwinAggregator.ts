/**
 * 健澜科技 jlmedaios - M160-B 医院数字孪生 2D 聚合器
 *
 * 本期只做 2D 可视化：
 *   - buildDigitalTwinBuilding(buildingId, floor?)  按楼宇/楼层构建 2D 平面布局
 *     （科室/病房/手术室/急诊 + 床位四态 + 脱敏患者位置 + 设备标注）；
 *   - updateDigitalTwinState(roomId, state)        纯函数：校验并归一化一次床位
 *     状态变更（空/占/隔离/维护），产出不可变的状态补丁事件；
 *   - simulateBedUsage(period, scenario)           纯函数：按日/周粒度与情景
 *     （normal/surge/epidemic/maintenance）仿真床位占用曲线（确定性种子，可复算）。
 *
 * 设计要点：
 *  - 三个核心函数均为纯函数：不读库、不发网络、不碰 WebSocket，便于单测与前端复用；
 *  - 布局数据来自内置演示台账（与 deploy/postgres/init/322-digital-twin.sql 种子对齐），
 *    空库/断库时仍可演示；生产环境后续由 BIM 导入工具写入 meta.room_layout；
 *  - 患者位置只输出脱敏标识（P-xxxx），不落姓名/身份证，符合隐私合规；
 *  - 床位四态与 clinical.beds / bedMapAggregator 对齐：
 *      available 空 / occupied 占 / isolation 隔离 / maintenance 维护。
 *
 * 【远期路线图】
 *  - 3D：接入 BIM/IFC + Three.js，坐标升级为三维包围盒；
 *  - 实时：WebSocket/MQTT 推送床位状态与穿戴定位（本期不碰 WS）；
 *  - 推演：基于 simulateBedUsage 做床位扩容与急诊高峰预案。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** 床位四态：空 available / 占 occupied / 隔离 isolation / 维护 maintenance */
export type BedState = 'available' | 'occupied' | 'isolation' | 'maintenance';

/** 房间类型：科室 / 病房 / 手术室 / 急诊 / 重症 / 护士站 / 走廊 / 其他 */
export type RoomType =
  | 'department'
  | 'ward'
  | 'operating_room'
  | 'er'
  | 'icu'
  | 'nurse_station'
  | 'corridor'
  | 'other';

/** 设备位置标注（2D 平面坐标） */
export interface TwinEquipment {
  code: string;
  name: string;
  x: number;
  y: number;
}

/** 脱敏患者位置标注（只存 P-xxxx，不落 PII） */
export interface TwinPatientMarker {
  patientRef: string;
  x: number;
  y: number;
}

/** 单张床位（2D 平面内相对坐标） */
export interface TwinBed {
  bedId: string;
  bedNo: string;
  state: BedState;
  /** 占用时的脱敏患者标识（空床为 null） */
  patientRef: string | null;
  x: number;
  y: number;
}

/** 一个房间（2D 平面矩形） */
export interface TwinRoom {
  roomId: string;
  buildingId: string;
  floor: string;
  roomCode: string;
  roomName: string;
  roomType: RoomType;
  deptName: string;
  /** 2D 平面归一化坐标（0..1000 网格） */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 房间聚合状态（四态之一） */
  status: BedState;
  beds: TwinBed[];
  equipment: TwinEquipment[];
  patientMarkers: TwinPatientMarker[];
}

/** 楼宇/楼层聚合结果 */
export interface TwinBuilding {
  buildingId: string;
  buildingName: string;
  floor: string | null;
  /** 该楼宇可用楼层列表 */
  floors: string[];
  rooms: TwinRoom[];
  summary: {
    totalRooms: number;
    totalBeds: number;
    available: number;
    occupied: number;
    isolation: number;
    maintenance: number;
    /** 占用率 0..100（含隔离为占用） */
    occupancyRate: number;
  };
  /** true 表示当前为内置演示布局（无真实 BIM 数据） */
  demo: boolean;
  generatedAt: string;
}

/** updateDigitalTwinState 产出的状态补丁事件（不可变） */
export interface DigitalTwinStatePatch {
  roomId: string;
  state: BedState;
  /** 单调序号（毫秒时间戳派生，便于前端动画对齐） */
  seq: number;
  updatedAt: string;
}

/** 仿真周期粒度 */
export type SimPeriod = 'hour' | 'day' | 'week';

/** 仿真情景 */
export type SimScenario = 'normal' | 'surge' | 'epidemic' | 'maintenance';

/** 仿真单点 */
export interface SimPoint {
  /** 时间标签（如 "00:00" / "周一" / "W1"） */
  t: string;
  available: number;
  occupied: number;
  isolation: number;
  maintenance: number;
  occupancyRate: number;
}

export interface SimResult {
  period: SimPeriod;
  scenario: SimScenario;
  totalBeds: number;
  points: SimPoint[];
  /** 情景说明（展示用） */
  scenarioNote: string;
}

/* --------------------------- 内置演示布局台账 --------------------------- */

interface RoomSeed {
  roomCode: string;
  roomName: string;
  roomType: RoomType;
  deptName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  /** 初始床位四态分布：长度 = 床位数，逐项给状态 */
  bedStates: BedState[];
  equipment?: TwinEquipment[];
}

interface BuildingSeed {
  buildingId: string;
  buildingName: string;
  floors: string[];
  rooms: RoomSeed[];
}

/** 演示楼宇台账（与 322-digital-twin.sql 种子一致；纯函数内存数据，不读库） */
const BUILDINGS: Record<string, BuildingSeed> = {
  main: {
    buildingId: 'main',
    buildingName: '门诊住院综合楼',
    floors: ['5', '6'],
    rooms: [
      {
        roomCode: '501', roomName: '心内科一病房', roomType: 'ward', deptName: '心血管内科',
        x: 60, y: 120, width: 260, height: 180, capacity: 6,
        bedStates: ['occupied', 'occupied', 'occupied', 'available', 'occupied', 'isolation'],
        equipment: [{ code: 'card-mon-01', name: '床旁监护仪', x: 120, y: 160 }],
      },
      {
        roomCode: '502', roomName: '心内科二病房', roomType: 'ward', deptName: '心血管内科',
        x: 360, y: 120, width: 260, height: 180, capacity: 4,
        bedStates: ['occupied', 'occupied', 'available', 'occupied'],
      },
      {
        roomCode: '503', roomName: 'CCU 监护室', roomType: 'icu', deptName: '心血管内科',
        x: 60, y: 340, width: 260, height: 180, capacity: 8,
        bedStates: ['isolation', 'isolation', 'occupied', 'occupied', 'available', 'occupied'],
        equipment: [
          { code: 'vent-01', name: '有创呼吸机', x: 120, y: 380 },
          { code: 'crrt-01', name: 'CRRT 机', x: 260, y: 420 },
        ],
      },
      {
        roomCode: '5-N', roomName: '心内科护士站', roomType: 'nurse_station', deptName: '心血管内科',
        x: 360, y: 340, width: 260, height: 90, capacity: 0, bedStates: [],
      },
      {
        roomCode: '601', roomName: '普外一病房', roomType: 'ward', deptName: '普通外科',
        x: 60, y: 120, width: 260, height: 180, capacity: 6,
        bedStates: ['occupied', 'occupied', 'maintenance', 'occupied', 'occupied'],
      },
      {
        roomCode: '602', roomName: '普外二病房', roomType: 'ward', deptName: '普通外科',
        x: 360, y: 120, width: 260, height: 180, capacity: 6,
        bedStates: ['occupied', 'available', 'available', 'occupied'],
      },
      {
        roomCode: 'OR-01', roomName: '一号手术室', roomType: 'operating_room', deptName: '手术麻醉科',
        x: 60, y: 340, width: 200, height: 160, capacity: 0, bedStates: [],
        equipment: [
          { code: 'anes-01', name: '麻醉机', x: 110, y: 380 },
          { code: 'op-lamp-01', name: '无影灯', x: 160, y: 400 },
        ],
      },
      {
        roomCode: 'OR-02', roomName: '二号手术室', roomType: 'operating_room', deptName: '手术麻醉科',
        x: 290, y: 340, width: 200, height: 160, capacity: 0, bedStates: [],
      },
      {
        roomCode: 'OR-03', roomName: '三号手术室', roomType: 'operating_room', deptName: '手术麻醉科',
        x: 520, y: 340, width: 200, height: 160, capacity: 0, bedStates: [],
      },
    ],
  },
  'er-building': {
    buildingId: 'er-building',
    buildingName: '急诊楼',
    floors: ['1'],
    rooms: [
      {
        roomCode: 'ER-抢救', roomName: '急诊抢救室', roomType: 'er', deptName: '急诊医学科',
        x: 60, y: 120, width: 300, height: 200, capacity: 6,
        bedStates: ['occupied', 'occupied', 'occupied', 'available', 'occupied'],
        equipment: [{ code: 'crash-01', name: '抢救车', x: 100, y: 160 }],
      },
      {
        roomCode: 'ER-留观', roomName: '急诊留观室', roomType: 'er', deptName: '急诊医学科',
        x: 400, y: 120, width: 300, height: 200, capacity: 10,
        bedStates: ['occupied', 'occupied', 'available', 'occupied', 'occupied', 'available', 'occupied'],
      },
      {
        roomCode: 'ER-诊室1', roomName: '急诊诊室一', roomType: 'department', deptName: '急诊医学科',
        x: 60, y: 360, width: 180, height: 120, capacity: 0, bedStates: [],
      },
    ],
  },
};

/** 合法四态集合（用于校验） */
const BED_STATES: readonly BedState[] = ['available', 'occupied', 'isolation', 'maintenance'];

/* --------------------------- buildDigitalTwinBuilding --------------------------- */

/** 由房间内床位列表推导房间聚合状态（隔离>占用>维护>空） */
function aggregateStatus(beds: TwinBed[]): BedState {
  if (beds.some((b) => b.state === 'isolation')) return 'isolation';
  if (beds.some((b) => b.state === 'occupied')) return 'occupied';
  if (beds.some((b) => b.state === 'maintenance')) return 'maintenance';
  return 'available';
}

/** 把一个房间种子摊平为 TwinRoom（含床位网格与脱敏患者位置） */
function buildRoom(buildingId: string, floor: string, seed: RoomSeed): TwinRoom {
  // 床位在房间内按 2 列网格排布（相对房间左上角偏移 20/20）
  const cols = 2;
  const cellW = 70;
  const cellH = 46;
  const beds: TwinBed[] = seed.bedStates.map((state, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const occupied = state === 'occupied' || state === 'isolation';
    return {
      bedId: `${buildingId}-${floor}-${seed.roomCode}-B${i + 1}`,
      bedNo: `${i + 1}`,
      state,
      patientRef: occupied ? `P-${1000 + buildingId.length * 100 + i * 13}` : null,
      x: seed.x + 20 + col * cellW,
      y: seed.y + 24 + row * cellH,
    };
  });

  // 脱敏患者位置：占用床旁放一个标记（不存任何 PII）
  const patientMarkers: TwinPatientMarker[] = beds
    .filter((b) => b.patientRef)
    .map((b) => ({ patientRef: b.patientRef as string, x: b.x + 18, y: b.y + 10 }));

  return {
    roomId: `${buildingId}-${floor}-${seed.roomCode}`,
    buildingId,
    floor,
    roomCode: seed.roomCode,
    roomName: seed.roomName,
    roomType: seed.roomType,
    deptName: seed.deptName,
    x: seed.x,
    y: seed.y,
    width: seed.width,
    height: seed.height,
    status: aggregateStatus(beds),
    beds,
    equipment: seed.equipment ?? [],
    patientMarkers,
  };
}

/**
 * buildDigitalTwinBuilding：按楼宇/楼层构建 2D 数字孪生布局。
 *
 * @param buildingId 楼宇编号（未知时回退 'main'）
 * @param floor       可选楼层过滤；不传则返回该楼宇全部楼层
 * @returns           TwinBuilding（rooms/beds/equipment/脱敏患者位置 + 四态汇总）
 *
 * 纯函数：相同入参必得相同出参（generatedAt 为调用时刻，见下）。
 * 注意：generatedAt 使用 new Date()，仅用于展示时间戳，不参与布局逻辑。
 */
export function buildDigitalTwinBuilding(
  buildingId: string,
  floor?: string | null,
): TwinBuilding {
  const seed = BUILDINGS[buildingId] ?? BUILDINGS.main;
  const rooms: TwinRoom[] = [];

  // 房间 → 楼层归属由 roomBelongsToFloor 显式判定（5xx→5F，6xx/OR-xx→6F，ER-xx→1F）
  for (const f of seed.floors) {
    if (floor && floor !== f) continue;
    for (const r of seed.rooms) {
      if (!roomBelongsToFloor(r, f)) continue;
      rooms.push(buildRoom(seed.buildingId, f, r));
    }
  }

  const allBeds = rooms.flatMap((r) => r.beds);
  const summary = {
    totalRooms: rooms.length,
    totalBeds: allBeds.length,
    available: allBeds.filter((b) => b.state === 'available').length,
    occupied: allBeds.filter((b) => b.state === 'occupied').length,
    isolation: allBeds.filter((b) => b.state === 'isolation').length,
    maintenance: allBeds.filter((b) => b.state === 'maintenance').length,
  };
  const inUse = summary.occupied + summary.isolation;
  const occupancyRate =
    summary.totalBeds === 0
      ? 0
      : Math.round((inUse / summary.totalBeds) * 1000) / 10;

  return {
    buildingId: seed.buildingId,
    buildingName: seed.buildingName,
    floor: floor ?? null,
    floors: seed.floors,
    rooms,
    summary: { ...summary, occupancyRate },
    demo: true,
    generatedAt: new Date().toISOString(),
  };
}

/** 房间种子 → 楼层归属（演示台账：main 楼 5 层为 5xx/5-N，6 层为 6xx/OR-xx） */
function roomBelongsToFloor(room: RoomSeed, floor: string): boolean {
  if (room.roomCode.startsWith('5')) return floor === '5';
  if (room.roomCode.startsWith('6') || room.roomCode.startsWith('OR-')) return floor === '6';
  // er-building 全部房间归 1 层
  return floor === '1';
}

/* --------------------------- updateDigitalTwinState --------------------------- */

/**
 * updateDigitalTwinState：校验并归一化一次床位/房间状态变更。
 *
 * 纯函数：不修改任何外部状态，产出一个不可变的补丁事件，由路由层
 * （远期可扩 POST /api/v1/admin/digital-twin/state）应用到布局上。
 *
 * @param roomId 房间标识（building-floor-roomCode）
 * @param state  目标四态（available/occupied/isolation/maintenance）
 * @throws  状态非法时抛 Error（纯函数对非法入参 fail-fast，便于调用方捕获）
 */
export function updateDigitalTwinState(
  roomId: string,
  state: BedState,
): DigitalTwinStatePatch {
  const normalizedRoom = roomId.trim();
  if (!normalizedRoom) {
    throw new Error('updateDigitalTwinState: roomId 不能为空');
  }
  if (!BED_STATES.includes(state)) {
    throw new Error(
      `updateDigitalTwinState: 非法床位状态 "${String(state)}"，` +
        `仅支持 available/occupied/isolation/maintenance`,
    );
  }
  return {
    roomId: normalizedRoom,
    state,
    seq: Date.now(),
    updatedAt: new Date().toISOString(),
  };
}

/* --------------------------- simulateBedUsage --------------------------- */

/** 确定性伪随机数（mulberry32），保证仿真曲线可复算、单测稳定 */
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

const PERIOD_LABELS: Record<SimPeriod, string[]> = {
  hour: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
  day: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  week: Array.from({ length: 12 }, (_, i) => `W${i + 1}`),
};

/** 情景参数：基础占用率 / 隔离加成 / 维护占比 / 说明 */
const SCENARIO_META: Record<SimScenario, { base: number; isolation: number; maintenance: number; note: string }> = {
  normal:     { base: 0.70, isolation: 0.03, maintenance: 0.05, note: '常态运行：占用率约 70%' },
  surge:      { base: 0.88, isolation: 0.04, maintenance: 0.04, note: '门诊/就诊高峰：占用率飙升，空床紧张' },
  epidemic:   { base: 0.78, isolation: 0.18, maintenance: 0.03, note: '传染病聚集：隔离床位显著抬升' },
  maintenance:{ base: 0.62, isolation: 0.03, maintenance: 0.14, note: '计划性维护：维修床位增多，可用床位下降' },
};

/**
 * simulateBedUsage：按周期粒度与情景仿真床位四态占用曲线。
 *
 * @param period   hour=一天24点 / day=一周7天 / week=12周
 * @param scenario normal/surge/epidemic/maintenance
 * @returns        SimResult（确定性种子，同参必同结果）
 *
 * 纯函数：不读当前时间、不读库；seed 固定，便于回放与单测。
 */
export function simulateBedUsage(
  period: SimPeriod,
  scenario: SimScenario,
): SimResult {
  const labels = PERIOD_LABELS[period] ?? PERIOD_LABELS.day;
  const meta = SCENARIO_META[scenario] ?? SCENARIO_META.normal;
  const totalBeds = 60; // 演示：一层病区 60 床
  const rand = mulberry32(0x20261016);

  // 周期性因子：hour 白天双峰 / day 周末回落 / week 平缓爬坡
  const points: SimPoint[] = labels.map((t, i) => {
    let cycle = 1;
    if (period === 'hour') {
      // 早 8-11、晚 17-20 双峰
      const h = i;
      cycle = 0.72 + 0.28 * Math.exp(-Math.pow((h - 10) / 3.2, 2))
            + 0.22 * Math.exp(-Math.pow((h - 19) / 2.6, 2))
            - 0.30 * Math.exp(-Math.pow((h - 3) / 2.2, 2));
    } else if (period === 'day') {
      cycle = i < 5 ? 1.0 : 0.82; // 周末回落
    } else {
      cycle = 0.92 + 0.08 * (i / (labels.length - 1)); // 12 周平缓爬坡
    }

    const noise = (rand() - 0.5) * 0.08;
    let rate = meta.base * cycle + noise;
    rate = Math.min(0.97, Math.max(0.35, rate));

    const isolation = Math.round(totalBeds * meta.isolation * (0.8 + rand() * 0.4));
    const maintenance = Math.round(totalBeds * meta.maintenance * (0.8 + rand() * 0.4));
    const available = Math.max(0, Math.round(totalBeds - totalBeds * rate - maintenance));
    const occupied = Math.max(0, totalBeds - available - isolation - maintenance);
    const occupancyRate = Math.round(((occupied + isolation) / totalBeds) * 1000) / 10;

    return { t, available, occupied, isolation, maintenance, occupancyRate };
  });

  return { period, scenario, totalBeds, points, scenarioNote: meta.note };
}
