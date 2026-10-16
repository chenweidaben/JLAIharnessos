/**
 * 健澜科技 jlmedaios - M181-C 300 版本质量门禁 V2 报告页（仅 admin）
 *
 * 【300版本里程碑】展示八项门禁复查：全路由冒烟 / 安全基线(含CSRF) /
 * 性能基准(含吞吐) / 测试覆盖率≥99% / tsc零新增报错 / UI一致性 /
 * 等保三级合规 / 医疗安全底线。三色：通过(pass)/警告(warn)/风险(risk)。
 * 三态：loading / error(可重试) / empty。视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type GateV2Status = 'pass' | 'warn' | 'risk';
type GateV2DimensionKey =
  | 'smoke'
  | 'security'
  | 'performance'
  | 'coverage'
  | 'tsc'
  | 'ui'
  | 'dengbao'
  | 'medical';
type GateV2Severity = 'high' | 'medium' | 'low';

interface GateV2Metric {
  label: string;
  value: string;
  status: GateV2Status;
}

interface GateV2Finding {
  id: string;
  dimension: GateV2DimensionKey;
  severity: GateV2Severity;
  message: string;
  suggestion: string;
}

interface GateV2Dimension {
  key: GateV2DimensionKey;
  label: string;
  status: GateV2Status;
  score: number;
  summary: string;
  metrics: GateV2Metric[];
  findings: GateV2Finding[];
}

/** 与 BFF qualityGateV2Aggregator.fullQualityGateV2 输出对齐 */
interface QualityGateV2Result {
  version: string;
  overallStatus: GateV2Status;
  passed: boolean;
  counts: { pass: number; warn: number; risk: number };
  dimensions: GateV2Dimension[];
  findings: GateV2Finding[];
  topRisks: GateV2Finding[];
}

interface GateV2ActionItem {
  priority: number;
  action: string;
  target: string;
  expectedGain: string;
  effort: 'S' | 'M' | 'L';
}

interface GateV2ViCard {
  label: string;
  value: string;
  tone: GateV2Status;
}

interface GateV2ReportDoc {
  title: string;
  subtitle: string;
  overallStatus: GateV2Status;
  passed: boolean;
  summary: string;
  highlights: string[];
  actionPlan: GateV2ActionItem[];
  viCards: GateV2ViCard[];
}

interface QualityGateV2View {
  gate: QualityGateV2Result;
  report: GateV2ReportDoc;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 三色 -> 颜色（通过绿 / 警告橙 / 风险红） */
function statusColor(s: GateV2Status): string {
  if (s === 'pass') return '#3f8600';
  if (s === 'warn') return '#d48806';
  return '#cf1322';
}

function statusTagColor(s: GateV2Status): string {
  if (s === 'pass') return 'green';
  if (s === 'warn') return 'orange';
  return 'red';
}

function statusText(s: GateV2Status): string {
  if (s === 'pass') return '通过';
  if (s === 'warn') return '警告';
  return '风险';
}

const SEVERITY_COLOR: Record<GateV2Severity, string> = {
  high: 'red',
  medium: 'orange',
  low: 'default',
};

export default function QualityGateV2Page() {
  const [data, setData] = useState<QualityGateV2View | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/quality-gate/v2');
      const body = (await resp.json()) as { code: number; message?: string; data?: QualityGateV2View };
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
              {report?.title ?? '300 版本质量门禁报告 V2'}
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              {report?.subtitle ?? '【M181-C · 300版本里程碑】八项质量门禁复查 · 仅 admin 可见'}
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
            <Spin size="large" tip="加载质量门禁 V2 数据中…" />
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
          <Alert type="info" showIcon message="暂无质量门禁 V2 数据，稍后刷新即可。" />
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

            {/* 八维复查结论 */}
            <Card title="八项门禁复查" style={{ marginBottom: 16 }}>
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
                    render: (v: string, row: GateV2Dimension) => (
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
                    render: (v: GateV2Status) => <Tag color={statusTagColor(v)}>{statusText(v)}</Tag>,
                  },
                  { title: '复查结论', dataIndex: 'summary', ellipsis: true },
                  {
                    title: '指标',
                    dataIndex: 'metrics',
                    render: (metrics: GateV2Metric[]) => (
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
                locale={{ emptyText: '无风险发现，八项全部通过' }}
                columns={[
                  {
                    title: '维度',
                    dataIndex: 'dimension',
                    width: 120,
                    render: (_: unknown, row: GateV2Finding) =>
                      row.dimension ? (
                        <Tag color="blue">
                          {gate.dimensions.find((d) => d.key === row.dimension)?.label ?? row.dimension}
                        </Tag>
                      ) : null,
                  },
                  {
                    title: '严重度',
                    dataIndex: 'severity',
                    width: 90,
                    render: (v: GateV2Severity) => <Tag color={SEVERITY_COLOR[v]}>{v}</Tag>,
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
                  { title: '目标', dataIndex: 'target', width: 240, ellipsis: true },
                  { title: '预计收益', dataIndex: 'expectedGain', width: 180 },
                  {
                    title: '工作量',
                    dataIndex: 'effort',
                    width: 90,
                    render: (v: GateV2ActionItem['effort']) => <Tag color="blue">{v}</Tag>,
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
