/**
 * 健澜科技 jlmedaios - 创伤 NISS 评分（M534，P0）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出信息 → 3 组损伤部位 Select（头/胸/腹/四肢/颈/体表）
 * + AIS 1–6 InputNumber + 损伤描述 → 实时取 top3 AIS 平方和预览（<16 mild / 16–24 moderate / >24 severe）
 * → severe 红色 Alert「通知创伤外科会诊」；签名留痕，后端二次计算 NISS/severity/needsSurgery。
 * 历史 antd Table（severity 红 Tag）+ 详情 Modal；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：trauma:niss（登记）/ trauma:view（查看历史）。
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
  Progress,
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
import { useTraumaNissFormStore } from '@/store/traumaNissFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  REGION_LABEL,
  REGION_OPTIONS,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  calcNiss,
  severityOf,
  type InjuryRegion,
  type TraumaInjury,
  type TraumaNissRecord,
  type TraumaNissSubmitInput,
} from '@/services/api/traumaNissForm';

interface InjuryFormItem {
  region: InjuryRegion;
  aisScore: number;
  description: string;
}

interface FormValues {
  visitId: string;
  injury1: InjuryFormItem;
  injury2: InjuryFormItem;
  injury3: InjuryFormItem;
  assessedAt: Dayjs;
  signature: string;
}

export default function TraumaNissM521Page() {
  usePageTitle('创伤 NISS 评分');
  const { hasPermission } = usePermission();
  const canScore = hasPermission('trauma:niss');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = useTraumaNissFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<TraumaNissRecord | null>(null);

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
    const scores = [watched.injury1?.aisScore, watched.injury2?.aisScore, watched.injury3?.aisScore]
      .filter((v): v is number => typeof v === 'number' && v >= 1 && v <= 6);
    if (scores.length === 0) return null;
    const niss = calcNiss(scores);
    const sev = severityOf(niss);
    return { niss, sev };
  }, [watched]);

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    form.setFieldsValue({ signature: currentUser?.realName ?? '' });
  };

  const doSubmit = async (values: FormValues) => {
    const injuries: TraumaInjury[] = [values.injury1, values.injury2, values.injury3].map((it) => ({
      region: it.region,
      aisScore: it.aisScore,
      description: it.description.trim(),
    }));
    const input: TraumaNissSubmitInput = {
      visitId: values.visitId,
      patientId: selectedVisit?.patientId,
      patientName: selectedVisit?.name,
      injuries,
      assessedAt: values.assessedAt.toISOString(),
      signature: values.signature.trim(),
      assessorName: currentUser?.realName ?? '当前用户',
    };
    try {
      const result = await submit(input);
      if (result.demo) {
        message.warning('BFF 不可用，本次 NISS 评分已按本地演示记录留存，未写入业务库');
      } else if (result.record.needsSurgery) {
        message.warning(`NISS ${result.record.nissScore}（重度）：已通知创伤外科会诊`);
      } else {
        message.success(`NISS 评分完成：${result.record.nissScore}（${SEVERITY_LABEL[result.record.severity]}）`);
      }
      form.resetFields();
      setSelectedVisit(null);
      await load();
    } catch {
      // error 已写入 store
    }
  };

  const injuryFields = useMemo(
    () => [
      { name: 'injury1' as const, title: '损伤 1' },
      { name: 'injury2' as const, title: '损伤 2' },
      { name: 'injury3' as const, title: '损伤 3' },
    ],
    [],
  );

  const historyColumns = useMemo(
    () => [
      { title: '评估时间', dataIndex: 'assessedAt', ellipsis: true, render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: TraumaNissRecord) => v ?? r.visitId.slice(-6) },
      { title: 'NISS', dataIndex: 'nissScore', render: (v: number) => <b>{v}</b> },
      { title: '严重度', dataIndex: 'severity', render: (v: TraumaNissRecord['severity']) => <Tag color={SEVERITY_COLOR[v]}>{SEVERITY_LABEL[v]}</Tag> },
      { title: '手术联动', dataIndex: 'needsSurgery', render: (v: boolean) => (v ? <Tag color="red">创伤外科会诊</Tag> : <Tag color="green">无需</Tag>) },
      { title: '损伤部位', dataIndex: 'injuries', render: (v: TraumaInjury[]) => v.map((it) => REGION_LABEL[it.region]).join(' / ') },
      {
        title: '操作',
        render: (_: unknown, r: TraumaNissRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="创伤 NISS 评分"
      description="top3 AIS 平方和 · <16 轻度 / 16–24 中度 / >24 重度 · 重度自动联动创伤外科会诊"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建 NISS 评分" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{
            injury1: { region: 'head' as InjuryRegion, aisScore: 3, description: '' },
            injury2: { region: 'chest' as InjuryRegion, aisScore: 3, description: '' },
            injury3: { region: 'extremity' as InjuryRegion, aisScore: 2, description: '' },
            assessedAt: dayjs(),
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

          {injuryFields.map((field, idx) => (
            <Row key={field.name} gutter={16}>
              <Col span={7}>
                <Form.Item
                  name={[field.name, 'region']}
                  label={`${field.title}：损伤部位`}
                  rules={[{ required: true, message: `请选择${field.title}部位` }]}
                >
                  <Select options={REGION_OPTIONS.map((v) => ({ value: v, label: REGION_LABEL[v] }))} />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item
                  name={[field.name, 'aisScore']}
                  label={`${field.title}：AIS（1–6）`}
                  rules={[{ required: true, type: 'number', min: 1, max: 6, message: 'AIS 须为 1–6' }]}
                >
                  <InputNumber className="w-full" min={1} max={6} placeholder="1–6" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={[field.name, 'description']}
                  label={`${field.title}：损伤描述`}
                  rules={[{ required: true, message: `请填写${field.title}描述` }]}
                >
                  <Input placeholder={`如：${idx === 0 ? '颅内血肿' : idx === 1 ? '血气胸' : '左下肢骨折'}`} maxLength={50} />
                </Form.Item>
              </Col>
            </Row>
          ))}

          {preview && (
            <Alert
              type={preview.sev === 'severe' ? 'error' : preview.sev === 'moderate' ? 'warning' : 'success'}
              showIcon
              style={{ marginBottom: 12 }}
              message={
                preview.sev === 'severe'
                  ? `实时 NISS ${preview.niss}（重度）：通知创伤外科会诊并评估急诊手术`
                  : `实时 NISS ${preview.niss}（${SEVERITY_LABEL[preview.sev]}）`
              }
              description={
                <Progress
                  percent={Math.round((preview.niss / 108) * 100)}
                  size="small"
                  strokeColor={preview.sev === 'severe' ? '#cf1322' : preview.sev === 'moderate' ? '#d48806' : '#389e0d'}
                />
              }
            />
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="assessedAt" label="评估时间" rules={[{ required: true, message: '请选择评估时间' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="signature"
                label="评估医师电子签名"
                rules={[{ required: true, message: '请签署评估医师姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="评估医师本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canScore}>提交 NISS 评分</Button>
            {!canScore && <Typography.Text type="secondary">当前账号缺少 trauma:niss 权限，无法登记</Typography.Text>}
            {preview && <Tag color={SEVERITY_COLOR[preview.sev]}>实时 NISS {preview.niss} · {SEVERITY_LABEL[preview.sev]}</Tag>}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`NISS 评分记录${demo ? '（演示数据）' : ''}`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.id}
            dataSource={records}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 900 }}
          />
        </Spin>
      </Card>

      <Modal
        open={detailRecord != null}
        title="NISS 评分详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId} · NISS：{detailRecord.nissScore}</div>
            <div>
              严重度：<Tag color={SEVERITY_COLOR[detailRecord.severity]}>{SEVERITY_LABEL[detailRecord.severity]}</Tag>
              {detailRecord.needsSurgery && <Tag color="red">需创伤外科会诊</Tag>}
            </div>
            <div>损伤明细：{detailRecord.injuries.map((it) => `${REGION_LABEL[it.region]} AIS${it.aisScore} ${it.description}`).join('；')}</div>
            <div>评估医师：{detailRecord.assessorName ?? detailRecord.signature} · 时间：{dayjs(detailRecord.assessedAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
