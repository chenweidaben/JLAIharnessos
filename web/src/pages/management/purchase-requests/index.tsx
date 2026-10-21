/**
 * 健澜科技 jlmedaios - 采购申请（M612，P0）
 *
 * 三甲流程：采购申请列表 Table（状态 badge pending/orange、approved/green、rejected/red）
 * → 新建 Modal（品项/规格/数量/估算单价/科室/申请人/事由）。权限码 purchase:view。
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
import { usePurchaseRequestsM612Store } from '@/store/purchaseRequestsM612Store';
import {
  PURCHASE_STATUS_META,
  type PurchaseRequest,
  type PurchaseRequestInput,
} from '@/services/api/purchaseRequestsM612';

interface CreateFormValues {
  itemName: string;
  spec: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  requesterDept: string;
  requesterName: string;
  reason: string;
}

export default function PurchaseRequestsM612Page() {
  usePageTitle('采购申请');
  const { hasPermission } = usePermission();
  const canView = hasPermission('purchase:view');

  const { items, loading, acting, error, demo, load, create } = usePurchaseRequestsM612Store();

  const [form] = Form.useForm<CreateFormValues>();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<PurchaseRequest> = [
    { title: '申请单号', dataIndex: 'requestNo', width: 180 },
    { title: '品项', dataIndex: 'itemName', width: 200 },
    { title: '规格', dataIndex: 'spec', width: 120 },
    { title: '数量', dataIndex: 'quantity', width: 90, render: (v: number, r) => `${v} ${r.unit}` },
    { title: '估算单价', dataIndex: 'estimatedUnitPrice', width: 110, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '科室', dataIndex: 'requesterDept', width: 110 },
    { title: '申请人', dataIndex: 'requesterName', width: 100 },
    { title: '事由', dataIndex: 'reason', ellipsis: true },
    { title: '提交时间', dataIndex: 'createdAt', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: PurchaseRequest['status']) => (
        <Tag color={PURCHASE_STATUS_META[v].color}>{PURCHASE_STATUS_META[v].label}</Tag>
      ),
    },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const input: PurchaseRequestInput = { ...values };
    const ok = await create(input);
    if (ok) {
      message.success('采购申请已提交');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="采购申请管理"
      description="采购申请列表（状态 badge）+ 新建申请"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 purchase:view 权限" />
      )}

      <Card
        size="small"
        title={`采购申请（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建申请
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建采购申请" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="itemName" label="品项名称" rules={[{ required: true, message: '请输入品项名称' }]}>
            <Input placeholder="如 一次性使用无菌注射器" />
          </Form.Item>
          <Form.Item name="spec" label="规格" rules={[{ required: true, message: '请输入规格' }]}>
            <Input placeholder="如 5ml" />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
              <InputNumber min={1} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="unit" label="单位" rules={[{ required: true, message: '请输入单位' }]}>
              <Input style={{ width: 100 }} placeholder="支" />
            </Form.Item>
            <Form.Item name="estimatedUnitPrice" label="估算单价（元）" rules={[{ required: true, message: '请输入单价' }]}>
              <InputNumber min={0} precision={2} style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item name="requesterDept" label="申请科室" rules={[{ required: true, message: '请输入科室' }]}>
            <Input placeholder="如 DEPT-INT" />
          </Form.Item>
          <Form.Item name="requesterName" label="申请人" rules={[{ required: true, message: '请输入申请人' }]}>
            <Input placeholder="如 周敏" />
          </Form.Item>
          <Form.Item name="reason" label="事由" rules={[{ required: true, message: '请输入事由' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={acting}>
              提交申请
            </Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
