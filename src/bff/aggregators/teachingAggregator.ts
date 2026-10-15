/**
 * 健澜科技 jlmedaios - 教学管理聚合器（M140-C · 医院管理深化）
 *
 * 【医院管理深化】教学管理与规培考核直接挂钩：
 *   - createTeachingPlan：登记一门教学计划（规培生教学 / 实习生带教 /
 *     继续教育讲座 / 三基三严培训四类），按授课对象自动归类并标记是否回写规培考核；
 *   - recordTeachingAttendance：逐人记录考勤，到勤才认定学分；
 *   - generateTeachingReport：按账期（YYYY-MM）出教学报表——计划数 / 学分 /
 *     到勤率 / 分类汇总 / 带教老师工作量统计。
 *
 * 与全仓聚合器约定一致（同 financeAggregator）：
 *   - 三个对外函数均为纯计算（校验、组包、汇总），不修改入参；
 *   - 进程内台账 plans / attendances 是报表查询的在读索引；
 *     PostgreSQL 为持久化，落库为 best-effort（断库 / 表未迁移时降级，
 *     不阻断登记与报表主流程）；
 *   - 入参非法一律抛错，由路由层收敛为 400 结构化错误信封。
 *
 * 学分保留 1 位小数（与 clinical.teaching_plan.credits numeric(6,1) 对齐）。
 * 不触碰 WebSocket，不新增依赖（uuid 取自 node 内置 crypto）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型与口径                                                           */
/* ------------------------------------------------------------------ */

/** 教学类别（与 clinical.teaching_plan.category CHECK 一致） */
export type TeachingCategory = 'residency' | 'internship' | 'lecture' | 'three_basics';

/** 类别元数据：代码 → 中文标签 + 是否默认回写规培考核 */
const CATEGORY_META: Readonly<Record<TeachingCategory, { label: string; assessLinked: boolean }>> = {
  residency: { label: '规培生教学', assessLinked: true },
  internship: { label: '实习生带教', assessLinked: false },
  lecture: { label: '继续教育讲座', assessLinked: false },
  three_basics: { label: '三基三严培训', assessLinked: true },
};

/** 四类教学的判别关键词（命中即归类；顺序优先匹配更具体的口径） */
const CATEGORY_KEYWORDS: ReadonlyArray<{ cat: TeachingCategory; words: readonly string[] }> = [
  { cat: 'three_basics', words: ['三基', '三严', '基础理论', '基本知识', '基本技能'] },
  { cat: 'residency', words: ['规培', '住院医师', '住培', '规范化培训'] },
  { cat: 'internship', words: ['实习', '见习'] },
  { cat: 'lecture', words: ['讲座', '继续教育', '继教', '学术报告', '专题'] },
];

/** 一条教学计划（BFF 对外形态，camelCase） */
export interface Plan {
  /** 计划唯一标识 */
  id: string;
  /** 课程/讲座/培训名称 */
  courseName: string;
  /** 带教老师工号 */
  teacherId: string;
  /** 授课对象组别 */
  studentGroup: string;
  /** 类别代码 */
  category: TeachingCategory;
  /** 类别中文标签（前端看板直接展示） */
  categoryLabel: string;
  /** 授课安排（时间/地点） */
  schedule: string;
  /** 学分（>= 0，1 位小数） */
  credits: number;
  /** 开课科室 */
  dept: string;
  /** 是否与规培考核挂钩 */
  assessLinked: boolean;
  /** 创建时间 ISO 串 */
  createdAt: string;
}

/** 一条教学考勤（到勤才认定学分） */
export interface Attendance {
  /** 考勤唯一标识 */
  id: string;
  /** 关联教学计划 id */
  planId: string;
  /** 学员工号/学号 */
  studentId: string;
  /** 是否到勤 */
  attended: boolean;
  /** 授课日期 YYYY-MM-DD */
  date: string;
  /** 本次认定学分（到勤 = 计划学分；缺勤 = 0） */
  creditsEarned: number;
  /** 登记时间 ISO 串 */
  recordedAt: string;
}

/** 某一类别的教学汇总 */
export interface CategoryTeachingStat {
  category: TeachingCategory;
  categoryLabel: string;
  /** 当期计划数 */
  planCount: number;
  /** 当期计划学分合计 */
  totalCredits: number;
  /** 当期考勤人次 */
  attendanceCount: number;
  /** 当期到勤率（0~1；无考勤为 0） */
  attendanceRate: number;
}

/** 带教老师工作量统计 */
export interface TeacherWorkload {
  teacherId: string;
  /** 当期授课计划数 */
  planCount: number;
  /** 当期授课学分合计 */
  totalCredits: number;
  /** 当期考勤人次（带教覆盖的学员到勤记录数） */
  attendanceCount: number;
}

/** 教学报表（科教科驾驶舱） */
export interface Report {
  /** 账期 YYYY-MM */
  period: string;
  /** 当期教学计划总数 */
  totalPlans: number;
  /** 当期计划学分合计 */
  totalCredits: number;
  /** 当期考勤记录总数 */
  totalAttendance: number;
  /** 当期综合到勤率（0~1；无考勤为 0） */
  attendanceRate: number;
  /** 与规培考核挂钩的计划数 */
  assessLinkedPlans: number;
  /** 分类别汇总 */
  byCategory: CategoryTeachingStat[];
  /** 带教老师工作量（按学分降序） */
  teacherWorkload: TeacherWorkload[];
  generatedAt: string;
}

/** createTeachingPlan 的可选元数据（测试/回放用） */
export interface PlanMeta {
  /** 覆盖创建时间（测试用）；缺省取当前时钟 */
  createdAt?: string;
}

/* ------------------------------------------------------------------ */
/* 进程内教学台账（报表查询的在读索引）                                 */
/* ------------------------------------------------------------------ */

const plans: Plan[] = [];
const attendances: Attendance[] = [];

/** 学分保留 1 位小数，消除浮点误差 */
function roundCredits(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

/** rate 四舍五入到 4 位小数，避免浮点噪声 */
function roundRate(rate: number): number {
  return Math.round(rate * 10000) / 10000;
}

/** 宽松收敛为 trim 后字符串 */
function toText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/**
 * 【医院管理深化】按授课对象 / 课程名关键词推断教学类别。
 * 判别顺序：三基三严 → 规培 → 实习 → 讲座 → 默认继续教育讲座。
 */
function inferCategory(courseName: string, studentGroup: string): TeachingCategory {
  const text = `${courseName} ${studentGroup}`;
  for (const { cat, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => text.includes(w))) return cat;
  }
  return 'lecture';
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 【医院管理深化】登记一条教学计划。
 *
 * 组包 → 校验 → 写入进程内台账 → 返回计划副本。
 * 入参非法（课程名/老师/授课对象/科室为空、学分为负）时抛错，由路由层收敛为 400。
 * 类别由 courseName + studentGroup 自动推断；是否回写规培考核按类别默认规则标记。
 *
 * @param courseName   课程/讲座/培训名称
 * @param teacherId    带教老师工号
 * @param studentGroup 授课对象组别（如「内科规培一组」）
 * @param schedule     授课安排（时间/地点）
 * @param credits      学分（>= 0）
 * @param dept         开课科室
 */
export function createTeachingPlan(
  courseName: string,
  teacherId: string,
  studentGroup: string,
  schedule: string,
  credits: number,
  dept: string,
  meta?: PlanMeta,
): Plan {
  const name = toText(courseName);
  const teacher = toText(teacherId);
  const group = toText(studentGroup);
  const department = toText(dept);

  if (!name) throw new Error('课程名称 courseName 不能为空');
  if (!teacher) throw new Error('带教老师 teacherId 不能为空');
  if (!group) throw new Error('授课对象 studentGroup 不能为空');
  if (!department) throw new Error('开课科室 dept 不能为空');
  if (typeof credits !== 'number' || !Number.isFinite(credits) || credits < 0) {
    throw new Error('学分 credits 必须为 >= 0 的数字');
  }

  const category = inferCategory(name, group);
  const metaCat = CATEGORY_META[category];

  const plan: Plan = {
    id: randomUUID(),
    courseName: name,
    teacherId: teacher,
    studentGroup: group,
    category,
    categoryLabel: metaCat.label,
    schedule: toText(schedule) || '时间待定',
    credits: roundCredits(credits),
    dept: department,
    assessLinked: metaCat.assessLinked,
    createdAt: meta?.createdAt ?? new Date().toISOString(),
  };
  plans.push(plan);
  return { ...plan };
}

/**
 * 【医院管理深化】登记一条教学考勤。
 *
 * 到勤（attended = true）才按计划学分认定学分；缺勤计 0，规培考核据此核算。
 * planId 必须命中已登记的教学计划，否则抛错（不允许凭空登记考勤）。
 *
 * @param planId    教学计划 id
 * @param studentId 学员工号/学号
 * @param attended  是否到勤
 * @param date      授课日期 YYYY-MM-DD；空值取当天
 */
export function recordTeachingAttendance(
  planId: string,
  studentId: string,
  attended: boolean,
  date: string,
): Attendance {
  const pid = toText(planId);
  const sid = toText(studentId);
  if (!pid) throw new Error('教学计划 planId 不能为空');
  if (!sid) throw new Error('学员 studentId 不能为空');

  const plan = plans.find((p) => p.id === pid);
  if (!plan) throw new Error(`教学计划 planId=${pid} 不存在，无法登记考勤`);

  const rawDate = toText(date);
  let dateStr = rawDate;
  if (!dateStr) {
    dateStr = new Date().toISOString().slice(0, 10);
  } else if (!/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(dateStr)) {
    throw new Error(`考勤日期 date=${dateStr} 非法（应为 YYYY-MM-DD）`);
  }

  const isAttended = attended === true;
  const record: Attendance = {
    id: randomUUID(),
    planId: pid,
    studentId: sid,
    attended: isAttended,
    date: dateStr,
    creditsEarned: isAttended ? roundCredits(plan.credits) : 0,
    recordedAt: new Date().toISOString(),
  };
  attendances.push(record);
  return { ...record };
}

/**
 * 【医院管理深化】按账期（YYYY-MM）生成教学报表（科教科驾驶舱）。
 *
 * 统计口径：
 *   - 计划数 / 学分合计：账期内创建的教学计划；
 *   - 考勤人次 / 到勤率：账期内登记的考勤；
 *   - assessLinkedPlans：账期内与规培考核挂钩的计划数；
 *   - byCategory：按四类教学分组的计划数 / 学分 / 到勤率；
 *   - teacherWorkload：按带教老师汇总工作量（授课门数 / 学分 / 覆盖考勤人次）。
 *
 * 纯计算核心在 aggregateTeachingReport(plans, attendances, period)，本函数从进程内台账取数。
 */
export function generateTeachingReport(period: string): Report {
  return aggregateTeachingReport(plans, attendances, period);
}

/**
 * 纯计算核心：在给定计划/考勤集合上按账期汇总报表。
 * 不读全局台账、不修改入参，便于单测直接喂数据集验证。
 */
export function aggregateTeachingReport(
  allPlans: readonly Plan[],
  allAttendances: readonly Attendance[],
  period: string,
): Report {
  const p = toText(period);
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(p)) {
    throw new Error(`账期 period=${p} 非法（应为 YYYY-MM）`);
  }

  // 账期内的计划与考勤（按月份前缀过滤）
  const inPeriodPlans = allPlans.filter((pl) => pl.createdAt.slice(0, 7) === p);
  const inPeriodAtt = allAttendances.filter((a) => a.date.slice(0, 7) === p);

  // 计划 id → 计划（用于考勤归类到类别 / 老师）
  const planById = new Map<string, Plan>();
  for (const pl of allPlans) planById.set(pl.id, pl);

  let totalCredits = 0;
  let assessLinkedPlans = 0;
  for (const pl of inPeriodPlans) {
    totalCredits = roundCredits(totalCredits + pl.credits);
    if (pl.assessLinked) assessLinkedPlans += 1;
  }

  const attendedCount = inPeriodAtt.filter((a) => a.attended).length;
  const attendanceRate = inPeriodAtt.length > 0 ? roundRate(attendedCount / inPeriodAtt.length) : 0;

  // 分类别汇总
  const catMap = new Map<TeachingCategory, CategoryTeachingStat>();
  for (const pl of inPeriodPlans) {
    const cur = catMap.get(pl.category) ?? {
      category: pl.category,
      categoryLabel: pl.categoryLabel,
      planCount: 0,
      totalCredits: 0,
      attendanceCount: 0,
      attendanceRate: 0,
    };
    cur.planCount += 1;
    cur.totalCredits = roundCredits(cur.totalCredits + pl.credits);
    catMap.set(pl.category, cur);
  }
  // 考勤按其计划的类别归类
  for (const a of inPeriodAtt) {
    const pl = planById.get(a.planId);
    if (!pl) continue;
    const cur = catMap.get(pl.category);
    if (!cur) continue;
    cur.attendanceCount += 1;
  }
  // 各类别到勤率
  for (const cur of catMap.values()) {
    const attOfCat = inPeriodAtt.filter((a) => {
      const pl = planById.get(a.planId);
      return pl && pl.category === cur.category;
    });
    const attCat = attOfCat.filter((a) => a.attended).length;
    cur.attendanceRate = attOfCat.length > 0 ? roundRate(attCat / attOfCat.length) : 0;
  }
  const byCategory = [...catMap.values()].sort((a, b) => b.totalCredits - a.totalCredits);

  // 带教老师工作量
  const teacherMap = new Map<string, TeacherWorkload>();
  for (const pl of inPeriodPlans) {
    const cur = teacherMap.get(pl.teacherId) ?? {
      teacherId: pl.teacherId,
      planCount: 0,
      totalCredits: 0,
      attendanceCount: 0,
    };
    cur.planCount += 1;
    cur.totalCredits = roundCredits(cur.totalCredits + pl.credits);
    teacherMap.set(pl.teacherId, cur);
  }
  for (const a of inPeriodAtt) {
    const pl = planById.get(a.planId);
    if (!pl) continue;
    const cur = teacherMap.get(pl.teacherId);
    if (!cur) continue;
    cur.attendanceCount += 1;
  }
  const teacherWorkload = [...teacherMap.values()].sort(
    (a, b) => b.totalCredits - a.totalCredits || b.planCount - a.planCount,
  );

  return {
    period: p,
    totalPlans: inPeriodPlans.length,
    totalCredits,
    totalAttendance: inPeriodAtt.length,
    attendanceRate,
    assessLinkedPlans,
    byCategory,
    teacherWorkload,
    generatedAt: new Date().toISOString(),
  };
}

/** 列出全部教学计划（按创建时间倒序，路由 GET 看板直接消费） */
export function listTeachingPlans(): Plan[] {
  return [...plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 测试专用：清空进程内台账，保证用例之间互不污染。 */
export function resetTeachingLedger(): void {
  plans.length = 0;
  attendances.length = 0;
}

/* ------------------------------------------------------------------ */
/* 薄持久化层：best-effort 写入 PostgreSQL，失败降级不阻断               */
/* ------------------------------------------------------------------ */

/**
 * 把已登记的教学计划落库到 clinical.teaching_plan。
 * 由路由层在 createTeachingPlan 之后显式 await；断库 / 表未迁移时静默降级，
 * 进程内台账仍可出报表，持久化留待重连后补写。
 */
export async function persistPlan(plan: Plan): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.teaching_plan
        (id, course_name, teacher_id, student_group, category, schedule,
         credits, dept, assess_linked, created_at)
      VALUES
        (${plan.id}, ${plan.courseName}, ${plan.teacherId}, ${plan.studentGroup},
         ${plan.category}, ${plan.schedule}, ${plan.credits}, ${plan.dept},
         ${plan.assessLinked}, ${plan.createdAt}::timestamptz)
      ON CONFLICT (id) DO NOTHING
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可出报表，落库留待重连后补写
  }
}

/**
 * 把考勤记录落库到 clinical.teaching_attendance。best-effort，断库降级不阻断。
 */
export async function persistAttendance(record: Attendance): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.teaching_attendance
        (id, plan_id, student_id, attended, attendance_date, credits_earned)
      VALUES
        (${record.id}, ${record.planId}, ${record.studentId}, ${record.attended},
         ${record.date}::date, ${record.creditsEarned})
      ON CONFLICT (id) DO NOTHING
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可出报表，落库留待重连后补写
  }
}
