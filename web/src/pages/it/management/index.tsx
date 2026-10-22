/**
 * 健澜科技 jlmedaios - 信息科管理（M897）
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
import { useItWorkloadM897Store } from '@/store/itWorkloadM897Store';
import type { ItWorkload } from '@/services/api/itWorkloadM897';

const availColumns: ColumnsType<{ name: string; availability: number }> = [
  { title: '核心系统', dataIndex: 'name' },
  { title: '可用率(%)', dataIndex: 'availability', align: 'right', render: (v: number) => <Tag color={v >= 99.9 ? 'green' : 'orange'}>{v}%</Tag> },
];

const ticketColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '工单分类', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: ItWorkload) => void): ColumnsType<ItWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  {
    title: '系统可用率(%)',
    dataIndex: 'systemAvailability',
    width: 150,
    align: 'right',
    render: (v: number) => <Tag color={v >= 99.9 ? 'green' : 'orange'}>{v}%</Tag>,
  },
  { title: '故障工单数', dataIndex: 'tickets', width: 120, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: 'IT 支持人次', dataIndex: 'supportVisits', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  {
    title: '网络安全事件',
    dataIndex: 'securityIncidents',
    width: 140,
    align: 'right',
    render: (v: number) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag>,
  },
  { title: '数据备份次数', dataIndex: 'backups', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function ItManagementM897Page() {
  usePageTitle('信息科管理');
  const { items, loading, error, demo, load } = useItWorkloadM897Store();
  const [detail, setDetail] = useState<ItWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="信息科管理"
      description="日期 / 系统可用率 / 故障工单 / IT 支持 / 网络安全事件 / 数据备份 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`信息科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1600 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="信息科工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="系统可用率">{detail.systemAvailability}%</Descriptions.Item>
              <Descriptions.Item label="故障工单数">{detail.tickets}</Descriptions.Item>
              <Descriptions.Item label="IT 支持人次">{detail.supportVisits}</Descriptions.Item>
              <Descriptions.Item label="网络安全事件">{detail.securityIncidents}</Descriptions.Item>
              <Descriptions.Item label="数据备份次数">{detail.backups}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="网络安全（漏洞/等保/渗透）" span={2}>{detail.security}</Descriptions.Item>
              <Descriptions.Item label="数据备份（全量/增量/异地容灾）" span={2}>{detail.backup}</Descriptions.Item>
              <Descriptions.Item label="用户支持记录" span={2}>{detail.userSupport}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="核心系统可用率（HIS/EMR/LIS/PACS）">
                <Table rowKey="name" dataSource={detail.systemBreakdown} columns={availColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="故障工单分类（硬件/软件/网络/权限）">
                <Table rowKey="name" dataSource={detail.ticketBreakdown} columns={ticketColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
