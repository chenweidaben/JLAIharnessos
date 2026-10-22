/**
 * 健澜科技 jlmedaios - 心电生理检查管理（M837）
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
import { useCardiologyDiagnosticWorkloadM837Store } from '@/store/cardiologyDiagnosticWorkloadM837Store';
import type { CardiologyDiagnosticWorkload } from '@/services/api/cardiologyDiagnosticWorkloadM837';

const typeColumns: ColumnsType<{ name: string; count: number; abnormal: number }> = [
  { title: '检查类型', dataIndex: 'name' },
  { title: '检查数', dataIndex: 'count', align: 'right' },
  { title: '异常数', dataIndex: 'abnormal', align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
];

const critColumns: ColumnsType<{ time: string; patient: string; finding: string; action: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '危急心电图', dataIndex: 'finding' },
  { title: '处置', dataIndex: 'action' },
];

const buildColumns = (setDetail: (r: CardiologyDiagnosticWorkload) => void): ColumnsType<CardiologyDiagnosticWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '心电图数', dataIndex: 'ecg', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '动态心电图数', dataIndex: 'holter', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '动态血压数', dataIndex: 'abpm', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '运动平板数', dataIndex: 'treadmill', width: 110, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function CardiologyDiagnosticManagementM837Page() {
  usePageTitle('心电生理检查管理');
  const { items, loading, error, demo, load } = useCardiologyDiagnosticWorkloadM837Store();
  const [detail, setDetail] = useState<CardiologyDiagnosticWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="心电生理检查管理"
      description="日期 / 心电图数 / 动态心电图数 / 动态血压数 / 运动平板数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`心电网工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="心电网工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="心电图数">{detail.ecg}</Descriptions.Item>
              <Descriptions.Item label="动态心电图数">{detail.holter}</Descriptions.Item>
              <Descriptions.Item label="动态血压数">{detail.abpm}</Descriptions.Item>
              <Descriptions.Item label="运动平板数">{detail.treadmill}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="心电图诊断（窦速/房颤/ST-T 改变）" span={2}>{detail.ecgDiagnosis}</Descriptions.Item>
              <Descriptions.Item label="动态心电图结果（早搏/房颤负荷）" span={2}>{detail.holterResult}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检查类型分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="危急值报告">
              <Table rowKey="time" dataSource={detail.criticalReports} columns={critColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
