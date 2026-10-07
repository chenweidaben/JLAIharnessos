/**
 * 健澜科技 jlmedaios - 输血管理详情面板（M10-A）
 *
 * 按状态机展示操作：配血（血库）→ 发血扣库（血库）→ 双人核对输注（护士）→
 * 完成 / 停输（护士）→ 不良反应上报（质控）。本人核对互异 + 库存不足提示。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useTransfusionStore } from '@/store/transfusionStore';
import { TRANSFUSION_STATUS_META, BLOOD_COMPONENT_LABEL } from '@/types/transfusion';

const { Text, Paragraph } = Typography;

export default function TransfusionDetailPanel() {
  const { detail, crossmatch, dispense, start, complete, stop, cancel, reaction } = useTransfusionStore();
  const [op, setOp] = useState<null | 'crossmatch' | 'dispense' | 'start' | 'reaction'>(null);
  const [form] = Form.useForm();
  const [coForm] = Form.useForm();
  const [rxForm] = Form.useForm();

  if (!detail) {
    return (
      <Alert type="info" showIcon message="请在左侧选择一条输血申请查看详情与操作" />
    );
  }

  const { req, transfusion, reactions, stock } = detail;
  const meta = TRANSFUSION_STATUS_META[req.status];

  const availableStock = stock.filter((s) => s.bloodType === req.bloodType && s.component === req.component);
  const totalAvailable = availableStock.reduce((a, s) => a + s.units, 0);

  const runOp = async (
    f: ReturnType<typeof Form.useForm>[0],
    fn: (v: Record<string, unknown>) => Promise<unknown>,
  ) => {
    const values = (await f.validateFields()) as Record<string, unknown>;
    await fn(values);
    setOp(null);
    form.resetFields();
    coForm.resetFields();
    rxForm.resetFields();
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-card">
      <Space className="mb-3 w-full justify-between">
        <Typography.Title level={5} className="!mb-0">
          输血申请详情 · {req.requestNo}
        </Typography.Title>
        {meta ? <Tag color={meta.color}>{meta.label}</Tag> : null}
      </Space>

      <Descriptions size="small" column={3} className="mb-3">
        <Descriptions.Item label="科室">{req.department}</Descriptions.Item>
        <Descriptions.Item label="成分">{BLOOD_COMPONENT_LABEL[req.component] ?? req.component}</Descriptions.Item>
        <Descriptions.Item label="血型">{req.bloodType}型</Descriptions.Item>
        <Descriptions.Item label="剂量">{req.unitCount} 单位</Descriptions.Item>
        <Descriptions.Item label="紧急度">
          {req.urgency === 'emergency' ? '特急' : req.urgency === 'urgent' ? '紧急' : '常规'}
        </Descriptions.Item>
        <Descriptions.Item label="申请时间">
          {new Date(req.createdAt).toLocaleString('zh-CN', { hour12: false })}
        </Descriptions.Item>
      </Descriptions>

      <Paragraph type="secondary" className="mb-1">
        输血指征：{req.indication}
      </Paragraph>
      <Paragraph type="secondary" className="mb-3">
        CDS 规则：{(req.indicationMeta as { cds?: { suggestion?: string } }).cds?.suggestion ?? '—'}
      </Paragraph>

      {req.status === 'requested' && (
        <Alert type="warning" showIcon className="mb-3"
          message={`待血库处理：配血 → 发血。当前库存可发 ${totalAvailable} 单位（需求 ${req.unitCount} 单位）`} />
      )}
      {req.status === 'dispensed' && (
        <Alert type="info" showIcon className="mb-3"
          message={`已发血批次 ${req.batchNo ?? '—'}，请护士双人核对后开始输注`} />
      )}
      {transfusion && transfusion.status === 'ongoing' && (
        <Alert type="success" showIcon className="mb-3"
          message={`输注中：${req.unitCount} 单位，滴速 ${transfusion.dripRate ?? '未记录'}`} />
      )}

      <Space wrap className="mb-3">
        {req.status === 'requested' && (
          <Button type="primary" onClick={() => setOp('crossmatch')}>交叉配血</Button>
        )}
        {req.status === 'crossmatched' && (
          <Button type="primary" onClick={() => setOp('dispense')}>血库发血</Button>
        )}
        {req.status === 'dispensed' && (
          <Button type="primary" onClick={() => setOp('start')}>开始输注（双人核对）</Button>
        )}
        {req.status === 'transfusing' && (
          <>
            <Popconfirm title="确认完成本次输血？" onConfirm={() => void complete(req.id)}>
              <Button type="primary">完成输注</Button>
            </Popconfirm>
            <Popconfirm title="确认异常停输？" onConfirm={() => void stop(req.id, '临床停输（原因见不良反应上报）')}>
              <Button danger>异常停输</Button>
            </Popconfirm>
          </>
        )}
        {(req.status === 'transfusing' || req.status === 'completed') && (
          <Button onClick={() => setOp('reaction')}>上报不良反应</Button>
        )}
        {(req.status === 'requested' || req.status === 'crossmatched' || req.status === 'dispensed') && (
          <Popconfirm title="确认取消该输血申请？" onConfirm={() => void cancel(req.id, '申请方主动取消')}>
            <Button danger>取消申请</Button>
          </Popconfirm>
        )}
      </Space>

      {reactions.length > 0 && (
        <div className="mb-3">
          <Text strong>不良反应记录</Text>
          {reactions.map((r) => (
            <Paragraph key={r.id} className="mb-1">
              <Tag color={r.severity === 'severe' ? 'red' : r.severity === 'moderate' ? 'orange' : 'gold'}>
                {r.severity === 'severe' ? '重度' : r.severity === 'moderate' ? '中度' : '轻度'}
              </Tag>
              {r.symptom} · 处置：{r.action} {r.outcome ? `· 结局：${r.outcome}` : ''}
            </Paragraph>
          ))}
        </div>
      )}

      {req.status === 'cancelled' && req.cancelReason && (
        <Alert type="error" showIcon message={`已取消：${req.cancelReason}`} />
      )}
      {req.status === 'completed' && transfusion && (
        <Alert type="success" showIcon
          message={`输注完成：执行 ${transfusion.transfusedBy} / 核对 ${transfusion.coSignBy} · ${req.unitCount} 单位`} />
      )}

      <Modal
        open={op === 'crossmatch'}
        title="交叉配血"
        onCancel={() => setOp(null)}
        onOk={() => void runOp(form, (v) => crossmatch(req.id, String(v.result), v.note ? String(v.note) : undefined))}
      >
        <Form form={form} layout="vertical" className="mt-3">
          <Form.Item name="result" label="配血结果" rules={[{ required: true, message: '请输入配血结果' }]}>
            <Input placeholder="如：ABO 血型相容，配血相合" />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input placeholder="可选备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={op === 'dispense'}
        title="血库发血"
        onCancel={() => setOp(null)}
        onOk={() => void runOp(form, (v) => dispense(req.id, v.batchNo ? String(v.batchNo) : undefined))}
      >
        <Alert type={totalAvailable >= req.unitCount ? 'success' : 'error'} showIcon className="mb-3"
          message={`可发库存 ${totalAvailable} 单位 / 需求 ${req.unitCount} 单位`}
          description={totalAvailable < req.unitCount ? '库存不足，发血将被拒绝（409）' : '发血将事务内扣减库存并审计留痕'} />
        <Form form={form} layout="vertical" className="mt-3">
          <Form.Item name="batchNo" label="批次号">
            <Select
              allowClear
              placeholder="选择批次（默认取最早效期批次）"
              options={availableStock.map((s) => ({
                value: s.batchNo,
                label: `${s.batchNo}（余 ${s.units}U，效期 ${s.expiryDate ?? '—'}）`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={op === 'start'}
        title="开始输注 · 双人核对"
        onCancel={() => setOp(null)}
        onOk={() => void runOp(coForm, (v) => start(req.id, String(v.coSignBy), v.dripRate ? String(v.dripRate) : undefined))}
      >
        <Alert type="warning" showIcon className="mb-3"
          message="双人核对：执行护士与核对护士必须为不同人员（同人将 400 拒绝）" />
        <Form form={coForm} layout="vertical" className="mt-3">
          <Form.Item name="coSignBy" label="核对护士ID" rules={[{ required: true, message: '请输入核对护士用户ID' }]}>
            <Input placeholder="核对护士 UUID（≠ 当前执行护士）" />
          </Form.Item>
          <Form.Item name="dripRate" label="滴速">
            <Input placeholder="如：10 滴/分" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={op === 'reaction'}
        title="上报输血不良反应"
        onCancel={() => setOp(null)}
        onOk={() => void runOp(rxForm, (v) =>
          reaction(req.id, {
            severity: String(v.severity),
            symptom: String(v.symptom),
            action: String(v.action),
            outcome: v.outcome ? String(v.outcome) : undefined,
          }))}
      >
        <Form form={rxForm} layout="vertical" className="mt-3">
          <Form.Item name="severity" label="分级" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'mild', label: '轻度' },
                { value: 'moderate', label: '中度' },
                { value: 'severe', label: '重度' },
              ]}
            />
          </Form.Item>
          <Form.Item name="symptom" label="症状" rules={[{ required: true, message: '请输入症状描述' }]}>
            <Input placeholder="如：发热、皮疹、寒战" />
          </Form.Item>
          <Form.Item name="action" label="处置" rules={[{ required: true, message: '请输入处置措施' }]}>
            <Select
              options={[
                { value: 'stop', label: '立即停输' },
                { value: 'slow', label: '减速输注' },
                { value: 'observe', label: '密切观察' },
                { value: 'treat', label: '对症治疗' },
              ]}
            />
          </Form.Item>
          <Form.Item name="outcome" label="结局">
            <Input placeholder="如：好转" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
