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
