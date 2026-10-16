/**
 * 健澜科技 jlmedaios - M162-B 教学与培训深化路由
 *
 * 【医院全场景】在线课程（录播+直播）/ OSCE 客观结构化技能考核 /
 *   规培轮转+出科考核 / 继教学分自动记录。
 *
 *   GET  /api/v1/teaching/courses?dept=internal[&year=2026]
 *     - 按科室返回年度教学计划：在线课程清单 + 规培轮转计划 + 学分汇总；
 *       数据由 buildTeachingPlan 纯函数确定性派生（演示数据）。
 *
 *   POST /api/v1/teaching/exam
 *     body: { studentId: string, courseId: string }
 *     - 对单个学生执行 OSCE 客观结构化考核打分：五考站加权 + 单站 <60 不通过 +
 *       合格自动登记继教学分 + 公平性提示（疑似走过场/贴线抽查/短板考站）。
 *
 * 鉴权与安全：
 *   - 仅 admin / 教学管理角色可读可评（requireRole 内部已处理 401/403）；
 *   - 纯函数计算，无写库副作用、不碰 WebSocket、不新增依赖；
 *   - 学生仅返回脱敏标识（S-xxxx），不含 PII。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import {
  buildTeachingPlan,
  evaluateStudentPerformance,
} from '../aggregators/teachingDeepAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/**
 * GET /api/v1/teaching/courses
 * @query dept  科室编码（internal/surgery/...，未知回退 internal）
 * @query year  年度（可选，默认当前年）
 */
async function handleCourses(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const dept = c.query.get('dept') || 'internal';
  const yearRaw = c.query.get('year');
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : undefined;

  const plan = buildTeachingPlan(dept, year);
  return json(
    ok({
      ...plan,
      notice: '教学计划由纯函数确定性派生（演示数据）；OSCE 考核公平可追溯，不走过场。',
    }),
  );
}

interface ExamBody {
  studentId?: string;
  courseId?: string;
}

/**
 * POST /api/v1/teaching/exam
 * body: { studentId, courseId }
 */
async function handleExam(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const body = (await c.body<ExamBody>().catch(() => ({} as ExamBody))) ?? {};
    if (!body.studentId || !body.courseId) {
      return json(
        fail(ErrorCode.BAD_REQUEST, 'studentId 与 courseId 均为必填', c.traceId),
        400,
      );
    }

    const result = evaluateStudentPerformance(body.studentId, body.courseId);
    return json(ok(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : '教学考核评估失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const teachingDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/teaching/courses',
    auth: true,
    handle: handleCourses,
  },
  {
    method: 'POST',
    path: '/api/v1/teaching/exam',
    auth: true,
    handle: handleExam,
  },
];
