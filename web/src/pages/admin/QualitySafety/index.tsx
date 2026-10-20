/**
 * 健澜科技 jlmedaios - M180-A 医院质量与安全管理深化页（管理驾驶舱，仅 admin）
 *
 * 【质量与体验·核心主张】质量管理要国家口径，不能自创：
 *   - 医疗质量：三级公立医院绩效考核国家监测指标 + 电子病历五级 + 互联互通四甲；
 *   - 患者安全：十大安全目标 + 不良事件上报 + 根因分析 RCA；
 *   - 质量改进：PDCA + 品管圈 QCC + 六西格玛 DMAIC + 精益 Lean；
 *   - 评审准备：三甲评审条款 + 证据链 + 差距分析 + 整改跟踪。
 *
 * 患者安全零容忍项阳性即红线。三态：loading / error（可重试）/ demo（演示数据标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Row, Segmented, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type GapSeverity = 'red' | 'yellow' | 'green';
type ImprovementMethod = 'PDCA' | 'QCC' | 'DMAIC' | 'LEAN';

interface DimBlock {
  code: string;
  name: string;
  description: string;
  nationalItems: Array<{ code: string; name: string; nationalTarget: string }>;
  actions: string[];
}

interface DeepSystem {
  dimensions: DimBlock[];
  nationalStandard: string;
  valueStatement: string;
  guardrails: string[];
}

interface TrackedIndicator {
  dept: string;
  period: string;
  code: string;
  name: string;
  unit: string;
  target: number;
  actual: number;
  deviationPct: number;
  severity: GapSeverity;
  underpowered: boolean;
  summary: string;
}

interface QualityGap {
  code: string;
  name: string;
  unit: string;
  standard: number;
  current: number;
  gap: number;
  gapPct: number;
  severity: GapSeverity;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
}

interface GapReport {
  dept: string;
  total: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  gaps: QualityGap[];
  summary: string;
}

interface ImprovementMeasure {
  action: string;
  owner: string;
  timeline: string;
  expectedEffect: string;
}

interface ImprovementPlan {
  issue: string;
  rootCause: string;
  method: ImprovementMethod;
  methodRationale: string;
  measures: ImprovementMeasure[];
  closedLoop: string;
}

interface DeepResponse {
  system: DeepSystem;
  tracked: TrackedIndicator[];
  gaps: GapReport;
  improvement: ImprovementPlan;
  dept: string;
  period: string;
  demo: boolean;
  generatedAt: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const SEVERITY_META: Record<GapSeverity, { label: string; color: string }> = {
  red: { label: '红线', color: 'red' },
  yellow: { label: '黄线', color: 'orange' },
  green: { label: '达标', color: 'green' },
};

const METHOD_COLOR: Record<ImprovementMethod, string> = {
  PDCA: 'blue',
  QCC: 'cyan',
  DMAIC: 'geekblue',
  LEAN: 'purple',
};

const DEPT_OPTIONS = [
  { label: '全院', value: '全院' },
  { label: '内科', value: '内科' },
  { label: '外科', value: '外科' },
  { label: '妇产科', value: '妇产科' },
];

export default function QualitySafetyPage() {
  const [dept, setDept] = useState<string>('全院');
  const [data, setData] = useState<DeepResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/v1/quality/deep?dept=${encodeURIComponent(d)}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as DeepResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(dept);
  }, [dept, load]);

  const system = data?.system;
  // v5.0试点扩展：空值防护 tracked/gaps 为 null 时不白屏
  const trackedList = data?.tracked ?? [];
  const trackedRed = trackedList.filter((t) => t.severity === 'red').length;
  const trackedYellow = trackedList.filter((t) => t.severity === 'yellow').length;

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
          质量与安全管理深化
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 仅 admin 可见 · 指标全部国家口径，不自创 · 患者安全目标零发生
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <Segmented options={DEPT_OPTIONS} value={dept} onChange={(v) => setDept(String(v))} />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总国家口径质量与安全指标…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => load(dept)}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && !system && (
          <Alert
            type="info"
            showIcon
            message="暂无质量与安全数据。接入质控/护理/评审数据平台后将自动成盘。"
          />
        )}

        {!loading && !error && system && (
          <>
            {data?.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为演示模式数据：尚未接入真实质量指标采集，页面仅用于演示国家口径质量与安全驾驶舱效果。"
              />
            )}

            {/* 结论横幅 */}
            <Card style={{ marginBottom: 16, borderLeft: `4px solid ${VI.accent}` }}>
              <Text strong style={{ fontSize: 16, color: VI.deep }}>
                {data?.dept ?? '—'} 质量与安全驾驶舱：四大维度体系已就绪（{(system?.dimensions ?? []).length} 维）。
              </Text>
              <div style={{ marginTop: 8 }}>
                <Tag color="red">红线 {trackedRed}</Tag>
                <Tag color="orange">黄线 {trackedYellow}</Tag>
                <Tag color="green">达标 {trackedList.length ? trackedList.length - trackedRed - trackedYellow : 0}</Tag>
                <Tag>{data?.gaps?.summary ?? '—'}</Tag>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>依据：{system.nationalStandard}</Text>
              </div>
            </Card>

            {/* 四大维度体系 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {(system?.dimensions ?? []).map((dim) => (
                <Col xs={24} sm={12} lg={6} key={dim.code}>
                  <Card size="small" title={<Text strong style={{ color: VI.deep }}>{dim.name}</Text>}>
                    <Paragraph type="secondary" style={{ fontSize: 12, minHeight: 44 }}>
                      {dim.description}
                    </Paragraph>
                    <List
                      size="small"
                      dataSource={(dim.nationalItems ?? []).slice(0, 4)}
                      renderItem={(item) => (
                        <List.Item style={{ padding: '4px 0' }}>
                          <Text style={{ fontSize: 12 }}>· {item.name}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 国家口径指标跟踪 */}
            <Card title={<Text strong style={{ color: VI.deep }}>国家口径指标跟踪（{data?.period}）</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="code"
                size="small"
                pagination={false}
                dataSource={data?.tracked ?? []}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name' },
                  { title: '国家达标线', dataIndex: 'target', key: 'target', render: (v: number, r) => `${v}${r.unit}` },
                  { title: '实测', dataIndex: 'actual', key: 'actual', render: (v: number, r) => `${v}${r.unit}` },
                  { title: '偏差%', dataIndex: 'deviationPct', key: 'deviationPct', render: (v: number) => `${v}%` },
                  {
                    title: '判定',
                    dataIndex: 'severity',
                    key: 'severity',
                    render: (s: GapSeverity) => <Tag color={SEVERITY_META[s].color}>{SEVERITY_META[s].label}</Tag>,
                  },
                ]}
              />
            </Card>

            {/* 差距分析 */}
            <Card title={<Text strong style={{ color: VI.deep }}>现状 vs 国家/评审标准差距</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="code"
                size="small"
                pagination={false}
                dataSource={data?.gaps?.gaps ?? []}
                columns={[
                  { title: '对照项', dataIndex: 'name', key: 'name' },
                  { title: '标准', dataIndex: 'standard', key: 'standard', render: (v: number, r) => `${v}${r.unit}` },
                  { title: '现状', dataIndex: 'current', key: 'current', render: (v: number, r) => `${v}${r.unit}` },
                  { title: '差距%', dataIndex: 'gapPct', key: 'gapPct', render: (v: number) => `${v}%` },
                  {
                    title: '等级',
                    dataIndex: 'severity',
                    key: 'severity',
                    render: (s: GapSeverity) => <Tag color={SEVERITY_META[s].color}>{SEVERITY_META[s].label}</Tag>,
                  },
                  { title: '整改建议', dataIndex: 'suggestion', key: 'suggestion', ellipsis: true },
                ]}
              />
            </Card>

            {/* 根因改进措施 */}
            {data?.improvement && (
              <Card
                title={
                  /* v5.0试点扩展（M184空壳崩溃修复）：issue 为 null 时不白屏 */
                  <Text strong style={{ color: VI.deep }}>
                    根因改进措施 · {(data.improvement.issue ?? '').slice(0, 24)}…
                  </Text>
                }
                extra={<Tag color={METHOD_COLOR[data.improvement.method]}>{data.improvement.method}</Tag>}
              >
                <Paragraph type="secondary" style={{ fontSize: 12 }}>
                  根因分类：{data.improvement.rootCause}；推荐方法论理由：{data.improvement.methodRationale}
                </Paragraph>
                <List
                  size="small"
                  bordered
                  dataSource={data.improvement.measures ?? []}
                  renderItem={(m, idx) => (
                    <List.Item>
                      <Text strong style={{ marginRight: 8 }}>{idx + 1}.</Text>
                      <span style={{ flex: 1 }}>{m.action}</span>
                      <Text type="secondary" style={{ marginLeft: 12 }}>责任：{m.owner}</Text>
                      <Text type="secondary" style={{ marginLeft: 12 }}>时限：{m.timeline}</Text>
                      <Text type="secondary" style={{ marginLeft: 12 }}>预期：{m.expectedEffect}</Text>
                    </List.Item>
                  )}
                />
                <Paragraph style={{ marginTop: 12, fontSize: 12 }}>
                  <Text strong>闭环要求：</Text>
                  {data.improvement.closedLoop}
                </Paragraph>
              </Card>
            )}
          </>
        )}
      </Content>
    </Layout>
  );
}
