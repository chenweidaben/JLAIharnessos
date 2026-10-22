/**
 * 健澜科技 jlmedaios - 病历复印申请（M700）
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
import { useCopyRequestM700Store } from '@/store/copyRequestM700Store';
import {
  COLLECT_METHOD_META,
  COPY_STATUS_META,
  type CopyRequest,
} from '@/services/api/copyRequestM700';

const buildColumns = (setDetail: (r: CopyRequest) => void): ColumnsType<CopyRequest> => [
  { title: '申请号', dataIndex: 'reqNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '复印用途', dataIndex: 'purpose', width: 160 },
  { title: '申请日期', dataIndex: 'requestedAt', width: 120, render: (v: string) => dayjs(v).format('MM-DD') },
  { title: '费用', dataIndex: 'totalFee', width: 100, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: CopyRequest['status']) => <Tag color={COPY_STATUS_META[v].color}>{COPY_STATUS_META[v].label}</Tag>,
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

export default function CopyRequestM700Page() {
  usePageTitle('病历复印申请');
  const { items, loading, error, demo, load } = useCopyRequestM700Store();
  const [detail, setDetail] = useState<CopyRequest | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病历复印申请"
      description="申请号 / 患者 / 复印用途 / 申请日期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`复印申请（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="复印申请详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="申请号">{detail.reqNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="复印用途">{detail.purpose}</Descriptions.Item>
            <Descriptions.Item label="申请日期">{dayjs(detail.requestedAt).format('YYYY-MM-DD')}</Descriptions.Item>
            <Descriptions.Item label="复印材料">
              {detail.materials.map((m) => <div key={m}>· {m}</div>)}
            </Descriptions.Item>
            <Descriptions.Item label="费用">¥{detail.totalFee.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="领取方式">{COLLECT_METHOD_META[detail.collectMethod]}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={COPY_STATUS_META[detail.status].color}>{COPY_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
