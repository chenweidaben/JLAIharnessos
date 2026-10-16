/**
 * 健澜科技 jlmedaios - 文档纯函数单测（M200-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDocumentationReport,
  buildSystemArchitectureDiagram,
  generateAPIEndpointDoc,
  type APIData,
  type ServiceNode,
} from '../../src/bff/aggregators/documentationAggregator';

describe('generateAPIEndpointDoc', () => {
  it('生成带认证的 API 文档', () => {
    const api: APIData = { method: 'GET', path: '/api/v1/patient', description: '查询患者', auth: true };
    const doc = generateAPIEndpointDoc(api);
    expect(doc).toContain('/api/v1/patient');
    expect(doc).toContain('权限认证');
  });
});

describe('buildSystemArchitectureDiagram', () => {
  it('生成 Mermaid 图', () => {
    const services: ServiceNode[] = [
      { name: 'api-gateway', dependencies: ['user-service'] },
      { name: 'user-service', dependencies: [] },
    ];
    const diagram = buildSystemArchitectureDiagram(services);
    expect(diagram).toContain('graph TD');
    expect(diagram).toContain('api-gateway --> user-service');
  });
});

describe('buildDocumentationReport', () => {
  it('生成架构文档数据', () => {
    const r = buildDocumentationReport();
    expect(r.architecture.system).toBe(true);
  });

  it('生成开发文档数据', () => {
    const r = buildDocumentationReport();
    expect(r.development.api).toBeGreaterThan(0);
  });

  it('生成运维文档数据', () => {
    const r = buildDocumentationReport();
    expect(r.ops.deployment).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildDocumentationReport();
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
