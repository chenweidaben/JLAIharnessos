/**
 * 健澜科技 jlmedaios - 病理科管理（M871 原地升级 M836 视图）
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
import { usePathologyWorkloadM871Store } from '@/store/pathologyWorkloadM871Store';
import type { PathologyWorkloadM871 } from '@/services/api/pathologyWorkloadM871';

const categoryColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '检查项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PathologyWorkloadM871) => void): ColumnsType<PathologyWorkloadM871> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '常规病理数', dataIndex: 'routine', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '冰冻病理数', dataIndex: 'frozen', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '细胞学数', dataIndex: 'cytology', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '免疫组化数', dataIndex: 'ihc', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '分子病理数', dataIndex: 'molecular', width: 130, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function PathologyManagementM871Page() {
  usePageTitle('病理科管理');
  const { items, loading, error, demo, load } = usePathologyWorkloadM871Store();
  const [detail, setDetail] = useState<PathologyWorkloadM871 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病理科管理"
      description="日期 / 常规病理数 / 冰冻病理数 / 细胞学数 / 免疫组化数 / 分子病理数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`病理科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="病理科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="常规病理数">{detail.routine}</Descriptions.Item>
              <Descriptions.Item label="冰冻病理数">{detail.frozen}</Descriptions.Item>
              <Descriptions.Item label="细胞学数">{detail.cytology}</Descriptions.Item>
              <Descriptions.Item label="免疫组化数">{detail.ihc}</Descriptions.Item>
              <Descriptions.Item label="分子病理数">{detail.molecular}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="冰冻病理报告时间（30min）" span={2}>{detail.frozenTime}</Descriptions.Item>
              <Descriptions.Item label="术中冰冻与术后常规符合率" span={2}>{detail.concordance}</Descriptions.Item>
              <Descriptions.Item label="质控指标" span={2}>{detail.qualityMetrics}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检查项目分类（常规 HE/冰冻/细胞学/免疫组化/分子病理）">
              <Table rowKey="name" dataSource={detail.categoryBreakdown} columns={categoryColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
