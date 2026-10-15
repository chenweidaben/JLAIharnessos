/**
 * 健澜科技 jlmedaios - M143-C 双向转诊管理页（互联网医院与远程医疗）
 *
 * 落实「双向转诊要跟踪到底，不能转出去就不管了」：
 *   - 顶部深海蓝横幅 + 统计卡：待接收队列 / 超时预警 / 上转 / 下转；
 *   - 醒目「超时预警」面板：已过预计接诊日期仍未接收的转诊单（客户端按 expectedDate 实时推算）；
 *   - 转入队列表格：单号 / 患者 / 转出科室→转入科室 / 方向 / 原因 / 预计接诊 / 接诊医生；
 *   - 支持发起转诊申请（POST /api/v1/referral/create）与对待接收单接诊
 *     （PUT /api/v1/referral/:id/accept，登记接诊医生）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, DatePicker, Form, Input, Layout, Modal, Row, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF referralAggregator 输出对齐 */
type ReferralDirection = '上转' | '下转' | '院内转科';
type ReferralStatus = '待接收' | '已接收' | '已完成';

interface Referral {
  id: string;
  patientId: string;
  fromDept: string;
  toDept: string;
  direction: ReferralDirection;
  reason: string;
  expectedDate: string;
  status: ReferralStatus;
  acceptingDoctor: string | null;
  acceptedAt: string | null;
  outcome: string | null;
  completedAt: string | null;
  createdAt: string;
}

/** 深海蓝 VI 色板 */
const VI = { deep: '#0a2540', mid: '#123a5e', accent: '#1e6fbf', bg: '#f5f7fa' };

const DIRECTION_COLOR: Record<ReferralDirection, string> = {
  上转: 'orange', 下转: 'green', 院内转科: 'blue',
};

export default function ReferralListPage() {
  const [list, setList] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [target, setTarget] = useState<Referral | null>(null);
  const [createForm] = Form.useForm();
  const [acceptForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/referral/incoming');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setList([]);
        return;
      }
      setList((json.data as { list: Referral[] }).list ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // ---- 超时预警：已过预计接诊日期仍未接收的转诊单（转出去没人接） ----------------
  const overdue = useMemo(() => {
    const now = Date.now();
    return list
      .filter((r) => r.status !== '已完成')
      .map((r) => ({ r, hours: (now - new Date(r.expectedDate).getTime()) / 3_600_000 }))
      .filter((x) => x.hours > 0)
      .sort((a, b) => b.hours - a.hours);
  }, [list]);

  // ---- 方向分布（与 aggregator direction 口径一致） -------------------------
  const directionCount = useMemo(() => {
    const s: Record<ReferralDirection, number> = { 上转: 0, 下转: 0, 院内转科: 0 };
    for (const r of list) s[r.direction] += 1;
    return s;
  }, [list]);

  const columns: ColumnsType<Referral> = [
    { title: '单号', dataIndex: 'id', width: 100 },
    { title: '患者', dataIndex: 'patientId', width: 110 },
    {
      title: '转出 → 转入', key: 'depts', width: 220,
      render: (_, r) => (
        <span>
          {r.fromDept} <span style={{ color: VI.accent }}>→</span> {r.toDept}
        </span>
      ),
    },
    { title: '方向', dataIndex: 'direction', width: 90, render: (d: ReferralDirection) => <Tag color={DIRECTION_COLOR[d]}>{d}</Tag> },
    { title: '转诊原因', dataIndex: 'reason', ellipsis: true },
    {
      title: '预计接诊', dataIndex: 'expectedDate', width: 160,
      render: (v: string) => {
        const over = Date.now() > new Date(v).getTime();
        return (
          <span style={{ color: over ? '#cf1322' : undefined, fontWeight: over ? 600 : undefined }}>
            {new Date(v).toLocaleString('zh-CN')}
            {over ? ' · 超时' : ''}
          </span>
        );
      },
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: ReferralStatus) => (
        <Tag color={s === '待接收' ? 'orange' : s === '已接收' ? 'processing' : 'green'}>{s}</Tag>
      ),
    },
    {
      title: '操作', key: 'op', width: 90,
      render: (_, r) => r.status === '待接收' ? (
        <Button size="small" type="link" onClick={() => { setTarget(r); acceptForm.resetFields(); setAcceptOpen(true); }}>
          接收
        </Button>
      ) : <span style={{ color: '#bbb' }}>—</span>,
    },
  ];

  const submitCreate = async () => {
    const v = await createForm.validateFields();
    await fetch('/api/v1/referral/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: v.patientId,
        fromDept: v.fromDept,
        toDept: v.toDept,
        reason: v.reason,
        expectedDate: (v.expectedDate as { format: (f: string) => string }).format('YYYY-MM-DDTHH:mm:ss'),
      }),
    });
    setCreateOpen(false); createForm.resetFields(); void load();
  };

  const submitAccept = async () => {
    if (!target) return;
    const v = await acceptForm.validateFields();
    await fetch(`/api/v1/referral/${target.id}/accept`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acceptingDoctor: v.acceptingDoctor }),
    });
    setAcceptOpen(false); setTarget(null); void load();
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>双向转诊管理</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              互联网医院与远程医疗 · 上转 / 下转 / 院内转科，跟踪到闭环，不让一个病人转出去没人接
            </Paragraph>
          </Col>
          <Col>
            <Button type="primary" onClick={() => { createForm.resetFields(); setCreateOpen(true); }}>发起转诊</Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" tip="正在加载转入队列…" /></div>}
        {!loading && error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />}

        {!loading && !error && (
          <>
            {/* 队列概览：待接收 / 超时 / 方向分布 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="待接收队列" value={list.length} /></Card></Col>
              <Col span={6}><Card><Statistic title="超时预警" value={overdue.length} valueStyle={overdue.length ? { color: '#cf1322' } : undefined} /></Card></Col>
              <Col span={6}><Card><Statistic title="上转（基层→三甲）" value={directionCount['上转']} /></Card></Col>
              <Col span={6}><Card><Statistic title="下转（三甲→基层康复）" value={directionCount['下转']} /></Card></Col>
            </Row>

            {/* 超时预警面板：转出去没人接的兜底 */}
            <Card style={{ marginBottom: 16 }} title="超时预警（超过预计接诊日期仍未接收）">
              {overdue.length === 0 && (
                <Alert type="success" showIcon message="当前无超时转诊单，医联体响应及时。" />
              )}
              {overdue.map(({ r, hours }) => (
                <div key={r.id} style={{ marginBottom: 8 }}>
                  <Tag color="red">已超时 {Math.round(hours)} 小时</Tag>
                  <strong>{r.id} · {r.patientId} · {r.direction}</strong>
                  <span style={{ color: 'rgba(0,0,0,0.55)', marginLeft: 8 }}>
                    {r.fromDept} → {r.toDept} · {r.reason}
                  </span>
                </div>
              ))}
            </Card>

            <Card title={`转入队列（共 ${list.length} 单待接收）`}>
              <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="small" />
            </Card>
          </>
        )}
      </Content>

      {/* 发起转诊弹窗 */}
      <Modal open={createOpen} title="发起双向转诊" onOk={submitCreate} onCancel={() => setCreateOpen(false)} okText="发起">
        <Form form={createForm} layout="vertical">
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '请输入患者 ID' }]}>
            <Input placeholder="如：P10086" />
          </Form.Item>
          <Form.Item name="fromDept" label="转出科室 / 机构" rules={[{ required: true, message: '请输入转出科室' }]}>
            <Input placeholder="上转填社区卫生服务中心；下转填三甲科室；院内转科填源科室" />
          </Form.Item>
          <Form.Item name="toDept" label="转入科室 / 机构" rules={[{ required: true, message: '请输入转入科室' }]}>
            <Input placeholder="上转填三甲专科；下转填社区卫生服务中心（康复）；院内转科填目标科室" />
          </Form.Item>
          <Form.Item name="reason" label="转诊原因 / 病情摘要" rules={[{ required: true, message: '请填写转诊原因' }]}>
            <Input.TextArea rows={3} placeholder="如：胸痛待查，基层条件有限，上转三甲心内科行冠脉评估" />
          </Form.Item>
          <Form.Item name="expectedDate" label="预计接诊日期" rules={[{ required: true, message: '请选择预计接诊日期' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 接收转诊弹窗 */}
      <Modal open={acceptOpen} title={`接收转诊：${target?.id ?? ''}`} onOk={submitAccept} onCancel={() => setAcceptOpen(false)} okText="确认接收">
        <Form form={acceptForm} layout="vertical">
          <Form.Item name="acceptingDoctor" label="接诊医生工号" rules={[{ required: true, message: '请输入接诊医生工号' }]}>
            <Input placeholder="如：cardi_zhang" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
