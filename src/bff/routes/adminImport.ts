/**
 * 健澜科技 jlmedaios - M129-C 标准数据导入路由（【系统集成】）
 *
 * 【系统集成】面向第三方系统（HIS / EMR / 体检 / 基层公卫平台）数据对接：
 *  - GET  /api/v1/admin/import/template  下发标准导入模板（字段说明 + 示例信封）；
 *  - POST /api/v1/admin/import/patients  上传导入文件（原始 JSON 文本），
 *    BFF 校验信封与逐行业务规则后返回受理结果（accepted 干净行集 / rejected 错误清单）。
 *
 * 生产安全加固：
 *  - requireRole(c, 'admin')：未登录 401、非管理员 403，导入工具不对普通角色开放；
 *  - 本路由只做「校验 + 行级分拣」，不做物理写库——
 *    真正的患者主索引合并与事务回灌由 EMRPI / 受控导入作业执行，避免误覆盖生产数据；
 *  - 信封级硬错误（非 JSON / tool/kind 不符）由纯函数抛错，路由层捕获后统一 400；
 *  - 不碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { generateImportTemplate, importPatientData } from '../aggregators/dataImportAggregator';

/**
 * GET /api/v1/admin/import/template
 * 下发标准导入模板：三段字段说明 + 一行示例信封，供运营人员照格式准备导入文件。
 */
async function handleTemplate(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;
  return json(ok(generateImportTemplate(), 'ok', c.traceId));
}

/**
 * POST /api/v1/admin/import/patients
 * Body：导入文件原始 JSON 文本（c.rawBody）。
 * 校验通过后返回受理结果预览；物理回灌由受控导入作业二次确认后执行。
 */
async function handleImportPatients(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const text = c.rawBody ?? '';
  try {
    const result = importPatientData(text);
    return json(
      ok({
        // 受理结果预览：三段收数 / 拒收行数 / 干净行集 / 行级错误清单
        accepted: result.accepted,
        rejected: result.rejected,
        counts: result.counts,
        validation: result.validation,
        importedAt: result.importedAt,
        note: '校验通过；物理回灌请在受控导入作业中按 EMRPI 规则逐行合并',
      }, 'ok', c.traceId),
    );
  } catch (err) {
    return json(
      fail(ErrorCode.BAD_REQUEST, err instanceof Error ? err.message : '导入文件校验失败', c.traceId),
      400,
    );
  }
}

export const adminImportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/import/template',
    auth: true,
    handle: handleTemplate,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/import/patients',
    auth: true,
    handle: handleImportPatients,
  },
];
