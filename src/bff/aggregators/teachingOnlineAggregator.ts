/**
 * 健澜科技 jlmedaios - M171-B 医院教学智能化深化——在线学习与考核聚合器
 *
 * 【科研教学后勤】在线学习要好用，不能只是视频列表：
 *
 *   - buildOnlineLearningPlatform(category?) 纯函数：构建在线学习平台视图
 *     （分类导航 + 视频课程目录[录播/直播/回放] + 学员学习概览[完成度/时长/成绩] +
 *       学分自动认定汇总），课程由确定性种子派生，同分类必出同一份目录。
 *   - generateQuizFromContent(content, difficulty) 纯函数：从课程正文自动出题，
 *     覆盖单选 / 多选 / 判断 / 案例分析四种题型，难度 easy/medium/hard 控制干扰项
 *     数量与案例开放度，题库可复算、可审核。
 *   - evaluateStudentAnswer(question, answer, correctAnswer) 纯函数：自动阅卷，
 *     单选全等、多选集合全等、判断布尔全等、案例分析按得分要点命中率给分，
 *     返回对错 / 得分 / 解析 / 教学反馈。
 *   - buildLearningPath(role, level) 纯函数：按学员角色与层级推荐学习路径，
 *     分阶段（筑基 / 临床精进 / 专科技能 / 继教提升）给出课程清单与学分目标。
 *
 * 设计要点：
 *  - 四个函数均为纯函数：不读库、不发网络、不碰 WebSocket，便于单测与前端复用；
 *  - 内置演示课程台账与 deploy/postgres/init/341-teaching-online.sql 的
 *    clinical.online_course 表结构对齐，空库即可演示；
 *  - 所有分布/题目由确定性种子（字符串 FNV 哈希 → mulberry32）派生，同参必同结果，
 *    考核可复算、可申诉、可审计；
 *  - 学分自动认定规则：课程完成度=100% 且 测验成绩≥合格线 → 学分自动入账；
 *  - 学员仅输出脱敏标识（S-xxxx），不落 PII，符合隐私合规。
 *
 * 【远期】视频播放行为流（拖拽/倍速/跳出点）自动采集防挂机、AI 讲稿摘要、
 *   与省级继教平台学分接口自动对账（本切片不做）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** 课程分类 */
export type CourseCategory =
  | 'basic_med' | 'clinical' | 'nursing'
  | 'med_tech' | 'hospital_admin' | 'ethics';

/** 课程形态：录播 / 直播 / 回放 */
export type CourseMode = 'recorded' | 'live' | 'replay';

/** 题型：单选 / 多选 / 判断 / 案例分析 */
export type QuestionType = 'single' | 'multiple' | 'judge' | 'case';

/** 难度 */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** 学员角色 */
export type StudentRole = 'doctor' | 'nurse' | 'med_tech' | 'admin';

/** 学员层级 */
export type Level = 'junior' | 'middle' | 'senior';

/** 一门在线课程（平台目录项） */
export interface OnlineCourse {
  courseId: string;
  courseCode: string;
  title: string;
  category: CourseCategory;
  categoryName: string;
  mode: CourseMode;
  modeName: string;
  teacherName: string;
  targetRole: StudentRole | 'all';
  /** 课程总时长（秒） */
  durationSec: number;
  /** 完成课程 + 通过考试后自动认定的学分 */
  credit: number;
  /** 测验合格线（百分制） */
  passScore: number;
  description: string;
  /** 学习人数 */
  enrolled: number;
  /** 学员平均成绩 0~100 */
  avgScore: number;
}

/** 学员学习进度快照 */
export interface LearningProgress {
  studentId: string;
  /** 完成度 0~100 */
  progressPct: number;
  /** 累计学习时长（秒） */
  watchedSec: number;
  /** 最近一次测验成绩 0~100，未考为 null */
  lastScore: number | null;
  /** 学分是否已自动认定 */
  creditAwarded: boolean;
}

/** buildOnlineLearningPlatform 返回 */
export interface OnlineLearningPlatform {
  /** 全部分类（含课程数） */
  categories: Array<{ key: CourseCategory; name: string; count: number }>;
  /** 当前筛选后的课程目录（不传 category 则全量） */
  courses: OnlineCourse[];
  /** 当前筛选分类（未传 = all） */
  activeCategory: CourseCategory | 'all';
  /** 学员学习概览（演示视角：当前登录学员 S-1024） */
  overview: {
    studentId: string;
    /** 在修课程数 */
    enrolledCourses: number;
    /** 已完成课程数（完成度=100%） */
    completedCourses: number;
    /** 累计学习时长（小时） */
    totalHours: number;
    /** 已自动获得学分 */
    creditEarned: number;
    /** 平均测验成绩 0~100 */
    avgQuizScore: number;
  };
  /** 学分自动认定规则说明 */
  creditRule: string;
  demo: boolean;
  generatedAt: string;
}

/** 一道题（自动出题产物 / 阅卷输入） */
export interface QuizQuestion {
  qid: string;
  type: QuestionType;
  difficulty: Difficulty;
  stem: string;
  /** 选项（判断题为空；案例题为案例背景叙述，要点见 correctAnswer） */
  options: string[];
  /** 分值（百分制下该题权重分） */
  score: number;
  /** 解析 */
  analysis: string;
}

/** 阅卷结果 */
export interface AnswerEvaluation {
  qid: string;
  type: QuestionType;
  correct: boolean;
  /** 该题满分 */
  scoreMax: number;
  /** 实得分（案例分析为按要点命中比例折算） */
  scoreEarned: number;
  /** 教学反馈（答对/错在哪/案例命中要点） */
  feedback: string;
  /** 解析 */
  analysis: string;
}

/** 学习路径一个阶段 */
export interface LearningPathStep {
  step: number;
  stage: string;
  category: CourseCategory;
  title: string;
  courseCount: number;
  credit: number;
  /** 是否必修 */
  required: boolean;
  /** 选这条路径的理由 */
  reason: string;
}

/* --------------------------- 确定性随机数 --------------------------- */

/** FNV-1a 32 位哈希：把任意字符串（课程/正文/学员）映射为固定种子 */
function fnv1a(s: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 确定性伪随机数（mulberry32），保证出题/分布可复算、单测稳定 */
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

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round0(n: number): number {
  return Math.round(n);
}

/* --------------------------- 分类元数据 --------------------------- */

const CATEGORY_META: Record<CourseCategory, string> = {
  basic_med: '基础医学',
  clinical: '临床医学',
  nursing: '护理实践',
  med_tech: '医技检验',
  hospital_admin: '医院管理',
  ethics: '医德医风',
};

const MODE_META: Record<CourseMode, string> = {
  recorded: '录播',
  live: '直播',
  replay: '回放',
};

/* --------------------------- 演示课程台账 --------------------------- */
/* 与 deploy/postgres/init/341-teaching-online.sql 的 clinical.online_course 对齐 */

interface SeedCourse {
  code: string;
  title: string;
  category: CourseCategory;
  mode: CourseMode;
  teacher: string;
  role: StudentRole | 'all';
  durationMin: number;
  credit: number;
  desc: string;
}

/** 12 门演示课程，覆盖 6 大分类 × 3 种形态 */
const SEED_COURSES: SeedCourse[] = [
  { code: 'OL-BM-001', title: '系统解剖学·心血管系统精讲', category: 'basic_med', mode: 'recorded', teacher: '王教授', role: 'all', durationMin: 45, credit: 1.0, desc: '心脏传导系统与冠脉解剖三维动画拆解' },
  { code: 'OL-BM-002', title: '病理生理学·休克微循环', category: 'basic_med', mode: 'live', teacher: '李教授', role: 'doctor', durationMin: 60, credit: 1.5, desc: '休克三期微循环改变与代偿机制直播课' },
  { code: 'OL-CL-001', title: '胸痛中心分诊与心电图判读', category: 'clinical', mode: 'recorded', teacher: '陈主任', role: 'doctor', durationMin: 50, credit: 2.0, desc: 'STEMI/NSTEMI 鉴别与 D2B 时间窗管控' },
  { code: 'OL-CL-002', title: '2 型糖尿病规范化诊疗（2026 版）', category: 'clinical', mode: 'replay', teacher: '赵主任', role: 'doctor', durationMin: 40, credit: 1.5, desc: '降糖药路径 + 血糖监测目标值回放' },
  { code: 'OL-CL-003', title: '肺部影像鉴别诊断 Workshop', category: 'clinical', mode: 'live', teacher: '周主任', role: 'med_tech', durationMin: 90, credit: 2.0, desc: 'CT 征象实战带教直播（含答疑）' },
  { code: 'OL-NU-001', title: '静脉治疗护理实践指南 2026', category: 'nursing', mode: 'recorded', teacher: '孙护士长', role: 'nurse', durationMin: 55, credit: 1.5, desc: 'PICC 维护与导管相关血流感染防控' },
  { code: 'OL-NU-002', title: '危重患者早期预警评分(MEWS)', category: 'nursing', mode: 'replay', teacher: '钱护士长', role: 'nurse', durationMin: 35, credit: 1.0, desc: '评分触发分级响应与床旁交接回放' },
  { code: 'OL-MT-001', title: '全自动生化分析仪室内质控', category: 'med_tech', mode: 'recorded', teacher: '吴组长', role: 'med_tech', durationMin: 42, credit: 1.0, desc: 'Levey-Jennings 图与 1-3s/2-2s 规则' },
  { code: 'OL-MT-002', title: '危急值报告闭环管理', category: 'med_tech', mode: 'live', teacher: '郑组长', role: 'med_tech', durationMin: 30, credit: 1.0, desc: '复检→电话→记录→追踪全流程直播' },
  { code: 'OL-AD-001', title: 'DRG/DIP 支付方式改革下的科室运营', category: 'hospital_admin', mode: 'recorded', teacher: '刘院长', role: 'admin', durationMin: 50, credit: 2.0, desc: '病组结构与成本管控录播课' },
  { code: 'OL-AD-002', title: '电子病历五级评审条款解读', category: 'hospital_admin', mode: 'replay', teacher: '信息科', role: 'admin', durationMin: 65, credit: 1.5, desc: '应用体系与数据质量条款回放' },
  { code: 'OL-ET-001', title: '医德医风·患者隐私保护与告知', category: 'ethics', mode: 'recorded', teacher: '纪委办', role: 'all', durationMin: 25, credit: 0.5, desc: '《医师法》告知义务与隐私边界案例' },
];

/* --------------------------- 导出 1：在线学习平台 --------------------------- */

/**
 * buildOnlineLearningPlatform
 * @param category 可选分类；不传 = 全部分类
 * @returns 在线学习平台视图（分类导航 + 课程目录 + 学员学习概览 + 学分规则）
 */
export function buildOnlineLearningPlatform(
  category?: string,
): OnlineLearningPlatform {
  const active: CourseCategory | 'all' =
    category && category in CATEGORY_META
      ? (category as CourseCategory)
      : 'all';

  // 全量课程（演示台账确定性展开，不依赖随机）
  const all: OnlineCourse[] = SEED_COURSES.map((c, i) => {
    const seed = fnv1a(`online-course:${c.code}`);
    const rand = mulberry32(seed);
    return {
      courseId: `oc-${i + 1}`,
      courseCode: c.code,
      title: c.title,
      category: c.category,
      categoryName: CATEGORY_META[c.category],
      mode: c.mode,
      modeName: MODE_META[c.mode],
      teacherName: c.teacher,
      targetRole: c.role,
      durationSec: c.durationMin * 60,
      credit: c.credit,
      passScore: 60,
      description: c.desc,
      enrolled: round0(80 + rand() * 420),
      avgScore: round1(clamp(62 + rand() * 28, 60, 95)),
    };
  });

  const courses =
    active === 'all' ? all : all.filter((c) => c.category === active);

  // 分类导航：每类课程数
  const categories = (Object.keys(CATEGORY_META) as CourseCategory[]).map(
    (k) => ({
      key: k,
      name: CATEGORY_META[k],
      count: all.filter((c) => c.category === k).length,
    }),
  );

  // 当前学员 S-1024 的学习概览（确定性种子派生）
  const rand = mulberry32(fnv1a('overview:S-1024'));
  const enrolledCourses = clamp(round0(rand() * 6) + 3, 3, 9);
  const completedCourses = clamp(round0(enrolledCourses * (0.4 + rand() * 0.4)), 1, enrolledCourses);
  const totalHours = round1(20 + rand() * 60);
  const creditEarned = round1(completedCourses * 1.2 + rand() * 1.5);
  const avgQuizScore = round1(clamp(68 + rand() * 22, 60, 95));

  return {
    categories,
    courses,
    activeCategory: active,
    overview: {
      studentId: 'S-1024',
      enrolledCourses,
      completedCourses,
      totalHours,
      creditEarned,
      avgQuizScore,
    },
    creditRule:
      '学分自动认定规则：视频课程完成度达 100%（含直播签到/回放看完）' +
      '且在线测验成绩 ≥ 60 分，继教学分自动入账，免人工补录。',
    demo: true,
    generatedAt: new Date().toISOString(),
  };
}

/* --------------------------- 导出 2：自动出题 --------------------------- */

/** 从正文中抽取「关键词候选」：按句号切句，挑含医学术语特征的短句 */
function extractKeySentences(content: string, n: number): string[] {
  const sentences = content
    .split(/[。；！？!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 80);
  if (sentences.length === 0) return ['本课程核心概念需牢固掌握并应用于临床。'];
  const picked: string[] = [];
  const seed = fnv1a(`quiz-sentences:${content.length}:${sentences.length}`);
  const rand = mulberry32(seed);
  let guard = 0;
  while (picked.length < n && guard < n * 8) {
    const idx = Math.floor(rand() * sentences.length);
    const s = sentences[idx];
    if (!picked.includes(s)) picked.push(s);
    guard += 1;
  }
  while (picked.length < n) picked.push(sentences[picked.length % sentences.length]);
  return picked;
}

/** 从句子里挖一个「关键概念」：取前若干字符作为题干锚点 */
function anchorOf(sentence: string): string {
  // 取前 12~20 字作为概念锚点
  const m = sentence.match(/^[^，,。；：:]{4,24}/);
  return m ? m[0] : sentence.slice(0, 16);
}

/**
 * generateQuizFromContent
 * @param content    课程正文 / 讲稿摘要
 * @param difficulty 难度 easy / medium / hard
 * @returns 一套题（单选 + 多选 + 判断 + 案例分析），可复算
 */
export function generateQuizFromContent(
  content: string,
  difficulty: Difficulty = 'medium',
): QuizQuestion[] {
  const text = (content || '本课程围绕临床核心知识展开。').trim();
  const sentences = extractKeySentences(text, 4);
  const [s1, s2, s3, s4] = sentences;
  const a1 = anchorOf(s1);
  const a2 = anchorOf(s2);
  const a3 = anchorOf(s3);

  // 难度 → 每题分值（难度越高，案例题占比越大、干扰项越多）
  const scoreTable: Record<Difficulty, { single: number; multiple: number; judge: number; case: number }> = {
    easy: { single: 20, multiple: 20, judge: 20, case: 40 },
    medium: { single: 15, multiple: 25, judge: 10, case: 50 },
    hard: { single: 10, multiple: 20, judge: 10, case: 50 },
  };
  const sc = scoreTable[difficulty];

  const questions: QuizQuestion[] = [
    {
      qid: 'q-single-1',
      type: 'single',
      difficulty,
      stem: `关于「${a1}」，下列说法正确的是？`,
      options: [
        `指${a1}所描述的核心临床要点`,
        '与本课程内容无关的干扰项 A',
        '仅适用于教学场景、临床不适用',
        '可凭经验直接跳过',
      ],
      score: sc.single,
      analysis: s1,
    },
    {
      qid: 'q-multiple-1',
      type: 'multiple',
      difficulty,
      stem: `下列哪些属于「${a2}」的适用情形？（多选）`,
      options: [
        `符合「${a2}」描述的标准情形`,
        '课程正文明确提及的支持情形',
        '与正文无关的干扰情形',
        '正文强调需重点掌握的情形',
      ],
      score: sc.multiple,
      analysis: s2,
    },
    {
      qid: 'q-judge-1',
      type: 'judge',
      difficulty,
      stem: `判断：「${a3}」应在临床实践中按课程所述规范执行。`,
      options: [],
      score: sc.judge,
      analysis: s3,
    },
    {
      qid: 'q-case-1',
      type: 'case',
      difficulty,
      stem: `案例：一位患者的表现与课程所述「${a1}」高度相关，请结合课程要点简述你的处理思路。`,
      options: [],
      score: sc.case,
      analysis: s4,
    },
  ];

  // hard 难度追加一道进阶案例题
  if (difficulty === 'hard') {
    questions.push({
      qid: 'q-case-2',
      type: 'case',
      difficulty,
      stem: `进阶案例：当「${a1}」与「${a2}」同时出现时，如何权衡处理优先级？请结合课程依据阐述。`,
      options: [],
      score: 100 - sc.single - sc.multiple - sc.judge - sc.case,
      analysis: s4,
    });
  }

  return questions;
}

/* --------------------------- 导出 3：自动阅卷 --------------------------- */

/** 把答案归一化为字符串集合（多选/案例用） */
function toSet(v: unknown): Set<string> {
  if (Array.isArray(v)) return new Set(v.map((x) => String(x).trim()));
  if (typeof v === 'string') return new Set([v.trim()]);
  return new Set();
}

/** 数组相等（顺序无关） */
function setEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/**
 * evaluateStudentAnswer
 * @param question     题目（题型 / 题干 / 选项 / 满分 / 解析）
 * @param answer       学生答案：
 *                       single → number|string（选项索引或选项文本）
 *                       multiple → (number|string)[]（多选）
 *                       judge → boolean
 *                       case → string（开放作答文本）
 * @param correctAnswer 参考答案（与题目内嵌正确答案一致）：
 *                       single → 正确选项索引或文本
 *                       multiple → 正确选项索引/文本数组
 *                       judge → boolean
 *                       case → string[]（得分要点关键词数组）
 * @returns 对错 / 实得分 / 反馈 / 解析
 */
export function evaluateStudentAnswer(
  question: QuizQuestion,
  answer: unknown,
  correctAnswer: unknown,
): AnswerEvaluation {
  const { qid, type, score: scoreMax, analysis } = question;
  let correct = false;
  let scoreEarned = 0;
  let feedback = '';

  if (type === 'single') {
    correct = String(answer).trim() === String(correctAnswer).trim();
    scoreEarned = correct ? scoreMax : 0;
    feedback = correct
      ? '回答正确。'
      : `回答错误。正确答案为：${String(correctAnswer).trim()}`;
  } else if (type === 'multiple') {
    const ans = toSet(answer);
    const corr = toSet(correctAnswer);
    // 全对才给分；漏选不给部分分（多选倒扣分口径由教学计划定，这里从严）
    correct = setEqual(ans, corr);
    scoreEarned = correct ? scoreMax : 0;
    feedback = correct
      ? '多选全对。'
      : ans.size < corr.size
        ? `漏选。正确选项：${[...corr].join('、')}`
        : `有错选。正确选项：${[...corr].join('、')}`;
  } else if (type === 'judge') {
    const a = answer === true || answer === 'true' || answer === '对' || answer === '正确';
    const c =
      correctAnswer === true ||
      correctAnswer === 'true' ||
      correctAnswer === '对' ||
      correctAnswer === '正确';
    correct = a === c;
    scoreEarned = correct ? scoreMax : 0;
    feedback = correct ? '判断正确。' : `判断错误，正确结论为：${c ? '正确' : '错误'}`;
  } else {
    // case 案例分析：按得分要点命中比例给分
    const ansText = String(answer ?? '');
    const keyPoints = Array.isArray(correctAnswer)
      ? correctAnswer.map((x) => String(x))
      : [String(correctAnswer ?? '')];
    const hits = keyPoints.filter(
      (kp) => kp.length > 0 && ansText.includes(kp),
    );
    const ratio = keyPoints.length === 0 ? 0 : hits.length / keyPoints.length;
    scoreEarned = round1(scoreMax * ratio);
    correct = ratio >= 0.6;
    feedback =
      `要点命中 ${hits.length}/${keyPoints.length}：` +
      (hits.length > 0 ? `已答到「${hits.join('、')}」` : '未命中任何得分要点') +
      `；建议补充：${keyPoints.filter((kp) => !hits.includes(kp)).join('、') || '（已覆盖）'}`;
  }

  return { qid, type, correct, scoreMax, scoreEarned, feedback, analysis };
}

/* --------------------------- 导出 4：学习路径推荐 --------------------------- */

/** 角色 × 层级 → 学习路径阶段配置 */
interface PathSeed {
  stage: string;
  category: CourseCategory;
  title: string;
  credit: number;
  required: boolean;
  reason: string;
}

const PATH_TABLE: Record<StudentRole, Record<Level, PathSeed[]>> = {
  doctor: {
    junior: [
      { stage: '筑基', category: 'basic_med', title: '三基三严·基础医学回炉', credit: 4.0, required: true, reason: '住院医师第一年夯实解剖/病理/药理基础' },
      { stage: '临床精进', category: 'clinical', title: '常见病规范诊疗', credit: 6.0, required: true, reason: '覆盖门诊 80% 常见病种的诊疗路径' },
      { stage: '安全底线', category: 'ethics', title: '医疗安全与医德医风', credit: 1.0, required: true, reason: '知情同意/隐私保护/不良事件上报' },
      { stage: '继教提升', category: 'hospital_admin', title: '病历书写与DRG基础', credit: 2.0, required: false, reason: '为电子病历五级评审打基础' },
    ],
    middle: [
      { stage: '专科深化', category: 'clinical', title: '亚专科前沿进展', credit: 5.0, required: true, reason: '主治医师期凝练亚专科方向' },
      { stage: '技能带教', category: 'basic_med', title: '临床教学法', credit: 2.0, required: true, reason: '开始承担规培生带教任务' },
      { stage: '科研入门', category: 'med_tech', title: '临床研究与统计基础', credit: 3.0, required: false, reason: '为课题申报与论文写作打底' },
      { stage: '管理预备', category: 'hospital_admin', title: '科室运营与质量改进', credit: 2.0, required: false, reason: '储备科室管理后备干部能力' },
    ],
    senior: [
      { stage: '学科引领', category: 'clinical', title: '疑难危重症与多学科协作', credit: 4.0, required: true, reason: '副主任医师期提升 MDT 决策能力' },
      { stage: '人才培养', category: 'ethics', title: '团队带教与医德示范', credit: 1.5, required: true, reason: '言传身教，传承职业精神' },
      { stage: '学科规划', category: 'hospital_admin', title: '学科建设与人才梯队', credit: 3.0, required: true, reason: '参与科室/学科五年规划' },
      { stage: '继教标杆', category: 'basic_med', title: '国家级继教项目主讲能力', credit: 2.0, required: false, reason: '从学员成长为课程主讲人' },
    ],
  },
  nurse: {
    junior: [
      { stage: '筑基', category: 'nursing', title: '护理核心制度与基础操作', credit: 4.0, required: true, reason: '新护士三个月岗前规范化培训' },
      { stage: '安全底线', category: 'ethics', title: '护理伦理与患者沟通', credit: 1.0, required: true, reason: '保护患者权益、防范纠纷' },
      { stage: '临床精进', category: 'clinical', title: '常见疾病护理要点', credit: 4.0, required: true, reason: '内外科常规病种护理路径' },
      { stage: '急救入门', category: 'med_tech', title: '监护仪与抢救设备使用', credit: 2.0, required: false, reason: '床旁应急设备操作熟练度' },
    ],
    middle: [
      { stage: '专科护理', category: 'nursing', title: '静疗/伤口/糖尿病专科', credit: 5.0, required: true, reason: '护师期选定专科护士方向' },
      { stage: '质量改进', category: 'hospital_admin', title: '护理 PDCA 与品管圈', credit: 2.0, required: true, reason: '从执行者转向质量改进参与者' },
      { stage: '带教能力', category: 'clinical', title: '护理教学查房设计', credit: 2.0, required: false, reason: '承担实习护士带教' },
      { stage: '应急进阶', category: 'ethics', title: '危重患者早期预警与上报', credit: 1.5, required: true, reason: 'MEWS 评分触发分级响应' },
    ],
    senior: [
      { stage: '护理管理', category: 'hospital_admin', title: '护士长管理能力提升', credit: 3.0, required: true, reason: '病区人财物与排班绩效' },
      { stage: '专科引领', category: 'nursing', title: '护理专科门诊与会诊', credit: 3.0, required: true, reason: '主任护师期输出专科价值' },
      { stage: '人才梯队', category: 'ethics', title: '护理团队职业精神传承', credit: 1.0, required: true, reason: '传帮带与护士职业素养' },
      { stage: '护理科研', category: 'med_tech', title: '护理循证与量表应用', credit: 2.0, required: false, reason: '护理课题与论文写作' },
    ],
  },
  med_tech: {
    junior: [
      { stage: '筑基', category: 'med_tech', title: '检验检查仪器操作规范', credit: 3.0, required: true, reason: '技士期熟练掌握本科室设备' },
      { stage: '质量控制', category: 'basic_med', title: '室内质控与室间质评', credit: 2.0, required: true, reason: 'Levey-Jennings 图与失控处理' },
      { stage: '安全底线', category: 'ethics', title: '危急值闭环与生物安全', credit: 1.0, required: true, reason: '复检→电话→记录→追踪' },
      { stage: '临床协同', category: 'clinical', title: '常见疾病检验路径', credit: 2.0, required: false, reason: '理解临床医生开单意图' },
    ],
    middle: [
      { stage: '专科精进', category: 'med_tech', title: '分子诊断/影像进阶', credit: 4.0, required: true, reason: '技师期掌握高难度检测技术' },
      { stage: '报告解读', category: 'clinical', title: '检验结果临床解读', credit: 3.0, required: true, reason: '从出报告走向解读建议' },
      { stage: '设备管理', category: 'hospital_admin', title: '设备维护与性能验证', credit: 2.0, required: false, reason: '牵头设备校准与性能验证' },
      { stage: '质量体系', category: 'ethics', title: 'ISO15189 实验室认可', credit: 2.0, required: false, reason: '质量体系文件编写' },
    ],
    senior: [
      { stage: '学科引领', category: 'med_tech', title: '新技术新项目开展', credit: 3.0, required: true, reason: '主管技师期带领技术攻关' },
      { stage: '报告审核', category: 'clinical', title: '疑难报告复核与会诊', credit: 2.0, required: true, reason: '把关报告质量与临床建议' },
      { stage: '团队带教', category: 'basic_med', title: '医技人员教学与考核', credit: 1.5, required: true, reason: '技师团队人才培养' },
      { stage: '运营优化', category: 'hospital_admin', title: '检查检验流程精益', credit: 2.0, required: false, reason: '缩短 TAT、提升报告时效' },
    ],
  },
  admin: {
    junior: [
      { stage: '筑基', category: 'hospital_admin', title: '医院组织架构与规章制度', credit: 2.0, required: true, reason: '行政新人熟悉医院治理框架' },
      { stage: '临床认知', category: 'clinical', title: '门急诊与住院流程概览', credit: 2.0, required: true, reason: '管理要懂临床，不能拍脑袋' },
      { stage: '合规底线', category: 'ethics', title: '行风建设与保密管理', credit: 1.0, required: true, reason: '行政岗位廉洁与保密红线' },
      { stage: '信息工具', category: 'basic_med', title: '电子病历与数据分析入门', credit: 1.5, required: false, reason: '用数据辅助日常管理' },
    ],
    middle: [
      { stage: '管理精进', category: 'hospital_admin', title: 'DRG/DIP 与预算绩效', credit: 4.0, required: true, reason: '科室运营主管核心能力' },
      { stage: '质量安全', category: 'clinical', title: '医疗质量与患者安全目标', credit: 3.0, required: true, reason: '等级评审核心条款落地' },
      { stage: '项目管理', category: 'basic_med', title: '医院项目管理方法论', credit: 2.0, required: false, reason: '基建/信息/学科项目推进' },
      { stage: '沟通协调', category: 'ethics', title: '医患沟通与舆情应对', credit: 1.5, required: true, reason: '投诉处理与媒体沟通' },
    ],
    senior: [
      { stage: '战略规划', category: 'hospital_admin', title: '医院战略与学科规划', credit: 4.0, required: true, reason: '院办/职能主任参与五年规划' },
      { stage: '运营优化', category: 'clinical', title: 'DRG 病种结构与成本管控', credit: 3.0, required: true, reason: '运营数据驱动决策' },
      { stage: '团队领导', category: 'ethics', title: '干部领导力与作风建设', credit: 1.5, required: true, reason: '中层干部管理与廉洁自律' },
      { stage: '行业视野', category: 'basic_med', title: '智慧医院与 AI 医疗趋势', credit: 2.0, required: false, reason: '跟踪 AI 原生医院与数字孪生' },
    ],
  },
};

/**
 * buildLearningPath
 * @param role  学员角色 doctor/nurse/med_tech/admin
 * @param level 学员层级 junior/middle/senior
 * @returns 分阶段学习路径（每阶段给课程数与学分目标）
 */
export function buildLearningPath(
  role: StudentRole,
  level: Level,
): LearningPathStep[] {
  const safeRole: StudentRole = PATH_TABLE[role] ? role : 'doctor';
  const safeLevel: Level = PATH_TABLE[safeRole][level] ? level : 'junior';
  const seeds = PATH_TABLE[safeRole][safeLevel];

  return seeds.map((s, i) => {
    // 每阶段课程数由分类目录确定性派生（与 buildOnlineLearningPlatform 台账一致）
    const courseCount = SEED_COURSES.filter((c) => c.category === s.category).length;
    return {
      step: i + 1,
      stage: s.stage,
      category: s.category,
      title: s.title,
      courseCount,
      credit: s.credit,
      required: s.required,
      reason: s.reason,
    };
  });
}

/* --------------------- 服务端内部：课程演示题库 + 答案 --------------------- */

/**
 * buildCourseQuizWithAnswers
 * 【服务端内部使用】按课程从演示台账取出正文摘要，自动出题并返回答案 key。
 * 前端只拿到题干与选项，正确答案永不下发；阅卷时由服务端用本函数重建答案，
 * 杜绝前端自报分数。
 */
export interface CourseQuizBundle {
  courseId: string;
  courseTitle: string;
  questions: QuizQuestion[];
  /** qid → 参考答案（single: 选项文本；multiple: 选项文本数组；judge: boolean；case: 要点数组） */
  answerKey: Record<string, unknown>;
  passScore: number;
  credit: number;
}

export function buildCourseQuizWithAnswers(courseId: string): CourseQuizBundle | null {
  const idx = SEED_COURSES.findIndex((_, i) => `oc-${i + 1}` === courseId);
  const seed = idx >= 0 ? SEED_COURSES[idx] : undefined;
  if (!seed) return null;

  // 用课程标题 + 描述作为「正文」自动出题
  const content = `${seed.title}。${seed.desc}。`;
  const questions = generateQuizFromContent(content, 'medium');

  // 答案 key 与出题模板对齐：
  //   single   → options[0]（首项为正确临床要点）
  //   multiple → options[0] 与 options[3]
  //   judge    → true
  //   case     → 用题干锚点句拆出的得分要点
  const answerKey: Record<string, unknown> = {};
  for (const q of questions) {
    if (q.type === 'single') answerKey[q.qid] = q.options[0];
    else if (q.type === 'multiple') answerKey[q.qid] = [q.options[0], q.options[3]];
    else if (q.type === 'judge') answerKey[q.qid] = true;
    else answerKey[q.qid] = q.analysis.split(/[，。；]/).filter((x) => x.length >= 4).slice(0, 4);
  }

  return {
    courseId,
    courseTitle: seed.title,
    questions,
    answerKey,
    passScore: 60,
    credit: seed.credit,
  };
}
