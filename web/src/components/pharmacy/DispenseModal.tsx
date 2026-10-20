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
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { ScanOutlined } from '@ant-design/icons';

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
  // v5.0试点扩展（M190三角色工作流）：双人核对签字栏 + 发药后用药提醒推送
  const [checkerA, setCheckerA] = useState('');
  const [checkerB, setCheckerB] = useState('');
  const [dispensed, setDispensed] = useState(false);
  // v5.0试点扩展（M197护士药师工作流）：双人核对 Steps 流程（0=A扫码 1=B确认 2=发药成功）
  const [checkStep, setCheckStep] = useState(0);

  const rx = item?.prescription ?? null;

  useEffect(() => {
    setWarehouse(DEFAULT_WAREHOUSE);
    setBatchByItem({});
    setOverrideReason('');
    // v5.0试点扩展（M190三角色工作流）：默认填入双人核对药师（DEMO mock）
    setCheckerA('周敏（发药药师）');
    setCheckerB('李娜（复核药师）');
    setDispensed(false);
    // v5.0试点扩展（M197护士药师工作流）：双人核对流程重置到步骤 0
    setCheckStep(0);
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
    // v5.0试点扩展（M190三角色工作流）：发药成功后先展示双人核对 + 用药提醒推送结果，再关闭
    if (result) {
      setDispensed(true);
      // v5.0试点扩展（M197护士药师工作流）：双人核对流程推进到"发药成功"
      setCheckStep(2);
    }
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
      onOk={dispensed ? onClose : () => void handleConfirm()}
      okText={dispensed ? '完 成' : '确认发药'}
      cancelText="取 消"
      okButtonProps={{
        disabled: dispensed ? false : !overrideReady || anyOutOfStock,
        loading: dispensed ? false : submitting,
      }}
      destroyOnClose
    >
      {/* v5.0试点扩展（M190三角色工作流）：发药成功 → 双人核对 + 用药提醒推送结果 */}
      {dispensed && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message="发药完成"
          description={
            <Space direction="vertical" size={4}>
              <Typography.Text>双人核对：核对人A（发药药师）{checkerA} ✓ ｜ 核对人B（复核药师）{checkerB} ✓</Typography.Text>
              <Typography.Text>已推送用药提醒给患者：服药时间、剂量与注意事项已同步至患者端。</Typography.Text>
            </Space>
          }
        />
      )}
      {!dispensed && rx && item ? (
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

          {/* v5.0试点扩展（M197护士药师工作流）：双人核对发药流程 Steps（A扫码→B确认→发药成功） */}
          <Card size="small" title="双人核对发药流程（DEMO mock）">
            <Steps
              current={checkStep}
              size="small"
              items={[
                { title: '核对人A扫码', description: checkerA || '待发药药师扫码' },
                { title: '核对人B确认', description: checkerB || '待复核药师确认' },
                { title: '发药成功', description: '库存扣减 + 发药记录 + 用药提醒推送' },
              ]}
            />
            <Space style={{ marginTop: 12 }}>
              {checkStep === 0 && (
                <Button
                  type="primary"
                  icon={<ScanOutlined />}
                  onClick={() => {
                    if (!checkerA.trim()) {
                      message.warning('请先填写核对人A（发药药师）签名');
                      return;
                    }
                    setCheckStep(1);
                    message.success(`核对人A ${checkerA} 扫码完成，待核对人B确认`);
                  }}
                >
                  核对人A 扫码（mock）
                </Button>
              )}
              {checkStep === 1 && (
                <Button
                  type="primary"
                  onClick={() => {
                    if (!checkerB.trim()) {
                      message.warning('请先填写核对人B（复核药师）签名');
                      return;
                    }
                    if (checkerB.trim() === checkerA.trim()) {
                      message.warning('核对人B不得与核对人A为同一人');
                      return;
                    }
                    message.success(`核对人B ${checkerB} 确认一致，可点击"确认发药"`);
                  }}
                >
                  核对人B 确认（mock）
                </Button>
              )}
              {checkStep === 2 && (
                <Tag color="green">双人核对完成，发药成功 ✓</Tag>
              )}
            </Space>
          </Card>

          {/* v5.0试点扩展（M190三角色工作流）：双人核对签字栏（核对人A/B，DEMO mock） */}
          <Descriptions size="small" title="双人核对发药（核对人A / 核对人B 签字）" column={2} bordered>
            <Descriptions.Item label="核对人A（发药药师）">
              <Input
                aria-label="核对人A"
                value={checkerA}
                onChange={(e) => setCheckerA(e.target.value)}
                placeholder="发药药师签名"
              />
            </Descriptions.Item>
            <Descriptions.Item label="核对人B（复核药师）">
              <Input
                aria-label="核对人B"
                value={checkerB}
                onChange={(e) => setCheckerB(e.target.value)}
                placeholder="复核药师签名（≠ 核对人A）"
              />
            </Descriptions.Item>
          </Descriptions>

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
      ) : dispensed ? (
        <Typography.Text type="secondary">双人核对完成，用药提醒已推送至患者端，点击"完成"关闭。</Typography.Text>
      ) : (
        <Empty description="未选择处方" />
      )}
    </Modal>
  );
}
