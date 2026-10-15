/**
 * 健澜科技 jlmedaios - 经验模式发现页面（M118-D）
 *
 * 依据宪法第七章（个人信息归属与医院数据治理）：
 *   自动挖掘历史经验中的「条件 → 结局」关联规律——
 *   频次统计（该组合出现次数）+ 置信度（P(结局|条件)），
 *   仅展示脱敏标签统计，不含患者直标身份。
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
  Progress,
  Row,
  Spin,
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

/** 与 BFF GET /api/v1/muse/patterns 响应 data 对齐 */
interface ExperiencePatternView {
  condition: string;
  outcome: string;
  frequency: number;
  confidence: number;
}

interface ExperiencePatternsData {
  demo: boolean;
  generatedAt: string;
  totalExperiences: number;
  patternCount: number;
  patterns: ExperiencePatternView[];
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

export default function ExperiencePatternsPage() {
  const [data, setData] = useState<ExperiencePatternsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<ExperiencePatternsData>('/muse/patterns', undefined, { silent: true });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '经验模式发现加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patterns = useMemo(() => data?.patterns ?? [], [data]);
  const isEmpty = !loading && !error && patterns.length === 0;

  /** 最高置信度 */
  const topConfidence = useMemo(
    () => patterns.reduce((max, p) => Math.max(max, p.confidence), 0),
    [patterns],
  );

  /** 最常见条件（按条件聚合频次后取最大者） */
  const topCondition = useMemo(() => {
    const byCondition = new Map<string, number>();
    for (const p of patterns) {
      byCondition.set(p.condition, (byCondition.get(p.condition) ?? 0) + p.frequency);
    }
    let best = '';
    let bestCount = 0;
    for (const [cond, count] of byCondition) {
      if (count > bestCount) {
        best = cond;
        bestCount = count;
      }
    }
    return best || '—';
  }, [patterns]);

  /** 频次 Top 横向条形图（深海蓝 VI） */
  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: { dataIndex: number }[]) => {
        const p = patterns[params[0].dataIndex];
        if (!p) return '';
        return `${p.condition} → ${p.outcome}<br/>频次 ${p.frequency} 次<br/>置信度 ${(p.confidence * 100).toFixed(0)}%`;
      },
    },
    grid: { left: 150, right: 48, top: 16, bottom: 24 },
    xAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.65)' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: patterns.map((p) => `${p.condition} → ${p.outcome}`),
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
      axisLabel: { color: 'rgba(255,255,255,0.75)', width: 140, overflow: 'truncate' },
    },
    series: [
      {
        name: '频次',
        type: 'bar',
        data: patterns.map((p) => p.frequency),
        itemStyle: { color: ACCENT, borderRadius: [0, 4, 4, 0] },
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
          经验模式发现 · MUSE
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
            <Spin size="large" tip="正在挖掘经验规律…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无经验记录：沉淀第一笔管理/临床经验后，这里会自动挖掘「条件 → 结局」关联规律" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 概览统计卡 */}
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="经验总数"
                value={String(data?.totalExperiences ?? 0)}
                suffix="条"
                accent={DEEP_BG}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="挖掘模式数"
                value={String(data?.patternCount ?? patterns.length)}
                suffix="条"
                accent={MID_BLUE}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="最高置信度"
                value={`${(topConfidence * 100).toFixed(0)}`}
                suffix="%"
                accent="#52c41a"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="最常见条件" value={topCondition} accent={ACCENT} />
            </Col>

            {/* 频次分布条形图 */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>经验频次分布</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <ReactECharts option={chartOption} style={{ height: 360 }} />
              </Card>
            </Col>

            {/* 模式明细列表（含置信度条） */}
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>经验模式明细</span>}
                style={{ background: DEEP_BG, borderRadius: 8, height: 420 }}
                bodyStyle={{ background: DEEP_BG, overflowY: 'auto', maxHeight: 360 }}
              >
                <List
                  size="small"
                  dataSource={patterns}
                  renderItem={(p, idx) => (
                    <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: '#fff' }}>
                            <Tag color={MID_BLUE}>{idx + 1}</Tag>
                            {p.condition} <span style={{ color: ACCENT }}>→</span> {p.outcome}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{p.frequency} 次</Text>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <Progress
                            percent={Math.round(p.confidence * 100)}
                            size="small"
                            strokeColor={p.confidence >= 0.7 ? '#52c41a' : p.confidence >= 0.4 ? ACCENT : '#faad14'}
                            format={(pct?: number) => `${pct ?? 0}%`}
                          />
                        </div>
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
