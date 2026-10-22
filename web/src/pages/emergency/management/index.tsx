/**
 * 健澜科技 jlmedaios - 急诊科管理（M815）
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
import { useEmergencyWorkloadM815Store } from '@/store/emergencyWorkloadM815Store';
import type { EmergencyWorkload } from '@/services/api/emergencyWorkloadM815';

const visitColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '就诊类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const triageColumns: ColumnsType<{ level: string; count: number }> = [
  { title: '分诊分级', dataIndex: 'level' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const resusColumns: ColumnsType<{ time: string; patient: string; chief: string; outcome: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '主诉', dataIndex: 'chief' },
  { title: '转归', dataIndex: 'outcome' },
];

const buildColumns = (setDetail: (r: EmergencyWorkload) => void): ColumnsType<EmergencyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '就诊数', dataIndex: 'visits', width: 100, align: 'right' },
  { title: '抢救数', dataIndex: 'resuscitation', width: 100, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '留观数', dataIndex: 'observation', width: 100, align: 'right' },
  { title: '入院数', dataIndex: 'admission', width: 100, align: 'right' },
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

export default function EmergencyManagementM815Page() {
  usePageTitle('急诊科管理');
  const { items, loading, error, demo, load } = useEmergencyWorkloadM815Store();
  const [detail, setDetail] = useState<EmergencyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="急诊科管理"
      description="日期 / 就诊数 / 抢救数 / 留观数 / 入院数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`急诊工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="急诊工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="就诊数">{detail.visits}</Descriptions.Item>
              <Descriptions.Item label="抢救数">{detail.resuscitation}</Descriptions.Item>
              <Descriptions.Item label="留观数">{detail.observation}</Descriptions.Item>
              <Descriptions.Item label="入院数">{detail.admission}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="绿色通道记录" span={2}>{detail.greenChannel}</Descriptions.Item>
              <Descriptions.Item label="平均停留时间" span={2}>{detail.los}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="就诊类型分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.visitBreakdown} columns={visitColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="分诊分级（I-V 级）" style={{ marginBottom: 16 }}>
              <Table rowKey="level" dataSource={detail.triageLevels} columns={triageColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="抢救记录">
              <Table rowKey="time" dataSource={detail.resusRecords} columns={resusColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
