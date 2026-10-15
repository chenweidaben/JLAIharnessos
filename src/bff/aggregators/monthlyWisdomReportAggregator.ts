/**
 * 健澜科技 jlmedaios - 医院智慧资产月度报表聚合器（M119-C）
 *
 * 依据宪法第七章 7.2 / 7.7 / 7.9：
 *  - 7.2 组织级智能三级沉淀：员工个人 MUSE → 科室 MUSE → 全院 MUSE；
 *    本聚合器把全院员工 Personal Agent 的决策经验流水，按月切片为
 *    院长视角的「智慧资产月度报表」，供月度运营复盘与季度战略汇报；
 *  - 7.7 经验记录铁律：失败经验（教训）价值更高，单独成桶、单独计数，
 *    与成功经验分桶输出，不混算；
 *  - 7.9 全院知识反哺：活跃员工榜（top5Active）暴露经验高产科室，
 *    重点教训榜（top3Lessons）定位需要带教 / 流程改造的高风险决策点。
 *
 * 纯函数核心（不触库、无副作用、可直接单测）：
 *  - generateMonthlyWisdomReport(year, month, allExperiences)：
 *      按月切片全院经验流水，产出当月新增 / 成功 / 教训 / 活跃员工 Top5 /
 *      重点教训 Top3 / 环比上月增长，六件套一次产出；
 *  - formatWisdomReport(report)：
 *      把报表对象序列化为可打印纯文本，供前端「下载」按钮直接落盘 .txt。
 *
 * 入参均为 camelCase 结构化行；本聚合器只读不写，空输入一律返回结构完整
 * 的零值结果，绝不抛异常（依据宪法第七章 7.7「只记录事实，不评判对错」）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/**
 * 员工 MUSE 单条决策经验（全院 Personal Agent 最小沉淀单元）。
 * 由路由层从 medmuse 学习画像 + profile 行装入，本聚合器只读不写。
 * 与 hospitalWisdomAggregator.HospitalStaffMuseEntry 口径对齐。
 */
export interface WisdomExperience {
  /** 员工脱敏主键 */
  staffId: string;
  /** 员工姓名（榜单展示用） */
  staffName: string;
  /** 所属科室编码（可空，活跃榜展示用） */
  deptCode?: string;
  /** 决策要点主题（如「CAP 经验性抗感染首选」） */
  topic: string;
  /** 该员工做出此决策的累计次数 */
  decisionCount: number;
  /** 是否为失败经验（true → 教训桶，不计入成功经验） */
  isFailure: boolean;
  /** 该决策点有效率 0~1（可空，榜单不外露明细） */
  successRate?: number;
  /** 沉淀时间 ISO 串（按月切片依据；空则不进入任何月份） */
  createdAt?: string;
}

/** 活跃员工榜行 */
export interface ActiveStaffRow {
  staffId: string;
  staffName: string;
  deptCode: string;
  /** 当月该员工决策次数合计 */
  decisionCount: number;
  /** 当月成功经验条数 */
  successCount: number;
  /** 当月教训条数 */
  lessonCount: number;
}

/** 重点教训榜行 */
export interface LessonRow {
  /** 教训主题（同主题多次出现时合并计数） */
  topic: string;
  /** 首次沉淀该教训的员工姓名 */
  staffName: string;
  /** 该主题当月出现次数 */
  occurrenceCount: number;
  /** 最新一次沉淀时间 ISO 串 */
  latestAt: string;
}

/** 环比上月增长 */
export interface GrowthVsLastMonth {
  /** 上月新增经验条数（基数） */
  previousTotalNew: number;
  /** 当月 - 上月（正为增长，负为回落） */
  delta: number;
  /** 环比增长率（%）；上月基数为 0 时返回 null，避免除零 */
  ratioPct: number | null;
}

/** generateMonthlyWisdomReport 总产出 */
export interface MonthlyWisdomReport {
  year: number;
  month: number;
  /** 当月新增经验总条数（= successCount + lessonCount） */
  totalNew: number;
  /** 当月成功经验条数（isFailure=false） */
  successCount: number;
  /** 当月失败教训条数（isFailure=true，依据 7.7 单独成桶） */
  lessonCount: number;
  /** 当月最活跃员工 Top5（按决策次数合计降序） */
  top5Active: ActiveStaffRow[];
  /** 当月重点教训 Top3（按出现次数降序） */
  top3Lessons: LessonRow[];
  /** 与上月环比 */
  growthVsLastMonth: GrowthVsLastMonth;
}

/* ------------------------------- 常量与工具 ------------------------------- */

/** 安全收敛为非负整数次数 */
function asCount(n: unknown): number {
  const v = Math.floor(Number(n) || 0);
  return v > 0 ? v : 0;
}

/** 两位补零 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 取 ISO 时间的统计月前缀（YYYY-MM）；空/非法返回空串（不进任何月桶） */
function periodOf(iso?: string): string {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4}-\d{2})/);
  return m ? m[1] : '';
}

/** 某年月的上一月前缀（跨年回退） */
function prevPeriod(year: number, month: number): string {
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${pad2(month - 1)}`;
}

/** 四舍五入到 1 位小数，避免浮点噪声导致快照不稳定 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * generateMonthlyWisdomReport：医院智慧资产月度报表（依据宪法第七章 7.2 / 7.7 / 7.9）。
 *
 * 流程：
 *  1. 校验 year/month：month 不在 1~12 → 直接返回零值报表；
 *  2. 按 createdAt 前 7 位（YYYY-MM）把全院经验流水切到当月 / 上月两个桶；
 *  3. 当月桶内：成功 / 失败分桶计数（7.7 不混算）；
 *  4. 活跃员工榜：当月桶按 staffId 归集，Σ decisionCount 降序取前 5；
 *  5. 重点教训榜：当月失败行按 topic 归集，Σ occurrenceCount 降序取前 3；
 *  6. 环比：以当月 totalNew 与上月 totalNew 求差与比率。
 *
 * 纯函数：不修改入参；任一入参为 null/undefined/空数组均返回结构完整零值，
 * 绝不抛异常。
 *
 * @param year          统计年（如 2026）
 * @param month         统计月（1~12）
 * @param allExperiences 全院员工 MUSE 决策经验流水
 */
export function generateMonthlyWisdomReport(
  year: number,
  month: number,
  allExperiences: readonly WisdomExperience[] | null | undefined,
): MonthlyWisdomReport {
  /* 零值骨架 */
  const zero: MonthlyWisdomReport = {
    year,
    month,
    totalNew: 0,
    successCount: 0,
    lessonCount: 0,
    top5Active: [],
    top3Lessons: [],
    growthVsLastMonth: { previousTotalNew: 0, delta: 0, ratioPct: null },
  };

  /* 1) 入参校验：month 非法直接零值 */
  const y = Math.floor(Number(year) || 0);
  const m = Math.floor(Number(month) || 0);
  if (!y || m < 1 || m > 12) return zero;

  const rows = allExperiences ?? [];
  const currentPeriod = `${y}-${pad2(m)}`;
  const lastPeriod = prevPeriod(y, m);

  /* 2) 分桶：当月 / 上月 */
  const current: WisdomExperience[] = [];
  let lastMonthTotal = 0;
  for (const e of rows) {
    if (!e) continue;
    const period = periodOf(e.createdAt);
    if (period === currentPeriod) current.push(e);
    else if (period === lastPeriod) lastMonthTotal += 1;
  }

  /* 3) 成功 / 失败分桶计数（7.7） */
  let successCount = 0;
  let lessonCount = 0;
  for (const e of current) {
    if (e.isFailure) lessonCount += 1;
    else successCount += 1;
  }
  const totalNew = current.length;

  /* 4) 活跃员工榜：按 staffId 归集 */
  interface StaffAcc {
    staffId: string;
    staffName: string;
    deptCode: string;
    decisionCount: number;
    successCount: number;
    lessonCount: number;
  }
  const staffMap = new Map<string, StaffAcc>();
  for (const e of current) {
    const sid = (e.staffId ?? '').trim() || '__unknown_staff__';
    let acc = staffMap.get(sid);
    if (!acc) {
      acc = {
        staffId: sid,
        staffName: (e.staffName ?? '').trim() || '未知员工',
        deptCode: (e.deptCode ?? '').trim(),
        decisionCount: 0,
        successCount: 0,
        lessonCount: 0,
      };
      staffMap.set(sid, acc);
    }
    acc.decisionCount += asCount(e.decisionCount);
    if (e.isFailure) acc.lessonCount += 1;
    else acc.successCount += 1;
  }
  const top5Active: ActiveStaffRow[] = Array.from(staffMap.values())
    .sort((a, b) => {
      if (b.decisionCount !== a.decisionCount) return b.decisionCount - a.decisionCount;
      return a.staffName.localeCompare(b.staffName, 'zh-CN');
    })
    .slice(0, 5)
    .map((a) => ({
      staffId: a.staffId,
      staffName: a.staffName,
      deptCode: a.deptCode,
      decisionCount: a.decisionCount,
      successCount: a.successCount,
      lessonCount: a.lessonCount,
    }));

  /* 5) 重点教训榜：当月失败行按 topic 归集 */
  interface LessonAcc {
    topic: string;
    staffName: string;
    occurrenceCount: number;
    latestAt: string;
  }
  const lessonMap = new Map<string, LessonAcc>();
  for (const e of current) {
    if (!e.isFailure) continue;
    const topic = (e.topic ?? '').trim() || '未命名教训';
    let acc = lessonMap.get(topic);
    if (!acc) {
      acc = { topic, staffName: (e.staffName ?? '').trim() || '未知员工', occurrenceCount: 0, latestAt: '' };
      lessonMap.set(topic, acc);
    }
    acc.occurrenceCount += 1;
    const ts = (e.createdAt ?? '').trim();
    if (ts > acc.latestAt) {
      acc.latestAt = ts;
      acc.staffName = (e.staffName ?? '').trim() || acc.staffName;
    }
  }
  const top3Lessons: LessonRow[] = Array.from(lessonMap.values())
    .sort((a, b) => {
      if (b.occurrenceCount !== a.occurrenceCount) return b.occurrenceCount - a.occurrenceCount;
      return a.topic.localeCompare(b.topic, 'zh-CN');
    })
    .slice(0, 3)
    .map((a) => ({
      topic: a.topic,
      staffName: a.staffName,
      occurrenceCount: a.occurrenceCount,
      latestAt: a.latestAt,
    }));

  /* 6) 环比 */
  const delta = totalNew - lastMonthTotal;
  const ratioPct = lastMonthTotal > 0 ? round1((delta / lastMonthTotal) * 100) : null;

  return {
    year: y,
    month: m,
    totalNew,
    successCount,
    lessonCount,
    top5Active,
    top3Lessons,
    growthVsLastMonth: { previousTotalNew: lastMonthTotal, delta, ratioPct },
  };
}

/**
 * formatWisdomReport：把报表序列化为可打印纯文本。
 * 前端「下载」按钮直接把返回串写入 .txt 文件，无需浏览器再加工。
 */
export function formatWisdomReport(report: MonthlyWisdomReport): string {
  const lines: string[] = [];
  const pad = '  ';
  lines.push('医院智慧资产月度报表');
  lines.push(`统计月份：${report.year}-${pad2(report.month)}`);
  lines.push('──────────────────────────────');
  lines.push(`新增经验总数：${report.totalNew} 条`);
  lines.push(`${pad}· 成功经验：${report.successCount} 条`);
  lines.push(`${pad}· 失败教训：${report.lessonCount} 条（依据宪法第七章 7.7 单独成桶）`);

  const g = report.growthVsLastMonth;
  if (g.ratioPct === null) {
    lines.push(`环比上月：${g.delta >= 0 ? '+' : ''}${g.delta} 条（上月无基数，首次统计）`);
  } else {
    lines.push(
      `环比上月：${g.delta >= 0 ? '+' : ''}${g.delta} 条（${g.ratioPct >= 0 ? '+' : ''}${g.ratioPct}%）`,
    );
  }

  lines.push('');
  lines.push('最活跃员工 Top5：');
  if (report.top5Active.length === 0) {
    lines.push(`${pad}（当月暂无活跃员工沉淀）`);
  } else {
    report.top5Active.forEach((a, i) => {
      const dept = a.deptCode ? `［${a.deptCode}］` : '';
      lines.push(
        `${pad}${i + 1}. ${a.staffName}${dept}　决策 ${a.decisionCount} 次　成功 ${a.successCount} / 教训 ${a.lessonCount}`,
      );
    });
  }

  lines.push('');
  lines.push('重点教训 Top3：');
  if (report.top3Lessons.length === 0) {
    lines.push(`${pad}（当月暂无失败教训沉淀）`);
  } else {
    report.top3Lessons.forEach((l, i) => {
      lines.push(`${pad}${i + 1}. ${l.topic}（${l.staffName}，出现 ${l.occurrenceCount} 次）`);
    });
  }

  lines.push('');
  lines.push('──────────────────────────────');
  lines.push('杭州健澜科技有限公司 · 依据宪法第七章 7.2 / 7.7 / 7.9');
  return lines.join('\n');
}
