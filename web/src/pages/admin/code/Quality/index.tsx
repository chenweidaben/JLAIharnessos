/**
 * 健澜科技 jlmedaios - M150-B 代码质量报告页（仅 admin）
 *
 * 【代码质量提升】展示五维治理：any / @ts-ignore / console.log / 未使用变量 /
 * 圈复杂度。三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。持续优化。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type IssueCategory = 'any' | 'ts-ignore' | 'console-log' | 'unused-vars' | 'complexity';
type Severity = 'high' | 'medium' | 'low';
type IssueStatus = 'open' | 'fixed' | 'monitor';

/** 与 BFF codeQualityAggregator 输出对齐 */
interface QualityIssue {
  id: string;
  category: IssueCategory;
  file: string;
  symbol: string;
  message: string;
  count: number;
  severity: Severity;
  suggestion: string;
  status: IssueStatus;
}

interface CategorySummary {
  category: IssueCategory;
  label: string;
  openCount: number;
  fixedCount: number;
  maxSeverity: Severity | 'none';
}

interface QualityScan {
  scope: string;
  totalFiles: number;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D';
  totals: { open: number; fixed: number; byCategory: Record<IssueCategory, number> };
  categories: CategorySummary[];
  issues: QualityIssue[];
  topRisks: QualityIssue[];
}

interface ActionItem {
  priority: number;
  action: string;
  target: string;
  expectedGain: string;
  effort: 'S' | 'M' | 'L';
}

interface ViCard {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'bad';
}

interface QualityReportDoc {
  title: string;
  subtitle: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  summary: string;
  highlights: string[];
  actionPlan: ActionItem[];
  viCards: ViCard[];
}

interface QualityView {
  scan: QualityScan;
  report: QualityReportDoc;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const SEVERITY_COLOR: Record<Severity, string> = {
  high: 'red',
  medium: 'orange',
  low: 'default',
};

const CATEGORY_COLOR: Record<IssueCategory, string> = {
  any: 'volcano',
  'ts-ignore': 'magenta',
  'console-log': 'gold',
  'unused-vars': 'cyan',
  complexity: 'geekblue',
};

/** VI 卡片色调 -> 颜色 */
function toneColor(tone: ViCard['tone']): string {
  if (tone === 'good') return '#3f8600';
  if (tone === 'warn') return '#d48806';
  return '#cf1322';
}

export default function CodeQualityPage() {
  const [data, setData] = useState<QualityView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/code/quality');
      const body = (await resp.json()) as { code: number; message?: string; data?: QualityView };
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

  const scan = data?.scan;
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
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          {report?.title ?? '代码质量报告'}
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          {report?.subtitle ?? '【M150-B】五维代码质量治理 · 仅 admin 可见'}
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载代码质量数据中…" />
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
          <Alert type="info" showIcon message="暂无代码质量数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && scan && report && (
          <>
            {/* VI 指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {report.viCards.map((card) => (
                <Col span={6} key={card.label}>
                  <Card>
                    <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                      {card.label}
                    </Paragraph>
                    <Title level={3} style={{ margin: 0, color: toneColor(card.tone) }}>
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

            {/* 五维汇总 */}
            <Card title="五维检查项汇总" style={{ marginBottom: 16 }}>
              <Table
                rowKey="category"
                pagination={false}
                dataSource={scan.categories}
                locale={{ emptyText: '暂无检查项' }}
                columns={[
                  {
                    title: '检查项',
                    dataIndex: 'label',
                    render: (v: string, row: CategorySummary) => (
                      <Tag color={CATEGORY_COLOR[row.category]}>{v}</Tag>
                    ),
                  },
                  { title: '待整改', dataIndex: 'openCount', width: 100 },
                  { title: '已闭环', dataIndex: 'fixedCount', width: 100 },
                  {
                    title: '最高严重度',
                    dataIndex: 'maxSeverity',
                    width: 120,
                    render: (v: Severity | 'none') =>
                      v === 'none' ? (
                        <Tag color="green">无</Tag>
                      ) : (
                        <Tag color={SEVERITY_COLOR[v]}>{v}</Tag>
                      ),
                  },
                ]}
              />
            </Card>

            {/* 问题清单 */}
            <Card title="问题清单（按风险排序）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="id"
                pagination={false}
                dataSource={scan.issues}
                locale={{ emptyText: '暂无 open 问题' }}
                columns={[
                  {
                    title: '类别',
                    dataIndex: 'category',
                    width: 110,
                    render: (v: IssueCategory) => <Tag color={CATEGORY_COLOR[v]}>{v}</Tag>,
                  },
                  {
                    title: '文件 / 符号',
                    dataIndex: 'file',
                    width: 260,
                    render: (_: unknown, row: QualityIssue) => (
                      <div>
                        <Text code>{row.file}</Text>
                        <br />
                        <Text type="secondary">{row.symbol}</Text>
                      </div>
                    ),
                  },
                  { title: '问题', dataIndex: 'message', ellipsis: true },
                  { title: '次数', dataIndex: 'count', width: 80 },
                  {
                    title: '严重度',
                    dataIndex: 'severity',
                    width: 90,
                    render: (v: Severity) => <Tag color={SEVERITY_COLOR[v]}>{v}</Tag>,
                  },
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
                  { title: '目标', dataIndex: 'target', width: 260, ellipsis: true },
                  { title: '预计收益', dataIndex: 'expectedGain', width: 200 },
                  {
                    title: '工作量',
                    dataIndex: 'effort',
                    width: 90,
                    render: (v: ActionItem['effort']) => <Tag color="blue">{v}</Tag>,
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
