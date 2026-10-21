/**
 * 健澜科技 jlmedaios - CDS 规则配置 v2（M629，P0 合规）
 *
 * 三甲流程：规则 Table（规则名/类型/优先级/启用 Switch）+ 新建 Modal。
 * 权限码 cds:manage。
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
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useCdsRuleConfigV2M629Store } from '@/store/cdsRuleConfigV2M629Store';
import type { CdsRule, CdsRuleType } from '@/services/api/cdsRuleConfigV2M629';

const TYPE_META: Record<CdsRuleType, { label: string; color: string }> = {
  drug_interaction: { label: '药物相互作用', color: 'red' },
  lab_abnormal: { label: '检验异常', color: 'orange' },
  duplicate_therapy: { label: '重复用药', color: 'purple' },
  dose_exceeded: { label: '剂量超限', color: 'magenta' },
};

interface CreateFormValues {
  name: string;
  type: CdsRuleType;
  priority: number;
  description: string;
}

export default function CdsRuleConfigV2M629Page() {
  usePageTitle('CDS 规则配置');
  const { hasPermission } = usePermission();
  const canManage = hasPermission('cds:manage');

  const { items, loading, acting, error, demo, load, create, toggleEnabled } =
    useCdsRuleConfigV2M629Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<CdsRule> = [
    { title: '规则编码', dataIndex: 'ruleCode', width: 220 },
    { title: '规则名', dataIndex: 'name', width: 220 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 140,
      render: (v: CdsRuleType) => <Tag color={TYPE_META[v].color}>{TYPE_META[v].label}</Tag>,
    },
    { title: '优先级', dataIndex: 'priority', width: 90, sorter: (a, b) => a.priority - b.priority },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean, r) => (
        <Switch checked={v} disabled={!canManage} onChange={(c) => toggleEnabled(r.id, c)} />
      ),
    },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success('规则已创建');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="CDS 规则配置（v2）"
      description="临床决策支持规则列表与启用管理"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canManage && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 cds:manage 权限" />
      )}

      <Card
        size="small"
        title={`规则列表（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建规则
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建 CDS 规则" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="name" label="规则名" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '必选' }]}>
            <Select
              options={(Object.keys(TYPE_META) as CdsRuleType[]).map((k) => ({
                value: k,
                label: TYPE_META[k].label,
              }))}
            />
          </Form.Item>
          <Form.Item name="priority" label="优先级（0-100）" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={acting}>
              提交
            </Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
