/**
 * 健澜科技 jlmedaios - M149-B 安全基线报告页（仅 admin，运维 / 安全工具）
 *
 * 展示 BFF GET /api/v1/admin/security/report 聚合结果：
 *  - 整体红 / 黄 / 绿结论；
 *  - 绿(pass) / 黄(warn) / 红(fail) 计数与达标率；
 *  - 七项基线逐条结果：写认证 / SQL 注入 / XSS / 患者 PII 脱敏 / 错误不泄露 /
 *    token 过期 / 密码哈希 / 审计日志完整性。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部），三色用语义色
 *       绿 #3f8600 / 警告黄 #d48806 / 风险红 #cf1322。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Progress, Row, Spin, Statistic, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF generateSecurityReport 输出对齐 */
type CheckStatus = 'pass' | 'warn' | 'fail';
type RiskLevel = 'high' | 'medium' | 'low';

interface CheckItem {
  id: string;
  title: string;
  risk: RiskLevel;
  status: CheckStatus;
  detail: string;
  evidence: string;
  recommendation: string;
}

interface SecurityReport {
  baseUrl: string;
  generatedAt: string;
  summary: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
    passRate: number;
    overall: CheckStatus;
  };
  byRisk: Record<RiskLevel, number>;
  checks: CheckItem[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 三色语义映射（通过绿 / 警告黄 / 风险红） */
const STATUS_META: Record<CheckStatus, { color: string; text: string; hex: string }> = {
  pass: { color: 'success', text: '通过', hex: '#3f8600' },
  warn: { color: 'warning', text: '警告', hex: '#d48806' },
  fail: { color: 'error', text: '风险', hex: '#cf1322' },
};

const RISK_META: Record<RiskLevel, { color: string; text: string }> = {
  high: { color: 'red', text: '高风险' },
  medium: { color: 'orange', text: '中风险' },
  low: { color: 'blue', text: '低风险' },
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN');
}

export default function SecurityReportPage() {
  const [data, setData] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/security/report');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as SecurityReport);
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

  const s = data?.summary;
  const overall = s?.overall ?? 'pass';
  const overallMeta = STATUS_META[overall];
  const passPct = s ? Math.round(s.passRate * 100) : 0;

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
          安全基线报告
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          生产质量门禁 · 仅 admin 可见 · 写认证 / SQL 注入 / XSS / PII 脱敏 / 错误不泄露 /
          Token 过期 / 密码哈希 / 审计链完整性
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在执行安全基线核查…" />
          </div>
        )}

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

        {!loading && !error && data && s && (
          <>
            {/* 整体结论横幅 */}
            <Card style={{ marginBottom: 16 }}>
              <Row align="middle" gutter={16}>
                <Col>
                  <span style={{ color: 'rgba(0,0,0,0.65)', marginRight: 12 }}>整体安全基线</span>
                  <Tag color={overallMeta.color} style={{ fontSize: 16, padding: '4px 16px' }}>
                    {overallMeta.text}
                  </Tag>
                </Col>
                <Col>
                  <Text type="secondary">目标：{data.baseUrl}</Text>
                </Col>
                <Col flex="auto" style={{ textAlign: 'right' }}>
                  <Text type="secondary">生成时间：{fmtTime(data.generatedAt)}</Text>
                </Col>
              </Row>
            </Card>

            {/* 三色计数与达标率 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="绿 · 通过" valueStyle={{ color: '#3f8600' }} value={s.pass} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="黄 · 警告" valueStyle={{ color: '#d48806' }} value={s.warn} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="红 · 风险" valueStyle={{ color: '#cf1322' }} value={s.fail} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="基线达标率">
                  <Progress
                    percent={passPct}
                    size="small"
                    status={s.fail > 0 ? 'exception' : s.warn > 0 ? 'normal' : 'success'}
                  />
                </Card>
              </Col>
            </Row>

            {/* 逐条检查 */}
            <Card title={`七项基线核查（共 ${s.total} 项）`}>
              <List
                dataSource={data.checks}
                renderItem={(item) => {
                  const meta = STATUS_META[item.status];
                  const risk = RISK_META[item.risk];
                  return (
                    <List.Item style={{ borderLeft: `4px solid ${meta.hex}`, paddingLeft: 16 }}>
                      <Row style={{ width: '100%' }}>
                        <Col flex="auto">
                          <Text strong>{item.title}</Text>{' '}
                          <Tag color={meta.color}>{meta.text}</Tag>{' '}
                          <Tag color={risk.color}>{risk.text}</Tag>
                          <Paragraph style={{ margin: '8px 0 4px' }}>{item.detail}</Paragraph>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            证据：{item.evidence}
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            建议：{item.recommendation}
                          </Text>
                        </Col>
                      </Row>
                    </List.Item>
                  );
                }}
              />
            </Card>

            {/* 风险分桶说明 */}
            <Card style={{ marginTop: 16 }} size="small" title="风险分布">
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary">高风险项：</Text>
                  <Tag color="red">{data.byRisk.high ?? 0}</Tag>
                </Col>
                <Col span={8}>
                  <Text type="secondary">中风险项：</Text>
                  <Tag color="orange">{data.byRisk.medium ?? 0}</Tag>
                </Col>
                <Col span={8}>
                  <Text type="secondary">低风险项：</Text>
                  <Tag color="blue">{data.byRisk.low ?? 0}</Tag>
                </Col>
              </Row>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
