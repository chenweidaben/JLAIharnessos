/**
 * 健澜科技 jlmedaios - CSSD 管理（M879 原地升级 M835 视图）
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
import { useCssdWorkloadM879Store } from '@/store/cssdWorkloadM879Store';
import type { CssdWorkloadM879 } from '@/services/api/cssdWorkloadM879';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: CssdWorkloadM879) => void): ColumnsType<CssdWorkloadM879> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '回收包数', dataIndex: 'received', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '清洗包数', dataIndex: 'cleaned', width: 110, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '包装包数', dataIndex: 'packed', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '灭菌包数', dataIndex: 'sterilized', width: 110, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '发放包数', dataIndex: 'distributed', width: 110, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function CssdManagementM879Page() {
  usePageTitle('消毒供应中心（CSSD）管理');
  const { items, loading, error, demo, load } = useCssdWorkloadM879Store();
  const [detail, setDetail] = useState<CssdWorkloadM879 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="消毒供应中心（CSSD）管理"
      description="日期 / 回收 / 清洗 / 包装 / 灭菌 / 发放包数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`CSSD 工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="CSSD 工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="回收包数">{detail.received}</Descriptions.Item>
              <Descriptions.Item label="清洗包数">{detail.cleaned}</Descriptions.Item>
              <Descriptions.Item label="包装包数">{detail.packed}</Descriptions.Item>
              <Descriptions.Item label="灭菌包数">{detail.sterilized}</Descriptions.Item>
              <Descriptions.Item label="发放包数">{detail.distributed}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="生物监测（BI 阴性合格）" span={2}>{detail.biologicMonitoring}</Descriptions.Item>
              <Descriptions.Item label="追溯记录" span={2}>{detail.traceability}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="器械分类（手术/内镜/牙科/换药碗）">
                <Table rowKey="name" dataSource={detail.categoryBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="灭菌方式（压力蒸汽/EO/低温等离子）">
                <Table rowKey="name" dataSource={detail.sterilizationBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
