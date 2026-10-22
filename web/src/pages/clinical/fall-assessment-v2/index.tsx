/**
 * 健澜科技 jlmedaios - 跌倒评估（M640，配套 M556）
 *
 * 三甲流程：Morse 评分 Table（评分/风险等级 badge/预防措施）+ 评估 Modal。
 * 权限码 nursing:assessFall。
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
import { useFallAssessmentV2M640Store } from '@/store/fallAssessmentV2M640Store';
import {
  FALL_RISK_META,
  morseToRisk,
  type FallAssessment,
} from '@/services/api/fallAssessmentV2M640';

interface CreateFormValues {
  patientId: string;
  morseScore: number;
  precautions: string;
  assessedBy: string;
}

export default function FallAssessmentV2M640Page() {
  usePageTitle('跌倒评估');
  const { hasPermission } = usePermission();
  const canAssess = hasPermission('nursing:assessFall');

  const { items, loading, acting, error, demo, load, create } =
    useFallAssessmentV2M640Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<FallAssessment> = [
    { title: '评估号', dataIndex: 'id', width: 100 },
    { title: '患者', dataIndex: 'patientId', width: 100 },
    { title: 'Morse 评分', dataIndex: 'morseScore', width: 110, sorter: (a, b) => a.morseScore - b.morseScore, render: (v: number) => <b>{v}</b> },
    {
      title: '风险等级',
      dataIndex: 'risk',
      width: 110,
      render: (v: FallAssessment['risk']) => <Tag color={FALL_RISK_META[v].color}>{FALL_RISK_META[v].label}</Tag>,
    },
    { title: '预防措施', dataIndex: 'precautions', ellipsis: true },
    { title: '评估时间', dataIndex: 'assessedAt', width: 140, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '评估人', dataIndex: 'assessedBy', width: 100 },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create(values);
    if (ok) {
      message.success(`评估已提交（${FALL_RISK_META[morseToRisk(values.morseScore)].label}）`);
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="跌倒评估记录（v2）"
      description="Morse 评分 + 风险等级 + 预防措施"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canAssess && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 nursing:assessFall 权限" />
      )}

      <Card
        size="small"
        title={`评估记录（${items.length}）`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建评估
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="Morse 跌倒评估" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="patientId" label="患者 ID" rules={[{ required: true, message: '必填' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="morseScore" label="Morse 评分（0-125）" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={0} max={125} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="precautions" label="预防措施" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="assessedBy" label="评估人" rules={[{ required: true, message: '必填' }]}>
            <Input style={{ maxWidth: 200 }} />
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
