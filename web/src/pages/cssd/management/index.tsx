/**
 * 健澜科技 jlmedaios - 消毒供应中心管理（M835）
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
import { useCssdWorkloadM835Store } from '@/store/cssdWorkloadM835Store';
import type { CssdWorkload } from '@/services/api/cssdWorkloadM835';

const processColumns: ColumnsType<{ step: string; count: number }> = [
  { title: '处理环节', dataIndex: 'step' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const batchColumns: ColumnsType<{ batchNo: string; method: string; result: string }> = [
  { title: '批次号', dataIndex: 'batchNo' },
  { title: '灭菌方式', dataIndex: 'method', width: 160 },
  { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v === '合格' ? 'green' : 'red'}>{v}</Tag> },
];

const buildColumns = (setDetail: (r: CssdWorkload) => void): ColumnsType<CssdWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '包数', dataIndex: 'packages', width: 90, align: 'right' },
  { title: '器械数', dataIndex: 'instruments', width: 100, align: 'right' },
  { title: '灭菌批次数', dataIndex: 'sterilizationBatches', width: 120, align: 'right' },
  {
    title: '不合格包数',
    dataIndex: 'unqualifiedPackages',
    width: 110,
    align: 'right',
    render: (v: number) => <Tag color={v > 0 ? 'red' : 'green'}>{v}</Tag>,
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

export default function CssdManagementM835Page() {
  usePageTitle('消毒供应中心管理');
  const { items, loading, error, demo, load } = useCssdWorkloadM835Store();
  const [detail, setDetail] = useState<CssdWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="消毒供应中心管理"
      description="日期 / 包数 / 器械数 / 灭菌批次数 / 不合格包数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`CSSD 工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="CSSD 工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="包数">{detail.packages}</Descriptions.Item>
              <Descriptions.Item label="器械数">{detail.instruments}</Descriptions.Item>
              <Descriptions.Item label="灭菌批次数">{detail.sterilizationBatches}</Descriptions.Item>
              <Descriptions.Item label="不合格包数">{detail.unqualifiedPackages}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="生物学监测记录" span={2}>{detail.biologicMonitoring}</Descriptions.Item>
              <Descriptions.Item label="追溯记录" span={2}>{detail.traceability}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="处理流程（回收/清洗/包装/灭菌/发放）" style={{ marginBottom: 16 }}>
              <Table rowKey="step" dataSource={detail.processBreakdown} columns={processColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="灭菌批次记录（压力蒸汽/环氧乙烷/低温等离子）">
              <Table rowKey="batchNo" dataSource={detail.batchRecords} columns={batchColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
