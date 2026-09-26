/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 留观管理：活动留观列表 / 开始·更新留观 / 超时预警 / 办理入院·离院（真实 BFF）
 */
import { useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import {
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import clsx from 'clsx';
import type { ColumnsType } from 'antd/es/table';

import { useEmergencyStore } from '@/store/emergencyStore';
import type { ObservationDto, ObsTaskDto } from '@/types/emergency';
import { isVitalAbnormal, NURSING_LEVEL_META, OBS_STATUS_META } from './constants';

const OVERTIME_MIN = 24 * 60;

function fmtStay(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}小时${m}分` : `${m}分钟`;
}

function num(v: unknown): number | null {
  return typeof v === 'number' ? v : null;
}

export default function ObservationView() {
  const { message } = AntdApp.useApp();
  const {
    queue,
    observations,
    acting,
    ready,
    fetchObservations,
    fetchQueue,
    startObservation,
    updateObservation,
    endObservation,
  } = useEmergencyStore();

  const [now, setNow] = useState(() => Date.now());
  const [startOpen, setStartOpen] = useState(false);
  const [startForm] = Form.useForm();
  const [updating, setUpdating] = useState<ObservationDto | null>(null);
  const [updateForm] = Form.useForm();

  useEffect(() => {
    void fetchObservations();
    void fetchQueue();
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [fetchObservations, fetchQueue]);

  const qByVisit = useMemo(() => new Map(queue.map((q) => [q.visitId, q])), [queue]);

  /** 可开始留观：已分诊/救治中/抢救中 */
  const eligible = useMemo(
    () =>
      queue.filter((q) =>
        ['triaged', 'in_treatment', 'resuscitation'].includes(q.emStatus),
      ),
    [queue],
  );

  const stayOf = (r: ObservationDto) =>
    Math.max(0, Math.floor((now - dayjs(r.startTime).valueOf()) / 60000));

  const active = observations.filter((r) => r.status !== 'discharged' && r.status !== 'admitted');
  const overtime = active.filter((r) => stayOf(r) > OVERTIME_MIN);
  const worsening = active.filter((r) => r.status === 'worsening').length;

  const openStart = () => {
    startForm.resetFields();
    startForm.setFieldsValue({ visitId: eligible[0]?.visitId, nursingLevel: '二级' });
    setStartOpen(true);
  };

  const handleStart = async () => {
    const v = await startForm.validateFields();
    const tasks: ObsTaskDto[] = (v.taskList ?? '')
      .split(/[;；\n]/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .map((content: string, i: number) => ({ id: `t${i + 1}`, content, done: false }));
    await startObservation(v.visitId, {
      bedNo: v.bedNo || undefined,
      diagnosis: v.diagnosis || undefined,
      nursingLevel: v.nursingLevel,
      expectedOutcome: v.expectedOutcome || undefined,
      pendingTasks: tasks,
    });
    message.success('已开始留观');
    setStartOpen(false);
  };

  const openUpdate = (r: ObservationDto) => {
    setUpdating(r);
    updateForm.resetFields();
    updateForm.setFieldsValue({
      status: r.status === 'observing' ? 'stable' : r.status,
      nursingLevel: r.nursingLevel,
      ivStatus: r.ivStatus ?? '',
      temperature: num(r.vitals.temperature),
      pulse: num(r.vitals.pulse),
      systolic: num(r.vitals.systolic),
      diastolic: num(r.vitals.diastolic),
      spo2: num(r.vitals.spo2),
    });
  };

  const handleUpdate = async () => {
    if (!updating) return;
    const v = await updateForm.validateFields();
    await updateObservation(updating.id, {
      status: v.status,
      nursingLevel: v.nursingLevel,
      ivStatus: v.ivStatus || null,
      vitals: {
        temperature: v.temperature ?? null,
        pulse: v.pulse ?? null,
        systolic: v.systolic ?? null,
        diastolic: v.diastolic ?? null,
        spo2: v.spo2 ?? null,
      },
    });
    message.success('留观记录已更新');
    setUpdating(null);
  };

  const handleEnd = async (r: ObservationDto, status: 'discharged' | 'admitted') => {
    await endObservation(r.id, status);
    message.success(status === 'admitted' ? `已为患者办理入院` : '已为患者办理离院');
  };

  const columns: ColumnsType<ObservationDto> = [
    {
      title: '床位',
      dataIndex: 'bedNo',
      width: 90,
      render: (v: string | null) => <b className="text-jl-primary">{v ?? '—'}</b>,
    },
    {
      title: '患者',
      width: 140,
      render: (_, r) => {
        const q = qByVisit.get(r.visitId);
        return (
          <div>
            <div className="font-semibold text-ink-primary">{q?.patientName ?? '—'}</div>
            {q && (
              <div className="text-xs text-ink-secondary">
                {q.gender} · {q.age}
              </div>
            )}
          </div>
        );
      },
    },
    { title: '诊断', dataIndex: 'diagnosis', ellipsis: true, render: (v: string | null) => v ?? '—' },
    {
      title: '生命体征',
      width: 230,
      render: (_, r) => {
        const t = num(r.vitals.temperature);
        const p = num(r.vitals.pulse);
        const s = num(r.vitals.systolic);
        const d = num(r.vitals.diastolic);
        const o = num(r.vitals.spo2);
        return (
          <div className="flex flex-wrap gap-x-2 text-xs">
            <span>T <b className={clsx(isVitalAbnormal('temperature', t) && 'text-medical-critical')}>{t ?? '--'}</b></span>
            <span>P <b className={clsx(isVitalAbnormal('pulse', p) && 'text-medical-critical')}>{p ?? '--'}</b></span>
            <span>BP <b className={clsx(isVitalAbnormal('systolic', s) && 'text-medical-critical')}>{s ?? '--'}/{d ?? '--'}</b></span>
            <span>SpO₂ <b className={clsx(isVitalAbnormal('spo2', o) && 'text-medical-critical')}>{o ?? '--'}%</b></span>
          </div>
        );
      },
    },
    {
      title: '留观时长',
      width: 120,
      render: (_, r) => {
        const m = stayOf(r);
        const over = m > OVERTIME_MIN;
        return (
          <span className={clsx('flex items-center gap-1 text-sm font-semibold', over && 'animate-pulse-slow text-medical-critical')}>
            <ClockCircleOutlined /> {fmtStay(m)}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: ObservationDto['status']) => (
        <Tag color={OBS_STATUS_META[s].color} className="mr-0">{OBS_STATUS_META[s].label}</Tag>
      ),
    },
    {
      title: '护理/治疗',
      width: 150,
      render: (_, r) => (
        <div className="text-xs">
          <div>{NURSING_LEVEL_META[r.nursingLevel]?.label ?? `${r.nursingLevel}护理`}</div>
          {r.ivStatus && <div className="text-jl-primary">{r.ivStatus}</div>}
        </div>
      ),
    },
    {
      title: '待处理',
      ellipsis: true,
      render: (_, r) => {
        const open = r.pendingTasks
          .filter((t) => !t.done)
          .map((t) => t.content ?? t.task ?? '');
        return open.length ? open.join('；') : <span className="text-ink-secondary">—</span>;
      },
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      render: (_, r) => (
        <Space size={2}>
          <Button size="small" type="link" onClick={() => openUpdate(r)}>更新</Button>
          <Button size="small" type="link" onClick={() => void handleEnd(r, 'admitted')}>入院</Button>
          <Button size="small" type="link" danger onClick={() => void handleEnd(r, 'discharged')}>离院</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card className="shadow-card">
            <div className="text-xs text-ink-secondary">在观人数</div>
            <div className="text-2xl font-semibold text-jl-primary">{active.length}</div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="shadow-card">
            <div className="text-xs text-ink-secondary">病情加重</div>
            <div className="text-2xl font-semibold text-medical-critical">{worsening}</div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="shadow-card">
            <div className="text-xs text-ink-secondary">留观超时（超过24h）</div>
            <div className="text-2xl font-semibold text-medical-critical">{overtime.length}</div>
          </Card>
        </Col>
        <Col xs={12} md={6} className="flex items-end justify-end">
          <Button type="primary" icon={<PlusCircleOutlined />} onClick={openStart} disabled={ready === false}>
            开始留观
          </Button>
        </Col>
      </Row>

      {overtime.length > 0 && (
        <Card className="shadow-card" style={{ borderLeft: '3px solid #F5222D' }}>
          <div className="flex items-center gap-2 text-sm text-medical-critical">
            <ExclamationCircleOutlined />
            <b>留观超时提醒：</b>
            {overtime.map((r) => `${qByVisit.get(r.visitId)?.patientName ?? ''}（${fmtStay(stayOf(r))}）`).join('、')}
            已超过24小时，请评估入院或离院。
          </div>
        </Card>
      )}

      <Card className="shadow-card" title={`留观患者列表（${active.length}）`} styles={{ body: { padding: 0 } }}>
        <Table rowKey="id" columns={columns} dataSource={active} pagination={false} size="middle" scroll={{ x: 1100 }} />
      </Card>

      {/* 开始留观 */}
      <Modal open={startOpen} title="开始留观" onOk={handleStart} confirmLoading={acting} onCancel={() => setStartOpen(false)} okText="开始留观">
        <Form form={startForm} layout="vertical" className="mt-2">
          <Form.Item name="visitId" label="选择患者" rules={[{ required: true }]}>
            <Select
              options={eligible.map((q) => ({ value: q.visitId, label: `${q.triageNo} ${q.patientName} · ${q.chiefComplaint ?? ''}` }))}
              notFoundContent="暂无可留观患者，请先完成分诊"
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="bedNo" label="留观床位">
                <Input placeholder="如：留观3床" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nursingLevel" label="护理等级">
                <Select options={Object.keys(NURSING_LEVEL_META).map((k) => ({ value: k, label: NURSING_LEVEL_META[k].label }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="diagnosis" label="诊断">
            <Input />
          </Form.Item>
          <Form.Item name="expectedOutcome" label="预期转归">
            <Input placeholder="如：补液观察后离院" />
          </Form.Item>
          <Form.Item name="taskList" label="待办（分号或换行分隔）">
            <Input.TextArea rows={2} placeholder="如：2小时复查体温；4小时复查血常规" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 更新留观 */}
      <Modal open={!!updating} title={`更新留观 · ${updating?.bedNo ?? ''}`} onOk={handleUpdate} confirmLoading={acting} onCancel={() => setUpdating(null)} okText="保存">
        <Form form={updateForm} layout="vertical" className="mt-2">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="status" label="病情状态">
                <Select
                  options={[
                    { value: 'stable', label: '病情稳定' },
                    { value: 'worsening', label: '病情加重' },
                    { value: 'observing', label: '继续观察' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nursingLevel" label="护理等级">
                <Select options={Object.keys(NURSING_LEVEL_META).map((k) => ({ value: k, label: NURSING_LEVEL_META[k].label }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="temperature" label="体温"><InputNumber className="w-full" step={0.1} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pulse" label="脉搏"><InputNumber className="w-full" /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="systolic" label="收缩压"><InputNumber className="w-full" /></Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="diastolic" label="舒张压"><InputNumber className="w-full" /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="spo2" label="SpO₂"><InputNumber className="w-full" /></Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="ivStatus" label="输液/治疗状态">
                <Input placeholder="如：补液中，剩余 200ml" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
