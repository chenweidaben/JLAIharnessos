/**
 * 健澜科技 jlmedaios - 药品库存管理（M610，P0）
 *
 * 三甲流程：库存 Table（药品名/规格/批次/库存单价/效期/状态 Tag，近效期红色）
 * → 效期预警筛选 Switch → 入库 Modal（POST /pharmacy/inventory/receive）。
 * 权限码 inventory:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Spin,
  Switch,
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
import { useDrugInventoryM610Store } from '@/store/drugInventoryM610Store';
import {
  EXPIRY_WARN_DAYS,
  INVENTORY_STATUS_META,
  daysToExpiry,
  type DrugInventoryItem,
  type ReceiveInput,
} from '@/services/api/drugInventoryM610';

interface ReceiveFormValues {
  drugName: string;
  spec: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  unitPrice: number;
}

export default function DrugInventoryM610Page() {
  usePageTitle('药品库存管理');
  const { hasPermission } = usePermission();
  const canView = hasPermission('inventory:view');

  const { items, loading, acting, error, demo, onlyExpiring, load, setOnlyExpiring, receive } =
    useDrugInventoryM610Store();

  const [form] = Form.useForm<ReceiveFormValues>();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const data = useMemo(
    () =>
      onlyExpiring
        ? items.filter((x) => daysToExpiry(x.expiry) <= EXPIRY_WARN_DAYS)
        : items,
    [items, onlyExpiring],
  );

  const columns: ColumnsType<DrugInventoryItem> = [
    { title: '药品名称', dataIndex: 'name', width: 200 },
    { title: '规格', dataIndex: 'spec', width: 160 },
    { title: '批次', dataIndex: 'batch', width: 120 },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 100,
      sorter: (a, b) => a.stock - b.stock,
      render: (v: number, r) => (
        <Tag color={r.status === '偏低' ? 'red' : r.status === '偏高' ? 'blue' : 'default'}>{v}</Tag>
      ),
    },
    {
      title: '单价（元）',
      dataIndex: 'price',
      width: 100,
      align: 'right',
      render: (v: number) => v.toFixed(2),
    },
    {
      title: '效期',
      dataIndex: 'expiry',
      width: 160,
      sorter: (a, b) => a.expiry.localeCompare(b.expiry),
      render: (v: string) => {
        const d = daysToExpiry(v);
        const warn = d <= EXPIRY_WARN_DAYS;
        return (
          <Tag color={warn ? 'red' : 'green'}>
            {dayjs(v).format('YYYY-MM-DD')}（{d === Number.POSITIVE_INFINITY ? '—' : `${d} 天`}）
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: DrugInventoryItem['status']) => (
        <Tag color={INVENTORY_STATUS_META[v].color}>{INVENTORY_STATUS_META[v].label}</Tag>
      ),
    },
  ];

  const doReceive = async (values: ReceiveFormValues) => {
    const payload: ReceiveInput = {
      drugName: values.drugName,
      spec: values.spec,
      batchNumber: values.batchNumber,
      quantity: values.quantity,
      expiryDate: values.expiryDate,
      unitPrice: values.unitPrice,
    };
    const ok = await receive(payload);
    if (ok) {
      message.success(`批次 ${payload.batchNumber} 入库 ${payload.quantity} 件`);
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="药品库存管理"
      description="库存 Table + 近效期预警（≤90 天红色）+ 入库登记"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 inventory:view 权限" />
      )}

      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <span>
            库存总览（{data.length} 条）
            <Switch
              checked={onlyExpiring}
              onChange={(v) => setOnlyExpiring(v)}
              style={{ marginLeft: 16 }}
              checkedChildren="仅看近效期"
              unCheckedChildren="全部"
            />
          </span>
        }
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            入库登记
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey={(r) => `${r.name}-${r.batch}`} dataSource={data} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal
        open={modalOpen}
        title="入库登记"
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={doReceive}>
          <Form.Item name="drugName" label="药品名称" rules={[{ required: true, message: '请输入药品名称' }]}>
            <Input placeholder="如 阿司匹林肠溶片" />
          </Form.Item>
          <Form.Item name="spec" label="规格" rules={[{ required: true, message: '请输入规格' }]}>
            <Input placeholder="如 100mg*30片" />
          </Form.Item>
          <Form.Item name="batchNumber" label="批次号" rules={[{ required: true, message: '请输入批次号' }]}>
            <Input placeholder="如 B20261022" />
          </Form.Item>
          <Form.Item name="quantity" label="入库数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="expiryDate" label="效期（YYYY-MM-DD）" rules={[{ required: true, message: '请输入效期' }]}>
            <Input placeholder="如 2027-10-01" />
          </Form.Item>
          <Form.Item name="unitPrice" label="单价（元）" rules={[{ required: true, message: '请输入单价' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={acting}>
              提交入库
            </Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
