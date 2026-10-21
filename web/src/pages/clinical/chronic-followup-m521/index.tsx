/**
 * 健澜科技 jlmedaios - 慢病随访（M535，P0）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出信息 → 疾病类型 Radio.Group（高血压/糖尿病/冠心病/慢阻肺/脑卒中）
 * → 体征结构化录入（血压/心率/体重/BMI/糖化/空腹血糖）→ 服药依从性 Radio → 下次随访 DatePicker
 * → 实时预览 uncontrolled（高血压 sbp≥180 或 dbp≥110；糖尿病 ach1c>9；其他疾病未规律服药）
 * → uncontrolled 橙色 Alert「建议医师复核用药方案」；签名留痕，后端二次判定。
 * 历史 antd Table（uncontrolled 红 Tag）+ 详情 Modal；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：chronic:followup（登记）/ chronic:view（查看历史）。
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
import { useChronicFollowupFormStore } from '@/store/chronicFollowupFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  ADHERENCE_LABEL,
  ADHERENCES,
  DISEASE_LABEL,
  DISEASES,
  isUncontrolled,
  type Adherence,
  type ChronicFollowupRecord,
  type ChronicFollowupSubmitInput,
  type DiseaseCode,
} from '@/services/api/chronicFollowupForm';

interface FormValues {
  visitId: string;
  diseaseCode: DiseaseCode;
  sbp: number;
  dbp: number;
  heartRate: number;
  weight: number;
  bmi: number;
  ach1c: number | null;
  fastingGlucose: number | null;
  medicationAdherence: Adherence;
  nextFollowUpAt: Dayjs;
  notes?: string;
  signature: string;
}

export default function ChronicFollowupM521Page() {
  usePageTitle('慢病随访');
  const { hasPermission } = usePermission();
  const canFollowup = hasPermission('chronic:followup');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = useChronicFollowupFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<ChronicFollowupRecord | null>(null);

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
  const uncontrolledPreview = useMemo(() => {
    if (!watched.diseaseCode || watched.sbp == null || watched.dbp == null || !watched.medicationAdherence) return null;
    return isUncontrolled(
      watched.diseaseCode as DiseaseCode,
      watched.sbp as number,
      watched.dbp as number,
      (watched.ach1c as number | null) ?? null,
      watched.medicationAdherence as Adherence,
    );
  }, [watched]);

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    form.setFieldsValue({ signature: currentUser?.realName ?? '' });
  };

  const doSubmit = async (values: FormValues) => {
    if (!selectedVisit) return;
    const input: ChronicFollowupSubmitInput = {
      patientId: selectedVisit.patientId,
      patientName: selectedVisit.name,
      diseaseCode: values.diseaseCode,
      sbp: values.sbp,
      dbp: values.dbp,
      heartRate: values.heartRate,
      weight: values.weight,
      bmi: values.bmi,
      ach1c: values.ach1c ?? null,
      fastingGlucose: values.fastingGlucose ?? null,
      medicationAdherence: values.medicationAdherence,
      nextFollowUpAt: values.nextFollowUpAt.toISOString(),
      notes: values.notes?.trim() || null,
      followedUpAt: new Date().toISOString(),
      signature: values.signature.trim(),
      assessorName: currentUser?.realName ?? '当前用户',
    };
    try {
      const result = await submit(input);
      if (result.demo) {
        message.warning('BFF 不可用，本次随访已按本地演示记录留存，未写入业务库');
      } else if (result.record.needsPhysicianReview) {
        message.warning(`随访完成：病情未达标，建议医师复核用药方案`);
      } else {
        message.success(`随访完成：${DISEASE_LABEL[result.record.diseaseCode]}控制达标`);
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
      { title: '随访时间', dataIndex: 'followedUpAt', ellipsis: true, render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: ChronicFollowupRecord) => v ?? r.patientId },
      { title: '疾病', dataIndex: 'diseaseCode', render: (v: DiseaseCode) => DISEASE_LABEL[v] },
      { title: '血压/血糖', render: (_: unknown, r: ChronicFollowupRecord) => `${r.sbp}/${r.dbp}${r.ach1c != null ? ` · 糖化 ${r.ach1c}%` : ''}` },
      { title: '服药', dataIndex: 'medicationAdherence', render: (v: Adherence) => ADHERENCE_LABEL[v] },
      { title: '控制状态', dataIndex: 'uncontrolled', render: (v: boolean) => (v ? <Tag color="red">未达标</Tag> : <Tag color="green">达标</Tag>) },
      { title: '下次随访', dataIndex: 'nextFollowUpAt', render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '—') },
      {
        title: '操作',
        render: (_: unknown, r: ChronicFollowupRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="慢病随访"
      description="高血压/糖尿病/冠心病/慢阻肺/脑卒中 · 体征结构化 · 未达标自动建议医师复核用药方案"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建慢病随访" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{
            diseaseCode: 'hypertension' as DiseaseCode,
            medicationAdherence: 'yes' as Adherence,
            sbp: 130, dbp: 80, heartRate: 75, weight: 70, bmi: 24,
            nextFollowUpAt: dayjs().add(30, 'day'),
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

          <Form.Item name="diseaseCode" label="慢病类型" rules={[{ required: true, message: '请选择慢病类型' }]}>
            <Radio.Group>
              <Space wrap>
                {DISEASES.map((d) => <Radio.Button key={d} value={d}>{DISEASE_LABEL[d]}</Radio.Button>)}
              </Space>
            </Radio.Group>
          </Form.Item>

          <Row gutter={16}>
            <Col span={5}><Form.Item name="sbp" label="收缩压 (mmHg)" rules={[{ required: true, type: 'number', message: '请输入收缩压' }]}><InputNumber className="w-full" min={60} max={260} /></Form.Item></Col>
            <Col span={5}><Form.Item name="dbp" label="舒张压 (mmHg)" rules={[{ required: true, type: 'number', message: '请输入舒张压' }]}><InputNumber className="w-full" min={30} max={160} /></Form.Item></Col>
            <Col span={5}><Form.Item name="heartRate" label="心率 (次/分)" rules={[{ required: true, type: 'number', message: '请输入心率' }]}><InputNumber className="w-full" min={30} max={200} /></Form.Item></Col>
            <Col span={5}><Form.Item name="weight" label="体重 (kg)" rules={[{ required: true, type: 'number', message: '请输入体重' }]}><InputNumber className="w-full" min={30} max={200} step={0.1} /></Form.Item></Col>
            <Col span={4}><Form.Item name="bmi" label="BMI" rules={[{ required: true, type: 'number', message: '请输入 BMI' }]}><InputNumber className="w-full" min={12} max={45} step={0.1} /></Form.Item></Col>
            <Col span={6}><Form.Item name="ach1c" label="糖化血红蛋白 (%)（糖尿病必填）"><InputNumber className="w-full" min={3} max={15} step={0.1} /></Form.Item></Col>
            <Col span={6}><Form.Item name="fastingGlucose" label="空腹血糖 (mmol/L)"><InputNumber className="w-full" min={2} max={30} step={0.1} /></Form.Item></Col>
          </Row>

          <Form.Item name="medicationAdherence" label="服药依从性" rules={[{ required: true, message: '请选择服药依从性' }]}>
            <Radio.Group>
              <Space>
                {ADHERENCES.map((a) => <Radio.Button key={a} value={a}>{ADHERENCE_LABEL[a]}</Radio.Button>)}
              </Space>
            </Radio.Group>
          </Form.Item>

          {uncontrolledPreview != null && uncontrolledPreview && (
            <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="病情未达标（uncontrolled）：建议医师复核用药方案" />
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="nextFollowUpAt" label="下次随访时间" rules={[{ required: true, message: '请选择下次随访时间' }]}>
                <DatePicker format="YYYY-MM-DD" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="notes" label="随访备注（可选）">
                <Input.TextArea rows={2} maxLength={200} showCount />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="signature"
                label="随访医师电子签名"
                rules={[{ required: true, message: '请签署随访医师姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="随访医师本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canFollowup}>提交随访</Button>
            {!canFollowup && <Typography.Text type="secondary">当前账号缺少 chronic:followup 权限，无法登记</Typography.Text>}
            {uncontrolledPreview != null && (
              <Tag color={uncontrolledPreview ? 'red' : 'green'}>{uncontrolledPreview ? '实时：未达标' : '实时：达标'}</Tag>
            )}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`慢病随访记录${demo ? '（演示数据）' : ''}`}>
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
        title="慢病随访详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId} · {DISEASE_LABEL[detailRecord.diseaseCode]}</div>
            <div>
              体征：BP {detailRecord.sbp}/{detailRecord.dbp} · HR {detailRecord.heartRate} · 体重 {detailRecord.weight}kg · BMI {detailRecord.bmi}
              {detailRecord.ach1c != null && ` · 糖化 ${detailRecord.ach1c}%`}
              {detailRecord.fastingGlucose != null && ` · 空腹 ${detailRecord.fastingGlucose} mmol/L`}
            </div>
            <div>服药依从性：{ADHERENCE_LABEL[detailRecord.medicationAdherence]}</div>
            <div>
              状态：{detailRecord.uncontrolled ? <Tag color="red">未达标，需医师复核</Tag> : <Tag color="green">达标</Tag>}
              {detailRecord.needsPhysicianReview && <Tag color="orange">医师复核</Tag>}
            </div>
            {detailRecord.notes && <div>备注：{detailRecord.notes}</div>}
            <div>下次随访：{dayjs(detailRecord.nextFollowUpAt).format('YYYY-MM-DD')} · 随访医师：{detailRecord.assessorName ?? detailRecord.signature}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
