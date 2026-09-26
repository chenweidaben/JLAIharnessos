/**
 * 健澜科技 jlmedaios - 护士护理记录与任务工作台（M1-B2，真实 BFF）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import {
  CheckCircleOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { useCareStore } from '@/store/careStore';
import type {
  NursingLevel,
  NursingRecordDto,
  NursingTaskDto,
  NursingTaskType,
  RiskLevel,
} from '@/types/care';
import {
  NURSING_LEVEL_META,
  RISK_META,
  SHIFT_META,
  TASK_STATUS_META,
  TASK_TYPE_META,
} from './constants';

const numberOrNull = (v: unknown): number | null => (typeof v === 'number' ? v : null);
const textOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

const makeIdempotencyKey = (): string => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `nt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export default function NursingStation() {
  const { message } = AntdApp.useApp();
  const {
    selectedVisitId,
    nursingRecords,
    nursingTasks,
    loadingRecords,
    loadingTasks,
    acting,
    fetchNursingRecords,
    fetchNursingTasks,
    createNursingRecord,
    signNursingRecord,
    createNursingTask,
    executeNursingTask,
  } = useCareStore();

  const [recordOpen, setRecordOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [executing, setExecuting] = useState<NursingTaskDto | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [recordForm] = Form.useForm();
  const [taskForm] = Form.useForm();
  const [executeForm] = Form.useForm();

  useEffect(() => {
    if (selectedVisitId) {
      void fetchNursingRecords(selectedVisitId);
      void fetchNursingTasks(selectedVisitId);
    }
  }, [selectedVisitId, fetchNursingRecords, fetchNursingTasks]);

  const openRecord = () => {
    recordForm.resetFields();
    recordForm.setFieldsValue({ shift: 'day', nursingLevel: 'level2', aiAssisted: false });
    setRecordOpen(true);
  };

  const handleRecord = async () => {
    if (!selectedVisitId) return;
    const v = await recordForm.validateFields();
    await createNursingRecord({
      visitId: selectedVisitId,
      shift: v.shift,
      nursingLevel: v.nursingLevel,
      vitals: {
        temperature: numberOrNull(v.temperature),
        pulse: numberOrNull(v.pulse),
        respiration: numberOrNull(v.respiration),
        systolic: numberOrNull(v.systolic),
        diastolic: numberOrNull(v.diastolic),
        spo2: numberOrNull(v.spo2),
        painScore: numberOrNull(v.painScore),
      },
      intake: {
        oral: numberOrNull(v.oral),
        iv: numberOrNull(v.iv),
        tube: numberOrNull(v.tube),
      },
      output: {
        urine: numberOrNull(v.urine),
        stool: numberOrNull(v.stool),
        drainage: numberOrNull(v.drainage),
        emesis: numberOrNull(v.emesis),
      },
      measures: textOrNull(v.measures),
      pressureSoreRisk: v.pressureSoreRisk as RiskLevel,
      fallRisk: v.fallRisk as RiskLevel,
      riskAssessment: {
        bradenScore: numberOrNull(v.bradenScore),
        morseScore: numberOrNull(v.morseScore),
        note: textOrNull(v.riskNote),
      },
      aiAssisted: Boolean(v.aiAssisted),
    });
    message.success('护理记录草稿已创建，请责任护士签名');
    setRecordOpen(false);
  };

  const openTask = () => {
    taskForm.resetFields();
    const key = makeIdempotencyKey();
    setIdempotencyKey(key);
    taskForm.setFieldsValue({ taskType: 'vitals', scheduledAt: dayjs() });
    setTaskOpen(true);
  };

  const handleTask = async () => {
    if (!selectedVisitId) return;
    const v = await taskForm.validateFields();
    await createNursingTask({
      visitId: selectedVisitId,
      taskType: v.taskType as NursingTaskType,
      content: v.content.trim(),
      scheduledAt: v.scheduledAt ? v.scheduledAt.toISOString() : null,
      idempotencyKey,
    });
    message.success('护理任务已创建');
    setTaskOpen(false);
  };

  const openExecute = (task: NursingTaskDto) => {
    setExecuting(task);
    executeForm.resetFields();
  };

  const handleExecute = async () => {
    if (!executing) return;
    const v = await executeForm.validateFields();
    const r = await executeNursingTask(executing.id, textOrNull(v.result) ?? undefined);
    message.success(r.deduplicated ? '任务已由他人执行，本次为幂等返回' : '护理任务已执行');
    setExecuting(null);
  };

  const recordColumns: ColumnsType<NursingRecordDto> = [
    {
      title: '记录编号',
      dataIndex: 'recordNo',
      width: 150,
      render: (v: string) => <b className="text-jl-primary">{v}</b>,
    },
    {
      title: '时间 / 班次',
      width: 170,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <span>{new Date(r.recordedAt).toLocaleString('zh-CN')}</span>
          <Tag className="mr-0 w-fit">{SHIFT_META[r.shift].label}</Tag>
        </Space>
      ),
    },
    {
      title: '护理级别',
      dataIndex: 'nursingLevel',
      width: 100,
      render: (v: NursingLevel) => <Tag color={NURSING_LEVEL_META[v].color}>{NURSING_LEVEL_META[v].label}</Tag>,
    },
    {
      title: '生命体征',
      width: 250,
      render: (_, r) => (
        <span className="text-xs">
          T {String(r.vitals.temperature ?? '--')} / P {String(r.vitals.pulse ?? '--')} / R{' '}
          {String(r.vitals.respiration ?? '--')} / BP {String(r.vitals.systolic ?? '--')}/
          {String(r.vitals.diastolic ?? '--')} / SpO₂ {String(r.vitals.spo2 ?? '--')}%
        </span>
      ),
    },
    {
      title: '出入量',
      width: 190,
      render: (_, r) => (
        <span className="text-xs">
          入：{String(r.intake.oral ?? 0)}/{String(r.intake.iv ?? 0)}ml；出：尿
          {String(r.output.urine ?? 0)} / 引{String(r.output.drainage ?? 0)}ml
        </span>
      ),
    },
    {
      title: '风险',
      width: 140,
      render: (_, r) => (
        <Space size={2}>
          <Tag color={RISK_META[r.pressureSoreRisk].color}>压疮{RISK_META[r.pressureSoreRisk].label}</Tag>
          <Tag color={RISK_META[r.fallRisk].color}>跌倒{RISK_META[r.fallRisk].label}</Tag>
        </Space>
      ),
    },
    {
      title: '状态',
      width: 130,
      fixed: 'right',
      render: (_, r) =>
        r.status === 'draft' ? (
          <Button
            size="small"
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={() => void signNursingRecord(r.id)}
          >
            本人签名
          </Button>
        ) : (
          <Tag color="success">
            <CheckCircleOutlined /> 已签名
          </Tag>
        ),
    },
  ];

  const taskColumns: ColumnsType<NursingTaskDto> = [
    {
      title: '任务编号',
      dataIndex: 'taskNo',
      width: 140,
      render: (v: string) => <b className="text-jl-primary">{v}</b>,
    },
    {
      title: '类型',
      dataIndex: 'taskType',
      width: 110,
      render: (v: NursingTaskType) => <Tag>{TASK_TYPE_META[v].label}</Tag>,
    },
    {
      title: '计划时间',
      dataIndex: 'scheduledAt',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    { title: '任务内容', dataIndex: 'content', ellipsis: true },
    {
      title: '执行结果',
      width: 220,
      render: (_, r) =>
        r.result ? (
          <Space direction="vertical" size={0}>
            <span className="text-xs">{r.result}</span>
            <span className="text-[10px] text-ink-secondary">
              {r.executedAt ? new Date(r.executedAt).toLocaleString('zh-CN') : ''}
            </span>
          </Space>
        ) : (
          '--'
        ),
    },
    {
      title: '状态 / 操作',
      width: 130,
      fixed: 'right',
      render: (_, r) =>
        r.status === 'pending' ? (
          <Button size="small" type="primary" onClick={() => openExecute(r)}>
            执行
          </Button>
        ) : (
          <Tag color={TASK_STATUS_META[r.status].color}>{TASK_STATUS_META[r.status].label}</Tag>
        ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card
        size="small"
        title="护理记录单 · 生命体征 / 出入量 / 风险评估"
        extra={
          <Button icon={<PlusOutlined />} onClick={openRecord} disabled={!selectedVisitId}>
            新建护理记录
          </Button>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="id"
          size="small"
          columns={recordColumns}
          dataSource={nursingRecords}
          loading={loadingRecords}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 6, showSizeChanger: false }}
        />
      </Card>

      <Card
        size="small"
        title="护理任务 · CAS 执行 / 并发幂等"
        extra={
          <Button icon={<PlusOutlined />} onClick={openTask} disabled={!selectedVisitId}>
            新建任务
          </Button>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="id"
          size="small"
          columns={taskColumns}
          dataSource={nursingTasks}
          loading={loadingTasks}
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 6, showSizeChanger: false }}
        />
      </Card>

      <Modal
        open={recordOpen}
        title="新建护理记录"
        width={920}
        confirmLoading={acting}
        onOk={handleRecord}
        onCancel={() => setRecordOpen(false)}
        okText="保存草稿"
      >
        <Form form={recordForm} layout="vertical" className="mt-2">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="nursingLevel" label="护理级别" rules={[{ required: true }]}>
                <Select
                  options={(Object.keys(NURSING_LEVEL_META) as NursingLevel[]).map((k) => ({
                    value: k,
                    label: NURSING_LEVEL_META[k].label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="shift" label="班次">
                <Select options={(Object.keys(SHIFT_META) as Array<'day' | 'night'>).map((k) => ({ value: k, label: SHIFT_META[k].label }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="aiAssisted" label="AI 辅助" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={6}><Form.Item name="temperature" label="体温 ℃"><InputNumber className="w-full" step={0.1} /></Form.Item></Col>
            <Col span={6}><Form.Item name="pulse" label="脉搏"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="respiration" label="呼吸"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="painScore" label="疼痛 NRS"><InputNumber className="w-full" min={0} max={10} /></Form.Item></Col>
            <Col span={6}><Form.Item name="systolic" label="收缩压"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="diastolic" label="舒张压"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="spo2" label="SpO₂ %"><InputNumber className="w-full" /></Form.Item></Col>
          </Row>

          <Row gutter={12}>
            <Col span={6}><Form.Item name="oral" label="口服入量 ml"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="iv" label="静脉入量 ml"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="tube" label="管喂入量 ml"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="urine" label="尿量 ml"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="stool" label="大便 g/ml"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="drainage" label="引流 ml"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="emesis" label="呕吐物 ml"><InputNumber className="w-full" /></Form.Item></Col>
          </Row>

          <Form.Item name="measures" label="护理措施">
            <Input.TextArea rows={2} placeholder="如：吸氧、心电监护、体位护理、管路护理等" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="pressureSoreRisk" label="压疮风险">
                <Select options={(Object.keys(RISK_META) as RiskLevel[]).map((k) => ({ value: k, label: RISK_META[k].label }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fallRisk" label="跌倒风险">
                <Select options={(Object.keys(RISK_META) as RiskLevel[]).map((k) => ({ value: k, label: RISK_META[k].label }))} />
              </Form.Item>
            </Col>
            <Col span={6}><Form.Item name="bradenScore" label="Braden 分"><InputNumber className="w-full" /></Form.Item></Col>
            <Col span={6}><Form.Item name="morseScore" label="Morse 分"><InputNumber className="w-full" /></Form.Item></Col>
          </Row>
          <Form.Item name="riskNote" label="风险评估备注">
            <Input placeholder="预防措施、告知、床旁交接等" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={taskOpen}
        title="新建护理任务"
        confirmLoading={acting}
        onOk={handleTask}
        onCancel={() => setTaskOpen(false)}
        okText="创建任务"
      >
        <Form form={taskForm} layout="vertical" className="mt-2">
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="taskType" label="任务类型">
                <Select
                  options={(Object.keys(TASK_TYPE_META) as NursingTaskType[]).map((k) => ({
                    value: k,
                    label: TASK_TYPE_META[k].label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="scheduledAt" label="计划时间">
                <DatePicker showTime className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="content"
            label="任务内容"
            rules={[{ required: true, message: '任务内容不能为空' }]}
          >
            <Input.TextArea rows={3} placeholder="如：15:00 测量血压并记录；观察穿刺点有无渗血" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!executing}
        title="执行护理任务"
        confirmLoading={acting}
        onOk={handleExecute}
        onCancel={() => setExecuting(null)}
        okText="确认执行"
      >
        <Form form={executeForm} layout="vertical" className="mt-2">
          <Form.Item name="result" label="执行结果">
            <Input.TextArea rows={4} placeholder="请记录客观执行情况、患者反应和异常处理" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
