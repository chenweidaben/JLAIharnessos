/**
 * 健澜科技 jlmedaios - 多语言支持框架 · BFF 路由（M151-C）
 *
 * 面向前端的语言字典下发（web/src/pages/i18n/LanguageSwitcher）：
 *   GET /api/v1/i18n?locale=xxx   返回该语言整包文案 + 支持的语言列表 + 缺失 key。
 *
 * 设计口径：
 *   - 该接口为「公开」接口（auth 不设登录态），以便登录页 / 语言切换器在未登录
 *     时也能拉取文案；文案为非敏感字典，不含任何患者数据；
 *   - 数据来源：aggregators/i18nAggregator.ts（进程内可扩展字典，纯函数派生）；
 *   - 不触碰 WebSocket；不新增业务依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  autoTranslate,
  DEFAULT_LOCALE,
  getMissingTranslations,
  getTranslationBundle,
  listLocales,
  seedI18n,
} from '../aggregators/i18nAggregator';

// 模块加载即注入内置种子（幂等；后续改由 sys.i18n_translation 持久层启动加载）
seedI18n();

export const i18nRoutes: RouteDef[] = [
  {
    method: 'GET',
    // 公开接口：语言字典非敏感，未登录也可拉取（登录页 / 语言切换器需要）
    auth: false,
    path: '/api/v1/i18n',
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const requested = c.query.get('locale') ?? DEFAULT_LOCALE;
        const bundle = getTranslationBundle(requested);
        const supported = listLocales();

        // 目标语言无任何文案时回退到默认语言，前端据此提示
        const isFallback = Object.keys(bundle).length === 0;
        const locale = isFallback ? DEFAULT_LOCALE : requested;

        // 缺失 key（相对默认语言）一并下发，便于前端质量补齐与新场景提示
        const missing = getMissingTranslations(locale);

        // 对若干缺失 key 做确定性自动翻译预览（纯函数，不触 LLM）
        const autoFilled = missing.slice(0, 5).map((m) => ({
          key: m.key,
          auto: autoTranslate(m.key, m.sourceLocale, m.targetLocale),
        }));

        return json(
          ok({
            locale,
            fallback: isFallback,
            defaultLocale: DEFAULT_LOCALE,
            supportedLocales: supported,
            translations: getTranslationBundle(locale),
            missing,
            autoFilled,
          }),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'i18n 处理失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
