/**
 * 健澜科技 jlmedaios - 危急值管理（M659，配套 M550）
 *
 * 三甲流程：危急值 Table（项目/结果/参考范围/状态）+ 签收 Modal。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
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
import { useCriticalValueV2M659Store } from '@/store/criticalValueV2M659Store';
import {
  CRITICAL_STATUS_META,
  type CriticalValue,
} from '@/services/api/criticalValueV2M659';

interface AckFormValues {
  doctor: string;
}

export default function CriticalValueV2M659Page() {
  usePageTitle('危急值管理');

  const { items, loading, acting, error, demo, load, acknowledge } =
    useCriticalValueV2M659Store();

  const [detail, setDetail] = useState<CriticalValue | null>(null);
  const [ackTarget, setAckTarget] = useState<CriticalValue | null>(null);
  const [form] = Form.useForm<AckFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<CriticalValue> = [
    { title: '告警号', dataIndex: 'id', width: 100 },
    { title: '患者', dataIndex: 'patientId', width: 100 },
    { title: '项目', dataIndex: 'testName', width: 180 },
    { title: '结果', dataIndex: 'result', width: 160, render: (v: string) => <b style={{ color: '#cf1322' }}>{v}</b> },
    { title: '参考范围', dataIndex: 'refRange', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (v: CriticalValue['status']) => (
        <Tag color={CRITICAL_STATUS_META[v].color}>{CRITICAL_STATUS_META[v].label}</Tag>
      ),
    },
    { title: '触发时间', dataIndex: 'occurredAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    {
      title: '操作',
      dataIndex: 'id',
      width: 160,
      render: (_v, row) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => setDetail(row)}>
            详情
          </Button>
          {(row.status === 'alerted' || row.status === 'notified') && (
            <Button type="link" size="small" onClick={() => setAckTarget(row)}>
              签收
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const doAck = async (values: AckFormValues) => {
    if (!ackTarget) return;
    const ok = await acknowledge(ackTarget.id, values.doctor);
    if (ok) {
      message.success(`危急值 ${ackTarget.id} 已签收`);
      setAckTarget(null);
      setDetail(null);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="危急值管理（v2）"
      description="项目 / 结果 / 参考范围 / 通知与签收"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`危急值（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="危急值详情"
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="告警号">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="检验项目">{detail.testName}</Descriptions.Item>
            <Descriptions.Item label="危急结果">{detail.result}</Descriptions.Item>
            <Descriptions.Item label="参考范围">{detail.refRange}</Descriptions.Item>
            <Descriptions.Item label="触发时间">{dayjs(detail.occurredAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={CRITICAL_STATUS_META[detail.status].color}>{CRITICAL_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="通知时间">
              {detail.notifiedAt ? dayjs(detail.notifiedAt).format('YYYY-MM-DD HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="医师签收时间">
              {detail.acknowledgedAt ? dayjs(detail.acknowledgedAt).format('YYYY-MM-DD HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="签收医师">{detail.acknowledgingDoctor ?? '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        open={!!ackTarget}
        title={`签收危急值 ${ackTarget?.id ?? ''}`}
        footer={null}
        onCancel={() => setAckTarget(null)}
      >
        <Form form={form} layout="vertical" onFinish={doAck}>
          <Form.Item name="doctor" label="签收医师工号/姓名" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={acting}>
              确认签收
            </Button>
            <Button onClick={() => setAckTarget(null)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
