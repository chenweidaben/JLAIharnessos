/**
 * 健澜科技 jlmedaios - 药房调剂发药工作站（M2-A）
 *
 * 真实 BFF，去 mock。药师完整闭环：待审方 → 审方 → 待发药 → FEFO 调剂发药
 * （真实扣库存 + 流水 + 发药记录 + CDS 拦截/override 留痕）。
 *
 * 异常边界：
 *  - 健康探活门禁：启动先 checkHealth，连不上 BFF/数据库 → 显式 Alert + antd Watermark，
 *    不展示任何假数据，写操作被 store 门禁拒绝；
 *  - 错误以页面顶部 Alert + antd message 呈现，不静默；
 *  - AI 仅辅助，临床写操作由药师/医师本人签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Watermark,
  message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import { DispenseModal } from '@/components/pharmacy/DispenseModal';
import { ReviewModal } from '@/components/pharmacy/ReviewModal';
import { usePharmacyStore } from '@/store/pharmacyStore';
import type {
  DispensingDto,
  InventoryDto,
  InventoryMovementDto,
  PharmacyQueueItem,
} from '@/types/pharmacy';

function formatTime(v: string | null): string {
  if (!v) return '-';
  return new Date(v).toLocaleString('zh-CN', { hour12: false });
}

export default function PharmacyWorkbench() {
  const {
    health, dbUp, healthChecking,
    dispenseQueue, reviewQueue, inventory, movements, dispensings,
    loading, error,
    checkHealth, loadDispenseQueue, loadReviewQueue,
    loadInventory, loadMovements, loadDispensings, clearError,
  } = usePharmacyStore();

  const [dispenseTarget, setDispenseTarget] = useState<PharmacyQueueItem | null>(null);
  const [reviewTarget, setReviewTarget] = useState<PharmacyQueueItem | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const refresh = useCallback(
    async (up: boolean) => {
      if (!up) return;
      await Promise.all([
        loadDispenseQueue(),
        loadReviewQueue(),
        loadInventory(),
        loadMovements(),
        loadDispensings(),
      ]);
    },
    [loadDispenseQueue, loadReviewQueue, loadInventory, loadMovements, loadDispensings],
  );

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      await refresh(up);
    })();
  }, [checkHealth, refresh]);

  useEffect(() => {
    if (error) messageApi.error(error);
  }, [error, messageApi]);

  const onRefresh = useCallback(async () => {
    const up = await checkHealth();
    await refresh(up);
  }, [checkHealth, refresh]);

  const queueColumns = (mode: 'dispense' | 'review') => [
    { title: '处方号', dataIndex: ['prescription', 'rxNo'], key: 'rxNo' },
    { title: '患者', dataIndex: 'patientName', key: 'patient' },
    { title: '科室', dataIndex: 'department', key: 'dept' },
    {
      title: '药品',
      key: 'items',
      render: (_: unknown, row: PharmacyQueueItem) =>
        row.prescription.items.map((i) => i.drugName).join('、'),
    },
    {
      title: '开立时间',
      key: 'time',
      render: (_: unknown, row: PharmacyQueueItem) =>
        formatTime(row.prescription.createdAt),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, row: PharmacyQueueItem) => (
        <Button
          type="primary"
          size="small"
          aria-label={mode === 'dispense' ? '调剂发药' : '审方'}
          onClick={() =>
            mode === 'dispense' ? setDispenseTarget(row) : setReviewTarget(row)
          }
        >
          {mode === 'dispense' ? '调剂发药' : '审 方'}
        </Button>
      ),
    },
  ];

  const inventoryColumns = useMemo(
    () => [
      { title: '药品编码', dataIndex: 'drugCode', key: 'code' },
      { title: '通用名', dataIndex: 'genericName', key: 'name' },
      { title: '药房', dataIndex: 'warehouse', key: 'wh' },
      { title: '批次', dataIndex: 'batchNo', key: 'batch' },
      {
        title: '库存数量',
        key: 'qty',
        render: (_: unknown, row: InventoryDto) => (
          <Tag color={row.quantity <= 0 ? 'red' : 'green'}>
            {row.quantity} {row.unit}
          </Tag>
        ),
      },
      {
        title: '效期',
        dataIndex: 'expiryDate',
        key: 'expiry',
        render: (v: string | null) => {
          if (!v) return '-';
          const soon = v.slice(0, 10) <= new Date().toISOString().slice(0, 10);
          return <Tag color={soon ? 'orange' : 'default'}>{v.slice(0, 10)}</Tag>;
        },
      },
    ],
    [],
  );

  const movementColumns = useMemo(
    () => [
      { title: '时间', dataIndex: 'createdAt', key: 't', render: (v: string) => formatTime(v) },
      { title: '药房', dataIndex: 'warehouse', key: 'wh' },
      { title: '批次', dataIndex: 'batchNo', key: 'batch' },
      {
        title: '变动',
        dataIndex: 'changeQty',
        key: 'change',
        render: (v: number) => <Tag color={v < 0 ? 'red' : 'green'}>{v}</Tag>,
      },
      { title: '结存', dataIndex: 'balanceAfter', key: 'bal' },
      { title: '原因', dataIndex: 'reason', key: 'reason' },
      { title: '关联', key: 'ref', render: (_: unknown, r: InventoryMovementDto) => r.refType ?? '-' },
    ],
    [],
  );

  const dispensingColumns = useMemo(
    () => [
      { title: '发药时间', dataIndex: 'dispensedAt', key: 't', render: (v: string) => formatTime(v) },
      { title: '药品', dataIndex: 'drugName', key: 'drug' },
      { title: '药房', dataIndex: 'warehouse', key: 'wh' },
      { title: '批次', dataIndex: 'batchNo', key: 'batch' },
      {
        title: '数量',
        key: 'qty',
        render: (_: unknown, r: DispensingDto) => `${r.quantity} ${r.unit ?? ''}`,
      },
      {
        title: 'CDS/override',
        key: 'cds',
        render: (_: unknown, r: DispensingDto) =>
          r.overrideReason ? (
            <Tag color="purple">override</Tag>
          ) : (
            <Tag color="green">正常</Tag>
          ),
      },
    ],
    [],
  );

  const watermarkText = `${health?.version ?? 'jlmedaios'} / ${health?.status ?? 'offline'}`;

  return (
    <Watermark content={watermarkText}>
      {contextHolder}
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Card size="small">
          <Row justify="space-between" align="middle">
            <Col>
              <Typography.Title level={4} style={{ margin: 0 }}>
                药房调剂发药工作站
              </Typography.Title>
            </Col>
            <Col>
              <Space>
                <Tag
                  color={healthChecking ? 'orange' : dbUp ? 'green' : 'red'}
                  data-testid="pharmacy-health-tag"
                >
                  {healthChecking ? '探活中' : dbUp ? `BFF/DB 正常 (${health?.db})` : 'BFF/DB 不可用'}
                </Tag>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => void onRefresh()}
                  loading={loading}
                >
                  刷 新
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {!healthChecking && !dbUp && (
          <Alert
            data-testid="pharmacy-offline-alert"
            type="error"
            showIcon
            message="无法连接 BFF 或数据库，药房工作站不可用"
            description={error ?? '请确认后端服务与 PostgreSQL 已启动；当前不会展示或提交任何数据。'}
          />
        )}

        {error && dbUp && (
          <Alert
            type="warning"
            showIcon
            closable
            message={error}
            onClose={clearError}
          />
        )}

        {healthChecking ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin tip="正在探活并加载药房数据..." size="large">
              <div style={{ height: 80 }} />
            </Spin>
          </div>
        ) : dbUp ? (
          <Card data-testid="pharmacy-content">
            <Tabs
              defaultActiveKey="dispense"
              items={[
                {
                  key: 'dispense',
                  label: <Badge count={dispenseQueue.length} size="small" offset={[10, 0]}>待发药</Badge>,
                  children: (
                    <Table
                      rowKey={(r) => r.prescription.id}
                      size="small"
                      loading={loading}
                      columns={queueColumns('dispense')}
                      dataSource={dispenseQueue}
                    />
                  ),
                },
                {
                  key: 'review',
                  label: <Badge count={reviewQueue.length} size="small" offset={[10, 0]}>待审方</Badge>,
                  children: (
                    <Table
                      rowKey={(r) => r.prescription.id}
                      size="small"
                      loading={loading}
                      columns={queueColumns('review')}
                      dataSource={reviewQueue}
                    />
                  ),
                },
                {
                  key: 'inventory',
                  label: '库存',
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      loading={loading}
                      columns={inventoryColumns}
                      dataSource={inventory}
                    />
                  ),
                },
                {
                  key: 'movements',
                  label: '库存流水',
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      loading={loading}
                      columns={movementColumns}
                      dataSource={movements}
                    />
                  ),
                },
                {
                  key: 'records',
                  label: '发药记录',
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      loading={loading}
                      columns={dispensingColumns}
                      dataSource={dispensings}
                    />
                  ),
                },
              ]}
            />
          </Card>
        ) : (
          <Card>
            <Empty description="BFF/数据库不可用，无药房数据" />
          </Card>
        )}
      </Space>

      <DispenseModal
        item={dispenseTarget}
        inventory={inventory}
        onClose={() => setDispenseTarget(null)}
      />
      <ReviewModal item={reviewTarget} onClose={() => setReviewTarget(null)} />
    </Watermark>
  );
}
