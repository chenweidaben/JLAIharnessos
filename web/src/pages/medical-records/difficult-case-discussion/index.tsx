/**
 * 健澜科技 jlmedaios - 疑难病例讨论（M702）
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
import { useDifficultDiscussionM702Store } from '@/store/difficultDiscussionM702Store';
import type { DifficultDiscussion } from '@/services/api/difficultDiscussionM702';

const buildColumns = (setDetail: (r: DifficultDiscussion) => void): ColumnsType<DifficultDiscussion> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 120 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '讨论主题', dataIndex: 'topic', ellipsis: true },
  { title: '讨论时间', dataIndex: 'discussedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  { title: '主持科室', dataIndex: 'chairDept', width: 130 },
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

export default function DifficultDiscussionM702Page() {
  usePageTitle('疑难病例讨论');
  const { items, loading, error, demo, load } = useDifficultDiscussionM702Store();
  const [detail, setDetail] = useState<DifficultDiscussion | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="疑难病例讨论"
      description="住院号 / 患者 / 讨论主题 / 讨论时间 / 主持科室"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`疑难讨论（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="疑难病例讨论详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="讨论主题">{detail.topic}</Descriptions.Item>
            <Descriptions.Item label="讨论时间">{dayjs(detail.discussedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="主持科室">{detail.chairDept}</Descriptions.Item>
            <Descriptions.Item label="病例摘要">{detail.caseSummary}</Descriptions.Item>
            <Descriptions.Item label="讨论意见">
              {detail.opinions.map((o) => <div key={o}>· {o}</div>)}
            </Descriptions.Item>
            <Descriptions.Item label="诊疗方案调整">{detail.planAdjustment}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
