/**
 * 健澜科技 jlmedaios - 字典映射（M656，配套 M583）
 *
 * 三甲流程：映射 Table（本地编码/标准编码/类型 badge/置信度）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Card, Progress, Space, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useDictionaryMappingM656Store } from '@/store/dictionaryMappingM656Store';
import {
  MAPPING_TYPE_META,
  type DictMapping,
} from '@/services/api/dictionaryMappingM656';

const columns: ColumnsType<DictMapping> = [
  { title: '映射号', dataIndex: 'id', width: 100 },
  { title: '本地编码', dataIndex: 'localCode', width: 140 },
  { title: '本地名称', dataIndex: 'localName', width: 200 },
  { title: '标准编码', dataIndex: 'standardCode', width: 160 },
  { title: '标准名称', dataIndex: 'standardName', ellipsis: true },
  {
    title: '映射类型',
    dataIndex: 'mappingType',
    width: 130,
    render: (v: DictMapping['mappingType']) => (
      <Tag color={MAPPING_TYPE_META[v].color}>{MAPPING_TYPE_META[v].label}</Tag>
    ),
  },
  {
    title: '置信度',
    dataIndex: 'confidence',
    width: 160,
    sorter: (a, b) => a.confidence - b.confidence,
    render: (v: number) => (
      <Progress
        percent={Math.round(v * 100)}
        size="small"
        strokeColor={v >= 0.95 ? '#3f8600' : v >= 0.8 ? '#faad14' : '#cf1322'}
      />
    ),
  },
];

export default function DictionaryMappingPage() {
  usePageTitle('字典映射');

  const { items, loading, error, demo, load } = useDictionaryMappingM656Store();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="字典映射"
      description="本地编码 → 标准编码（ICD-10 / LOINC / SNOMED / ATC）"
      extra={
        <Space>
          <Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>
        </Space>
      }
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`映射条目（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
        </Spin>
      </Card>
    </PageContainer>
  );
}
