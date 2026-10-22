/**
 * 健澜科技 jlmedaios - 急诊转诊（M672，配套 M569）
 *
 * 三甲流程：转诊 Table（患者/转出→转入医院/转入科室/状态 badge）+ 详情 Modal。
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
import { useEmergencyReferralV2M672Store } from '@/store/emergencyReferralV2M672Store';
import {
  REFERRAL_STATUS_META,
  type EmergencyReferral,
} from '@/services/api/emergencyReferralV2M672';

const buildColumns = (setDetail: (row: EmergencyReferral) => void): ColumnsType<EmergencyReferral> => [
  { title: '转诊号', dataIndex: 'id', width: 100 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  {
    title: '转出 → 转入',
    width: 260,
    render: (_v, row) => (
      <Space size={4}>
        <Tag color="default">{row.fromHospital}</Tag>
        <span style={{ color: '#999' }}>→</span>
        <Tag color="processing">{row.toHospital}</Tag>
      </Space>
    ),
  },
  { title: '转入科室', dataIndex: 'toDept', width: 120 },
  { title: '转诊原因', dataIndex: 'reason', ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 140,
    render: (v: EmergencyReferral['status']) => (
      <Tag color={REFERRAL_STATUS_META[v].color}>{REFERRAL_STATUS_META[v].label}</Tag>
    ),
  },
  { title: '申请时间', dataIndex: 'requestedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  {
    title: '操作',
    dataIndex: 'id',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function EmergencyReferralV2M672Page() {
  usePageTitle('急诊转诊');

  const { items, loading, error, demo, load } = useEmergencyReferralV2M672Store();

  const [detail, setDetail] = useState<EmergencyReferral | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="急诊转诊（v2）"
      description="转出医院 / 转入科室 / 转诊原因 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`转诊单（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="急诊转诊单详情"
        width={680}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="转诊号">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="转出医院">{detail.fromHospital}</Descriptions.Item>
            <Descriptions.Item label="转入医院">{detail.toHospital}</Descriptions.Item>
            <Descriptions.Item label="转入科室">{detail.toDept}</Descriptions.Item>
            <Descriptions.Item label="转诊原因">{detail.reason}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={REFERRAL_STATUS_META[detail.status].color}>
                {REFERRAL_STATUS_META[detail.status].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="申请时间">
              {dayjs(detail.requestedAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="救护车">{detail.ambulanceNo}</Descriptions.Item>
            <Descriptions.Item label="转诊医师">{detail.physician}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
