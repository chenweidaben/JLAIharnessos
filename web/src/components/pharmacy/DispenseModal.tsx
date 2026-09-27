/**
 * 健澜科技 jlmedaios - 调剂发药确认弹窗（M2-A）
 *
 * 真实 BFF，无 mock。发药前最后一道人机安全闸：
 *  - 自动按 FEFO（近效期先出）为每个药品选定批次，可改选；
 *  - 展示发药前 CDS 命中（过敏/相互作用/禁忌）；block 药红色警示；
 *  - 存在 block 时必须填写 override 原因，且由开方医师（cds:override）授权，
 *    药师不可单方强发；确认按钮在条件不满足时禁用；
 *  - 确认后由聚合器同事务原子扣库存/流水/发药记录/审计。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';

import { usePharmacyStore } from '@/store/pharmacyStore';
import type {
  CdsHitDto,
  DispenseLinePayload,
  DispensePayload,
  InventoryDto,
  PharmacyQueueItem,
} from '@/types/pharmacy';

const DEFAULT_WAREHOUSE = '中心药房';

/** FEFO：按近效期升序排列可用批次（数量>0）。 */
export function fefoBatches(
  inventory: InventoryDto[],
  drugCode: string | null,
  warehouse: string,
): InventoryDto[] {
  return inventory
    .filter(
      (i) =>
        i.warehouse === warehouse &&
        i.drugCode === drugCode &&
        i.quantity > 0,
    )
    .sort((a, b) =>
      (a.expiryDate ?? '9999-12-31').localeCompare(b.expiryDate ?? '9999-12-31'),
    );
}

interface Props {
  item: PharmacyQueueItem | null;
  inventory: InventoryDto[];
  onClose: () => void;
}

export function DispenseModal({ item, inventory, onClose }: Props) {
  const previewCds = usePharmacyStore((s) => s.previewCds);
  const dispense = usePharmacyStore((s) => s.dispense);
  const submitting = usePharmacyStore((s) => s.submitting);
  const cdsPreview = usePharmacyStore((s) => s.cdsPreview);

  const [warehouse, setWarehouse] = useState(DEFAULT_WAREHOUSE);
  const [batchByItem, setBatchByItem] = useState<Record<string, string | null>>({});
  const [overrideReason, setOverrideReason] = useState('');

  const rx = item?.prescription ?? null;

  useEffect(() => {
    setWarehouse(DEFAULT_WAREHOUSE);
    setBatchByItem({});
    setOverrideReason('');
    if (rx) void previewCds(rx.id);
  }, [rx?.id, previewCds]);

  const blocks: CdsHitDto[] = cdsPreview?.blocks ?? [];
  const warnings: CdsHitDto[] = (cdsPreview?.hits ?? []).filter(
    (h) => h.actionType !== 'block',
  );
  const hasBlock = blocks.length > 0;
  const overrideReady = !hasBlock || overrideReason.trim().length > 0;

  /** 每个药品的 FEFO 默认批次。 */
  const defaultBatches = useMemo(() => {
    const map: Record<string, InventoryDto[]> = {};
    rx?.items.forEach((it) => {
      map[it.id] = fefoBatches(inventory, it.drugCode, warehouse);
    });
    return map;
  }, [rx, inventory, warehouse]);

  const anyOutOfStock = useMemo(() => {
    if (!rx) return false;
    return rx.items.some((it) => (defaultBatches[it.id]?.length ?? 0) === 0);
  }, [rx, defaultBatches]);

  const chosenBatch = (itemId: string): string | null => {
    if (itemId in batchByItem) return batchByItem[itemId];
    return defaultBatches[itemId]?.[0]?.batchNo ?? null;
  };

  const handleConfirm = async () => {
    if (!rx) return;
    const lines: DispenseLinePayload[] = rx.items.map((it) => ({
      itemId: it.id,
      batchNo: chosenBatch(it.id),
      quantity: it.quantity ?? undefined,
    }));
    const payload: DispensePayload = {
      warehouse,
      lines,
      ...(hasBlock ? { overrideReason: overrideReason.trim() } : {}),
    };
    const result = await dispense(rx.id, payload);
    if (result) onClose();
  };

  const columns = [
    {
      title: '药品',
      dataIndex: 'drugName',
      key: 'drugName',
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: '规格', dataIndex: 'specification', key: 'spec' },
    {
      title: '数量',
      key: 'qty',
      render: (_: unknown, row: { quantity: number | null; quantityUnit: string | null }) =>
        `${row.quantity ?? ''} ${row.quantityUnit ?? ''}`,
    },
    {
      title: 'FEFO 批次',
      key: 'batch',
      render: (_: unknown, row: { id: string; drugCode: string | null }) => {
        const batches = defaultBatches[row.id] ?? [];
        if (batches.length === 0) return <Tag color="red">无可用批次</Tag>;
        return (
          <Select
            aria-label={`批次-${row.drugCode ?? row.id}`}
            style={{ minWidth: 200 }}
            value={chosenBatch(row.id)}
            onChange={(v) =>
              setBatchByItem((prev) => ({ ...prev, [row.id]: v }))
            }
            options={batches.map((b) => ({
              value: b.batchNo,
              label: `${b.batchNo}（效期 ${b.expiryDate ?? '-'}，余 ${b.quantity}）`,
            }))}
          />
        );
      },
    },
  ];

  return (
    <Modal
      title="处方调剂发药确认"
      open={Boolean(rx)}
      width={860}
      onCancel={onClose}
      onOk={() => void handleConfirm()}
      okText="确认发药"
      cancelText="取 消"
      okButtonProps={{
        disabled: !overrideReady || anyOutOfStock,
        loading: submitting,
      }}
      destroyOnClose
    >
      {rx && item ? (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Descriptions size="small" column={3} bordered>
            <Descriptions.Item label="处方号">{rx.rxNo}</Descriptions.Item>
            <Descriptions.Item label="患者">{item.patientName ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="科室">{item.department ?? '-'}</Descriptions.Item>
          </Descriptions>

          {hasBlock && (
            <Alert
              data-testid="dispense-block-alert"
              type="error"
              showIcon
              message={`CDS 拦截 ${blocks.length} 项，须医师 override 后方可发药`}
              description={
                <Space direction="vertical" size={4}>
                  {blocks.map((b) => (
                    <Typography.Text key={b.ruleId} type="danger">
                      [{b.ruleId}] {b.message}
                    </Typography.Text>
                  ))}
                </Space>
              }
            />
          )}

          {warnings.length > 0 && (
            <Alert
              data-testid="dispense-warn-alert"
              type="warning"
              showIcon
              message={`CDS 警示 ${warnings.length} 项（可继续发药）`}
              description={warnings.map((b) => (
                <Typography.Text key={b.ruleId}>
                  [{b.ruleId}] {b.message}
                </Typography.Text>
              ))}
            />
          )}

          {anyOutOfStock && (
            <Alert
              data-testid="dispense-outofstock-alert"
              type="error"
              showIcon
              message="存在无可用批次/库存的药品，无法发药（请先入库）"
            />
          )}

          <Table
            rowKey="id"
            size="small"
            pagination={false}
            columns={columns}
            dataSource={rx.items}
          />

          {hasBlock && (
            <Form layout="vertical" data-testid="override-form">
              <Form.Item
                label="CDS override 原因（由开方医师 cds:override 授权，药师记录执行）"
                required>
                <Input.TextArea
                  aria-label="override 原因"
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="请填写医师复核后继续发药的临床理由"
                />
              </Form.Item>
            </Form>
          )}
        </Space>
      ) : (
        <Empty description="未选择处方" />
      )}
    </Modal>
  );
}
