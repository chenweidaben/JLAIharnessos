/**
 * 健澜科技 jlmedaios - 核医学科管理（M810）
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
import { useNuclearMedicineWorkloadM810Store } from '@/store/nuclearMedicineWorkloadM810Store';
import type { NuclearMedicineWorkload } from '@/services/api/nuclearMedicineWorkloadM810';

const itemColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '检查项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const drugColumns: ColumnsType<{ drug: string; activity: string; studies: number }> = [
  { title: '放射性药物', dataIndex: 'drug' },
  { title: '单次活度', dataIndex: 'activity' },
  { title: '使用例数', dataIndex: 'studies', align: 'right' },
];

const buildColumns = (setDetail: (r: NuclearMedicineWorkload) => void): ColumnsType<NuclearMedicineWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '检查项目', dataIndex: 'examItem', width: 120 },
  { title: '检查数', dataIndex: 'studies', width: 100, align: 'right' },
  { title: '放射性药物', dataIndex: 'radiopharmaceutical', width: 240, ellipsis: true },
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

export default function NuclearMedicineManagementM810Page() {
  usePageTitle('核医学科管理');
  const { items, loading, error, demo, load } = useNuclearMedicineWorkloadM810Store();
  const [detail, setDetail] = useState<NuclearMedicineWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="核医学科管理"
      description="日期 / 检查项目 / 检查数 / 放射性药物 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`核医学工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="核医学工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="检查项目">{detail.examItem}</Descriptions.Item>
              <Descriptions.Item label="检查数">{detail.studies}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="放射性药物" span={2}>{detail.radiopharmaceutical}</Descriptions.Item>
              <Descriptions.Item label="辐射安全记录" span={2}>{detail.radiationSafety}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检查项目分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.itemBreakdown} columns={itemColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="放射性药物使用记录">
              <Table rowKey="drug" dataSource={detail.drugUsage} columns={drugColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
