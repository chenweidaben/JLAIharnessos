/**
 * 健澜科技 jlmedaios - M140-A 个人绩效考核页（医院管理深化，仅 admin）
 *
 * 【医院管理深化】公平透明，每个得分都有依据。
 * 五维（工作量30 / 医疗质量25 / 患者满意度20 / 学习成长15 / 科室协作10）
 *   - 账期选择 + 科室过滤，全院/科室排名表；
 *   - 点选员工 → 五维雷达 + 证据链抽屉（原始指标 → 基线 → 折算贡献）；
 *   - 三态：loading（加载中）/ error（失败可重试）/ empty（暂无绩效数据）。
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
  Descriptions,
  Drawer,
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

/** 与 BFF performanceReviewAggregator 输出对齐 */
interface MetricEvidence {
  metric: string;
  raw: number;
  baseline: number;
  direction: 'up' | 'down';
  contribution: number;
}

interface DimensionScore {
  key: string;
  label: string;
  weight: number;
  score: number;
  evidence: MetricEvidence[];
}

type PerfGrade = 'A' | 'B' | 'C' | 'D';

interface Ranking {
  staffId: string;
  staffName: string;
  deptCode: string;
  deptName: string;
  rank: number;
  totalScore: number;
  grade: PerfGrade;
  dimensions: DimensionScore[];
}

interface Score {
  staffId: string;
  staffName: string;
  deptCode: string;
  deptName: string;
  period: string;
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

/** 可选账期（演示数据口径） */
const PERIODS = ['2026-08', '2026-09', '2026-10'];

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function PerformanceReviewPage() {
  const [period, setPeriod] = useState<string>('2026-10');
  const [dept, setDept] = useState<string>('ALL');
  const [ranking, setRanking] = useState<Ranking[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [error, setError] = useState('');

  /** 员工详情抽屉 */
  const [detail, setDetail] = useState<Score | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  /** 科室下拉（从排名结果去重） */
  const deptOptions = useMemo(() => {
    const map = new Map<string, string>();
    ranking.forEach((r) => map.set(r.deptCode, r.deptName));
    return [{ value: 'ALL', label: '全院' }, ...[...map.entries()].map(([value, name]) => ({ value, label: name }))];
  }, [ranking]);

  const loadRanking = async (p: string, d: string) => {
    setRankingLoading(true);
    setError('');
    try {
      const qs = d && d !== 'ALL' ? `?dept=${encodeURIComponent(d)}` : '';
      const data = await getJson<{ type: string; period: string; ranking: Ranking[] }>(
        `/api/v1/admin/performance/${encodeURIComponent(p)}${qs}`,
      );
      setRanking(data.ranking);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setRanking([]);
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    void loadRanking(period, dept);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, dept]);

  const openDetail = async (staffId: string) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await getJson<{ type: string; period: string; score: Score }>(
        `/api/v1/admin/performance/${encodeURIComponent(period)}?staffId=${encodeURIComponent(staffId)}`,
      );
      setDetail(data.score);
    } catch (e) {
      setError(e instanceof Error ? e.message : '绩效详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  };

  /** 员工五维雷达 */
  const radarOption = useMemo(() => {
    if (!detail) return {};
    return {
      color: [VI.accent],
      tooltip: {},
      radar: {
        indicator: detail.dimensions.map((d) => ({ name: d.label, max: 100 })),
        radius: '65%',
        axisName: { color: VI.deep, fontSize: 12 },
        splitArea: { areaStyle: { color: ['#f5f7fa', '#eaf0f6'] } },
        splitLine: { lineStyle: { color: '#cdd9e5' } },
      },
      series: [
        {
          type: 'radar' as const,
          data: [
            {
              value: detail.dimensions.map((d) => d.score),
              name: detail.staffName,
              areaStyle: { opacity: 0.25 },
            },
          ],
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
          个人绩效考核
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          医院管理深化 · 五维（工作量30 / 医疗质量25 / 患者满意度20 / 学习成长15 / 科室协作10）· 公平透明，每分有据
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* 账期 + 科室过滤 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Typography.Text type="secondary">考评账期</Typography.Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                value={period}
                onChange={setPeriod}
                options={PERIODS.map((p) => ({ value: p, label: p }))}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Typography.Text type="secondary">科室范围</Typography.Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                value={dept}
                onChange={setDept}
                options={deptOptions}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="参评人数" value={ranking.length} suffix="人" valueStyle={{ color: VI.deep }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="本期最高分"
                value={ranking.length ? ranking[0].totalScore : '-'}
                suffix="分"
                valueStyle={{ color: VI.accent }}
              />
            </Card>
          </Col>
        </Row>

        {rankingLoading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载绩效考核数据中…" />
          </div>
        )}

        {!rankingLoading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => loadRanking(period, dept)}>
                重试
              </Button>
            }
          />
        )}

        {!rankingLoading && !error && ranking.length === 0 && (
          <Alert type="info" showIcon message="本期暂无绩效考核数据。" />
        )}

        {!rankingLoading && !error && ranking.length > 0 && (
          <Card title="绩效排名（按综合得分降序，点行查看五维证据）">
            <Table
              rowKey="staffId"
              pagination={false}
              dataSource={ranking}
              locale={{ emptyText: '暂无排名数据' }}
              onRow={(row) => ({
                onClick: () => openDetail(row.staffId),
                style: { cursor: 'pointer' },
              })}
              columns={[
                {
                  title: '排名',
                  dataIndex: 'rank',
                  width: 80,
                  render: (v: number) =>
                    v === 1 ? (
                      <Tag color="gold">第 1</Tag>
                    ) : v === 2 ? (
                      <Tag color="silver">第 2</Tag>
                    ) : v === 3 ? (
                      <Tag color="bronze">第 3</Tag>
                    ) : (
                      `第 ${v}`
                    ),
                },
                { title: '姓名', dataIndex: 'staffName', width: 100 },
                { title: '科室', dataIndex: 'deptName' },
                ...ranking[0].dimensions.map((dim) => ({
                  title: `${dim.label}\n(${(dim.weight * 100).toFixed(0)}%)`,
                  key: dim.key,
                  width: 90,
                  render: (_: unknown, row: Ranking) => {
                    const d = row.dimensions.find((x) => x.key === dim.key);
                    const score = d?.score ?? 0;
                    return (
                      <Tag color={score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'}>{score}</Tag>
                    );
                  },
                })),
                {
                  title: '综合得分',
                  dataIndex: 'totalScore',
                  width: 100,
                  render: (v: number) => <strong style={{ color: VI.deep }}>{v}</strong>,
                },
                {
                  title: '等级',
                  dataIndex: 'grade',
                  width: 70,
                  render: (v: PerfGrade) => <Tag color={GRADE_COLOR[v]}>{v}</Tag>,
                },
              ]}
            />
          </Card>
        )}
      </Content>

      {/* 员工绩效详情抽屉：雷达 + 证据链（公平透明） */}
      <Drawer
        title={detail ? `${detail.staffName} · ${detail.deptName} · ${detail.period}` : '绩效详情'}
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {detailLoading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        )}
        {!detailLoading && detail && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Statistic title="综合得分" value={detail.totalScore} suffix="分" valueStyle={{ color: VI.deep }} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="绩效等级"
                  valueRender={() => <Tag color={GRADE_COLOR[detail.grade]}>{detail.grade}</Tag>}
                />
              </Col>
            </Row>

            <Card size="small" title="五维雷达" style={{ marginBottom: 16 }}>
              <ReactECharts option={radarOption} style={{ height: 320 }} notMerge />
            </Card>

            <Card size="small" title="得分依据（公平透明，可申诉可审计）">
              {detail.dimensions.map((dim) => (
                <div key={dim.key} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, color: VI.deep }}>
                    {dim.label}
                    <span style={{ float: 'right' }}>
                      <Tag color={dim.score >= 80 ? 'green' : dim.score >= 60 ? 'orange' : 'red'}>{dim.score} 分</Tag>
                    </span>
                  </div>
                  <Descriptions size="small" column={2} bordered style={{ marginTop: 4 }}>
                    {dim.evidence.map((e) => (
                      <Descriptions.Item key={e.metric} label={e.metric} span={2}>
                        原始 {e.raw} / 基线 {e.baseline}（{e.direction === 'up' ? '越高越好' : '越低越好'}）→ 贡献{' '}
                        {e.contribution}
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                </div>
              ))}
            </Card>
          </>
        )}
      </Drawer>
    </Layout>
  );
}
