/**
 * 健澜科技 jlmedaios - 多语言深化 · 英文界面完善 BFF 路由（M158-A）
 *
 * v4.x近期：
 *   GET  /api/v1/i18n/translations?locale=en-US
 *       下发目标语言整包字典 + 完整性报告（含分类覆盖率 / missing keys / SLA）。
 *       公开接口（文案非敏感，登录页与语言切换器未登录也可拉取）。
 *
 *   POST /api/v1/i18n/translate
 *       body: { keys: string[], targetLocale: string }
 *       对一批 key 做确定性自动翻译（不触 LLM / 不触网络），
 *       返回 TranslatedMap，供翻译管理后台「一键补译」预览。
 *       需登录（auth:true）。
 *
 * 设计口径：薄壳路由，业务规则全部在 aggregators/i18nDeepAggregator.ts 纯函数层。
 * 不触碰 WebSocket；不新增业务依赖；不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  type Ctx,
  ErrorCode,
  fail,
  json,
  ok,
  type RouteDef,
} from '../types';
import {
  autoTranslateBatch,
  checkTranslationCompleteness,
  DEEP_DEFAULT_LOCALE,
  getDeepBundle,
  getI18nTranslation,
  listDeepKeys,
} from '../aggregators/i18nDeepAggregator';

interface TranslateBody {
  keys?: string[];
  targetLocale?: string;
}

async function handleTranslatePost(c: Ctx): Promise<Response> {
  const body = await c.body<TranslateBody>().catch(() => ({} as TranslateBody));
  const keys = Array.isArray(body?.keys) ? body.keys.filter((k) => typeof k === 'string') : [];
  const targetLocale = typeof body?.targetLocale === 'string' && body.targetLocale
    ? body.targetLocale
    : 'en-US';

  if (keys.length === 0) {
    return json(
      fail(ErrorCode.BAD_REQUEST, 'keys 不能为空（string[]）', c.traceId),
      400,
    );
  }
  if (keys.length > 500) {
    return json(
      fail(ErrorCode.BAD_REQUEST, '单次最多翻译 500 个 key', c.traceId),
      400,
    );
  }

  const translated = autoTranslateBatch(keys, targetLocale);
  const completeness = checkTranslationCompleteness(targetLocale);
  return json(
    ok({
      targetLocale,
      count: keys.length,
      translated,
      completeness,
    }),
  );
}

export const i18nDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/i18n/translations',
    auth: false,
    handle: (c: Ctx): Response => {
      try {
        const locale = c.query.get('locale') ?? DEEP_DEFAULT_LOCALE;
        const bundle = getDeepBundle(locale);
        const completeness = checkTranslationCompleteness(locale);
        const preview = getI18nTranslation('medical.chiefComplaint', locale);
        return json(
          ok({
            locale,
            defaultLocale: DEEP_DEFAULT_LOCALE,
            supportedLocales: [DEEP_DEFAULT_LOCALE, 'en-US'],
            translations: bundle,
            allKeys: listDeepKeys(),
            completeness,
            preview,
          }),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'i18n deep 处理失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/i18n/translate',
    auth: true,
    handle: (c: Ctx): Promise<Response> => handleTranslatePost(c),
  },
];
