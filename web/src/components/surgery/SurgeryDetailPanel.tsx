/**
 * 健澜科技 jlmedaios - 手术麻醉详情面板（M9-C）
 *
 * 按状态机渲染可操作动作：排班→术前三方核对→麻醉诱导→术中事件/阶段推进→
 * PACU 评分→术者/麻醉双签→离室 / 取消。与后端 TRANSITIONS 严格一致。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Steps,
  Tag,
  Timeline,
  message,
} from 'antd';
import type { SurgeryStatus } from '@/types/surgery';
import { useSurgeryStore, SURGERY_STATUS_META } from '@/store/surgeryStore';

const PRECHECK_ITEMS: Array<{ key: string; label: string }> = [
  { key: 'patient', label: '患者身份核对' },
  { key: 'procedure', label: '手术方式核对' },
  { key: 'anesthesiaMethod', label: '麻醉方式核对' },
  { key: 'surgeon', label: '术者核对' },
  { key: 'antibiotic', label: '抗生素皮试/预防用药' },
  { key: 'skinTest', label: '皮肤准备核对' },
];

const STEPS: SurgeryStatus[] = ['requested', 'scheduled', 'prechecked', 'induction', 'maintenance', 'recovery', 'pacu', 'discharged'];

export default function SurgeryDetailPanel() {
  const {
    detail, error, loading,
    schedule, precheck, induction, stage, event, pacu, sign, discharge, cancel,
  } = useSurgeryStore();
  const [scheduleForm] = Form.useForm();
  const [precheckForm] = Form.useForm();
  const [inductionForm] = Form.useForm();
  const [eventForm] = Form.useForm();
  const [stageForm] = Form.useForm();
  const [pacuForm] = Form.useForm();
  const [cancelForm] = Form.useForm();
  const [cancelOpen, setCancelOpen] = useState(false);

  const req = detail?.req;
  const close = () => useSurgeryStore.setState({ detail: null });

  if (!req) return null;

  const current = req.status;
  const currentStep = current === 'cancelled' ? -1 : SURGERY_STATUS_META[current].step;

  const handleSchedule = async () => {
    const v = await scheduleForm.validateFields();
    await schedule(req.id, {
      surgeonId: v.surgeonId ?? null,
      anesthetistId: v.anesthetistId ?? null,
      anesthesiaMethod: v.anesthesiaMethod ?? null,
      plannedDate: v.plannedDate ?? null,
    });
    message.success('手术已排程');
  };

  const handlePrecheck = async () => {
    const v = await precheckForm.validateFields();
    const pre: Record<string, unknown> = {};
    for (const item of PRECHECK_ITEMS) pre[item.key] = Boolean(v[item.key]);
    await precheck(req.id, pre);
    message.success('术前三方核对完成');
  };

  const handleInduction = async () => {
    const v = await inductionForm.validateFields();
    await induction(req.id, v.notes);
    message.success('已进入麻醉诱导');
  };

  const handleEvent = async () => {
    const v = await eventForm.validateFields();
    await event(req.id, v.eventType, { note: v.note ?? '' });
    eventForm.resetFields();
    message.success('术中事件已记录');
  };

  const handleStage = async () => {
    if (!nextStage) return;
    const v = await stageForm.validateFields();
    await stage(req.id, nextStage, v.notes ?? undefined);
    message.success(`阶段已推进：${SURGERY_STATUS_META[nextStage].label}`);
  };

  const handlePacu = async () => {
    const v = await pacuForm.validateFields();
    const r = await pacu(req.id, v.aldrete, v.note ?? undefined);
    if (r.canDischarge) message.success('Aldrete 达标且双签齐备，可执行离室');
    else message.info('Aldrete 未达标或双签未齐，暂不可离室');
  };

  const handleSign = async (role: 'surgeon' | 'anesthetist') => {
    await sign(req.id, role);
    message.success(role === 'surgeon' ? '术者签名完成' : '麻醉医师签名完成');
  };

  const handleDischarge = async () => {
    await discharge(req.id);
    message.success('手术患者已离室');
  };

  const handleCancel = async () => {
    const v = await cancelForm.validateFields();
    await cancel(req.id, v.reason);
    setCancelOpen(false);
    cancelForm.resetFields();
    message.success('手术申请已取消');
  };

  const inIntraop = ['induction', 'maintenance', 'recovery'].includes(current);
  // 状态机决定的唯一下一阶段（与后端 TRANSITIONS 一致）
  const nextStage: 'maintenance' | 'recovery' | 'pacu' | null =
    current === 'induction' ? 'maintenance'
      : current === 'maintenance' ? 'recovery'
        : current === 'recovery' ? 'pacu' : null;

  return (
    <Drawer
      open={!!detail}
      onClose={close}
      width={720}
      title={`手术申请详情 · ${req.requestNo}`}
      loading={loading}
      extra={
        <Button danger onClick={() => setCancelOpen(true)} disabled={['discharged', 'cancelled'].includes(current)}>
          取消申请
        </Button>
      }
    >
      {error && <Alert type="error" showIcon className="mb-3" message={error} />}

      <Descriptions size="small" column={2} bordered className="mb-4">
        <Descriptions.Item label="拟定术式">{req.plannedProcedure}</Descriptions.Item>
        <Descriptions.Item label="手术类型">
          {req.surgeryType === 'emergency' ? <Tag color="red">急诊</Tag> : <Tag color="blue">择期</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="科室">{req.department ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="术前诊断">{req.diagnosis ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="麻醉方式">{req.anesthesiaMethod ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="计划日期">{req.plannedDate ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="术者签名">{req.surgeonSignedAt ? new Date(req.surgeonSignedAt).toLocaleString() : '未签'}</Descriptions.Item>
        <Descriptions.Item label="麻醉签名">{req.anesthetistSignedAt ? new Date(req.anesthetistSignedAt).toLocaleString() : '未签'}</Descriptions.Item>
      </Descriptions>

      <Card size="small" className="mb-4">
        <Steps
          size="small"
          current={currentStep}
          status={current === 'cancelled' ? 'error' : 'process'}
          items={STEPS.map((s) => ({ title: SURGERY_STATUS_META[s].label }))}
        />
      </Card>

      {/* 手术中事件时间线 */}
      {detail && detail.events.length > 0 && (
        <Card size="small" title="术中事件时间线" className="mb-4">
          <Timeline
            items={detail.events.map((e) => ({
              children: (
                <span>
                  <Tag color="blue">{e.eventType}</Tag>
                  {new Date(e.occurredAt).toLocaleString()} · {String((e.payload as Record<string, unknown>).note ?? '')}
                </span>
              ),
            }))}
          />
        </Card>
      )}

      {/* 动作区 */}
      {current === 'requested' && (
        <Card size="small" title="手术排班">
          <Form form={scheduleForm} layout="vertical">
            <Form.Item name="surgeonId" label="手术医师ID">
              <Input placeholder="用户 UUID" />
            </Form.Item>
            <Form.Item name="anesthetistId" label="麻醉医师ID">
              <Input placeholder="用户 UUID" />
            </Form.Item>
            <Form.Item name="anesthesiaMethod" label="麻醉方式">
              <Select allowClear options={['全身麻醉', '椎管内麻醉', '区域阻滞', '局部麻醉'].map((v) => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item name="plannedDate" label="计划手术日期">
              <Input placeholder="YYYY-MM-DD" />
            </Form.Item>
            <Button type="primary" onClick={() => void handleSchedule()}>确认排程</Button>
          </Form>
        </Card>
      )}

      {current === 'scheduled' && (
        <Card size="small" title="术前三方核对（患者/术式/麻醉/术者/抗生素/皮试）">
          <Form form={precheckForm} layout="vertical">
            {PRECHECK_ITEMS.map((item) => (
              <Form.Item key={item.key} name={item.key} valuePropName="checked" className="mb-2">
                <Checkbox>{item.label}</Checkbox>
              </Form.Item>
            ))}
            <Button type="primary" onClick={() => void handlePrecheck()}>完成三方核对</Button>
          </Form>
        </Card>
      )}

      {current === 'prechecked' && (
        <Card size="small" title="麻醉诱导">
          <Form form={inductionForm} layout="vertical">
            <Form.Item name="notes" label="诱导记录" rules={[{ required: true, message: '请输入诱导记录' }]}>
              <Input.TextArea rows={3} placeholder="药物、剂量、生命体征等" />
            </Form.Item>
            <Button type="primary" onClick={() => void handleInduction()}>开始麻醉诱导</Button>
          </Form>
        </Card>
      )}

      {inIntraop && (
        <Card size="small" title="术中管理" className="mb-4">
          <Space direction="vertical" className="w-full">
            <Form form={eventForm} layout="inline">
              <Form.Item name="eventType" rules={[{ required: true, message: '事件类型' }]}>
                <Select
                  style={{ width: 160 }}
                  placeholder="事件类型"
                  options={['血压波动', '心率异常', '出血', '用药', '输血', '转开放', '其他'].map((v) => ({ value: v, label: v }))}
                />
              </Form.Item>
              <Form.Item name="note" className="min-w-[220px]">
                <Input placeholder="事件说明" />
              </Form.Item>
              <Button onClick={() => void handleEvent()}>记录事件</Button>
            </Form>
            <Form form={stageForm} layout="inline">
              <Form.Item name="notes" className="min-w-[220px]">
                <Input placeholder="阶段备注" />
              </Form.Item>
              {nextStage && (
                <Button type="primary" onClick={() => void handleStage()}>
                  推进至 {SURGERY_STATUS_META[nextStage].label}
                </Button>
              )}
            </Form>
          </Space>
        </Card>
      )}

      {current === 'pacu' && (
        <Card size="small" title="PACU 复苏评分与离室">
          <Form form={pacuForm} layout="vertical">
            <Form.Item name="aldrete" label="Aldrete 评分（0-10，≥9 可离室）" rules={[{ required: true, message: '请输入评分' }]}>
              <InputNumber min={0} max={10} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="note" label="评分备注">
              <Input />
            </Form.Item>
            <Space wrap>
              <Button type="primary" onClick={() => void handlePacu()}>提交评分</Button>
              <Button disabled={req.surgeonSignedAt != null} onClick={() => void handleSign('surgeon')}>
                {req.surgeonSignedAt ? '术者已签名' : '术者签名'}
              </Button>
              <Button disabled={req.anesthetistSignedAt != null} onClick={() => void handleSign('anesthetist')}>
                {req.anesthetistSignedAt ? '麻醉已签名' : '麻醉签名'}
              </Button>
              <Button
                type="primary"
                danger
                onClick={() => void handleDischarge()}
                disabled={!(req.surgeonSignedAt && req.anesthetistSignedAt)}
              >
                执行离室
              </Button>
            </Space>
          </Form>
        </Card>
      )}

      {(current === 'discharged' || current === 'cancelled') && (
        <Alert
          type={current === 'discharged' ? 'success' : 'error'}
          showIcon
          message={current === 'discharged' ? '该手术已离室，流程终结' : '该手术申请已取消，流程终结'}
        />
      )}

      <Modal
        open={cancelOpen}
        title="取消手术申请"
        onCancel={() => setCancelOpen(false)}
        onOk={() => void handleCancel()}
      >
        <Form form={cancelForm} layout="vertical">
          <Form.Item name="reason" label="取消原因" rules={[{ required: true, message: '请输入取消原因' }]}>
            <Input.TextArea rows={3} placeholder="说明取消原因" />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
