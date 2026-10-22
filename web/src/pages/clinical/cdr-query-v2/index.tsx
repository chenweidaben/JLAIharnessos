/**
 * 健澜科技 jlmedaios - CDR 临床数据中心（M636，配套 M609）
 *
 * 三甲流程：患者全景 Descriptions + 通用查询表单 + 数据量统计卡片。
 * 权限码 cdr:query。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useCdrQueryV2M636Store } from '@/store/cdrQueryV2M636Store';
import type { CdrQueryRow } from '@/services/api/cdrQueryV2M636';

const ENTITY_OPTIONS = ['Patient', 'Encounter', 'Observation', 'Medication', 'Condition'].map((v) => ({
  value: v,
  label: v,
}));

export default function CdrQueryV2M636Page() {
  usePageTitle('CDR 临床数据中心');
  const { hasPermission } = usePermission();
  const canQuery = hasPermission('cdr:query');

  const { overview, queryRows, stats, loading, error, demo, loadOverview, runQuery, loadStats } =
    useCdrQueryV2M636Store();

  const [pid, setPid] = useState('P10001');
  const [entity, setEntity] = useState('Patient');

  useEffect(() => {
    void loadOverview('P10001');
    void loadStats();
    void runQuery('Patient');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: ColumnsType<CdrQueryRow> = [
    { title: 'ID', dataIndex: 'id', width: 100 },
    { title: '实体', dataIndex: 'entity', width: 140 },
    { title: '字段', dataIndex: 'key', width: 180 },
    { title: '值', dataIndex: 'value' },
    { title: '捕获时间', dataIndex: 'capturedAt', width: 160, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  ];

  return (
    <PageContainer
      title="CDR 临床数据中心（v2）"
      description="患者全景 + 通用查询 + 数据量统计"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canQuery && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 cdr:query 权限" />
      )}

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card size="small"><Statistic title="患者总数" value={stats?.patientCount ?? 0} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="就诊数" value={stats?.encounterCount ?? 0} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="观察记录" value={stats?.observationCount ?? 0} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="用药记录" value={stats?.medicationCount ?? 0} /></Card></Col>
        </Row>

        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              style={{ width: 220 }}
              addonBefore="患者"
              value={pid}
              onChange={(e) => setPid(e.target.value)}
            />
            <Button type="primary" onClick={() => void loadOverview(pid)}>
              加载全景
            </Button>
          </Space>
        </Card>

        <Card size="small" title="患者全景" style={{ marginBottom: 16 }}>
          {overview && (
            <Descriptions column={3} size="small" bordered>
              <Descriptions.Item label="姓名">{overview.name}</Descriptions.Item>
              <Descriptions.Item label="性别">{overview.gender}</Descriptions.Item>
              <Descriptions.Item label="年龄">{overview.age}</Descriptions.Item>
              <Descriptions.Item label="就诊次数">{overview.visitCount}</Descriptions.Item>
              <Descriptions.Item label="检验记录">{overview.labCount}</Descriptions.Item>
              <Descriptions.Item label="用药记录">{overview.medCount}</Descriptions.Item>
              <Descriptions.Item label="诊断数">{overview.diagnosisCount}</Descriptions.Item>
            </Descriptions>
          )}
        </Card>

        <Card size="small" title="通用查询">
          <Space style={{ marginBottom: 12 }}>
            <Select style={{ width: 220 }} value={entity} options={ENTITY_OPTIONS} onChange={setEntity} />
            <Button type="primary" onClick={() => void runQuery(entity)}>
              查询
            </Button>
          </Space>
          <Table rowKey="id" dataSource={queryRows} columns={columns} size="small" pagination={false} />
        </Card>
      </Spin>
    </PageContainer>
  );
}
