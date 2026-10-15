/**
 * 健澜科技 jlmedaios - M133-D 系统智慧度评分页（管理驾驶舱，仅 admin）
 *
 * 展示 BFF /api/v1/admin/intelligence-score 聚合结果：
 *   - 顶部大数字：系统智慧度总分 + 等级标签；
 *   - 雷达图：六维（经验沉淀量/推荐采纳率/学习引擎活跃度/知识覆盖率/自动化率/用户满意度）；
 *   - 趋势折线：近 N 日总分走势 + 期末环比；
 *   - 明细表格：每维怎么算的（原始输入、公式、加权贡献、是否弱项）。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（无样本，演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Table, Tag, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type IntelligenceTier = 'outstanding' | 'excellent' | 'good' | 'pass' | 'weak';

interface DimensionDetail {
  key: string;
  name: string;
  weight: number;
  score: number;
  weightedContribution: number;
  raw: Record<string, number>;
  formula: string;
  isWeak: boolean;
}

interface IntelligenceScore {
  hospitalId: string;
  totalScore: number;
  tier: IntelligenceTier;
  tierLabel: string;
  dimensions: DimensionDetail[];
  weakDimensions: DimensionDetail[];
  demo: boolean;
  generatedAt: string;
}

interface IntelligenceTrendPoint {
  date: string;
  score: number;
  tier: IntelligenceTier;
}

interface IntelligenceTrend {
  hospitalId: string;
  days: number;
  points: IntelligenceTrendPoint[];
  delta: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
}

interface ScoreResponse {
  score: IntelligenceScore;
  trend: IntelligenceTrend;
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const TIER_COLOR: Record<IntelligenceTier, string> = {
  outstanding: '#52c41a',
  excellent: '#1e6fbf',
  good: '#13c2c2',
  pass: '#faad14',
  weak: '#f5222d',
};

export default function IntelligenceScorePage() {
  const [data, setData] = useState<ScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/intelligence-score?days=30');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as ScoreResponse);
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

  const score = data?.score;
  const trend = data?.trend;
  const isEmpty = !score;

  /** 雷达图 option */
  const radarOption = useMemo<EChartsOption | null>(() => {
    if (!score) return null;
    return {
      color: [VI.accent],
      tooltip: {},
      radar: {
        indicator: score.dimensions.map((d) => ({ name: d.name, max: 100 })),
        axisName: { color: VI.deep, fontSize: 12 },
        splitArea: { areaStyle: { color: ['rgba(30,111,191,0.04)', 'rgba(30,111,191,0.08)'] } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: score.dimensions.map((d) => d.score),
              name: '当前得分',
              areaStyle: { color: 'rgba(30,111,191,0.25)' },
              lineStyle: { color: VI.accent, width: 2 },
              itemStyle: { color: VI.accent },
            },
          ],
        },
      ],
    };
  }, [score]);

  /** 趋势折线 option */
  const trendOption = useMemo<EChartsOption | null>(() => {
    if (!trend || trend.points.length === 0) return null;
    return {
      color: [VI.accent],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 32, bottom: 32 },
      xAxis: { type: 'category', boundaryGap: false, data: trend.points.map((p) => p.date) },
      yAxis: { type: 'value', min: 0, max: 100, name: '分' },
      series: [
        {
          name: '智慧度总分',
          type: 'line',
          smooth: true,
          data: trend.points.map((p) => p.score),
          areaStyle: { color: 'rgba(30,111,191,0.15)' },
          markLine: {
            symbol: 'none',
            data: [{ yAxis: 60, lineStyle: { color: '#f5222d', type: 'dashed' }, label: { formatter: '合格线 60' } }],
          },
        },
      ],
    };
  }, [trend]);

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
          系统智慧度评分
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 仅 admin 可见 · 【SaaS化+智慧度】六维加权百分制
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总系统智慧度…" />
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
        {!loading && !error && isEmpty && (
          <Alert
            type="info"
            showIcon
            message="暂无系统智慧度样本。接入经验沉淀、推荐采纳、学习引擎、知识覆盖、自动化闭环与用户评价数据后将自动评分。"
          />
        )}

        {!loading && !error && score && trend && (
          <>
            {score.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为演示模式数据：尚未接入真实业务计数，评分仅用于演示看板效果。"
              />
            )}

            {/* 大数字 + 等级 + 趋势概览 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>系统智慧度总分</div>
                    <div style={{ fontSize: 56, fontWeight: 700, color: VI.deep, lineHeight: 1.1 }}>
                      {score.totalScore.toFixed(1)}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Tag color={TIER_COLOR[score.tier]} style={{ fontSize: 14, padding: '4px 12px' }}>
                        {score.tierLabel}
                      </Tag>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col span={16}>
                <Card title="近 30 日走势概览">
                  <Row gutter={16}>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>期末环比</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: trend.delta >= 0 ? '#52c41a' : '#f5222d' }}>
                          {trend.delta >= 0 ? '+' : ''}
                          {trend.delta.toFixed(1)}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>分</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>窗口均值</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: VI.deep }}>{trend.avgScore.toFixed(1)}</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>最高 / 最低</div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: VI.deep }}>
                          {trend.bestScore.toFixed(1)} / {trend.worstScore.toFixed(1)}
                        </div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>弱项维度</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: score.weakDimensions.length ? '#f5222d' : '#52c41a' }}>
                          {score.weakDimensions.length}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>项待提升</div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* 雷达图 + 趋势折线 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="六维雷达图">
                  {radarOption && <ReactECharts option={radarOption} style={{ height: 320 }} />}
                </Card>
              </Col>
              <Col span={12}>
                <Card title={`智慧度趋势（近 ${trend.days} 日）`}>
                  {trendOption ? (
                    <ReactECharts option={trendOption} style={{ height: 320 }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.45)', padding: 80 }}>
                      暂无历史趋势数据
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 明细：每维怎么算的 */}
            <Card title="六维明细（可解释口径）">
              <Table
                rowKey="key"
                pagination={false}
                dataSource={score.dimensions}
                locale={{ emptyText: '暂无维度数据' }}
                columns={[
                  { title: '维度', dataIndex: 'name', width: 140 },
                  {
                    title: '权重',
                    dataIndex: 'weight',
                    width: 80,
                    render: (v: number) => `${v}%`,
                  },
                  {
                    title: '得分',
                    dataIndex: 'score',
                    width: 90,
                    render: (v: number, record: DimensionDetail) => (
                      <Tag color={record.isWeak ? 'red' : 'blue'}>{v.toFixed(1)}</Tag>
                    ),
                  },
                  {
                    title: '加权贡献',
                    dataIndex: 'weightedContribution',
                    width: 100,
                    render: (v: number) => v.toFixed(1),
                  },
                  { title: '计算口径（怎么算的）', dataIndex: 'formula' },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
