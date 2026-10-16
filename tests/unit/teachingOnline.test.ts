/**
 * 健澜科技 jlmedaios - M171-B 在线学习与考核聚合器纯函数单测。
 *
 * 不依赖数据库：仅测 buildOnlineLearningPlatform / generateQuizFromContent /
 * evaluateStudentAnswer / buildLearningPath。重点验证「在线学习要好用，不能只是
 * 视频列表」：
 *   - 平台目录覆盖录播/直播/回放三形态与六大分类；
 *   - 自动出题覆盖单选/多选/判断/案例分析，难度越高案例分占比越大；
 *   - 自动阅卷：单选全等、多选集合全等、判断布尔全等、案例按要点命中给分；
 *   - 学习路径按角色×层级分阶段给出必修/选修与学分目标；
 *   - 同参两次结果完全一致（确定性、可复算、可申诉）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildOnlineLearningPlatform,
  generateQuizFromContent,
  evaluateStudentAnswer,
  buildLearningPath,
  buildCourseQuizWithAnswers,
  type QuizQuestion,
} from '@/bff/aggregators/teachingOnlineAggregator';

describe('buildOnlineLearningPlatform', () => {
  it('返回全量平台：六大分类 + 课程目录 + 学员概览 + 学分规则', () => {
    const p = buildOnlineLearningPlatform();
    expect(p.categories).toHaveLength(6);
    expect(p.courses.length).toBeGreaterThanOrEqual(10);
    expect(p.overview.enrolledCourses).toBeGreaterThan(0);
    expect(p.overview.creditEarned).toBeGreaterThanOrEqual(0);
    expect(p.creditRule).toContain('100%');
    expect(p.demo).toBe(true);
  });

  it('课程覆盖三种形态：录播 / 直播 / 回放', () => {
    const p = buildOnlineLearningPlatform();
    const modes = new Set(p.courses.map((c) => c.mode));
    expect(modes.has('recorded')).toBe(true);
    expect(modes.has('live')).toBe(true);
    expect(modes.has('replay')).toBe(true);
  });

  it('按分类筛选：只返回该分类课程，activeCategory 一致', () => {
    const p = buildOnlineLearningPlatform('clinical');
    expect(p.activeCategory).toBe('clinical');
    expect(p.courses.length).toBeGreaterThan(0);
    for (const c of p.courses) expect(c.category).toBe('clinical');
  });

  it('未知分类回退全量目录', () => {
    const p = buildOnlineLearningPlatform('not-exist');
    expect(p.activeCategory).toBe('all');
    expect(p.courses.length).toBeGreaterThanOrEqual(10);
  });

  it('确定性：同分类两次结果课程目录完全一致', () => {
    const a = buildOnlineLearningPlatform('nursing');
    const b = buildOnlineLearningPlatform('nursing');
    expect(a.courses).toEqual(b.courses);
    expect(a.overview).toEqual(b.overview);
  });
});

describe('generateQuizFromContent', () => {
  const content =
    '胸痛中心要求首次医疗接触后 10 分钟内完成 12 导联心电图。' +
    'STEMI 患者应在 90 分钟内完成再灌注治疗。' +
    '肌钙蛋白是诊断心肌损伤的核心标志物。' +
    '抗血小板治疗需根据出血与缺血风险权衡。';

  it('产出四种题型：单选 / 多选 / 判断 / 案例分析', () => {
    const qs = generateQuizFromContent(content, 'medium');
    const types = new Set(qs.map((q) => q.type));
    expect(types.has('single')).toBe(true);
    expect(types.has('multiple')).toBe(true);
    expect(types.has('judge')).toBe(true);
    expect(types.has('case')).toBe(true);
  });

  it('难度越高，案例题分值占比越大', () => {
    const easy = generateQuizFromContent(content, 'easy');
    const hard = generateQuizFromContent(content, 'hard');
    const easyCase = easy.filter((q) => q.type === 'case').reduce((s, q) => s + q.score, 0);
    const hardCase = hard.filter((q) => q.type === 'case').reduce((s, q) => s + q.score, 0);
    expect(hardCase).toBeGreaterThan(easyCase);
  });

  it('hard 难度追加一道进阶案例题', () => {
    const hard = generateQuizFromContent(content, 'hard');
    expect(hard.length).toBe(5);
    expect(hard[hard.length - 1].type).toBe('case');
  });

  it('总分 = 100；题干与解析非空', () => {
    for (const d of ['easy', 'medium', 'hard'] as const) {
      const qs = generateQuizFromContent(content, d);
      const total = qs.reduce((s, q) => s + q.score, 0);
      expect(total).toBe(100);
      for (const q of qs) {
        expect(q.stem.length).toBeGreaterThan(0);
        expect(q.analysis.length).toBeGreaterThan(0);
      }
    }
  });

  it('空正文兜底不抛错', () => {
    const qs = generateQuizFromContent('', 'easy');
    expect(qs.length).toBeGreaterThan(0);
  });

  it('确定性：同正文同难度两次题目完全一致', () => {
    const a = generateQuizFromContent(content, 'medium');
    const b = generateQuizFromContent(content, 'medium');
    expect(a).toEqual(b);
  });
});

describe('evaluateStudentAnswer', () => {
  const singleQ: QuizQuestion = {
    qid: 'q1', type: 'single', difficulty: 'easy',
    stem: '下列哪项是？', options: ['正确项', '干扰项A', '干扰项B', '干扰项C'],
    score: 15, analysis: '正确项为标准答案',
  };
  const multiQ: QuizQuestion = {
    qid: 'q2', type: 'multiple', difficulty: 'medium',
    stem: '哪些适用？（多选）', options: ['正确A', '干扰B', '干扰C', '正确D'],
    score: 20, analysis: '正确A、D',
  };
  const judgeQ: QuizQuestion = {
    qid: 'q3', type: 'judge', difficulty: 'easy',
    stem: '判断：规范应执行。', options: [], score: 10, analysis: '应执行',
  };
  const caseQ: QuizQuestion = {
    qid: 'q4', type: 'case', difficulty: 'hard',
    stem: '案例：简述处理思路', options: [], score: 40, analysis: '要点一/要点二/要点三',
  };

  it('单选：答对给满分，答错 0 分', () => {
    const ok = evaluateStudentAnswer(singleQ, '正确项', '正确项');
    expect(ok.correct).toBe(true);
    expect(ok.scoreEarned).toBe(15);
    const bad = evaluateStudentAnswer(singleQ, '干扰项A', '正确项');
    expect(bad.correct).toBe(false);
    expect(bad.scoreEarned).toBe(0);
  });

  it('多选：集合全等才给分，漏选/错选均 0 分', () => {
    const full = evaluateStudentAnswer(multiQ, ['正确A', '正确D'], ['正确A', '正确D']);
    expect(full.correct).toBe(true);
    expect(full.scoreEarned).toBe(20);
    const miss = evaluateStudentAnswer(multiQ, ['正确A'], ['正确A', '正确D']);
    expect(miss.correct).toBe(false);
    expect(miss.scoreEarned).toBe(0);
    const wrong = evaluateStudentAnswer(multiQ, ['正确A', '干扰B'], ['正确A', '正确D']);
    expect(wrong.correct).toBe(false);
  });

  it('判断：布尔全等即正确，支持中文「对/正确」', () => {
    expect(evaluateStudentAnswer(judgeQ, true, true).correct).toBe(true);
    expect(evaluateStudentAnswer(judgeQ, '对', true).correct).toBe(true);
    expect(evaluateStudentAnswer(judgeQ, false, true).correct).toBe(false);
  });

  it('案例分析：按要点命中比例给分，≥60% 判正确', () => {
    const keyPoints = ['心电图', '肌钙蛋白', '再灌注'];
    const r = evaluateStudentAnswer(caseQ, '应尽快做心电图并查肌钙蛋白', keyPoints);
    expect(r.scoreEarned).toBeGreaterThan(0);
    // 命中 2/3 ≈ 66.7%
    expect(r.scoreEarned).toBeCloseTo(40 * (2 / 3), 1);
    expect(r.correct).toBe(true);

    const none = evaluateStudentAnswer(caseQ, '随便说两句无关的', keyPoints);
    expect(none.scoreEarned).toBe(0);
    expect(none.correct).toBe(false);
  });
});

describe('buildLearningPath', () => {
  it('按角色×层级返回 4 个阶段，必修在前、选修在后合理', () => {
    const p = buildLearningPath('doctor', 'junior');
    expect(p).toHaveLength(4);
    expect(p[0].step).toBe(1);
    expect(p[0].required).toBe(true);
    const totalCredit = p.reduce((s, x) => s + x.credit, 0);
    expect(totalCredit).toBeGreaterThan(0);
    for (const s of p) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.reason.length).toBeGreaterThan(0);
    }
  });

  it('角色/层级越高级，路径阶段标题随之进阶', () => {
    const junior = buildLearningPath('nurse', 'junior');
    const senior = buildLearningPath('nurse', 'senior');
    expect(junior[0].title).not.toBe(senior[0].title);
  });

  it('未知角色回退 doctor，未知层级回退 junior，不抛错', () => {
    // @ts-expect-error 故意传非法入参
    const p = buildLearningPath('unknown-role', 'unknown-level');
    expect(p.length).toBeGreaterThan(0);
  });

  it('确定性：同角色同层级两次路径完全一致', () => {
    const a = buildLearningPath('admin', 'middle');
    const b = buildLearningPath('admin', 'middle');
    expect(a).toEqual(b);
  });
});

describe('buildCourseQuizWithAnswers（服务端阅卷闭环）', () => {
  it('按 courseId 重建题库与答案 key，正确答案不下发到前端', () => {
    const bundle = buildCourseQuizWithAnswers('oc-3'); // 胸痛中心课程
    expect(bundle).not.toBeNull();
    expect(bundle!.questions.length).toBeGreaterThan(0);
    expect(Object.keys(bundle!.answerKey).length).toBe(bundle!.questions.length);
    for (const q of bundle!.questions) {
      // 题目本身不携带 answer 字段
      expect((q as unknown as Record<string, unknown>).answer).toBeUndefined();
    }
  });

  it('未知 courseId 返回 null', () => {
    expect(buildCourseQuizWithAnswers('oc-999')).toBeNull();
  });

  it('整卷：用答案 key 自答必通过且学分入账', () => {
    const bundle = buildCourseQuizWithAnswers('oc-1')!;
    const evals = bundle.questions.map((q) =>
      evaluateStudentAnswer(q, bundle.answerKey[q.qid], bundle.answerKey[q.qid]),
    );
    const totalMax = evals.reduce((s, e) => s + e.scoreMax, 0);
    const totalEarned = evals.reduce((s, e) => s + e.scoreEarned, 0);
    const pct = Math.round((totalEarned / totalMax) * 1000) / 10;
    expect(pct).toBeGreaterThanOrEqual(bundle.passScore);
  });
});
