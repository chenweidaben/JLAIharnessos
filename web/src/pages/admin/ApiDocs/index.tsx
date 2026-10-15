/**
 * 健澜科技 jlmedaios - M129-A 统一 API 文档页（系统集成）
 *
 * 从 BFF /api/openapi.json 拉取 OpenAPI 3.0 规范，Swagger UI 风格渲染：
 *  - 按业务 tag 分组；HTTP 方法彩色徽标（GET/POST/PUT/DELETE）
 *  - 路径参数 / query 参数表（含 page、pageSize 分页规范）
 *  - 统一信封、JWT Bearer 认证、业务错误码说明
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Card, Collapse, Layout, Spin, Table, Tag, Typography } from 'antd';

const { Content, Paragraph, Text, Title } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const METHOD_COLOR: Record<string, string> = {
  get: 'blue',
  post: 'green',
  put: 'orange',
  delete: 'red',
  patch: 'purple',
};

interface OpenApiParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: { type?: string };
}

interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
  responses?: Record<string, { description?: string }>;
}

interface OpenApiDoc {
  openapi: string;
  info?: { title?: string; version?: string; description?: string };
  paths?: Record<string, Record<string, OpenApiOperation>>;
  tags?: { name: string; description?: string }[];
}

interface GroupedOp {
  method: string;
  path: string;
  op: OpenApiOperation;
}

export default function ApiDocsPage() {
  const [doc, setDoc] = useState<OpenApiDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await fetch('/api/openapi.json');
        const json = (await resp.json()) as OpenApiDoc;
        if (!alive) return;
        setDoc(json);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : '加载 API 文档失败');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** 按 tag 聚合所有操作 */
  const groups = useMemo(() => {
    if (!doc?.paths) return [];
    const map = new Map<string, GroupedOp[]>();
    for (const [path, byMethod] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(byMethod)) {
        const tag = op.tags?.[0] ?? '系统集成';
        if (!map.has(tag)) map.set(tag, []);
        map.get(tag)!.push({ method, path, op });
      }
    }
    return Array.from(map.entries()).map(([tag, ops]) => ({ tag, ops }));
  }, [doc]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          {doc?.info?.title ?? '统一 API 文档'}
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          系统集成 · OpenAPI {doc?.openapi ?? '3.0'} · JWT Bearer 认证 · 杭州健澜科技有限公司
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载 API 文档…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} description="请确认 BFF 已启动且 /api/openapi.json 可访问。" />
        )}

        {!loading && !error && doc && (
          <>
            {/* 接入约定卡片 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Text strong>接入约定：</Text>
              <Paragraph style={{ marginBottom: 4, whiteSpace: 'pre-wrap' }}>
                {doc.info?.description}
              </Paragraph>
            </Card>

            <Collapse
              defaultActiveKey={groups.map((g) => g.tag)}
              items={groups.map((g) => ({
                key: g.tag,
                label: (
                  <span>
                    <Tag color={VI.accent}>{g.tag}</Tag>
                    <Badge count={g.ops.length} style={{ backgroundColor: VI.mid }} />
                  </span>
                ),
                children: g.ops.map(({ method, path, op }, idx) => (
                  <Card
                    key={`${method}-${path}-${idx}`}
                    size="small"
                    style={{ marginBottom: 12, borderLeft: `3px solid ${VI.accent}` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag color={METHOD_COLOR[method] ?? 'default'} style={{ minWidth: 64, textAlign: 'center', fontWeight: 600 }}>
                        {method.toUpperCase()}
                      </Tag>
                      <Text code style={{ fontSize: 14 }}>
                        {path}
                      </Text>
                      <Text type="secondary">{op.summary}</Text>
                    </div>
                    {op.description && (
                      <Paragraph type="secondary" style={{ margin: '8px 0' }}>
                        {op.description}
                      </Paragraph>
                    )}

                    {op.parameters && op.parameters.length > 0 && (
                      <Table
                        size="small"
                        style={{ marginTop: 8 }}
                        pagination={false}
                        rowKey={(r) => `${r.in}-${r.name}`}
                        dataSource={op.parameters}
                        columns={[
                          { title: '参数', dataIndex: 'name', render: (v: string, r) => <Text strong={r.required}>{v}</Text> },
                          { title: '位置', dataIndex: 'in', width: 90 },
                          { title: '类型', dataIndex: ['schema', 'type'], width: 90 },
                          { title: '必填', dataIndex: 'required', width: 70, render: (v?: boolean) => (v ? <Tag color="red">是</Tag> : <Tag>否</Tag>) },
                          { title: '说明', dataIndex: 'description' },
                        ]}
                      />
                    )}

                    <div style={{ marginTop: 8 }}>
                      {Object.entries(op.responses ?? {}).map(([status, desc]) => (
                        <Tag key={status} style={{ marginBottom: 4 }}>
                          {status} · {desc.description}
                        </Tag>
                      ))}
                    </div>
                  </Card>
                )),
              }))}
            />
          </>
        )}
      </Content>
    </Layout>
  );
}
