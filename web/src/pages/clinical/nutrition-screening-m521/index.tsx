/**
 * 健澜科技 jlmedaios - NRS-2002 入院营养风险筛查（M521-E，P0 首批）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出姓名/性别/年龄/床号/诊断（年龄只读，禁止手填）
 * → 营养状态 0–3 分 + 疾病严重度 0–3 分按 NRS-2002 标准选择 → ≥70 岁自动年龄加分 +1
 * → BMI / 体重下降 / 进食情况 / 皮下脂肪肌肉消耗等补充观察聚合进备注 → 实时总分预览，
 *   ≥3 阳性自动生成营养科会诊建议与待办标识；历史 antd Table + 状态 Tag；BFF 不可用由
 *   store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：nutrition:screen（登记）/ nutrition:view（查看历史）。
 * 阈值规则冻结：年龄 ≥70 加 1 分；总分 ≥3 阳性，禁止自创年龄加分规则与阳性阈值。
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
import { useNutritionScreeningFormStore } from '@/store/nutritionScreeningFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  NUTRITION_SCORE_LABEL,
  NUTRITION_SCORE_DEFINITION,
  DISEASE_SEVERITY_LABEL,
  DISEASE_SEVERITY_DEFINITION,
  WEIGHT_LOSS_LABEL,
  INTAKE_STATUS_LABEL,
  FAT_MUSCLE_LABEL,
  calcAgeBonus,
  calcTotalScore,
  isNutritionRisk,
  nutritionAdvice,
  type NutritionScore,
  type DiseaseSeverity,
  type WeightLoss,
  type IntakeStatus,
  type FatMuscleStatus,
  type NutritionScreeningRecord,
  type NutritionSubmitInput,
} from '@/services/api/nutritionScreeningForm';

const { TextArea } = Input;

const NUTRITION_SCORE_OPTIONS = ([0, 1, 2, 3] as NutritionScore[]).map((v) => ({
  value: v,
  label: (
    <div>
      <div><Typography.Text strong>{NUTRITION_SCORE_LABEL[v]}</Typography.Text></div>
      <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{NUTRITION_SCORE_DEFINITION[v]}</Typography.Text></div>
    </div>
  ),
}));

const DISEASE_SEVERITY_OPTIONS = ([0, 1, 2, 3] as DiseaseSeverity[]).map((v) => ({
  value: v,
  label: (
    <div>
      <div><Typography.Text strong>{DISEASE_SEVERITY_LABEL[v]}</Typography.Text></div>
      <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{DISEASE_SEVERITY_DEFINITION[v]}</Typography.Text></div>
    </div>
  ),
}));

const WEIGHT_LOSS_OPTIONS = (Object.keys(WEIGHT_LOSS_LABEL) as WeightLoss[]).map((k) => ({
  value: k,
  label: WEIGHT_LOSS_LABEL[k],
}));

const INTAKE_STATUS_OPTIONS = (Object.keys(INTAKE_STATUS_LABEL) as IntakeStatus[]).map((k) => ({
  value: k,
  label: INTAKE_STATUS_LABEL[k],
}));

const FAT_MUSCLE_OPTIONS = (Object.keys(FAT_MUSCLE_LABEL) as FatMuscleStatus[]).map((k) => ({
  value: k,
  label: FAT_MUSCLE_LABEL[k],
}));

interface FormValues {
  visitId: string;
  nutritionScore: NutritionScore;
  diseaseSeverity: DiseaseSeverity;
  bmi?: number;
  weightLoss?: WeightLoss;
  intakeStatus?: IntakeStatus;
  fatMuscle?: FatMuscleStatus;
  screeningDate: Dayjs;
  signature: string;
  resultNote?: string;
}

export default function NutritionScreeningM521Page() {
  usePageTitle('NRS-2002 入院营养风险筛查');
  const { hasPermission } = usePermission();
  const canScreen = hasPermission('nutrition:screen');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, lastResult, load, submit } = useNutritionScreeningFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<NutritionScreeningRecord | null>(null);

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

  const selectedNutritionScore = Form.useWatch('nutritionScore', form);
  const selectedDiseaseSeverity = Form.useWatch('diseaseSeverity', form);

  const ageYears = selectedVisit?.age;
  const ageBonus = ageYears != null ? calcAgeBonus(ageYears) : 0;
  const previewTotal =
    selectedVisit && selectedNutritionScore != null && selectedDiseaseSeverity != null
      ? calcTotalScore(selectedNutritionScore, selectedDiseaseSeverity, ageBonus)
      : null;
  const previewRisk = previewTotal != null && isNutritionRisk(previewTotal);
  const previewTaskId = previewRisk ? lastResult?.record.interventionTaskId ?? null : null;

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    // 上级变更清空失效下级
    form.setFieldsValue({
      nutritionScore: undefined,
      diseaseSeverity: undefined,
      bmi: undefined,
      weightLoss: undefined,
      intakeStatus: undefined,
      fatMuscle: undefined,
      resultNote: undefined,
      signature: currentUser?.realName ?? '',
    });
  };

  const buildSubmitInput = (values: FormValues): NutritionSubmitInput => ({
    visitId: values.visitId,
    patientId: selectedVisit?.patientId,
    patientName: selectedVisit?.name,
    ageYears: selectedVisit?.age ?? 0,
    nutritionScore: values.nutritionScore,
    diseaseSeverity: values.diseaseSeverity,
    bmi: values.bmi,
    weightLoss: values.weightLoss,
    intakeStatus: values.intakeStatus,
    fatMuscle: values.fatMuscle,
    resultNote: values.resultNote,
    signature: values.signature.trim(),
    assessorName: currentUser?.realName ?? '当前用户',
  });

  const doSubmit = async (values: FormValues) => {
    try {
      const result = await submit(buildSubmitInput(values));
      if (result.demo) {
        message.warning('BFF 不可用，本次营养筛查已按本地演示记录留存，未写入业务库');
      } else if (result.record.nutritionRisk) {
        message.success(`营养风险阳性（总分 ${result.record.totalScore}），已生成营养科会诊建议`);
      } else {
        message.success(`营养筛查完成：暂无营养风险（总分 ${result.record.totalScore}）`);
      }
      form.resetFields();
      setSelectedVisit(null);
      await load();
    } catch {
      // error 已写入 store，由 Alert 统一展示
    }
  };

  const historyColumns = useMemo(
    () => [
      {
        title: '筛查时间',
        dataIndex: 'createdAt',
        ellipsis: true,
        render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—'),
      },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: NutritionScreeningRecord) => v ?? r.visitId.slice(-6) },
      {
        title: '年龄 / 加分',
        render: (_: unknown, r: NutritionScreeningRecord) => (
          <Space direction="vertical" size={0}>
            <span>{r.ageYears != null ? `${r.ageYears} 岁` : '—'}</span>
            {r.ageBonus === 1 ? <Tag color="orange">年龄加分 +1</Tag> : <Tag>年龄 0 分</Tag>}
          </Space>
        ),
      },
      {
        title: '营养状态分',
        dataIndex: 'nutritionScore',
        render: (v: NutritionScore) => (
          <Space direction="vertical" size={0}>
            <Tag color="blue">{v} 分</Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{NUTRITION_SCORE_DEFINITION[v]}</Typography.Text>
          </Space>
        ),
      },
      {
        title: '疾病严重度分',
        dataIndex: 'diseaseSeverity',
        render: (v: DiseaseSeverity) => (
          <Space direction="vertical" size={0}>
            <Tag color="purple">{v} 分</Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{DISEASE_SEVERITY_DEFINITION[v]}</Typography.Text>
          </Space>
        ),
      },
      {
        title: '总分',
        dataIndex: 'totalScore',
        render: (v: number) => <Tag color={v >= 3 ? 'red' : 'green'}>{v} 分</Tag>,
      },
      {
        title: '风险',
        dataIndex: 'nutritionRisk',
        render: (v: boolean) => <Tag color={v ? 'red' : 'green'}>{v ? '阳性' : '阴性'}</Tag>,
      },
      { title: '建议', dataIndex: 'advice', ellipsis: true, render: (v?: string) => v ?? '—' },
      { title: '签名', dataIndex: 'signature', render: (v?: string) => v ?? '—' },
      {
        title: '操作',
        render: (_: unknown, r: NutritionScreeningRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="NRS-2002 入院营养风险筛查"
      description="营养状态评分 · 疾病严重度评分 · 年龄加分 · 总分 ≥3 自动触发营养科会诊建议"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建 NRS-2002 筛查" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{ signature: currentUser?.realName ?? '', screeningDate: dayjs() }}
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
                  message={
                    <Space>
                      {selectedVisit.name}（{selectedVisit.gender === 'male' ? '男' : '女'} · {selectedVisit.age} 岁 · {selectedVisit.bedNo}）
                      {selectedVisit.age >= 70 && <Tag color="orange">年龄加分 +1</Tag>}
                    </Space>
                  }
                  description={`诊断：${selectedVisit.diagnosis}${selectedVisit.diagnosisIcd10 ? `（ICD-10 ${selectedVisit.diagnosisIcd10}）` : ''} · 年龄由就诊档案只读带出，不可手填`}
                />
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nutritionScore"
                label="营养状态评分（0–3）"
                rules={[
                  { required: true, message: '请选择营养状态' },
                  { type: 'number', min: 0, max: 3, message: '分值须为 0–3' },
                ]}
              >
                <Select placeholder="按 NRS-2002 营养状态标准选择" options={NUTRITION_SCORE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="diseaseSeverity"
                label="疾病严重度评分（0–3）"
                rules={[
                  { required: true, message: '请选择疾病严重度' },
                  { type: 'number', min: 0, max: 3, message: '分值须为 0–3' },
                ]}
              >
                <Select placeholder="按疾病严重度标准选择" options={DISEASE_SEVERITY_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          {previewTotal != null && (
            <Alert
              type={previewRisk ? 'error' : 'success'}
              showIcon
              style={{ marginBottom: 12 }}
              message={
                previewRisk
                  ? `营养风险阳性（总分 ${previewTotal} 分），自动生成营养科会诊建议`
                  : `暂无营养风险（总分 ${previewTotal} 分），常规随访`
              }
              description={
                <Space direction="vertical" size={4}>
                  <span>
                    营养状态 {selectedNutritionScore ?? 0} 分 + 疾病严重度 {selectedDiseaseSeverity ?? 0} 分 + 年龄加分 {ageBonus} 分 = 总分 {previewTotal} 分
                  </span>
                  <span>{nutritionAdvice(previewRisk)}</span>
                  {previewRisk && (
                    <span>会诊待办：{previewTaskId ?? (lastResult?.demo ? '本地演示，待办未生成' : '提交后自动生成营养科会诊待办')}</span>
                  )}
                </Space>
              }
            />
          )}

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="bmi" label="BMI (kg/m²)" rules={[{ type: 'number', min: 10, max: 60, message: 'BMI 须在 10–60 之间' }]}>
                <InputNumber min={10} max={60} step={0.1} placeholder="如 19.2" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="weightLoss" label="近期体重下降">
                <Select placeholder="选择体重下降幅度" allowClear options={WEIGHT_LOSS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="intakeStatus" label="进食情况">
                <Select placeholder="选择进食状态" allowClear options={INTAKE_STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fatMuscle" label="皮下脂肪 / 肌肉消耗">
                <Select placeholder="选择消耗程度" allowClear options={FAT_MUSCLE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="screeningDate" label="筛查日期" rules={[{ required: true, message: '请选择筛查日期' }]}>
                <DatePicker format="YYYY-MM-DD" className="w-full" placeholder="选择日期" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="signature"
                label="评估人电子签名"
                rules={[{ required: true, message: '请签署评估人姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="评估人本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="resultNote" label="补充说明">
            <TextArea rows={3} placeholder="既往疾病、白蛋白 / 化验异常、特殊查体等补充说明（与上述观察项一并记入备注）" maxLength={500} showCount />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canScreen}>
              提交 NRS-2002 筛查
            </Button>
            {!canScreen && <Typography.Text type="secondary">当前账号缺少 nutrition:screen 权限，无法登记</Typography.Text>}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`入院营养风险筛查记录${demo ? '（演示数据）' : ''}`}>
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
        open={detailRecord != null}
        title="NRS-2002 筛查详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId ?? detailRecord.visitId} · 就诊：{detailRecord.visitId}</div>
            <div>
              年龄：{detailRecord.ageYears != null ? `${detailRecord.ageYears} 岁` : '—'}
              {detailRecord.ageBonus === 1 && <Tag color="orange">年龄加分 +1</Tag>}
            </div>
            <div>
              营养状态：<Tag color="blue">{NUTRITION_SCORE_LABEL[detailRecord.nutritionScore]}</Tag>
              <Typography.Text type="secondary">（{NUTRITION_SCORE_DEFINITION[detailRecord.nutritionScore]}）</Typography.Text>
            </div>
            <div>
              疾病严重度：<Tag color="purple">{DISEASE_SEVERITY_LABEL[detailRecord.diseaseSeverity]}</Tag>
              <Typography.Text type="secondary">（{DISEASE_SEVERITY_DEFINITION[detailRecord.diseaseSeverity]}）</Typography.Text>
            </div>
            <div>
              总分：<Tag color={detailRecord.totalScore >= 3 ? 'red' : 'green'}>{detailRecord.totalScore} 分</Tag>
              风险：<Tag color={detailRecord.nutritionRisk ? 'red' : 'green'}>{detailRecord.nutritionRisk ? '阳性' : '阴性'}</Tag>
            </div>
            <div>建议：{detailRecord.advice}</div>
            <div>
              会诊待办：
              {detailRecord.interventionTaskId ?? (detailRecord.demo ? '本地演示，待办未生成' : '暂无待办')}
            </div>
            {(detailRecord.bmi != null || detailRecord.weightLoss || detailRecord.intakeStatus || detailRecord.fatMuscle) && (
              <div>
                补充观察：
                {detailRecord.bmi != null && `BMI ${detailRecord.bmi}；`}
                {detailRecord.weightLoss && `${WEIGHT_LOSS_LABEL[detailRecord.weightLoss]}；`}
                {detailRecord.intakeStatus && `${INTAKE_STATUS_LABEL[detailRecord.intakeStatus]}；`}
                {detailRecord.fatMuscle && FAT_MUSCLE_LABEL[detailRecord.fatMuscle]}
              </div>
            )}
            {detailRecord.resultNote && <div>备注：{detailRecord.resultNote}</div>}
            <div>评估人：{detailRecord.assessorName ?? detailRecord.signature} · 时间：{dayjs(detailRecord.createdAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
