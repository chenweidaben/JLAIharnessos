/**
 * 健澜科技数智医院智能体（jlmedaios）- 演示模式状态路由（M125-C）
 *
 * 【演示就绪】
 *  GET /api/v1/demo/status
 *   - 免鉴权（供前端首屏拉取，决定是否展示「演示模式」提示条与全屏水印）；
 *   - 返回 { demoMode, bannerText, watermarkText, masked, company }：
 *       demoMode     - 当前是否演示模式（DEMO_MODE=1）
 *       bannerText   - 右上角提示条文案（生产模式为空串）
 *       watermarkText- 全屏斜向水印文案（生产模式为空串）
 *       masked       - 演示模式下患者/医生/配置数据是否已自动脱敏
 *       company      - 版权归属公司名
 *
 * 本路由只读运行时状态，不查库、不产生副作用，不泄露任何密钥或患者数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, ok, type Ctx, type RouteDef } from '../types';
import { getEnv } from '../config/env';
import { getDemoViewConfig, isDemoMode } from '../aggregators/demoModeAggregator';

export const demoStatusRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/demo/status',
    auth: false,
    handle(c: Ctx): Response {
      const cfg = getEnv();
      const demo = isDemoMode(cfg);
      const view = getDemoViewConfig(demo);
      return json(
        ok(
          {
            /** 当前是否演示模式 */
            demoMode: demo,
            /** 右上角提示条文案 */
            bannerText: view.bannerText,
            /** 全屏水印文案 */
            watermarkText: view.watermarkText,
            /** 演示模式下是否已对患者/医生/配置脱敏 */
            masked: demo,
            /** 版权归属 */
            company: '杭州健澜科技有限公司',
          },
          'ok',
          c.traceId,
        ),
      );
    },
  },
];
