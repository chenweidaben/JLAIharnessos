/**
 * 健澜科技 jlmedaios - 医保基金监管（M771）
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
import { useFundCaseM771Store } from '@/store/fundCaseM771Store';
import {
  FUND_CASE_STATUS_META,
  type FundCase,
} from '@/services/api/fundCaseM771';

const buildColumns = (setDetail: (r: FundCase) => void): ColumnsType<FundCase> => [
  { title: '案件编号', dataIndex: 'caseNo', width: 140 },
  { title: '案件类型', dataIndex: 'type', width: 140 },
  { title: '涉及金额', dataIndex: 'amount', width: 130, align: 'right', render: (v: number) => <Tag color="red">¥{v.toLocaleString()}</Tag> },
  {
    title: '检查状态',
    dataIndex: 'status',
    width: 140,
    render: (v: FundCase['status']) => <Tag color={FUND_CASE_STATUS_META[v].color}>{FUND_CASE_STATUS_META[v].label}</Tag>,
  },
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

export default function FundSupervisionM771Page() {
  usePageTitle('医保基金监管');
  const { items, loading, error, demo, load } = useFundCaseM771Store();
  const [detail, setDetail] = useState<FundCase | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医保基金监管"
      description="案件编号 / 案件类型 / 涉及金额 / 检查状态 / 处理结果"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`监管案件（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="监管案件详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="案件编号">{detail.caseNo}</Descriptions.Item>
              <Descriptions.Item label="案件类型">{detail.type}</Descriptions.Item>
              <Descriptions.Item label="涉及金额">¥{detail.amount.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={FUND_CASE_STATUS_META[detail.status].color}>{FUND_CASE_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="案件经过" span={2}>{detail.process}</Descriptions.Item>
              <Descriptions.Item label="检查发现" span={2}>{detail.findings}</Descriptions.Item>
              <Descriptions.Item label="处理决定" span={2}>{detail.decision}</Descriptions.Item>
              <Descriptions.Item label="整改情况" span={2}>{detail.rectification}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
