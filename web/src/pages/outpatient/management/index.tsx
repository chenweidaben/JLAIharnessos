/**
 * 健澜科技 jlmedaios - 门诊管理（M875）
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
import { useOutpatientWorkloadM875Store } from '@/store/outpatientWorkloadM875Store';
import type { OutpatientWorkload } from '@/services/api/outpatientWorkloadM875';

const deptColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '科室', dataIndex: 'name' },
  { title: '门诊量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: OutpatientWorkload) => void): ColumnsType<OutpatientWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊人次', dataIndex: 'visits', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '急诊人次', dataIndex: 'emergencyVisits', width: 110, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '专家门诊数', dataIndex: 'expertClinic', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '普通门诊数', dataIndex: 'generalClinic', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  {
    title: '预约率(%)',
    dataIndex: 'appointmentRate',
    width: 110,
    align: 'right',
    render: (v: number) => <Tag color={v >= 80 ? 'green' : 'orange'}>{v}%</Tag>,
  },
  { title: '状态', dataIndex: 'status', width: 110 },
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

export default function OutpatientManagementM875Page() {
  usePageTitle('门诊管理');
  const { items, loading, error, demo, load } = useOutpatientWorkloadM875Store();
  const [detail, setDetail] = useState<OutpatientWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="门诊管理"
      description="日期 / 门诊人次 / 急诊人次 / 专家门诊数 / 普通门诊数 / 预约率 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`门诊工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="门诊工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊人次">{detail.visits}</Descriptions.Item>
              <Descriptions.Item label="急诊人次">{detail.emergencyVisits}</Descriptions.Item>
              <Descriptions.Item label="专家门诊数">{detail.expertClinic}</Descriptions.Item>
              <Descriptions.Item label="普通门诊数">{detail.generalClinic}</Descriptions.Item>
              <Descriptions.Item label="预约率">{detail.appointmentRate}%</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="预约率（分时段）" span={2}>{detail.appointment}</Descriptions.Item>
              <Descriptions.Item label="候诊时间" span={2}>{detail.waitTime}</Descriptions.Item>
              <Descriptions.Item label="复诊率" span={2}>{detail.revisitRate}</Descriptions.Item>
              <Descriptions.Item label="门诊手术量" span={2}>{detail.minorSurgery}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="科室门诊量分布（内/外/妇/儿/五官）">
              <Table rowKey="name" dataSource={detail.deptBreakdown} columns={deptColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
