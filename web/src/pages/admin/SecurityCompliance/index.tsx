/**
 * 健澜科技 jlmedaios - M163-A 等保三级 安全合规页（仅 admin，安全与运营）
 *
 * 展示 BFF GET /api/v1/admin/security/compliance 聚合结果：
 *  - 标准：GB/T 22239-2019 等保三级；
 *  - 五大类 15 项控制：身份鉴别 / 访问控制 / 安全审计 / 数据安全 / 入侵防范；
 *  - 整体红 / 黄 / 绿结论、三类计数、达标率、按大类分桶。
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

type ComplianceStatus = 'pass' | 'warn' | 'fail';
type ComplianceDomain = 'identity' | 'access' | 'audit' | 'data' | 'intrusion';

interface CheckItem {
  id: string;
  domain: ComplianceDomain;
  title: string;
  status: ComplianceStatus;
  detail: string;
  evidence: string;
  recommendation: string;
}

interface ComplianceReport {
  standard: string;
  standardCode: string;
  generatedAt: string;
  summary: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
    passRate: number;
    overall: ComplianceStatus;
  };
  byDomain: Record<
    ComplianceDomain,
    { total: number; pass: number; warn: number; fail: number; label: string }
  >;
  checks: CheckItem[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const STATUS_META: Record<ComplianceStatus, { color: string; text: string; hex: string }> = {
  pass: { color: 'success', text: '符合', hex: '#3f8600' },
  warn: { color: 'warning', text: '待加固', hex: '#d48806' },
  fail: { color: 'error', text: '不合规', hex: '#cf1322' },
};

const DOMAIN_ORDER: ComplianceDomain[] = ['identity', 'access', 'audit', 'data', 'intrusion'];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN');
}

export default function SecurityCompliancePage() {
  const [data, setData] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/security/compliance');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as ComplianceReport);
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
          等保三级 · 安全合规
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          {data?.standardCode ?? 'GB/T 22239-2019'} · 身份鉴别 / 访问控制 / 安全审计 / 数据安全 /
          入侵防范 · 真查不走场
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在执行等保三级合规核查…" />
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
            {/* 整体结论 */}
            <Card style={{ marginBottom: 16 }}>
              <Row align="middle" gutter={16}>
                <Col>
                  <span style={{ color: 'rgba(0,0,0,0.65)', marginRight: 12 }}>整体合规结论</span>
                  <Tag color={overallMeta.color} style={{ fontSize: 16, padding: '4px 16px' }}>
                    {overallMeta.text}
                  </Tag>
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
                  <Statistic title="绿 · 符合" valueStyle={{ color: '#3f8600' }} value={s.pass} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="黄 · 待加固" valueStyle={{ color: '#d48806' }} value={s.warn} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="红 · 不合规" valueStyle={{ color: '#cf1322' }} value={s.fail} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="合规达标率">
                  <Progress
                    percent={passPct}
                    size="small"
                    status={s.fail > 0 ? 'exception' : s.warn > 0 ? 'normal' : 'success'}
                  />
                </Card>
              </Col>
            </Row>

            {/* 五大类分桶 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {DOMAIN_ORDER.map((d) => {
                const b = data.byDomain[d];
                if (!b) return null;
                const domStatus: ComplianceStatus =
                  b.fail > 0 ? 'fail' : b.warn > 0 ? 'warn' : 'pass';
                return (
                  <Col span={8} key={d}>
                    <Card size="small">
                      <Row align="middle" justify="space-between">
                        <Text strong>{b.label}</Text>
                        <Tag color={STATUS_META[domStatus].color}>{STATUS_META[domStatus].text}</Tag>
                      </Row>
                      <Row gutter={8} style={{ marginTop: 8 }}>
                        <Col>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            符合 {b.pass}
                          </Text>
                        </Col>
                        <Col>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            待加固 {b.warn}
                          </Text>
                        </Col>
                        <Col>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            不合规 {b.fail}
                          </Text>
                        </Col>
                        <Col flex="auto" style={{ textAlign: 'right' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            共 {b.total} 项
                          </Text>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* 逐条控制 */}
            <Card title={`等保三级控制项（共 ${s.total} 项）`}>
              <List
                dataSource={data.checks}
                renderItem={(item) => {
                  const meta = STATUS_META[item.status];
                  const domLabel = data.byDomain[item.domain]?.label ?? item.domain;
                  return (
                    <List.Item style={{ borderLeft: `4px solid ${meta.hex}`, paddingLeft: 16 }}>
                      <Row style={{ width: '100%' }}>
                        <Col flex="auto">
                          <Text strong>{item.title}</Text>{' '}
                          <Tag>{domLabel}</Tag> <Tag color={meta.color}>{meta.text}</Tag>
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
          </>
        )}
      </Content>
    </Layout>
  );
}
