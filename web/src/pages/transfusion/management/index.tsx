/**
 * 健澜科技 jlmedaios - 输血管理（M688）
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
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useTransfusionManagementM688Store } from '@/store/transfusionManagementM688Store';
import {
  TRANSFUSION_STATUS_META,
  type TransfusionOrder,
} from '@/services/api/transfusionManagementM688';

const buildColumns = (setDetail: (r: TransfusionOrder) => void): ColumnsType<TransfusionOrder> => [
  { title: '申请号', dataIndex: 'reqNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '血型', dataIndex: 'bloodType', width: 100 },
  { title: '成分', dataIndex: 'component', ellipsis: true },
  { title: '血量', dataIndex: 'volumeMl', width: 100, align: 'right', render: (v: number) => `${v} ml` },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (v: TransfusionOrder['status']) => <Tag color={TRANSFUSION_STATUS_META[v].color}>{TRANSFUSION_STATUS_META[v].label}</Tag>,
  },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function TransfusionManagementM688Page() {
  usePageTitle('输血管理');
  const { items, loading, error, demo, load } = useTransfusionManagementM688Store();
  const [detail, setDetail] = useState<TransfusionOrder | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="输血管理"
      description="申请号 / 患者 / 血型 / 血量 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`输血申请（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="输血记录详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="申请号">{detail.reqNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="血型">{detail.bloodType}</Descriptions.Item>
            <Descriptions.Item label="血液成分">{detail.component}</Descriptions.Item>
            <Descriptions.Item label="血量">{detail.volumeMl} ml</Descriptions.Item>
            <Descriptions.Item label="交叉配血">{detail.crossmatchResult}</Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {detail.startedAt ? dayjs(detail.startedAt).format('YYYY-MM-DD HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {detail.endedAt ? dayjs(detail.endedAt).format('YYYY-MM-DD HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="输血反应">{detail.reaction || '—'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={TRANSFUSION_STATUS_META[detail.status].color}>{TRANSFUSION_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
