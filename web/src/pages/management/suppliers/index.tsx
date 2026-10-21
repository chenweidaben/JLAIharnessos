/**
 * 健澜科技 jlmedaios - 供应商管理（M613，P0）
 *
 * 三甲流程：供应商列表 Table（名称/统一社会信用代码/联系人/电话/品类 Tag/资质效期/评级 Tag）
 * → 新建 Modal（businessLicenseNo 唯一，后端 409 时 message 提示）。权限码 supplier:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
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
import dayjs, { type Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useSuppliersM613Store } from '@/store/suppliersM613Store';
import {
  SUPPLIER_CATEGORY_META,
  type SupplierCategory,
  type SupplierRecord,
} from '@/services/api/suppliersM613';

interface CreateFormValues {
  supplierName: string;
  unifiedSocialCreditCode: string;
  contactPerson: string;
  contactPhone: string;
  address: string;
  category: SupplierCategory;
  businessLicenseNo: string;
  expiryDate: Dayjs;
  registeredCapital: number;
}

export default function SuppliersM613Page() {
  usePageTitle('供应商管理');
  const { hasPermission } = usePermission();
  const canView = hasPermission('supplier:view');

  const { items, loading, acting, error, demo, load, create } = useSuppliersM613Store();

  const [form] = Form.useForm<CreateFormValues>();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<SupplierRecord> = [
    { title: '供应商名称', dataIndex: 'supplierName', width: 220, render: (v: string, r) => (
        <Space direction="vertical" size={0}>
          <b>{v}</b>
          <span style={{ color: '#999', fontSize: 12 }}>{r.unifiedSocialCreditCode}</span>
        </Space>
    ) },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { title: '联系电话', dataIndex: 'contactPhone', width: 130 },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    {
      title: '品类',
      dataIndex: 'category',
      width: 110,
      render: (v: SupplierCategory) => (
        <Tag color={SUPPLIER_CATEGORY_META[v]?.color ?? 'default'}>
          {SUPPLIER_CATEGORY_META[v]?.label ?? v}
        </Tag>
      ),
    },
    {
      title: '资质效期',
      dataIndex: 'expiryDate',
      width: 160,
      render: (v: string, r) => (
        <Tag color={r.isExpired ? 'red' : 'green'}>
          {dayjs(v).format('YYYY-MM-DD')}（{r.isExpired ? '已过期' : '有效'}）
        </Tag>
      ),
    },
    {
      title: '评级',
      dataIndex: 'auditResult',
      width: 110,
      render: (v: SupplierRecord['auditResult'], r) => {
        if (r.isBlacklisted) return <Tag color="black">已拉黑</Tag>;
        if (v === 'passed') return <Tag color="green">已通过</Tag>;
        if (v === 'rejected') return <Tag color="red">已驳回</Tag>;
        return <Tag color="orange">待审核</Tag>;
      },
    },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create({
      supplierName: values.supplierName,
      unifiedSocialCreditCode: values.unifiedSocialCreditCode,
      contactPerson: values.contactPerson,
      contactPhone: values.contactPhone,
      address: values.address,
      category: values.category,
      businessLicenseNo: values.businessLicenseNo,
      expiryDate: values.expiryDate.format('YYYY-MM-DD'),
      registeredCapital: values.registeredCapital,
    });
    if (ok) {
      message.success('供应商已创建');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="供应商管理"
      description="供应商列表（品类/资质/评级 Tag）+ 新建供应商"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 supplier:view 权限" />
      )}

      <Card
        size="small"
        title={`供应商列表（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建供应商
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建供应商" onCancel={() => setModalOpen(false)} footer={null} width={620}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="supplierName" label="供应商名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="unifiedSocialCreditCode" label="统一社会信用代码" rules={[{ required: true, message: '请输入代码' }]}>
            <Input placeholder="如 91330100MA27XXXX0X" />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="contactPerson" label="联系人" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="contactPhone" label="联系电话" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="category" label="品类" rules={[{ required: true, message: '必填' }]}>
              <Select
                style={{ width: 140 }}
                options={(Object.keys(SUPPLIER_CATEGORY_META) as SupplierCategory[]).map((k) => ({
                  value: k,
                  label: SUPPLIER_CATEGORY_META[k].label,
                }))}
              />
            </Form.Item>
          </Space>
          <Form.Item name="businessLicenseNo" label="营业执照编号（唯一）" rules={[{ required: true, message: '必填' }]}>
            <Input placeholder="如 LIC-20260001" />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="expiryDate" label="资质效期" rules={[{ required: true, message: '必填' }]}>
              <DatePicker style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="registeredCapital" label="注册资本（元）" rules={[{ required: true, message: '必填' }]}>
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
            <Input />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={acting}>
              提交创建
            </Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
