/**
 * 健澜科技 jlmedaios - 健康教育管理（M753）
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
import { useHealthEducationM753Store } from '@/store/healthEducationM753Store';
import {
  EDU_STATUS_META,
  type HealthEducation,
} from '@/services/api/healthEducationM753';

const signinColumns: ColumnsType<{ name: string; dept: string }> = [
  { title: '姓名', dataIndex: 'name', width: 140 },
  { title: '床号/单位', dataIndex: 'dept' },
];

const buildColumns = (setDetail: (r: HealthEducation) => void): ColumnsType<HealthEducation> => [
  { title: '教育主题', dataIndex: 'topic', ellipsis: true },
  { title: '教育方式', dataIndex: 'method', width: 130 },
  { title: '教育科室', dataIndex: 'dept', width: 130 },
  {
    title: '教育时间',
    dataIndex: 'heldAt',
    width: 150,
    render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
  },
  { title: '受众人数', dataIndex: 'audienceCount', width: 100, align: 'right' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: HealthEducation['status']) => <Tag color={EDU_STATUS_META[v].color}>{EDU_STATUS_META[v].label}</Tag>,
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

export default function HealthEducationM753Page() {
  usePageTitle('健康教育管理');
  const { items, loading, error, demo, load } = useHealthEducationM753Store();
  const [detail, setDetail] = useState<HealthEducation | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="健康教育管理"
      description="教育主题 / 教育方式 / 教育科室 / 教育时间 / 受众人数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`健康教育（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="健康教育详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="教育主题" span={2}>{detail.topic}</Descriptions.Item>
              <Descriptions.Item label="教育方式">{detail.method}</Descriptions.Item>
              <Descriptions.Item label="教育科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="教育时间">{dayjs(detail.heldAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="受众人数">{detail.audienceCount}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={EDU_STATUS_META[detail.status].color}>{EDU_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="教育内容" span={2}>{detail.content}</Descriptions.Item>
              <Descriptions.Item label="教育材料" span={2}>{detail.materials}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="签到记录（示例）">
              <Table rowKey="name" dataSource={detail.signIns} columns={signinColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
