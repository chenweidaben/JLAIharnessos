/**
 * 健澜科技 jlmedaios - M175-C 医院数字孪生 3D 聚合器
 *
 * 【质量与新场景】3D 可视化要真可用，不能只是花哨：
 *   - build3DDigitalTwin(building)        按楼宇挤出三维包围盒
 *     （科室/病房/手术室/急诊 + 床位四态三维映射 + 脱敏患者三维位置 + 设备三维标注）；
 *   - render3DBuilding(building, floor)    等距投影：把三维世界坐标投影到二维屏幕坐标，
 *     前端无需 Three.js 即可用绝对定位画挤出体（顶面/左面/右面三面）；
 *   - simulate3DPatientFlow(scenario)     纯函数：按情景（normal/surge/epidemic）仿真
 *     患者在三维空间中的流动轨迹（确定性种子，可复算）；
 *   - optimize3DRoute(start, end, obstacles) 纯函数：3D 网格 A* 避障寻路，
 *     输出航点序列（护士送药/患者转运/应急疏散复用同一条路径）。
 *
 * 设计要点：
 *  - 四个核心函数均为纯函数：不读库、不发网络、不碰 WebSocket，便于单测与前端复用；
 *  - 世界坐标系：x=东西向（0..1000 网格），y=南北向（0..560 网格），z=标高（米）；
 *    楼层底面 floor_z（1F=0, 5F=18.0, 6F=22.5），房间净高 ceiling_h（门诊 3.6m，手术室 4.5m）；
 *  - 床位四态与 clinical.beds / digitalTwinAggregator 对齐：
 *      available 空（绿）/ occupied 占（深海蓝）/ isolation 隔离（橙）/ maintenance 维护（灰）；
 *  - 患者位置只输出脱敏标识（P-xxxx），不落姓名/身份证，符合隐私合规；
 *  - 不新增依赖：前端用 CSS 绝对定位 + SVG 等距投影画挤出体，不引入 Three.js。
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

/** 三维向量（世界坐标：x/y 网格单位，z 米） */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 三维包围盒（min 角 + max 角） */
export interface Box3 {
  min: Vec3;
  max: Vec3;
}

/** 床位（三维位置：床中心地面投影 + 标高） */
export interface Bed3D {
  bedId: string;
  bedNo: string;
  state: BedState;
  patientRef: string | null;
  /** 床中心在世界坐标中的位置（z=床垫面高，约 0.45m） */
  position: Vec3;
  /** 四态色值（与前端 VI 对齐） */
  color: string;
}

/** 设备三维标注 */
export interface Equipment3D {
  code: string;
  name: string;
  position: Vec3;
}

/** 脱敏患者三维位置标注 */
export interface PatientMarker3D {
  patientRef: string;
  position: Vec3;
}

/** 一个房间（三维挤出盒） */
export interface Room3D {
  roomId: string;
  buildingId: string;
  floor: string;
  roomCode: string;
  roomName: string;
  roomType: RoomType;
  deptName: string;
  /** 三维包围盒（min=地面一角，max=顶棚对角） */
  box: Box3;
  status: BedState;
  beds: Bed3D[];
  equipment: Equipment3D[];
  patientMarkers: PatientMarker3D[];
}

/** 楼层（含底面标高） */
export interface Floor3D {
  floor: string;
  /** 楼层底面标高（米） */
  z: number;
  /** 本楼层高（米） */
  height: number;
  rooms: Room3D[];
}

/** 楼宇 3D 聚合结果 */
export interface Building3D {
  buildingId: string;
  buildingName: string;
  floors: Floor3D[];
  summary: {
    totalRooms: number;
    totalBeds: number;
    available: number;
    occupied: number;
    isolation: number;
    maintenance: number;
    occupancyRate: number;
    /** 楼宇总高（米，最高楼层顶棚） */
    buildingHeight: number;
  };
  demo: boolean;
  generatedAt: string;
}

/* --------------------------- 等距投影（render 用） --------------------------- */

/** 投影后的屏幕坐标（2D，CSS px 域，前端按容器缩放） */
export interface ScreenPoint {
  sx: number;
  sy: number;
}

/** 投影后的房间挤出体（三面：顶面 + 左面 + 右面） */
export interface ProjectedRoom {
  roomId: string;
  roomName: string;
  roomType: RoomType;
  deptName: string;
  status: BedState;
  /** 顶面平行四边形四个屏幕点 */
  top: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  /** 左面（朝观察者的左侧立面）四个屏幕点 */
  left: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  /** 右面（朝观察者的右侧立面）四个屏幕点 */
  right: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  /** 房间中心标签位置 */
  label: ScreenPoint;
}

/** 投影后的床位/设备/患者散点 */
export interface ProjectedMarker {
  kind: 'bed' | 'equipment' | 'patient';
  ref: string;
  color: string;
  screen: ScreenPoint;
  /** 悬停提示 */
  tip: string;
}

/** render3DBuilding 产出（前端直接画，无需三维数学） */
export interface RenderedFloor {
  buildingId: string;
  buildingName: string;
  floor: string;
  /** 屏幕画布尺寸（等距投影后的包围盒宽高，前端按容器等比缩放） */
  canvas: { width: number; height: number };
  rooms: ProjectedRoom[];
  markers: ProjectedMarker[];
  generatedAt: string;
}

/* --------------------------- 患者流仿真 --------------------------- */

export type FlowScenario = 'normal' | 'surge' | 'epidemic';

/** 单个患者仿真帧（脱敏） */
export interface FlowPatientFrame {
  patientRef: string;
  /** 仿真时间步（0..N-1） */
  t: number;
  position: Vec3;
  /** 当前所在节点（急诊入口/分诊/候诊/病房/手术室/出院） */
  stage: string;
}

/** 患者流仿真结果 */
export interface FlowSimResult {
  scenario: FlowScenario;
  /** 时间步数（每步 = 5 分钟） */
  steps: number;
  /** 吞吐量：每步新到患者数 */
  arrivalsPerStep: number;
  /** 每步全院在院患者数（三维空间分布） */
  occupancyCurve: { t: number; count: number }[];
  /** 轨迹样本（脱敏患者轨迹，供前端画动线） */
  trajectories: FlowPatientFrame[][];
  /** 瓶颈节点（平均等待最长的节点） */
  bottleneck: { stage: string; avgWaitMin: number };
  note: string;
}

/* --------------------------- 3D 路线优化 --------------------------- */

/** 路线优化入参 */
export interface RouteObstacle extends Box3 {
  /** 障碍物标识（如 roomId / equipmentCode） */
  ref: string;
}

export interface RouteResult {
  /** 航点序列（含起点与终点） */
  waypoints: Vec3[];
  /** 路径长度（米，折线累加） */
  distanceM: number;
  /** 是否找到可行路径（false 表示被障碍物完全堵死） */
  found: boolean;
}

/* --------------------------- 内置演示台账 --------------------------- */

interface RoomSeed3D {
  roomCode: string;
  roomName: string;
  roomType: RoomType;
  deptName: string;
  /** 2D footprint（0..1000 × 0..560 网格，与 322 种子一致） */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 房间净高（米） */
  ceilingH: number;
  capacity: number;
  bedStates: BedState[];
  equipment?: { code: string; name: string }[];
}

interface BuildingSeed3D {
  buildingId: string;
  buildingName: string;
  /** 楼层底面标高（米） */
  floors: { floor: string; z: number; height: number }[];
  rooms: RoomSeed3D[];
}

/** 演示楼宇 3D 台账（与 322/351 SQL 种子对齐；纯函数内存数据，不读库） */
const BUILDINGS_3D: Record<string, BuildingSeed3D> = {
  main: {
    buildingId: 'main',
    buildingName: '门诊住院综合楼',
    floors: [
      { floor: '5', z: 18.0, height: 3.6 },
      { floor: '6', z: 22.5, height: 4.0 },
    ],
    rooms: [
      {
        roomCode: '501', roomName: '心内科一病房', roomType: 'ward', deptName: '心血管内科',
        x: 60, y: 120, width: 260, height: 180, ceilingH: 3.6, capacity: 6,
        bedStates: ['occupied', 'occupied', 'occupied', 'available', 'occupied', 'isolation'],
        equipment: [{ code: 'card-mon-01', name: '床旁监护仪' }],
      },
      {
        roomCode: '502', roomName: '心内科二病房', roomType: 'ward', deptName: '心血管内科',
        x: 360, y: 120, width: 260, height: 180, ceilingH: 3.6, capacity: 4,
        bedStates: ['occupied', 'occupied', 'available', 'occupied'],
      },
      {
        roomCode: '503', roomName: 'CCU 监护室', roomType: 'icu', deptName: '心血管内科',
        x: 60, y: 340, width: 260, height: 180, ceilingH: 3.6, capacity: 8,
        bedStates: ['isolation', 'isolation', 'occupied', 'occupied', 'available', 'occupied'],
        equipment: [
          { code: 'vent-01', name: '有创呼吸机' },
          { code: 'crrt-01', name: 'CRRT 机' },
        ],
      },
      {
        roomCode: '5-N', roomName: '心内科护士站', roomType: 'nurse_station', deptName: '心血管内科',
        x: 360, y: 340, width: 260, height: 90, ceilingH: 3.6, capacity: 0, bedStates: [],
      },
      {
        roomCode: '601', roomName: '普外一病房', roomType: 'ward', deptName: '普通外科',
        x: 60, y: 120, width: 260, height: 180, ceilingH: 3.6, capacity: 6,
        bedStates: ['occupied', 'occupied', 'maintenance', 'occupied', 'occupied'],
      },
      {
        roomCode: '602', roomName: '普外二病房', roomType: 'ward', deptName: '普通外科',
        x: 360, y: 120, width: 260, height: 180, ceilingH: 3.6, capacity: 6,
        bedStates: ['occupied', 'available', 'available', 'occupied'],
      },
      {
        roomCode: 'OR-01', roomName: '一号手术室', roomType: 'operating_room', deptName: '手术麻醉科',
        x: 60, y: 340, width: 200, height: 160, ceilingH: 4.5, capacity: 0, bedStates: [],
        equipment: [
          { code: 'anes-01', name: '麻醉机' },
          { code: 'op-lamp-01', name: '无影灯' },
        ],
      },
      {
        roomCode: 'OR-02', roomName: '二号手术室', roomType: 'operating_room', deptName: '手术麻醉科',
        x: 290, y: 340, width: 200, height: 160, ceilingH: 4.5, capacity: 0, bedStates: [],
      },
      {
        roomCode: 'OR-03', roomName: '三号手术室', roomType: 'operating_room', deptName: '手术麻醉科',
        x: 520, y: 340, width: 200, height: 160, ceilingH: 4.5, capacity: 0, bedStates: [],
      },
    ],
  },
  'er-building': {
    buildingId: 'er-building',
    buildingName: '急诊楼',
    floors: [{ floor: '1', z: 0.0, height: 3.6 }],
    rooms: [
      {
        roomCode: 'ER-抢救', roomName: '急诊抢救室', roomType: 'er', deptName: '急诊医学科',
        x: 60, y: 120, width: 300, height: 200, ceilingH: 3.6, capacity: 6,
        bedStates: ['occupied', 'occupied', 'occupied', 'available', 'occupied'],
        equipment: [{ code: 'crash-01', name: '抢救车' }],
      },
      {
        roomCode: 'ER-留观', roomName: '急诊留观室', roomType: 'er', deptName: '急诊医学科',
        x: 400, y: 120, width: 300, height: 200, ceilingH: 3.6, capacity: 10,
        bedStates: ['occupied', 'occupied', 'available', 'occupied', 'occupied', 'available', 'occupied'],
      },
      {
        roomCode: 'ER-诊室1', roomName: '急诊诊室一', roomType: 'department', deptName: '急诊医学科',
        x: 60, y: 360, width: 180, height: 120, ceilingH: 3.6, capacity: 0, bedStates: [],
      },
    ],
  },
};

/** 床位四态配色（深海蓝 VI：占床用主色，其余四色区分） */
const BED_COLOR_3D: Record<BedState, string> = {
  available: '#52C41A',
  occupied: '#1E5AA8',
  isolation: '#FA8C16',
  maintenance: '#8C8C8C',
};

/** 网格单位 → 米 换算系数（1 网格单位 ≈ 0.3m，门诊楼约 90m 宽） */
const GRID_TO_M = 0.3;

/* --------------------------- build3DDigitalTwin --------------------------- */

/** 由床位列表推导房间聚合状态（隔离>占用>维护>空） */
function aggregateStatus3D(beds: Bed3D[]): BedState {
  if (beds.some((b) => b.state === 'isolation')) return 'isolation';
  if (beds.some((b) => b.state === 'occupied')) return 'occupied';
  if (beds.some((b) => b.state === 'maintenance')) return 'maintenance';
  return 'available';
}

/** 房间种子 → 楼层归属（与 2D 台账一致：5xx→5F，6xx/OR-xx→6F，ER-xx→1F） */
function roomBelongsToFloor3D(room: RoomSeed3D, floor: string): boolean {
  if (room.roomCode.startsWith('5')) return floor === '5';
  if (room.roomCode.startsWith('6') || room.roomCode.startsWith('OR-')) return floor === '6';
  return floor === '1';
}

/** 把一个房间种子摊平为 Room3D（含床位/设备/患者三维位置） */
function buildRoom3D(buildingId: string, floorInfo: { floor: string; z: number }, seed: RoomSeed3D): Room3D {
  const zFloor = floorInfo.z;
  const zCeil = zFloor + seed.ceilingH;

  // 三维包围盒：min=(x, y, zFloor)，max=(x+width, y+height, zCeil)
  const box: Box3 = {
    min: { x: seed.x, y: seed.y, z: zFloor },
    max: { x: seed.x + seed.width, y: seed.y + seed.height, z: zCeil },
  };

  // 床位在房间内按 2 列网格排布（床垫面标高 = 楼层底 + 0.45m）
  const cols = 2;
  const cellW = 70;
  const cellH = 46;
  const beds: Bed3D[] = seed.bedStates.map((state, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const gx = seed.x + 20 + col * cellW;
    const gy = seed.y + 24 + row * cellH;
    const occupied = state === 'occupied' || state === 'isolation';
    return {
      bedId: `${buildingId}-${floorInfo.floor}-${seed.roomCode}-B${i + 1}`,
      bedNo: `${i + 1}`,
      state,
      patientRef: occupied ? `P-${2000 + buildingId.length * 100 + i * 13}` : null,
      position: { x: gx, y: gy, z: zFloor + 0.45 },
      color: BED_COLOR_3D[state],
    };
  });

  // 脱敏患者位置：占用床旁（人体中心标高 ≈ 楼层底 + 0.9m）
  const patientMarkers: PatientMarker3D[] = beds
    .filter((b) => b.patientRef)
    .map((b) => ({
      patientRef: b.patientRef as string,
      position: { x: b.position.x + 18, y: b.position.y + 10, z: zFloor + 0.9 },
    }));

  // 设备位置：房间内固定点（设备中心标高 ≈ 楼层底 + 0.2m）
  const equipment: Equipment3D[] = (seed.equipment ?? []).map((eq, i) => ({
    code: eq.code,
    name: eq.name,
    position: {
      x: seed.x + 60 + i * 120,
      y: seed.y + 40,
      z: zFloor + 0.2,
    },
  }));

  return {
    roomId: `${buildingId}-${floorInfo.floor}-${seed.roomCode}`,
    buildingId,
    floor: floorInfo.floor,
    roomCode: seed.roomCode,
    roomName: seed.roomName,
    roomType: seed.roomType,
    deptName: seed.deptName,
    box,
    status: aggregateStatus3D(beds),
    beds,
    equipment,
    patientMarkers,
  };
}

/**
 * build3DDigitalTwin：按楼宇挤出三维数字孪生。
 *
 * @param buildingId 楼宇编号（未知时回退 'main'）
 * @returns Building3D（楼层/房间三维包围盒/床位四态/脱敏患者/设备 + 汇总）
 *
 * 纯函数：相同入参必得相同出参（generatedAt 为调用时刻，不参与布局逻辑）。
 */
export function build3DDigitalTwin(buildingId: string): Building3D {
  const seed = BUILDINGS_3D[buildingId] ?? BUILDINGS_3D.main;
  const floors: Floor3D[] = seed.floors.map((f) => {
    const rooms: Room3D[] = seed.rooms
      .filter((r) => roomBelongsToFloor3D(r, f.floor))
      .map((r) => buildRoom3D(seed.buildingId, f, r));
    return { floor: f.floor, z: f.z, height: f.height, rooms };
  });

  const allBeds = floors.flatMap((f) => f.rooms.flatMap((r) => r.beds));
  const summary = {
    totalRooms: floors.reduce((s, f) => s + f.rooms.length, 0),
    totalBeds: allBeds.length,
    available: allBeds.filter((b) => b.state === 'available').length,
    occupied: allBeds.filter((b) => b.state === 'occupied').length,
    isolation: allBeds.filter((b) => b.state === 'isolation').length,
    maintenance: allBeds.filter((b) => b.state === 'maintenance').length,
    occupancyRate: 0,
    buildingHeight: Math.max(...seed.floors.map((f) => f.z + f.height)),
  };
  const inUse = summary.occupied + summary.isolation;
  summary.occupancyRate =
    summary.totalBeds === 0
      ? 0
      : Math.round((inUse / summary.totalBeds) * 1000) / 10;

  return {
    buildingId: seed.buildingId,
    buildingName: seed.buildingName,
    floors,
    summary,
    demo: true,
    generatedAt: new Date().toISOString(),
  };
}

/* --------------------------- render3DBuilding --------------------------- */

/**
 * 等距投影：世界坐标 (x,y,z) → 屏幕坐标 (sx, sy)。
 * 采用斜等测（cabinet projection）：
 *   sx = x - y*cos(30°)
 *   sy = (x + y)*sin(30°) - z*zScale
 * 其中 zScale 把米换算回网格视觉高度。
 */
function project(p: Vec3): ScreenPoint {
  const COS30 = 0.866;
  const SIN30 = 0.5;
  // z（米）→ 视觉高度：1m ≈ 15 网格单位（让楼层挤压可见）
  const zVis = p.z * 15;
  return {
    sx: p.x - p.y * COS30,
    sy: (p.x + p.y) * SIN30 - zVis,
  };
}

/** 把房间三维包围盒投影成三面挤出体 */
function projectRoom(room: Room3D): ProjectedRoom {
  const { min, max } = room.box;
  // 顶面四个角（z=max.z）
  const top0 = project({ x: min.x, y: min.y, z: max.z });
  const top1 = project({ x: max.x, y: min.y, z: max.z });
  const top2 = project({ x: max.x, y: max.y, z: max.z });
  const top3 = project({ x: min.x, y: max.y, z: max.z });
  // 左面（min.x 立面）
  const left0 = project({ x: min.x, y: min.y, z: min.z });
  const left1 = project({ x: min.x, y: min.y, z: max.z });
  const left2 = project({ x: min.x, y: max.y, z: max.z });
  const left3 = project({ x: min.x, y: max.y, z: min.z });
  // 右面（min.y 立面）
  const right0 = project({ x: min.x, y: min.y, z: min.z });
  const right1 = project({ x: max.x, y: min.y, z: min.z });
  const right2 = project({ x: max.x, y: min.y, z: max.z });
  const right3 = project({ x: min.x, y: min.y, z: max.z });

  const label = project({
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: max.z,
  });

  return {
    roomId: room.roomId,
    roomName: room.roomName,
    roomType: room.roomType,
    deptName: room.deptName,
    status: room.status,
    top: [top0, top1, top2, top3],
    left: [left0, left1, left2, left3],
    right: [right0, right1, right2, right3],
    label,
  };
}

/**
 * render3DBuilding：把楼宇某一层投影成前端可直接画的 2D 屏幕坐标。
 *
 * @param buildingId 楼宇编号
 * @param floor       楼层（如 '5'/'6'/'1'）；不传则取首层
 * @returns           RenderedFloor（房间三面挤出体 + 床位/设备/患者散点）
 *
 * 纯函数：前端拿到 screen/sx/sy 后用 SVG polygon 画三面，无需引入 Three.js。
 */
export function render3DBuilding(buildingId: string, floor?: string | null): RenderedFloor {
  const twin = build3DDigitalTwin(buildingId);
  const targetFloor = floor ?? twin.floors[0]?.floor ?? '1';
  const fl = twin.floors.find((f) => f.floor === targetFloor) ?? twin.floors[0];

  const rooms = fl.rooms.map(projectRoom);

  const markers: ProjectedMarker[] = [];
  for (const room of fl.rooms) {
    for (const bed of room.beds) {
      markers.push({
        kind: 'bed',
        ref: bed.bedId,
        color: bed.color,
        screen: project(bed.position),
        tip: `${room.roomName} · ${bed.bedNo}床 · ${bed.state}${bed.patientRef ? ` · ${bed.patientRef}` : ''}`,
      });
    }
    for (const eq of room.equipment) {
      markers.push({
        kind: 'equipment',
        ref: eq.code,
        color: '#0B2A4A',
        screen: project(eq.position),
        tip: `设备：${eq.name}（${eq.code}）`,
      });
    }
    for (const p of room.patientMarkers) {
      markers.push({
        kind: 'patient',
        ref: p.patientRef,
        color: '#722ED1',
        screen: project(p.position),
        tip: `患者 ${p.patientRef}（脱敏位置）`,
      });
    }
  }

  // 计算画布包围盒（所有投影点的 min/max）
  const allPoints: ScreenPoint[] = [];
  for (const r of rooms) {
    allPoints.push(...r.top, ...r.left, ...r.right, r.label);
  }
  for (const m of markers) allPoints.push(m.screen);
  const xs = allPoints.map((p) => p.sx);
  const ys = allPoints.map((p) => p.sy);
  const minSx = Math.min(...xs);
  const maxSx = Math.max(...xs);
  const minSy = Math.min(...ys);
  const maxSy = Math.max(...ys);

  // 平移到原点
  const normRooms = rooms.map((r) => ({
    ...r,
    top: r.top.map((p) => ({ sx: p.sx - minSx, sy: p.sy - minSy })) as ProjectedRoom['top'],
    left: r.left.map((p) => ({ sx: p.sx - minSx, sy: p.sy - minSy })) as ProjectedRoom['left'],
    right: r.right.map((p) => ({ sx: p.sx - minSx, sy: p.sy - minSy })) as ProjectedRoom['right'],
    label: { sx: r.label.sx - minSx, sy: r.label.sy - minSy },
  }));
  const normMarkers = markers.map((m) => ({
    ...m,
    screen: { sx: m.screen.sx - minSx, sy: m.screen.sy - minSy },
  }));

  return {
    buildingId: twin.buildingId,
    buildingName: twin.buildingName,
    floor: fl.floor,
    canvas: {
      width: Math.round(maxSx - minSx) + 40,
      height: Math.round(maxSy - minSy) + 40,
    },
    rooms: normRooms,
    markers: normMarkers,
    generatedAt: new Date().toISOString(),
  };
}

/* --------------------------- simulate3DPatientFlow --------------------------- */

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

/** 情景参数：每步新到患者数 / 平均等待分钟 / 说明 */
const FLOW_META: Record<FlowScenario, { arrivals: number; waitMul: number; note: string }> = {
  normal:   { arrivals: 2,  waitMul: 1.0, note: '常态：急诊每 5 分钟约 2 人到院，候诊 15 分钟' },
  surge:    { arrivals: 6,  waitMul: 2.6, note: '高峰：流感/交通事故致到院量 3 倍，候诊区拥堵' },
  epidemic: { arrivals: 4,  waitMul: 1.8, note: '疫情：隔离通道分流，抢救室隔离床占用上升' },
};

/**
 * simulate3DPatientFlow：仿真患者在三维空间中的流动轨迹。
 *
 * 节点路径：急诊入口 → 分诊台 → 候诊区 → 抢救室/留观室 → 出院/收住院。
 * 每个节点在三维世界坐标中有固定锚点；患者在节点间移动，等待时间由情景决定。
 *
 * @param scenario normal/surge/epidemic
 * @returns        FlowSimResult（确定性种子，同参必同结果）
 *
 * 纯函数：不读当前时间、不读库；seed 固定，便于回放与单测。
 */
export function simulate3DPatientFlow(scenario: FlowScenario): FlowSimResult {
  const meta = FLOW_META[scenario] ?? FLOW_META.normal;
  const steps = 24; // 24 步 × 5 分钟 = 2 小时
  const rand = mulberry32(0x3d175c);

  // 节点锚点（急诊楼 1F 世界坐标，z=0.9 人体中心）
  const nodes: Record<string, Vec3> = {
    entrance: { x: 200, y: 480, z: 0.9 },
    triage:   { x: 200, y: 400, z: 0.9 },
    waiting:  { x: 550, y: 380, z: 0.9 },
    er:       { x: 200, y: 220, z: 0.9 },
    observe:  { x: 550, y: 220, z: 0.9 },
    exit:     { x: 200, y: 480, z: 0.9 },
  };
  const stageOrder: string[] = ['entrance', 'triage', 'waiting', 'er', 'exit'];

  // 每个患者：随机分配在第 0..steps 间某一步到院，按 stageOrder 推进
  const trajectories: FlowPatientFrame[][] = [];
  const occupancyCurve: { t: number; count: number }[] = [];
  let totalArrivals = 0;
  const waitAccum: Record<string, number> = {};

  for (let t = 0; t < steps; t++) {
    // 本步新到患者数（泊松近似 = round(arrivals * (0.7 + rand*0.6))）
    const arrivals = Math.max(0, Math.round(meta.arrivals * (0.7 + rand() * 0.6)));
    totalArrivals += arrivals;

    for (let a = 0; a < arrivals; a++) {
      const patientRef = `P-${3000 + totalArrivals * 7 + a * 13}`;
      const frames: FlowPatientFrame[] = [];
      let stageIdx = 0;
      let waitLeft = Math.round(15 * meta.waitMul * (0.6 + rand() * 0.8));

      // 从到院步开始，最多走 12 步
      for (let dt = 0; dt < 12 && t + dt < steps; dt++) {
        const nodeKey = stageOrder[Math.min(stageIdx, stageOrder.length - 1)];
        frames.push({
          patientRef,
          t: t + dt,
          position: { ...nodes[nodeKey] },
          stage: nodeKey,
        });
        waitAccum[nodeKey] = (waitAccum[nodeKey] ?? 0) + 1;
        if (waitLeft > 0) {
          waitLeft--;
        } else {
          stageIdx++;
          waitLeft = Math.round(10 * meta.waitMul * (0.6 + rand() * 0.8));
        }
      }
      trajectories.push(frames);
    }

    // 本步在院患者数（所有轨迹中 t 等于当前步的帧）
    const inHouse = trajectories.filter((tr) => tr.some((f) => f.t === t)).length;
    occupancyCurve.push({ t, count: inHouse });
  }

  // 瓶颈节点：平均等待步数 × 5 分钟
  let bottleneck = { stage: 'waiting', avgWaitMin: 0 };
  for (const [stage, acc] of Object.entries(waitAccum)) {
    const patientsAtStage = trajectories.filter((tr) => tr.some((f) => f.stage === stage)).length || 1;
    const avgWait = Math.round((acc / patientsAtStage) * 5);
    if (avgWait > bottleneck.avgWaitMin) {
      bottleneck = { stage, avgWaitMin: avgWait };
    }
  }

  return {
    scenario,
    steps,
    arrivalsPerStep: meta.arrivals,
    occupancyCurve,
    trajectories: trajectories.slice(0, 20), // 只回传前 20 条轨迹样本（前端画动线）
    bottleneck,
    note: meta.note,
  };
}

/* --------------------------- optimize3DRoute --------------------------- */

/** 3D 网格步长（米） */
const GRID_RES_M = 2;

/** 把米坐标量化到网格索引 */
function quantize(p: Vec3): { ix: number; iy: number; iz: number } {
  return {
    ix: Math.round(p.x * GRID_TO_M / GRID_RES_M),
    iy: Math.round(p.y * GRID_TO_M / GRID_RES_M),
    iz: Math.round(p.z / GRID_RES_M),
  };
}

/** 判断某网格点是否在任一障碍物包围盒内（含 0.3m 安全膨胀） */
function isBlocked(ix: number, iy: number, iz: number, obstacles: RouteObstacle[]): boolean {
  const world: Vec3 = {
    x: ix * GRID_RES_M / GRID_TO_M,
    y: iy * GRID_RES_M / GRID_TO_M,
    z: iz * GRID_RES_M,
  };
  for (const ob of obstacles) {
    const pad = 0.3; // 安全膨胀
    if (
      world.x >= ob.min.x * GRID_TO_M - pad &&
      world.x <= ob.max.x * GRID_TO_M + pad &&
      world.y >= ob.min.y * GRID_TO_M - pad &&
      world.y <= ob.max.y * GRID_TO_M + pad &&
      world.z >= ob.min.z - pad &&
      world.z <= ob.max.z + pad
    ) {
      return true;
    }
  }
  return false;
}

/**
 * optimize3DRoute：3D 网格 A* 避障寻路。
 *
 * @param start     起点（世界坐标）
 * @param end       终点（世界坐标）
 * @param obstacles 障碍物列表（房间/设备包围盒）
 * @returns         RouteResult（航点序列 + 路径长度米 + 是否找到）
 *
 * 纯函数：相同入参必得相同航点；被堵死时 found=false 并返回直达直线（降级）。
 * 6 连通邻域（上下左右前后），不做对角线切角，避免穿墙。
 */
export function optimize3DRoute(start: Vec3, end: Vec3, obstacles: RouteObstacle[]): RouteResult {
  const s = quantize(start);
  const e = quantize(end);

  // A* open/closed + parent 链（单次搜索，回溯用）
  const key = (ix: number, iy: number, iz: number) => `${ix},${iy},${iz}`;
  interface Node { ix: number; iy: number; iz: number; g: number; f: number; }
  const open = new Map<string, Node>();
  const parentMap = new Map<string, string | null>();
  const closed = new Set<string>();
  const h = (ix: number, iy: number, iz: number) =>
    Math.abs(ix - e.ix) + Math.abs(iy - e.iy) + Math.abs(iz - e.iz);

  const sKey = key(s.ix, s.iy, s.iz);
  open.set(sKey, { ix: s.ix, iy: s.iy, iz: s.iz, g: 0, f: h(s.ix, s.iy, s.iz) });
  parentMap.set(sKey, null);

  const neighbors: [number, number, number][] = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1],
  ];

  let found = false;
  // 搜索上限 5000 节点，避免极端情况死循环
  for (let iter = 0; iter < 5000 && open.size > 0; iter++) {
    // 取 f 最小
    let bestK = '';
    let best: Node | null = null;
    for (const [k, node] of open) {
      if (!best || node.f < best.f) { best = node; bestK = k; }
    }
    if (!best) break;
    if (best.ix === e.ix && best.iy === e.iy && best.iz === e.iz) {
      found = true;
      break;
    }
    open.delete(bestK);
    closed.add(bestK);

    for (const [dx, dy, dz] of neighbors) {
      const nx = best.ix + dx;
      const ny = best.iy + dy;
      const nz = best.iz + dz;
      const nk = key(nx, ny, nz);
      if (closed.has(nk)) continue;
      if (isBlocked(nx, ny, nz, obstacles)) continue;
      const g = best.g + 1;
      const existing = open.get(nk);
      if (!existing || g < existing.g) {
        open.set(nk, { ix: nx, iy: ny, iz: nz, g, f: g + h(nx, ny, nz) });
        parentMap.set(nk, bestK);
      }
    }
  }

  // 回溯路径
  const waypoints: Vec3[] = [];
  if (found) {
    let cur = key(e.ix, e.iy, e.iz);
    const chain: string[] = [];
    while (cur) {
      chain.unshift(cur);
      cur = parentMap.get(cur) ?? '';
    }
    for (const ck of chain) {
      const [ix, iy, iz] = ck.split(',').map(Number);
      waypoints.push({
        x: ix * GRID_RES_M / GRID_TO_M,
        y: iy * GRID_RES_M / GRID_TO_M,
        z: iz * GRID_RES_M,
      });
    }
  }

  // 降级：找不到就回直线
  if (!found || waypoints.length === 0) {
    waypoints.length = 0;
    waypoints.push({ ...start });
    waypoints.push({ ...end });
  }

  // 路径长度（米，折线累加）
  let distanceM = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1];
    const b = waypoints[i];
    // x/y 是网格单位，换算回米；z 已是米
    const dxM = (b.x - a.x) * GRID_TO_M;
    const dyM = (b.y - a.y) * GRID_TO_M;
    const dzM = b.z - a.z;
    distanceM += Math.sqrt(dxM * dxM + dyM * dyM + dzM * dzM);
  }
  distanceM = Math.round(distanceM * 10) / 10;

  return { waypoints, distanceM, found };
}
