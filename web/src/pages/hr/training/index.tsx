/**
 * 健澜科技 jlmedaios - 培训管理（M736，升级自 M324 简易页）
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
import { useTrainingM736Store } from '@/store/trainingM736Store';
import {
  TRAINING_STATUS_META,
  TRAINING_TYPE_META,
  type Training,
} from '@/services/api/trainingM736';

const partColumns: ColumnsType<{ name: string; dept: string }> = [
  { title: '姓名', dataIndex: 'name' },
  { title: '科室', dataIndex: 'dept' },
];

const buildColumns = (setDetail: (r: Training) => void): ColumnsType<Training> => [
  { title: '培训名称', dataIndex: 'name', ellipsis: true },
  {
    title: '培训类型',
    dataIndex: 'type',
    width: 140,
    render: (v: Training['type']) => <Tag color={TRAINING_TYPE_META[v].color}>{TRAINING_TYPE_META[v].label}</Tag>,
  },
  {
    title: '培训日期',
    dataIndex: 'trainedAt',
    width: 150,
    render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
  },
  { title: '参训人数', dataIndex: 'participantCount', width: 100, align: 'right' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: Training['status']) => <Tag color={TRAINING_STATUS_META[v].color}>{TRAINING_STATUS_META[v].label}</Tag>,
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

export default function HrTrainingPage() {
  usePageTitle('培训管理');
  const { items, loading, error, demo, load } = useTrainingM736Store();
  const [detail, setDetail] = useState<Training | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="培训管理"
      description="培训名称 / 培训类型 / 培训日期 / 参训人数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`培训计划（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="培训详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="培训名称" span={2}>{detail.name}</Descriptions.Item>
              <Descriptions.Item label="培训类型">
                <Tag color={TRAINING_TYPE_META[detail.type].color}>{TRAINING_TYPE_META[detail.type].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="培训日期">{dayjs(detail.trainedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="参训人数">{detail.participantCount}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={TRAINING_STATUS_META[detail.status].color}>{TRAINING_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="培训内容" span={2}>{detail.content}</Descriptions.Item>
              <Descriptions.Item label="考核结果" span={2}>{detail.results}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="参训人员（示例）">
              <Table rowKey="name" dataSource={detail.participants} columns={partColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
