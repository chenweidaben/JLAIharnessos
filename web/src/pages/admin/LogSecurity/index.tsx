/**
 * 健澜科技 jlmedaios - M167-C 信息泄露修复与日志安全验证页（仅 admin）
 *
 * 【安全修复与质量提升】展示日志 PII（身份证号 / 手机号 / 银行卡号）真检结果、
 * 命中清单（证据已脱敏）、安全分与「脱敏前 → 脱敏后」修复对照，
 * 用于验证「日志不打印 PII、生产错误不泄堆栈/SQL」两条泄露面已收敛。
 * 三态：loading / error（可重试）/ empty。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF LogSecurityView 对齐的类型 ---------------- */

type PIIType = 'idCard' | 'phone' | 'bankCard';

interface LogPIIFinding {
  lineIndex: number;
  type: PIIType;
  typeLabel: string;
  redactedEvidence: string;
  redactedLinePreview: string;
}

interface LogVerifySummary {
  checkedLines: number;
  totalFindings: number;
  idCard: number;
  phone: number;
  bankCard: number;
  pass: boolean;
  score: number;
}

interface LogVerifyReport {
  findings: LogPIIFinding[];
  summary: LogVerifySummary;
  redactionSamples: Array<{ before: string; after: string }>;
}

interface LogSecurityView {
  report: LogVerifyReport;
  generatedAt: number;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** PII 类型 → Tag 颜色 */
function typeColor(type: PIIType): string {
  switch (type) {
    case 'idCard':
      return 'error';
    case 'phone':
      return 'warning';
    case 'bankCard':
      return 'orange';
    default:
      return 'default';
  }
}

/** 安全分 → 颜色 */
function scoreColor(score: number): string {
  if (score >= 90) return '#3f8600';
  if (score >= 70) return '#d48806';
  return '#cf1322';
}

export default function LogSecurityPage() {
  const [data, setData] = useState<LogSecurityView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/security/log-verify');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as LogSecurityView);
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

  const report = data?.report;
  const summary = report?.summary;

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
          信息泄露修复与日志安全验证
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【M167-C】日志 PII 真检（身份证号 / 手机号 / 银行卡号）· 生产错误不泄堆栈与 SQL · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="执行日志安全验证中…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {/* empty 态 */}
        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无日志安全验证数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && report && summary && (
          <>
            {/* 总览指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="日志安全分"
                    value={summary.score}
                    suffix="/100"
                    valueStyle={{ color: scoreColor(summary.score) }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="检查日志行数"
                    value={summary.checkedLines}
                    valueStyle={{ color: VI.accent }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="命中 PII"
                    value={summary.totalFindings}
                    valueStyle={{ color: summary.totalFindings > 0 ? '#cf1322' : '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="验证结论"
                    value={summary.pass ? '通过' : '未通过'}
                    valueStyle={{ color: summary.pass ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 三类 PII 巡检 */}
            <Card title="三类 PII 命中分布" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                {(
                  [
                    { label: '身份证号', value: summary.idCard },
                    { label: '手机号', value: summary.phone },
                    { label: '银行卡号', value: summary.bankCard },
                  ] as const
                ).map((item) => (
                  <Col span={8} key={item.label}>
                    <Card size="small">
                      <Text strong>{item.label}</Text>
                      <Progress
                        percent={summary.totalFindings === 0 ? 100 : (item.value / summary.totalFindings) * 100}
                        size="small"
                        strokeColor={item.value > 0 ? '#cf1322' : '#3f8600'}
                        format={() => `${item.value} 处`}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            {/* PII 命中清单（证据已脱敏） */}
            <Card title={`PII 命中清单（${report.findings.length}，证据已脱敏）`} style={{ marginBottom: 16 }}>
              {report.findings.length === 0 ? (
                <Alert type="success" showIcon message="基线日志样本零 PII 命中，日志输出管道脱敏生效。" />
              ) : (
                <Table
                  rowKey={(r) => `${r.lineIndex}-${r.type}-${r.redactedEvidence}`}
                  pagination={false}
                  dataSource={report.findings}
                  columns={[
                    { title: '行号', dataIndex: 'lineIndex', width: 70, render: (v: number) => `#${v + 1}` },
                    {
                      title: '类型',
                      dataIndex: 'type',
                      width: 110,
                      render: (type: PIIType, row: LogPIIFinding) => <Tag color={typeColor(type)}>{row.typeLabel}</Tag>,
                    },
                    {
                      title: '脱敏证据',
                      dataIndex: 'redactedEvidence',
                      width: 220,
                      render: (ev: string) => (
                        <Text code style={{ fontSize: 12 }}>
                          {ev}
                        </Text>
                      ),
                    },
                    {
                      title: '脱敏行预览',
                      dataIndex: 'redactedLinePreview',
                      render: (line: string) => (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {line}
                        </Text>
                      ),
                    },
                  ]}
                />
              )}
            </Card>

            {/* 修复对照：脱敏前 → 脱敏后 */}
            <Card title="修复对照：脱敏前 → 脱敏后">
              {report.redactionSamples.length === 0 ? (
                <Alert type="info" showIcon message="暂无问题日志样例。" />
              ) : (
                <Table
                  rowKey={(r) => r.after}
                  pagination={{ pageSize: 5, size: 'small' }}
                  dataSource={report.redactionSamples}
                  columns={[
                    {
                      title: '脱敏前（含 PII）',
                      dataIndex: 'before',
                      render: (v: string) => (
                        <Text style={{ fontSize: 12, color: '#cf1322' }}>{v}</Text>
                      ),
                    },
                    {
                      title: '脱敏后（可安全落盘）',
                      dataIndex: 'after',
                      render: (v: string) => (
                        <Text style={{ fontSize: 12, color: '#3f8600' }}>{v}</Text>
                      ),
                    },
                  ]}
                />
              )}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
