/**
 * 健澜科技 jlmedaios - M172-A 【安全质量与运营】医院应急管理深化页（管理驾驶舱，仅 admin）
 *
 * 应急预案要真能用，不能纸上谈兵：
 *   - 十类情景预案库：指挥体系 / 响应阶段 / 关键动作 / 物资 / 通报链条，拿到就能照做；
 *   - 风险评估：按科室暴露度量化谁该先补短板；
 *   - 演练智能排期：按风险等级 + 上次成绩自动加密，逾期最急在前；
 *   - 应急物资：库存缺口 + 效期预警，"账上有"不算数，"拿得出"才算数；
 *   - 响应自动化：触发信号 → 自动通知 → 自动启动预案。
 *
 * 三态：loading / error（可重试）/ empty（演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Row, Spin, Table, Tag, Timeline, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type RiskLevel = 'high' | 'medium' | 'low';

interface DeepPlan {
  scenario: string;
  scenarioName: string;
  riskLevel: RiskLevel;
  command: { chief: string; onScene: string; groups: string[] };
  phases: { phase: string; goal: string; deadline: string }[];
  actions: string[];
  resources: string[];
  drillIntervalDays: number;
}

interface RiskRow {
  dept: string;
  scenario: string;
  scenarioName: string;
  score: number;
  level: RiskLevel;
  suggestions: string[];
}

interface DrillRow {
  scenario: string;
  scenarioName: string;
  riskLevel: RiskLevel;
  nextDrillDate: string;
  daysUntil: number;
  accelerated: boolean;
  reason: string;
}

interface SupplyRow {
  itemCode: string;
  itemName: string;
  location: string;
  requiredQty: number;
  currentQty: number;
  unit: string;
  status: 'ok' | 'low_stock' | 'expired' | 'expiring_soon';
  issue: string | null;
}

interface SupplySummary {
  total: number;
  okCount: number;
  lowStockCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  items: SupplyRow[];
}

interface TriggerMatch {
  ruleCode: string;
  scenario: string;
  notifications: { role: string; channel: string; withinMin: number }[];
  autoActions: string[];
}

interface DeepResponse {
  system: DeepPlan[];
  risk: RiskRow[];
  drillSchedule: DrillRow[];
  supply: SupplySummary;
  automation: { rules: number; matched: TriggerMatch[] };
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
  high: { label: '高危', color: 'red' },
  medium: { label: '中危', color: 'orange' },
  low: { label: '低危', color: 'green' },
};

const SUPPLY_META: Record<SupplyRow['status'], { label: string; color: string }> = {
  ok: { label: '正常', color: 'green' },
  low_stock: { label: '库存不足', color: 'orange' },
  expiring_soon: { label: '即将到期', color: 'gold' },
  expired: { label: '已过期', color: 'red' },
};

const DEPT_NAME: Record<string, string> = { ED: '急诊', ICU: 'ICU', WARD: '普通病房' };

export default function EmergencyDeepPage() {
  const [data, setData] = useState<DeepResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/emergency/deep');
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
    void load();
  }, [load]);

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
          应急管理深化 · 安全质量与运营
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 仅 admin 可见 · 应急预案要真能用，不能纸上谈兵
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总全院应急体系…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无应急数据。" />
        )}

        {!loading && !error && data && (
          <>
            {data.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为演示模式数据：接入院端安防/后勤/物资系统后，页面呈现真实可运转的应急体系。"
              />
            )}

            {/* 风险评估 */}
            <Card title="科室应急风险评估" size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey={(r) => r.dept}
                size="small"
                pagination={false}
                dataSource={data.risk}
                columns={[
                  { title: '科室', dataIndex: 'dept', render: (d: string) => DEPT_NAME[d] ?? d },
                  { title: '风险分', dataIndex: 'score', render: (s: number) => <Text strong>{s}</Text> },
                  {
                    title: '等级',
                    dataIndex: 'level',
                    render: (l: RiskLevel) => <Tag color={RISK_META[l].color}>{RISK_META[l].label}</Tag>,
                  },
                  { title: '改进建议', dataIndex: 'suggestions', render: (s: string[]) => s.join('；') },
                ]}
              />
            </Card>

            <Row gutter={16}>
              {/* 演练排期 */}
              <Col span={12}>
                <Card title="演练智能排期（逾期优先）" size="small" style={{ marginBottom: 16 }}>
                  <List
                    size="small"
                    dataSource={data.drillSchedule.slice(0, 6)}
                    renderItem={(d) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <span>
                              {d.scenarioName}
                              <Tag style={{ marginLeft: 8 }} color={RISK_META[d.riskLevel].color}>
                                {RISK_META[d.riskLevel].label}
                              </Tag>
                              {d.accelerated && <Tag color="red">加密补课</Tag>}
                            </span>
                          }
                          description={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              下次 {d.nextDrillDate}（{d.daysUntil <= 0 ? '已逾期' : `${d.daysUntil} 天后`}）· {d.reason}
                            </Text>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>

              {/* 物资跟踪 */}
              <Col span={12}>
                <Card
                  title={`应急物资跟踪（缺口 ${data.supply.lowStockCount} · 效期预警 ${data.supply.expiringSoonCount + data.supply.expiredCount}）`}
                  size="small"
                  style={{ marginBottom: 16 }}
                >
                  <Table
                    rowKey="itemCode"
                    size="small"
                    pagination={false}
                    dataSource={data.supply.items}
                    columns={[
                      { title: '物资', dataIndex: 'itemName' },
                      {
                        title: '库存',
                        dataIndex: 'currentQty',
                        render: (q: number, r) => `${q}/${r.requiredQty} ${r.unit}`,
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        render: (s: SupplyRow['status']) => <Tag color={SUPPLY_META[s].color}>{SUPPLY_META[s].label}</Tag>,
                      },
                      { title: '提示', dataIndex: 'issue', render: (i: string | null) => i ?? '—' },
                    ]}
                  />
                </Card>
              </Col>
            </Row>

            {/* 响应自动化 */}
            <Card title="响应自动化联动（触发 → 通知 → 自动启动预案）" size="small" style={{ marginBottom: 16 }}>
              {data.automation.matched.length === 0 ? (
                <Text type="secondary">当前信号未命中任何规则。</Text>
              ) : (
                data.automation.matched.map((m) => (
                  <div key={m.ruleCode} style={{ marginBottom: 12 }}>
                    <Tag color={VI.accent}>{m.ruleCode}</Tag>
                    <Timeline
                      style={{ marginTop: 8 }}
                      items={[
                        ...m.notifications.map((n) => ({
                          children: `${n.role} · ${n.channel} · ${n.withinMin} 分钟内送达`,
                        })),
                        ...m.autoActions.map((a) => ({ children: `自动启动：${a}` })),
                      ]}
                    />
                  </div>
                ))
              )}
            </Card>

            {/* 预案库 */}
            <Card title="十类情景预案库（拿到就能照做）" size="small">
              <Row gutter={[16, 16]}>
                {data.system.map((p) => (
                  <Col span={8} key={p.scenario}>
                    <Card size="small" type="inner" title={`${p.scenarioName}`}>
                      <Paragraph style={{ fontSize: 12, marginBottom: 4 }}>
                        <Tag color={RISK_META[p.riskLevel].color}>{RISK_META[p.riskLevel].label}</Tag>
                        总指挥：{p.command.chief}
                      </Paragraph>
                      <List
                        size="small"
                        dataSource={p.actions.slice(0, 4)}
                        renderItem={(a) => <List.Item style={{ fontSize: 12, padding: '4px 0' }}>· {a}</List.Item>}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
