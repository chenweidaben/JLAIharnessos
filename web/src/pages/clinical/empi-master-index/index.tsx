/**
 * 健澜科技 jlmedaios - EMPI 患者主索引（M655，配套 M582）
 *
 * 三甲流程：主索引 Table（姓名/性别/年龄/多院号合并状态）+ 展开查看各院 MRN。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Card, Space, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useEmpiMasterIndexM655Store } from '@/store/empiMasterIndexM655Store';
import {
  MERGE_STATUS_META,
  type EmpiPatient,
} from '@/services/api/empiMasterIndexM655';

const columns: ColumnsType<EmpiPatient> = [
  { title: 'EMPI ID', dataIndex: 'empiId', width: 140 },
  { title: '姓名', dataIndex: 'name', width: 110 },
  { title: '性别', dataIndex: 'gender', width: 70, render: (v: EmpiPatient['gender']) => (v === 'M' ? '男' : '女') },
  { title: '年龄', dataIndex: 'age', width: 70 },
  { title: '身份证（脱敏）', dataIndex: 'idCard', width: 200 },
  {
    title: '院内 MRN 合并',
    dataIndex: 'mrnList',
    render: (mrns: EmpiPatient['mrnList']) => (
      <Space size={[4, 4]} wrap>
        {mrns.map((m) => (
          <Tag key={m.mrn} color="blue">
            {m.hospital}: {m.mrn}
          </Tag>
        ))}
      </Space>
    ),
  },
  {
    title: '合并状态',
    dataIndex: 'mergeStatus',
    width: 120,
    render: (v: EmpiPatient['mergeStatus']) => (
      <Tag color={MERGE_STATUS_META[v].color}>{MERGE_STATUS_META[v].label}</Tag>
    ),
  },
];

export default function EmpiMasterIndexPage() {
  usePageTitle('EMPI 患者主索引');

  const { items, loading, error, demo, load } = useEmpiMasterIndexM655Store();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="EMPI 患者主索引"
      description="跨院患者主索引 / 多院 MRN 合并"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`主索引（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="empiId" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1000 }} />
        </Spin>
      </Card>
    </PageContainer>
  );
}
