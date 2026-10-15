/**
 * 健澜科技 jlmedaios - 智能导诊助手 BFF 路由（M122-A）
 *
 * POST /api/v1/patient/guide
 *   入参：{ symptoms: string; history?: PatientHistory; doctorPool?: DoctorProfile[] }
 *   出参：{ topDepts, recommendedDoctors, prepAdvice, urgency }
 *
 * 依据宪法第七章 7.7（患者 MUSE）：
 *   - 导诊结果为「就医建议」，不构成诊断；
 *   - 对红旗症状强制提示急诊/120；
 *   - 仅登录鉴权，不触碰 WebSocket，不新增权限码。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import buildPatientGuide, {
  type DoctorProfile,
  type PatientHistory,
} from '../aggregators/patientGuideAggregator';

interface GuideRequestBody {
  symptoms?: unknown;
  history?: PatientHistory;
  doctorPool?: DoctorProfile[];
}

export const patientGuideRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/patient/guide',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);

      let body: GuideRequestBody;
      try {
        body = c.rawBody ? (JSON.parse(c.rawBody) as GuideRequestBody) : {};
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
      }

      const symptoms = typeof body.symptoms === 'string' ? body.symptoms.trim() : '';
      if (!symptoms) {
        return json(fail(ErrorCode.BAD_REQUEST, '请描述您的症状（symptoms 不能为空）'), 400);
      }
      if (symptoms.length < 2) {
        return json(fail(ErrorCode.BAD_REQUEST, '症状描述过短，请补充具体不适'), 400);
      }

      const history: PatientHistory = body.history ?? {};
      const doctorPool: DoctorProfile[] = Array.isArray(body.doctorPool) ? body.doctorPool : [];

      try {
        // 依据宪法：纯函数聚合，无副作用、无 DB 调用
        const view = buildPatientGuide(symptoms, history, doctorPool);
        return json(ok(view));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '智能导诊生成失败'),
          500,
        );
      }
    },
  },
];

export default patientGuideRoutes;
