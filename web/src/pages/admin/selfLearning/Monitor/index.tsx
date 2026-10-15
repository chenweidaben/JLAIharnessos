/**
 * 健澜科技 jlmedaios - M146-D 推荐策略自学习监控页（越用越聪明深化 · 仅 admin）
 *
 * 展示 BFF /api/v1/admin/self-learning/log 的自学习留痕：
 *   - 概览卡片：本窗口调整次数 / 已生效(applied) / 待上线(held) / 平均采纳率 / 最大调整幅度；
 *   - 采纳率 & 调整幅度双轴趋势图（越用越聪明，但单次封顶 ±20%、权重 [0.1,3.0]）；
 *   - 留痕流水表：策略 / 时间 / 采纳率 / 调整幅度 / 状态 / 新旧权重对比。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无自学习数据）。
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
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF getSelfLearningLog 出参对齐 */
interface LogEntry {
  runDate: string;
  strategyId: string;
  oldWeights: Record<string, number>;
  newWeights: Record<string, number>;
  adoptedCount: number;
  rejectedCount: number;
  adoptedRate: number;
  adjustmentRatio: number;
  status: 'applied' | 'held';
  createdAt: string;
}

interface LogResponse {
  days: number;
  total: number;
  items: LogEntry[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

function formatWeights(w: Record<string, number>): string {
  return Object.entries(w)
    .map(([k, v]) => `${k}:${v}`)
    .join('  ');
}

export default function SelfLearningMonitorPage() {
  const [data, setData] = useState<LogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/self-learning/log?days=30');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as LogResponse);
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

  const items = data?.items ?? [];

  const summary = useMemo(() => {
    const applied = items.filter((i) => i.status === 'applied').length;
    const held = items.filter((i) => i.status === 'held').length;
    const avgRate =
      items.length > 0
        ? items.reduce((s, i) => s + i.adoptedRate, 0) / items.length
        : 0;
    const maxAdj = items.reduce((m, i) => Math.max(m, i.adjustmentRatio), 0);
    return { total: items.length, applied, held, avgRate, maxAdj };
  }, [items]);

  // 趋势图：按时间正序，双轴展示采纳率与调整幅度
  const chartOption = useMemo(() => {
    const ordered = items.slice().reverse();
    return {
      color: [VI.accent, '#13c2c2'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0, data: ['采纳率', '调整幅度'] },
      grid: { left: 48, right: 48, top: 40, bottom: 32 },
      xAxis: {
        type: 'category',
        data: ordered.map((i) => i.runDate),
        boundaryGap: false,
      },
      yAxis: [
        { type: 'value', name: '采纳率', min: 0, max: 1 },
        { type: 'value', name: '调整幅度', min: 0, max: 0.2 },
      ],
      series: [
        {
          name: '采纳率',
          type: 'line',
          smooth: true,
          data: ordered.map((i) => Number(i.adoptedRate.toFixed(3))),
        },
        {
          name: '调整幅度',
          type: 'bar',
          yAxisIndex: 1,
          data: ordered.map((i) => Number(i.adjustmentRatio.toFixed(3))),
        },
      ],
    };
  }, [items]);

  const columns: ColumnsType<LogEntry> = [
    { title: '运行日期', dataIndex: 'runDate', key: 'runDate', width: 110 },
    { title: '策略', dataIndex: 'strategyId', key: 'strategyId', width: 160 },
    {
      title: '采纳率',
      dataIndex: 'adoptedRate',
      key: 'adoptedRate',
      width: 90,
      render: (v: number) => `${(v * 100).toFixed(1)}%`,
      sorter: (a, b) => a.adoptedRate - b.adoptedRate,
    },
    {
      title: '调整幅度',
      dataIndex: 'adjustmentRatio',
      key: 'adjustmentRatio',
      width: 100,
      render: (v: number) => (
        <Text style={{ color: v >= 0.15 ? '#fa8c16' : undefined }}>
          ±{(v * 100).toFixed(1)}%
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: LogEntry['status']) =>
        v === 'applied' ? (
          <Tag color="success">已生效</Tag>
        ) : (
          <Tag color="default">待上线</Tag>
        ),
    },
    {
      title: '新权重分布',
      dataIndex: 'newWeights',
      key: 'newWeights',
      render: (w: Record<string, number>) => (
        <Text code style={{ fontSize: 12 }}>
          {formatWeights(w)}
        </Text>
      ),
    },
  ];

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
          推荐策略自学习监控 · 越用越聪明深化
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          高采纳率升权 / 低采纳率降权 · 单次幅度封顶 ±20% · 权重边界
          [0.1, 3.0] · 仅 admin 可见 · 窗口近 {data?.days ?? 30} 天
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载自学习留痕…" />
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

        {!loading && !error && items.length === 0 && (
          <Alert
            type="info"
            showIcon
            message="暂无自学习数据。触发 POST /api/v1/admin/self-learning/optimize 后将自动展示权重调优留痕。"
          />
        )}

        {!loading && !error && items.length > 0 && (
          <>
            {/* 概览卡片 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic title="调优次数" value={summary.total} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic
                    title="已生效 / 待上线"
                    value={`${summary.applied} / ${summary.held}`}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic
                    title="平均采纳率"
                    value={summary.avgRate}
                    precision={3}
                    valueStyle={{ color: VI.accent }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card>
                  <Statistic
                    title="单次最大调整幅度"
                    value={summary.maxAdj}
                    precision={3}
                    prefix="±"
                    valueStyle={{
                      color: summary.maxAdj >= 0.15 ? '#fa8c16' : '#52c41a',
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 趋势图 */}
            <Card title="采纳率与调整幅度趋势" style={{ marginBottom: 16 }}>
              <ReactECharts option={chartOption} style={{ height: 320 }} notMerge />
            </Card>

            {/* 留痕流水 */}
            <Card title="自学习留痕流水">
              <Table
                rowKey={(r) => `${r.createdAt}-${r.strategyId}`}
                columns={columns}
                dataSource={items}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size="small"
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
