/**
 * 健澜科技 jlmedaios - 儿科管理（M850 原地升级 M820 视图）
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
import { usePediatricsWorkloadM850Store } from '@/store/pediatricsWorkloadM850Store';
import type { PediatricsWorkloadM850 } from '@/services/api/pediatricsWorkloadM850';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PediatricsWorkloadM850) => void): ColumnsType<PediatricsWorkloadM850> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '住院数', dataIndex: 'inpatient', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '发热门诊数', dataIndex: 'feverClinic', width: 120, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '新生儿数', dataIndex: 'newborn', width: 100, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
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

export default function PediatricsManagementM850Page() {
  usePageTitle('儿科管理');
  const { items, loading, error, demo, load } = usePediatricsWorkloadM850Store();
  const [detail, setDetail] = useState<PediatricsWorkloadM850 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="儿科管理"
      description="日期 / 门诊数 / 住院数 / 发热门诊数 / 新生儿数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`儿科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="儿科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="住院数">{detail.inpatient}</Descriptions.Item>
              <Descriptions.Item label="发热门诊数">{detail.feverClinic}</Descriptions.Item>
              <Descriptions.Item label="新生儿数">{detail.newborn}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="疫苗接种记录" span={2}>{detail.vaccination}</Descriptions.Item>
              <Descriptions.Item label="生长发育监测" span={2}>{detail.growthMonitoring}</Descriptions.Item>
              <Descriptions.Item label="儿科手术记录" span={2}>{detail.surgeries}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病谱分解（呼吸道/消化道/感染）">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
