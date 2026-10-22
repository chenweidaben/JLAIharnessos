/**
 * 健澜科技 jlmedaios - 检查检验预约（M721）
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
import { useExamAppointmentM721Store } from '@/store/examAppointmentM721Store';
import {
  EXAM_STATUS_META,
  type ExamAppointment,
} from '@/services/api/examAppointmentM721';

const buildColumns = (setDetail: (r: ExamAppointment) => void): ColumnsType<ExamAppointment> => [
  { title: '预约号', dataIndex: 'apptNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '检查项目', dataIndex: 'examItem', width: 180 },
  {
    title: '检查时间',
    dataIndex: 'examAt',
    width: 150,
    render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
  },
  { title: '检查地点', dataIndex: 'location', width: 200, ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: ExamAppointment['status']) => <Tag color={EXAM_STATUS_META[v].color}>{EXAM_STATUS_META[v].label}</Tag>,
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

export default function ExamAppointmentM721Page() {
  usePageTitle('检查检验预约');
  const { items, loading, error, demo, load } = useExamAppointmentM721Store();
  const [detail, setDetail] = useState<ExamAppointment | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="检查检验预约"
      description="预约号 / 患者 / 检查项目 / 检查时间 / 地点 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`检查预约（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="检查预约详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="预约号">{detail.apptNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="检查项目">{detail.examItem}</Descriptions.Item>
            <Descriptions.Item label="检查时间">{dayjs(detail.examAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="检查地点">{detail.location}</Descriptions.Item>
            <Descriptions.Item label="检查科室">{detail.dept}</Descriptions.Item>
            <Descriptions.Item label="检查要求">{detail.requirement}</Descriptions.Item>
            <Descriptions.Item label="注意事项">{detail.notes}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={EXAM_STATUS_META[detail.status].color}>{EXAM_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
