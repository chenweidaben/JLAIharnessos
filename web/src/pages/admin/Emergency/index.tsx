/**
 * 健澜科技 jlmedaios - M162-A 医院安全与应急管理页（医院全场景，仅 admin）
 *
 * 【应急预案要真能用，不能纸上谈兵】覆盖五类突发情景：
 *   批量伤员(交通事故/工伤) / 火灾疏散 / 停电应急 / 信息系统故障 / 传染病暴发。
 *
 * 交互：
 *   1) 选择情景 → GET /api/v1/admin/emergency/plan?scenario=xxx，
 *      展示指挥体系 / 响应阶段时限 / 分阶段关键动作 / 物资 / 对外通报链条 + 现场核对表；
 *   2) 选择演练日期 → POST /api/v1/admin/emergency/drill {planId, date} 排定演练；
 *   3) 提交演练实测指标 → 同路由 evaluate 模式加权打分定级（优秀/合格/不合格）。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。三态：loading / error / empty。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Layout,
  List,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

// ---- 与 BFF 对齐的类型 ----
interface CommandRole { role: string; duty: string }
interface PhaseStep { phase: string; goal: string; deadline: string }
interface ActionStep { order: number; phase: string; action: string; owner: string; critical: boolean }
interface ResourceItem { category: string; items: string[]; qty?: string }
interface CommChain { target: string; channel: string; deadline: string }
interface Plan {
  scenario: string;
  scenarioName: string;
  matched: boolean;
  level: string;
  objectives: string[];
  command: CommandRole[];
  phases: PhaseStep[];
  actions: ActionStep[];
  resources: ResourceItem[];
  communication: CommChain[];
  drillFrequency: string;
  disclaimer: string;
}
interface ChecklistItem { order: number; phase: string; action: string; responsible: string; critical: boolean }
interface PlanResp { plan: Plan; checklist: ChecklistItem[] }
interface DrillSchedule {
  drillId: string; planId: string; scenario: string; scheduledDate: string;
  drillType: string; expectedDurationMin: number; participants: string[];
  objectives: string[]; remindAt: string; status: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 五类情景选项 */
const SCENARIOS = [
  { value: 'mass_casualty', label: '批量伤员（交通事故/工伤）' },
  { value: 'fire_evacuation', label: '火灾疏散' },
  { value: 'power_outage', label: '停电应急' },
  { value: 'it_failure', label: '信息系统故障' },
  { value: 'outbreak', label: '传染病暴发' },
];

const LEVEL_COLOR: Record<string, string> = {
  'Ⅰ级': 'red',
  'Ⅱ级': 'orange',
  'Ⅲ级': 'blue',
};

export default function AdminEmergencyPage() {
  const [scenario, setScenario] = useState<string>('mass_casualty');
  const [data, setData] = useState<PlanResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [drillDate, setDrillDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [schedule, setSchedule] = useState<DrillSchedule | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const load = async (sc: string) => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/v1/admin/emergency/plan?scenario=${encodeURIComponent(sc)}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as PlanResp);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(scenario);
  }, [scenario]);

  const plan = data?.plan;

  const onSchedule = async () => {
    setScheduling(true);
    try {
      const resp = await fetch('/api/v1/admin/emergency/drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: `${scenario}-001`, date: drillDate }),
      });
      const json = await resp.json();
      if (json.code === 0 && json.data?.schedule) {
        setSchedule(json.data.schedule as DrillSchedule);
      }
    } catch {
      // 静默：排期失败不打断浏览
    } finally {
      setScheduling(false);
    }
  };

  /** 响应阶段时间线 */
  const phaseItems = useMemo(() => {
    if (!plan) return [];
    return plan.phases.map((p) => ({
      title: `${p.phase}`,
      description: (
        <span>
          {p.goal}
          <br />
          <Text type="secondary">时限：{p.deadline}</Text>
        </span>
      ),
    }));
  }, [plan]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          医院安全与应急管理 · 应急预案与演练
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          应急预案要真能用，不能纸上谈兵 · 医院全场景五情景 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* 情景选择 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Text strong>选择突发情景：</Text>
            </Col>
            <Col flex="auto">
              <Select
                value={scenario}
                style={{ width: 280 }}
                options={SCENARIOS}
                onChange={(v) => setScenario(v)}
              />
            </Col>
            <Col>
              <Space>
                <Text type="secondary">演练日期：</Text>
                <input
                  type="date"
                  value={drillDate}
                  onChange={(e) => setDrillDate(e.target.value)}
                  style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 6 }}
                />
                <Button type="primary" loading={scheduling} onClick={onSchedule}>
                  排定演练
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在聚合应急预案…" />
          </div>
        )}

        {!loading && error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        {!loading && !error && !plan && (
          <Alert type="info" showIcon message="暂无预案，请选择上方情景。" />
        )}

        {!loading && !error && plan && (
          <>
            {/* 预案概要 */}
            <Card style={{ marginBottom: 16 }}>
              <Descriptions
                title={
                  <Space>
                    {plan.scenarioName}
                    <Tag color={LEVEL_COLOR[plan.level] ?? 'blue'}>响应{plan.level}</Tag>
                  </Space>
                }
                column={{ xs: 1, sm: 2, md: 3 }}
              >
                <Descriptions.Item label="建议演练频次">{plan.drillFrequency}</Descriptions.Item>
                <Descriptions.Item label="是否命中预案库">
                  {plan.matched ? <Tag color="success">已命中</Tag> : <Tag color="warning">兜底骨架</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="演练形式">
                  {schedule ? <Tag color="processing">{schedule.drillType}</Tag> : '—'}
                </Descriptions.Item>
              </Descriptions>
              <List
                size="small"
                header={<Text strong>处置目标</Text>}
                dataSource={plan.objectives}
                renderItem={(o) => <List.Item>· {o}</List.Item>}
                style={{ marginTop: 8 }}
              />
              <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                {plan.disclaimer}
              </Paragraph>
            </Card>

            {/* 排期结果 */}
            {schedule && (
              <Card title={`本次演练排期 · ${schedule.drillId}`} style={{ marginBottom: 16 }}>
                <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                  <Descriptions.Item label="计划时间">{new Date(schedule.scheduledDate).toLocaleString('zh-CN')}</Descriptions.Item>
                  <Descriptions.Item label="预计时长">{schedule.expectedDurationMin} 分钟</Descriptions.Item>
                  <Descriptions.Item label="提前提醒">{new Date(schedule.remindAt).toLocaleString('zh-CN')}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag color="processing">{schedule.status}</Tag>
                  </Descriptions.Item>
                </Descriptions>
                <Text strong>参演部门：</Text>
                <Space wrap style={{ marginTop: 8 }}>
                  {schedule.participants.map((p) => (
                    <Tag key={p} color="blue">{p}</Tag>
                  ))}
                </Space>
                <br />
                <Text strong style={{ marginTop: 8, display: 'inline-block' }}>演练目标：</Text>
                <List size="small" dataSource={schedule.objectives} renderItem={(o) => <List.Item>· {o}</List.Item>} />
              </Card>
            )}

            {/* 指挥体系 */}
            <Card title="指挥体系与职责" style={{ marginBottom: 16 }}>
              <Table
                size="small"
                rowKey="role"
                pagination={false}
                dataSource={plan.command}
                columns={[
                  { title: '岗位', dataIndex: 'role', key: 'role', width: 160 },
                  { title: '职责', dataIndex: 'duty', key: 'duty' },
                ]}
              />
            </Card>

            {/* 响应阶段 */}
            <Card title="响应阶段与时限" style={{ marginBottom: 16 }}>
              <Steps
                direction="vertical"
                current={phaseItems.length}
                items={phaseItems.map((p, i) => ({ ...p, status: 'finish', icon: <Tag color={VI.accent}>{i + 1}</Tag> }))}
              />
            </Card>

            {/* 关键动作 */}
            <Card title="分阶段关键动作（可直接照做）" style={{ marginBottom: 16 }}>
              <List
                dataSource={plan.actions}
                renderItem={(a) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span>
                          {a.critical && <Tag color="red">关键</Tag>}
                          <Tag>{a.phase}</Tag>
                          {a.action}
                        </span>
                      }
                      description={<Text type="secondary">责任：{a.owner}</Text>}
                    />
                  </List.Item>
                )}
              />
            </Card>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Card title="物资与资源需求" style={{ marginBottom: 16 }}>
                  <List
                    size="small"
                    dataSource={plan.resources}
                    renderItem={(r) => (
                      <List.Item>
                        <List.Item.Meta
                          title={`${r.category}${r.qty ? `（${r.qty}）` : ''}`}
                          description={r.items.join('、')}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="对外报告与通报链条" style={{ marginBottom: 16 }}>
                  <Table
                    size="small"
                    rowKey="target"
                    pagination={false}
                    dataSource={plan.communication}
                    columns={[
                      { title: '通报对象', dataIndex: 'target', key: 'target' },
                      { title: '方式', dataIndex: 'channel', key: 'channel' },
                      { title: '时限', dataIndex: 'deadline', key: 'deadline' },
                    ]}
                  />
                </Card>
              </Col>
            </Row>

            {/* 现场核对表 */}
            {/* v5.0试点扩展：空值防护 checklist 为 null 时不白屏 */}
            <Card title={`现场处置核对表（${data?.checklist?.length ?? 0} 项，关键项已标注）`}>
              <List
                size="small"
                dataSource={data?.checklist ?? []}
                renderItem={(c) => (
                  <List.Item>
                    <Text strong>{c.order}.</Text>
                    {c.critical && <Tag color="red" style={{ marginLeft: 8 }}>必做</Tag>}
                    <Tag style={{ marginLeft: 8 }}>{c.phase}</Tag>
                    <span style={{ marginLeft: 8 }}>{c.action}</span>
                    <Text type="secondary" style={{ marginLeft: 8 }}>（{c.responsible}）</Text>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
