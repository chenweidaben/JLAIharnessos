/**
 * 健澜科技 jlmedaios - 检验科管理（M838）
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
import { useLaboratoryWorkloadM838Store } from '@/store/laboratoryWorkloadM838Store';
import type { LaboratoryWorkload } from '@/services/api/laboratoryWorkloadM838';

const sectionColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '专业组', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const critColumns: ColumnsType<{ time: string; patient: string; item: string; action: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '危急项目', dataIndex: 'item' },
  { title: '处置', dataIndex: 'action' },
];

const buildColumns = (setDetail: (r: LaboratoryWorkload) => void): ColumnsType<LaboratoryWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '生化数', dataIndex: 'biochemistry', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '免疫数', dataIndex: 'immunology', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '微生物数', dataIndex: 'microbiology', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '分子诊断数', dataIndex: 'molecular', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function LaboratoryManagementM838Page() {
  usePageTitle('检验科管理');
  const { items, loading, error, demo, load } = useLaboratoryWorkloadM838Store();
  const [detail, setDetail] = useState<LaboratoryWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="检验科管理"
      description="日期 / 生化数 / 免疫数 / 微生物数 / 分子诊断数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`检验工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="检验工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="生化数">{detail.biochemistry}</Descriptions.Item>
              <Descriptions.Item label="免疫数">{detail.immunology}</Descriptions.Item>
              <Descriptions.Item label="微生物数">{detail.microbiology}</Descriptions.Item>
              <Descriptions.Item label="分子诊断数">{detail.molecular}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="室内质控记录" span={2}>{detail.internalQc}</Descriptions.Item>
              <Descriptions.Item label="室间质评成绩" span={2}>{detail.externalQa}</Descriptions.Item>
              <Descriptions.Item label="TAT 周转时间" span={2}>{detail.tat}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="专业组分解（临检/生化/免疫/微生物/分子）" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.sectionBreakdown} columns={sectionColumns} size="small" pagination={false} />
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
