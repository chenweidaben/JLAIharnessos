/**
 * 健澜科技 jlmedaios - 手术排程看板聚合器
 *
 * 手术间列 × 时间行的日视图 / 周视图网格数据。
 * 纯函数 buildDayView / buildWeekView 与数据获取分离，便于单测；
 * 当 surgery_requests 在目标周无排程时，返回带 demo:true 的演示行，
 * 前端需显式标识「演示数据」，不得冒充真实手术安排。
 *
 * 说明：clinical.surgery_requests 仅有 planned_date（日期粒度），
 * 手术间与起止分钟由确定性规则从 id 散列 + 队列推导，供看板占位渲染；
 * 后续若接入手术间排程表，仅需替换 listView 内的取值来源，纯函数不变。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { listRequests, type SurgeryRequest } from '../../db/repositories/surgeryRepo.js';

/** DEMO_MODE 手术排程演示数据（P7）。v5.0试点扩展（M184空壳崩溃修复）：修正为 ScheduleItem 规范形状。 */
function demoSchedule(weekStart: string): ScheduleItem[] {
  const monday = toDate(weekStart);
  const plan = [
    { offset: 0, roomIdx: 0, start: 8 * 60, dur: 60, procedure: '腹腔镜胆囊切除', dept: '普外科', surgeon: '张主任' },
    { offset: 0, roomIdx: 1, start: 8 * 60 + 30, dur: 150, procedure: '全髋关节置换', dept: '骨科', surgeon: '王主任' },
    { offset: 0, roomIdx: 2, start: 9 * 60, dur: 60, procedure: '白内障超声乳化', dept: '眼科', surgeon: '李主任' },
    { offset: 0, roomIdx: 3, start: 9 * 60 + 30, dur: 120, procedure: '冠脉支架植入', dept: '心内科', surgeon: '赵主任' },
    { offset: 0, roomIdx: 4, start: 10 * 60, dur: 60, procedure: '急诊阑尾切除', dept: '急诊外科', surgeon: '张主任' },
    { offset: 1, roomIdx: 0, start: 13 * 60, dur: 90, procedure: '甲状腺次全切除', dept: '普外科', surgeon: '王主任' },
    { offset: 1, roomIdx: 1, start: 13 * 60 + 30, dur: 90, procedure: '膝关节镜检', dept: '骨科', surgeon: '李主任' },
    { offset: 1, roomIdx: 2, start: 14 * 60, dur: 90, procedure: '剖宫产', dept: '妇产科', surgeon: '赵主任' },
  ];
    return plan.map((p, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + p.offset);
    return {
      id: `demo-surg-${i + 1}`,
      requestNo: `SR2026102000${i + 1}`,
      patientLabel: `演示患者${'ABCDEFGH'[i]}`,
      procedure: p.procedure,
      department: p.dept,
      surgeonLabel: p.surgeon,
      status: 'scheduled',
      room: ROOMS[p.roomIdx],
      date: toStr(d),
      startMinute: p.start,
      durationMin: p.dur,
      demo: true,
    } as any;
  });
}

/** 日视图时间轴：08:00 - 17:00，30 分钟一格 */
export const DAY_START_MIN = 8 * 60;
export const DAY_END_MIN = 17 * 60;
export const SLOT_MIN = 30;

/** 固定手术间列（列稳定，空间也保留列位） */
export const ROOMS = [
  '一号手术间',
  '二号手术间',
  '三号手术间',
  '四号手术间',
  '急诊手术间',
] as const;

export type Room = (typeof ROOMS)[number];

/** 看板输入行：手术间 + 起止分钟已确定 */
export interface ScheduleItem {
  id: string;
  requestNo: string;
  patientLabel: string;
  procedure: string;
  department: string;
  surgeonLabel: string;
  status: string;
  room: string;
  /** YYYY-MM-DD */
  date: string;
  startMinute: number;
  durationMin: number;
  demo?: boolean;
}

/** 落位后的行：带结束分钟与 HH:mm 标签 */
export interface PlacedItem extends ScheduleItem {
  endMinute: number;
  startLabel: string;
  endLabel: string;
}

export interface TimeSlot {
  minute: number;
  label: string;
}

export interface DayView {
  date: string;
  rooms: string[];
  timeSlots: TimeSlot[];
  items: PlacedItem[];
  demo: boolean;
}

export interface WeekDay {
  date: string;
  /** 周一..周日 */
  weekday: string;
  items: PlacedItem[];
}

export interface WeekView {
  /** 周一 YYYY-MM-DD */
  weekStart: string;
  rooms: string[];
  days: WeekDay[];
  demo: boolean;
}

export interface ScheduleBoard {
  date: string;
  weekStart: string;
  day: DayView;
  week: WeekView;
  demo: boolean;
}

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 分钟 -> HH:mm */
export function minToLabel(min: number): string {
  const m = ((Math.round(min) % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** 生成日视图时间轴行 */
export function buildTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let min = DAY_START_MIN; min < DAY_END_MIN; min += SLOT_MIN) {
    slots.push({ minute: min, label: minToLabel(min) });
  }
  return slots;
}

/** 确定性字符串散列（32 位），仅用于列位分配，无需密码学强度 */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** 落位：补齐 endMinute 与起止标签 */
function place(item: ScheduleItem): PlacedItem {
  const endMinute = item.startMinute + item.durationMin;
  return {
    ...item,
    endMinute,
    startLabel: minToLabel(item.startMinute),
    endLabel: minToLabel(endMinute),
  };
}

/** 日视图：按 date 过滤，手术间列 × 时间行 */
export function buildDayView(date: string, items: ScheduleItem[], demo = false): DayView {
  const placed = items
    .filter((it) => it.date === date)
    .map(place)
    .sort((a, b) => a.startMinute - b.startMinute || a.room.localeCompare(b.room, 'zh'));
  return { date, rooms: [...ROOMS], timeSlots: buildTimeSlots(), items: placed, demo };
}

function toDate(s: string): Date {
  const [y, m, d] = s.split('-').map((n) => Number(n));
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function toStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 取 date 所在自然周的周一（YYYY-MM-DD） */
export function mondayOf(date: string): string {
  const d = toDate(date);
  const dow = (d.getDay() + 6) % 7; // 周一=0
  d.setDate(d.getDate() - dow);
  return toStr(d);
}

/** 周视图：周一..周日 7 列，行=手术间（items 已按日落位） */
export function buildWeekView(weekStart: string, items: ScheduleItem[], demo = false): WeekView {
  const monday = toDate(weekStart);
  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = toStr(d);
    days.push({
      date: key,
      weekday: WEEKDAY_CN[d.getDay()],
      items: items
        .filter((it) => it.date === key)
        .map(place)
        .sort((a, b) => a.startMinute - b.startMinute || a.room.localeCompare(b.room, 'zh')),
    });
  }
  return { weekStart, rooms: [...ROOMS], days, demo };
}

function shortId(id: string | null, prefix: string): string {
  if (!id) return '待排';
  return `${prefix}${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || '0000'}`;
}

/**
 * 将 surgery_requests 映射为看板行：
 *  - 急诊 → 急诊手术间，其余按 id 散列均分至普通间；
 *  - 每间每天从 08:30 起按队列排，择期 90min / 急诊 60min，间隔 15min 周转。
 * 纯函数，输入同序则输出确定。
 */
export function assignRoomsAndTimes(reqs: SurgeryRequest[]): ScheduleItem[] {
  const valid = reqs.filter((r) => r.status !== 'cancelled' && r.plannedDate);
  const byDayRoom = new Map<string, SurgeryRequest[]>();
  for (const r of valid) {
    const room =
      r.surgeryType === 'emergency'
        ? '急诊手术间'
        : ROOMS[hashStr(r.id) % (ROOMS.length - 1)]; // 普通间 0..3
    const key = `${r.plannedDate}|${room}`;
    const arr = byDayRoom.get(key) ?? [];
    arr.push(r);
    byDayRoom.set(key, arr);
  }

  const out: ScheduleItem[] = [];
  for (const arr of byDayRoom.values()) {
    arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let cursor = 8 * 60 + 30; // 08:30
    for (const r of arr) {
      const durationMin = r.surgeryType === 'emergency' ? 60 : 90;
      const room = r.surgeryType === 'emergency'
        ? '急诊手术间'
        : ROOMS[hashStr(r.id) % (ROOMS.length - 1)];
      out.push({
        id: r.id,
        requestNo: r.requestNo,
        patientLabel: shortId(r.patientId, '患'),
        procedure: r.plannedProcedure,
        department: r.department,
        surgeonLabel: shortId(r.surgeonId, '医'),
        status: r.status,
        room,
        date: r.plannedDate as string,
        startMinute: cursor,
        durationMin,
      });
      cursor += durationMin + 15;
    }
  }
  return out;
}

/** 演示行：覆盖整周，demo:true */
export function demoItems(weekStart: string): ScheduleItem[] {
  const monday = toDate(weekStart);
  const plan: { offset: number; roomIdx: number; start: number; dur: number; procedure: string; dept: string; status: string }[] = [
    { offset: 0, roomIdx: 0, start: 510, dur: 90, procedure: '腹腔镜胆囊切除术', dept: '普外科', status: 'scheduled' },
    { offset: 0, roomIdx: 0, start: 660, dur: 120, procedure: '甲状腺次全切除术', dept: '甲乳外科', status: 'prechecked' },
    { offset: 0, roomIdx: 1, start: 540, dur: 90, procedure: '全膝关节置换术', dept: '骨科', status: 'maintenance' },
    { offset: 0, roomIdx: 4, start: 600, dur: 60, procedure: '阑尾切除术', dept: '急诊外科', status: 'induction' },
    { offset: 1, roomIdx: 0, start: 510, dur: 90, procedure: '腹腔镜阑尾切除术', dept: '普外科', status: 'scheduled' },
    { offset: 1, roomIdx: 2, start: 600, dur: 150, procedure: '剖宫产术', dept: '产科', status: 'scheduled' },
    { offset: 2, roomIdx: 1, start: 540, dur: 120, procedure: '经皮肾镜碎石取石术', dept: '泌尿外科', status: 'prechecked' },
    { offset: 2, roomIdx: 3, start: 690, dur: 90, procedure: '白内障超声乳化摘除术', dept: '眼科', status: 'scheduled' },
    { offset: 3, roomIdx: 0, start: 510, dur: 90, procedure: '腹股沟疝修补术', dept: '普外科', status: 'scheduled' },
    { offset: 4, roomIdx: 2, start: 570, dur: 120, procedure: '膝关节镜检查术', dept: '骨科', status: 'scheduled' },
    { offset: 5, roomIdx: 1, start: 540, dur: 90, procedure: '乳腺纤维腺瘤切除术', dept: '甲乳外科', status: 'requested' },
  ];
  return plan.map((p, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + p.offset);
    return {
      id: `demo-${i}`,
      requestNo: `DEMO${String(i + 1).padStart(4, '0')}`,
      patientLabel: `患${String(1001 + i)}`,
      procedure: p.procedure,
      department: p.dept,
      surgeonLabel: `医${['张', '王', '李', '赵'][i % 4]}主任`,
      status: p.status,
      room: ROOMS[p.roomIdx],
      date: toStr(d),
      startMinute: p.start,
      durationMin: p.dur,
      demo: true,
    };
  });
}

function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * 看板数据装配：取 surgeryRepo 排程，目标周无有效排程时回落演示行。
 * @param date YYYY-MM-DD，锚定日视图日期与所在自然周
 */
export async function listView(date: string): Promise<ScheduleBoard> {
  if (process.env.DEMO_MODE === '1') {
    // v5.0试点扩展（M184空壳崩溃修复）：返回与真实分支一致的 ScheduleBoard 形状
    const anchor = isValidDateStr(date) ? date : '2026-10-20';
    const weekStart = mondayOf(anchor);
    const items = demoSchedule(weekStart);
    return {
      date: anchor,
      weekStart,
      day: buildDayView(anchor, items, true),
      week: buildWeekView(weekStart, items, true),
      demo: true,
    } as any;
  }
  const anchor = isValidDateStr(date) ? date : toStr(new Date());
  const weekStart = mondayOf(anchor);
  const monday = toDate(weekStart);
  const weekKeys = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekKeys.add(toStr(d));
  }

  const all = await listRequests();
  const real = all.filter((r) => r.status !== 'cancelled' && r.plannedDate && weekKeys.has(r.plannedDate));

  let items: ScheduleItem[];
  let demo = false;
  if (real.length === 0) {
    items = demoItems(weekStart);
    demo = true;
  } else {
    items = assignRoomsAndTimes(real);
  }

  return {
    date: anchor,
    weekStart,
    day: buildDayView(anchor, items, demo),
    week: buildWeekView(weekStart, items, demo),
    demo,
  };
}

/* ============================================================================
 * 【核心业务深化】M130-D 手术排班优化引擎（纯函数，无 IO，可单测）
 *
 * 优化目标：
 *   1) 手术室利用率最大化 —— 贪心最早可行槽，长手术优先 bin packing；
 *   2) 医生时间不冲突     —— 同 surgeon 同日期窗口互不重叠；
 *   3) 同类手术集中       —— 同科室术式优先落同一手术间同日相邻块；
 *   4) 急诊优先插入       —— emergency 最先排，优先占用急诊手术间。
 *
 * 算法定位：实用贪心，不引入 ILP/约束求解器，O(N·R·D) 量级，
 *           满足日调度秒级出方案，便于手术室护士站现场复核调整。
 * ==========================================================================*/

/** 同间两台手术之间的消毒周转间隔（分钟） */
export const SCHEDULE_TURNOVER_MIN = 15;

export type ScheduleSurgeryType = 'elective' | 'emergency';

/** 优化引擎输入：一台待排手术申请 */
export interface ScheduleRequestInput {
  id: string;
  surgeryType: ScheduleSurgeryType;
  procedure: string;
  department: string;
  surgeonId: string;
  /** 预计手术时长（分钟） */
  durationMin: number;
  /** 期望日期 YYYY-MM-DD；为空表示可排入 horizon 任意一天 */
  preferredDate?: string | null;
}

/** 可用手术间 */
export interface AvailableRoom {
  roomId: string;
  name: string;
  /** 开台分钟（08:00 = 480） */
  openMin: number;
  /** 清台分钟（17:00 = 1020） */
  closeMin: number;
  /** 急诊手术间：急诊优先占用 */
  isEmergency?: boolean;
}

/** 医生已有不可用窗口（门诊 / 手术 / 休假） */
export interface SurgeonBusyWindow {
  surgeonId: string;
  date: string;
  startMin: number;
  endMin: number;
}

/** 一条优化后排班 */
export interface ScheduleAssignment {
  requestId: string;
  roomId: string;
  roomName: string;
  date: string;
  startMin: number;
  endMin: number;
  surgeonId: string;
  procedure: string;
  department: string;
  surgeryType: ScheduleSurgeryType;
}

export interface UnassignedRequest {
  requestId: string;
  reason: string;
}

export interface ScheduleConflict {
  kind: 'room' | 'surgeon';
  date: string;
  startMin: number;
  endMin: number;
  requestIds: string[];
  detail: string;
}

export interface ScheduleMetrics {
  totalRequests: number;
  assignedCount: number;
  unassignedCount: number;
  emergencyAssigned: number;
  electiveAssigned: number;
  /** 手术室利用率 = 已排手术总分钟 / (手术间数 × horizon 天数 × 日均开放分钟)，0~1 */
  utilizationRate: number;
  roomsUsed: number;
  /** 同科室相邻块计数（同类集中度，块越少越集中） */
  sameDeptClusterCount: number;
}

export interface ScheduleResult {
  assignments: ScheduleAssignment[];
  unassigned: UnassignedRequest[];
  conflicts: ScheduleConflict[];
  metrics: ScheduleMetrics;
}

/** 区间重叠判定（左闭右开） */
function rangesOverlap(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS < bE && bS < aE;
}

interface BusyInterval {
  start: number;
  end: number;
  requestId?: string;
  dept?: string;
}

/**
 * 【核心业务深化】手术排班优化主入口（纯函数）。
 *
 * @param requests           待排手术申请列表
 * @param availableRooms     可用手术间及其开放时段
 * @param surgeonAvailability 医生已有不可用窗口
 * @returns ScheduleResult   排程结果 + 未排原因 + 冲突自检 + 利用率指标
 */
export function optimizeSurgerySchedule(
  requests: ScheduleRequestInput[],
  availableRooms: AvailableRoom[],
  surgeonAvailability: SurgeonBusyWindow[],
): ScheduleResult {
  // 1. 入参清洗：去重 id、丢弃非法时长、无房间直接返回
  const seen = new Set<string>();
  const valid = requests.filter((r) => {
    if (!r || !r.id || seen.has(r.id)) return false;
    seen.add(r.id);
    return r.durationMin > 0;
  });
  if (availableRooms.length === 0) {
    return {
      assignments: [],
      unassigned: valid.map((r) => ({ requestId: r.id, reason: '无可用手术间' })),
      conflicts: [],
      metrics: {
        totalRequests: valid.length,
        assignedCount: 0,
        unassignedCount: valid.length,
        emergencyAssigned: 0,
        electiveAssigned: 0,
        utilizationRate: 0,
        roomsUsed: 0,
        sameDeptClusterCount: 0,
      },
    };
  }

  // 2. horizon：所有出现过的日期（期望日期 ∪ 医生忙日）
  const dateSet = new Set<string>();
  for (const r of valid) if (r.preferredDate) dateSet.add(r.preferredDate);
  for (const w of surgeonAvailability) dateSet.add(w.date);
  const dates = [...dateSet].sort();

  // 3. 医生忙表：Map<surgeonId, Map<date, intervals>>
  const surgeonBusy = new Map<string, Map<string, BusyInterval[]>>();
  for (const w of surgeonAvailability) {
    const byDate = surgeonBusy.get(w.surgeonId) ?? new Map<string, BusyInterval[]>();
    const arr = byDate.get(w.date) ?? [];
    arr.push({ start: w.startMin, end: w.endMin });
    byDate.set(w.date, arr);
    surgeonBusy.set(w.surgeonId, byDate);
  }

  // 4. 排序：急诊优先 → 时长降序（长手术先排，bin packing）→ id 字典序稳定
  const sorted = [...valid].sort((a, b) => {
    if (a.surgeryType !== b.surgeryType) return a.surgeryType === 'emergency' ? -1 : 1;
    if (b.durationMin !== a.durationMin) return b.durationMin - a.durationMin;
    return a.id.localeCompare(b.id);
  });

  const assignments: ScheduleAssignment[] = [];
  const unassigned: UnassignedRequest[] = [];
  const roomBusy = new Map<string, BusyInterval[]>();
  /** 本轮已排到该医生的手术（跨房间），用于医生不冲突约束 */
  const surgeonPlaced = new Map<string, BusyInterval[]>();
  const roomKey = (roomId: string, date: string) => `${roomId}|${date}`;
  const surgeonKey = (surgeonId: string, date: string) => `${surgeonId}|${date}`;

  /**
   * 在某间某日找最优可行槽。
   * 打分：日期序×大权重 + 开始分钟；同科已排 → 减分集中；紧贴同科块 → 再减分。
   */
  function findSlot(
    req: ScheduleRequestInput,
    room: AvailableRoom,
    date: string,
    dateOrderIdx: number,
  ): { start: number; end: number; score: number } | null {
    const busy = roomBusy.get(roomKey(room.roomId, date)) ?? [];
    // 医生当日不可用 = 外部忙窗口 ∪ 本轮已排手术（跨房间）
    const sBusy = [
      ...(surgeonBusy.get(req.surgeonId)?.get(date) ?? []),
      ...(surgeonPlaced.get(surgeonKey(req.surgeonId, date)) ?? []),
    ];

    // 候选起点：开台时刻 + 每个已排区间结束后一个周转间隔
    const candidates: number[] = [room.openMin];
    for (const b of busy) candidates.push(b.end + SCHEDULE_TURNOVER_MIN);
    candidates.sort((a, b) => a - b);

    for (const start of candidates) {
      const end = start + req.durationMin;
      if (end > room.closeMin) continue;

      // 房间冲突（含消毒周转缓冲）
      let roomHit = false;
      for (const b of busy) {
        if (start < b.end + SCHEDULE_TURNOVER_MIN && b.start < end) {
          roomHit = true;
          break;
        }
      }
      if (roomHit) continue;

      // 医生冲突（无周转，直接重叠）
      const docHit = sBusy.some((w) => rangesOverlap(start, end, w.start, w.end));
      if (docHit) continue;

      // 打分：日期优先 + 早开台优先；同类集中奖励
      let score = dateOrderIdx * 100_000 + start;
      const sameDeptCount = busy.filter((b) => b.dept === req.department).length;
      if (sameDeptCount > 0) score -= 2_000;
      const adjacentSameDept = busy.some(
        (b) => b.dept === req.department && b.end + SCHEDULE_TURNOVER_MIN === start,
      );
      if (adjacentSameDept) score -= 500;

      return { start, end, score };
    }
    return null;
  }

  // 5. 贪心逐台落位
  for (const req of sorted) {
    // 候选日期：preferredDate 排最前，其余自然序
    const candDates = dates
      .map((date, idx) => ({ date, idx }))
      .sort((a, b) => {
        const ap = a.date === req.preferredDate ? 0 : 1;
        const bp = b.date === req.preferredDate ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return a.idx - b.idx;
      });

    // 候选房间：急诊 → 急诊间优先；择期 → 普通间优先（急诊间留作急诊插入缓冲）
    const rooms = [...availableRooms].sort((a, b) => {
      const aEm = a.isEmergency ? 0 : 1;
      const bEm = b.isEmergency ? 0 : 1;
      if (req.surgeryType === 'emergency') return aEm - bEm;
      return bEm - aEm;
    });

    let best: { assignment: ScheduleAssignment; score: number } | null = null;
    for (const cd of candDates) {
      for (const room of rooms) {
        const slot = findSlot(req, room, cd.date, cd.idx);
        if (!slot) continue;
        const assignment: ScheduleAssignment = {
          requestId: req.id,
          roomId: room.roomId,
          roomName: room.name,
          date: cd.date,
          startMin: slot.start,
          endMin: slot.end,
          surgeonId: req.surgeonId,
          procedure: req.procedure,
          department: req.department,
          surgeryType: req.surgeryType,
        };
        if (!best || slot.score < best.score) best = { assignment, score: slot.score };
      }
    }

    if (best) {
      assignments.push(best.assignment);
      const key = roomKey(best.assignment.roomId, best.assignment.date);
      const arr = roomBusy.get(key) ?? [];
      arr.push({
        start: best.assignment.startMin,
        end: best.assignment.endMin,
        requestId: best.assignment.requestId,
        dept: best.assignment.department,
      });
      roomBusy.set(key, arr);
      // 登记该医生已占用时段（跨房间），供后续同医生申请避让
      const sKey = surgeonKey(best.assignment.surgeonId, best.assignment.date);
      const sArr = surgeonPlaced.get(sKey) ?? [];
      sArr.push({ start: best.assignment.startMin, end: best.assignment.endMin });
      surgeonPlaced.set(sKey, sArr);
    } else {
      unassigned.push({
        requestId: req.id,
        reason: req.preferredDate
          ? `期望日期 ${req.preferredDate} 内无满足房间/医生约束的空闲槽位`
          : '排班 horizon 内无满足房间/医生约束的空闲槽位',
      });
    }
  }

  // 6. 冲突自检（构造上应无冲突；作为防御性校验输出）
  const conflicts = detectScheduleConflicts(assignments);

  // 7. 指标
  const metrics = buildScheduleMetrics(assignments, unassigned, availableRooms, dates);

  return { assignments, unassigned, conflicts, metrics };
}

/** 【核心业务深化】冲突检测：按 间×日 与 医生×日 分组扫重叠 */
export function detectScheduleConflicts(assignments: ScheduleAssignment[]): ScheduleConflict[] {
  const out: ScheduleConflict[] = [];

  const byRoom = new Map<string, ScheduleAssignment[]>();
  for (const a of assignments) {
    const k = `${a.roomId}|${a.date}`;
    const arr = byRoom.get(k) ?? [];
    arr.push(a);
    byRoom.set(k, arr);
  }
  for (const arr of byRoom.values()) {
    arr.sort((a, b) => a.startMin - b.startMin);
    for (let i = 0; i < arr.length - 1; i++) {
      const cur = arr[i];
      const nxt = arr[i + 1];
      if (rangesOverlap(cur.startMin, cur.endMin, nxt.startMin, nxt.endMin)) {
        out.push({
          kind: 'room',
          date: cur.date,
          startMin: Math.max(cur.startMin, nxt.startMin),
          endMin: Math.min(cur.endMin, nxt.endMin),
          requestIds: [cur.requestId, nxt.requestId],
          detail: `手术间 ${cur.roomName} 时间重叠`,
        });
      }
    }
  }

  const bySurgeon = new Map<string, ScheduleAssignment[]>();
  for (const a of assignments) {
    const k = `${a.surgeonId}|${a.date}`;
    const arr = bySurgeon.get(k) ?? [];
    arr.push(a);
    bySurgeon.set(k, arr);
  }
  for (const arr of bySurgeon.values()) {
    arr.sort((a, b) => a.startMin - b.startMin);
    for (let i = 0; i < arr.length - 1; i++) {
      const cur = arr[i];
      const nxt = arr[i + 1];
      if (rangesOverlap(cur.startMin, cur.endMin, nxt.startMin, nxt.endMin)) {
        out.push({
          kind: 'surgeon',
          date: cur.date,
          startMin: Math.max(cur.startMin, nxt.startMin),
          endMin: Math.min(cur.endMin, nxt.endMin),
          requestIds: [cur.requestId, nxt.requestId],
          detail: `医生 ${cur.surgeonId} 时间重叠`,
        });
      }
    }
  }

  return out;
}

/** 【核心业务深化】排程指标：利用率 / 间次占用 / 同类集中度 */
export function buildScheduleMetrics(
  assignments: ScheduleAssignment[],
  unassigned: UnassignedRequest[],
  rooms: AvailableRoom[],
  dates: string[],
): ScheduleMetrics {
  const totalRequests = assignments.length + unassigned.length;
  const emergencyAssigned = assignments.filter((a) => a.surgeryType === 'emergency').length;
  const electiveAssigned = assignments.length - emergencyAssigned;
  const totalSurgeryMin = assignments.reduce((s, a) => s + (a.endMin - a.startMin), 0);
  const dayCapacity = rooms.reduce((s, r) => s + (r.closeMin - r.openMin), 0);
  const totalCapacityMin = dayCapacity * Math.max(dates.length, 1);
  const utilizationRate =
    totalCapacityMin > 0 ? Math.round((totalSurgeryMin / totalCapacityMin) * 1000) / 1000 : 0;
  const roomsUsed = new Set(assignments.map((a) => a.roomId)).size;

  // 同类集中：按 间+日 分组，数科室切换次数（块数）
  let clusters = 0;
  const byRoomDate = new Map<string, ScheduleAssignment[]>();
  for (const a of assignments) {
    const k = `${a.roomId}|${a.date}`;
    const arr = byRoomDate.get(k) ?? [];
    arr.push(a);
    byRoomDate.set(k, arr);
  }
  for (const arr of byRoomDate.values()) {
    arr.sort((a, b) => a.startMin - b.startMin);
    let prevDept: string | null = null;
    for (const a of arr) {
      if (a.department !== prevDept) clusters++;
      prevDept = a.department;
    }
  }

  return {
    totalRequests,
    assignedCount: assignments.length,
    unassignedCount: unassigned.length,
    emergencyAssigned,
    electiveAssigned,
    utilizationRate,
    roomsUsed,
    sameDeptClusterCount: clusters,
  };
}
