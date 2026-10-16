/**
 * 健澜科技 jlmedaios - M171-B 医院教学智能化深化——在线学习与考核路由
 *
 * 【科研教学后勤】在线学习要好用，不能只是视频列表：
 *
 *   GET  /api/v1/teaching/courses?category=clinical
 *     - 在线学习平台视图：分类导航 + 视频课程目录（录播/直播/回放）+
 *       学员学习概览（完成度/时长/成绩）+ 学分自动认定规则；
 *       数据由 buildOnlineLearningPlatform 纯函数确定性派生（演示数据）。
 *     - 向后兼容：若带 ?dept= 参数（M162-B 教学计划口径），仍返回科室年度教学计划。
 *
 *   POST /api/v1/teaching/quiz/submit
 *     body: { courseId: string, studentId: string,
 *             submissions: Array<{ qid: string, answer: unknown }> }
 *     - 服务端按 courseId 重建题库与答案 key（正确答案永不下发），逐题自动阅卷：
 *       单选全等 / 多选集合全等 / 判断布尔全等 / 案例分析按要点命中给分；
 *     - 总分 ≥ pass_score 且课程完成度视为 100% → 学分自动认定（creditAwarded=true）。
 *
 * 鉴权与安全：
 *   - 仅 admin / 教学管理角色可读可考（requireRole 内部已处理 401/403）；
 *   - 纯函数计算，无写库副作用、不碰 WebSocket、不新增依赖；
 *   - 学生仅返回脱敏标识（S-xxxx），不含 PII；分数由服务端判定，不采信前端自报。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import {
  buildOnlineLearningPlatform,
  buildCourseQuizWithAnswers,
  evaluateStudentAnswer,
} from '../aggregators/teachingOnlineAggregator.js';
import { buildTeachingPlan } from '../aggregators/teachingDeepAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/**
 * GET /api/v1/teaching/courses
 * @query category 在线学习分类（clinical/nursing/...），不传 = 全部
 * @query dept     （兼容 M162-B）科室编码，传了则返回科室年度教学计划
 */
async function handleCourses(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  // 兼容 M162-B：带 dept 参数仍走教学计划视图
  const dept = c.query.get('dept');
  if (dept) {
    const yearRaw = c.query.get('year');
    const year = yearRaw ? Number.parseInt(yearRaw, 10) : undefined;
    const plan = buildTeachingPlan(dept, year);
    return json(
      ok({
        ...plan,
        view: 'teaching-plan',
        notice:
          '教学计划由纯函数确定性派生（演示数据）；OSCE 考核公平可追溯，不走过场。',
      }),
    );
  }

  // M171-B：在线学习平台视图
  const category = c.query.get('category') || undefined;
  const platform = buildOnlineLearningPlatform(category);
  return json(
    ok({
      ...platform,
      view: 'online-learning',
      notice:
        '在线学习平台演示数据（纯函数派生）；完成课程 100% + 测验 ≥60 分 = 学分自动认定。',
    }),
  );
}

interface QuizSubmissionItem {
  qid?: string;
  answer?: unknown;
}
interface QuizSubmitBody {
  courseId?: string;
  studentId?: string;
  submissions?: QuizSubmissionItem[];
}

/**
 * POST /api/v1/teaching/quiz/submit
 */
async function handleQuizSubmit(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const body =
      (await c.body<QuizSubmitBody>().catch(() => ({} as QuizSubmitBody))) ?? {};
    if (!body.courseId || !body.studentId) {
      return json(
        fail(ErrorCode.BAD_REQUEST, 'courseId 与 studentId 均为必填', c.traceId),
        400,
      );
    }
    if (!Array.isArray(body.submissions) || body.submissions.length === 0) {
      return json(
        fail(ErrorCode.BAD_REQUEST, 'submissions 不能为空', c.traceId),
        400,
      );
    }

    // 服务端按 courseId 重建题库与答案 key（正确答案不下发）
    const bundle = buildCourseQuizWithAnswers(body.courseId);
    if (!bundle) {
      return json(
        fail(ErrorCode.NOT_FOUND, `课程不存在：${body.courseId}`, c.traceId),
        404,
      );
    }

    // 逐题自动阅卷
    const evaluations = bundle.questions.map((q) => {
      const sub = body.submissions!.find((x) => x.qid === q.qid);
      const correctAnswer = bundle.answerKey[q.qid];
      return evaluateStudentAnswer(q, sub?.answer, correctAnswer);
    });

    const totalMax = evaluations.reduce((s, e) => s + e.scoreMax, 0);
    const totalEarned = evaluations.reduce((s, e) => s + e.scoreEarned, 0);
    const scorePct = totalMax === 0 ? 0 : Math.round((totalEarned / totalMax) * 1000) / 10;
    const passed = scorePct >= bundle.passScore;

    // 学分自动认定：通过即入账（演示口径：完成度视为 100%）
    const creditAwarded = passed && bundle.credit > 0;

    return json(
      ok({
        courseId: body.courseId,
        courseTitle: bundle.courseTitle,
        studentId: body.studentId,
        evaluations,
        scoreMax: totalMax,
        scoreEarned: Math.round(totalEarned * 10) / 10,
        scorePct,
        passScore: bundle.passScore,
        passed,
        credit: bundle.credit,
        creditAwarded,
        notice:
          '阅卷由服务端纯函数确定性完成；通过即自动登记继教学分，免人工补录。',
        demo: true,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '在线测验阅卷失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const teachingOnlineRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/teaching/courses',
    auth: true,
    handle: handleCourses,
  },
  {
    method: 'POST',
    path: '/api/v1/teaching/quiz/submit',
    auth: true,
    handle: handleQuizSubmit,
  },
];
