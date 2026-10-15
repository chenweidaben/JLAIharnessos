/**
 * 健澜科技 jlmedaios - M127-B 科室绩效分析面板（管理驾驶舱，仅 admin）
 *
 * 五维雷达图（工作量 / 效率 / 质量 / 满意度 / 智慧资产）+ 全院科室排名表。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无绩效数据）。
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

/** 与 BFF deptPerformanceAggregator 输出对齐 */
interface DimensionScore {
  key: string;
  label: string;
  weight: number;
  score: number;
}

type PerfGrade = 'A' | 'B' | 'C' | 'D';

interface RankedDept {
  deptCode: string;
  deptName: string;
  rank: number;
  totalScore: number;
  grade: PerfGrade;
  dimensions: DimensionScore[];
}

interface DeptPerformance {
  deptCode: string;
  deptName: string;
  timeRange: string;
  dimensions: DimensionScore[];
  totalScore: number;
  grade: PerfGrade;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  accentSoft: '#8aa9c9',
  bg: '#f5f7fa',
};

const GRADE_COLOR: Record<PerfGrade, string> = {
  A: 'green',
  B: 'blue',
  C: 'orange',
  D: 'red',
};

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function DeptPerformancePage() {
  const [ranking, setRanking] = useState<RankedDept[]>([]);
  const [report, setReport] = useState<DeptPerformance | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');

  /** 全院维度均值（雷达对比线） */
  const avgScores = useMemo(() => {
    if (ranking.length === 0) return [] as number[];
    const dimCount = ranking[0].dimensions.length;
    const sums = new Array<number>(dimCount).fill(0);
    ranking.forEach((d) =>
      d.dimensions.forEach((dim, i) => {
        sums[i] += dim.score;
      }),
    );
    return sums.map((s) => Math.round((s / ranking.length) * 10) / 10);
  }, [ranking]);

  const loadRanking = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getJson<{ type: string; timeRange: string; ranked: RankedDept[] }>(
        '/api/v1/admin/performance/dept',
      );
      setRanking(data.ranked);
      if (data.ranked.length > 0) setSelected(data.ranked[0].deptCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (deptCode: string) => {
    if (!deptCode) return;
    setReportLoading(true);
    try {
      const data = await getJson<{ type: string; report: DeptPerformance }>(
        `/api/v1/admin/performance/dept?deptCode=${encodeURIComponent(deptCode)}`,
      );
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : '科室绩效加载失败');
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    void loadRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadReport(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  /** 雷达图配置 */
  const radarOption = useMemo(() => {
    if (!report) return {};
    return {
      color: [VI.accent, VI.accentSoft],
      legend: { data: [report.deptName, '全院均值'], bottom: 0 },
      tooltip: {},
      radar: {
        indicator: report.dimensions.map((d) => ({ name: d.label, max: 100 })),
        radius: '65%',
        axisName: { color: VI.deep, fontSize: 12 },
        splitArea: {
          areaStyle: { color: ['#f5f7fa', '#eaf0f6'] },
        },
        splitLine: { lineStyle: { color: '#cdd9e5' } },
      },
      series: [
        {
          type: 'radar' as const,
          data: [
            {
              value: report.dimensions.map((d) => d.score),
              name: report.deptName,
              areaStyle: { opacity: 0.25 },
            },
            {
              value: avgScores,
              name: '全院均值',
              areaStyle: { opacity: 0.08 },
            },
          ],
        },
      ],
    };
  }, [report, avgScores]);

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
          科室绩效分析
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 五维（工作量 / 效率 / 质量 / 满意度 / 智慧资产）· 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载科室绩效数据中…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={loadRanking}>
                重试
              </Button>
            }
          />
        )}

        {/* empty 态 */}
        {!loading && !error && ranking.length === 0 && (
          <Alert type="info" showIcon message="暂无科室绩效数据。" />
        )}

        {!loading && !error && ranking.length > 0 && (
          <>
            {/* 科室选择 + 概览指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
              <Col span={8}>
                <Card>
                  <Typography.Text style={{ color: '#666' }}>选择科室</Typography.Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    value={selected}
                    onChange={setSelected}
                    options={ranking.map((d) => ({
                      value: d.deptCode,
                      label: `#${d.rank} ${d.deptName}（${d.totalScore}分）`,
                    }))}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="综合得分"
                    value={report?.totalScore ?? '-'}
                    suffix="分"
                    valueStyle={{ color: VI.deep }}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="绩效等级"
                    valueRender={() =>
                      report ? (
                        <Tag color={GRADE_COLOR[report.grade]} style={{ fontSize: 18, padding: '4px 12px' }}>
                          {report.grade}
                        </Tag>
                      ) : (
                        '-'
                      )
                    }
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="全院排名"
                    value={report ? `#${ranking.find((d) => d.deptCode === report.deptCode)?.rank ?? '-'}` : '-'}
                    suffix={`/ ${ranking.length}`}
                  />
                </Card>
              </Col>
            </Row>

            {/* 雷达图 */}
            <Card title="五维绩效雷达（所选科室 vs 全院均值）" style={{ marginBottom: 16 }}>
              {reportLoading ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Spin size="small" />
                </div>
              ) : report ? (
                <ReactECharts option={radarOption} style={{ height: 420 }} notMerge />
              ) : (
                <Alert type="info" showIcon message="暂无该科室报告" />
              )}
            </Card>

            {/* 排名表 */}
            <Card title="全院科室排名（按综合得分降序）">
              <Table
                rowKey="deptCode"
                pagination={false}
                dataSource={ranking}
                locale={{ emptyText: '暂无排名数据' }}
                columns={[
                  {
                    title: '排名',
                    dataIndex: 'rank',
                    width: 70,
                    render: (v: number) =>
                      v === 1 ? <Tag color="gold">第 1</Tag> : v === 2 ? <Tag color="silver">第 2</Tag> : v === 3 ? <Tag color="bronze">第 3</Tag> : `第 ${v}`,
                  },
                  { title: '科室', dataIndex: 'deptName' },
                  {
                    title: '综合得分',
                    dataIndex: 'totalScore',
                    width: 100,
                    render: (v: number) => <strong style={{ color: VI.deep }}>{v}</strong>,
                  },
                  {
                    title: '等级',
                    dataIndex: 'grade',
                    width: 80,
                    render: (v: PerfGrade) => <Tag color={GRADE_COLOR[v]}>{v}</Tag>,
                  },
                  ...ranking[0].dimensions.map((dim) => ({
                    title: dim.label,
                    key: dim.key,
                    width: 90,
                    render: (_: unknown, row: RankedDept) => {
                      const d = row.dimensions.find((x) => x.key === dim.key);
                      const score = d?.score ?? 0;
                      return (
                        <Tag color={score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'}>
                          {score}
                        </Tag>
                      );
                    },
                  })),
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
