/**
 * 健澜科技 jlmedaios - M159-D 数据质量治理页（中期路线图，仅 admin）
 *
 * 【中期路线图】
 *  - 选择目标表（患者主索引 / 就诊主表）与周期，调用
 *    GET /api/v1/admin/data-quality/report?table=...&period=...；
 *  - 顶部展示综合质量分与整体态势（healthy/warning/critical）；
 *  - 五维逐项表格：完整性(非空率≥95%)/准确性(值域格式)/一致性(跨表外键)/
 *    及时性(更新≤24h)/唯一性(主键无重复)，达标绿色、不达标红色高亮；
 *  - 底部展开问题清单（含严重度与样本）。
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Layout,
  List,
  message,
  Radio,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
  dangerBg: '#fff1f0',
  dangerBorder: '#ffa39e',
  dangerText: '#cf1322',
  okText: '#389e0d',
};

/** 与 BFF QualityResult 对齐 */
interface DimensionResult {
  table: string;
  field: string;
  dimension: string;
  totalRows: number;
  passedRows: number;
  failedRows: number;
  passRate: number;
  threshold: number;
  status: 'pass' | 'fail';
  failedValues: unknown[];
  message: string;
}

/** 与 BFF Issue 对齐 */
interface IssueItem {
  table: string;
  field: string;
  dimension: string;
  severity: 'high' | 'medium' | 'low';
  count: number;
  examples: unknown[];
  description: string;
}

/** 与 BFF QualityReport 对齐 */
interface QualityReportData {
  table: string;
  period: string;
  generatedAt: string;
  overallScore: number;
  summary: { total: number; passed: number; failed: number };
  dimensionResults: DimensionResult[];
  issues: IssueItem[];
  status: 'healthy' | 'warning' | 'critical';
}

const DIM_LABEL: Record<string, string> = {
  completeness: '完整性',
  accuracy: '准确性',
  consistency: '一致性',
  timeliness: '及时性',
  uniqueness: '唯一性',
};

const STATUS_TAG: Record<QualityReportData['status'], { color: string; text: string }> = {
  healthy: { color: 'green', text: '健康' },
  warning: { color: 'orange', text: '预警' },
  critical: { color: 'red', text: '严重' },
};

const SEVERITY_TAG: Record<IssueItem['severity'], { color: string; text: string }> = {
  high: { color: 'red', text: '高' },
  medium: { color: 'orange', text: '中' },
  low: { color: 'blue', text: '低' },
};

export default function DataQualityAdminPage() {
  const [table, setTable] = useState<string>('patients');
  const [period] = useState<string>('today');
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<QualityReportData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `/api/v1/admin/data-quality/report?table=${table}&period=${period}`,
      );
      const json = await resp.json();
      if (json.code !== 0) {
        message.error(json.message || '数据质量报告加载失败');
        return;
      }
      setReport(json.data as QualityReportData);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  }, [table, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusTag = report ? STATUS_TAG[report.status] : null;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <style>{`
          .dq-failed-row > td {
            background: ${VI.dangerBg} !important;
            border-left: 4px solid ${VI.dangerBorder};
          }
        `}</style>

        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            数据质量治理
          </Title>
          <Paragraph type="secondary">
            中期路线图：对患者主索引 / 就诊主表做五维巡检——
            <Text strong style={{ color: VI.accent }}>
              完整性、准确性、一致性、及时性、唯一性
            </Text>
            ，输出综合质量分与问题定位清单。
          </Paragraph>
        </div>

        <Card
          style={{ marginBottom: 16 }}
          title="巡检范围"
          headStyle={{ background: VI.deep, color: '#fff' }}
        >
          <Space size="large">
            <Radio.Group
              value={table}
              onChange={(e) => setTable(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="patients">患者主索引</Radio.Button>
              <Radio.Button value="visits">就诊主表</Radio.Button>
            </Radio.Group>
            <Button
              type="primary"
              style={{ background: VI.accent, borderColor: VI.accent }}
              loading={loading}
              onClick={() => void load()}
            >
              刷新巡检
            </Button>
          </Space>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin size="large" tip="数据质量巡检中…" />
          </div>
        )}

        {!loading && report && statusTag && (
          <>
            <Card
              style={{ marginBottom: 16 }}
              title="综合质量态势"
              headStyle={{ background: VI.deep, color: '#fff' }}
            >
              <Space size="large" wrap>
                <Text style={{ fontSize: 20 }}>
                  综合评分
                  <Text strong style={{ color: VI.accent, fontSize: 28, marginLeft: 8 }}>
                    {report.overallScore}
                  </Text>
                  <Text type="secondary"> / 100</Text>
                </Text>
                <Tag color={statusTag.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {statusTag.text}
                </Tag>
                <Text type="secondary">
                  巡检表：{report.table}　周期：{report.period}　
                  通过 {report.summary.total - report.summary.failed} / {report.summary.total} 维
                </Text>
              </Space>
            </Card>

            <Card
              style={{ marginBottom: 16 }}
              title="五维检查结果（不达标红色高亮）"
              headStyle={{ background: VI.deep, color: '#fff' }}
            >
              <Table
                rowKey={(r) => `${r.dimension}-${r.field}`}
                size="small"
                pagination={false}
                dataSource={report.dimensionResults}
                rowClassName={(row) => (row.status === 'fail' ? 'dq-failed-row' : '')}
                columns={[
                  {
                    title: '维度',
                    dataIndex: 'dimension',
                    width: 110,
                    render: (d: string, row: DimensionResult) => (
                      <Text strong style={{ color: row.status === 'fail' ? VI.dangerText : VI.deep }}>
                        {DIM_LABEL[d] ?? d}
                      </Text>
                    ),
                  },
                  { title: '字段', dataIndex: 'field', width: 140 },
                  {
                    title: '达标率',
                    dataIndex: 'passRate',
                    width: 110,
                    render: (rate: number, row: DimensionResult) => (
                      <Text strong style={{ color: row.status === 'fail' ? VI.dangerText : VI.okText }}>
                        {rate}%
                      </Text>
                    ),
                  },
                  { title: '阈值', dataIndex: 'threshold', width: 80, render: (t: number) => `${t}%` },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 90,
                    render: (s: string) =>
                      s === 'pass' ? <Tag color="green">达标</Tag> : <Tag color="red">未达标</Tag>,
                  },
                  { title: '失败行数', dataIndex: 'failedRows', width: 90 },
                  {
                    title: '说明',
                    dataIndex: 'message',
                    render: (m: string, row: DimensionResult) => (
                      <Text style={{ color: row.status === 'fail' ? VI.dangerText : 'inherit' }}>
                        {m}
                      </Text>
                    ),
                  },
                ]}
              />
            </Card>

            <Card
              title={`问题定位清单（${report.issues.length}）`}
              headStyle={{ background: VI.deep, color: '#fff' }}
            >
              {report.issues.length === 0 ? (
                <Alert type="success" showIcon message="未发现数据质量问题，五维全部达标。" />
              ) : (
                <List
                  size="small"
                  dataSource={report.issues}
                  renderItem={(issue) => {
                    const sev = SEVERITY_TAG[issue.severity];
                    return (
                      <List.Item>
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Space>
                            <Tag color={sev.color}>{sev.text}风险</Tag>
                            <Tag>{DIM_LABEL[issue.dimension] ?? issue.dimension}</Tag>
                            <Text strong style={{ color: VI.dangerText }}>
                              {issue.description}
                            </Text>
                          </Space>
                          {issue.examples.length > 0 && (
                            <Text type="secondary">
                              样本：{issue.examples.slice(0, 5).join('，')}
                              {issue.examples.length > 5 ? ' …' : ''}
                            </Text>
                          )}
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
