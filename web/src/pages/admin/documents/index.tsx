/**
 * 健澜科技 jlmedaios - 公文管理（M749）
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
import { useAdminDocumentM749Store } from '@/store/adminDocumentM749Store';
import {
  DOC_STATUS_META,
  type AdminDocument,
} from '@/services/api/adminDocumentM749';

const buildColumns = (setDetail: (r: AdminDocument) => void): ColumnsType<AdminDocument> => [
  { title: '公文编号', dataIndex: 'docNo', width: 200 },
  { title: '公文标题', dataIndex: 'title', ellipsis: true },
  { title: '发文部门', dataIndex: 'dept', width: 130 },
  { title: '发文日期', dataIndex: 'issuedAt', width: 110 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: AdminDocument['status']) => <Tag color={DOC_STATUS_META[v].color}>{DOC_STATUS_META[v].label}</Tag>,
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

export default function AdminDocumentsM749Page() {
  usePageTitle('公文管理');
  const { items, loading, error, demo, load } = useAdminDocumentM749Store();
  const [detail, setDetail] = useState<AdminDocument | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="公文管理"
      description="公文编号 / 公文标题 / 发文部门 / 发文日期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`公文列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="公文详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="公文编号">{detail.docNo}</Descriptions.Item>
              <Descriptions.Item label="发文部门">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="公文标题" span={2}>{detail.title}</Descriptions.Item>
              <Descriptions.Item label="发文日期">{detail.issuedAt}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={DOC_STATUS_META[detail.status].color}>{DOC_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="公文正文" style={{ marginBottom: 16 }}>{detail.content}</Card>
            <Card size="small" title="收文登记" style={{ marginBottom: 16 }}>{detail.receipt}</Card>
            <Card size="small" title="处理意见">{detail.disposition}</Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
