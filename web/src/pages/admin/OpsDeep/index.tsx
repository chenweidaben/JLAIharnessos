/**
 * 健澜科技 jlmedaios - M172-C 医院运营与管理深化页（安全质量与运营，仅 admin）
 *
 * 运营分析要有数据，不能拍脑袋：
 *  - 门诊/住院/手术/财务四域按标杆加权打分（0~100），输出整体运营效率等级；
 *  - 与全院标杆逐项对照，领先 / 持平 / 落后；
 *  - 红线阈值自动识别候诊、住院日、床位拥挤、三四级占比、手术等待、亏损、
 *    医保拒付、DRG 超支等瓶颈并给改进建议。
 *
 * 三态：loading / error（可重试）/ empty（暂无运营数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Input, Layout, Row, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import ReactECharts from 'echarts-for-react';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF opsDeep 输出对齐的类型 ---------------- */

interface MetricScore {
  key: string;
  label: string;
  value: number;
  benchmark: number;
  score: number;
}
interface DomainScore {
  domain: string;
  name: string;
  score: number;
  grade: string;
  gradeLabel: string;
  metricScores: MetricScore[];
}
interface EfficiencyReport {
  deptCode: string;
  deptName: string;
  period: string;
  derived: { highLevelRatio: number; profitMargin: number; costRatio: number };
  domains: DomainScore[];
  overallScore: number;
  overallGrade: string;
  overallGradeLabel: string;
}
interface BenchmarkItem {
  domainName: string;
  metricKey: string;
  metricLabel: string;
  unit: string;
  deptValue: number;
  benchmarkValue: number;
  gap: number;
  rating: 'leading' | 'on_par' | 'lagging';
}
interface BenchmarkReport {
  leadingCount: number;
  laggingCount: number;
  overallRating: 'leading' | 'on_par' | 'lagging';
  items: BenchmarkItem[];
}
interface Bottleneck {
  domainName: string;
  metricLabel: string;
  unit: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  reason: string;
  suggestedAction: string;
}
interface OpsDeepData {
  dept: string;
  period: string;
  demo: boolean;
  hasData?: boolean;
  deptName?: string;
  message?: string;
  efficiency?: EfficiencyReport;
  benchmark?: BenchmarkReport;
  bottleneck?: { criticalCount: number; warningCount: number; bottlenecks: Bottleneck[] };
  generatedAt?: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  accentSoft: '#8aa9c9',
  bg: '#f5f7fa',
};

const GRADE_COLOR: Record<string, string> = { A: 'green', B: 'blue', C: 'orange', D: 'red' };
const RATING_TAG: Record<string, { color: string; text: string }> = {
  leading: { color: 'green', text: '领先' },
  on_par: { color: 'default', text: '持平' },
  lagging: { color: 'red', text: '落后' },
};

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function OpsDeepPage() {
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [dept, setDept] = useState<string>('internal_medicine');
  const [period, setPeriod] = useState<string>(thisMonth);
  const [data, setData] = useState<OpsDeepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!dept.trim()) { setError('请输入科室编码'); return; }
    setLoading(true);
    setError('');
    try {
      const d = await getJson<OpsDeepData>(
        `/api/v1/admin/ops/deep?dept=${encodeURIComponent(dept.trim())}&period=${encodeURIComponent(period)}`,
      );
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : '运营数据加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dept, period]);

  useEffect(() => { void load(); }, [load]);

  /** 四域得分雷达图 */
  const radarOption = useMemo(() => {
    const ds = data?.efficiency?.domains ?? [];
    return {
      color: [VI.accent],
      tooltip: {},
      radar: {
        indicator: ds.map((d) => ({ name: d.name, max: 100 })),
        radius: 90,
        axisName: { color: VI.deep },
      },
      series: [{
        type: 'radar' as const,
        data: [{ value: ds.map((d) => d.score), name: '运营效率得分', areaStyle: { opacity: 0.25 } }],
      }],
    };
  }, [data]);

  const eff = data?.efficiency;
  const bm = data?.benchmark;
  const bn = data?.bottleneck;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>医院运营与管理深化</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          安全质量与运营 · 门诊/住院/手术/财务四域效率评分 / 标杆对标 / 瓶颈识别（运营要有数据，不拍脑袋）
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* 查询条件 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Typography.Text style={{ color: '#666' }}>科室编码</Typography.Text>
              <Input.Search
                style={{ marginTop: 8 }}
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                enterButton="查询"
                onSearch={load}
                placeholder="如 internal_medicine"
              />
            </Col>
            <Col span={6}>
              <Typography.Text style={{ color: '#666' }}>统计周期（如 2026-09）</Typography.Text>
              <Input
                style={{ marginTop: 8 }}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </Col>
            <Col span={6}>
              <Button onClick={load} loading={loading}>刷新</Button>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载运营数据中…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && !error && data && !data.hasData && !data.demo && (
          <Alert type="info" showIcon message={data.message || '该科室暂无运营指标数据。'} />
        )}

        {!loading && !error && data?.demo && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }}
            message={data.message || '当前为演示模式，使用内置样例数据。'} />
        )}

        {!loading && !error && eff && (
          <>
            {/* KPI */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="整体运营效率" value={eff.overallScore.toFixed(1)} suffix="/100"
                    valueStyle={{ color: VI.deep }} />
                  <Tag color={GRADE_COLOR[eff.overallGrade]} style={{ marginTop: 8 }}>
                    {eff.overallGrade} 级 · {eff.overallGradeLabel}
                  </Tag>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="三四级手术占比" value={`${(eff.derived.highLevelRatio * 100).toFixed(0)}%`}
                    valueStyle={{ color: VI.deep }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="科室利润率" value={`${(eff.derived.profitMargin * 100).toFixed(1)}%`}
                    valueStyle={{ color: eff.derived.profitMargin < 0 ? '#d4483e' : VI.deep }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="运营瓶颈（红线）" value={bn?.criticalCount ?? 0}
                    valueStyle={{ color: (bn?.criticalCount ?? 0) > 0 ? '#d4483e' : '#3f9d63' }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    另有 {(bn?.warningCount ?? 0)} 项关注项
                  </Typography.Text>
                </Card>
              </Col>
            </Row>

            {/* 图 + 四域得分 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card title="四域运营效率雷达">
                  <ReactECharts option={radarOption} style={{ height: 320 }} notMerge />
                </Card>
              </Col>
              <Col span={16}>
                <Card title="四域效率评分（按标杆加权）">
                  <Row gutter={[16, 16]}>
                    {eff.domains.map((d) => (
                      <Col span={12} key={d.domain}>
                        <Card size="small"
                          title={<span>{d.name} <Tag color={GRADE_COLOR[d.grade]}>{d.grade}·{d.gradeLabel}</Tag></span>}
                          extra={<strong style={{ color: VI.deep }}>{d.score.toFixed(1)}</strong>}>
                          {d.metricScores.map((m) => (
                            <Row key={m.key} justify="space-between" style={{ fontSize: 13, lineHeight: '24px' }}>
                              <Col>{m.label}</Col>
                              <Col>
                                <span style={{ color: '#888', marginRight: 8 }}>标杆 {m.benchmark}</span>
                                <span style={{ color: m.score >= 75 ? '#3f9d63' : m.score >= 60 ? '#e0a030' : '#d4483e' }}>
                                  {m.score.toFixed(0)}分
                                </span>
                              </Col>
                            </Row>
                          ))}
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* 对标 */}
            {bm && (
              <Card title={`标杆对标（领先 ${bm.leadingCount} 项 / 落后 ${bm.laggingCount} 项）`} style={{ marginBottom: 16 }}>
                <Table
                  rowKey="metricKey"
                  pagination={false}
                  dataSource={bm.items}
                  size="small"
                  columns={[
                    { title: '域', dataIndex: 'domainName', width: 110 },
                    { title: '指标', dataIndex: 'metricLabel', width: 140 },
                    { title: '科室值', dataIndex: 'deptValue', width: 100, render: (v: number) => v },
                    { title: '标杆值', dataIndex: 'benchmarkValue', width: 100, render: (v: number) => v },
                    {
                      title: '差距', dataIndex: 'gap', width: 90,
                      render: (v: number) => <span style={{ color: v > 0 ? '#3f9d63' : v < 0 ? '#d4483e' : '#888' }}>{v}</span>,
                    },
                    {
                      title: '评级', dataIndex: 'rating', width: 90,
                      render: (v: string) => <Tag color={RATING_TAG[v].color}>{RATING_TAG[v].text}</Tag>,
                    },
                  ]}
                />
              </Card>
            )}

            {/* 瓶颈 */}
            <Card title={`运营瓶颈识别（${bn?.criticalCount ?? 0} 红线 / ${bn?.warningCount ?? 0} 关注）`}>
              {(bn?.bottlenecks ?? []).length === 0 ? (
                <Alert type="success" showIcon message="未识别到运营红线瓶颈，各项指标处于合理区间。" />
              ) : (
                <Table
                  rowKey={(r) => `${r.metricLabel}-${r.value}`}
                  pagination={false}
                  dataSource={bn?.bottlenecks ?? []}
                  size="small"
                  columns={[
                    {
                      title: '级别', dataIndex: 'severity', width: 90,
                      render: (v: string) => v === 'critical'
                        ? <Tag color="red">红线</Tag> : <Tag color="orange">关注</Tag>,
                    },
                    { title: '域', dataIndex: 'domainName', width: 110 },
                    { title: '指标', dataIndex: 'metricLabel', width: 130 },
                    { title: '现状', dataIndex: 'reason', ellipsis: true },
                    { title: '改进建议', dataIndex: 'suggestedAction', ellipsis: true },
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
