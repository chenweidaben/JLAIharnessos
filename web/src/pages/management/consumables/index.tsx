/**
 * 健澜科技 jlmedaios - 耗材管理（M611，P0）
 *
 * 三甲流程：耗材库存 Table（低库存红色 Tag）+ 申领记录 Table（状态 badge）
 * → 新增申领 Modal（选耗材 + 数量 + 科室 + 领用人）。权限码 consumable:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useConsumablesM611Store } from '@/store/consumablesM611Store';
import type { ConsumableItem, RequisitionItem } from '@/services/api/consumablesM611';

const REQ_STATUS_META: Record<RequisitionItem['status'], { label: string; color: string }> = {
  pending: { label: '待审批', color: 'orange' },
  approved: { label: '已批准', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
};

interface ReqFormValues {
  consumableId: string;
  deptCode: string;
  quantity: number;
  requester: string;
}

export default function ConsumablesM611Page() {
  usePageTitle('耗材管理');
  const { hasPermission } = usePermission();
  const canView = hasPermission('consumable:view');

  const { items, requisitions, loading, acting, error, demo, load, submitRequisition } =
    useConsumablesM611Store();

  const [form] = Form.useForm<ReqFormValues>();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const invColumns: ColumnsType<ConsumableItem> = [
    { title: '耗材名称', dataIndex: 'name', width: 220 },
    { title: '规格', dataIndex: 'spec', width: 160 },
    { title: '库存', dataIndex: 'stock', width: 100, render: (v: number, r) => (
        <Tag color={v < r.safetyStock ? 'red' : 'green'}>{v} {r.unit}</Tag>
    ) },
    { title: '安全库存', dataIndex: 'safetyStock', width: 100, render: (v: number, r) => `${v} ${r.unit}` },
    { title: '供应商', dataIndex: 'supplier', width: 140 },
    { title: '库位', dataIndex: 'location', width: 110 },
  ];

  const reqColumns: ColumnsType<RequisitionItem> = [
    { title: '申领单号', dataIndex: 'reqNo', width: 180 },
    { title: '科室', dataIndex: 'deptCode', width: 110 },
    { title: '耗材', dataIndex: 'consumableName', width: 200 },
    { title: '数量', dataIndex: 'quantity', width: 90, render: (v: number, r: RequisitionItem) => `${v}（${items.find((x) => x.id === r.consumableId)?.unit ?? ''}）` },
    { title: '领用人', dataIndex: 'requester', width: 100 },
    { title: '申领时间', dataIndex: 'requestedAt', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: RequisitionItem['status']) => (
        <Tag color={REQ_STATUS_META[v].color}>{REQ_STATUS_META[v].label}</Tag>
      ),
    },
  ];

  const doSubmit = async (values: ReqFormValues) => {
    const item = items.find((x) => x.id === values.consumableId);
    const ok = await submitRequisition({
      consumableId: values.consumableId,
      consumableName: item?.name ?? '',
      deptCode: values.deptCode,
      quantity: values.quantity,
      requester: values.requester,
    });
    if (ok) {
      message.success('申领已提交');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="耗材管理"
      description="库存总览（低库存红色）+ 科室申领记录 + 新增申领"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 consumable:view 权限" />
      )}

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card size="small" title={`耗材库存（${items.length}）`}>
          <Spin spinning={loading}>
            <Table rowKey="id" dataSource={items} columns={invColumns} size="small" pagination={{ pageSize: 8 }} />
          </Spin>
        </Card>

        <Card
          size="small"
          title={`申领记录（${requisitions.length}）`}
          extra={
            <Button type="primary" onClick={() => setModalOpen(true)}>
              新增申领
            </Button>
          }
        >
          <Spin spinning={loading}>
            <Table rowKey="id" dataSource={requisitions} columns={reqColumns} size="small" pagination={{ pageSize: 8 }} />
          </Spin>
        </Card>
      </Space>

      <Modal open={modalOpen} title="新增科室申领" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doSubmit}>
          <Form.Item name="consumableId" label="耗材" rules={[{ required: true, message: '请选择耗材' }]}>
            <Select
              showSearch
              placeholder="选择耗材"
              optionFilterProp="label"
              options={items.map((x) => ({
                value: x.id,
                label: `${x.name}（${x.spec}）· 库存 ${x.stock}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="deptCode" label="申领科室" rules={[{ required: true, message: '请输入科室编码' }]}>
            <Input placeholder="如 DEPT-INT" />
          </Form.Item>
          <Form.Item name="quantity" label="申领数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="requester" label="领用人" rules={[{ required: true, message: '请输入领用人' }]}>
            <Input placeholder="如 周敏" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={acting}>
              提交申领
            </Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
