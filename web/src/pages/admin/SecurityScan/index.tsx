/**
 * 健澜科技 jlmedaios - M166-D 系统安全深化：渗透测试与漏洞扫描页（仅 admin）
 *
 * 【绩效与人才】安全治理纳入团队季度绩效：展示五类攻击面（SQL注入/XSS/CSRF/敏感信息泄露/认证绕过）
 * 的巡检结果、带证据漏洞清单、风险分级与可落地修复建议。
 * 三态：loading / error（可重试）/ empty。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 * 【持续优化】接入静态 AST / 动态 fuzz 后，本页随 BFF 返回体自动升级，无需改动。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF SecurityScanView 对齐的类型 ---------------- */

type VulnCategory = 'sql_injection' | 'xss' | 'csrf' | 'info_leak' | 'auth_bypass';
type RiskBand = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface RankedVulnerability {
  id: string;
  category: VulnCategory;
  cwe: string;
  title: string;
  location: string;
  detail: string;
  evidence: string;
  severity: string;
  riskScore: number;
  band: RiskBand;
  fix: string;
}

interface CategorySummary {
  key: VulnCategory;
  label: string;
  checked: number;
  findings: number;
}

interface ScanSummary {
  totalChecks: number;
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  score: number;
}

interface SecurityScanReport {
  categories: CategorySummary[];
  vulnerabilities: RankedVulnerability[];
  summary: ScanSummary;
}

interface SecurityScanView {
  report: SecurityScanReport;
  generatedAt: number;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 风险带 → Tag 颜色与文案 */
function bandTag(band: RiskBand): { color: string; text: string } {
  switch (band) {
    case 'critical':
      return { color: 'error', text: '严重' };
    case 'high':
      return { color: 'warning', text: '高危' };
    case 'medium':
      return { color: 'orange', text: '中危' };
    case 'low':
      return { color: 'blue', text: '低危' };
    default:
      return { color: 'default', text: '提示' };
  }
}

/** 健康分 → 颜色 */
function scoreColor(score: number): string {
  if (score >= 90) return '#3f8600';
  if (score >= 70) return '#d48806';
  return '#cf1322';
}

export default function SecurityScanPage() {
  const [data, setData] = useState<SecurityScanView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/security/scan');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as SecurityScanView);
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
          渗透测试与漏洞扫描
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【M166-D】SQL 注入 · XSS · CSRF · 敏感信息泄露 · 认证绕过 · 真查漏洞不走过场 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="执行安全扫描中…" />
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
          <Alert type="info" showIcon message="暂无安全扫描数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && report && (
          <>
            {/* 总览指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="安全健康分"
                    value={summary?.score ?? 0}
                    suffix="/100"
                    valueStyle={{ color: scoreColor(summary?.score ?? 0) }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="巡检检查点"
                    value={summary?.totalChecks ?? 0}
                    valueStyle={{ color: VI.accent }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="命中漏洞"
                    value={summary?.totalFindings ?? 0}
                    valueStyle={{ color: (summary?.totalFindings ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="严重 / 高危"
                    value={`${summary?.critical ?? 0} / ${summary?.high ?? 0}`}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 五类攻击面巡检 */}
            <Card title="五类攻击面巡检" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                {report.categories.map((c) => (
                  <Col span={24 / 5} key={c.key}>
                    <Card size="small">
                      <Text strong>{c.label}</Text>
                      <Progress
                        percent={c.checked === 0 ? 100 : Math.max(0, 100 - (c.findings / c.checked) * 100)}
                        size="small"
                        strokeColor={c.findings > 0 ? '#cf1322' : '#3f8600'}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        检查 {c.checked} 项 · 命中 {c.findings} 项
                      </Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            {/* 漏洞清单（带证据 + 修复建议） */}
            <Card title={`漏洞清单（${report.vulnerabilities.length}，按风险分降序）`}>
              <Table
                rowKey={(r) => r.id}
                pagination={{ pageSize: 8, size: 'small' }}
                dataSource={report.vulnerabilities}
                columns={[
                  {
                    title: '风险',
                    dataIndex: 'band',
                    width: 90,
                    render: (band: RiskBand) => {
                      const t = bandTag(band);
                      return <Tag color={t.color}>{t.text}</Tag>;
                    },
                  },
                  { title: '分数', dataIndex: 'riskScore', width: 70, sorter: (a, b) => a.riskScore - b.riskScore },
                  {
                    title: '漏洞',
                    dataIndex: 'title',
                    render: (_: unknown, row: RankedVulnerability) => (
                      <div>
                        <Text strong>{row.title}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {row.cwe} · {row.location}
                        </Text>
                      </div>
                    ),
                  },
                  {
                    title: '证据',
                    dataIndex: 'evidence',
                    width: 260,
                    render: (ev: string) => (
                      <Text code style={{ fontSize: 11 }}>
                        {ev}
                      </Text>
                    ),
                  },
                  {
                    title: '修复建议',
                    dataIndex: 'fix',
                    render: (fix: string) => (
                      <Text style={{ fontSize: 12 }}>{fix}</Text>
                    ),
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
