/**
 * 健澜科技 jlmedaios - M134-B 医生成长档案页（医生工作台入口）
 *
 * 【用户体验深化】让医生看到自己的进步、有成就感：
 *   - 顶部四张统计卡：累计病例 / 平均诊断准确率 / 经验沉淀条数 / 同科室排名；
 *   - 成长曲线：月度病例数（柱）+ 平均准确率（线，双轴）；
 *   - 四维能力雷达：诊断 / 用药 / 沟通 / 管理；
 *   - 技能标签演化：首次出现月份 + 趋势（growing/stable/fading）；
 *   - 同科室对比：本人 vs 科室平均，分位与排名。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading / error+重试 / empty。
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
  Progress,
  Row,
  Spin,
  Tag,
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
const GOLD = '#faad14';

/* ------------------------------------------------------------------ */
/* 与 BFF GET /api/v1/doctor/growth-profile 响应 data 对齐              */
/* ------------------------------------------------------------------ */

interface MonthlyGrowthSnapshot {
  period: string;
  casesHandled: number;
  avgScore: number;
  experienceCount: number;
  skills: string[];
}

interface SkillEvolutionItem {
  skill: string;
  firstPeriod: string;
  lastPeriod: string;
  periodsActive: number;
  trend: 'growing' | 'stable' | 'fading';
}

interface PeerStat {
  doctorId: string;
  casesHandled: number;
  avgScore: number;
  experienceCount: number;
}

interface PeerComparison {
  self: PeerStat;
  deptAverage: { casesHandled: number; avgScore: number; experienceCount: number };
  rank: number;
  rankTotal: number;
  percentile: number;
}

interface RadarScores {
  diagnosis: number;
  medication: number;
  communication: number;
  management: number;
}

interface GrowthProfileData {
  demo: boolean;
  doctorId: string;
  cumulativeCases: number;
  overallAccuracy: number;
  totalExperience: number;
  monthlyTrend: MonthlyGrowthSnapshot[];
  skillsEvolution: SkillEvolutionItem[];
  peerComparison: PeerComparison;
  radar: RadarScores;
}

/** 单张统计卡 */
function StatCard({
  label,
  value,
  suffix,
  accent,
  extra,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
  extra?: React.ReactNode;
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
        {extra}
      </div>
    </Card>
  );
}

export default function DoctorGrowthPage() {
  const currentId = useAuthStore((s) => s.user?.id ?? '');
  // 管理员可通过 ?doctorId=xxx 查看他人；默认本人
  const targetDoctorId =
    new URLSearchParams(window.location.search).get('doctorId')?.trim() || currentId || 'demo';

  const [data, setData] = useState<GrowthProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<GrowthProfileData>(
        `/doctor/growth-profile?doctorId=${encodeURIComponent(targetDoctorId)}`,
        undefined,
        { silent: true },
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '医生成长档案加载失败');
    } finally {
      setLoading(false);
    }
  }, [targetDoctorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthly = useMemo(() => data?.monthlyTrend ?? [], [data]);
  const skillsEvo = useMemo(() => data?.skillsEvolution ?? [], [data]);
  const peers = useMemo(() => data?.peerComparison, [data]);
  const isEmpty = !loading && !error && monthly.length === 0;

  /** 成长曲线：柱=月度病例数，线=平均准确率（双轴） */
  const lineOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: 'rgba(255,255,255,0.75)' }, top: 0 },
    grid: { left: 48, right: 56, top: 40, bottom: 32 },
    xAxis: {
      type: 'category',
      data: monthly.map((m) => m.period),
      axisLabel: { color: 'rgba(255,255,255,0.7)' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '病例数',
        nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
        axisLabel: { color: 'rgba(255,255,255,0.65)' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      {
        type: 'value',
        name: '准确率',
        min: 0,
        max: 100,
        nameTextStyle: { color: 'rgba(255,255,255,0.6)' },
        axisLabel: { color: 'rgba(255,255,255,0.65)', formatter: (v: number) => `${v}%` },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '病例数',
        type: 'bar',
        data: monthly.map((m) => m.casesHandled),
        itemStyle: { color: MID_BLUE, borderRadius: [4, 4, 0, 0] },
        barWidth: 22,
      },
      {
        name: '平均准确率',
        type: 'line',
        yAxisIndex: 1,
        data: monthly.map((m) => m.avgScore),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
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
  const trendIcon = (trend: SkillEvolutionItem['trend']) =>
    trend === 'growing' ? (
      <RiseOutlined style={{ color: GREEN }} />
    ) : trend === 'fading' ? (
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
          医生成长档案
        </Title>
        <div>
          {data?.demo && (
            <Badge count="演示数据" style={{ background: GOLD, marginRight: 12 }} overflowCount={99} />
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
            <Empty description="暂无成长数据：开始处理病例并沉淀经验后，这里会自动绘制成长曲线与能力雷达" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 概览统计卡 */}
            <Col xs={12} lg={6}>
              <StatCard
                label="累计处理病例"
                value={String(data?.cumulativeCases ?? 0)}
                suffix="例"
                accent={DEEP_BG}
              />
            </Col>
            <Col xs={12} lg={6}>
              <StatCard
                label="平均诊断准确率"
                value={`${(data?.overallAccuracy ?? 0).toFixed(1)}`}
                suffix="%"
                accent={MID_BLUE}
              />
            </Col>
            <Col xs={12} lg={6}>
              <StatCard
                label="经验沉淀条数"
                value={String(data?.totalExperience ?? 0)}
                suffix="条"
                accent={ACCENT}
              />
            </Col>
            <Col xs={12} lg={6}>
              <StatCard
                label="同科室排名"
                value={peers ? `${peers.rank}/${peers.rankTotal}` : '--'}
                suffix={`前 ${peers?.percentile ?? 0}%`}
                accent={GREEN}
                extra={
                  <Progress
                    percent={peers?.percentile ?? 0}
                    size="small"
                    strokeColor={GREEN}
                    showInfo={false}
                  />
                }
              />
            </Col>

            {/* 成长曲线 */}
            <Col xs={24} lg={14}>
              <Card
                title={<span style={{ color: '#fff' }}>月度成长曲线</span>}
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

            {/* 技能标签演化 */}
            <Col xs={24} lg={10}>
              <Card title="技能标签演化" style={{ borderRadius: 8 }}>
                {skillsEvo.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无技能标签" />
                ) : (
                  skillsEvo.map((s) => (
                    <div
                      key={s.skill}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                        padding: '6px 10px',
                        background: '#f6f9fc',
                        borderRadius: 6,
                      }}
                    >
                      <div>
                        <Tag color={MID_BLUE} style={{ marginRight: 8 }}>
                          {s.skill}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {s.firstPeriod} 起 · 活跃 {s.periodsActive} 个月
                        </Text>
                      </div>
                      <span title={`趋势：${s.trend}`}>{trendIcon(s.trend)}</span>
                    </div>
                  ))
                )}
              </Card>
            </Col>

            {/* 同科室对比 */}
            <Col xs={24} lg={14}>
              <Card title="同科室对比" style={{ borderRadius: 8 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Text type="secondary">本人准确率</Text>
                    <Title level={4} style={{ color: DEEP_BG, marginTop: 4 }}>
                      {peers?.self.avgScore.toFixed(1)}%
                    </Title>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">科室平均</Text>
                    <Title level={4} style={{ color: MID_BLUE, marginTop: 4 }}>
                      {peers?.deptAverage.avgScore.toFixed(1)}%
                    </Title>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">本人累计病例</Text>
                    <Title level={4} style={{ color: ACCENT, marginTop: 4 }}>
                      {peers?.self.casesHandled ?? 0}
                      <Text style={{ fontSize: 12, marginLeft: 4 }}>
                        / 科室均值 {peers?.deptAverage.casesHandled ?? 0}
                      </Text>
                    </Title>
                  </Col>
                </Row>
                <Alert
                  style={{ marginTop: 12 }}
                  type={peers && peers.avgScore >= (peers.deptAverage.avgScore ?? 0) ? 'success' : 'info'}
                  showIcon
                  message={
                    peers
                      ? `你的准确率 ${peers.self.avgScore.toFixed(1)}%，${
                          peers.self.avgScore >= peers.deptAverage.avgScore
                            ? `高于科室均值 ${(peers.self.avgScore - peers.deptAverage.avgScore).toFixed(1)} 个百分点，继续保持！`
                            : `低于科室均值 ${(peers.deptAverage.avgScore - peers.self.avgScore).toFixed(1)} 个百分点，还有上升空间。`
                        }`
                      : '暂无对比数据'
                  }
                />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
