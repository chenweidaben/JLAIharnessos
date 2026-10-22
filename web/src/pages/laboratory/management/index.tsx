/**
 * 健澜科技 jlmedaios - 检验科管理（M868 原地升级 M838 视图）
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
import { useLaboratoryWorkloadM868Store } from '@/store/laboratoryWorkloadM868Store';
import type { LaboratoryWorkloadM868 } from '@/services/api/laboratoryWorkloadM868';

const categoryColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '检验项目分类', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: LaboratoryWorkloadM868) => void): ColumnsType<LaboratoryWorkloadM868> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '常规检验数', dataIndex: 'routine', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '生化检验数', dataIndex: 'biochemistry', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '免疫检验数', dataIndex: 'immunology', width: 130, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '微生物检验数', dataIndex: 'microbiology', width: 140, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function LaboratoryManagementM868Page() {
  usePageTitle('检验科管理');
  const { items, loading, error, demo, load } = useLaboratoryWorkloadM868Store();
  const [detail, setDetail] = useState<LaboratoryWorkloadM868 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="检验科管理"
      description="日期 / 常规检验数 / 生化检验数 / 免疫检验数 / 微生物检验数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`检验科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="检验科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="常规检验数">{detail.routine}</Descriptions.Item>
              <Descriptions.Item label="生化检验数">{detail.biochemistry}</Descriptions.Item>
              <Descriptions.Item label="免疫检验数">{detail.immunology}</Descriptions.Item>
              <Descriptions.Item label="微生物检验数">{detail.microbiology}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="急诊检验报告时间（急诊 30min/常规 2h）" span={2}>{detail.statReportTime}</Descriptions.Item>
              <Descriptions.Item label="室内质控（Levey-Jennings）" span={2}>{detail.internalQc}</Descriptions.Item>
              <Descriptions.Item label="室间质评成绩" span={2}>{detail.externalQa}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检验项目分类（临检/生化/免疫/微生物/分子）">
              <Table rowKey="name" dataSource={detail.categoryBreakdown} columns={categoryColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
