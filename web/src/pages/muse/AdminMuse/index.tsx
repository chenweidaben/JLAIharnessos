/**
 * 健澜科技 jlmedaios - 管理员个人管理智能体页（M169-D）
 *
 * 知识图谱与 Personal Agent：
 *   不是空喊「建议关注」，而是把这位管理员四类沉淀（运营决策 / 管理经验 /
 *   资源调配 / 危机处理）画成画像——成长分、擅长打法、待补强盲区、栽过的跟头、
 *   危机处置稳健度，让经验真沉淀、决策有依据。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
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
  List,
  Progress,
  Row,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { get } from '@/services/request';
import { useAuthStore } from '@/store/authStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';

/** 与 BFF GET /api/v1/admin/muse/:staffId 响应 data 对齐 */
interface CategoryProfile {
  category: string;
  label: string;
  count: number;
  avgEffectiveness: number;
  successRate: number;
}
interface ProfileLesson {
  id: string;
  category: string;
  subType: string;
  action: string;
  reflection: string;
  effectiveness: number;
}
interface ProfileGap {
  category: string;
  label: string;
  reason: string;
}
interface AdminMuseProfileData {
  staffId: string;
  seeded: boolean;
  totalExperiences: number;
  growthScore: number;
  byCategory: CategoryProfile[];
  strengths: ProfileLesson[];
  gaps: ProfileGap[];
  pitfalls: ProfileLesson[];
  crisisSteadiness: number;
  isColdStart: boolean;
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
    <Card style={{ borderTop: `3px solid ${accent}`, borderRadius: 8, height: '100%' }}>
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

export default function AdminMuseAgentPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [data, setData] = useState<AdminMuseProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const staffId = currentUserId || 'dean-001';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<AdminMuseProfileData>(
        `/admin/muse/${encodeURIComponent(staffId)}`,
        undefined,
        { silent: true },
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '个人管理智能体加载失败');
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  // 四类沉淀分布图：左轴条数，右轴平均效果
  const categoryOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { textStyle: { color: 'rgba(255,255,255,0.75)' } },
    grid: { left: 48, right: 48, top: 40, bottom: 24 },
    xAxis: {
      type: 'category',
      data: (data?.byCategory ?? []).map((c) => c.label),
      axisLabel: { color: 'rgba(255,255,255,0.75)' },
    },
    yAxis: [
      {
        type: 'value',
        name: '沉淀条数',
        nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
        axisLabel: { color: 'rgba(255,255,255,0.65)' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      {
        type: 'value',
        name: '平均效果',
        min: -2,
        max: 2,
        nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
        axisLabel: { color: 'rgba(255,255,255,0.65)' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '沉淀条数',
        type: 'bar',
        data: (data?.byCategory ?? []).map((c) => c.count),
        barWidth: 28,
        itemStyle: { color: ACCENT, borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '平均效果',
        type: 'line',
        yAxisIndex: 1,
        data: (data?.byCategory ?? []).map((c) => c.avgEffectiveness),
        itemStyle: colorLine((data?.byCategory ?? []).map((c) => c.avgEffectiveness)),
        symbolSize: 8,
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
          个人管理智能体 · {staffId}
        </Title>
        <div>
          {data?.seeded && (
            <Badge count="演示语料" style={{ background: '#faad14', marginRight: 12 }} overflowCount={99} />
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
            <Spin size="large" tip="正在绘制你的管理画像…" />
          </div>
        ) : data?.isColdStart ? (
          <Card>
            <Empty description="还没有管理经验沉淀：记录第一次管理决策后，这里会自动长出你的个人管理画像" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 概览四张卡 */}
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="已沉淀经验" value={String(data?.totalExperiences ?? 0)} suffix="条" accent={DEEP_BG} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: 8 }}>
                <Text type="secondary">成长分</Text>
                <div style={{ marginTop: 12 }}>
                  <Progress
                    type="dashboard"
                    size={90}
                    percent={data?.growthScore ?? 0}
                    strokeColor={{ '0%': MID_BLUE, '100%': ACCENT }}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="危机处置稳健度"
                value={((data?.crisisSteadiness ?? 0) * 100).toFixed(0)}
                suffix="%"
                accent="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="验证过的打法" value={String(data?.strengths?.length ?? 0)} suffix="条" accent={ACCENT} />
            </Col>

            {/* 四类沉淀分布 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>四类管理沉淀分布</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <ReactECharts option={categoryOption} style={{ height: 340 }} />
              </Card>
            </Col>

            {/* 待补强盲区 */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span>
                    <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    待补强盲区
                  </span>
                }
                style={{ background: DEEP_BG, borderRadius: 8, height: 380 }}
                bodyStyle={{ background: DEEP_BG, overflowY: 'auto', maxHeight: 320 }}
              >
                <List
                  size="small"
                  dataSource={data?.gaps ?? []}
                  locale={{ emptyText: <Text style={{ color: 'rgba(255,255,255,0.6)' }}>暂无明显盲区，继续保持</Text> }}
                  renderItem={(g) => (
                    <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <Tag color="#faad14">{g.label}</Tag>
                        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{g.reason}</Text>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            {/* 擅长打法 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>擅长打法（在你身上成过）</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <List
                  size="small"
                  dataSource={data?.strengths ?? []}
                  renderItem={(s) => (
                    <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#fff' }}>
                            <Tag color={MID_BLUE}>{s.category}·{s.subType}</Tag>
                            {s.action}
                          </Text>
                          <Text style={{ color: '#52c41a', fontWeight: 600 }}>+{s.effectiveness.toFixed(1)}</Text>
                        </div>
                        {s.reflection && (
                          <div>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>复盘：{s.reflection}</Text>
                          </div>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            {/* 栽过的跟头 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>栽过的跟头（别再踩）</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <List
                  size="small"
                  dataSource={data?.pitfalls ?? []}
                  locale={{ emptyText: <Text style={{ color: 'rgba(255,255,255,0.6)' }}>暂无失败记录</Text> }}
                  renderItem={(p) => (
                    <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#ff7875' }}>
                            <Tag color="#cf1322">{p.category}·{p.subType}</Tag>
                            {p.action}
                          </Text>
                          <Text style={{ color: '#ff7875', fontWeight: 600 }}>{p.effectiveness.toFixed(1)}</Text>
                        </div>
                        {p.reflection && (
                          <div>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>教训：{p.reflection}</Text>
                          </div>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}

/** 平均效果折线：正值绿、负值红 */
function colorLine(values: number[]) {
  return {
    color: values.some((v) => v < 0) ? '#ff7875' : '#52c41a',
  };
}
