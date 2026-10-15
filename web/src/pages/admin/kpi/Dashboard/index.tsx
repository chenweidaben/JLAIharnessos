/**
 * 健澜科技 jlmedaios - M147-C 三级公立医院绩效考核（国考）指标看板页（管理驾驶舱，仅 admin）
 *
 * 【知识图谱与患者教育】：本看板的达标结论与人话话术可作为患者健康教育、
 *   出院随访与院长汇报的可解释依据；只展示聚合统计量，不暴露患者个体 PII。
 *
 * 四维 20 项：医疗质量 C1-C6 / 运营效率 C7-C12 / 持续发展 C13-C18 / 满意度 C19-C20。
 * 三色：达标绿 / 待改进黄 / 未达标红。
 * 三态：loading / error（可重试）/ empty（无样本，演示模式标注）。
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

type KpiStatus = 'green' | 'yellow' | 'red';
type KpiDimension = 'quality' | 'efficiency' | 'development' | 'satisfaction';

interface KpiResult {
  code: string;
  name: string;
  dimension: KpiDimension;
  dimensionLabel: string;
  period: string;
  actual: number;
  target: number;
  unit: string;
  direction: 'higher_is_better' | 'lower_is_better';
  achievementRate: number;
  score: number;
  status: KpiStatus;
  statusLabel: string;
  gap: number;
}

interface KpiDimensionSummary {
  dimension: KpiDimension;
  dimensionLabel: string;
  total: number;
  green: number;
  yellow: number;
  red: number;
  avgScore: number;
}

interface KpiTrendPoint {
  code: string;
  name: string;
  dimension: KpiDimension;
  previous: number;
  current: number;
  delta: number;
  improving: boolean;
}

interface KpiResponse {
  hospitalId: string;
  period: string;
  prevPeriod: string | null;
  results: KpiResult[];
  summary: {
    total: number;
    green: number;
    yellow: number;
    red: number;
    passRate: number;
    byDimension: KpiDimensionSummary[];
  };
  trend: KpiTrendPoint[] | null;
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 国考三色：达标绿 / 待改进黄 / 未达标红 */
const STATUS_COLOR: Record<KpiStatus, string> = {
  green: '#52c41a',
  yellow: '#faad14',
  red: '#f5222d',
};

const STATUS_TAG: Record<KpiStatus, string> = {
  green: 'success',
  yellow: 'warning',
  red: 'error',
};

export default function HospitalKpiDashboardPage() {
  const [data, setData] = useState<KpiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/kpi?period=2026&prevPeriod=2025');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as KpiResponse);
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

  const summary = data?.summary;
  const results = data?.results ?? [];

  /** 达成率条形图（按状态着色，100% 达标线） */
  const rateOption = useMemo<EChartsOption | null>(() => {
    if (results.length === 0) return null;
    return {
      tooltip: { trigger: 'axis', formatter: (p: unknown) => {
        const arr = p as Array<{ name: string; value: number }>;
        const it = arr[0];
        return `${it.name}<br/>达成率：${(it.value * 100).toFixed(0)}%`;
      } },
      grid: { left: 56, right: 24, top: 32, bottom: 60 },
      xAxis: {
        type: 'category',
        data: results.map((r) => r.code),
        axisLabel: { interval: 0, rotate: 45, color: VI.deep },
      },
      yAxis: { type: 'value', max: 1.2, name: '达成率', axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%` } },
      series: [
        {
          name: '达成率',
          type: 'bar',
          data: results.map((r) => ({
            value: r.achievementRate,
            itemStyle: { color: STATUS_COLOR[r.status], borderRadius: [4, 4, 0, 0] },
          })),
          markLine: {
            symbol: 'none',
            data: [
              {
                yAxis: 1.0,
                lineStyle: { color: STATUS_COLOR.green, type: 'dashed' },
                label: { formatter: '达标线 100%' },
              },
            ],
          },
        },
      ],
    };
  }, [results]);

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
          三级公立医院绩效考核（国考）看板
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 仅 admin 可见 · 医疗质量 / 运营效率 / 持续发展 / 满意度评价 四维 20 项
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1360, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总国考指标…" />
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

        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无国考指标数据。接入 medmuse.hospital_kpi 后将自动成图。" />
        )}

        {!loading && !error && data && summary && (
          <>
            {data.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为演示模式数据：尚未接入真实国考统计，看板仅用于演示三色判定与趋势效果。"
              />
            )}

            {/* 头部汇总卡：总览 + 三色计数 + 达标率 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>考核周期</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: VI.deep }}>{data.period}</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>共 {summary.total} 项</div>
                  </div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>达标（绿）</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: STATUS_COLOR.green }}>{summary.green}</div>
                    <div style={{ fontSize: 12, color: STATUS_COLOR.green }}>项</div>
                  </div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>待改进（黄）</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: STATUS_COLOR.yellow }}>{summary.yellow}</div>
                    <div style={{ fontSize: 12, color: STATUS_COLOR.yellow }}>项</div>
                  </div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>未达标（红）</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: STATUS_COLOR.red }}>{summary.red}</div>
                    <div style={{ fontSize: 12, color: STATUS_COLOR.red }}>项</div>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>总体达标率</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: VI.deep, lineHeight: 1.1 }}>
                      {summary.passRate.toFixed(0)}%
                    </div>
                    <Tag color={summary.passRate >= 80 ? 'green' : summary.passRate >= 60 ? 'orange' : 'red'}>
                      {summary.passRate >= 80 ? '整体优良' : summary.passRate >= 60 ? '尚有缺口' : '需重点整改'}
                    </Tag>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 四维均分卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {summary.byDimension.map((d) => (
                <Col span={6} key={d.dimension}>
                  <Card
                    size="small"
                    bordered={false}
                    style={{ borderTop: `3px solid ${VI.accent}` }}
                  >
                    <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)' }}>{d.dimensionLabel}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: VI.deep }}>
                      {d.avgScore.toFixed(0)}
                      <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', fontWeight: 400 }}> 分</span>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Tag color="success">{d.green} 达标</Tag>
                      <Tag color="warning">{d.yellow} 待改进</Tag>
                      <Tag color="error">{d.red} 未达标</Tag>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 达成率条形图 */}
            <Card title="20 项指标达成率（红黄绿三色 · 达标线 100%）" style={{ marginBottom: 16 }}>
              {rateOption && <ReactECharts option={rateOption} style={{ height: 360 }} />}
            </Card>

            {/* 指标明细表 */}
            <Card title="国考指标明细（四维 20 项）">
              <Table
                rowKey="code"
                pagination={false}
                dataSource={results}
                locale={{ emptyText: '暂无指标数据' }}
                size="small"
                columns={[
                  { title: '编码', dataIndex: 'code', width: 70, fixed: 'left' },
                  { title: '指标名称', dataIndex: 'name', width: 240 },
                  { title: '维度', dataIndex: 'dimensionLabel', width: 100 },
                  {
                    title: '实际值',
                    dataIndex: 'actual',
                    width: 100,
                    render: (v: number, r: KpiResult) => `${v} ${r.unit}`,
                  },
                  {
                    title: '目标值',
                    dataIndex: 'target',
                    width: 100,
                    render: (v: number, r: KpiResult) => `${v} ${r.unit}`,
                  },
                  {
                    title: '达成率',
                    dataIndex: 'achievementRate',
                    width: 100,
                    render: (v: number) => `${(v * 100).toFixed(0)}%`,
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 100,
                    render: (v: KpiStatus, r: KpiResult) => (
                      <Tag color={STATUS_TAG[v]} style={{ borderLeft: `3px solid ${STATUS_COLOR[v]}` }}>
                        {r.statusLabel}
                      </Tag>
                    ),
                  },
                  {
                    title: '环比趋势',
                    dataIndex: 'code',
                    width: 120,
                    render: (_: unknown, r: KpiResult) => {
                      const t = data.trend?.find((x) => x.code === r.code);
                      if (!t) return <span style={{ color: 'rgba(0,0,0,0.35)' }}>—</span>;
                      return (
                        <Tag color={t.improving ? 'green' : 'red'}>
                          {t.delta > 0 ? '+' : ''}
                          {t.delta}
                        </Tag>
                      );
                    },
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
