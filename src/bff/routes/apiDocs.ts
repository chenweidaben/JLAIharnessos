/**
 * 健澜科技 jlmedaios - M129-A 统一 API 文档路由【系统集成】
 *
 *  - GET /api/docs           Swagger UI 页面（浏览器友好，指向 /api/openapi.json）
 *  - GET /api/openapi.json    OpenAPI 3.0 规范 JSON（供第三方系统接入 / 代码生成）
 *
 * 本路由仅输出 API 元数据（接口形状 / 认证方式 / 错误码 / 分页规范），
 * 不返回任何业务数据或患者隐私信息，故与 /metrics 同为公开元数据端点。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, type Ctx, type RouteDef } from '../types';
import { generateApiDocs } from '../aggregators/apiDocsAggregator';

/** Swagger UI 静态页：深海蓝主题，加载 swagger-ui-dist 渲染 /api/openapi.json */
function renderSwaggerUiHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>健澜科技 Gang-OS · API 文档</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    body { margin: 0; background: #f5f7fa; }
    .topbar {
      background: linear-gradient(135deg, #0a2540 0%, #123a5e 100%);
      color: #fff; padding: 16px 24px; font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
    }
    .topbar h1 { margin: 0; font-size: 18px; font-weight: 600; }
    .topbar p { margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.75); }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div class="topbar">
    <h1>健澜数智医院智能体（Gang-OS）· 统一 API 文档</h1>
    <p>系统集成 · OpenAPI 3.0 · JWT Bearer 认证 · 杭州健澜科技有限公司</p>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.addEventListener('load', function () {
      window.ui = SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        docExpansion: 'list',
        filter: true,
      });
    });
  </script>
</body>
</html>`;
}

export const apiDocsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/docs',
    auth: false,
    handle(_c: Ctx): Response {
      return new Response(renderSwaggerUiHtml(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    },
  },
  {
    method: 'GET',
    path: '/api/openapi.json',
    auth: false,
    handle(_c: Ctx): Response {
      return json(generateApiDocs(), 200);
    },
  },
];
