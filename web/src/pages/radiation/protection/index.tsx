/**
 * 健澜科技 jlmedaios - 放射防护管理（M909）
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
import { useRadiationProtectionWorkloadM909Store } from '@/store/radiationProtectionWorkloadM909Store';
import type { RadiationProtectionWorkload } from '@/services/api/radiationProtectionWorkloadM909';

const deviceColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '放射设备', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: RadiationProtectionWorkload) => void): ColumnsType<RadiationProtectionWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '放射设备数', dataIndex: 'devices', width: 120, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '个人剂量监测人数', dataIndex: 'doseMonitored', width: 170, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '环境辐射监测次数', dataIndex: 'envMonitoring', width: 170, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  {
    title: '放射事故数',
    dataIndex: 'accidents',
    width: 130,
    align: 'right',
    render: (v: number) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag>,
  },
  {
    title: '防护用品完好率(%)',
    dataIndex: 'protectionGoodRate',
    width: 190,
    align: 'right',
    render: (v: number) => <Tag color={v >= 99 ? 'green' : 'orange'}>{v}%</Tag>,
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

export default function RadiationProtectionM909Page() {
  usePageTitle('放射防护管理');
  const { items, loading, error, demo, load } = useRadiationProtectionWorkloadM909Store();
  const [detail, setDetail] = useState<RadiationProtectionWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="放射防护管理"
      description="日期 / 放射设备 / 个人剂量 / 环境监测 / 事故 / 防护完好率 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`放射防护工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1700 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="放射防护工作详情"
        width={920}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="放射设备数">{detail.devices}</Descriptions.Item>
              <Descriptions.Item label="个人剂量监测人数">{detail.doseMonitored}</Descriptions.Item>
              <Descriptions.Item label="环境辐射监测次数">{detail.envMonitoring}</Descriptions.Item>
              <Descriptions.Item label="放射事故数">{detail.accidents}</Descriptions.Item>
              <Descriptions.Item label="防护用品完好率">{detail.protectionGoodRate}%</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="个人剂量监测结果" span={2}>{detail.doseResult}</Descriptions.Item>
              <Descriptions.Item label="环境辐射监测（机房/周边）" span={2}>{detail.envResult}</Descriptions.Item>
              <Descriptions.Item label="放射工作人员健康监护" span={2}>{detail.healthMonitoring}</Descriptions.Item>
              <Descriptions.Item label="防护用品（铅衣/铅围脖/铅眼镜）" span={2}>{detail.protectionGear}</Descriptions.Item>
              <Descriptions.Item label="放射事故应急" span={2}>{detail.emergency}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="放射设备（CT/DR/DSA/介入）">
              <Table rowKey="name" dataSource={detail.deviceBreakdown} columns={deviceColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
