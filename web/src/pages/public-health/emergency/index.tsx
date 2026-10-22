/**
 * 健澜科技 jlmedaios - 突发公共卫生事件应急（M764）
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
import { usePublicHealthEmergencyM764Store } from '@/store/publicHealthEmergencyM764Store';
import {
  EM_LEVEL_META,
  EM_STATUS_META,
  type PublicHealthEmergency,
} from '@/services/api/publicHealthEmergencyM764';

const buildColumns = (setDetail: (r: PublicHealthEmergency) => void): ColumnsType<PublicHealthEmergency> => [
  { title: '事件编号', dataIndex: 'eventNo', width: 130 },
  { title: '事件名称', dataIndex: 'name', ellipsis: true },
  {
    title: '事件等级',
    dataIndex: 'level',
    width: 160,
    render: (v: PublicHealthEmergency['level']) => <Tag color={EM_LEVEL_META[v].color}>{EM_LEVEL_META[v].label}</Tag>,
  },
  { title: '发生时间', dataIndex: 'occurredAt', width: 120 },
  {
    title: '响应状态',
    dataIndex: 'status',
    width: 120,
    render: (v: PublicHealthEmergency['status']) => <Tag color={EM_STATUS_META[v].color}>{EM_STATUS_META[v].label}</Tag>,
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

export default function PublicHealthEmergenciesM764Page() {
  usePageTitle('突发公共卫生事件应急');
  const { items, loading, error, demo, load } = usePublicHealthEmergencyM764Store();
  const [detail, setDetail] = useState<PublicHealthEmergency | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="突发公共卫生事件应急"
      description="事件编号 / 事件名称 / 事件等级 / 发生时间 / 响应状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`应急事件（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="应急事件详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="事件编号">{detail.eventNo}</Descriptions.Item>
              <Descriptions.Item label="发生时间">{detail.occurredAt}</Descriptions.Item>
              <Descriptions.Item label="事件名称" span={2}>{detail.name}</Descriptions.Item>
              <Descriptions.Item label="事件等级">
                <Tag color={EM_LEVEL_META[detail.level].color}>{EM_LEVEL_META[detail.level].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="响应状态">
                <Tag color={EM_STATUS_META[detail.status].color}>{EM_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="事件经过" span={2}>{detail.process}</Descriptions.Item>
              <Descriptions.Item label="应急响应" span={2}>{detail.response}</Descriptions.Item>
              <Descriptions.Item label="处置措施" span={2}>{detail.measures}</Descriptions.Item>
              <Descriptions.Item label="总结评估" span={2}>{detail.summary}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
