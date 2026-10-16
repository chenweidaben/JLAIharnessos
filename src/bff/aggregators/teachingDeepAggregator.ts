/**
 * 健澜科技 jlmedaios - M162-B 教学与培训深化聚合器
 *
 * 【医院全场景】在线课程（录播 + 直播）/ 技能考核（OSCE 客观结构化考核）/
 *   规培管理（轮转计划 + 出科考核）/ 继教学分（自动记录）一体化。
 *
 * 【本期定位】教学考核要公平，不能走过场：
 *   - buildTeachingPlan(dept, year)              纯函数：按科室生成年度教学计划
 *     （录播课 + 直播讲座 + OSCE 技能考核 + 规培轮转计划 + 出科考核 + 学分汇总），
 *     课程由确定性种子派生，同科室同年份必出同一份计划。
 *   - evaluateStudentPerformance(studentId, courseId)
 *     纯函数：OSCE 五考站客观结构化打分（病史采集/体格检查/临床操作/医患沟通/
 *     急救技能），加权总分 + 任一考站低于 60 即整体不通过；合格自动登记继教学分；
 *     并给出公平性提示（满分扎堆=疑似走过场 / 贴线=建议抽查 / 短板考站=不予通过）。
 *   - generateTeachingReport(dept, period)       纯函数：科室教学质量与公平性报告
 *     （课程完成率 / OSCE 合格率 / 出科合格率 / 人均学分 / 分数段分布 / 满分率），
 *     满分率过高即提示「评分区分度不足、有走过场风险」。
 *
 * 设计要点：
 *  - 三个核心函数均为纯函数：不读库、不发网络、不碰 WebSocket，便于单测与前端复用；
 *  - 所有打分/分布由确定性种子（字符串 FNV 哈希 → mulberry32）派生，同参必同结果，
 *    考核可复算、可申诉、可审计；
 *  - 学生仅输出脱敏标识（S-xxxx），不落 PII，符合隐私合规；
 *  - 与 M140-C teaching_plan / teaching_attendance 的「考勤计学分」语义衔接。
 *
 * 【远期深化】
 *  - 录播学习进度 / 直播签到由「演示种子」升级为「学习行为流自动采集」；
 *  - OSCE 考站引入标准化病人（SP）评分表 + 双评一致性（ICC）校验；
 *  - 继教学分与省级继教平台学分接口自动对账。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** 课程形态：录播 / 直播 / OSCE 技能考核 / 规培轮转 / 出科考核 */
export type CourseType = 'recorded' | 'live' | 'osce' | 'rotation' | 'exit_exam';

/** 教学计划中的一门课程 / 一次考核 */
export interface TeachingCourseItem {
  courseId: string;
  courseCode: string;
  courseName: string;
  dept: string;
  courseType: CourseType;
  teacherId: string;
  targetGroup: string;
  /** 继教学分（考核合格后自动入账） */
  credit: number;
  capacity: number;
  /** 排期自然语言描述（如「2026-Q1 录播，共 8 节」） */
  schedule: string;
}

/** 规培轮转计划单条 */
export interface RotationTrack {
  rotationId: string;
  dept: string;
  /** 起止月份，如「1-3 月」 */
  months: string;
  mentor: string;
  /** 出科考核是否必过 */
  exitExamRequired: boolean;
}

/** buildTeachingPlan 返回 */
export interface TeachingPlan {
  dept: string;
  deptName: string;
  year: number;
  generatedAt: string;
  courses: TeachingCourseItem[];
  rotationTracks: RotationTrack[];
  creditSummary: {
    /** 全年计划总学分 */
    total: number;
    /** 按课程形态汇总学分 */
    byType: Record<CourseType, number>;
  };
  fairnessNote: string;
  demo: boolean;
}

/** OSCE 单个考站得分 */
export interface OsceStationScore {
  station: string;
  /** 满分（百分制） */
  maxScore: number;
  score: number;
  /** 权重 0..1 */
  weight: number;
  /** 该站是否 ≥60 */
  passed: boolean;
}

/** evaluateStudentPerformance 返回 */
export interface StudentEvaluation {
  studentId: string;
  courseId: string;
  courseName: string;
  courseType: CourseType;
  stations: OsceStationScore[];
  /** 加权总分 0..100 */
  weightedTotal: number;
  /** 最低考站分（防偏科/走过场） */
  stationMin: number;
  /** 加权 ≥60 且每站 ≥60 才通过 */
  overallPassed: boolean;
  /** 合格后自动登记的继教学分 */
  creditEarned: number;
  creditAutoRecorded: boolean;
  /** 公平性提示（疑似走过场 / 贴线抽查 / 短板考站） */
  fairnessFlags: string[];
  gradedAt: string;
  demo: boolean;
}

/** 报告分数段单点 */
export interface ScoreBand {
  range: string;
  count: number;
}

/** generateTeachingReport 返回 */
export interface TeachingReport {
  dept: string;
  deptName: string;
  period: string;
  generatedAt: string;
  overview: {
    courseCount: number;
    studentCount: number;
    /** 课程完成率 % */
    completionRate: number;
    /** OSCE 合格率 % */
    oscePassRate: number;
    /** 出科考核合格率 % */
    exitExamPassRate: number;
    /** 人均继教学分 */
    creditAvg: number;
  };
  /** 分数段分布（公平性：不应扎堆满分） */
  scoreDistribution: ScoreBand[];
  fairness: {
    /** 满分率 %（过高=走过场） */
    ceilingRate: number;
    /** 不及格率 % */
    failRate: number;
    /** 存在短板考站人数 */
    minStationFlagged: number;
    conclusion: string;
  };
  recommendations: string[];
  demo: boolean;
}

/* --------------------------- 确定性随机工具 --------------------------- */

/** FNV-1a 32 位哈希：把任意字符串（学生/课程/科室）映射为固定种子 */
function fnv1a(s: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 确定性伪随机数（mulberry32），保证打分/分布可复算、单测稳定 */
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

/** 安全取整 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** 科室白名单（未知科室回退内科），附中文名 */
const DEPT_NAME: Record<string, string> = {
  internal: '内科',
  surgery: '外科',
  obgyn: '妇产科',
  pediatrics: '儿科',
  emergency: '急诊科',
  icu: '重症医学科',
};

/** OSCE 五考站（客观结构化临床考试），权重合计 = 1 */
const OSCE_STATIONS: { station: string; weight: number }[] = [
  { station: '病史采集', weight: 0.2 },
  { station: '体格检查', weight: 0.2 },
  { station: '临床操作', weight: 0.25 },
  { station: '医患沟通', weight: 0.15 },
  { station: '急救技能', weight: 0.2 },
];

/** 合格线（百分制）：加权总分与单站均须 ≥60 */
const PASS_LINE = 60;

/* --------------------------- buildTeachingPlan --------------------------- */

/**
 * buildTeachingPlan：按科室生成年度教学计划（在线课程 + OSCE + 规培轮转 + 出科）。
 *
 * @param dept 科室编码（internal/surgery/...，未知回退 internal）
 * @param year 年度（默认当前年）
 * @returns    TeachingPlan（确定性种子：同 dept+year 必出同一计划）
 *
 * 纯函数：不读库；课程目录为演示基准，远期可由教学秘书在 teaching_course 表维护。
 */
export function buildTeachingPlan(dept: string, year?: number): TeachingPlan {
  const key = DEPT_NAME[dept] ? dept : 'internal';
  const deptName = DEPT_NAME[key] ?? '内科';
  const y = year && year > 2000 && year < 2100 ? Math.floor(year) : new Date().getFullYear();
  const rand = mulberry32(fnv1a(`teaching-plan:${key}:${y}`));

  // 录播核心课（3~4 门，确定性波动）
  const recorded: TeachingCourseItem[] = [
    {
      courseId: `REC-${key}-${y}-1`,
      courseCode: `REC-${y}-001`,
      courseName: '三基三严理论精讲（录播）',
      dept: key, courseType: 'recorded', teacherId: 'T-0001',
      targetGroup: '全员', credit: 2.0, capacity: 200,
      schedule: `${y}-Q1 录播，共 8 节`,
    },
    {
      courseId: `REC-${key}-${y}-2`,
      courseCode: `REC-${y}-002`,
      courseName: '医疗核心制度与病历书写规范（录播）',
      dept: key, courseType: 'recorded', teacherId: 'T-0002',
      targetGroup: '医师/规培生', credit: 1.5, capacity: 160,
      schedule: `${y}-Q2 录播，共 6 节`,
    },
  ];
  if (rand() > 0.3) {
    recorded.push({
      courseId: `REC-${key}-${y}-3`,
      courseCode: `REC-${y}-003`,
      courseName: '医患沟通与职业防护（录播）',
      dept: key, courseType: 'recorded', teacherId: 'T-0003',
      targetGroup: '全员', credit: 1.0, capacity: 180,
      schedule: `${y}-Q3 录播，共 4 节`,
    });
  }

  // 直播讲座（2 场：月度教学查房 + 疑难病例讨论）
  const live: TeachingCourseItem[] = [
    {
      courseId: `LIVE-${key}-${y}-1`,
      courseCode: `LIVE-${y}-101`,
      courseName: '月度教学查房直播',
      dept: key, courseType: 'live', teacherId: 'T-0010',
      targetGroup: '规培生/实习生', credit: 1.0, capacity: 80,
      schedule: `${y} 年每月第二周周四 16:00 直播`,
    },
    {
      courseId: `LIVE-${key}-${y}-2`,
      courseCode: `LIVE-${y}-102`,
      courseName: '疑难病例 MDT 讨论直播',
      dept: key, courseType: 'live', teacherId: 'T-0011',
      targetGroup: '医师/规培生', credit: 1.0, capacity: 100,
      schedule: `${y} 年每双月末周五 19:00 直播`,
    },
  ];

  // OSCE 客观结构化技能考核（年中 + 年末各 1 次）
  const osce: TeachingCourseItem[] = [
    {
      courseId: `OSCE-${key}-${y}-MID`,
      courseCode: `OSCE-${y}-201`,
      courseName: `${deptName} OSCE 年中技能考核`,
      dept: key, courseType: 'osce', teacherId: 'T-0100',
      targetGroup: '规培生', credit: 2.0, capacity: 60,
      schedule: `${y}-06 五站式 OSCE 考站`,
    },
    {
      courseId: `OSCE-${key}-${y}-FIN`,
      courseCode: `OSCE-${y}-202`,
      courseName: `${deptName} OSCE 年末技能考核`,
      dept: key, courseType: 'osce', teacherId: 'T-0100',
      targetGroup: '规培生', credit: 2.0, capacity: 60,
      schedule: `${y}-12 五站式 OSCE 考站`,
    },
  ];

  // 规培轮转计划（四段，每段 3 个月）
  const rotationMonths = ['1-3 月', '4-6 月', '7-9 月', '10-12 月'];
  const rotationTracks: RotationTrack[] = rotationMonths.map((m, i) => ({
    rotationId: `ROT-${key}-${y}-${i + 1}`,
    dept: key,
    months: m,
    mentor: `T-0${20 + i}`,
    exitExamRequired: true,
  }));

  // 出科考核（每个轮转段出科一次）
  const exitExams: TeachingCourseItem[] = rotationMonths.map((m, i) => ({
    courseId: `EXAM-${key}-${y}-${i + 1}`,
    courseCode: `EXAM-${y}-30${i + 1}`,
    courseName: `${deptName} ${m}轮转出科考核`,
    dept: key, courseType: 'exit_exam', teacherId: `T-0${20 + i}`,
    targetGroup: '规培生', credit: 1.0, capacity: 60,
    schedule: `${y} ${m}末出科`,
  }));

  const rotation: TeachingCourseItem[] = [
    {
      courseId: `ROT-${key}-${y}-PLAN`,
      courseCode: `ROT-${y}-400`,
      courseName: `${deptName} 年度规培轮转计划`,
      dept: key, courseType: 'rotation', teacherId: 'T-0001',
      targetGroup: '规培生', credit: 4.0, capacity: 40,
      schedule: `${y} 年四段轮转（每段 3 个月）`,
    },
  ];

  const courses = [...recorded, ...live, ...osce, ...rotation, ...exitExams];

  // 学分汇总
  const byType: Record<CourseType, number> = {
    recorded: 0, live: 0, osce: 0, rotation: 0, exit_exam: 0,
  };
  for (const c of courses) byType[c.courseType] = round1(byType[c.courseType] + c.credit);
  const total = round1(Object.values(byType).reduce((a, b) => a + b, 0));

  return {
    dept: key,
    deptName,
    year: y,
    generatedAt: new Date().toISOString(),
    courses,
    rotationTracks,
    creditSummary: { total, byType },
    fairnessNote:
      'OSCE 五考站加权、单站低于 60 即不通过；考核合格自动登记继教学分，不走过场。',
    demo: true,
  };
}

/* --------------------------- evaluateStudentPerformance --------------------------- */

/**
 * evaluateStudentPerformance：OSCE 客观结构化考核打分（公平、可复算）。
 *
 * @param studentId 学生脱敏标识（如 S-1024）
 * @param courseId  课程 / 考核 ID（如 OSCE-internal-2026-MID）
 * @returns         StudentEvaluation（五考站加权 + 公平性提示）
 *
 * 纯函数：分数由 FNV(studentId+courseId) 种子派生，同一学生同一考核结果恒定，
 * 可申诉、可审计；任一考站 <60 即整体不通过，杜绝「平均过线、短板放水」。
 */
export function evaluateStudentPerformance(
  studentId: string,
  courseId: string,
): StudentEvaluation {
  const sid = studentId || 'S-0000';
  const cid = courseId || 'OSCE-unknown';
  const seed = fnv1a(`osce:${sid}:${cid}`);
  const rand = mulberry32(seed);

  // 五考站打分：主体落在 55~92 的合理区间，保证区分度；少量极端值用于触发公平规则
  const stations: OsceStationScore[] = OSCE_STATIONS.map((s) => {
    // 80% 普通区间 55~92；20% 拉高到 95~100（模拟少数扎实/疑似走过场）
    const highFlyer = rand() < 0.18;
    const score = highFlyer
      ? Math.round(95 + rand() * 5)
      : Math.round(55 + rand() * 37);
    return {
      station: s.station,
      maxScore: 100,
      score,
      weight: s.weight,
      passed: score >= PASS_LINE,
    };
  });

  const weightedTotal = round1(
    stations.reduce((sum, s) => sum + s.score * s.weight, 0),
  );
  const stationMin = Math.min(...stations.map((s) => s.score));
  const stationMax = Math.max(...stations.map((s) => s.score));

  // 通过规则：加权总分 ≥60 且每一站都 ≥60（客观结构化，短板不过）
  const overallPassed = weightedTotal >= PASS_LINE && stations.every((s) => s.passed);

  // 课程学分：演示口径 OSCE=2 分；合格即自动入账
  const credit = cid.startsWith('REC') ? 1.5
    : cid.startsWith('LIVE') ? 1.0
    : cid.startsWith('EXAM') ? 1.0
    : 2.0;
  const creditEarned = overallPassed ? credit : 0;

  // 公平性提示
  const fairnessFlags: string[] = [];
  if (stationMax === 100 && stations.every((s) => s.score >= 95)) {
    fairnessFlags.push('全部考站 95+ 且含满分：评分未拉开差距，疑似走过场，建议考务复核');
  }
  if (weightedTotal >= 59 && weightedTotal <= 61 && overallPassed) {
    fairnessFlags.push('成绩贴线通过（60±1）：建议抽查标准化病人评分表');
  }
  const weak = stations.filter((s) => s.score < PASS_LINE);
  for (const w of weak) {
    fairnessFlags.push(`「${w.station}」考站 ${w.score} 分低于 ${PASS_LINE}：按 OSCE 规则不予通过，不计学分`);
  }
  if (fairnessFlags.length === 0) {
    fairnessFlags.push('五考站加权打分、过程可追溯，结果公平有效');
  }

  return {
    studentId: sid,
    courseId: cid,
    courseName: cid.startsWith('OSCE') ? 'OSCE 客观结构化技能考核'
      : cid.startsWith('REC') ? '在线录播课程考核'
      : cid.startsWith('LIVE') ? '直播讲座考核'
      : cid.startsWith('EXAM') ? '出科考核'
      : '教学考核',
    courseType: cid.startsWith('OSCE') ? 'osce'
      : cid.startsWith('REC') ? 'recorded'
      : cid.startsWith('LIVE') ? 'live'
      : cid.startsWith('EXAM') ? 'exit_exam'
      : 'rotation',
    stations,
    weightedTotal: clamp(weightedTotal, 0, 100),
    stationMin,
    overallPassed,
    creditEarned,
    creditAutoRecorded: overallPassed,
    fairnessFlags,
    gradedAt: new Date().toISOString(),
    demo: true,
  };
}

/* --------------------------- generateTeachingReport --------------------------- */

/**
 * generateTeachingReport：科室教学质量与公平性报告。
 *
 * @param dept    科室编码（未知回退 internal）
 * @param period  周期标签（如 2026-H1 / 2026-Q3 / 2026 年度）
 * @returns       TeachingReport（完成率/合格率/学分/分数段/满分率公平结论）
 *
 * 纯函数：分布由 FNV(dept+period) 种子派生；满分率 >25% 即提示「区分度不足、
 * 有走过场风险」，把「公平」做成可量化指标，而非口号。
 */
export function generateTeachingReport(dept: string, period?: string): TeachingReport {
  const key = DEPT_NAME[dept] ? dept : 'internal';
  const deptName = DEPT_NAME[key] ?? '内科';
  const p = period && period.length > 0 ? period : `${new Date().getFullYear()} 年度`;
  const seed = fnv1a(`teaching-report:${key}:${p}`);
  const rand = mulberry32(seed);

  const courseCount = 10 + Math.floor(rand() * 6);          // 10~15 门
  const studentCount = 30 + Math.floor(rand() * 41);        // 30~70 人

  // 分数段：按确定性种子把学生分到五档，合计 = studentCount
  const bands = ['<60 不及格', '60-69', '70-79', '80-89', '90-100'];
  // 抽取各档比例（ Dirichlet 直觉：权重随机归一）
  const weights = bands.map(() => 0.35 + rand() * 1.3);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / wSum) * studentCount);
  // 四舍五入后把余量补到中间档，保证合计严格 = studentCount
  const counts = raw.map((v) => Math.floor(v));
  let assigned = counts.reduce((a, b) => a + b, 0);
  for (let i = 0; i < studentCount - assigned; i += 1) counts[2] += 1;
  // 任何一档不为负
  for (let i = 0; i < counts.length; i += 1) counts[i] = Math.max(0, counts[i]);

  const scoreDistribution: ScoreBand[] = bands.map((range, i) => ({ range, count: counts[i] }));

  const failCount = counts[0];
  const ceilingCount = counts[4];
  const ceilingRate = round1((ceilingCount / studentCount) * 100);
  const failRate = round1((failCount / studentCount) * 100);
  // 存在短板考站人数：约等于「刚过但非满分」的一部分（演示口径）
  const minStationFlagged = Math.round(studentCount * (0.06 + rand() * 0.1));

  const oscePassRate = round1(100 - failRate - rand() * 4);
  const exitExamPassRate = round1(Math.min(99, oscePassRate + 2 + rand() * 5));
  const completionRate = round1(82 + rand() * 15);
  const creditAvg = round1(8 + rand() * 9);

  // 公平性结论：满分率过高 = 评分区分度不足
  let conclusion: string;
  if (ceilingRate > 25) {
    conclusion = `90 分以上占比 ${ceilingRate}%，偏高：评分区分度不足、有走过场风险，建议复核 OSCE 双评一致性`;
  } else if (failRate > 18) {
    conclusion = `不及格率 ${failRate}%，偏高：建议加强薄弱考站带教与补考辅导`;
  } else {
    conclusion = `分数段分布合理（满分率 ${ceilingRate}%、不及格率 ${failRate}%）：考核区分度良好，未发现走过场迹象`;
  }

  const recommendations: string[] = [
    ceilingRate > 25
      ? '对 90+ 考生抽查 OSCE 评分表，引入标准化病人双评（ICC）校验'
      : '保持当前 OSCE 五站考核口径，定期校准评分尺度',
    failRate > 18
      ? '针对不及格考站开设专项技能训练营并安排补考'
      : '对短板考站（最低分档）开展针对性小讲课',
    '继教学分按「考核合格自动入账」执行，季末与继教平台对账一次',
  ];

  return {
    dept: key,
    deptName,
    period: p,
    generatedAt: new Date().toISOString(),
    overview: {
      courseCount,
      studentCount,
      completionRate: clamp(completionRate, 0, 100),
      oscePassRate: clamp(oscePassRate, 0, 100),
      exitExamPassRate: clamp(exitExamPassRate, 0, 100),
      creditAvg,
    },
    scoreDistribution,
    fairness: {
      ceilingRate,
      failRate,
      minStationFlagged,
      conclusion,
    },
    recommendations,
    demo: true,
  };
}
