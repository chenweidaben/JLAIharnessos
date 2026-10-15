/**
 * 健澜科技 jlmedaios - M139-B 医疗设备台账页（仅 admin，医院运营管理）
 *
 * 展示 GET /api/v1/admin/equipment 返回的设备台账 + 维护提前提醒报告：
 *   - 顶部四张状态卡：在用 / 维修中 / 停用 / 报废 + 资产原值合计；
 *   - 醒目「维护提前提醒」面板：已逾期（红）与即将到期（黄，7 天内）清单，
 *     落实「设备维护提前提醒，不能坏了才知道」；
 *   - 台账表格：名称 / 型号 / 科室 / 购置日期 / 原值 / 状态 / 下次维护；
 *   - 支持登记新设备（POST）与为设备排定下次维护（PUT）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Form, Input, DatePicker, Layout, Modal, Row, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF equipmentAggregator 输出对齐 */
type EquipmentStatus = '在用' | '维修中' | '停用' | '报废';
interface Equipment {
  id: string;
  name: string;
  model: string;
  dept: string;
  purchaseDate: string;
  value: number;
  status: EquipmentStatus;
  nextMaintenanceDate: string | null;
}
interface EquipmentAlert {
  equipmentId: string;
  name: string;
  dept: string;
  nextMaintenanceDate: string;
  daysUntilDue: number;
  level: 'overdue' | 'due-soon';
}
interface EquipmentReport {
  total: number;
  byStatus: Record<EquipmentStatus, number>;
  totalValue: number;
  maintenanceAlerts: EquipmentAlert[];
  upcomingCount: number;
  overdueCount: number;
}
interface EquipmentView { list: Equipment[]; report: EquipmentReport }

/** 深海蓝 VI 色板 */
const VI = { deep: '#0a2540', mid: '#123a5e', accent: '#1e6fbf', bg: '#f5f7fa' };

const STATUS_COLOR: Record<EquipmentStatus, string> = {
  在用: 'green', 维修中: 'orange', 停用: 'default', 报废: 'red',
};

export default function EquipmentListPage() {
  const [data, setData] = useState<EquipmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [regOpen, setRegOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [target, setTarget] = useState<Equipment | null>(null);
  const [regForm] = Form.useForm();
  const [maintForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/equipment');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as EquipmentView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const report = data?.report;

  const columns: ColumnsType<Equipment> = [
    { title: '设备名称', dataIndex: 'name' },
    { title: '型号', dataIndex: 'model' },
    { title: '科室', dataIndex: 'dept' },
    { title: '购置日期', dataIndex: 'purchaseDate' },
    { title: '原值(元)', dataIndex: 'value', align: 'right', render: (v: number) => v.toLocaleString('zh-CN') },
    { title: '状态', dataIndex: 'status', render: (s: EquipmentStatus) => <Tag color={STATUS_COLOR[s]}>{s}</Tag> },
    {
      title: '下次维护', dataIndex: 'nextMaintenanceDate',
      render: (d: string | null) => d ?? <span style={{ color: '#999' }}>未排程</span>,
    },
    {
      title: '操作', key: 'op',
      render: (_, r) => (
        <Button size="small" type="link" onClick={() => { setTarget(r); maintForm.resetFields(); setMaintOpen(true); }}>
          排维护
        </Button>
      ),
    },
  ];

  const submitRegister = async () => {
    const v = await regForm.validateFields();
    await fetch('/api/v1/admin/equipment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: v.name, model: v.model, dept: v.dept,
        purchaseDate: v.purchaseDate.format('YYYY-MM-DD'), value: Number(v.value ?? 0),
      }),
    });
    setRegOpen(false); regForm.resetFields(); void load();
  };

  const submitMaintenance = async () => {
    if (!target) return;
    const v = await maintForm.validateFields();
    await fetch(`/api/v1/admin/equipment/${target.id}/maintenance`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextDate: v.nextDate.format('YYYY-MM-DD') }),
    });
    setMaintOpen(false); setTarget(null); void load();
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>医疗设备台账</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              医院运营管理 · 预防性维护提前提醒，不让设备坏了才知道
            </Paragraph>
          </Col>
          <Col>
            <Button type="primary" onClick={() => { regForm.resetFields(); setRegOpen(true); }}>登记设备</Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" tip="正在加载设备台账…" /></div>}
        {!loading && error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />}

        {!loading && !error && data && report && (
          <>
            {/* 维护提前提醒面板 */}
            <Card style={{ marginBottom: 16 }} title="维护提前提醒">
              {report.maintenanceAlerts.length === 0 && (
                <Alert type="success" showIcon message="当前无逾期或 7 天内到期的维护计划，设备状态良好。" />
              )}
              {report.maintenanceAlerts.map((a) => (
                <div key={a.equipmentId} style={{ marginBottom: 8 }}>
                  <Tag color={a.level === 'overdue' ? 'red' : 'gold'}>
                    {a.level === 'overdue' ? `已逾期 ${-a.daysUntilDue} 天` : `${a.daysUntilDue} 天后到期`}
                  </Tag>
                  <strong>{a.name}</strong>
                  <span style={{ color: 'rgba(0,0,0,0.55)', marginLeft: 8 }}>
                    {a.dept || '未指定科室'} · 下次维护 {a.nextMaintenanceDate}
                  </span>
                </div>
              ))}
            </Card>

            {/* 状态概览 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={5}><Card><Statistic title="在用" value={report.byStatus['在用']} /></Card></Col>
              <Col span={5}><Card><Statistic title="维修中" value={report.byStatus['维修中']} /></Card></Col>
              <Col span={4}><Card><Statistic title="停用" value={report.byStatus['停用']} /></Card></Col>
              <Col span={4}><Card><Statistic title="报废" value={report.byStatus['报废']} /></Card></Col>
              <Col span={6}>
                <Card><Statistic title="资产原值合计(元)" value={report.totalValue} /></Card>
              </Col>
            </Row>

            <Card title={`设备台账（共 ${report.total} 台）`}>
              <Table rowKey="id" columns={columns} dataSource={data.list} pagination={{ pageSize: 10 }} size="small" />
            </Card>
          </>
        )}
      </Content>

      {/* 登记设备弹窗 */}
      <Modal open={regOpen} title="登记新设备" onOk={submitRegister} onCancel={() => setRegOpen(false)} okText="登记">
        <Form form={regForm} layout="vertical">
          <Form.Item name="name" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}><Input /></Form.Item>
          <Form.Item name="model" label="型号"><Input /></Form.Item>
          <Form.Item name="dept" label="使用科室"><Input /></Form.Item>
          <Form.Item name="purchaseDate" label="购置日期" rules={[{ required: true, message: '请选择购置日期' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="value" label="购置原值(元)"><Input type="number" min={0} /></Form.Item>
        </Form>
      </Modal>

      {/* 排维护弹窗 */}
      <Modal open={maintOpen} title={`排定维护：${target?.name ?? ''}`} onOk={submitMaintenance} onCancel={() => setMaintOpen(false)} okText="保存">
        <Form form={maintForm} layout="vertical">
          <Form.Item name="nextDate" label="下次维护日期" rules={[{ required: true, message: '请选择下次维护日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
