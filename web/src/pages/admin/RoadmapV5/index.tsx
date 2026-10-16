/**
 * 健澜科技 jlmedaios - M181-D v5.0 产品路线图页（仅 admin）
 *
 * 展示 BFF /api/v1/admin/roadmap/v5 的三阶段路线图：
 *   近期 v5.0-v5.2（AI医院大脑2.0/数字孪生3D深化/全自学习闭环）
 *   中期 v5.3-v5.5（区域医疗协同/医联体/分级诊疗深化）
 *   远期 v5.6-v6.0（数字孪生医院/元宇宙诊室/全自学习医院，v6.0 为 300 版本里程碑）。
 * 右侧面板给「优先级排序」（带排名与一句话理由）与逐条工作量估算。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（无路线图数据）。
 * 视觉：深海蓝 VI（#0a2540 -> #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Row, Space, Spin, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type PhaseV5 = 'near' | 'mid' | 'far';
type EffortSizeV5 = 'S' | 'M' | 'L' | 'XL';

interface RoadmapItemV5 {
  id: string;
  title: string;
  theme: string;
  phase: PhaseV5;
  targetVersion: string;
  description: string;
  businessValue: number;
  userImpact: number;
  risk: number;
  dependencyDepth: number;
}

interface PhaseMetaV5 {
  phase: PhaseV5;
  label: string;
  versionRange: string;
  goal: string;
}

interface RoadmapV5 {
  currentVersion: string;
  phases: PhaseMetaV5[];
  items: RoadmapItemV5[];
  milestones: string[];
}

interface EffortV5 {
  size: EffortSizeV5;
  personWeeks: number;
  confidence: number;
}

interface PrioritizedItemV5 {
  item: RoadmapItemV5;
  score: number;
  rank: number;
  rationale: string;
}

interface RoadmapV5ItemView {
  item: RoadmapItemV5;
  effort: EffortV5;
}

interface RoadmapV5View {
  roadmap: RoadmapV5;
  prioritized: PrioritizedItemV5[];
  itemEfforts: RoadmapV5ItemView[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const PHASE_COLOR: Record<PhaseV5, string> = {
  near: '#1e6fbf',
  mid: '#2f9e8f',
  far: '#8a6bbf',
};

const EFFORT_COLOR: Record<EffortSizeV5, string> = {
  S: 'green',
  M: 'blue',
  L: 'orange',
  XL: 'red',
};

/** 【300版本里程碑】目标版本号，前端高亮用 */
const MILESTONE_300_VERSION = 'v6.0';

export default function RoadmapV5Page() {
  const [data, setData] = useState<RoadmapV5View | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/roadmap/v5');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || 'v5.0 路线图加载失败');
        setData(null);
      } else {
        setData(json.data as RoadmapV5View);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  /** itemId -> effort，便于阶段卡片上直接挂工作量标签 */
  const effortMap = useMemo(() => {
    const m = new Map<string, EffortV5>();
    data?.itemEfforts.forEach((v) => m.set(v.item.id, v.effort));
    return m;
  }, [data]);

  if (loading) {
    return (
      <Content style={{ padding: 24, background: VI.bg }}>
        <Spin size="large" tip="v5.0 路线图加载中…">
          <div style={{ minHeight: 320 }} />
        </Spin>
      </Content>
    );
  }

  if (error) {
    return (
      <Content style={{ padding: 24, background: VI.bg }}>
        <Alert
          type="error"
          message="v5.0 路线图加载失败"
          description={error}
          action={
            <Button size="small" onClick={load}>
              重试
            </Button>
          }
        />
      </Content>
    );
  }

  if (!data || data.roadmap.items.length === 0) {
    return (
      <Content style={{ padding: 24, background: VI.bg }}>
        <Alert type="info" showIcon message="暂无 v5.0 路线图数据" />
      </Content>
    );
  }

  const { roadmap, prioritized } = data;

  return (
    <Layout style={{ background: VI.bg }}>
      {/* 深海蓝渐变头部 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '20px 24px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          v5.0 产品路线图
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '6px 0 0' }}>
          当前版本 {roadmap.currentVersion} · 近期做深智能与孪生、中期走向区域协同、远期兑现全自学习医院（务实不画饼）
        </Paragraph>
      </div>

      <Content style={{ padding: 24 }}>
        <Row gutter={[16, 16]}>
          {/* 三阶段卡片 */}
          {roadmap.phases.map((phase) => {
            const items = roadmap.items.filter((it) => it.phase === phase.phase);
            return (
              <Col xs={24} lg={8} key={phase.phase}>
                <Card
                  title={
                    <Space>
                      <span style={{ color: PHASE_COLOR[phase.phase] }}>●</span>
                      <span>
                        {phase.label} · {phase.versionRange}
                      </span>
                    </Space>
                  }
                  headStyle={{ borderBottom: `2px solid ${PHASE_COLOR[phase.phase]}` }}
                >
                  <Paragraph type="secondary" style={{ fontSize: 12 }}>
                    {phase.goal}
                  </Paragraph>
                  <List
                    dataSource={items}
                    size="small"
                    renderItem={(it) => {
                      const effort = effortMap.get(it.id);
                      const isMilestone = it.targetVersion === MILESTONE_300_VERSION;
                      return (
                        <List.Item key={it.id} style={{ alignItems: 'flex-start' }}>
                          <div>
                            <Space size={6} wrap>
                              <Text strong>{it.title}</Text>
                              <Tag color="blue">{it.targetVersion}</Tag>
                              {isMilestone && <Tag color="gold">300版本里程碑</Tag>}
                              {effort && (
                                <Tag color={EFFORT_COLOR[effort.size]}>
                                  {effort.size} · {effort.personWeeks}人周
                                </Tag>
                              )}
                            </Space>
                            <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0' }}>
                              {it.description}
                            </Paragraph>
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                </Card>
              </Col>
            );
          })}
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
          {/* 优先级排序 */}
          <Col xs={24} lg={14}>
            <Card title="优先级排序（业务价值高 / 风险耦合可控者先行）">
              <List
                dataSource={prioritized}
                renderItem={(p) => (
                  <List.Item key={p.item.id}>
                    <Space align="start">
                      <Tag color={VI.accent} style={{ minWidth: 32, textAlign: 'center' }}>
                        #{p.rank}
                      </Tag>
                      <div>
                        <Space size={6}>
                          <Text strong>{p.item.title}</Text>
                          <Tag>{p.item.targetVersion}</Tag>
                          <Text type="secondary">得分 {p.score}</Text>
                        </Space>
                        <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0' }}>
                          {p.rationale}
                        </Paragraph>
                      </div>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* 关键里程碑 */}
          <Col xs={24} lg={10}>
            <Card title="关键里程碑">
              <List
                dataSource={roadmap.milestones}
                renderItem={(m) => (
                  <List.Item key={m}>
                    <Text style={{ fontSize: 13 }}>{m}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
