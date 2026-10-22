/**
 * 健澜科技 jlmedaios - 手术患者交接单（M696）
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
import { useSurgeryHandoverM696Store } from '@/store/surgeryHandoverM696Store';
import type { SurgeryHandover } from '@/services/api/surgeryHandoverM696';

const buildColumns = (setDetail: (r: SurgeryHandover) => void): ColumnsType<SurgeryHandover> => [
  { title: '交接号', dataIndex: 'id', width: 100 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '手术名称', dataIndex: 'surgeryName', ellipsis: true },
  { title: '交接时间', dataIndex: 'handoverAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  {
    title: '交接路径',
    width: 220,
    render: (_v, row) => (
      <span>
        <Tag color="default">{row.fromDept}</Tag>
        <span style={{ color: '#999', margin: '0 4px' }}>→</span>
        <Tag color="processing">{row.toDept}</Tag>
      </span>
    ),
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

export default function SurgeryHandoverM696Page() {
  usePageTitle('手术患者交接单');
  const { items, loading, error, demo, load } = useSurgeryHandoverM696Store();
  const [detail, setDetail] = useState<SurgeryHandover | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="手术患者交接单"
      description="患者 / 手术名称 / 交接时间 / 交接科室"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`交接单（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="手术交接详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="手术名称">{detail.surgeryName}</Descriptions.Item>
            <Descriptions.Item label="交接时间">{dayjs(detail.handoverAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="交接路径">{detail.fromDept} → {detail.toDept}</Descriptions.Item>
            <Descriptions.Item label="术前交接内容">
              {detail.preopItems.map((s) => <div key={s}>· {s}</div>)}
            </Descriptions.Item>
            <Descriptions.Item label="术中交接内容">
              {detail.intraopItems.map((s) => <div key={s}>· {s}</div>)}
            </Descriptions.Item>
            <Descriptions.Item label="术后交接内容">
              {detail.postopItems.map((s) => <div key={s}>· {s}</div>)}
            </Descriptions.Item>
            <Descriptions.Item label="交出方">{detail.giver}</Descriptions.Item>
            <Descriptions.Item label="接收方">{detail.receiver}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
