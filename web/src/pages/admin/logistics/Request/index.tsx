/**
 * 健澜科技 jlmedaios - M142-D 后勤服务页（预防保健与患者服务）
 *
 * 落实「后勤报修要跟踪到完成，不能报了没人管」：
 *   - 顶部深海蓝横幅 + 四张状态卡：待派工 / 已派工 / 处理中 / 已完成；
 *   - 醒目「超时预警」面板：已过预计完成时间仍未闭环的工单（客户端按 eta 实时推算）；
 *   - 报修表格：类型 / 科室 / 描述 / 状态 / 处理人 / 预计完成时间；
 *   - 支持提交新报修（POST /api/v1/logistics/request）与对待派工工单派工
 *     （PUT /api/v1/logistics/assign/:id，登记处理人 + 预计完成时间）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, DatePicker, Form, Input, Layout, Modal, Row, Select, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF logisticsAggregator 输出对齐 */
type LogisticsType = '设备维修' | '水电维修' | '清洁服务' | '被服更换' | '搬运服务';
type RequestStatus = '待派工' | '已派工' | '处理中' | '已完成';

interface LogisticsRequest {
  id: string;
  requesterId: string;
  dept: string;
  type: LogisticsType;
  description: string;
  status: RequestStatus;
  handlerId: string | null;
  eta: string | null;
  createdAt: string;
  assignedAt: string | null;
  processingAt: string | null;
  doneAt: string | null;
}

/** 深海蓝 VI 色板 */
const VI = { deep: '#0a2540', mid: '#123a5e', accent: '#1e6fbf', bg: '#f5f7fa' };

const TYPE_OPTIONS: LogisticsType[] = ['设备维修', '水电维修', '清洁服务', '被服更换', '搬运服务'];

const STATUS_COLOR: Record<RequestStatus, string> = {
  待派工: 'orange', 已派工: 'blue', 处理中: 'processing', 已完成: 'green',
};

export default function LogisticsRequestPage() {
  const [list, setList] = useState<LogisticsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [target, setTarget] = useState<LogisticsRequest | null>(null);
  const [createForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/logistics/my-requests');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setList([]);
        return;
      }
      setList((json.data as { list: LogisticsRequest[] }).list ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // ---- 状态统计（客户端聚合，与 aggregator byStatus 口径一致） -----------------
  const stats = useMemo(() => {
    const s: Record<RequestStatus, number> = { 待派工: 0, 已派工: 0, 处理中: 0, 已完成: 0 };
    for (const r of list) s[r.status] += 1;
    return s;
  }, [list]);

  // ---- 超时预警：已过 eta 仍未完成的工单 -------------------------------------
  const overdue = useMemo(() => {
    const now = Date.now();
    return list
      .filter((r) => r.status !== '已完成' && r.eta)
      .map((r) => ({ r, hours: (now - new Date(r.eta as string).getTime()) / 3_600_000 }))
      .filter((x) => x.hours > 0)
      .sort((a, b) => b.hours - a.hours);
  }, [list]);

  const columns: ColumnsType<LogisticsRequest> = [
    { title: '单号', dataIndex: 'id', width: 100 },
    { title: '类型', dataIndex: 'type', width: 100, render: (t: LogisticsType) => <Tag color={VI.accent}>{t}</Tag> },
    { title: '科室', dataIndex: 'dept', width: 120, render: (v: string) => v || <span style={{ color: '#999' }}>未填写</span> },
    { title: '报修内容', dataIndex: 'description', ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 90, render: (s: RequestStatus) => <Tag color={STATUS_COLOR[s]}>{s}</Tag> },
    { title: '处理人', dataIndex: 'handlerId', width: 100, render: (v: string | null) => v ?? <span style={{ color: '#999' }}>未派工</span> },
    {
      title: '预计完成', dataIndex: 'eta', width: 160,
      render: (v: string | null, r) => {
        if (!v) return <span style={{ color: '#999' }}>未定</span>;
        const over = r.status !== '已完成' && Date.now() > new Date(v).getTime();
        return (
          <span style={{ color: over ? '#cf1322' : undefined, fontWeight: over ? 600 : undefined }}>
            {new Date(v).toLocaleString('zh-CN')}
            {over ? ' · 超时' : ''}
          </span>
        );
      },
    },
    {
      title: '操作', key: 'op', width: 90,
      render: (_, r) => r.status === '待派工' ? (
        <Button size="small" type="link" onClick={() => { setTarget(r); assignForm.resetFields(); setAssignOpen(true); }}>
          派工
        </Button>
      ) : <span style={{ color: '#bbb' }}>—</span>,
    },
  ];

  const submitCreate = async () => {
    const v = await createForm.validateFields();
    await fetch('/api/v1/logistics/request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dept: v.dept, type: v.type, description: v.description }),
    });
    setCreateOpen(false); createForm.resetFields(); void load();
  };

  const submitAssign = async () => {
    if (!target) return;
    const v = await assignForm.validateFields();
    await fetch(`/api/v1/logistics/assign/${target.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handlerId: v.handlerId,
        eta: (v.eta as { format: (f: string) => string }).format('YYYY-MM-DDTHH:mm:ss'),
      }),
    });
    setAssignOpen(false); setTarget(null); void load();
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>后勤服务</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              预防保健与患者服务 · 报修跟踪到完成，不让一张单子挂着没人管
            </Paragraph>
          </Col>
          <Col>
            <Button type="primary" onClick={() => { createForm.resetFields(); setCreateOpen(true); }}>提交报修</Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" tip="正在加载报修工单…" /></div>}
        {!loading && error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />}

        {!loading && !error && (
          <>
            {/* 状态概览：四态一目了然 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="待派工" value={stats['待派工']} /></Card></Col>
              <Col span={6}><Card><Statistic title="已派工" value={stats['已派工']} /></Card></Col>
              <Col span={6}><Card><Statistic title="处理中" value={stats['处理中']} /></Card></Col>
              <Col span={6}><Card><Statistic title="已完成" value={stats['已完成']} /></Card></Col>
            </Row>

            {/* 超时预警面板：报了没人管的兜底 */}
            <Card style={{ marginBottom: 16 }} title="超时预警（超过预计完成时间仍未闭环）">
              {overdue.length === 0 && (
                <Alert type="success" showIcon message="当前无超时工单，后勤响应及时。" />
              )}
              {overdue.map(({ r, hours }) => (
                <div key={r.id} style={{ marginBottom: 8 }}>
                  <Tag color="red">已超时 {Math.round(hours)} 小时</Tag>
                  <strong>{r.id} · {r.type}</strong>
                  <span style={{ color: 'rgba(0,0,0,0.55)', marginLeft: 8 }}>
                    {r.dept || '未填科室'} · {r.description}
                    {r.handlerId ? ` · 处理人 ${r.handlerId}` : ' · 尚未派工'}
                  </span>
                </div>
              ))}
            </Card>

            <Card title={`我的报修（共 ${list.length} 单）`}>
              <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="small" />
            </Card>
          </>
        )}
      </Content>

      {/* 提交报修弹窗 */}
      <Modal open={createOpen} title="提交后勤报修" onOk={submitCreate} onCancel={() => setCreateOpen(false)} okText="提交">
        <Form form={createForm} layout="vertical">
          <Form.Item name="dept" label="报修科室"><Input placeholder="如：急诊科 / 住院部 3 病区" /></Form.Item>
          <Form.Item name="type" label="报修类型" rules={[{ required: true, message: '请选择报修类型' }]}>
            <Select
              options={TYPE_OPTIONS.map((t) => ({ label: t, value: t }))}
              placeholder="请选择后勤类型"
            />
          </Form.Item>
          <Form.Item name="description" label="问题描述" rules={[{ required: true, message: '请描述具体问题' }]}>
            <Input.TextArea rows={4} placeholder="如：东区 5 楼男卫 3 号水龙头漏水，已报修请尽快处理" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 派工弹窗 */}
      <Modal open={assignOpen} title={`派工：${target?.id ?? ''}`} onOk={submitAssign} onCancel={() => setAssignOpen(false)} okText="派工">
        <Form form={assignForm} layout="vertical">
          <Form.Item name="handlerId" label="处理人工号" rules={[{ required: true, message: '请输入处理人工号' }]}>
            <Input placeholder="如：houqin_wang" />
          </Form.Item>
          <Form.Item name="eta" label="预计完成时间" rules={[{ required: true, message: '请选择预计完成时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
