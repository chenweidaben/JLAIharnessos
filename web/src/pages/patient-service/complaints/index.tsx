/**
 * 健澜科技 jlmedaios - 投诉管理（M755）
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
import { useComplaintM755Store } from '@/store/complaintM755Store';
import {
  COMPLAINT_STATUS_META,
  type Complaint,
} from '@/services/api/complaintM755';

const buildColumns = (setDetail: (r: Complaint) => void): ColumnsType<Complaint> => [
  { title: '投诉编号', dataIndex: 'complaintNo', width: 130 },
  { title: '投诉人', dataIndex: 'complainant', width: 110 },
  { title: '投诉对象', dataIndex: 'target', width: 200, ellipsis: true },
  { title: '投诉类型', dataIndex: 'type', width: 120 },
  { title: '投诉时间', dataIndex: 'filedAt', width: 110 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: Complaint['status']) => <Tag color={COMPLAINT_STATUS_META[v].color}>{COMPLAINT_STATUS_META[v].label}</Tag>,
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

export default function ComplaintsM755Page() {
  usePageTitle('投诉管理');
  const { items, loading, error, demo, load } = useComplaintM755Store();
  const [detail, setDetail] = useState<Complaint | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="投诉管理"
      description="投诉编号 / 投诉人 / 投诉对象 / 投诉类型 / 投诉时间 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`投诉列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="投诉详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="投诉编号">{detail.complaintNo}</Descriptions.Item>
              <Descriptions.Item label="投诉人">{detail.complainant}</Descriptions.Item>
              <Descriptions.Item label="投诉对象" span={2}>{detail.target}</Descriptions.Item>
              <Descriptions.Item label="投诉类型">{detail.type}</Descriptions.Item>
              <Descriptions.Item label="投诉时间">{detail.filedAt}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={COMPLAINT_STATUS_META[detail.status].color}>{COMPLAINT_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="投诉内容" span={2}>{detail.content}</Descriptions.Item>
              <Descriptions.Item label="调查过程" span={2}>{detail.investigation}</Descriptions.Item>
              <Descriptions.Item label="处理结果" span={2}>{detail.resolution}</Descriptions.Item>
              <Descriptions.Item label="回访记录" span={2}>{detail.callback}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
