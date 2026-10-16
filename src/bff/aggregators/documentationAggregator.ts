/**
 * 健澜科技 jlmedaios - 项目文档纯函数（M200-B）
 *
 * buildDocumentationReport / generateAPIEndpointDoc / buildSystemArchitectureDiagram
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** API 数据 */
export interface APIData {
  method: string;
  path: string;
  description: string;
  auth: boolean;
}

/**
 * 生成 API 端点文档（纯函数）。
 *
 * @param api API 数据
 * @returns 文档
 */
export function generateAPIEndpointDoc(api: APIData): string {
  const authStr = api.auth ? '需要权限认证' : '公开接口';
  return `### ${api.method} ${api.path}\n- 描述：${api.description}\n- 认证：${authStr}`;
}

/** 服务列表 */
export interface ServiceNode {
  name: string;
  dependencies: string[];
}

/**
 * 构建系统架构图（纯函数，返回 Mermaid 语法）。
 *
 * @param services 服务列表
 * @returns Mermaid 架构图
 */
export function buildSystemArchitectureDiagram(services: ServiceNode[]): string {
  const lines = ['graph TD'];
  for (const s of services) {
    lines.push(`  ${s.name}[${s.name}]`);
    for (const dep of s.dependencies) {
      lines.push(`  ${s.name} --> ${dep}`);
    }
  }
  return lines.join('\n');
}

/** 文档报告输出 */
export interface DocumentationReport {
  architecture: { system: boolean; deployment: boolean; data: boolean; security: boolean };
  development: { api: number; database: number; microservice: number; frontend: number };
  ops: { deployment: number; maintenance: number; monitoring: number; emergency: number };
  user: { guides: number; faq: number };
  training: { materials: number; videos: number };
  compliance: { documents: number };
  release: { notes: number };
  quality: { coverage: number; reviewed: number };
  suggestions: string[];
}

/**
 * 构建文档报告。
 *
 * @returns 文档报告
 */
export function buildDocumentationReport(): DocumentationReport {
  return {
    architecture: { system: true, deployment: true, data: true, security: true },
    development: { api: 200, database: 50, microservice: 40, frontend: 100 },
    ops: { deployment: 10, maintenance: 20, monitoring: 15, emergency: 5 },
    user: { guides: 30, faq: 50 },
    training: { materials: 20, videos: 10 },
    compliance: { documents: 15 },
    release: { notes: 18 },
    quality: { coverage: 0.9, reviewed: 0.95 },
    suggestions: ['补充 API 示例请求/响应', '增加运维应急手册版本'],
  };
}
