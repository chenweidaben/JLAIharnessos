/**
 * 健澜科技 jlmedaios - 出院随访管理（M901）
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
import { useFollowupWorkloadM901Store } from '@/store/followupWorkloadM901Store';
import type { FollowupWorkload } from '@/services/api/followupWorkloadM901';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: FollowupWorkload) => void): ColumnsType<FollowupWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '应随访数', dataIndex: 'shouldFollowup', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '已随访数', dataIndex: 'followedUp', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '电话随访数', dataIndex: 'phone', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '线上随访数', dataIndex: 'online', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  {
    title: '失访数',
    dataIndex: 'lost',
    width: 100,
    align: 'right',
    render: (v: number, r) => <Tag color={v / r.shouldFollowup > 0.1 ? 'red' : 'orange'}>{v}</Tag>,
  },
  { title: '状态', dataIndex: 'status', width: 110 },
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

export default function FollowupManagementM901Page() {
  usePageTitle('出院随访管理');
  const { items, loading, error, demo, load } = useFollowupWorkloadM901Store();
  const [detail, setDetail] = useState<FollowupWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="出院随访管理"
      description="日期 / 应随访 / 已随访 / 电话 / 线上 / 失访 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`出院随访工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="出院随访工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="应随访数">{detail.shouldFollowup}</Descriptions.Item>
              <Descriptions.Item label="已随访数">{detail.followedUp}</Descriptions.Item>
              <Descriptions.Item label="电话随访">{detail.phone}</Descriptions.Item>
              <Descriptions.Item label="线上随访">{detail.online}</Descriptions.Item>
              <Descriptions.Item label="失访数">{detail.lost}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="失访原因" span={2}>{detail.lostReasons}</Descriptions.Item>
              <Descriptions.Item label="随访记录" span={2}>{detail.followupRecords}</Descriptions.Item>
              <Descriptions.Item label="满意度反馈" span={2}>{detail.satisfactionFeedback}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="随访类型（出院1周/术后1月/慢病3月/肿瘤6月）">
                <Table rowKey="name" dataSource={detail.typeBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="随访内容（用药/康复/饮食/复诊）">
                <Table rowKey="name" dataSource={detail.contentBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
