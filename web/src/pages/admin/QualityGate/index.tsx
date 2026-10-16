/**
 * 健澜科技 jlmedaios - M157-C 200 版本质量门禁报告页（仅 admin）
 *
 * 【200版本里程碑】展示六项门禁复查：全路由冒烟 / 安全基线 / 性能基准 /
 * 测试覆盖率 / tsc 零报错 / UI 一致性。三色：通过(pass)/警告(warn)/风险(risk)。
 * 三态：loading / error(可重试) / empty。视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type GateStatus = 'pass' | 'warn' | 'risk';
type GateDimensionKey = 'smoke' | 'security' | 'performance' | 'coverage' | 'tsc' | 'ui';
type GateSeverity = 'high' | 'medium' | 'low';

interface GateMetric {
  label: string;
  value: string;
  status: GateStatus;
}

interface GateFinding {
  id: string;
  dimension: GateDimensionKey;
  severity: GateSeverity;
  message: string;
  suggestion: string;
}

interface GateDimension {
  key: GateDimensionKey;
  label: string;
  status: GateStatus;
  score: number;
  summary: string;
  metrics: GateMetric[];
  findings: GateFinding[];
}

/** 与 BFF qualityGateAggregator.fullQualityGate 输出对齐 */
interface QualityGateResult {
  version: string;
  overallStatus: GateStatus;
  passed: boolean;
  counts: { pass: number; warn: number; risk: number };
  dimensions: GateDimension[];
  findings: GateFinding[];
  topRisks: GateFinding[];
}

interface GateActionItem {
  priority: number;
  action: string;
  target: string;
  expectedGain: string;
  effort: 'S' | 'M' | 'L';
}

interface GateViCard {
  label: string;
  value: string;
  tone: GateStatus;
}

interface GateReportDoc {
  title: string;
  subtitle: string;
  overallStatus: GateStatus;
  passed: boolean;
  summary: string;
  highlights: string[];
  actionPlan: GateActionItem[];
  viCards: GateViCard[];
}

interface QualityGateView {
  gate: QualityGateResult;
  report: GateReportDoc;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 三色 -> 颜色（通过绿 / 警告橙 / 风险红） */
function statusColor(s: GateStatus): string {
  if (s === 'pass') return '#3f8600';
  if (s === 'warn') return '#d48806';
  return '#cf1322';
}

function statusTagColor(s: GateStatus): string {
  if (s === 'pass') return 'green';
  if (s === 'warn') return 'orange';
  return 'red';
}

function statusText(s: GateStatus): string {
  if (s === 'pass') return '通过';
  if (s === 'warn') return '警告';
  return '风险';
}

const SEVERITY_COLOR: Record<GateSeverity, string> = {
  high: 'red',
  medium: 'orange',
  low: 'default',
};

export default function QualityGatePage() {
  const [data, setData] = useState<QualityGateView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/quality-gate');
      const body = (await resp.json()) as { code: number; message?: string; data?: QualityGateView };
      if (body.code !== 0) {
        setError(body.message || '加载失败');
        setData(null);
        return;
      }
      setData(body.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const gate = data?.gate;
  const report = data?.report;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              {report?.title ?? '200 版本质量门禁报告'}
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              {report?.subtitle ?? '【M157-C · 200版本里程碑】六项质量门禁复查 · 仅 admin 可见'}
            </Paragraph>
          </Col>
          <Col>
            {gate && (
              <Tag color={statusTagColor(gate.overallStatus)} style={{ fontSize: 16, padding: '4px 12px' }}>
                门禁{statusText(gate.overallStatus)}
                {gate.passed ? '（可放行）' : '（不放行）'}
              </Tag>
            )}
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载质量门禁数据中…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => void load()}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无质量门禁数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && gate && report && (
          <>
            {/* VI 指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {report.viCards.map((card) => (
                <Col span={6} key={card.label}>
                  <Card>
                    <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                      {card.label}
                    </Paragraph>
                    <Title level={3} style={{ margin: 0, color: statusColor(card.tone) }}>
                      {card.value}
                    </Title>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 总结 + 红线 */}
            <Card style={{ marginBottom: 16 }}>
              <Paragraph style={{ marginBottom: 8 }}>{report.summary}</Paragraph>
              {report.highlights.map((h) => (
                <Paragraph key={h} style={{ marginBottom: 4 }}>
                  <Text style={{ color: VI.accent }}>● </Text>
                  {h}
                </Paragraph>
              ))}
            </Card>

            {/* 六维复查结论 */}
            <Card title="六项门禁复查" style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                pagination={false}
                dataSource={gate.dimensions}
                locale={{ emptyText: '暂无复查维度' }}
                columns={[
                  {
                    title: '复查项',
                    dataIndex: 'label',
                    width: 150,
                    render: (v: string, row: GateDimension) => (
                      <div>
                        <Text strong>{v}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {row.score} 分
                        </Text>
                      </div>
                    ),
                  },
                  {
                    title: '结论',
                    dataIndex: 'status',
                    width: 90,
                    render: (v: GateStatus) => <Tag color={statusTagColor(v)}>{statusText(v)}</Tag>,
                  },
                  { title: '复查结论', dataIndex: 'summary', ellipsis: true },
                  {
                    title: '指标',
                    dataIndex: 'metrics',
                    render: (metrics: GateMetric[]) => (
                      <span>
                        {metrics.map((m) => (
                          <Tag key={m.label} color={statusTagColor(m.status)} style={{ marginBottom: 2 }}>
                            {m.label} {m.value}
                          </Tag>
                        ))}
                      </span>
                    ),
                  },
                ]}
              />
            </Card>

            {/* 风险发现清单 */}
            <Card title={`风险发现（${gate.findings.length}）`} style={{ marginBottom: 16 }}>
              <Table
                rowKey="id"
                pagination={false}
                dataSource={gate.findings}
                locale={{ emptyText: '无风险发现，六项全部通过' }}
                columns={[
                  {
                    title: '维度',
                    dataIndex: 'dimension',
                    width: 110,
                    render: (_: unknown, row: GateFinding) =>
                      row.dimension ? (
                        <Tag color="blue">{gate.dimensions.find((d) => d.key === row.dimension)?.label ?? row.dimension}</Tag>
                      ) : null,
                  },
                  {
                    title: '严重度',
                    dataIndex: 'severity',
                    width: 90,
                    render: (v: GateSeverity) => <Tag color={SEVERITY_COLOR[v]}>{v}</Tag>,
                  },
                  { title: '问题', dataIndex: 'message', ellipsis: true },
                  { title: '整改建议', dataIndex: 'suggestion', ellipsis: true },
                ]}
              />
            </Card>

            {/* 整改计划 */}
            <Card title="优先级整改计划">
              <Table
                rowKey="priority"
                pagination={false}
                dataSource={report.actionPlan}
                locale={{ emptyText: '暂无整改计划' }}
                columns={[
                  { title: '优先级', dataIndex: 'priority', width: 80 },
                  { title: '整改动作', dataIndex: 'action', ellipsis: true },
                  { title: '目标', dataIndex: 'target', width: 220, ellipsis: true },
                  { title: '预计收益', dataIndex: 'expectedGain', width: 180 },
                  {
                    title: '工作量',
                    dataIndex: 'effort',
                    width: 90,
                    render: (v: GateActionItem['effort']) => <Tag color="blue">{v}</Tag>,
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
