/**
 * 健澜科技 jlmedaios - 医患沟通记录（M757）
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

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useCommunicationRecordM757Store } from '@/store/communicationRecordM757Store';
import {
  COMM_STATUS_META,
  type CommunicationRecord,
} from '@/services/api/communicationRecordM757';

const buildColumns = (setDetail: (r: CommunicationRecord) => void): ColumnsType<CommunicationRecord> => [
  { title: '患者姓名', dataIndex: 'patient', width: 200, ellipsis: true },
  { title: '沟通类型', dataIndex: 'type', width: 130 },
  { title: '沟通时间', dataIndex: 'heldAt', width: 160 },
  { title: '沟通人员', dataIndex: 'staff', width: 180, ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: CommunicationRecord['status']) => <Tag color={COMM_STATUS_META[v].color}>{COMM_STATUS_META[v].label}</Tag>,
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

export default function CommunicationRecordsM757Page() {
  usePageTitle('医患沟通记录');
  const { items, loading, error, demo, load } = useCommunicationRecordM757Store();
  const [detail, setDetail] = useState<CommunicationRecord | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医患沟通记录"
      description="患者姓名 / 沟通类型 / 沟通时间 / 沟通人员 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`沟通记录（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="沟通记录详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="患者姓名" span={2}>{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="沟通类型">{detail.type}</Descriptions.Item>
              <Descriptions.Item label="沟通时间">{detail.heldAt}</Descriptions.Item>
              <Descriptions.Item label="沟通人员" span={2}>{detail.staff}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={COMM_STATUS_META[detail.status].color}>{COMM_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="患者签字" span={2}>{detail.signedBy}</Descriptions.Item>
              <Descriptions.Item label="沟通内容" span={2}>{detail.content}</Descriptions.Item>
              <Descriptions.Item label="沟通结论" span={2}>{detail.conclusion}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
