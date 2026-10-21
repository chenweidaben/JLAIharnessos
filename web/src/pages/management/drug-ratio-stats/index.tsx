/**
 * 健澜科技 jlmedaios - 药占比/耗占比（M627，P13 管理驾驶舱）
 *
 * 三甲流程：三项占比 Progress 堆叠（药占比/耗占比/检查检验占比）
 * + 科室药占比排名 Table + 月度趋势。权限码 stats:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useDrugRatioStatsM627Store } from '@/store/drugRatioStatsM627Store';

interface DeptRow {
  deptCode: string;
  deptName: string;
  drugRatioPct: number;
}

export default function DrugRatioStatsM627Page() {
  usePageTitle('药占比/耗占比');
  const { hasPermission } = usePermission();
  const canView = hasPermission('stats:view');

  const { stats, loading, error, demo, load } = useDrugRatioStatsM627Store();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<DeptRow> = [
    { title: '科室编码', dataIndex: 'deptCode', width: 130 },
    { title: '科室', dataIndex: 'deptName', width: 140 },
    {
      title: '药占比（%）',
      dataIndex: 'drugRatioPct',
      width: 260,
      sorter: (a, b) => a.drugRatioPct - b.drugRatioPct,
      defaultSortOrder: 'descend',
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v >= 40 ? '#cf1322' : v >= 35 ? '#faad14' : '#3f8600'}
          format={() => v.toFixed(1)}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="药占比 / 耗占比"
      description="药占比、耗占比、检查检验占比 + 科室排名 + 月度趋势"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 stats:view 权限" />
      )}

      <Spin spinning={loading}>
        <Card size="small" title="全院三项占比（%）" style={{ marginBottom: 16 }}>
          <Progress percent={stats?.drugRatioPct ?? 0} size="small" strokeColor="#1677ff" format={(p) => `药占比 ${p?.toFixed(1)}%`} />
          <Progress percent={stats?.consumableRatioPct ?? 0} size="small" strokeColor="#faad14" format={(p) => `耗占比 ${p?.toFixed(1)}%`} />
          <Progress percent={stats?.examRatioPct ?? 0} size="small" strokeColor="#52c41a" format={(p) => `检查检验 ${p?.toFixed(1)}%`} />
        </Card>

        <Row gutter={16}>
          <Col span={14}>
            <Card size="small" title="科室药占比排名">
              <Table rowKey="deptCode" dataSource={stats?.deptRank ?? []} columns={columns} size="small" pagination={false} />
            </Card>
          </Col>
          <Col span={10}>
            <Card size="small" title="药占比月度趋势">
              {(stats?.trend ?? []).map((t) => (
                <div key={t.month} style={{ marginBottom: 10 }}>
                  <span style={{ marginRight: 8, fontSize: 12 }}>
                    {t.month}（{t.drugRatioPct.toFixed(1)}%）
                  </span>
                  <Progress percent={t.drugRatioPct} size="small" showInfo={false} />
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
}
