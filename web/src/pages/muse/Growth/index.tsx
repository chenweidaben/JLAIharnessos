/**
 * 健澜科技 jlmedaios - 医生成长档案页面（M119-A）
 *
 * 依据宪法第七章（全角色 Personal Agent / 个人数据归属）：
 *   把一名医生的历史「决策 → 结局 → 教训」沉淀，可视化为
 *   成长折线（月度决策量 + 成功率）+ 四维能力雷达（诊断/用药/沟通/管理）
 *   + 成长里程碑时间线，仅展示脱敏标签统计，不含患者直标身份。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { ReloadOutlined, RiseOutlined, FallOutlined, MinusOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { get } from '@/services/request';
import { useAuthStore } from '@/store/authStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const GREEN = '#52c41a';
const RED = '#f5222d';

/* ------------------------------------------------------------------ */
/* 与 BFF GET /api/v1/muse/growth/:staffId 响应 data 对齐               */
/* ------------------------------------------------------------------ */

interface MonthlyGrowthPoint {
  month: string;
  decisions: number;
  success: number;
  failure: number;
  mixed: number;
  successRate: number;
}

interface SuccessTrend {
  firstHalfRate: number;
  secondHalfRate: number;
  delta: number;
  direction: 'up' | 'down' | 'flat';
}

interface LessonImprovement {
  lessonsRecorded: number;
  failureLessons: number;
  closedLoops: number;
  improvementRate: number;
}

interface ExpertiseTag {
  tag: string;
  count: number;
}

interface GrowthMilestone {
  at: string;
  type: string;
  title: string;
  description: string;
}

interface RadarScores {
  diagnosis: number;
  medication: number;
  communication: number;
  management: number;
}

interface GrowthData {
  demo: boolean;
  staffId: string;
  monthlyGrowth: MonthlyGrowthPoint[];
  successTrend: SuccessTrend;
  lessonImprovement: LessonImprovement;
  expertiseTags: ExpertiseTag[];
  milestones: GrowthMilestone[];
  radar: RadarScores;
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
        <Title level={3} style={{ color: DEEP_BG, margin: 0 }}>
          {value}
          {suffix && (
            <Text style={{ fontSize: 13, color: 'rgba(10,37,64,0.55)', marginLeft: 4 }}>{suffix}</Text>
          )}
        </Title>
      </div>
    </Card>
  );
}

export default function DoctorGrowthPage() {
  // 默认看本人；admin 可通过 ?staffId=xxx 查看他人（带教 / 抽检）
  const currentId = useAuthStore((s) => s.user?.id ?? '');
  const targetStaffId =
    new URLSearchParams(window.location.search).get('staffId')?.trim() || currentId || 'demo';

  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<GrowthData>(`/muse/growth/${encodeURIComponent(targetStaffId)}`, undefined, {
        silent: true,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '医生成长档案加载失败');
    } finally {
      setLoading(false);
    }
  }, [targetStaffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthly = useMemo(() => data?.monthlyGrowth ?? [], [data]);
  const milestones = useMemo(() => data?.milestones ?? [], [data]);
  const isEmpty = !loading && !error && monthly.length === 0;

  /** 成长折线：柱=月度决策量，线=月度成功率（双轴） */
  const lineOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: 'rgba(255,255,255,0.75)' }, top: 0 },
    grid: { left: 48, right: 56, top: 40, bottom: 32 },
    xAxis: {
      type: 'category',
      data: monthly.map((m) => m.month),
      axisLabel: { color: 'rgba(255,255,255,0.7)' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '决策数',
        nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
        axisLabel: { color: 'rgba(255,255,255,0.65)' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      {
        type: 'value',
        name: '成功率',
        min: 0,
        max: 1,
        nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
        axisLabel: { color: 'rgba(255,255,255,0.65)', formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '决策数',
        type: 'bar',
        data: monthly.map((m) => m.decisions),
        itemStyle: { color: MID_BLUE, borderRadius: [4, 4, 0, 0] },
        barWidth: 18,
      },
      {
        name: '成功率',
        type: 'line',
        yAxisIndex: 1,
        data: monthly.map((m) => m.successRate),
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { color: ACCENT, width: 3 },
        itemStyle: { color: ACCENT },
      },
    ],
  };

  /** 四维能力雷达 */
  const radar = data?.radar;
  const radarOption = {
    backgroundColor: 'transparent',
    tooltip: {},
    radar: {
      indicator: [
        { name: '诊断', max: 100 },
        { name: '用药', max: 100 },
        { name: '沟通', max: 100 },
        { name: '管理', max: 100 },
      ],
      axisName: { color: 'rgba(255,255,255,0.85)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      splitArea: { areaStyle: { color: ['rgba(74,144,217,0.05)', 'rgba(74,144,217,0.12)'] } },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: radar
              ? [radar.diagnosis, radar.medication, radar.communication, radar.management]
              : [0, 0, 0, 0],
            name: '能力雷达',
            areaStyle: { color: 'rgba(74,144,217,0.35)' },
            lineStyle: { color: ACCENT, width: 2 },
            itemStyle: { color: ACCENT },
          },
        ],
      },
    ],
  };

  /** 趋势方向图标 */
  const trendIcon =
    data?.successTrend.direction === 'up' ? (
      <RiseOutlined style={{ color: GREEN }} />
    ) : data?.successTrend.direction === 'down' ? (
      <FallOutlined style={{ color: RED }} />
    ) : (
      <MinusOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
    );

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
          医生成长档案 · MUSE
        </Title>
        <div>
          {data?.demo && (
            <Badge count="演示数据" style={{ background: '#faad14', marginRight: 12 }} overflowCount={99} />
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
            <Spin size="large" tip="正在汇总成长轨迹…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无成长数据：沉淀第一笔临床决策与教训后，这里会自动绘制成长曲线与能力雷达" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 概览统计卡 */}
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="月度决策峰值"
                value={String(monthly.reduce((m, x) => Math.max(m, x.decisions), 0))}
                suffix="例/月"
                accent={DEEP_BG}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="近期成功率"
                value={`${((data?.successTrend.secondHalfRate ?? 0) * 100).toFixed(0)}`}
                suffix="%"
                accent={MID_BLUE}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ borderTop: `3px solid ${GREEN}`, borderRadius: 8, height: '100%' }}>
                <Text type="secondary">成功率趋势 {trendIcon}</Text>
                <div style={{ marginTop: 8 }}>
                  <Title level={3} style={{ color: DEEP_BG, margin: 0 }}>
                    {((data?.successTrend.delta ?? 0) * 100).toFixed(0)}
                    <Text style={{ fontSize: 13, color: 'rgba(10,37,64,0.55)', marginLeft: 4 }}>
                      个百分点
                    </Text>
                  </Title>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="教训闭环率"
                value={`${((data?.lessonImprovement.improvementRate ?? 0) * 100).toFixed(0)}`}
                suffix="%"
                accent={ACCENT}
              />
            </Col>

            {/* 成长折线 */}
            <Col xs={24} lg={14}>
              <Card
                title={<span style={{ color: '#fff' }}>月度成长趋势</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                styles={{ body: { background: DEEP_BG } }}
              >
                <ReactECharts option={lineOption} style={{ height: 340 }} />
              </Card>
            </Col>

            {/* 能力雷达 */}
            <Col xs={24} lg={10}>
              <Card
                title={<span style={{ color: '#fff' }}>四维能力雷达</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                styles={{ body: { background: DEEP_BG } }}
              >
                <ReactECharts option={radarOption} style={{ height: 340 }} />
              </Card>
            </Col>

            {/* 专长标签 */}
            <Col xs={24} lg={10}>
              <Card title="专长标签（按复盘频次）" style={{ borderRadius: 8 }}>
                {(data?.expertiseTags ?? []).length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无专长标签" />
                ) : (
                  (data?.expertiseTags ?? []).map((t) => (
                    <Tag
                      key={t.tag}
                      color={MID_BLUE}
                      style={{ marginBottom: 8, padding: '4px 10px', fontSize: 13 }}
                    >
                      {t.tag} × {t.count}
                    </Tag>
                  ))
                )}
              </Card>
            </Col>

            {/* 里程碑时间线 */}
            <Col xs={24} lg={14}>
              <Card title="成长里程碑" style={{ borderRadius: 8 }}>
                {milestones.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无里程碑" />
                ) : (
                  <Timeline
                    items={milestones.map((m) => ({
                      color: m.type === 'first_success' ? GREEN : m.type === 'first_lesson' ? '#faad14' : ACCENT,
                      children: (
                        <div>
                          <Text strong>{m.title}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {m.at.slice(0, 10)} · {m.description}
                          </Text>
                        </div>
                      ),
                    }))}
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
