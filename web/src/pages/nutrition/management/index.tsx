/**
 * 健澜科技 jlmedaios - 营养科管理（M833）
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
import { useNutritionWorkloadM833Store } from '@/store/nutritionWorkloadM833Store';
import type { NutritionWorkload } from '@/services/api/nutritionWorkloadM833';

const toolColumns: ColumnsType<{ tool: string; count: number }> = [
  { title: '评估工具', dataIndex: 'tool' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const consultColumns: ColumnsType<{ patient: string; dept: string; reason: string }> = [
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 120 },
  { title: '会诊原因', dataIndex: 'reason' },
];

const monitorColumns: ColumnsType<{ item: string; value: string }> = [
  { title: '监测指标', dataIndex: 'item' },
  { title: '结果', dataIndex: 'value' },
];

const buildColumns = (setDetail: (r: NutritionWorkload) => void): ColumnsType<NutritionWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '营养评估数', dataIndex: 'assessments', width: 110, align: 'right' },
  { title: '营养会诊数', dataIndex: 'consultations', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '肠内营养数', dataIndex: 'enteral', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '肠外营养数', dataIndex: 'parenteral', width: 110, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function NutritionManagementM833Page() {
  usePageTitle('营养科管理');
  const { items, loading, error, demo, load } = useNutritionWorkloadM833Store();
  const [detail, setDetail] = useState<NutritionWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="营养科管理"
      description="日期 / 营养评估数 / 营养会诊数 / 肠内营养数 / 肠外营养数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`营养工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="营养工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="评估数">{detail.assessments}</Descriptions.Item>
              <Descriptions.Item label="会诊数">{detail.consultations}</Descriptions.Item>
              <Descriptions.Item label="肠内营养数">{detail.enteral}</Descriptions.Item>
              <Descriptions.Item label="肠外营养数">{detail.parenteral}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="营养处方" span={2}>{detail.prescriptions}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="评估类型分解（NRS2002/PG-SGA/MNA）" style={{ marginBottom: 16 }}>
              <Table rowKey="tool" dataSource={detail.assessmentBreakdown} columns={toolColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="会诊记录" style={{ marginBottom: 16 }}>
              <Table rowKey="patient" dataSource={detail.consultRecords} columns={consultColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="监测指标（白蛋白/前白蛋白/体重变化）">
              <Table rowKey="item" dataSource={detail.monitoring} columns={monitorColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
