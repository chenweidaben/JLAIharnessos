/**
 * 健澜科技 jlmedaios - M136-A 安全基线检查报告页（仅 admin，运维/安全工具）
 *
 * 展示 BFF /api/v1/admin/test/security 聚合结果：
 *  - 整体红 / 黄 / 绿结论；
 *  - 绿(pass) / 黄(warn) / 红(fail) 计数与达标率；
 *  - 五项基线逐条结果：写操作认证 / SQL 注入 / XSS / 患者数据脱敏 / 错误信息不泄露；
 *  - M136-A 新增：错误脱敏自检面板，逐样本展示「原始错误 → 生产环境客户端实际收到的文案」。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部），三色用 antd Tag 语义色。
 *
 * 持续优化：后续可加导出 PDF / 巡检定时任务钩子。
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

/** M136-A：错误脱敏单条样本 */
interface MaskingSample {
  label: string;
  raw: string;
  prodMessage: string;
  exposed: boolean;
  status: number;
}

/** M136-A：错误脱敏自检块 */
interface ErrorMaskingSelfTest {
  green: boolean;
  total: number;
  passed: number;
  samples: MaskingSample[];
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
  /** M136-A 新增：错误脱敏自检（可选，老后端返回时缺省） */
  errorMasking?: ErrorMaskingSelfTest;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 三色语义映射（绿 / 黄 / 红） */
const STATUS_META: Record<CheckStatus, { color: string; text: string; hex: string }> = {
  pass: { color: 'success', text: '通过', hex: '#3f8600' },
  warn: { color: 'warning', text: '关注', hex: '#d48806' },
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

export default function SecurityBaselinePage() {
  const [data, setData] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/test/security');
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
          安全基线检查
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          生产就绪质量门禁 · 仅 admin 可见 · 写认证 / SQL 注入 / XSS / 数据脱敏 / 错误脱敏
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
                  <Statistic title="绿 · 通过" value={s.pass} valueStyle={{ color: '#3f8600' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="黄 · 关注" value={s.warn} valueStyle={{ color: '#d48806' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="红 · 风险" value={s.fail} valueStyle={{ color: '#cf1322' }} />
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
            <Card title={`五项基线核查（共 ${s.total} 项）`}>
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

            {/* M136-A：错误脱敏自检面板 */}
            {data.errorMasking && (
              <Card
                style={{ marginTop: 16 }}
                title={
                  <span>
                    错误脱敏自检（M136-A）{' '}
                    <Tag color={data.errorMasking.green ? 'success' : 'error'}>
                      {data.errorMasking.green
                        ? `全绿 ${data.errorMasking.passed}/${data.errorMasking.total}`
                        : `${data.errorMasking.passed}/${data.errorMasking.total} 通过`}
                    </Tag>
                  </span>
                }
              >
                <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                  生产环境下，5xx 一律返回「系统繁忙，请稍后重试」；401/403/404 保持明确语义；
                  堆栈 / SQL / 物理路径 / 内网地址仅写服务端日志，不下发客户端。
                </Paragraph>
                <List
                  dataSource={data.errorMasking.samples}
                  renderItem={(s) => (
                    <List.Item style={{ borderLeft: `3px solid ${s.exposed ? '#cf1322' : '#3f8600'}`, paddingLeft: 12 }}>
                      <Row style={{ width: '100%' }}>
                        <Col flex="auto">
                          <Text strong>
                            [{s.status}] {s.label}
                          </Text>{' '}
                          <Tag color={s.exposed ? 'error' : 'success'}>{s.exposed ? '泄露' : '已脱敏'}</Tag>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            原始：<code style={{ wordBreak: 'break-all' }}>{s.raw}</code>
                          </Text>
                          <br />
                          <Text style={{ fontSize: 12, color: VI.accent }}>
                            客户端收到：<strong>{s.prodMessage}</strong>
                          </Text>
                        </Col>
                      </Row>
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </>
        )}
      </Content>
    </Layout>
  );
}
