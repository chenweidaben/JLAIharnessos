/**
 * 健澜科技 jlmedaios - M139-C 物资耗材管理页（医院运营管理，仅 admin）
 *
 * 展示 BFF /api/v1/admin/supply 的物资台账：一次性耗材 / 消毒用品 / 检验试剂 / 办公用品。
 * 核心红线：库存准确、账实不符即事故——出库严格校验库存，不足时 BFF 返回 409 拦截。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无物资）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Layout,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type SupplyCategory = 'disposable' | 'disinfect' | 'reagent' | 'office';
type StockStatus = 'normal' | 'low' | 'out';

interface Stock {
  itemId: string;
  name: string;
  category: SupplyCategory;
  unit: string;
  quantity: number;
  batchNo: string | null;
  minStock: number;
  updatedAt: string;
  status: StockStatus;
}

interface AlertItem {
  itemId: string;
  name: string;
  category: SupplyCategory;
  unit: string;
  quantity: number;
  minStock: number;
  shortfall: number;
  level: 'out' | 'low';
  message: string;
}

interface SupplyView {
  items: Stock[];
  alerts: AlertItem[];
  generatedAt: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const CATEGORY_LABEL: Record<SupplyCategory, string> = {
  disposable: '一次性耗材',
  disinfect: '消毒用品',
  reagent: '检验试剂',
  office: '办公用品',
};

const STATUS_META: Record<StockStatus, { color: string; text: string }> = {
  normal: { color: 'success', text: '正常' },
  low: { color: 'warning', text: '偏低' },
  out: { color: 'error', text: '缺货' },
};

export default function SupplyListPage() {
  const [data, setData] = useState<SupplyView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'in' | 'out' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/supply');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as SupplyView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openModal = (kind: 'in' | 'out') => {
    form.resetFields();
    setModal(kind);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const path = modal === 'in' ? '/api/v1/admin/supply/in' : '/api/v1/admin/supply/out';
      const resp = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        Modal.error({ title: '操作失败', content: json.message || '请稍后重试' });
      } else {
        setModal(null);
        void load();
      }
    } catch (e) {
      Modal.error({ title: '网络异常', content: e instanceof Error ? e.message : '请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<Stock> = [
    { title: '编码', dataIndex: 'itemId', width: 80 },
    { title: '物资名称', dataIndex: 'name' },
    {
      title: '类别',
      dataIndex: 'category',
      width: 110,
      render: (c: SupplyCategory) => <Tag color="blue">{CATEGORY_LABEL[c]}</Tag>,
    },
    {
      title: '在库存',
      dataIndex: 'quantity',
      width: 100,
      render: (q: number, row) => (
        <Text strong={row.status !== 'normal'} style={{ color: row.status === 'out' ? '#cf1322' : undefined }}>
          {q} {row.unit}
        </Text>
      ),
    },
    { title: '安全库存', dataIndex: 'minStock', width: 100, render: (v: number, row) => `${v} ${row.unit}` },
    { title: '批次', dataIndex: 'batchNo', width: 120, render: (v: string | null) => v || '—' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: StockStatus) => <Tag color={STATUS_META[s].color}>{STATUS_META[s].text}</Tag>,
    },
  ];

  const outCount = data?.alerts?.filter((a) => a.level === 'out').length ?? 0;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              物资耗材管理 · 库存台账
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              一次性耗材 / 消毒用品 / 检验试剂 / 办公用品 · 账实相符，缺货即预警
            </Paragraph>
          </Col>
          <Col>
            <Space>
              <Button type="primary" style={{ background: VI.accent, borderColor: VI.accent }} onClick={() => openModal('in')}>
                入库登记
              </Button>
              <Button danger onClick={() => openModal('out')}>
                出库领用
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载物资台账…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && !error && (!data || data.items.length === 0) && (
          <Alert type="info" showIcon message="暂无物资台账数据。" />
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            {/* 低库存 / 缺货预警横幅 */}
            {data.alerts.length > 0 && (
              <Alert
                type={outCount > 0 ? 'error' : 'warning'}
                showIcon
                style={{ marginBottom: 16 }}
                message={`${data.alerts.length} 项物资低于安全库存（其中缺货 ${outCount} 项），请物资科及时补货。`}
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {data.alerts.slice(0, 5).map((a) => (
                      <li key={a.itemId}>{a.message}</li>
                    ))}
                  </ul>
                }
              />
            )}

            <Card title="物资库存明细" size="small">
              <Table rowKey="itemId" columns={columns} dataSource={data.items} pagination={false} size="middle" />
            </Card>
          </>
        )}
      </Content>

      {/* 入库 / 出库弹窗 */}
      <Modal
        title={modal === 'in' ? '物资入库登记' : '物资出库领用'}
        open={modal !== null}
        onOk={submit}
        confirmLoading={submitting}
        onCancel={() => setModal(null)}
        okText={modal === 'in' ? '确认入库' : '确认出库'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="itemId" label="物资" rules={[{ required: true, message: '请选择物资' }]}>
            <Select
              placeholder="选择物资"
              options={(data?.items ?? []).map((it) => ({
                value: it.itemId,
                label: `${it.itemId} · ${it.name}（在库 ${it.quantity}${it.unit}）`,
              }))}
            />
          </Form.Item>
          <Form.Item name="quantity" label={modal === 'in' ? '入库数量' : '出库数量'} rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          {modal === 'in' && (
            <Form.Item name="batchNo" label="批次号（选填）">
              <Input placeholder="如 20261016" />
            </Form.Item>
          )}
          {modal === 'out' && (
            <>
              <Form.Item name="dept" label="领用科室" rules={[{ required: true, message: '请输入领用科室' }]}>
                <Input placeholder="如 内科病区" />
              </Form.Item>
              <Form.Item name="patientId" label="关联患者号（选填）">
                <Input placeholder="办公用品出库可留空" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </Layout>
  );
}
