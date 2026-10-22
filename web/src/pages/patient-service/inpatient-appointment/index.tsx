/**
 * 健澜科技 jlmedaios - 住院预约管理（M720）
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
import { useInpatientAppointmentM720Store } from '@/store/inpatientAppointmentM720Store';
import {
  INPATIENT_APPT_STATUS_META,
  PRIORITY_META,
  type InpatientAppointment,
} from '@/services/api/inpatientAppointmentM720';

const buildColumns = (setDetail: (r: InpatientAppointment) => void): ColumnsType<InpatientAppointment> => [
  { title: '预约号', dataIndex: 'apptNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 120 },
  { title: '病床类型', dataIndex: 'bedType', width: 150 },
  { title: '预计入院', dataIndex: 'expectedAdmitAt', width: 120 },
  {
    title: '优先级',
    dataIndex: 'priority',
    width: 100,
    render: (v: InpatientAppointment['priority']) => <Tag color={PRIORITY_META[v].color}>{PRIORITY_META[v].label}</Tag>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: InpatientAppointment['status']) => <Tag color={INPATIENT_APPT_STATUS_META[v].color}>{INPATIENT_APPT_STATUS_META[v].label}</Tag>,
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

export default function InpatientAppointmentM720Page() {
  usePageTitle('住院预约管理');
  const { items, loading, error, demo, load } = useInpatientAppointmentM720Store();
  const [detail, setDetail] = useState<InpatientAppointment | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="住院预约管理"
      description="预约号 / 患者 / 科室 / 病床类型 / 预计入院 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`住院预约（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="住院预约详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="预约号">{detail.apptNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="目标科室">{detail.dept}</Descriptions.Item>
            <Descriptions.Item label="病床类型">{detail.bedType}</Descriptions.Item>
            <Descriptions.Item label="预计入院日期">{detail.expectedAdmitAt}</Descriptions.Item>
            <Descriptions.Item label="预约理由">{detail.reason}</Descriptions.Item>
            <Descriptions.Item label="病情摘要">{detail.summary}</Descriptions.Item>
            <Descriptions.Item label="优先级">
              <Tag color={PRIORITY_META[detail.priority].color}>{PRIORITY_META[detail.priority].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={INPATIENT_APPT_STATUS_META[detail.status].color}>{INPATIENT_APPT_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
