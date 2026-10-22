/**
 * 健澜科技 jlmedaios - 住院药房摆药管理（M714）
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
import { useInpatientDispensingM714Store } from '@/store/inpatientPrescriptionM714Store';
import type { InpatientDispensing } from '@/services/api/inpatientPrescriptionM714';

const buildColumns = (setDetail: (r: InpatientDispensing) => void): ColumnsType<InpatientDispensing> => [
  { title: '床号', dataIndex: 'bedNo', width: 100 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '药品', dataIndex: 'drugName', ellipsis: true },
  { title: '剂量', dataIndex: 'dose', width: 100 },
  { title: '给药途径', dataIndex: 'route', width: 120 },
  { title: '频次', dataIndex: 'frequency', width: 100 },
  {
    title: '状态',
    width: 110,
    render: (_v, row) =>
      row.preparedAt ? <Tag color="green">已摆药</Tag> : <Tag color="orange">待摆药</Tag>,
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

export default function InpatientDispensingM714Page() {
  usePageTitle('住院药房摆药管理');
  const { items, loading, error, demo, load } = useInpatientDispensingM714Store();
  const [detail, setDetail] = useState<InpatientDispensing | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="住院药房摆药管理"
      description="床号 / 患者 / 药品 / 剂量 / 给药途径 / 频次"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`住院摆药单（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="住院摆药详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="床号">{detail.bedNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="药品">{detail.drugName}</Descriptions.Item>
            <Descriptions.Item label="剂量">{detail.dose}</Descriptions.Item>
            <Descriptions.Item label="给药途径">{detail.route}</Descriptions.Item>
            <Descriptions.Item label="频次">{detail.frequency}</Descriptions.Item>
            <Descriptions.Item label="摆药人">{detail.preparedBy}</Descriptions.Item>
            <Descriptions.Item label="核对人">{detail.verifiedBy}</Descriptions.Item>
            <Descriptions.Item label="摆药时间">
              {detail.preparedAt ? dayjs(detail.preparedAt).format('YYYY-MM-DD HH:mm') : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
