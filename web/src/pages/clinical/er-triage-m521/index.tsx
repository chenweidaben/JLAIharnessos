/**
 * 健澜科技 jlmedaios - 急诊预检分诊（M521-H，P0）
 *
 * 三甲流程：患者/就诊 Select 远程搜索 → 四级分诊 Radio.Group（Ⅰ立即/Ⅱ≤10min/Ⅲ≤30min/Ⅳ≤120min）
 * → 生命体征结构化录入（体温/脉搏/呼吸/血压/SpO₂/GCS）→ 任一异常（SpO₂<90 / SBP<90 / GCS<9）
 * 自动 Alert「建议上调分诊级别」→ 主/客观主诉 → 分诊护士签名必填留痕。
 * 历史 antd Table（级别五色 Tag）+ 详情 Modal；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：er:triage（登记）/ er:view（查看历史）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useAuthStore } from '@/store/authStore';
import { useErTriageFormStore } from '@/store/erTriageFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  TRIAGE_LEVELS,
  TRIAGE_LEVEL_COLOR,
  TRIAGE_LEVEL_LABEL,
  TRIAGE_RESPONSE_MIN,
  detectVitalAbnormal,
  type ErTriageRecord,
  type ErTriageSubmitInput,
  type TriageLevel,
  type TriageVitals,
} from '@/services/api/erTriageForm';

interface FormValues {
  visitId: string;
  level: TriageLevel;
  temperature: number;
  pulse: number;
  respiration: number;
  sbp: number;
  dbp: number;
  spo2: number;
  gcs: number;
  chiefComplaint: string;
  objective?: string;
  triagedAt: Dayjs;
  nurseSignature: string;
}

export default function ErTriageM521Page() {
  usePageTitle('急诊预检分诊');
  const { hasPermission } = usePermission();
  const canTriage = hasPermission('er:triage');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = useErTriageFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<ErTriageRecord | null>(null);

  useEffect(() => {
    void load();
    void loadVisits('');
  }, [load]);

  const loadVisits = async (keyword: string) => {
    setVisitsLoading(true);
    const res = await searchVisits(keyword);
    setVisitOptions(res.data);
    setVisitsLoading(false);
  };

  const watched = Form.useWatch([], form) ?? {};
  const vitalAbnormal = useMemo(() => {
    const v: TriageVitals = {
      temperature: watched.temperature ?? 0,
      pulse: watched.pulse ?? 0,
      respiration: watched.respiration ?? 0,
      sbp: watched.sbp ?? 0,
      dbp: watched.dbp ?? 0,
      spo2: watched.spo2 ?? 0,
      gcs: watched.gcs ?? 0,
    };
    if (!watched.sbp && !watched.spo2 && !watched.gcs) return null;
    return detectVitalAbnormal(v);
  }, [watched]);

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    form.setFieldsValue({ nurseSignature: currentUser?.realName ?? '' });
  };

  const doSubmit = async (values: FormValues) => {
    const input: ErTriageSubmitInput = {
      visitId: values.visitId,
      patientId: selectedVisit?.patientId,
      patientName: selectedVisit?.name,
      level: values.level,
      vitals: {
        temperature: values.temperature,
        pulse: values.pulse,
        respiration: values.respiration,
        sbp: values.sbp,
        dbp: values.dbp,
        spo2: values.spo2,
        gcs: values.gcs,
      },
      chiefComplaint: values.chiefComplaint.trim(),
      objective: values.objective?.trim() || undefined,
      triagedAt: values.triagedAt.toISOString(),
      nurseSignature: values.nurseSignature.trim(),
    };
    try {
      const result = await submit(input);
      if (result.demo) {
        message.warning('BFF 不可用，本次分诊已按本地演示记录留存，未写入业务库');
      } else if (result.record.needsUpgrade) {
        message.warning(`分诊已登记：${result.record.escalateReason ?? '生命体征异常'}，建议上调分诊级别`);
      } else {
        message.success(`分诊完成：${TRIAGE_LEVEL_LABEL[result.record.level]}`);
      }
      form.resetFields();
      setSelectedVisit(null);
      await load();
    } catch {
      // error 已写入 store
    }
  };

  const historyColumns = useMemo(
    () => [
      { title: '分诊时间', dataIndex: 'triagedAt', ellipsis: true, render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: ErTriageRecord) => v ?? r.visitId.slice(-6) },
      { title: '主诉', dataIndex: 'chiefComplaint', ellipsis: true },
      {
        title: '分诊级别',
        dataIndex: 'level',
        render: (v: TriageLevel) => (
          <Tag color={TRIAGE_LEVEL_COLOR[v]}>{TRIAGE_LEVEL_LABEL[v]}（{TRIAGE_RESPONSE_MIN[v]}）</Tag>
        ),
      },
      { title: 'SpO₂ / SBP / GCS', dataIndex: 'vitals', render: (v: TriageVitals) => `${v.spo2}% / ${v.sbp} / ${v.gcs}` },
      { title: '升档提示', dataIndex: 'needsUpgrade', render: (v: boolean, r: ErTriageRecord) => (v ? <Tag color="red">{r.escalateReason ?? '建议升档'}</Tag> : <Tag color="green">无</Tag>) },
      { title: '候诊区', dataIndex: 'waitArea', render: (v: string | null) => v ?? '—' },
      { title: '分诊护士', dataIndex: 'nurseSignature' },
      {
        title: '操作',
        render: (_: unknown, r: ErTriageRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="急诊预检分诊"
      description="四级分诊（Ⅰ立即/Ⅱ≤10min/Ⅲ≤30min/Ⅳ≤120min）· 生命体征异常自动升档提示"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建急诊分诊" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{
            level: 'level3' as TriageLevel,
            triagedAt: dayjs(),
            temperature: 36.5,
            pulse: 75,
            respiration: 18,
            sbp: 120,
            dbp: 75,
            spo2: 98,
            gcs: 15,
            nurseSignature: currentUser?.realName ?? '',
          }}
        >
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="visitId" label="患者 / 就诊（远程搜索）" rules={[{ required: true, message: '请选择患者/就诊' }]}>
                <Select
                  showSearch
                  placeholder="输入姓名 / 科室 / 诊断搜索"
                  loading={visitsLoading}
                  options={visitOptions.map((v) => ({ value: v.visitId, label: `${v.name} · ${v.dept} · ${v.diagnosis}` }))}
                  onSearch={loadVisits}
                  onFocus={() => loadVisits('')}
                  onChange={onVisitChange}
                  filterOption={false}
                />
              </Form.Item>
            </Col>
            {selectedVisit && (
              <Col span={14}>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 30 }}
                  message={`${selectedVisit.name}（${selectedVisit.gender === 'male' ? '男' : '女'} · ${selectedVisit.age} 岁 · ${selectedVisit.bedNo}）`}
                  description={`诊断：${selectedVisit.diagnosis}`}
                />
              </Col>
            )}
          </Row>

          <Form.Item name="level" label="分诊级别（含响应时限）" rules={[{ required: true, message: '请选择分诊级别' }]}>
            <Radio.Group>
              <Space wrap>
                {TRIAGE_LEVELS.map((lv) => (
                  <Radio.Button key={lv} value={lv}>
                    <Tag color={TRIAGE_LEVEL_COLOR[lv]} style={{ marginInlineEnd: 0 }}>
                      {TRIAGE_LEVEL_LABEL[lv]} · {TRIAGE_RESPONSE_MIN[lv]}
                    </Tag>
                  </Radio.Button>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>

          <Row gutter={16}>
            <Col span={6}><Form.Item name="temperature" label="体温 (℃)" rules={[{ required: true, type: 'number', message: '请输入体温' }]}><InputNumber className="w-full" min={30} max={45} step={0.1} /></Form.Item></Col>
            <Col span={6}><Form.Item name="pulse" label="脉搏 (次/分)" rules={[{ required: true, type: 'number', message: '请输入脉搏' }]}><InputNumber className="w-full" min={0} max={250} /></Form.Item></Col>
            <Col span={6}><Form.Item name="respiration" label="呼吸 (次/分)" rules={[{ required: true, type: 'number', message: '请输入呼吸' }]}><InputNumber className="w-full" min={0} max={80} /></Form.Item></Col>
            <Col span={6}><Form.Item name="sbp" label="收缩压 (mmHg)" rules={[{ required: true, type: 'number', message: '请输入收缩压' }]}><InputNumber className="w-full" min={0} max={300} /></Form.Item></Col>
            <Col span={6}><Form.Item name="dbp" label="舒张压 (mmHg)" rules={[{ required: true, type: 'number', message: '请输入舒张压' }]}><InputNumber className="w-full" min={0} max={200} /></Form.Item></Col>
            <Col span={6}><Form.Item name="spo2" label="SpO₂ (%)" rules={[{ required: true, type: 'number', message: '请输入 SpO₂' }]}><InputNumber className="w-full" min={50} max={100} /></Form.Item></Col>
            <Col span={6}><Form.Item name="gcs" label="GCS" rules={[{ required: true, type: 'number', min: 3, max: 15, message: '请输入 GCS（3–15）' }]}><InputNumber className="w-full" min={3} max={15} /></Form.Item></Col>
          </Row>

          {vitalAbnormal && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={`${vitalAbnormal}：建议上调分诊级别`}
            />
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="chiefComplaint" label="主诉（客观病史摘要）" rules={[{ required: true, message: '请输入主诉' }]}>
                <Input.TextArea rows={3} placeholder="主诉与现病史" maxLength={200} showCount />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="objective" label="客观发现（可选）">
                <Input.TextArea rows={3} placeholder="体格检查 / 初步印象" maxLength={200} showCount />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="triagedAt" label="分诊时间" rules={[{ required: true, message: '请选择分诊时间' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nurseSignature"
                label="分诊护士签名（必填）"
                rules={[{ required: true, message: '请签署分诊护士姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="分诊护士本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canTriage}>提交分诊</Button>
            {!canTriage && <Typography.Text type="secondary">当前账号缺少 er:triage 权限，无法登记</Typography.Text>}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`急诊分诊记录${demo ? '（演示数据）' : ''}`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.id}
            dataSource={records}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1000 }}
          />
        </Spin>
      </Card>

      <Modal
        open={detailRecord != null}
        title="急诊分诊详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId}</div>
            <div>
              级别：<Tag color={TRIAGE_LEVEL_COLOR[detailRecord.level]}>{TRIAGE_LEVEL_LABEL[detailRecord.level]}（{TRIAGE_RESPONSE_MIN[detailRecord.level]}）</Tag>
            </div>
            <div>主诉：{detailRecord.chiefComplaint}</div>
            <div>
              生命体征：T {detailRecord.vitals.temperature}℃ · P {detailRecord.vitals.pulse} · R {detailRecord.vitals.respiration} · BP {detailRecord.vitals.sbp}/{detailRecord.vitals.dbp} · SpO₂ {detailRecord.vitals.spo2}% · GCS {detailRecord.vitals.gcs}
            </div>
            {detailRecord.needsUpgrade && <Alert type="warning" showIcon message={detailRecord.escalateReason ?? '建议上调分诊级别'} />}
            <div>分诊护士：{detailRecord.nurseSignature} · 时间：{dayjs(detailRecord.triagedAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
