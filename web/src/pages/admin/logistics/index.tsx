/**
 * 健澜科技 jlmedaios - M162-D 医院全场景后勤管理页【医院全场景】
 *
 * 落实「后勤派单要高效，不能推诿」：
 *   - 顶部深海蓝横幅 + 效率看板卡：任务总量 / 准时率 / 平均闭环时长 / 派单等待；
 *   - 四大域概览：维修报修 / 被服管理 / 餐饮配送 / 保洁管理；
 *   - 一键派单：选任务子类（水电/空调/设备/家具/洗涤/更换/盘点/患者餐/员工餐/
 *     区域划分/频次/检查）+ 地点 + 描述，系统自动路由到责任班组；
 *   - 任务表按状态过滤（GET /api/v1/logistics/tasks?status=xxx）；
 *   - 巡线路径面板：未闭环任务最近邻排序，一趟跑完少走回头路。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Form, Input, Layout, Modal, Row, Select, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF logisticsAggregator 输出对齐 */
type LogisticsCategory = '维修报修' | '被服管理' | '餐饮配送' | '保洁管理';
type DispatchStatus = '已派单' | '处理中' | '已完成';
type TaskPriority = 'P1' | 'P2' | 'P3';

interface DeepTask {
  id: string;
  category: LogisticsCategory;
  taskType: string;
  location: string;
  x: number;
  y: number;
  description: string;
  handlerTeam: string;
  priority: TaskPriority;
  status: DispatchStatus;
  etaMinutes: number;
  dispatchedAt: string;
}

interface Efficiency {
  period: string;
  total: number;
  doneCount: number;
  openCount: number;
  autoDispatchRate: number;
  onTimeRate: number;
  avgCloseMinutes: number;
  avgDispatchWaitMinutes: number;
  byCategory: Record<LogisticsCategory, number>;
}

interface RouteStop {
  seq: number;
  taskId: string;
  location: string;
  legDistanceKm: number;
}

/** 深海蓝 VI 色板 */
const VI = { deep: '#0a2540', mid: '#123a5e', accent: '#1e6fbf', bg: '#f5f7fa' };

const CATEGORIES: LogisticsCategory[] = ['维修报修', '被服管理', '餐饮配送', '保洁管理'];

/** 任务子类分组（与 DISPATCH_TASK_TYPES / 派单路由表一致） */
const TASK_TYPE_GROUPS: { label: LogisticsCategory; options: string[] }[] = [
  { label: '维修报修', options: ['水电', '空调', '设备', '家具'] },
  { label: '被服管理', options: ['洗涤', '更换', '盘点'] },
  { label: '餐饮配送', options: ['患者餐', '员工餐'] },
  { label: '保洁管理', options: ['区域划分', '频次', '检查'] },
];

const STATUS_COLOR: Record<DispatchStatus, string> = {
  已派单: 'blue', 处理中: 'processing', 已完成: 'green',
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  P1: 'red', P2: 'orange', P3: 'default',
};

export default function LogisticsAdminPage() {
  const [list, setList] = useState<DeepTask[]>([]);
  const [efficiency, setEfficiency] = useState<Efficiency | null>(null);
  const [route, setRoute] = useState<{ stops: RouteStop[]; totalDistanceKm: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async (status: string) => {
    setLoading(true);
    setError('');
    try {
      const qs = status && status !== '全部' ? `?status=${encodeURIComponent(status)}` : '';
      const [taskResp, effResp, routeResp] = await Promise.all([
        fetch(`/api/v1/logistics/tasks${qs}`),
        fetch('/api/v1/logistics/efficiency?period=7d'),
        fetch('/api/v1/logistics/route'),
      ]);
      const taskJson = await taskResp.json();
      const effJson = await effResp.json();
      const routeJson = await routeResp.json();
      if (taskJson.code !== 0) {
        setError(taskJson.message || '任务列表加载失败');
        setList([]);
        return;
      }
      setList((taskJson.data as { list: DeepTask[] }).list ?? []);
      if (effJson.code === 0) setEfficiency(effJson.data as Efficiency);
      if (routeJson.code === 0) setRoute(routeJson.data as { stops: RouteStop[]; totalDistanceKm: number });
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(statusFilter); }, [statusFilter]);

  const byCategory = useMemo(() => {
    const s: Record<LogisticsCategory, number> = { 维修报修: 0, 被服管理: 0, 餐饮配送: 0, 保洁管理: 0 };
    for (const t of list) s[t.category] += 1;
    return s;
  }, [list]);

  const columns: ColumnsType<DeepTask> = [
    { title: '单号', dataIndex: 'id', width: 90 },
    { title: '大类', dataIndex: 'category', width: 90, render: (v: LogisticsCategory) => <Tag color={VI.mid}>{v}</Tag> },
    { title: '子类', dataIndex: 'taskType', width: 80, render: (v: string) => <Tag color={VI.accent}>{v}</Tag> },
    { title: '地点', dataIndex: 'location', width: 150, ellipsis: true },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '责任班组', dataIndex: 'handlerTeam', width: 150, ellipsis: true },
    { title: '优先级', dataIndex: 'priority', width: 70, render: (v: TaskPriority) => <Tag color={PRIORITY_COLOR[v]}>{v}</Tag> },
    { title: '状态', dataIndex: 'status', width: 80, render: (s: DispatchStatus) => <Tag color={STATUS_COLOR[s]}>{s}</Tag> },
  ];

  const submitDispatch = async () => {
    const v = await form.validateFields();
    await fetch('/api/v1/logistics/task', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskType: v.taskType, location: v.location, description: v.description }),
    });
    setDispatchOpen(false); form.resetFields(); void load(statusFilter);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>后勤管理</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              医院全场景 · 维修报修 / 被服 / 餐饮 / 保洁一键直派责任班组，派单高效不推诿
            </Paragraph>
          </Col>
          <Col>
            <Button type="primary" onClick={() => { form.resetFields(); setDispatchOpen(true); }}>一键派单</Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" tip="正在加载后勤任务…" /></div>}
        {!loading && error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => void load(statusFilter)}>重试</Button>} />}

        {!loading && !error && (
          <>
            {/* 效率看板：近 7 天派单与闭环效率 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card><Statistic title="近7天任务总量" value={efficiency?.total ?? 0} suffix="单" /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="准时率" value={((efficiency?.onTimeRate ?? 0) * 100).toFixed(1)} suffix="%" /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="平均闭环时长" value={efficiency?.avgCloseMinutes ?? 0} suffix="分钟" /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="派单等待" value={efficiency?.avgDispatchWaitMinutes ?? 0} suffix="分钟"
                  valueStyle={{ color: '#3f8600' }} /></Card>
              </Col>
            </Row>

            {/* 四大域概览 */}
            <Card style={{ marginBottom: 16 }} title="四大域任务分布">
              <Row gutter={16}>
                {CATEGORIES.map((c) => (
                  <Col span={6} key={c}>
                    <Statistic title={c} value={byCategory[c]} suffix="单" />
                  </Col>
                ))}
              </Row>
            </Card>

            {/* 巡线路径：未闭环任务最近邻排序 */}
            {route && route.stops.length > 0 && (
              <Card style={{ marginBottom: 16 }}
                title={`今日巡线路径（未闭环 ${route.stops.length} 站，全程约 ${route.totalDistanceKm} 公里）`}>
                {route.stops.map((s) => (
                  <div key={s.taskId} style={{ marginBottom: 4 }}>
                    <Tag color={VI.accent}>{s.seq}</Tag>
                    <strong>{s.location}</strong>
                    <span style={{ color: 'rgba(0,0,0,0.45)', marginLeft: 8 }}>
                      {s.taskId} · 上一站以来 {s.legDistanceKm} 公里
                    </span>
                  </div>
                ))}
              </Card>
            )}

            <Card
              title={`任务列表（共 ${list.length} 单）`}
              extra={(
                <Select
                  value={statusFilter}
                  style={{ width: 140 }}
                  onChange={setStatusFilter}
                  options={['全部', '已派单', '处理中', '已完成'].map((s) => ({ label: s, value: s }))}
                />
              )}
            >
              <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="small" />
            </Card>
          </>
        )}
      </Content>

      {/* 一键派单弹窗：选子类即自动路由到责任班组 */}
      <Modal open={dispatchOpen} title="后勤一键派单" onOk={submitDispatch} onCancel={() => setDispatchOpen(false)} okText="派单">
        <Form form={form} layout="vertical">
          <Form.Item name="taskType" label="任务类型" rules={[{ required: true, message: '请选择任务类型' }]}>
            <Select
              placeholder="维修报修 / 被服 / 餐饮 / 保洁"
              options={TASK_TYPE_GROUPS.map((g) => ({
                label: g.label,
                options: g.options.map((o) => ({ label: o, value: o })),
              }))}
            />
          </Form.Item>
          <Form.Item name="location" label="任务地点" rules={[{ required: true, message: '请填写任务地点' }]}>
            <Input placeholder="如：住院部 3 病区 / 急诊一楼大厅" />
          </Form.Item>
          <Form.Item name="description" label="任务描述" rules={[{ required: true, message: '请描述具体任务' }]}>
            <Input.TextArea rows={4} placeholder="如：2 楼东区男卫水龙头漏水，请尽快处置" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
