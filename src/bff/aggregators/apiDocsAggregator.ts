/**
 * 健澜科技 jlmedaios - M129-A 统一 API 文档聚合器【系统集成】
 *
 * 本模块面向「系统集成 / 第三方对接 / 开放平台」场景，把 BFF 全部 HTTP 接口的
 * 约定归一为一份 OpenAPI 3.0 文档：
 *  - 统一响应信封 ApiResponse<T>：{ code, message, data, timestamp, traceId }
 *  - JWT Bearer 认证：Authorization: Bearer <access_token>（HS256，2h 过期）
 *  - 业务错误码：0 成功 / 4xxxx 客户端 / 5xxxx 服务端，详见 info.description
 *  - 列表分页规范：page（默认 1）+ pageSize（默认 20，上限 100）
 *
 * 纯函数设计：generateApiDocs / documentRoute 均不读环境、不查库、无副作用，
 * 便于单测断言与在构建期静态生成文档。零新增依赖（不引入 openapi-types，
 * 以下最小类型仅描述结构）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================================================================
 * 最小 OpenAPI 3.0 类型（结构化描述，零依赖）
 * ========================================================================== */

export interface OpenApiSchema {
  type?: string;
  format?: string;
  description?: string;
  defaultValue?: unknown;
  maximum?: number;
  minimum?: number;
  example?: unknown;
  enum?: Array<string | number>;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  nullable?: boolean;
  $ref?: string;
}

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  description?: string;
  schema?: OpenApiSchema;
}

export interface OpenApiOperation {
  tags: string[];
  summary: string;
  description?: string;
  parameters?: OpenApiParameter[];
  requestBody?: {
    required: boolean;
    content: { 'application/json': { schema: OpenApiSchema } };
  };
  responses: Record<string, { description: string; content?: Record<string, unknown> }>;
  /** 公开接口显式置空以覆盖全局 Bearer 安全要求 */
  security?: Array<Record<string, string[]>>;
}

export interface OpenApi3 {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    license: { name: string; identifier?: string };
  };
  servers: Array<{ url: string; description?: string }>;
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: {
    securitySchemes: Record<
      string,
      { type: string; scheme: string; bearerFormat?: string; description?: string }
    >;
    schemas: Record<string, OpenApiSchema>;
  };
  security: Array<Record<string, string[]>>;
}

/* ============================================================================
 * RouteDoc：单条路由的规范化文档结构
 * ========================================================================== */

export interface RouteQueryParam {
  name: string;
  description?: string;
  required?: boolean;
  schema?: OpenApiSchema;
}

export interface RouteDoc {
  method: string;
  /** 原始路径（可含 :param 占位，输出 OpenAPI 时转为 {param}） */
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  /** 是否需要登录（需要则注入全局 JWT Bearer 安全要求） */
  auth: boolean;
  /** 请求体 schema（POST / PUT 等写接口） */
  requestBody?: OpenApiSchema;
  /** 除分页规范外的额外 query 参数 */
  query?: RouteQueryParam[];
  /** 额外响应码（status -> 说明），与默认 200/401/403/404/500 合并 */
  extraResponses?: Record<number, string>;
}

/** documentRoute 的入参：method/path 必填，其余为可选覆写 */
export type RouteDocInput = Partial<Omit<RouteDoc, 'method' | 'path'>> & {
  method: string;
  path: string;
};

/**
 * documentRoute —— 把一条路由声明规范化为 RouteDoc（纯函数）。
 *
 * 约定：
 *  - method 统一大写；
 *  - 缺省 tags = ['系统集成']；
 *  - 缺省 auth = true（本平台绝大多数接口需登录，公开接口需显式 auth:false）。
 */
export function documentRoute(method: string, path: string, input: Partial<RouteDocInput> = {}): RouteDoc {
  return {
    method: method.toUpperCase(),
    path,
    summary: input.summary ?? path,
    description: input.description,
    tags: input.tags ?? ['系统集成'],
    auth: input.auth ?? true,
    requestBody: input.requestBody,
    query: input.query,
    extraResponses: input.extraResponses,
  };
}

/* ============================================================================
 * 内部：RouteDoc -> OpenAPI Operation
 * ========================================================================== */

/** 分页规范：列表查询统一使用的两个 query 参数 */
const PAGE_QUERY: OpenApiParameter = {
  name: 'page',
  in: 'query',
  required: false,
  description: '页码，从 1 开始（列表分页规范）',
  schema: { type: 'integer', format: 'int32', defaultValue: 1, minimum: 1 },
};

const PAGE_SIZE_QUERY: OpenApiParameter = {
  name: 'pageSize',
  in: 'query',
  required: false,
  description: '每页条数，默认 20，上限 100（列表分页规范）',
  schema: { type: 'integer', format: 'int32', defaultValue: 20, minimum: 1, maximum: 100 },
};

/** 从原始路径中抽取 :param 占位，转成 OpenAPI 路径参数定义 */
function extractPathParams(path: string): { openapiPath: string; params: OpenApiParameter[] } {
  const params: OpenApiParameter[] = [];
  const openapiPath = path.replace(/:([^/]+)/g, (_m, name: string) => {
    params.push({
      name,
      in: 'path',
      required: true,
      description: `路径参数 ${name}`,
      schema: { type: 'string' },
    });
    return `{${name}}`;
  });
  return { openapiPath, params };
}

function routeDocToOperation(doc: RouteDoc): { openapiPath: string; operation: OpenApiOperation } {
  const { openapiPath, params: pathParams } = extractPathParams(doc.path);

  const parameters: OpenApiParameter[] = [...pathParams];
  // GET 列表接口统一追加分页规范参数
  if (doc.method === 'GET') {
    parameters.push(PAGE_QUERY, PAGE_SIZE_QUERY);
  }
  for (const q of doc.query ?? []) {
    parameters.push({
      name: q.name,
      in: 'query',
      required: q.required ?? false,
      description: q.description,
      schema: q.schema,
    });
  }

  // 默认响应：200 统一信封 + 鉴权类错误 + 500
  const responses: OpenApiOperation['responses'] = {
    '200': {
      description: '成功（统一响应信封，data 为业务载荷）',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
    },
    '500': {
      description: '服务器内部错误（code=50000，携带 traceId 供排查）',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
    },
  };
  if (doc.auth) {
    responses['401'] = {
      description: '未登录或登录已过期（code=40100 / 40101 TOKEN_EXPIRED）',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
    };
    responses['403'] = {
      description: '权限不足（code=40300，缺少角色或权限码）',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
    };
  }
  responses['404'] = {
    description: '资源不存在（code=40400）',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
  };
  for (const [status, desc] of Object.entries(doc.extraResponses ?? {})) {
    responses[status] = {
      description: desc,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
    };
  }

  const operation: OpenApiOperation = {
    tags: doc.tags,
    summary: doc.summary,
    description: doc.description,
    parameters,
    responses,
  };
  if (doc.requestBody) {
    operation.requestBody = {
      required: true,
      content: { 'application/json': { schema: doc.requestBody } },
    };
  }
  // 公开接口显式关闭全局 Bearer；需登录接口走全局 security，不重复声明
  if (!doc.auth) {
    operation.security = [];
  }
  return { openapiPath, operation };
}

/* ============================================================================
 * 路由目录：覆盖各业务域的代表性接口（路径与 src/bff/routes 实际定义一致）
 * ========================================================================== */

function buildCatalog(): RouteDoc[] {
  const body = (description: string): OpenApiSchema => ({
    type: 'object',
    description,
  });

  return [
    // —— 系统健康 ——
    documentRoute('GET', '/api/v1/health', {
      summary: '存活/就绪探活',
      tags: ['系统健康'],
      auth: false,
      description: '供 k8s liveness/readiness 与负载均衡探活，免鉴权。',
    }),
    documentRoute('GET', '/api/v1/health/detailed', {
      summary: '详细健康巡检',
      tags: ['系统健康'],
      auth: true,
      description: '需 system:view，返回错误率/慢查询/学习闭环健康度。',
    }),

    // —— 认证与权限 ——
    documentRoute('POST', '/api/v1/auth/login', {
      summary: '账号密码登录，签发 JWT',
      tags: ['认证与权限'],
      auth: false,
      requestBody: body('{ username, password }'),
      description: '成功返回 access_token（HS256，2h）与刷新令牌。',
    }),
    documentRoute('POST', '/api/v1/auth/logout', {
      summary: '登出并吊销令牌',
      tags: ['认证与权限'],
      auth: true,
    }),
    documentRoute('POST', '/api/v1/auth/refresh', {
      summary: '刷新访问令牌',
      tags: ['认证与权限'],
      auth: false,
      requestBody: body('{ refreshToken }'),
    }),
    documentRoute('GET', '/api/v1/auth/userinfo', {
      summary: '当前登录用户信息',
      tags: ['认证与权限'],
      auth: true,
    }),
    documentRoute('GET', '/api/v1/auth/menus', {
      summary: '当前用户菜单树',
      tags: ['认证与权限'],
      auth: true,
    }),
    documentRoute('GET', '/api/v1/auth/permissions', {
      summary: '当前用户权限码集合',
      tags: ['认证与权限'],
      auth: true,
    }),

    // —— 患者 ——
    documentRoute('GET', '/api/v1/patients', {
      summary: '患者列表（分页）',
      tags: ['患者中心'],
      query: [{ name: 'keyword', description: '姓名/病案号模糊检索' }],
    }),
    documentRoute('GET', '/api/v1/patients/:id', {
      summary: '患者详情',
      tags: ['患者中心'],
    }),

    // —— 门诊 ——
    documentRoute('GET', '/api/v1/outpatient/queue', {
      summary: '门诊候诊队列',
      tags: ['门诊'],
    }),
    documentRoute('GET', '/api/v1/opd/workbench', {
      summary: '门诊医生工作站数据',
      tags: ['门诊'],
    }),

    // —— 住院 ——
    documentRoute('GET', '/api/v1/inpatient/rounds', {
      summary: '住院查房记录列表',
      tags: ['住院'],
    }),
    documentRoute('POST', '/api/v1/inpatient/rounds', {
      summary: '新增查房记录',
      tags: ['住院'],
      requestBody: body('查房记录字段集合'),
    }),
    documentRoute('POST', '/api/v1/inpatient/orders/:id/review', {
      summary: '医嘱审核通过',
      tags: ['住院'],
    }),
    documentRoute('POST', '/api/v1/inpatient/orders/:id/administer', {
      summary: '医嘱执行（给药）',
      tags: ['住院'],
    }),

    // —— 护理 ——
    documentRoute('GET', '/api/v1/nurse-station/ward', {
      summary: '护士站病区一览',
      tags: ['护理'],
    }),
    documentRoute('GET', '/api/v1/nursing-io', {
      summary: '护理出入量记录',
      tags: ['护理'],
    }),
    documentRoute('GET', '/api/v1/vitals-trend', {
      summary: '生命体征趋势',
      tags: ['护理'],
    }),

    // —— 医嘱/用药 ——
    documentRoute('GET', '/api/v1/orders', {
      summary: '医嘱列表',
      tags: ['医嘱与用药'],
    }),
    documentRoute('GET', '/api/v1/drug-inventory', {
      summary: '药品库存查询',
      tags: ['医嘱与用药'],
    }),
    documentRoute('POST', '/api/v1/drug-review/scan', {
      summary: '合理用药实时审查',
      tags: ['医嘱与用药'],
      requestBody: body('{ patientId, orders[] }'),
    }),

    // —— 检查检验 ——
    documentRoute('GET', '/api/v1/lis/reports', {
      summary: '检验报告列表',
      tags: ['检查检验'],
    }),
    documentRoute('GET', '/api/v1/ris/reports', {
      summary: '检查报告列表',
      tags: ['检查检验'],
    }),

    // —— 急诊 ——
    documentRoute('GET', '/api/v1/emergency/queue', {
      summary: '急诊分诊队列',
      tags: ['急诊'],
    }),
    documentRoute('GET', '/api/v1/critical/alerts', {
      summary: '危急值告警列表',
      tags: ['急诊'],
    }),
    documentRoute('POST', '/api/v1/critical/ack/:id', {
      summary: '确认危急值告警',
      tags: ['急诊'],
    }),

    // —— 互联网医院 ——
    documentRoute('POST', '/api/v1/internet/consultation/start', {
      summary: '发起互联网问诊',
      tags: ['互联网医院'],
      requestBody: body('{ deptId, symptom }'),
    }),
    documentRoute('GET', '/api/v1/internet/consultation/sessions', {
      summary: '互联网问诊会话列表',
      tags: ['互联网医院'],
    }),

    // —— 结算与 DRG/DIP ——
    documentRoute('GET', '/api/v1/billing/queue', {
      summary: '待结算费用队列',
      tags: ['结算与医保'],
    }),
    documentRoute('POST', '/api/v1/billing/settlements/:id/pay', {
      summary: '结算单收款',
      tags: ['结算与医保'],
    }),
    documentRoute('GET', '/api/v1/drg/results', {
      summary: 'DRG 分组结果',
      tags: ['结算与医保'],
    }),
    documentRoute('GET', '/api/v1/dip/points', {
      summary: 'DIP 点值查询',
      tags: ['结算与医保'],
    }),

    // —— AI 辅助 ——
    documentRoute('POST', '/api/v1/ai-note-drafts/generate', {
      summary: 'AI 病历草稿生成',
      tags: ['AI 辅助'],
      requestBody: body('{ visitId, noteType }'),
    }),
    documentRoute('POST', '/api/v1/assistant/lab/interpret', {
      summary: '检验结果 AI 解读',
      tags: ['AI 辅助'],
      requestBody: body('{ patientId, reportId }'),
    }),

    // —— 智能体运行 ——
    documentRoute('GET', '/api/v1/medmuse/sessions', {
      summary: '智能体会话列表',
      tags: ['智能体运行'],
    }),
    documentRoute('POST', '/api/v1/agent-runtime/agents/:agentId/run', {
      summary: '执行已发布智能体',
      tags: ['智能体运行'],
      requestBody: body('{ input }'),
    }),
    documentRoute('GET', '/api/v1/human-tasks', {
      summary: '人工待办任务列表',
      tags: ['智能体运行'],
    }),

    // —— 系统管理（RBAC/审计/租户）——
    documentRoute('GET', '/api/v1/admin/users', {
      summary: '用户管理列表',
      tags: ['系统管理'],
    }),
    documentRoute('GET', '/api/v1/admin/roles', {
      summary: '角色列表',
      tags: ['系统管理'],
    }),
    documentRoute('GET', '/api/v1/admin/audit-logs', {
      summary: '数据访问审计日志',
      tags: ['系统管理'],
    }),
    documentRoute('GET', '/api/v1/admin/tenants/tree', {
      summary: '租户/院区树',
      tags: ['系统管理'],
    }),
  ];
}

/* ============================================================================
 * generateApiDocs —— 生成完整 OpenAPI 3.0 文档（纯函数）
 * ========================================================================== */

const ERROR_CODE_TABLE = [
  '| code | 含义 | HTTP |',
  '| --- | --- | --- |',
  '| 0 | 成功 | 200 |',
  '| 40000 | 请求参数错误 BAD_REQUEST | 400 |',
  '| 40100 | 未登录 UNAUTHORIZED | 401 |',
  '| 40101 | 令牌过期 TOKEN_EXPIRED | 401 |',
  '| 40300 | 权限不足 FORBIDDEN | 403 |',
  '| 40400 | 资源不存在 NOT_FOUND | 404 |',
  '| 40900 | 资源冲突 CONFLICT | 409 |',
  '| 42900 | 触发限流 RATE_LIMITED | 429 |',
  '| 50000 | 服务器内部错误 INTERNAL_ERROR | 500 |',
  '| 50300 | 服务暂不可用 SERVICE_UNAVAILABLE | 503 |',
].join('\n');

export function generateApiDocs(): OpenApi3 {
  const paths: OpenApi3['paths'] = {};

  for (const doc of buildCatalog()) {
    const { openapiPath, operation } = routeDocToOperation(doc);
    if (!paths[openapiPath]) paths[openapiPath] = {};
    // method 小写（OpenAPI 约定）
    paths[openapiPath][doc.method.toLowerCase()] = operation;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: '健澜数智医院智能体（Gang-OS）BFF API',
      version: '1.0.0',
      description: [
        '统一 BFF HTTP 接口文档【系统集成】。所有业务接口前缀 `/api/v1`。',
        '',
        '**认证方式**：除显式标注「公开」的探活/登录接口外，所有接口需在请求头携带',
        '`Authorization: Bearer <access_token>`（JWT，HS256，有效期 2h）。',
        '',
        '**统一响应信封**：`{ code, message, data, timestamp, traceId }`，',
        'code=0 表示业务成功；非 0 为业务错误，data 为 null。',
        '',
        '**分页规范**：列表查询统一使用 `page`（默认 1）与 `pageSize`（默认 20，上限 100）。',
        '',
        '**业务错误码**：',
        ERROR_CODE_TABLE,
      ].join('\n'),
      license: { name: '杭州健澜科技有限公司', identifier: 'Proprietary' },
    },
    servers: [
      { url: '/', description: '同源 BFF（默认）' },
    ],
    tags: [
      { name: '系统健康', description: '存活/就绪与详细巡检' },
      { name: '认证与权限', description: '登录、令牌、用户信息、菜单与权限码' },
      { name: '患者中心', description: '患者主索引与患者 360' },
      { name: '门诊', description: '门诊候诊与医生工作站' },
      { name: '住院', description: '查房、医嘱执行与住院护理' },
      { name: '护理', description: '护士站、出入量与生命体征' },
      { name: '医嘱与用药', description: '医嘱、药品库存与合理用药审查' },
      { name: '检查检验', description: 'LIS 检验与 RIS 检查报告' },
      { name: '急诊', description: '分诊队列与危急值闭环' },
      { name: '互联网医院', description: '在线问诊会话' },
      { name: '结算与医保', description: '收费结算、DRG/DIP' },
      { name: 'AI 辅助', description: '病历草稿与检查检验 AI 解读' },
      { name: '智能体运行', description: 'MedMuse 会话、智能体执行与人工待办' },
      { name: '系统管理', description: 'RBAC 用户/角色、审计日志与租户院区' },
      { name: '系统集成', description: '跨系统对接通用说明' },
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer 认证：Authorization: Bearer <access_token>',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          description: '统一成功响应信封',
          properties: {
            code: { type: 'integer', description: '业务码，0=成功', defaultValue: 0 },
            message: { type: 'string', description: '提示信息', example: 'ok' },
            data: { type: 'object', description: '业务载荷（列表分页时含 list/total/page/pageSize）', nullable: true },
            timestamp: { type: 'string', format: 'date-time', description: '服务端时间 ISO8601' },
            traceId: { type: 'string', description: '链路追踪 ID' },
          },
          required: ['code', 'message', 'data', 'timestamp'],
        },
        ErrorEnvelope: {
          type: 'object',
          description: '统一错误响应信封',
          properties: {
            code: { type: 'integer', description: '业务错误码（见 info.description 错误码表）' },
            message: { type: 'string', description: '错误描述' },
            data: { nullable: true, description: '恒为 null' },
            timestamp: { type: 'string', format: 'date-time' },
            traceId: { type: 'string' },
          },
          required: ['code', 'message', 'timestamp'],
        },
        PagedList: {
          type: 'object',
          description: '分页列表 data 结构',
          properties: {
            list: { type: 'array', items: { type: 'object' }, description: '当前页数据' },
            total: { type: 'integer', description: '总条数' },
            page: { type: 'integer', description: '当前页码' },
            pageSize: { type: 'integer', description: '每页条数' },
          },
          required: ['list', 'total', 'page', 'pageSize'],
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };
}
