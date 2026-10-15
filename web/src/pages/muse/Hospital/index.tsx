/**
 * 健澜科技 jlmedaios - 全院智慧资产看板 Hospital MUSE 总览（M116-D）
 *
 * 依据宪法第七章（全角色 Personal Agent / 7.2 全院层 / 7.7 教训单独成桶 /
 * 7.9 全院知识反哺与跨科人才调度）：
 *   - 顶部四张总览卡：全院经验总量 / 教训总量 / 活跃沉淀员工 / 知识资产；
 *   - 科室经验横向对比（柱状）：暴露经验洼地，支撑资源调度；
 *   - 按月增长曲线（堆叠面积）：经验 / 知识 / 教训三条增长线；
 *   - 人才地图：按主题检索全院专家榜（?topic=），支撑跨科会诊。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 * 权限：仅院长 / admin（BFF 403 拦截，前端提示无权限）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Layout,
  List,
  Row,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';

/** 角色中文称呼 */
const ROLE_LABEL: Record<string, string> = {
  doctor: '医生',
  nurse: '护士',
  pharmacist: '药师',
};

/* ------------------------- 与 BFF GET /muse/hospital 对齐 ------------------------- */

interface DeptComparisonRow {
  deptCode: string;
  deptName: string;
  staffCount: number;
  experienceCount: number;
  knowledgeCount: number;
  lessonCount: number;
}

interface GrowthTrendPoint {
  period: string;
  experiences: number;
  knowledge: number;
  lessons: number;
}

interface TopicExpert {
  staffId: string;
  staffName: string;
  deptCode: string;
  deptName: string;
  role: string;
  decisionCount: number;
  successRate: number;
}

interface HospitalWisdomData {
  demo: boolean;
  totalExperiences: number;
  totalLessons: number;
  activeStaff: number;
  deptComparison: DeptComparisonRow[];
  growthTrend: GrowthTrendPoint[];
  experts: TopicExpert[];
  requestedTopic: string | null;
}

/** 单张总览卡 */
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

export default function HospitalWisdomPage() {
  const [data, setData] = useState<HospitalWisdomData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [topic, setTopic] = useState<string>('');

  const load = useCallback(async (topicQuery = '') => {
    setLoading(true);
    setError('');
    try {
      const params = topicQuery ? { topic: topicQuery } : undefined;
      const res = await get<HospitalWisdomData>('/muse/hospital', params, { silent: true });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '全院智慧资产看板加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isEmpty = !!data && data.totalExperiences === 0 && data.deptComparison.length === 0;

  /* 科室经验横向对比（横向柱状，深海蓝渐变） */
  const deptOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: 'rgba(255,255,255,0.7)' } },
    grid: { left: 110, right: 24, top: 32, bottom: 24 },
    xAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.65)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    yAxis: {
      type: 'category',
      data: (data?.deptComparison ?? []).map((d) => d.deptName || d.deptCode),
      axisLabel: { color: 'rgba(255,255,255,0.75)' },
    },
    series: [
      {
        name: '经验决策',
        type: 'bar',
        data: (data?.deptComparison ?? []).map((d) => d.experienceCount),
        itemStyle: { color: ACCENT, borderRadius: [0, 4, 4, 0] },
      },
      {
        name: '教训',
        type: 'bar',
        data: (data?.deptComparison ?? []).map((d) => d.lessonCount),
        itemStyle: { color: '#cf1322', borderRadius: [0, 4, 4, 0] },
      },
    ],
  };

  /* 按月增长曲线（经验 / 知识 / 教训三条线） */
  const trendOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: 'rgba(255,255,255,0.7)' } },
    grid: { left: 48, right: 24, top: 40, bottom: 28 },
    xAxis: {
      type: 'category',
      data: (data?.growthTrend ?? []).map((p) => p.period),
      axisLabel: { color: 'rgba(255,255,255,0.65)' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.65)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: [
      {
        name: '经验',
        type: 'line',
        smooth: true,
        data: (data?.growthTrend ?? []).map((p) => p.experiences),
        lineStyle: { color: ACCENT, width: 3 },
        itemStyle: { color: ACCENT },
        areaStyle: { color: 'rgba(74,144,217,0.18)' },
      },
      {
        name: '知识',
        type: 'line',
        smooth: true,
        data: (data?.growthTrend ?? []).map((p) => p.knowledge),
        lineStyle: { color: '#52c41a', width: 2 },
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '教训',
        type: 'line',
        smooth: true,
        data: (data?.growthTrend ?? []).map((p) => p.lessons),
        lineStyle: { color: '#faad14', width: 2 },
        itemStyle: { color: '#faad14' },
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
          全院智慧资产看板
        </Title>
        <div>
          {data?.demo && (
            <Tag color="warning" style={{ marginRight: 12 }}>
              演示数据
            </Tag>
          )}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load(topic)}>
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
              <Button size="small" danger onClick={() => void load(topic)}>
                重试
              </Button>
            }
          />
        )}

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip="加载全院智慧资产看板…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="全院尚无智慧资产沉淀：员工在 MUSE 中完成首次决策经验记录后，这里将自动汇总经验总量、科室对比与增长曲线" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 四张总览卡 */}
            <Col xs={12} lg={6}>
              <StatCard label="全院经验总量" value={String(data?.totalExperiences ?? 0)} suffix="次" accent={DEEP_BG} />
            </Col>
            <Col xs={12} lg={6}>
              <StatCard label="全院教训" value={String(data?.totalLessons ?? 0)} suffix="条" accent="#cf1322" />
            </Col>
            <Col xs={12} lg={6}>
              <StatCard label="活跃沉淀员工" value={String(data?.activeStaff ?? 0)} suffix="人" accent={MID_BLUE} />
            </Col>
            <Col xs={12} lg={6}>
              <StatCard
                label="科室知识资产"
                value={String((data?.deptComparison ?? []).reduce((s, d) => s + d.knowledgeCount, 0))}
                suffix="条"
                accent="#52c41a"
              />
            </Col>

            {/* 科室经验横向对比 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>科室经验对比</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <ReactECharts option={deptOption} style={{ height: 320 }} />
              </Card>
            </Col>

            {/* 按月增长曲线 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>智慧资产增长趋势</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <ReactECharts option={trendOption} style={{ height: 320 }} />
              </Card>
            </Col>

            {/* 人才地图：按主题检索专家 */}
            <Col span={24}>
              <Card title="人才地图 · 按主题检索全院专家" style={{ borderRadius: 8 }}>
                <Input.Search
                  placeholder="输入决策主题，如「STEMI 急诊再灌注」「CAP 经验性抗感染」"
                  enterButton={
                    <Button type="primary" icon={<SearchOutlined />}>
                      检索专家
                    </Button>
                  }
                  size="large"
                  style={{ marginBottom: 16 }}
                  onSearch={(v) => {
                    setTopic(v.trim());
                    void load(v.trim());
                  }}
                />
                {(data?.experts ?? []).length === 0 ? (
                  <Empty description="输入主题后，此处展示该方向全院专家榜（按决策频次与成功率排序）" />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={data?.experts ?? []}
                    renderItem={(e, idx) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <span>
                              <Tag color={idx === 0 ? 'gold' : 'blue'}>NO.{idx + 1}</Tag>
                              {e.staffName || e.staffId}
                              <Tag style={{ marginLeft: 8 }}>{ROLE_LABEL[e.role] ?? e.role}</Tag>
                              <Tag color="cyan">{e.deptName || e.deptCode}</Tag>
                            </span>
                          }
                          description={
                            <Text type="secondary">
                              累计决策 {e.decisionCount} 次 ｜ 成功率 {(e.successRate * 100).toFixed(1)}%
                            </Text>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
