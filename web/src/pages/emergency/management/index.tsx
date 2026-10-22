/**
 * 健澜科技 jlmedaios - 急诊科管理（M845 原地升级 M815 视图）
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
import { useEmergencyWorkloadM845Store } from '@/store/emergencyWorkloadM845Store';
import type { EmergencyWorkloadM845 } from '@/services/api/emergencyWorkloadM845';

const triageColumns: ColumnsType<{ level: string; count: number; color: string }> = [
  { title: '分诊分级', dataIndex: 'level' },
  { title: '数量', dataIndex: 'count', align: 'right', render: (v: number, r) => <Tag color={r.color}>{v}</Tag> },
];

const greenColumns: ColumnsType<{ type: string; count: number }> = [
  { title: '绿色通道', dataIndex: 'type' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const critColumns: ColumnsType<{ time: string; patient: string; item: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '危急值项目', dataIndex: 'item' },
];

const buildColumns = (setDetail: (r: EmergencyWorkloadM845) => void): ColumnsType<EmergencyWorkloadM845> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '急诊人次', dataIndex: 'visits', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '抢救数', dataIndex: 'rescue', width: 100, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '留观数', dataIndex: 'observation', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '输液数', dataIndex: 'infusion', width: 100, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
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

export default function EmergencyManagementM845Page() {
  usePageTitle('急诊科管理');
  const { items, loading, error, demo, load } = useEmergencyWorkloadM845Store();
  const [detail, setDetail] = useState<EmergencyWorkloadM845 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="急诊科管理"
      description="日期 / 急诊人次 / 抢救数 / 留观数 / 输液数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`急诊工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
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
              <Descriptions.Item label="急诊人次">{detail.visits}</Descriptions.Item>
              <Descriptions.Item label="抢救数">{detail.rescue}</Descriptions.Item>
              <Descriptions.Item label="留观数">{detail.observation}</Descriptions.Item>
              <Descriptions.Item label="输液数">{detail.infusion}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="抢救记录" span={2}>{detail.rescueRecords}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="分诊分级（I 红 / II 橙 / III 黄 / IV 绿）" style={{ marginBottom: 16 }}>
              <Table rowKey="level" dataSource={detail.triageBreakdown} columns={triageColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="绿色通道（卒中/胸痛/创伤）" style={{ marginBottom: 16 }}>
              <Table rowKey="type" dataSource={detail.greenChannel} columns={greenColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="危急值记录">
              <Table rowKey="time" dataSource={detail.criticalValues} columns={critColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
