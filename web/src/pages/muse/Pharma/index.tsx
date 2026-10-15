/**
 * 健澜科技 jlmedaios - 药师个人审方经验页（M116-B）
 *
 * 依据宪法第七章 7.6（药师 Personal Agent）：
 *   三张统计卡（累计审方 / 拦截不合理 / 医生采纳率）；
 *   个人审方学习曲线（echarts 采纳率折线 + 拦截量柱状，按日分桶）；
 *   高频问题药物组合 Top10（命中次数 / 拦截率，命中即重点复核）。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 * 权限：仅本人（admin 带 staffId 看他人由 BFF 保证，前端不做开关）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Layout,
  Row,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const WARN = '#faad14';
const DANGER = '#cf1322';
const OK = '#52c41a';

/** 与 BFF GET /api/v1/muse/pharma 响应 data 对齐 */
interface DrugPairStat {
  drugPair: string;
  issueType: string;
  audits: number;
  blocked: number;
  blockedRate: number;
}

interface TrendPoint {
  period: string;
  audits: number;
  blocked: number;
  adoptionRate: number;
}

interface PharmaMuseData {
  demo: boolean;
  staffId: string;
  totalAudits: number;
  blockedUnreasonable: number;
  adoptionRate: number;
  topDrugPairs: DrugPairStat[];
  accuracyTrend: TrendPoint[];
}

/** 单张统计卡 */
function StatCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
}) {
  return (
    <Card
      style={{ borderTop: `3px solid ${accent}`, borderRadius: 8, height: '100%' }}
      bodyStyle={{ padding: 20 }}
    >
      <Text type="secondary">{label}</Text>
      <div style={{ marginTop: 8 }}>
        <Title level={2} style={{ color: DEEP_BG, margin: 0 }}>
          {value}
          {suffix && (
            <Text style={{ fontSize: 14, color: 'rgba(10,37,64,0.55)', marginLeft: 4 }}>
              {suffix}
            </Text>
          )}
        </Title>
      </div>
    </Card>
  );
}

export default function PharmaMusePage() {
  const [data, setData] = useState<PharmaMuseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<PharmaMuseData>('/muse/pharma', undefined, { silent: true });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '药师审方经验页加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isEmpty = !!data && data.totalAudits === 0 && data.topDrugPairs.length === 0;

  // 学习曲线：采纳率折线（左轴）+ 拦截量柱状（右轴），深海蓝 VI
  const trendOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: 'rgba(255,255,255,0.75)' }, top: 0 },
    grid: { left: 48, right: 48, top: 40, bottom: 32 },
    xAxis: {
      type: 'category',
      data: data?.accuracyTrend.map((p) => p.period.slice(5)) ?? [],
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
      axisLabel: { color: 'rgba(255,255,255,0.65)' },
    },
    yAxis: [
      {
        type: 'value',
        name: '采纳率',
        min: 0,
        max: 1,
        axisLabel: { color: 'rgba(255,255,255,0.65)' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      {
        type: 'value',
        name: '拦截数',
        min: 0,
        axisLabel: { color: 'rgba(255,255,255,0.65)' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '医生采纳率',
        type: 'line',
        smooth: true,
        data: data?.accuracyTrend.map((p) => p.adoptionRate) ?? [],
        lineStyle: { color: ACCENT, width: 3 },
        itemStyle: { color: ACCENT },
        areaStyle: { color: 'rgba(74,144,217,0.25)' },
      },
      {
        name: '拦截数',
        type: 'bar',
        yAxisIndex: 1,
        data: data?.accuracyTrend.map((p) => p.blocked) ?? [],
        itemStyle: { color: 'rgba(250,173,20,0.75)' },
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: DEEP_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          我的药师 MUSE · 审方经验
        </Title>
        <div>
          {data?.demo && (
            <Badge count="演示数据" style={{ background: WARN, marginRight: 12 }} overflowCount={99} />
          )}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            刷新
          </Button>
        </div>
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={error}
            action={
              <Button size="small" danger onClick={() => void load()}>
                重试
              </Button>
            }
          />
        )}

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip="加载药师审方经验…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无审方经验：完成第一次前置审方拦截后，这里会自动沉淀拦截统计、学习曲线与高频问题药物组合" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 三张统计卡：拦截统计 */}
            <Col xs={24} sm={8}>
              <StatCard
                label="累计审方"
                value={String(data?.totalAudits ?? 0)}
                suffix="次"
                accent={DEEP_BG}
              />
            </Col>
            <Col xs={24} sm={8}>
              <StatCard
                label="拦截不合理处方"
                value={String(data?.blockedUnreasonable ?? 0)}
                suffix="张"
                accent={DANGER}
              />
            </Col>
            <Col xs={24} sm={8}>
              <StatCard
                label="医生采纳率"
                value={((data?.adoptionRate ?? 0) * 100).toFixed(1)}
                suffix="%"
                accent={OK}
              />
            </Col>

            {/* 学习曲线：采纳率折线 + 拦截量柱状 */}
            <Col span={24}>
              <Card
                title={<span style={{ color: '#fff' }}>审方学习曲线（采纳率 ↑ / 拦截量）</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <ReactECharts option={trendOption} style={{ height: 320 }} />
              </Card>
            </Col>

            {/* 高频问题药物组合 Top10 */}
            <Col span={24}>
              <Card title="高频问题药物组合 Top10（重点复核）" style={{ borderRadius: 8 }}>
                <Table<DrugPairStat>
                  rowKey="drugPair"
                  size="middle"
                  pagination={false}
                  dataSource={data?.topDrugPairs ?? []}
                  columns={[
                    {
                      title: '#',
                      width: 56,
                      render: (_v, _r, idx) => (
                        <Text strong style={{ color: idx < 3 ? DANGER : MID_BLUE }}>
                          {idx + 1}
                        </Text>
                      ),
                    },
                    { title: '药物组合', dataIndex: 'drugPair' },
                    {
                      title: '问题类型',
                      dataIndex: 'issueType',
                      render: (v: string) => <Tag color={MID_BLUE}>{v || '—'}</Tag>,
                    },
                    { title: '命中次数', dataIndex: 'audits', sorter: (a, b) => a.audits - b.audits },
                    { title: '拦截次数', dataIndex: 'blocked' },
                    {
                      title: '拦截率',
                      dataIndex: 'blockedRate',
                      render: (v: number) => `${(v * 100).toFixed(0)}%`,
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
