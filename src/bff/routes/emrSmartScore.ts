/**
 * 健澜科技 jlmedaios — 电子病历智能化评分 BFF 路由（M154-B）
 *
 * POST /api/v1/emr/score
 *   body: { recordContent: string, recordId?: string }
 *   返回：六维得分（满分100）+ 等级 + 缺陷清单 + 整改建议。
 *
 * 【AI深化与运营预测】纯函数规则引擎，不调外部 LLM、不落敏感明文；
 *   公平评分：重诊断逻辑/用药匹配/检查适宜等实质内容，不抠格式。
 * 医疗安全红线：评分为质控辅助，不替代主治医师与质控医师最终判定。
 * 仅要求登录态。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { scoreMedicalRecord } from '../aggregators/emrSmartScoreAggregator';

interface EmrScoreBody {
  recordContent?: string;
  recordId?: string;
}

/**
 * POST /api/v1/emr/score
 * 对单份病历做智能化六维评分。
 */
export const emrSmartScoreRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/emr/score',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = (await c.body<EmrScoreBody>().catch(() => ({} as EmrScoreBody))) ?? {};
        const recordContent = typeof body.recordContent === 'string' ? body.recordContent : '';
        if (!recordContent.trim()) {
          return json(fail(ErrorCode.BAD_REQUEST, 'recordContent 不能为空'), 400);
        }

        // 纯函数计算：scoreMedicalRecord 内部已聚合 detectRecordDefects + generateScoreSuggestions
        const result = scoreMedicalRecord(recordContent);

        return json(
          ok({
            recordId: body.recordId ?? null,
            ...result,
          }),
        );
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '病历评分失败'),
          500,
        );
      }
    },
  },
];
