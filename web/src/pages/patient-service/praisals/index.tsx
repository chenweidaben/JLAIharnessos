/**
 * 健澜科技 jlmedaios - 表扬管理（M756）
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
import { usePraiseM756Store } from '@/store/praiseM756Store';
import {
  PRAISE_STATUS_META,
  type Praise,
} from '@/services/api/praiseM756';

const buildColumns = (setDetail: (r: Praise) => void): ColumnsType<Praise> => [
  { title: '表扬编号', dataIndex: 'praiseNo', width: 130 },
  { title: '表扬人', dataIndex: 'from', width: 110 },
  { title: '表扬对象', dataIndex: 'to', width: 200, ellipsis: true },
  { title: '表扬方式', dataIndex: 'method', width: 140 },
  { title: '表扬时间', dataIndex: 'praisedAt', width: 110 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: Praise['status']) => <Tag color={PRAISE_STATUS_META[v].color}>{PRAISE_STATUS_META[v].label}</Tag>,
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

export default function PraisalsM756Page() {
  usePageTitle('表扬管理');
  const { items, loading, error, demo, load } = usePraiseM756Store();
  const [detail, setDetail] = useState<Praise | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="表扬管理"
      description="表扬编号 / 表扬人 / 表扬对象 / 表扬方式 / 表扬时间 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`表扬列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="表扬详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="表扬编号">{detail.praiseNo}</Descriptions.Item>
              <Descriptions.Item label="表扬人">{detail.from}</Descriptions.Item>
              <Descriptions.Item label="表扬对象" span={2}>{detail.to}</Descriptions.Item>
              <Descriptions.Item label="表扬方式">{detail.method}</Descriptions.Item>
              <Descriptions.Item label="表扬时间">{detail.praisedAt}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={PRAISE_STATUS_META[detail.status].color}>{PRAISE_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="表扬内容" span={2}>{detail.content}</Descriptions.Item>
              <Descriptions.Item label="核实情况" span={2}>{detail.verification}</Descriptions.Item>
              <Descriptions.Item label="表彰记录" span={2}>{detail.reward}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
