/**
 * 健澜科技 jlmedaios - 互联网电子处方 · 医生开方面板（M3-L）
 *
 * 安全约束（与后端一致）：
 *  - 明细必须医生显式录入，无 AI 自动补方；
 *  - 皮试药品强制标注；提交自动生成幂等键防重复；
 *  - 已开处方仅本人可取消/重提（退回后）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Popconfirm, Row, Select, Space, Switch, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useInternetPrescriptionStore } from '../../store/internetPrescriptionStore';
import type { EPrescriptionItemInput, EPrescriptionView } from '../../types/internetPrescription';

const FREQUENCIES = ['qd', 'bid', 'tid', 'qid', 'qn', 'prn'];
const ROUTES = ['口服', '静脉滴注', '肌肉注射', '皮下注射', '外用', '雾化吸入'];

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  pending_review: { color: 'gold', label: '待审方' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已驳回' },
  returned: { color: 'orange', label: '已退回' },
  cancelled: { color: 'default', label: '已取消' },
};

const genKey = () =>
  'erlx-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

interface Props {
  sessionId: string;
  patientName?: string | null;
}

export function PrescribePanel({ sessionId, patientName }: Props) {
  const {
    sessionPrescriptions,
    loadSessionPrescriptions,
    prescribe,
    resubmit,
    cancel,
    submitting,
  } = useInternetPrescriptionStore();
  const [form] = Form.useForm<EPrescriptionItemInput>();
  const [items, setItems] = useState<EPrescriptionItemInput[]>([]);
  const [counsel, setCounsel] = useState('');
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);

  // 初次加载会话处方（副作用放 useEffect，禁止渲染期 setState）
  useEffect(() => {
    loadSessionPrescriptions(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const addItem = async () => {
    const values = await form.validateFields();
    setItems((prev) => [...prev, { ...values, skinTest: values.skinTest ?? false }]);
    form.resetFields();
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (items.length === 0) {
      message.warning('请至少录入一条药品明细（处方必须医生显式开具）');
      return;
    }
    if (items.some((i) => !i.drugName?.trim())) {
      message.warning('药品名称不能为空');
      return;
    }
    try {
      await prescribe({ sessionId, items, counsel: counsel || undefined, idempotencyKey: genKey() });
      message.success('处方已提交，待药师审方');
      setItems([]);
      setCounsel('');
      await loadSessionPrescriptions(sessionId);
    } catch (e) {
      message.error((e as Error).message || '开方失败');
    }
  };

  const onResubmit = async (rx: EPrescriptionView) => {
    setResubmittingId(rx.id);
    try {
      await resubmit(rx.id, rx.items.map((i) => ({
        drugCode: i.drugCode ?? undefined,
        drugName: i.drugName,
        specification: i.specification ?? undefined,
        dosage: i.dosage ?? undefined,
        dosageUnit: i.dosageUnit ?? undefined,
        frequency: i.frequency ?? undefined,
        route: i.route ?? undefined,
        daysSupply: i.daysSupply ?? undefined,
        quantity: i.quantity ?? undefined,
        quantityUnit: i.quantityUnit ?? undefined,
        skinTest: i.skinTest ?? false,
        remark: i.remark ?? undefined,
      })));
      message.success('已重提审方');
      await loadSessionPrescriptions(sessionId);
    } catch (e) {
      message.error((e as Error).message || '重提失败');
    } finally {
      setResubmittingId(null);
    }
  };

  const columns: ColumnsType<EPrescriptionItemInput> = [
    { title: '药品名称', dataIndex: 'drugName', key: 'drugName' },
    {
      title: '规格/用法',
      key: 'spec',
      render: (_, r) => [r.specification, r.dosage ? `${r.dosage}${r.dosageUnit} ${r.frequency} ${r.route}` : ''].filter(Boolean).join(' · '),
    },
    {
      title: '数量',
      key: 'qty',
      render: (_, r) => (r.quantity ? `${r.quantity}${r.quantityUnit ?? ''}` : '-'),
    },
    {
      title: '皮试',
      key: 'skin',
      render: (_, r) => (r.skinTest ? <Tag color="red">需皮试</Tag> : <Tag>无需</Tag>),
    },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
    {
      title: '操作',
      key: 'op',
      width: 60,
      render: (_, __, idx) => (
        <Button type="link" danger size="small" onClick={() => removeItem(idx)}>
          移除
        </Button>
      ),
    },
  ];

  const rxColumns: ColumnsType<EPrescriptionView> = [
    { title: '处方号', dataIndex: 'rxNo', key: 'rxNo', width: 180 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => <Tag color={STATUS_TAG[v]?.color}>{STATUS_TAG[v]?.label}</Tag>,
    },
    {
      title: '金额',
      dataIndex: 'totalFee',
      key: 'fee',
      width: 90,
      render: (v?: number | null) => (v == null ? '-' : `¥${v.toFixed(2)}`),
    },
    {
      title: '明细',
      key: 'items',
      render: (_, r) => r.items.map((i) => i.drugName).join('、'),
    },
    {
      title: '审方意见',
      dataIndex: 'auditComment',
      key: 'comment',
      ellipsis: true,
      render: (v?: string | null, r?: EPrescriptionView) => {
        if (r?.status === 'returned') return <span style={{ color: '#d46b08' }}>{v ?? '已退回'}</span>;
        return v ?? '-';
      },
    },
    {
      title: '操作',
      key: 'op',
      width: 140,
      render: (_, r) => (
        <Space>
          {r.status === 'pending_review' && (
            <Popconfirm title="确认取消该处方？" onConfirm={() => cancel(r.id)}>
              <Button type="link" danger size="small">
                取消
              </Button>
            </Popconfirm>
          )}
          {r.status === 'returned' && (
            <Button
              type="link"
              size="small"
              loading={resubmittingId === r.id}
              onClick={() => onResubmit(r)}
            >
              重提审方
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Row gutter={16}>
      <Col span={11}>
        <Card title="开具电子处方" size="small">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="处方必须由接诊医生本人逐条录入，系统不提供 AI 自动处方；皮试药品须明确标注。"
          />
          <Form form={form} layout="inline" style={{ rowGap: 8 }}>
            <Form.Item name="drugName" rules={[{ required: true, message: '药品名称必填' }]}>
              <Input placeholder="药品名称（必填）" style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="specification">
              <Input placeholder="规格" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="dosage">
              <InputNumber placeholder="剂量" style={{ width: 80 }} min={0} />
            </Form.Item>
            <Form.Item name="dosageUnit">
              <Input placeholder="单位" style={{ width: 70 }} />
            </Form.Item>
            <Form.Item name="frequency">
              <Select placeholder="频次" style={{ width: 90 }} options={FREQUENCIES.map((f) => ({ value: f, label: f }))} />
            </Form.Item>
            <Form.Item name="route">
              <Select placeholder="途径" style={{ width: 110 }} options={ROUTES.map((r) => ({ value: r, label: r }))} />
            </Form.Item>
            <Form.Item name="daysSupply">
              <InputNumber placeholder="天数" style={{ width: 70 }} min={1} />
            </Form.Item>
            <Form.Item name="quantity">
              <InputNumber placeholder="数量" style={{ width: 80 }} min={0} />
            </Form.Item>
            <Form.Item name="quantityUnit">
              <Input placeholder="数量单位" style={{ width: 80 }} />
            </Form.Item>
            <Form.Item name="skinTest" valuePropName="checked">
              <Switch checkedChildren="皮试" unCheckedChildren="无需" />
            </Form.Item>
            <Form.Item name="remark">
              <Input placeholder="备注（如：需皮试）" style={{ width: 160 }} />
            </Form.Item>
            <Form.Item>
              <Button type="dashed" onClick={addItem}>
                + 添加明细
              </Button>
            </Form.Item>
          </Form>
          <Table
            rowKey={(_, idx) => String(idx)}
            size="small"
            columns={columns}
            dataSource={items}
            pagination={false}
            locale={{ emptyText: '尚未添加药品明细' }}
            style={{ marginTop: 12 }}
          />
          <Input.TextArea
            placeholder="用药指导（选填）"
            value={counsel}
            onChange={(e) => setCounsel(e.target.value)}
            rows={2}
            style={{ marginTop: 12 }}
          />
          <Button
            type="primary"
            block
            style={{ marginTop: 12 }}
            loading={submitting}
            disabled={items.length === 0}
            onClick={submit}
          >
            提交审方（本人签名）
          </Button>
        </Card>
      </Col>
      <Col span={13}>
        <Card title={`本会话处方（${patientName ?? ''}）`} size="small">
          <Table
            rowKey="id"
            size="small"
            columns={rxColumns}
            dataSource={sessionPrescriptions}
            pagination={false}
            locale={{ emptyText: '本会话暂无处方' }}
          />
        </Card>
      </Col>
    </Row>
  );
}
