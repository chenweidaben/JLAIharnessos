/**
 * 健澜科技 jlmedaios - M136-B 慢查询治理 / 优化建议面板（仅 admin）
 *
 * 点击「分析」触发 GET /api/v1/admin/test/performance/optimizations，
 * 展示：
 *  - 慢路由清单（P95 > thresholdMs，默认 300ms）与严重度分级、治理动作；
 *  - 可选 SQL 文本的静态优化建议（索引 / 内存缓存 / 去 N+1 / 改写 / 分页）；
 *  - BFF 进程内缓存命中率观测。
 * 三态：loading / error（可重试）/ empty（未分析）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  Layout,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF queryOptimizationRoutes 返回体对齐 */
type OptimizationKind = 'index' | 'cache' | 'n+1' | 'rewrite' | 'pagination' | 'filter';
type SlowRouteSeverity = 'warn' | 'slow' | 'critical';

interface SlowRouteRow {
  route: string;
  label: string;
  p95Ms: number;
  p50Ms: number;
  p99Ms: number;
  avgMs: number;
  samples: number;
  errorRate: number;
  severity: SlowRouteSeverity;
  suggestedActions: OptimizationKind[];
}

interface OptimizationRow {
  kind: OptimizationKind;
  title: string;
  detail: string;
  table: string;
  columns: string[];
  sqlSnippet: string;
  estimatedImpact: 'low' | 'medium' | 'high';
}

interface QueryOptimizationsData {
  generatedAt: string;
  thresholdMs: number;
  slowRoutes: SlowRouteRow[];
  sqlOptimizations: OptimizationRow[];
  cache: { size: number; hits: number; misses: number; hitRate: number; maxKeys: number };
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  accentSoft: '#8aa9c9',
  warn: '#d48806',
  danger: '#cf1322',
  bg: '#f5f7fa',
};

const SEVERITY_TAG: Record<SlowRouteSeverity, { color: string; text: string }> = {
  warn: { color: 'orange', text: '关注' },
  slow: { color: 'volcano', text: '偏慢' },
  critical: { color: 'red', text: '严重' },
};

const KIND_TAG: Record<OptimizationKind, { color: string; text: string }> = {
  index: { color: 'blue', text: '补索引' },
  cache: { color: 'cyan', text: '加缓存' },
  'n+1': { color: 'magenta', text: '去N+1' },
  rewrite: { color: 'geekblue', text: '改写' },
  pagination: { color: 'gold', text: '分页' },
  filter: { color: 'purple', text: '补过滤' },
};

const IMPACT_TAG: Record<OptimizationRow['estimatedImpact'], { color: string; text: string }> = {
  low: { color: 'default', text: '低收益' },
  medium: { color: 'orange', text: '中收益' },
  high: { color: 'red', text: '高收益' },
};

export default function QueryOptimizationsPage() {
  const [data, setData] = useState<QueryOptimizationsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [thresholdMs, setThresholdMs] = useState(300);
  const [sql, setSql] = useState('');

  const analyze = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('thresholdMs', String(thresholdMs));
      if (sql.trim()) params.set('sql', sql.trim());
      const resp = await fetch(`/api/v1/admin/test/performance/optimizations?${params.toString()}`);
      const body = await resp.json();
      if (body.code !== 0) {
        setError(body.message || '优化分析失败');
        setData(null);
        return;
      }
      setData(body.data as QueryOptimizationsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const slowColumns: ColumnsType<SlowRouteRow> = [
    { title: '路由', dataIndex: 'label', ellipsis: true, render: (v: string, r) => v || r.route },
    {
      title: 'P95',
      dataIndex: 'p95Ms',
      width: 110,
      render: (v: number, r) => <Tag color={SEVERITY_TAG[r.severity].color}>{v} ms</Tag>,
    },
    { title: 'P50', dataIndex: 'p50Ms', width: 90, render: (v: number) => `${v} ms` },
    { title: 'P99', dataIndex: 'p99Ms', width: 90, render: (v: number) => `${v} ms` },
    { title: '样本', dataIndex: 'samples', width: 70 },
    {
      title: '治理动作',
      dataIndex: 'suggestedActions',
      render: (actions: OptimizationKind[]) => (
        <span>
          {actions.map((a) => (
            <Tag key={a} color={KIND_TAG[a].color} style={{ marginBottom: 2 }}>
              {KIND_TAG[a].text}
            </Tag>
          ))}
        </span>
      ),
    },
  ];

  const optColumns: ColumnsType<OptimizationRow> = [
    {
      title: '类别',
      dataIndex: 'kind',
      width: 90,
      render: (k: OptimizationKind) => <Tag color={KIND_TAG[k].color}>{KIND_TAG[k].text}</Tag>,
    },
    { title: '建议', dataIndex: 'title', width: 180 },
    { title: '说明', dataIndex: 'detail', ellipsis: true },
    {
      title: '收益',
      dataIndex: 'estimatedImpact',
      width: 90,
      render: (v: OptimizationRow['estimatedImpact']) => (
        <Tag color={IMPACT_TAG[v].color}>{IMPACT_TAG[v].text}</Tag>
      ),
    },
    {
      title: 'SQL 片段',
      dataIndex: 'sqlSnippet',
      width: 260,
      ellipsis: true,
      render: (v: string) =>
        v ? (
          <Text code style={{ fontSize: 12 }}>
            {v}
          </Text>
        ) : (
          '-'
        ),
    },
  ];

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
          慢查询治理 · 优化建议
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          仅 admin 可见 · P95 慢路由识别 · 索引 / 内存缓存 / 去 N+1 静态建议 · 缓存命中观测
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
        {/* 操作条 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Text strong>P95 阈值(ms)</Text>
              <div style={{ marginTop: 4 }}>
                <InputNumber
                  min={50}
                  max={5000}
                  value={thresholdMs}
                  onChange={(v) => setThresholdMs(typeof v === 'number' ? v : 300)}
                />
              </div>
            </Col>
            <Col flex="auto">
              <Text strong>待分析 SQL（可选）</Text>
              <Input.TextArea
                rows={2}
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder="粘贴一条慢 SQL，如 SELECT * FROM medmuse.order WHERE patient_id = ?"
                style={{ marginTop: 4, fontFamily: 'monospace' }}
              />
            </Col>
            <Col>
              <Button
                type="primary"
                size="large"
                loading={loading}
                onClick={analyze}
                style={{ background: VI.accent, borderColor: VI.accent }}
              >
                {loading ? '分析中…' : '开始分析'}
              </Button>
            </Col>
          </Row>
        </Card>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在采样并生成优化建议…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={analyze}>
                重试
              </Button>
            }
          />
        )}

        {/* empty 态 */}
        {!loading && !error && !data && (
          <Alert
            type="info"
            showIcon
            message="设置 P95 阈值（默认 300ms），可选粘贴一条慢 SQL，点击「开始分析」识别慢路由并给出索引 / 缓存 / 去 N+1 建议。"
          />
        )}

        {!loading && !error && data && (
          <>
            {/* 核心指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="慢路由数"
                    value={data.slowRoutes.length}
                    valueStyle={{ color: data.slowRoutes.length > 0 ? VI.warn : undefined }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="优化建议数" value={data.sqlOptimizations.length} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="缓存命中率"
                    value={(data.cache.hitRate * 100).toFixed(1)}
                    suffix="%"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="缓存命中 / 未命中"
                    value={`${data.cache.hits} / ${data.cache.misses}`}
                  />
                </Card>
              </Col>
            </Row>

            {/* 慢路由表 */}
            <Card title={`慢路由清单（P95 > ${data.thresholdMs} ms）`} style={{ marginBottom: 16 }}>
              <Table
                rowKey="route"
                pagination={false}
                dataSource={data.slowRoutes}
                columns={slowColumns}
                locale={{ emptyText: '未发现 P95 超阈值的慢路由' }}
              />
            </Card>

            {/* SQL 优化建议表 */}
            <Card title="SQL 静态优化建议">
              <Table
                rowKey={(r) => `${r.kind}-${r.title}`}
                pagination={false}
                dataSource={data.sqlOptimizations}
                columns={optColumns}
                locale={{ emptyText: '未提供 SQL，或未命中任何优化规则' }}
              />
            </Card>

            <Paragraph type="secondary" style={{ marginTop: 16 }}>
              生成时间：{new Date(data.generatedAt).toLocaleTimeString()} · 本面板建议为静态规则输出，
              【持续优化】随真实慢查询样本扩充规则库。
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
