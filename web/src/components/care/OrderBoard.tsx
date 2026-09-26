/**
 * 健澜科技 jlmedaios - 在院医嘱视图（M1-B2，真实 BFF）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'antd';
import {
  CheckSquareOutlined,
  CloseSquareOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { useCareStore } from '@/store/careStore';
import type {
  AdministrationStatus,
  OrderCategory,
  OrderDto,
  OrderPriority,
  OrderType,
  OrderWithAdministrationsDto,
} from '@/types/care';
import {
  ADMIN_STATUS_META,
  ORDER_CATEGORY_META,
  ORDER_PRIORITY_META,
  ORDER_STATUS_META,
  ORDER_TYPE_META,
} from './constants';

const textOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

export default function OrderBoard() {
  const { message } = AntdApp.useApp();
  const {
    selectedVisitId,
    orderView,
    loadingOrders,
    acting,
    fetchOrders,
    createOrder,
    reviewOrder,
    rejectOrder,
    administerOrder,
    stopOrder,
  } = useCareStore();

  const [category, setCategory] = useState<OrderCategory>('long_term');
  const [createOpen, setCreateOpen] = useState(false);
  const [rejecting, setRejecting] = useState<OrderDto | null>(null);
  const [administering, setAdministering] = useState<OrderWithAdministrationsDto | null>(null);
  const [createForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [administerForm] = Form.useForm();

  useEffect(() => {
    if (selectedVisitId) void fetchOrders(selectedVisitId);
  }, [selectedVisitId, fetchOrders]);

  const openCreate = () => {
    createForm.resetFields();
    createForm.setFieldsValue({
      orderType: 'drug',
      category: 'long_term',
      priority: 'routine',
      requiresDoubleCheck: false,
    });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!selectedVisitId) return;
    const v = await createForm.validateFields();
    await createOrder({
      visitId: selectedVisitId,
      orderType: v.orderType as OrderType,
      content: v.content.trim(),
      detail: {
        dose: textOrNull(v.dose),
        frequency: textOrNull(v.frequency),
        instruction: textOrNull(v.instruction),
      },
      priority: v.priority as OrderPriority,
      category: v.category as OrderCategory,
      requiresDoubleCheck: Boolean(v.requiresDoubleCheck),
    });
    message.success('医嘱已提交，待医师审核');
    setCategory(v.category as OrderCategory);
    setCreateOpen(false);
  };

  const openReject = (o: OrderDto) => {
    setRejecting(o);
    rejectForm.resetFields();
  };

  const handleReject = async () => {
    if (!rejecting) return;
    const v = await rejectForm.validateFields();
    await rejectOrder(rejecting.id, v.reason.trim());
    message.success('医嘱已驳回');
    setRejecting(null);
  };

  const openAdminister = (o: OrderWithAdministrationsDto) => {
    setAdministering(o);
    administerForm.resetFields();
    administerForm.setFieldsValue({ status: 'administered' });
  };

  const handleAdminister = async () => {
    if (!administering) return;
    const v = await administerForm.validateFields();
    await administerOrder(administering.id, {
      status: v.status as AdministrationStatus,
      slot: textOrNull(v.slot) ?? undefined,
      dose: textOrNull(v.dose) ?? undefined,
      checkedBy: textOrNull(v.checkedBy),
      note: textOrNull(v.note) ?? undefined,
    });
    message.success('医嘱执行记录已保存');
    setAdministering(null);
  };

  const columns: ColumnsType<OrderWithAdministrationsDto> = [
    {
      title: '医嘱编号',
      dataIndex: 'orderNo',
      width: 150,
      render: (v: string) => <b className="text-jl-primary">{v}</b>,
    },
    {
      title: '类型 / 优先级',
      width: 120,
      render: (_, r) => (
        <Space size={2} direction="vertical">
          <Tag className="mr-0 w-fit">{ORDER_TYPE_META[r.orderType].label}</Tag>
          <Tag color={ORDER_PRIORITY_META[r.priority].color} className="mr-0 w-fit">
            {ORDER_PRIORITY_META[r.priority].label}
          </Tag>
        </Space>
      ),
    },
    {
      title: '内容',
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <span>{r.content}</span>
          {typeof r.detail.dose === 'string' && (
            <span className="text-xs text-ink-secondary">剂量：{r.detail.dose}</span>
          )}
          {typeof r.detail.frequency === 'string' && (
            <span className="text-xs text-ink-secondary">频次：{r.detail.frequency}</span>
          )}
          {r.rejectReason && <span className="text-xs text-medical-critical">驳回原因：{r.rejectReason}</span>}
        </Space>
      ),
    },
    {
      title: '双人核对',
      dataIndex: 'requiresDoubleCheck',
      width: 100,
      render: (v: boolean) => (v ? <Tag color="red">强制</Tag> : <Tag>否</Tag>),
    },
    {
      title: '执行史',
      width: 180,
      render: (_, r) =>
        r.administrations.length ? (
          <Space direction="vertical" size={0}>
            <Tag color="blue" className="mr-0 w-fit">{r.administrations.length} 次</Tag>
            <span className="text-[10px] text-ink-secondary">
              最近：{r.administrations[r.administrations.length - 1].slot}
            </span>
          </Space>
        ) : (
          '--'
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: OrderDto['status']) => <Tag color={ORDER_STATUS_META[v].color}>{ORDER_STATUS_META[v].label}</Tag>,
    },
    {
      title: '操作',
      width: 240,
      fixed: 'right',
      render: (_, r) => (
        <Space size={2} wrap>
          {r.status === 'pending_review' && (
            <>
              <Button size="small" type="primary" icon={<CheckSquareOutlined />} onClick={() => void reviewOrder(r.id)}>
                审核
              </Button>
              <Button size="small" danger icon={<CloseSquareOutlined />} onClick={() => openReject(r)}>
                驳回
              </Button>
            </>
          )}
          {r.status === 'active' && (
            <>
              <Button size="small" type="primary" icon={<SafetyCertificateOutlined />} onClick={() => openAdminister(r)}>
                执行 / 核对
              </Button>
              {r.category === 'long_term' && (
                <Button size="small" danger icon={<StopOutlined />} onClick={() => void stopOrder(r.id)}>
                  停止
                </Button>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  const renderTable = (cat: OrderCategory) => {
    const data = cat === 'long_term' ? orderView?.longTerm ?? [] : orderView?.shortTerm ?? [];
    return (
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={data}
        loading={loadingOrders}
        scroll={{ x: 1180 }}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        expandable={{
          expandedRowRender: (r) => (
            <Space wrap>
              {r.administrations.length === 0 && <span className="text-ink-secondary">暂无执行记录</span>}
              {r.administrations.map((a) => (
                <Tag key={a.id} color={ADMIN_STATUS_META[a.status].color}>
                  {a.adminNo} · {a.slot} · {ADMIN_STATUS_META[a.status].label}
                  {a.checkedBy ? ` · 核对人 ${a.checkedBy}` : ''}
                  {a.note ? ` · ${a.note}` : ''}
                </Tag>
              ))}
            </Space>
          ),
        }}
      />
    );
  };

  return (
    <Card
      size="small"
      title="在院医嘱 · 长期 / 临时 · 审核 / 执行 / 停止"
      extra={
        <Button icon={<PlusOutlined />} onClick={openCreate} disabled={!selectedVisitId}>
          开具医嘱
        </Button>
      }
      styles={{ body: { padding: 12 } }}
    >
      <Tabs
        activeKey={category}
        onChange={(k) => setCategory(k as OrderCategory)}
        items={(Object.keys(ORDER_CATEGORY_META) as OrderCategory[]).map((k) => ({
          key: k,
          label: (
            <span>
              <Tag color={ORDER_CATEGORY_META[k].color} className="mr-1">
                {ORDER_CATEGORY_META[k].label}
              </Tag>
            </span>
          ),
          children: renderTable(k),
        }))}
      />

      <Modal
        open={createOpen}
        title="开具在院医嘱"
        width={760}
        confirmLoading={acting}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        okText="提交审核"
      >
        <Form form={createForm} layout="vertical" className="mt-2">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="orderType" label="医嘱类型">
                <Select
                  options={(Object.keys(ORDER_TYPE_META) as OrderType[]).map((k) => ({
                    value: k,
                    label: ORDER_TYPE_META[k].label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="category" label="长期 / 临时">
                <Select
                  options={(Object.keys(ORDER_CATEGORY_META) as OrderCategory[]).map((k) => ({
                    value: k,
                    label: ORDER_CATEGORY_META[k].label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="优先级">
                <Select
                  options={(Object.keys(ORDER_PRIORITY_META) as OrderPriority[]).map((k) => ({
                    value: k,
                    label: ORDER_PRIORITY_META[k].label,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="content"
            label="医嘱内容"
            rules={[{ required: true, message: '医嘱内容不能为空' }]}
          >
            <Input.TextArea rows={3} placeholder="如：阿司匹林肠溶片 100mg 口服，每日一次" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="dose" label="剂量"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="frequency" label="频次"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="instruction" label="执行说明"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="requiresDoubleCheck" label="高风险药 / 血制品，需双人核对" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!rejecting}
        title="驳回医嘱"
        confirmLoading={acting}
        onOk={handleReject}
        onCancel={() => setRejecting(null)}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
      >
        <Form form={rejectForm} layout="vertical" className="mt-2">
          <Form.Item
            name="reason"
            label="驳回原因"
            rules={[{ required: true, message: '驳回原因不能为空' }]}
          >
            <Input.TextArea rows={4} placeholder="请说明医嘱需修正的内容" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!administering}
        title="执行 / 双人核对医嘱"
        width={680}
        confirmLoading={acting}
        onOk={handleAdminister}
        onCancel={() => setAdministering(null)}
        okText="保存执行记录"
      >
        <Form form={administerForm} layout="vertical" className="mt-2">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="status" label="执行状态">
                <Select
                  options={(Object.keys(ADMIN_STATUS_META) as AdministrationStatus[]).map((k) => ({
                    value: k,
                    label: ADMIN_STATUS_META[k].label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="slot" label="执行时点（留空取当前小时槽）">
                <Input placeholder="YYYY-MM-DDTHH:00" />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="dose" label="实际剂量"><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item
                name="checkedBy"
                label="双人核对人用户ID"
                rules={administering?.requiresDoubleCheck ? [{ required: true, message: '高风险药/血制品必须填写核对人' }] : []}
              >
                <Input placeholder="须为另一名医护，不得填写本人" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={3} placeholder="患者反应、异常情况、暂停/拒绝原因等" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
