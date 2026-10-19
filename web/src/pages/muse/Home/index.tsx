/**
 * 健澜科技 jlmedaios - 个人 MUSE 主页（M115-A）
 *
 * 依据宪法第七章（全角色 Personal Agent）：
 *   顶部个人卡片（MUSE 头像 + 角色 + 从业经验年限）；
 *   四张统计卡（总决策数 / 成功率 / 教训数 / 本周新增）；
 *   经验时间线（最近决策与结局，失败教训置顶着色）；
 *   近 30 天成长趋势图（echarts 累计面积曲线）。
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
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Layout,
  Row,
  Spin,
  Timeline,
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

/** 岗位中文称呼 */
const ROLE_LABEL: Record<string, string> = {
  doctor: '医生',
  nurse: '护士',
  pharma: '药师',
  admin: '管理员',
};

type Outcome = 'success' | 'failure' | 'mixed';

const OUTCOME_COLOR: Record<Outcome, string> = {
  success: '#52c41a',
  failure: '#cf1322',
  mixed: '#faad14',
};

const OUTCOME_TAG: Record<Outcome, string> = {
  success: '成功',
  failure: '失败',
  mixed: '混合',
};

/** 与 BFF GET /api/v1/muse/home 响应 data 对齐 */
interface ProfileView {
  staffId: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  yearsOfExperience: number | null;
}

interface TimelineItem {
  date: string;
  decision: string;
  outcome: Outcome;
  lesson?: string;
}

interface GrowthPoint {
  date: string;
  count: number;
}

interface MuseHomeData {
  demo: boolean;
  profile: ProfileView;
  totalDecisions: number;
  successRate: number;
  lessonCount: number;
  weekNew: number;
  timeline: TimelineItem[];
  growth30d: GrowthPoint[];
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

export default function MuseHomePage() {
  const [data, setData] = useState<MuseHomeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<MuseHomeData>('/muse/home', undefined, { silent: true });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '个人 MUSE 主页加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const profile = data?.profile;
  const roleLabel = profile ? ROLE_LABEL[profile.role] ?? '员工' : '员工';
  const isEmpty =
    !!data && data.totalDecisions === 0 && data.timeline.length === 0;

  // 近 30 天成长趋势（累计面积曲线，深海蓝 VI）
  const growthOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 24, top: 32, bottom: 32 },
    xAxis: {
      type: 'category',
      data: (data?.growth30d ?? []).map((p) => p.date.slice(5)),
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
      axisLabel: { color: 'rgba(255,255,255,0.65)' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.65)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: [
      {
        name: '累计决策',
        type: 'line',
        smooth: true,
        step: 'end',
        data: (data?.growth30d ?? []).map((p) => p.count),
        lineStyle: { color: ACCENT, width: 3 },
        itemStyle: { color: ACCENT },
        areaStyle: { color: 'rgba(74,144,217,0.25)' },
      },
    ],
  };

  return (
    <Layout className="jl-responsive" style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: DEEP_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          我的 MUSE 主页
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
            <Spin size="large" tip="加载个人 MUSE 主页…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无决策记忆：完成你的第一次 MUSE 决策后，这里会自动沉淀经验时间线与成长曲线" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 个人卡片：头像 + 角色 + 经验年限 */}
            <Col span={24}>
              <Card style={{ background: DEEP_BG, borderRadius: 8 }} bodyStyle={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <Avatar
                    size={72}
                    src={profile?.avatarUrl ?? undefined}
                    style={{ background: MID_BLUE, color: '#fff', fontSize: 28 }}
                  >
                    {(profile?.name ?? 'M').slice(0, 1)}
                  </Avatar>
                  <div>
                    <Title level={4} style={{ color: '#fff', margin: 0 }}>
                      {profile?.name ?? '未命名员工'}
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {roleLabel} ｜ 从业经验 {profile?.yearsOfExperience ?? 0} 年
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>

            {/* 四张统计卡 */}
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="总决策数" value={String(data?.totalDecisions ?? 0)} suffix="次" accent={DEEP_BG} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="成功率"
                value={((data?.successRate ?? 0) * 100).toFixed(1)}
                suffix="%"
                accent="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="教训数" value={String(data?.lessonCount ?? 0)} suffix="条" accent="#faad14" />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="本周新增" value={String(data?.weekNew ?? 0)} suffix="次" accent={ACCENT} />
            </Col>

            {/* 经验时间线 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>经验时间线</span>}
                style={{ background: DEEP_BG, borderRadius: 8, height: 360 }}
                bodyStyle={{ background: DEEP_BG, overflowY: 'auto', maxHeight: 300 }}
              >
                <Timeline
                  items={(data?.timeline ?? []).map((t) => ({
                    color: OUTCOME_COLOR[t.outcome] ?? OUTCOME_COLOR.mixed,
                    children: (
                      <div>
                        <Text style={{ color: '#fff' }}>
                          <span style={{ color: OUTCOME_COLOR[t.outcome] }}>
                            ［{OUTCOME_TAG[t.outcome] ?? t.outcome}］
                          </span>
                          {t.date}　{t.decision}
                        </Text>
                        {t.lesson && (
                          <div>
                            <Text style={{ color: '#ff9c6e', fontSize: 12 }}>教训：{t.lesson}</Text>
                          </div>
                        )}
                      </div>
                    ),
                  }))}
                />
              </Card>
            </Col>

            {/* 近 30 天成长趋势 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>近 30 天成长趋势</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <ReactECharts option={growthOption} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
