/**
 * 健澜科技 jlmedaios - M145-D 部署配置生成路由（生产化收尾）
 *
 * 【生产化收尾】面向系统管理员的部署配置「一键生成」入口：
 *  - GET /api/v1/admin/deploy/config  根据 query 入参现场生成
 *    docker-compose.yml 与 nginx.conf 文本，并附带备份/容灾策略，
 *    供运维控制台复制即用、或落盘到目标服务器。
 *
 * 生产安全加固：
 *  - requireRole(c, 'admin')：未登录 401、非管理员 403，配置生成不对外开放；
 *  - 本路由只「生成文本」，绝不执行 docker/nginx，也不写服务器文件；
 *  - 口令类字段一律回退到占位符 CHANGE_ME，响应中明确提示运维替换；
 *  - 不碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  DEFAULT_APP_IMAGE,
  DEFAULT_HTTP_PORT,
  generateBackupPolicy,
  generateDockerCompose,
  generateNginxConfig,
} from '../aggregators/deployConfigAggregator';

/** 读取 query 整型，缺省/非法时回退默认值 */
function readPort(c: Ctx, key: string, fallback: number): number {
  const raw = c.query.get(key);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : fallback;
}

/** 读取 query 字符串，缺省时回退默认值 */
function readStr(c: Ctx, key: string, fallback: string): string {
  const raw = c.query.get(key);
  return raw && raw.trim() ? raw.trim() : fallback;
}

/**
 * GET /api/v1/admin/deploy/config
 *
 * query 可选：
 *  - domain      对外域名，默认 hospital.example.com
 *  - sslCert     TLS 证书 fullchain.pem 绝对路径，默认 /etc/nginx/ssl/fullchain.pem
 *  - httpPort    bff 内网映射端口，默认 8080
 *  - appImage    业务镜像标签，默认 jlmedaios/bff:latest
 */
async function handleGetDeployConfig(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const domain = readStr(c, 'domain', 'hospital.example.com');
  const sslCert = readStr(c, 'sslCert', '/etc/nginx/ssl/fullchain.pem');
  const httpPort = readPort(c, 'httpPort', DEFAULT_HTTP_PORT);
  const appImage = readStr(c, 'appImage', DEFAULT_APP_IMAGE);

  // 域名做最基本的形状校验：禁止空白与空格，避免 nginx/server_name 被注入
  if (/\s/.test(domain)) {
    return json(fail(ErrorCode.BAD_REQUEST, 'domain 不能包含空白字符'), 400);
  }
  if (!sslCert.startsWith('/')) {
    return json(fail(ErrorCode.BAD_REQUEST, 'sslCert 必须是绝对路径（以 / 开头）'), 400);
  }

  // 纯函数现场生成：同入参必得同文本，便于与单测、文档三方对齐
  const dockerCompose = generateDockerCompose({ domain, httpPort, appImage });
  const nginxConf = generateNginxConfig(domain, sslCert);
  const backupPolicy = generateBackupPolicy();

  return json(
    ok({
      domain,
      sslCert,
      dockerCompose,
      nginxConf,
      backupPolicy,
      note: '口令类字段为占位符 CHANGE_ME_BEFORE_PRODUCTION，落盘前请替换为随机强口令；本接口仅生成文本，不执行任何部署命令。',
    }),
  );
}

export const deployConfigRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/deploy/config',
    auth: true,
    handle: handleGetDeployConfig,
  },
];
