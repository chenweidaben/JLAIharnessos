/**
 * 健澜科技 jlmedaios - 手术知情同意（M646，配套 M573）
 *
 * 三甲流程：同意书 Table + 签署详情 Modal（患者签字时间 / 医师签字时间）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useSurgeryConsentV2M646Store } from '@/store/surgeryConsentV2M646Store';
import {
  CONSENT_STATUS_META,
  type SurgeryConsent,
} from '@/services/api/surgeryConsentV2M646';

export default function SurgeryConsentV2M646Page() {
  usePageTitle('手术知情同意');

  const { items, loading, error, demo, load } = useSurgeryConsentV2M646Store();

  const [detail, setDetail] = useState<SurgeryConsent | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<SurgeryConsent> = [
    { title: '同意书号', dataIndex: 'id', width: 110 },
    { title: '手术名称', dataIndex: 'surgeryName', ellipsis: true },
    { title: '手术医师', dataIndex: 'doctorName', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (v: SurgeryConsent['status']) => (
        <Tag color={CONSENT_STATUS_META[v].color}>{CONSENT_STATUS_META[v].label}</Tag>
      ),
    },
    {
      title: '患者签字',
      dataIndex: 'patientSignedAt',
      width: 150,
      render: (v: string | null) => (v ? dayjs(v).format('MM-DD HH:mm') : '—'),
    },
    {
      title: '医师签字',
      dataIndex: 'doctorSignedAt',
      width: 150,
      render: (v: string | null) => (v ? dayjs(v).format('MM-DD HH:mm') : '—'),
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 100,
      render: (_v, row) => (
        <Button type="link" size="small" onClick={() => setDetail(row)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="手术知情同意（v2）"
      description="同意书签署状态与签字详情"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`同意书（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="知情同意书详情"
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
        width={680}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="同意书号">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="手术名称">{detail.surgeryName}</Descriptions.Item>
            <Descriptions.Item label="风险告知">{detail.riskNote}</Descriptions.Item>
            <Descriptions.Item label="手术医师">{detail.doctorName}</Descriptions.Item>
            <Descriptions.Item label="患者签字时间">
              {detail.patientSignedAt ? dayjs(detail.patientSignedAt).format('YYYY-MM-DD HH:mm') : '尚未签字'}
            </Descriptions.Item>
            <Descriptions.Item label="医师签字时间">
              {detail.doctorSignedAt ? dayjs(detail.doctorSignedAt).format('YYYY-MM-DD HH:mm') : '尚未签字'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={CONSENT_STATUS_META[detail.status].color}>{CONSENT_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
