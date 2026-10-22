/**
 * 健澜科技 jlmedaios - 教学管理（M738）
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
import { useTeachingM738Store } from '@/store/teachingM738Store';
import {
  TEACHING_STATUS_META,
  type TeachingPlan,
} from '@/services/api/teachingPlanM738';

const stuColumns: ColumnsType<{ name: string; source: string }> = [
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '来源', dataIndex: 'source' },
];

const buildColumns = (setDetail: (r: TeachingPlan) => void): ColumnsType<TeachingPlan> => [
  { title: '课程名称', dataIndex: 'course', ellipsis: true },
  { title: '授课教师', dataIndex: 'teacher', width: 160 },
  { title: '科室', dataIndex: 'dept', width: 130 },
  {
    title: '授课时间',
    dataIndex: 'taughtAt',
    width: 150,
    render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
  },
  { title: '学员人数', dataIndex: 'studentCount', width: 100, align: 'right' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: TeachingPlan['status']) => <Tag color={TEACHING_STATUS_META[v].color}>{TEACHING_STATUS_META[v].label}</Tag>,
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

export default function TeachingM738Page() {
  usePageTitle('教学管理');
  const { items, loading, error, demo, load } = useTeachingM738Store();
  const [detail, setDetail] = useState<TeachingPlan | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="教学管理"
      description="课程名称 / 授课教师 / 科室 / 授课时间 / 学员人数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`教学计划（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="教学计划详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="课程名称" span={2}>{detail.course}</Descriptions.Item>
              <Descriptions.Item label="授课教师">{detail.teacher}</Descriptions.Item>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="授课时间">{dayjs(detail.taughtAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="学员人数">{detail.studentCount}</Descriptions.Item>
              <Descriptions.Item label="课程大纲" span={2}>{detail.outline}</Descriptions.Item>
              <Descriptions.Item label="考核记录" span={2}>{detail.assessments}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="学员名单（示例）">
              <Table rowKey="name" dataSource={detail.students} columns={stuColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
