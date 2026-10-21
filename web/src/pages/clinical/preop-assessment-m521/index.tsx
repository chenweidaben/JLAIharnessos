/**
 * 健澜科技 jlmedaios - 术前访视 · ASA 分级评估（M521-A，P0 首批）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出姓名/性别/年龄/床号/诊断 → ASA I–VI
 * Radio.Group 附分级定义 → BMI/血压/心率/Mallampati/既往麻醉史/过敏史/末次进食饮水
 * /抗凝药核查结构化录入 → 高风险(III–VI)麻醉科主任复评 Modal → 知情同意本人签名留痕。
 * 历史 antd Table + 状态 Tag；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：preop:assess（登记）/ preop:view（查看历史）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
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
import { SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useAuthStore } from '@/store/authStore';
import { usePreopAssessmentFormStore } from '@/store/preopAssessmentFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  ASA_LABEL,
  ASA_DEFINITION,
  MALLAMPATI_LABEL,
  PRIOR_ANESTHESIA_LABEL,
  isHighRiskAsa,
  type AsaGrade,
  type Mallampati,
  type PriorAnesthesia,
  type PreopRecord,
  type PreopSubmitInput,
} from '@/services/api/preopAssessmentForm';

const { TextArea } = Input;

const ASA_TAG_COLOR: Record<AsaGrade, string> = {
  I: 'green',
  II: 'blue',
  III: 'orange',
  IV: 'red',
  V: 'purple',
  VI: 'default',
};

const ALLERGY_ITEMS = [
  { value: 'drug', label: '药物过敏' },
  { value: 'food', label: '食物过敏' },
  { value: 'tape', label: '胶布过敏' },
];

interface FormValues {
  visitId: string;
  asaGrade: AsaGrade;
  bmi?: number;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  mallampati: Mallampati;
  priorAnesthesia: PriorAnesthesia;
  allergyChecked: 'yes' | 'no';
  allergyDetail: string[];
  lastMealAt: Dayjs;
  onAnticoagulant: 'yes' | 'no';
  npoConfirmed: boolean;
  consentSigned: boolean;
  signature: string;
  assessmentNote?: string;
}

export default function PreopAssessmentM521Page() {
  usePageTitle('术前访视 · ASA 分级评估');
  const { hasPermission } = usePermission();
  const canAssess = hasPermission('preop:assess');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = usePreopAssessmentFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [highRiskConfirmOpen, setHighRiskConfirmOpen] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [detailRecord, setDetailRecord] = useState<PreopRecord | null>(null);

  useEffect(() => {
    void load();
    // 初始患者队列（空关键字）
    void loadVisits('');
  }, [load]);

  const loadVisits = async (keyword: string) => {
    setVisitsLoading(true);
    const res = await searchVisits(keyword);
    setVisitOptions(res.data);
    setVisitsLoading(false);
  };

  const selectedAsa = Form.useWatch('asaGrade', form);
  const highRisk = selectedAsa ? isHighRiskAsa(selectedAsa) : false;
  const allergyDetail = Form.useWatch('allergyDetail', form) ?? [];
  const onAnticoagulant = Form.useWatch('onAnticoagulant', form);

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    // 上级变更清空失效下级
    form.setFieldsValue({
      mallampati: undefined,
      priorAnesthesia: undefined,
      allergyChecked: undefined,
      allergyDetail: [],
      onAnticoagulant: undefined,
      npoConfirmed: false,
      consentSigned: false,
      signature: currentUser?.realName ?? '',
    });
  };

  const buildSubmitInput = (values: FormValues): PreopSubmitInput => ({
    visitId: values.visitId,
    patientId: selectedVisit?.patientId,
    patientName: selectedVisit?.name,
    asaGrade: values.asaGrade,
    npoConfirmed: values.npoConfirmed,
    allergyChecked: values.allergyChecked === 'yes',
    consentSigned: values.consentSigned,
    bmi: values.bmi,
    systolicBp: values.systolicBp,
    diastolicBp: values.diastolicBp,
    heartRate: values.heartRate,
    mallampati: values.mallampati,
    priorAnesthesia: values.priorAnesthesia,
    allergyDrug: allergyDetail.includes('drug'),
    allergyFood: allergyDetail.includes('food'),
    allergyTape: allergyDetail.includes('tape'),
    lastMealAt: values.lastMealAt ? values.lastMealAt.toISOString() : undefined,
    onAnticoagulant: values.onAnticoagulant === 'yes',
    assessmentNote: values.assessmentNote,
    signature: values.signature.trim(),
    assessorName: currentUser?.realName ?? '当前用户',
  });

  const doSubmit = async (values: FormValues) => {
    try {
      const result = await submit(buildSubmitInput(values));
      if (result.demo) {
        message.warning('BFF 不可用，本次术前访视已按本地演示记录留存，未写入业务库');
      } else {
        message.success(`术前访视完成：${ASA_LABEL[result.record.asaGrade]}${result.record.highRisk ? '（高风险，已生成主任复评待办）' : ''}`);
      }
      form.resetFields();
      setSelectedVisit(null);
      setReviewConfirmed(false);
      await load();
    } catch {
      // error 已写入 store，由 Alert 统一展示
    }
  };

  const onFinish = async (values: FormValues) => {
    if (highRisk && !reviewConfirmed) {
      setHighRiskConfirmOpen(true);
      return;
    }
    await doSubmit(values);
  };

  const confirmHighRisk = async () => {
    setHighRiskConfirmOpen(false);
    const values = await form.validateFields();
    await doSubmit(values);
  };

  const historyColumns = useMemo(
    () => [
      { title: '评估时间', dataIndex: 'assessedAt', ellipsis: true, render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: PreopRecord) => v ?? r.visitId.slice(-6) },
      { title: 'ASA 分级', dataIndex: 'asaGrade', render: (g: AsaGrade) => <Tag color={ASA_TAG_COLOR[g]}>{ASA_LABEL[g]}</Tag> },
      { title: '气道', dataIndex: 'mallampati', render: (v?: Mallampati) => (v ? `Mallampati ${v}` : '—') },
      { title: '血压/心率', render: (_: unknown, r: PreopRecord) => (r.systolicBp ? `${r.systolicBp}/${r.diastolicBp} mmHg · HR ${r.heartRate}` : '—') },
      { title: '过敏核查', dataIndex: 'allergyChecked', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '已核查' : '未核查'}</Tag> },
      { title: 'NPO', dataIndex: 'npoConfirmed', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '已确认' : '未确认'}</Tag> },
      { title: '知情同意', dataIndex: 'consentSigned', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '已签署' : '未签署'}</Tag> },
      { title: '完成度', dataIndex: 'complete', render: (v: boolean, r: PreopRecord) => (v ? <Tag color="green">完整</Tag> : <Tag color="orange">{`缺 ${(r.missing ?? []).length} 项`}</Tag>) },
      { title: '高风险', dataIndex: 'highRisk', render: (v: boolean) => (v ? <Tag color="red">需主任复评</Tag> : <Tag color="green">常规</Tag>) },
      { title: '签名', dataIndex: 'signature', render: (v?: string) => v ?? '—' },
      {
        title: '操作',
        render: (_: unknown, r: PreopRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="术前访视 · ASA 分级评估"
      description="麻醉前系统评估 · 气道与过敏史核查 · 知情同意留痕 · 高风险自动生成主任复评待办"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建术前访视" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          initialValues={{ signature: currentUser?.realName ?? '', lastMealAt: dayjs().subtract(8, 'hour') }}
        >
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                name="visitId"
                label="患者 / 就诊（远程搜索）"
                rules={[{ required: true, message: '请选择患者/就诊' }]}
              >
                <Select
                  showSearch
                  placeholder="输入姓名 / 科室 / 诊断搜索"
                  loading={visitsLoading}
                  options={visitOptions.map((v) => ({
                    value: v.visitId,
                    label: `${v.name} · ${v.dept} · ${v.diagnosis}`,
                  }))}
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
                  description={`诊断：${selectedVisit.diagnosis}${selectedVisit.diagnosisIcd10 ? `（ICD-10 ${selectedVisit.diagnosisIcd10}）` : ''}`}
                />
              </Col>
            )}
          </Row>

          <Form.Item
            name="asaGrade"
            label="ASA 体格状态分级"
            rules={[{ required: true, message: '请选择 ASA 分级' }]}
          >
            <Radio.Group>
              <Row gutter={[16, 8]}>
                {(Object.keys(ASA_LABEL) as AsaGrade[]).map((g) => (
                  <Col span={12} key={g}>
                    <Radio value={g} style={{ alignItems: 'flex-start' }}>
                      <div>
                        <Typography.Text strong>{ASA_LABEL[g]}</Typography.Text>
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{ASA_DEFINITION[g]}</Typography.Text>
                        </div>
                      </div>
                    </Radio>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </Form.Item>

          {highRisk && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="ASA III–VI 为高风险患者"
              description="须由麻醉科主任复评签字后方可进入手术安排；提交前请完成下方主任复评确认。"
            />
          )}

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="bmi" label="BMI (kg/m²)" rules={[{ type: 'number', min: 10, max: 60, message: 'BMI 须在 10–60 之间' }]}>
                <InputNumber min={10} max={60} step={0.1} placeholder="如 23.4" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="systolicBp" label="收缩压 (mmHg)" rules={[{ type: 'number', min: 60, max: 260, message: '收缩压 60–260' }]}>
                <InputNumber min={60} max={260} placeholder="如 138" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="diastolicBp" label="舒张压 (mmHg)" rules={[{ type: 'number', min: 30, max: 160, message: '舒张压 30–160' }]}>
                <InputNumber min={30} max={160} placeholder="如 86" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="heartRate" label="心率 (次/分)" rules={[{ type: 'number', min: 30, max: 220, message: '心率 30–220' }]}>
                <InputNumber min={30} max={220} placeholder="如 78" className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="mallampati" label="Mallampati 气道分级" rules={[{ required: true, message: '请选择气道分级' }]}>
                <Select
                  placeholder="选择气道分级"
                  options={(Object.keys(MALLAMPATI_LABEL) as Mallampati[]).map((m) => ({ value: m, label: MALLAMPATI_LABEL[m] }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priorAnesthesia" label="既往麻醉史" rules={[{ required: true, message: '请选择既往麻醉史' }]}>
                <Select
                  placeholder="选择既往麻醉情况"
                  options={(Object.keys(PRIOR_ANESTHESIA_LABEL) as PriorAnesthesia[]).map((p) => ({ value: p, label: PRIOR_ANESTHESIA_LABEL[p] }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="lastMealAt" label="末次进食 / 饮水时间" rules={[{ required: true, message: '请选择末次进食饮水时间' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" placeholder="选择日期时间" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="allergyChecked" label="过敏史核查" rules={[{ required: true, message: '请选择是否已完成过敏史核查' }]}>
                <Select
                  placeholder="已逐项核查过敏史"
                  options={[
                    { value: 'yes', label: '已核查，无相关过敏 / 见明细' },
                    { value: 'no', label: '未核查' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="allergyDetail" label="过敏明细（可多选）">
                <Checkbox.Group options={ALLERGY_ITEMS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="onAnticoagulant" label="近期抗凝 / 抗血小板药核查" rules={[{ required: true, message: '请选择用药核查结果' }]}>
                <Select
                  placeholder="核查近期抗凝药"
                  options={[
                    { value: 'no', label: '未使用抗凝/抗血小板药' },
                    { value: 'yes', label: '正在使用，需麻醉科复核停药时机' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {onAnticoagulant === 'yes' && (
            <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="患者近期使用抗凝/抗血小板药，须由麻醉科与血液科复核围术期管理方案" />
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="npoConfirmed" valuePropName="checked" label="禁食禁饮（NPO）已确认">
                <Checkbox>已按医嘱完成术前禁食禁饮</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="consentSigned" valuePropName="checked" label="知情同意已签署" rules={[{ validator: (_, v) => (v ? Promise.resolve() : Promise.reject(new Error('须先完成知情同意签署'))) }]}>
                <Checkbox>患者/家属已签署手术麻醉知情同意书</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="signature"
                label="评估医师电子签名"
                rules={[{ required: true, message: '请签署评估医师姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="评估医师本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="assessmentNote" label="术前备注">
            <TextArea rows={3} placeholder="既往疾病、化验异常、特殊查体等补充说明" maxLength={500} showCount />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canAssess}>
              提交术前访视
            </Button>
            {!canAssess && <Typography.Text type="secondary">当前账号缺少 preop:assess 权限，无法登记</Typography.Text>}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`术前访视记录${demo ? '（演示数据）' : ''}`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.id}
            dataSource={records}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1100 }}
          />
        </Spin>
      </Card>

      <Modal
        open={highRiskConfirmOpen}
        title={<Space><SafetyCertificateOutlined /> 高风险患者麻醉科主任复评确认</Space>}
        onCancel={() => { setHighRiskConfirmOpen(false); setReviewConfirmed(false); }}
        onOk={confirmHighRisk}
        okText="已完成主任复评，确认提交"
        okButtonProps={{ disabled: !reviewConfirmed }}
      >
        <Alert type="warning" showIcon message={`当前 ASA 分级为 ${ASA_LABEL[selectedAsa as AsaGrade]}，属高风险患者。`} />
        <Checkbox
          checked={reviewConfirmed}
          onChange={(e) => setReviewConfirmed(e.target.checked)}
          style={{ marginTop: 16 }}
        >
          已请麻醉科主任复评并签字同意安排手术（复评意见已记入备注）
        </Checkbox>
      </Modal>

      <Modal
        open={detailRecord != null}
        title="术前访视详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId} · 就诊：{detailRecord.visitId}</div>
            <div>ASA：<Tag color={ASA_TAG_COLOR[detailRecord.asaGrade]}>{ASA_LABEL[detailRecord.asaGrade]}</Tag></div>
            <div>
              {detailRecord.bmi != null && <>BMI {detailRecord.bmi} · </>}
              {detailRecord.systolicBp != null && <>BP {detailRecord.systolicBp}/{detailRecord.diastolicBp} mmHg · </>}
              {detailRecord.heartRate != null && <>HR {detailRecord.heartRate} 次/分 · </>}
              {detailRecord.mallampati && <>Mallampati {detailRecord.mallampati} 类</>}
            </div>
            <div>
              过敏：{detailRecord.allergyChecked ? '已核查' : '未核查'}
              {(detailRecord.allergyDrug || detailRecord.allergyFood || detailRecord.allergyTape) &&
                `（${[detailRecord.allergyDrug && '药物', detailRecord.allergyFood && '食物', detailRecord.allergyTape && '胶布'].filter(Boolean).join('/')}）`}
            </div>
            {detailRecord.lastMealAt && <div>末次进食饮水：{dayjs(detailRecord.lastMealAt).format('YYYY-MM-DD HH:mm')}</div>}
            {detailRecord.onAnticoagulant && <div><Tag color="red">近期抗凝药，需麻醉科复核</Tag></div>}
            <div>NPO {detailRecord.npoConfirmed ? '已确认' : '未确认'} · 知情同意 {detailRecord.consentSigned ? '已签署' : '未签署'}</div>
            {detailRecord.assessmentNote && <div>备注：{detailRecord.assessmentNote}</div>}
            <div>评估医师：{detailRecord.assessorName ?? detailRecord.signature} · 时间：{dayjs(detailRecord.assessedAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
