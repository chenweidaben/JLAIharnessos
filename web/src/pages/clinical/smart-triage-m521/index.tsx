/**
 * 健澜科技 jlmedaios - 智能预问诊（M540，P0）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出信息 → age/gender → chiefComplaint
 * → 生命体征 6 项 InputNumber（temperature/pulse/sbp/dbp/spo2/gcs）→ symptoms 多选
 * → 实时预览规则引擎结果：Ⅰ 级深红 / Ⅱ 级红 / Ⅲ 级橙 / Ⅳ 级绿 + waitArea 提示；
 * Ⅰ/Ⅱ 级红色 Alert「需升级分诊（抢救室）」。
 * 签名留痕，后端规则引擎二次计算 triageLevel / recommendedDeptCode / waitArea / needsUpgrade。
 * 历史 antd Table（level 彩色 Tag）+ 详情 Modal；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：triage:smart（登记）/ triage:view（查看历史）。
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
import { useSmartTriageFormStore } from '@/store/smartTriageFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  DEPT_LABEL,
  LEVEL_COLOR,
  LEVEL_LABEL,
  SYMPTOM_OPTIONS,
  WAIT_AREA_LABEL,
  runRuleEngine,
  waitAreaOf,
  type SmartTriageRecord,
  type SmartTriageSubmitInput,
  type SmartVitals,
  type TriageLevel,
} from '@/services/api/smartTriageForm';

interface FormValues {
  visitId: string;
  age: number;
  gender: 'male' | 'female';
  chiefComplaint: string;
  vitals: SmartVitals;
  symptoms: string[];
  triagedAt: Dayjs;
  signature: string;
}

export default function SmartTriageM521Page() {
  usePageTitle('智能预问诊');
  const { hasPermission } = usePermission();
  const canTriage = hasPermission('triage:smart');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = useSmartTriageFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<SmartTriageRecord | null>(null);

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
  const preview = useMemo(() => {
    const v = watched.vitals as SmartVitals | undefined;
    if (!v || typeof v.temperature !== 'number' || typeof v.pulse !== 'number' ||
        typeof v.sbp !== 'number' || typeof v.spo2 !== 'number' || typeof v.gcs !== 'number') {
      return null;
    }
    const level = runRuleEngine(v, (watched.symptoms as string[]) ?? []);
    return { level, waitArea: waitAreaOf(level) };
  }, [watched]);

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    form.setFieldsValue({
      age: opt?.age,
      gender: opt?.gender,
      signature: currentUser?.realName ?? '',
    });
  };

  const doSubmit = async (values: FormValues) => {
    const input: SmartTriageSubmitInput = {
      patientId: selectedVisit?.patientId ?? '',
      patientName: selectedVisit?.name,
      age: values.age,
      gender: values.gender,
      chiefComplaint: values.chiefComplaint.trim(),
      vitals: values.vitals,
      symptoms: values.symptoms ?? [],
      triagedAt: values.triagedAt.toISOString(),
      signature: values.signature.trim(),
      assessorName: currentUser?.realName ?? '当前用户',
    };
    try {
      const result = await submit(input);
      if (result.demo) {
        message.warning('BFF 不可用，本次分诊已按本地演示记录留存，未写入业务库');
      } else if (result.record.needsUpgrade) {
        message.warning(`分诊完成：${LEVEL_LABEL[result.record.triageLevel]}，${WAIT_AREA_LABEL[result.record.waitArea]}，需升级分诊`);
      } else {
        message.success(`分诊完成：${LEVEL_LABEL[result.record.triageLevel]}，${WAIT_AREA_LABEL[result.record.waitArea]}`);
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
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: SmartTriageRecord) => v ?? r.patientId },
      { title: '主诉', dataIndex: 'chiefComplaint', ellipsis: true },
      { title: '分诊级别', dataIndex: 'triageLevel', render: (v: TriageLevel) => <Tag color={LEVEL_COLOR[v]}>{LEVEL_LABEL[v]}</Tag> },
      { title: '建议科室', dataIndex: 'recommendedDeptCode', render: (v: string) => DEPT_LABEL[v] ?? v },
      { title: '候诊区', dataIndex: 'waitArea', render: (v: SmartTriageRecord['waitArea']) => WAIT_AREA_LABEL[v] },
      { title: '升级', dataIndex: 'needsUpgrade', render: (v: boolean) => (v ? <Tag color="red">需升级</Tag> : <Tag color="green">否</Tag>) },
      {
        title: '操作',
        render: (_: unknown, r: SmartTriageRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="智能预问诊"
      description="规则引擎：spo2<90 / gcs<9 / sbp<90 → Ⅰ 级；体温≥39 或 脉搏≥120 → Ⅱ 级；急症关键词 → Ⅲ 级；轻症 → Ⅳ 级"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建智能分诊" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{
            gender: 'male' as const,
            vitals: { temperature: 36.5, pulse: 75, sbp: 120, dbp: 75, spo2: 99, gcs: 15 } as SmartVitals,
            symptoms: [] as string[],
            triagedAt: dayjs(),
            signature: currentUser?.realName ?? '',
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

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="age" label="年龄" rules={[{ required: true, message: '请输入年龄' }]}>
                <InputNumber className="w-full" min={0} max={130} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
                <Radio.Group>
                  <Radio.Button value="male">男</Radio.Button>
                  <Radio.Button value="female">女</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="chiefComplaint" label="主诉" rules={[{ required: true, message: '请输入主诉' }]}>
                <Input placeholder="如 chest pain / fever / abdominal pain" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>

          <Card size="small" type="inner" title="生命体征" style={{ marginBottom: 12 }}>
            <Row gutter={16}>
              {([
                ['temperature', '体温（℃）', 35, 42, 0.1],
                ['pulse', '脉搏（次/分）', 30, 200, 1],
                ['sbp', '收缩压（mmHg）', 50, 250, 1],
                ['dbp', '舒张压（mmHg）', 30, 150, 1],
                ['spo2', 'SpO₂（%）', 50, 100, 1],
                ['gcs', 'GCS（3-15）', 3, 15, 1],
              ] as const).map(([field, label, min, max, step]) => (
                <Col span={4} key={field}>
                  <Form.Item name={['vitals', field]} label={label} rules={[{ required: true, message: '必填' }]}>
                    <InputNumber className="w-full" min={min} max={max} step={step} />
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Card>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="symptoms" label="症状标签（可多选）">
                <Select mode="multiple" options={SYMPTOM_OPTIONS} placeholder="选择已采集症状" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="triagedAt" label="分诊时间" rules={[{ required: true, message: '请选择时间' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="signature"
                label="分诊医师电子签名"
                rules={[{ required: true, message: '请签署分诊医师姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="分诊医师本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          {preview && (
            <Alert
              type={preview.level <= 2 ? 'error' : 'success'}
              showIcon
              style={{ marginBottom: 12 }}
              message={
                preview.level <= 2
                  ? `实时分诊：${LEVEL_LABEL[preview.level]}（${WAIT_AREA_LABEL[preview.waitArea]}）——需升级分诊`
                  : `实时分诊：${LEVEL_LABEL[preview.level]}（${WAIT_AREA_LABEL[preview.waitArea]}）`
              }
            />
          )}

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canTriage}>提交分诊</Button>
            {!canTriage && <Typography.Text type="secondary">当前账号缺少 triage:smart 权限，无法登记</Typography.Text>}
            {preview && <Tag color={LEVEL_COLOR[preview.level]}>{LEVEL_LABEL[preview.level]} · {WAIT_AREA_LABEL[preview.waitArea]}</Tag>}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`智能分诊记录${demo ? '（演示数据）' : ''}`}>
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
        title="智能分诊详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId} · {detailRecord.age} 岁 · {detailRecord.gender === 'male' ? '男' : '女'}</div>
            <div>主诉：{detailRecord.chiefComplaint}</div>
            <div>
              体征：体温 {detailRecord.vitals.temperature}℃ · 脉搏 {detailRecord.vitals.pulse} · 血压 {detailRecord.vitals.sbp}/{detailRecord.vitals.dbp} · SpO₂ {detailRecord.vitals.spo2}% · GCS {detailRecord.vitals.gcs}
            </div>
            <div>症状：{detailRecord.symptoms.join('，') || '—'}</div>
            <div>
              分诊：<Tag color={LEVEL_COLOR[detailRecord.triageLevel]}>{LEVEL_LABEL[detailRecord.triageLevel]}</Tag>
              · 建议科室：{DEPT_LABEL[detailRecord.recommendedDeptCode] ?? detailRecord.recommendedDeptCode}
              · 候诊区：{WAIT_AREA_LABEL[detailRecord.waitArea]}
              {detailRecord.needsUpgrade && <Tag color="red">需升级</Tag>}
            </div>
            <div>分诊医师：{detailRecord.assessorName ?? detailRecord.signature} · 时间：{dayjs(detailRecord.triagedAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
