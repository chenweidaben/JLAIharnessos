/**
 * 健澜科技 jlmedaios - M174-A 医院数据安全深化 · 等保三级复查页（仅 admin）
 *
 * 展示 BFF GET /api/v1/admin/security/recheck 聚合结果：
 *  - 复查结论：整体红/黄/绿、本轮已闭环数、部分整改数、回退数、未闭环数；
 *  - 整改证据：上一轮 fail/warn 项经本轮快照核验的闭环证明；
 *  - 漂移告警：基线 pass 项本轮回退为 warn/fail（配置漂移）；
 *  - 安全趋势：近 30/90/180 天达标率走势。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部），三色用语义色
 *       绿 #3f8600 / 警告黄 #d48806 / 风险红 #cf1322。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type ComplianceStatus = 'pass' | 'warn' | 'fail';
type ComplianceDomain = 'identity' | 'access' | 'audit' | 'data' | 'intrusion';

type DeltaKind =
  | 'fixed'
  | 'improved'
  | 'regressed'
  | 'unchanged-pass'
  | 'unchanged-warn'
  | 'unchanged-fail'
  | 'new';

interface RecheckCheckItem {
  id: string;
  domain: ComplianceDomain;
  title: string;
  status: ComplianceStatus;
  previousStatus: ComplianceStatus;
  delta: DeltaKind;
  detail: string;
  evidence: string;
  remediationProof?: string;
  recommendation: string;
}

interface RecheckReport {
  standard: string;
  standardCode: string;
  recheckId: string;
  recheckAt: string;
  round: number;
  baselineAt: string;
  summary: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
    passRate: number;
    overall: ComplianceStatus;
    fixedCount: number;
    improvedCount: number;
    regressedCount: number;
    openFailCount: number;
  };
  byDomain: Record<ComplianceDomain, { total: number; pass: number; warn: number; fail: number; label: string }>;
  checks: RecheckCheckItem[];
  openIssues: string[];
  remediationProofs: string[];
}

interface FixTracking {
  previousAt: string;
  currentAt: string;
  fixed: Array<{ id: string; title: string; from: ComplianceStatus; to: ComplianceStatus }>;
  improved: Array<{ id: string; title: string; from: ComplianceStatus; to: ComplianceStatus }>;
  regressed: Array<{ id: string; title: string; from: ComplianceStatus; to: ComplianceStatus; detail: string }>;
  stillFailing: Array<{ id: string; title: string; detail: string }>;
  newItems: Array<{ id: string; title: string; status: ComplianceStatus }>;
  removedItems: string[];
  passRateDelta: number;
}

interface TrendPoint {
  label: string;
  passRate: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  overall: ComplianceStatus;
}

interface SecurityTrend {
  period: '30d' | '90d' | '180d';
  direction: 'improving' | 'degrading' | 'flat';
  points: TrendPoint[];
  bestPassRate: number;
  worstPassRate: number;
  delta: number;
}

interface ApiData {
  recheck: RecheckReport;
  tracking: FixTracking;
  trend: SecurityTrend;
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

const DELTA_META: Record<DeltaKind, { color: string; text: string }> = {
  fixed: { color: 'success', text: '已闭环' },
  improved: { color: 'processing', text: '部分整改' },
  regressed: { color: 'error', text: '回退/漂移' },
  'unchanged-pass': { color: 'default', text: '持续符合' },
  'unchanged-warn': { color: 'warning', text: '持续待加固' },
  'unchanged-fail': { color: 'error', text: '未整改' },
  new: { color: 'purple', text: '本轮新查' },
};

const DOMAIN_ORDER: ComplianceDomain[] = ['identity', 'access', 'audit', 'data', 'intrusion'];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN');
}

export default function SecurityRecheckPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'30d' | '90d' | '180d'>('90d');

  const load = async (p: '30d' | '90d' | '180d' = period) => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/v1/admin/security/recheck?period=${p}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as ApiData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r = data?.recheck;
  const s = r?.summary;
  const overall = s?.overall ?? 'pass';
  const overallMeta = STATUS_META[overall];
  const passPct = s ? Math.round(s.passRate * 100) : 0;

  const trend = useMemo(() => data?.trend, [data]);

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
          等保三级 · 复查（第 {r?.round ?? 2} 轮）
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          {r?.standardCode ?? 'GB/T 22239-2019'} · 整改证据核验 / 配置漂移检测 / 修复跟踪 · 真查不走场
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在执行等保三级复查…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => load()}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && data && r && s && (
          <>
            {/* 整体结论 */}
            <Card style={{ marginBottom: 16 }}>
              <Row align="middle" gutter={16}>
                <Col>
                  <span style={{ color: 'rgba(0,0,0,0.65)', marginRight: 12 }}>复查结论</span>
                  <Tag color={overallMeta.color} style={{ fontSize: 16, padding: '4px 16px' }}>
                    {overallMeta.text}
                  </Tag>
                  <Text type="secondary" style={{ marginLeft: 12 }}>
                    {r.recheckId}
                  </Text>
                </Col>
                <Col flex="auto" style={{ textAlign: 'right' }}>
                  <Text type="secondary">复查时间：{fmtTime(r.recheckAt)}</Text>
                  <br />
                  <Text type="secondary">上轮基线：{fmtTime(r.baselineAt)}</Text>
                </Col>
              </Row>
            </Card>

            {/* 修复跟踪计数 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="本轮已闭环" valueStyle={{ color: '#3f8600' }} value={s.fixedCount} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="部分整改" valueStyle={{ color: '#1e6fbf' }} value={s.improvedCount} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="回退/漂移"
                    valueStyle={{ color: '#cf1322' }}
                    value={s.regressedCount}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="合规达标率">
                  <Progress
                    percent={passPct}
                    size="small"
                    status={s.fail > 0 ? 'exception' : s.warn > 0 ? 'normal' : 'success'}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    较上轮 {data.tracking.passRateDelta >= 0 ? '+' : ''}
                    {Math.round(data.tracking.passRateDelta * 100)} 个百分点
                  </Text>
                </Card>
              </Col>
            </Row>

            {/* 整改证据 + 未闭环 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size="small" title="整改证据（已核验落地）">
                  {r.remediationProofs.length === 0 ? (
                    <Text type="secondary">本轮无闭环项</Text>
                  ) : (
                    <List
                      size="small"
                      dataSource={r.remediationProofs}
                      renderItem={(item) => (
                        <List.Item>
                          <Text style={{ fontSize: 12 }}>{item}</Text>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title={`未闭环不合规项（${r.openIssues.length}）`}>
                  {r.openIssues.length === 0 ? (
                    <Text type="secondary" style={{ color: '#3f8600' }}>
                      无红色不合规项
                    </Text>
                  ) : (
                    <List
                      size="small"
                      dataSource={r.openIssues}
                      renderItem={(item) => (
                        <List.Item>
                          <Tag color="error">{item}</Tag>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
            </Row>

            {/* 趋势 */}
            <Card
              style={{ marginBottom: 16 }}
              title="安全合规趋势"
              extra={
                <div>
                  {(['30d', '90d', '180d'] as const).map((p) => (
                    <Button
                      key={p}
                      size="small"
                      type={period === p ? 'primary' : 'text'}
                      onClick={() => {
                        setPeriod(p);
                        void load(p);
                      }}
                      style={{ marginLeft: 4 }}
                    >
                      {p === '30d' ? '近30天' : p === '90d' ? '近90天' : '近半年'}
                    </Button>
                  ))}
                </div>
              }
            >
              {trend && (
                <>
                  <Row gutter={16} style={{ marginBottom: 12 }}>
                    <Col>
                      <Text type="secondary">
                        趋势方向：
                        <Tag color={trend.direction === 'improving' ? 'success' : trend.direction === 'degrading' ? 'error' : 'default'}>
                          {trend.direction === 'improving' ? '持续改善' : trend.direction === 'degrading' ? '有所回退' : '基本持平'}
                        </Tag>
                      </Text>
                    </Col>
                    <Col>
                      <Text type="secondary">
                        达标率 {Math.round(trend.worstPassRate * 100)}% → {Math.round(trend.bestPassRate * 100)}%
                      </Text>
                    </Col>
                  </Row>
                  {/* 简易柱状图（不引入新依赖） */}
                  <Row gutter={8} align="bottom">
                    {trend.points.map((p) => {
                      const h = Math.max(8, Math.round(p.passRate * 160));
                      return (
                        <Col flex="1" key={p.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, marginBottom: 4 }}>{Math.round(p.passRate * 100)}%</div>
                          <div
                            style={{
                              height: h,
                              background:
                                p.overall === 'fail'
                                  ? '#cf1322'
                                  : p.overall === 'warn'
                                    ? '#d48806'
                                    : '#3f8600',
                              borderRadius: '4px 4px 0 0',
                            }}
                          />
                          <div style={{ fontSize: 12, marginTop: 4, color: 'rgba(0,0,0,0.55)' }}>
                            {p.label}
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </>
              )}
            </Card>

            {/* 五大类分桶 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {DOMAIN_ORDER.map((d) => {
                const b = r.byDomain[d];
                if (!b) return null;
                const domStatus: ComplianceStatus = b.fail > 0 ? 'fail' : b.warn > 0 ? 'warn' : 'pass';
                return (
                  <Col span={8} key={d}>
                    <Card size="small">
                      <Row align="middle" justify="space-between">
                        <Text strong>{b.label}</Text>
                        <Tag color={STATUS_META[domStatus].color}>{STATUS_META[domStatus].text}</Tag>
                      </Row>
                      <Row gutter={8} style={{ marginTop: 8 }}>
                        <Col>
                          <Text type="secondary" style={{ fontSize: 12 }}>符合 {b.pass}</Text>
                        </Col>
                        <Col>
                          <Text type="secondary" style={{ fontSize: 12 }}>待加固 {b.warn}</Text>
                        </Col>
                        <Col>
                          <Text type="secondary" style={{ fontSize: 12 }}>不合规 {b.fail}</Text>
                        </Col>
                        <Col flex="auto" style={{ textAlign: 'right' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>共 {b.total} 项</Text>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* 逐条复查 */}
            <Card title={`复查控制项（共 ${s.total} 项）`}>
              <List
                dataSource={r.checks}
                renderItem={(item) => {
                  const meta = STATUS_META[item.status];
                  const deltaMeta = DELTA_META[item.delta];
                  const domLabel = r.byDomain[item.domain]?.label ?? item.domain;
                  return (
                    <List.Item style={{ borderLeft: `4px solid ${meta.hex}`, paddingLeft: 16 }}>
                      <Row style={{ width: '100%' }}>
                        <Col flex="auto">
                          <Text strong>{item.title}</Text>{' '}
                          <Tag>{domLabel}</Tag>
                          <Tag color={meta.color}>{meta.text}</Tag>
                          <Tag color={deltaMeta.color}>{deltaMeta.text}</Tag>
                          <Paragraph style={{ margin: '8px 0 4px' }}>{item.detail}</Paragraph>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            证据：{item.evidence}
                          </Text>
                          {item.remediationProof && (
                            <>
                              <br />
                              <Text style={{ fontSize: 12, color: '#3f8600' }}>
                                整改证据：{item.remediationProof}
                              </Text>
                            </>
                          )}
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
