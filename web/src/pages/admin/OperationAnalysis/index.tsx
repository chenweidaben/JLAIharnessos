/**
 * 健澜科技 jlmedaios - M163-B 医院运营分析页（管理驾驶舱，仅 admin）
 *
 * 四维运营分析（安全与运营，数据支撑不拍脑袋）：
 *  - 收入：门诊 / 住院 / 药品 / 检查（结构占比饼图）；
 *  - 成本：人力 / 药品 / 耗材 / 设备折旧（结构占比饼图）；
 *  - 效率：床位周转 / 平均住院日 / 手术台次（KPI）；
 *  - 资源利用：医生工时产出 / 设备利用率 / 空间利用率（KPI）。
 * 另含成本效益得分、同行对标条形图、问题识别预警列表。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
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
  Row,
  Select,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import ReactECharts from 'echarts-for-react';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF operationAnalysisAggregator 输出对齐的类型 ---------------- */

interface RevenueAnalysis {
  breakdown: { outpatient: number; inpatient: number; drug: number; exam: number };
  total: number;
  drugRatio: number;
  examRatio: number;
}

interface CostAnalysis {
  breakdown: { labor: number; drug: number; consumable: number; depreciation: number };
  total: number;
  laborRatio: number;
  drugCostRatio: number;
  consumableRatio: number;
}

interface OperationReport {
  deptCode: string;
  deptName: string;
  period: string;
  revenue: RevenueAnalysis;
  cost: CostAnalysis;
  efficiency: { bedTurnover: number; avgLodDays: number; surgeryCases: number };
  resource: { doctorWorkHours: number; deviceUtilization: number; spaceUtilization: number };
  netBalance: number;
  margin: number;
  revenuePerBed: number;
  costPerDischarge: number;
}

interface CostEffectiveness {
  deptCode: string;
  deptName: string;
  costPerRevenue: number;
  marginPct: number;
  outputPerDoctorHour: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

interface BenchmarkItem {
  metric: string;
  label: string;
  deptValue: number;
  peerAvg: number;
  delta: number;
  betterThanAvg: boolean | null;
}

interface BenchmarkResult {
  deptCode: string;
  deptName: string;
  peerCount: number;
  items: BenchmarkItem[];
  rank: number;
}

interface OperationIssue {
  deptCode: string;
  level: 'warning' | 'critical';
  dimension: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  suggestion: string;
}

interface OverviewDept {
  deptCode: string;
  deptName: string;
  revenueTotal: number;
  costTotal: number;
  netBalance: number;
  margin: number;
  costEffectivenessScore: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

interface DeptAnalysis {
  type: 'dept';
  report: OperationReport;
  costEffectiveness: CostEffectiveness;
  benchmark: BenchmarkResult;
  issues: OperationIssue[];
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
const DIMENSION_LABEL: Record<string, string> = {
  revenue: '收入',
  cost: '成本',
  efficiency: '效率',
  resource: '资源利用',
};

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function OperationAnalysisPage() {
  const [overview, setOverview] = useState<OverviewDept[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [detail, setDetail] = useState<DeptAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getJson<{ type: string; period: string; departments: OverviewDept[] }>(
        '/api/v1/admin/operation/analysis',
      );
      setOverview(data.departments);
      if (data.departments.length > 0) setSelected(data.departments[0].deptCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setOverview([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (deptCode: string) => {
    if (!deptCode) return;
    setDetailLoading(true);
    try {
      const data = await getJson<DeptAnalysis>(
        `/api/v1/admin/operation/analysis?dept=${encodeURIComponent(deptCode)}`,
      );
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '运营分析加载失败');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadDetail(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  /** 收入结构饼图 */
  const revenuePieOption = useMemo(() => {
    if (!detail) return {};
    const r = detail.report.revenue;
    return {
      color: [VI.accent, '#3a8bd4', VI.accentSoft, '#c2d4e6'],
      tooltip: { trigger: 'item', formatter: '{b}: {c} 万元 ({d}%)' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie' as const,
          radius: ['40%', '68%'],
          label: { formatter: '{b}\n{d}%', color: VI.deep },
          data: [
            { name: '门诊', value: r.breakdown.outpatient },
            { name: '住院', value: r.breakdown.inpatient },
            { name: '药品', value: r.breakdown.drug },
            { name: '检查', value: r.breakdown.exam },
          ],
        },
      ],
    };
  }, [detail]);

  /** 成本结构饼图 */
  const costPieOption = useMemo(() => {
    if (!detail) return {};
    const c = detail.report.cost;
    return {
      color: ['#1e6fbf', '#5aa0e0', '#8aa9c9', '#c2d4e6'],
      tooltip: { trigger: 'item', formatter: '{b}: {c} 万元 ({d}%)' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie' as const,
          radius: ['40%', '68%'],
          label: { formatter: '{b}\n{d}%', color: VI.deep },
          data: [
            { name: '人力', value: c.breakdown.labor },
            { name: '药品', value: c.breakdown.drug },
            { name: '耗材', value: c.breakdown.consumable },
            { name: '设备折旧', value: c.breakdown.depreciation },
          ],
        },
      ],
    };
  }, [detail]);

  /** 同行对标条形图（所选科室 vs 全院均值） */
  const benchmarkOption = useMemo(() => {
    if (!detail) return {};
    return {
      color: [VI.accent, VI.accentSoft],
      tooltip: { trigger: 'axis' },
      legend: { data: [detail.report.deptName, '全院均值'], bottom: 0 },
      grid: { left: 110, right: 24, top: 20, bottom: 40 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: detail.benchmark.items.map((i) => i.label),
        axisLabel: { color: VI.deep },
      },
      series: [
        {
          name: detail.report.deptName,
          type: 'bar' as const,
          data: detail.benchmark.items.map((i) => i.deptValue),
        },
        {
          name: '全院均值',
          type: 'bar' as const,
          data: detail.benchmark.items.map((i) => i.peerAvg),
        },
      ],
    };
  }, [detail]);

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
          医院运营分析
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 收入 / 成本 / 效率 / 资源利用四维（数据支撑，仅 admin 可见）
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载运营分析数据中…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={loadOverview}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && overview.length === 0 && (
          <Alert type="info" showIcon message="暂无运营分析数据。" />
        )}

        {!loading && !error && overview.length > 0 && (
          <>
            {/* 科室选择 */}
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Typography.Text style={{ color: '#666' }}>选择科室</Typography.Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    value={selected}
                    onChange={setSelected}
                    options={overview.map((d) => ({
                      value: d.deptCode,
                      label: `${d.deptName}（效益 ${d.costEffectivenessScore} 分 / ${d.grade}）`,
                    }))}
                  />
                </Col>
                <Col span={4}>
                  <Statistic title="收入合计(万元)" value={detail?.report.revenue.total ?? '-'} valueStyle={{ color: VI.deep }} />
                </Col>
                <Col span={4}>
                  <Statistic title="成本合计(万元)" value={detail?.report.cost.total ?? '-'} valueStyle={{ color: VI.deep }} />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="收支结余(万元)"
                    value={detail?.report.netBalance ?? '-'}
                    valueStyle={{ color: (detail?.report.netBalance ?? 0) >= 0 ? '#3f9d63' : '#d4483e' }}
                  />
                </Col>
                <Col span={4}>
                  <Statistic
                    title="成本效益得分"
                    value={detail ? `${detail.costEffectiveness.score}（${detail.costEffectiveness.grade}）` : '-'}
                    valueStyle={{ color: VI.deep }}
                  />
                </Col>
              </Row>
            </Card>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <Spin size="large" tip="生成科室运营报告…" />
              </div>
            ) : detail ? (
              <>
                {/* 效率 + 资源利用 KPI */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Card>
                      <Statistic title="床位周转(次)" value={detail.report.efficiency.bedTurnover} suffix="次" />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic title="平均住院日" value={detail.report.efficiency.avgLodDays} suffix="天" />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic title="手术台次" value={detail.report.efficiency.surgeryCases} suffix="台" />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic title="每床收入(万元/床)" value={detail.report.revenuePerBed} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic title="设备利用率" value={`${(detail.report.resource.deviceUtilization * 100).toFixed(0)}%`} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic title="空间利用率" value={`${(detail.report.resource.spaceUtilization * 100).toFixed(0)}%`} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic title="医生工时产出(万元/工时)" value={detail.costEffectiveness.outputPerDoctorHour} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic title="每元收入成本" value={detail.costEffectiveness.costPerRevenue} />
                    </Card>
                  </Col>
                </Row>

                {/* 收入 / 成本结构 */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Card title={`收入结构（药占比 ${(detail.report.revenue.drugRatio * 100).toFixed(0)}% / 检查占比 ${(detail.report.revenue.examRatio * 100).toFixed(0)}%）`}>
                      <ReactECharts option={revenuePieOption} style={{ height: 320 }} notMerge />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title={`成本结构（人力 ${(detail.report.cost.laborRatio * 100).toFixed(0)}% / 耗材 ${(detail.report.cost.consumableRatio * 100).toFixed(0)}%）`}>
                      <ReactECharts option={costPieOption} style={{ height: 320 }} notMerge />
                    </Card>
                  </Col>
                </Row>

                {/* 同行对标 */}
                <Card title={`同行对标（${detail.report.deptName} vs 全院均值，效益排名 #${detail.benchmark.rank}）`} style={{ marginBottom: 16 }}>
                  <ReactECharts option={benchmarkOption} style={{ height: 360 }} notMerge />
                </Card>

                {/* 问题识别 */}
                <Card title={`运营问题识别（${detail.issues.length} 项预警，仅提示不自动处置）`}>
                  <Table
                    rowKey={(r) => `${r.metric}-${r.level}`}
                    pagination={false}
                    dataSource={detail.issues}
                    locale={{ emptyText: '未发现明显运营问题' }}
                    columns={[
                      {
                        title: '级别',
                        dataIndex: 'level',
                        width: 90,
                        render: (v: string) =>
                          v === 'critical' ? <Tag color="red">严重</Tag> : <Tag color="orange">预警</Tag>,
                      },
                      {
                        title: '维度',
                        dataIndex: 'dimension',
                        width: 90,
                        render: (v: string) => <Tag>{DIMENSION_LABEL[v] ?? v}</Tag>,
                      },
                      { title: '问题', dataIndex: 'message' },
                      {
                        title: '改进建议',
                        dataIndex: 'suggestion',
                        render: (v: string) => <Typography.Text type="secondary">{v}</Typography.Text>,
                      },
                    ]}
                  />
                </Card>
              </>
            ) : null}

            {/* 全院概览表 */}
            <Card title="全院科室运营概览（按成本效益得分降序）" style={{ marginTop: 16 }}>
              <Table
                rowKey="deptCode"
                pagination={false}
                dataSource={overview}
                onRow={(row) => ({ onClick: () => setSelected(row.deptCode), style: { cursor: 'pointer' } })}
                columns={[
                  { title: '科室', dataIndex: 'deptName' },
                  { title: '收入(万元)', dataIndex: 'revenueTotal', width: 110 },
                  { title: '成本(万元)', dataIndex: 'costTotal', width: 110 },
                  {
                    title: '结余(万元)',
                    dataIndex: 'netBalance',
                    width: 110,
                    render: (v: number) => (
                      <span style={{ color: v >= 0 ? '#3f9d63' : '#d4483e' }}>{v}</span>
                    ),
                  },
                  {
                    title: '结余率',
                    dataIndex: 'margin',
                    width: 90,
                    render: (v: number) => `${(v * 100).toFixed(0)}%`,
                  },
                  {
                    title: '效益得分',
                    dataIndex: 'costEffectivenessScore',
                    width: 100,
                    render: (v: number, row) => <Tag color={GRADE_COLOR[row.grade]}>{v} · {row.grade}</Tag>,
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
