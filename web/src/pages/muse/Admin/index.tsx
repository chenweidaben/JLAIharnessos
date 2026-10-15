/**
 * 健澜科技 jlmedaios - 管理员 MUSE 决策经验页（M116-C）
 *
 * 依据宪法第七章 7.6（管理员 MUSE）：
 *   决策效果统计（总决策数 / 平均量化改善 / 最佳 ROI / 失败复盘）；
 *   决策 ROI 分析（横向条形图，按 ROI 降序展示各类管理决策回报）；
 *   管理经验时间线（历史管理决策 + 结局 + 量化改善，失败复盘置前着色）。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 * 权限：仅 admin 可访问（BFF 已强校验，前端不做开关）。
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
  List,
  Row,
  Spin,
  Tag,
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

/** 与 BFF GET /api/v1/muse/admin 响应 data 对齐 */
interface RoiRankItem {
  id: string;
  decisionType: string;
  action: string;
  outcome: Outcome;
  resultMetric: number;
  roi: number;
}

interface TimelineItem {
  date: string;
  decisionType: string;
  action: string;
  outcome: Outcome;
  resultMetric: number;
  roi: number;
}

interface AdminMuseData {
  demo: boolean;
  staffId: string;
  totalDecisions: number;
  avgMetricImprovement: number;
  roiRanking: RoiRankItem[];
  decisionTimeline: TimelineItem[];
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

export default function AdminMusePage() {
  const [data, setData] = useState<AdminMuseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<AdminMuseData>('/muse/admin', undefined, { silent: true });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '管理员 MUSE 决策经验加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isEmpty =
    !!data && data.totalDecisions === 0 && data.roiRanking.length === 0 && data.decisionTimeline.length === 0;

  // 失败复盘数（时间线中 outcome=failure 的条数）
  const failureCount = useMemo(
    () => (data?.decisionTimeline ?? []).filter((t) => t.outcome === 'failure').length,
    [data],
  );

  // 最佳 ROI（roiRanking 已降序，第一条即最高）
  const bestRoi = data?.roiRanking?.[0]?.roi ?? 0;

  // 决策 ROI 分析：横向条形图（深海蓝 VI，负 ROI 用红色）
  const roiOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 120, right: 32, top: 24, bottom: 24 },
    xAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.65)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: (data?.roiRanking ?? []).map((r) => r.decisionType),
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
      axisLabel: { color: 'rgba(255,255,255,0.75)' },
    },
    series: [
      {
        name: 'ROI',
        type: 'bar',
        data: (data?.roiRanking ?? []).map((r) => ({
          value: r.roi,
          itemStyle: { color: r.roi >= 0 ? ACCENT : '#cf1322', borderRadius: [0, 4, 4, 0] },
        })),
        barWidth: 14,
        label: { show: true, position: 'right', color: 'rgba(255,255,255,0.85)', fontSize: 11 },
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
          管理员 MUSE · 决策经验
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
            <Spin size="large" tip="加载管理员决策经验…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无管理决策记忆：记录第一次管理决策后，这里会自动沉淀决策效果统计、ROI 分析与经验时间线" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 决策效果统计：四张统计卡 */}
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="总决策数" value={String(data?.totalDecisions ?? 0)} suffix="次" accent={DEEP_BG} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="平均量化改善"
                value={(data?.avgMetricImprovement ?? 0).toFixed(2)}
                suffix="%"
                accent="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="最佳 ROI" value={bestRoi.toFixed(2)} suffix="pts" accent={ACCENT} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="失败复盘" value={String(failureCount)} suffix="条" accent="#cf1322" />
            </Col>

            {/* 决策 ROI 分析 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>决策 ROI 分析</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <ReactECharts option={roiOption} style={{ height: 360 }} />
              </Card>
            </Col>

            {/* 决策 ROI 排行列表 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>决策 ROI 排行</span>}
                style={{ background: DEEP_BG, borderRadius: 8, height: 420 }}
                bodyStyle={{ background: DEEP_BG, overflowY: 'auto', maxHeight: 360 }}
              >
                <List
                  size="small"
                  dataSource={data?.roiRanking ?? []}
                  renderItem={(item, idx) => (
                    <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: '#fff' }}>
                            <Tag color={MID_BLUE}>{idx + 1}</Tag>
                            {item.decisionType}
                          </Text>
                          <Text style={{ color: item.roi >= 0 ? '#52c41a' : '#ff7875', fontWeight: 600 }}>
                            ROI {item.roi >= 0 ? '+' : ''}
                            {item.roi.toFixed(2)}
                          </Text>
                        </div>
                        <div>
                          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                            {item.action || '（未填写动作）'} ｜ 量化 {item.resultMetric.toFixed(2)}% ｜{' '}
                            <span style={{ color: OUTCOME_COLOR[item.outcome] }}>
                              {OUTCOME_TAG[item.outcome] ?? item.outcome}
                            </span>
                          </Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            {/* 管理经验时间线 */}
            <Col span={24}>
              <Card
                title={<span style={{ color: '#fff' }}>管理经验时间线</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <Timeline
                  items={(data?.decisionTimeline ?? []).map((t) => ({
                    color: OUTCOME_COLOR[t.outcome] ?? OUTCOME_COLOR.mixed,
                    children: (
                      <div>
                        <Text style={{ color: '#fff' }}>
                          <span style={{ color: OUTCOME_COLOR[t.outcome] }}>
                            ［{OUTCOME_TAG[t.outcome] ?? t.outcome}］
                          </span>
                          {t.date}　【{t.decisionType}】{t.action || '（未填写动作）'}
                        </Text>
                        <div>
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                            量化改善 {t.resultMetric.toFixed(2)}% ｜ ROI {t.roi >= 0 ? '+' : ''}
                            {t.roi.toFixed(2)}
                          </Text>
                        </div>
                      </div>
                    ),
                  }))}
                />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
