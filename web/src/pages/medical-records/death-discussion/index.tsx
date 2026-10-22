/**
 * 健澜科技 jlmedaios - 死亡病例讨论（M701）
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
import { useDeathDiscussionM701Store } from '@/store/deathDiscussionM701Store';
import type { DeathDiscussion } from '@/services/api/deathDiscussionM701';

const buildColumns = (setDetail: (r: DeathDiscussion) => void): ColumnsType<DeathDiscussion> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 120 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '死亡日期', dataIndex: 'deathDate', width: 120 },
  { title: '讨论时间', dataIndex: 'discussedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  { title: '主持医师', dataIndex: 'chair', width: 160 },
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

export default function DeathDiscussionM701Page() {
  usePageTitle('死亡病例讨论');
  const { items, loading, error, demo, load } = useDeathDiscussionM701Store();
  const [detail, setDetail] = useState<DeathDiscussion | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="死亡病例讨论"
      description="住院号 / 患者 / 死亡日期 / 讨论时间 / 主持医师"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`死亡讨论（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="死亡病例讨论详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="死亡日期">{detail.deathDate}</Descriptions.Item>
            <Descriptions.Item label="讨论时间">{dayjs(detail.discussedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="主持医师">{detail.chair}</Descriptions.Item>
            <Descriptions.Item label="死亡原因分析">{detail.causeAnalysis}</Descriptions.Item>
            <Descriptions.Item label="诊疗经验教训">{detail.lessons}</Descriptions.Item>
            <Descriptions.Item label="改进措施">
              {detail.improvements.map((s) => <div key={s}>· {s}</div>)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
