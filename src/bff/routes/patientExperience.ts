/**
 * 健澜科技 jlmedaios - 【患者服务与体验深化】患者体验路由（M180-C · 质量与体验）
 *
 * 集群与科学：
 *   GET /api/v1/patient/experience
 *       → 深度患者体验目录（四大维度 × 子项 × 目标值）；
 *   GET /api/v1/patient/experience?patientId=xxx&journey=...
 *       → 度量一次就诊旅程的体验得分、指出瓶颈维度；
 *   GET /api/v1/patient/experience?feedback=候诊两小时
 *       → 识别痛点代码并给出可执行改进措施。
 *
 * 鉴权：未登录 401。生产安全：出参 patientId 已脱敏（P0****23），
 *   不暴露患者级 PII；入参非法一律 400 结构化错误，不抛 500。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildDeepPatientExperience,
  generateExperienceImprovement,
  identifyExperiencePainPoint,
  measurePatientExperience,
  type PatientJourney,
} from '../aggregators/patientExperienceAggregator';

export const patientExperienceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/experience',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        // 1) 基础：返回深度体验目录（四大维度 × 子项 × 目标值）
        const catalog = buildDeepPatientExperience();

        const patientId = c.query.get('patientId') ?? '';
        const feedback = c.query.get('feedback') ?? '';

        let measurement: ReturnType<typeof measurePatientExperience> | null = null;
        let painPoint: ReturnType<typeof identifyExperiencePainPoint> | null = null;
        let improvement: ReturnType<typeof generateExperienceImprovement> | null = null;

        // 2) 可选：传入 patientId 与 journey JSON 时，度量本次就诊体验
        const journeyRaw = c.query.get('journey') ?? '';
        if (patientId && journeyRaw) {
          let journey: PatientJourney = {};
          try {
            journey = JSON.parse(journeyRaw) as PatientJourney;
          } catch {
            return json(fail(ErrorCode.BAD_REQUEST, 'journey 参数必须是合法 JSON', c.traceId), 400);
          }
          measurement = measurePatientExperience(patientId, journey);
        } else if (patientId) {
          return json(fail(ErrorCode.BAD_REQUEST, '传入 patientId 时必须同时提供 journey（JSON）', c.traceId), 400);
        }

        // 3) 可选：传入患者反馈文本时，识别痛点并生成改进措施
        if (feedback) {
          painPoint = identifyExperiencePainPoint(feedback);
          improvement = generateExperienceImprovement(painPoint.code);
        }

        return json(
          ok(
            { catalog, measurement, painPoint, improvement },
            '患者体验数据已加载',
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : '患者体验数据加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
