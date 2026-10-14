/**
 * 健澜科技 jlmedaios - 出院小结管理页
 * 就诊号查询 + 小结展示/书写 + 提交签署/审核签名。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Descriptions, Empty, Input, Layout, Row, Select, Spin, Tag, Typography,
} from 'antd';
import { usePermission } from '@/router/guards';
import { useEmrGapDischargeSummaryStore } from '@/store/emrGapDischargeSummaryStore';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

const STATUS_META: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  submitted: { color: 'orange', label: '已提交' },
  verified: { color: 'green', label: '已审核' },
};

const DISCHARGE_TYPE_OPTIONS = [
  { value: 'regular', label: '常规出院' },
  { value: 'cured', label: '治愈' },
  { value: 'improved', label: '好转' },
  { value: 'unknown', label: '未愈' },
  { value: 'death', label: '死亡' },
];

interface FormState {
  admissionDate: string;
  dischargeDate: string;
  dischargeType: string;
  admissionDiagnoses: string;
  dischargeDiagnoses: string;
  treatmentCourse: string;
  dischargeOrders: string;
  followupPlan: string;
}

const EMPTY_FORM: FormState = {
  admissionDate: '', dischargeDate: '', dischargeType: 'regular',
  admissionDiagnoses: '', dischargeDiagnoses: '', treatmentCourse: '', dischargeOrders: '', followupPlan: '',
};

export default function DischargeSummaryPage() {
  const { summary, loading, acting, error, searched, search, save, submit, verify, reset } =
    useEmrGapDischargeSummaryStore();
  const { hasPermission } = usePermission();

  const [visitIdInput, setVisitIdInput] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // 拉到小结后回填表单；无小结时清空为新建态
  useEffect(() => {
    if (summary) {
      setForm({
        admissionDate: summary.admissionDate ?? '',
        dischargeDate: summary.dischargeDate ?? '',
        dischargeType: summary.dischargeType || 'regular',
        admissionDiagnoses: summary.admissionDiagnoses ?? '',
        dischargeDiagnoses: summary.dischargeDiagnoses ?? '',
        treatmentCourse: summary.treatmentCourse ?? '',
        dischargeOrders: summary.dischargeOrders ?? '',
        followupPlan: summary.followupPlan ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [summary]);

  const canWrite = hasPermission('discharge_summary:write');
  const canVerify = hasPermission('discharge_summary:verify');
  const readOnly = summary?.status === 'verified';

  const doSearch = () => {
    const v = visitIdInput.trim();
    if (v) void search(v);
  };

  const doSave = () => {
    const v = visitIdInput.trim();
    void save({
      visitId: v,
      admissionDate: form.admissionDate,
      dischargeDate: form.dischargeDate,
      dischargeType: form.dischargeType,
      admissionDiagnoses: form.admissionDiagnoses,
      dischargeDiagnoses: form.dischargeDiagnoses,
      treatmentCourse: form.treatmentCourse,
      dischargeOrders: form.dischargeOrders,
      followupPlan: form.followupPlan ? form.followupPlan : null,
    }).catch(() => undefined);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>出院小结管理</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card title="患者就诊号查询" style={{ marginBottom: 16 }}>
          <Input
            placeholder="请输入就诊号 visitId"
            value={visitIdInput}
            onChange={(e) => setVisitIdInput(e.target.value)}
            onPressEnter={doSearch}
            style={{ width: 280, marginRight: 8 }}
            allowClear
          />
          <Button type="primary" loading={loading} onClick={doSearch}>查询</Button>
          <Button style={{ marginLeft: 8 }} onClick={reset}>重置</Button>
        </Card>

        <Spin spinning={loading}>
          {!searched ? (
            <Card><Empty description="请输入就诊号查询出院小结" /></Card>
          ) : (
            <Row gutter={16}>
              <Col span={12}>
                <Card
                  title="小结内容"
                  extra={summary ? (
                    <Tag color={STATUS_META[summary.status]?.color}>
                      {STATUS_META[summary.status]?.label}
                    </Tag>
                  ) : undefined}
                >
                  {summary ? (
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="就诊号">{summary.visitId}</Descriptions.Item>
                      <Descriptions.Item label="入院日期">{summary.admissionDate}</Descriptions.Item>
                      <Descriptions.Item label="出院日期">{summary.dischargeDate}</Descriptions.Item>
                      <Descriptions.Item label="入院诊断">{summary.admissionDiagnoses}</Descriptions.Item>
                      <Descriptions.Item label="出院诊断">{summary.dischargeDiagnoses}</Descriptions.Item>
                      <Descriptions.Item label="治疗经过">{summary.treatmentCourse}</Descriptions.Item>
                      <Descriptions.Item label="出院医嘱">{summary.dischargeOrders}</Descriptions.Item>
                      <Descriptions.Item label="随访计划">{summary.followupPlan ?? '-'}</Descriptions.Item>
                    </Descriptions>
                  ) : (
                    <Empty description="未查询到出院小结，请在右侧新建并保存草稿" />
                  )}

                  <div style={{ marginTop: 12 }}>
                    {summary?.status === 'draft' && canWrite && (
                      <Button
                        type="primary" loading={acting}
                        onClick={() => void submit().catch(() => undefined)}
                      >
                        提交签署
                      </Button>
                    )}
                    {summary?.status === 'submitted' && canVerify && (
                      <Button loading={acting} onClick={() => void verify().catch(() => undefined)}>
                        审核签名
                      </Button>
                    )}
                  </div>
                </Card>
              </Col>

              <Col span={12}>
                <Card title={summary ? '编辑小结（保存草稿）' : '新建出院小结'}>
                  <Input placeholder="入院日期 YYYY-MM-DD" value={form.admissionDate}
                    onChange={(e) => set('admissionDate', e.target.value)}
                    style={{ marginBottom: 8 }} disabled={readOnly} />
                  <Input placeholder="出院日期 YYYY-MM-DD" value={form.dischargeDate}
                    onChange={(e) => set('dischargeDate', e.target.value)}
                    style={{ marginBottom: 8 }} disabled={readOnly} />
                  <Select
                    value={form.dischargeType} options={DISCHARGE_TYPE_OPTIONS}
                    onChange={(v) => set('dischargeType', v)}
                    style={{ width: '100%', marginBottom: 8 }} disabled={readOnly}
                  />
                  <TextArea placeholder="入院诊断" rows={2} value={form.admissionDiagnoses}
                    onChange={(e) => set('admissionDiagnoses', e.target.value)}
                    style={{ marginBottom: 8 }} disabled={readOnly} />
                  <TextArea placeholder="出院诊断" rows={2} value={form.dischargeDiagnoses}
                    onChange={(e) => set('dischargeDiagnoses', e.target.value)}
                    style={{ marginBottom: 8 }} disabled={readOnly} />
                  <TextArea placeholder="治疗经过" rows={3} value={form.treatmentCourse}
                    onChange={(e) => set('treatmentCourse', e.target.value)}
                    style={{ marginBottom: 8 }} disabled={readOnly} />
                  <TextArea placeholder="出院医嘱" rows={3} value={form.dischargeOrders}
                    onChange={(e) => set('dischargeOrders', e.target.value)}
                    style={{ marginBottom: 8 }} disabled={readOnly} />
                  <TextArea placeholder="随访计划（选填）" rows={2} value={form.followupPlan}
                    onChange={(e) => set('followupPlan', e.target.value)}
                    style={{ marginBottom: 8 }} disabled={readOnly} />
                  {canWrite ? (
                    <Button type="primary" loading={acting} disabled={readOnly} onClick={doSave}>
                      保存草稿
                    </Button>
                  ) : (
                    <span style={{ color: '#999' }}>无出院小结书写权限</span>
                  )}
                </Card>
              </Col>
            </Row>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
