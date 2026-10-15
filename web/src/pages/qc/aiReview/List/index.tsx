/**
 * 健澜科技 jlmedaios - AI 质控智能审核（M144-D）质控科页面
 *
 * 【AI核心能力深化】质控科在此对在架病历做六大核心条款机器预审：
 *   主诉完整 / 现病史充分 / 诊断明确 / 用药合理 / 签名齐全 / 时限达标。
 * 问题按 critical / major / minor 三档着色，质控科可一键反馈"AI 判对/误报"，
 * 驱动规则越用越准。深海蓝 VI（主色 #0A4D8C）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert, Button, Card, Col, Descriptions, Form, Input, Layout, Progress, Row, Space, Switch, Table, Tag, Typography,
} from 'antd';
import { usePermission } from '@/router/guards';
import { get, post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝 VI */
const SEA_BLUE = '#0A4D8C';
const SEA_BLUE_DARK = '#073A6B';

interface QualityIssue {
  rule: string;
  checkItem: string;
  severity: 'critical' | 'major' | 'minor';
  message: string;
}
interface CheckResult {
  recordId: string;
  score: number;
  passed: boolean;
  issueCount: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  issues: QualityIssue[];
  checkedAt: string;
}
interface QualityReport {
  dept: string;
  period: string;
  totalChecked: number;
  passedCount: number;
  passRate: number;
  avgScore: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  topRules: { rule: string; count: number }[];
}

const SEVERITY_COLOR: Record<QualityIssue['severity'], string> = {
  critical: 'red',
  major: 'orange',
  minor: 'blue',
};
const SEVERITY_LABEL: Record<QualityIssue['severity'], string> = {
  critical: '致命',
  major: '严重',
  minor: '一般',
};

export default function AiQualityReviewListPage() {
  usePermission();

  const [recordId, setRecordId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [presentIllness, setPresentIllness] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicationsText, setMedicationsText] = useState('');
  const [signed, setSigned] = useState(false);
  const [signedBy, setSignedBy] = useState('');
  const [dueAt, setDueAt] = useState('');

  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [dept, setDept] = useState('内科');
  const [period, setPeriod] = useState('2026-10');
  const [report, setReport] = useState<QualityReport | null>(null);

  const runCheck = async () => {
    setChecking(true); setError(null); setFeedbackMsg(null);
    try {
      const content = {
        chiefComplaint,
        presentIllness,
        diagnosis,
        medications: medicationsText.split('\n').map((s) => s.trim()).filter(Boolean),
        signed,
        signedBy,
        dueAt,
        recordCreatedAt: new Date().toISOString(),
        dept,
      };
      const res = await post<CheckResult>('/ai/quality-check', { recordId, recordContent: content });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '质控审核失败');
    } finally {
      setChecking(false);
    }
  };

  const sendFeedback = async (isError: boolean) => {
    if (!result) return;
    try {
      await post('/ai/quality-feedback', { recordId: result.recordId, isError });
      setFeedbackMsg(isError ? '已记录为 AI 误报，规则将持续优化' : '已确认 AI 判定正确');
    } catch (e) {
      setError(e instanceof Error ? e.message : '反馈失败');
    }
  };

  const loadReport = async () => {
    try {
      const res = await get<QualityReport>('/ai/quality-report', { dept, period });
      setReport(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '报告加载失败');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: SEA_BLUE }}>
        <Title level={4} style={{ color: '#fff', margin: 0, lineHeight: '64px' }}>
          AI 质控智能审核 · 质控科工作台
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Row gutter={16}>
          {/* 左侧：病历要素录入 + 触发审核 */}
          <Col span={10}>
            <Card title="病历要素录入（六大核心条款）" size="small"
              style={{ borderTop: `3px solid ${SEA_BLUE}` }}>
              <Form layout="vertical" size="small">
                <Form.Item label="病历记录 ID">
                  <Input value={recordId} onChange={(e) => setRecordId(e.target.value)}
                    placeholder="record_id" />
                </Form.Item>
                <Form.Item label="主诉（完整）">
                  <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="如：反复咳嗽咳痰3天" />
                </Form.Item>
                <Form.Item label="现病史（充分）">
                  <Input.TextArea rows={3} value={presentIllness}
                    onChange={(e) => setPresentIllness(e.target.value)}
                    placeholder="起病情况、症状特点、诊疗经过……" />
                </Form.Item>
                <Form.Item label="诊断（明确）">
                  <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="如：社区获得性肺炎" />
                </Form.Item>
                <Form.Item label="用药（每行一条，含用法用量）">
                  <Input.TextArea rows={3} value={medicationsText}
                    onChange={(e) => setMedicationsText(e.target.value)}
                    placeholder={'阿莫西林胶囊 0.5g  tid\n布洛芬缓释胶囊 0.3g  bid'} />
                </Form.Item>
                <Space size="large">
                  <Form.Item label="已签名">
                    <Switch checked={signed} onChange={setSigned} />
                  </Form.Item>
                  <Form.Item label="签名人">
                    <Input style={{ width: 160 }} value={signedBy}
                      onChange={(e) => setSignedBy(e.target.value)} placeholder="医师姓名/工号" />
                  </Form.Item>
                </Space>
                <Form.Item label="应完成时限（时限达标）">
                  <Input value={dueAt} onChange={(e) => setDueAt(e.target.value)}
                    placeholder="ISO 时间，如 2026-10-16T18:00:00+08:00" />
                </Form.Item>
                <Button type="primary" block loading={checking} onClick={runCheck}
                  style={{ background: SEA_BLUE }}>
                  开始 AI 质控审核
                </Button>
              </Form>
            </Card>
          </Col>

          {/* 右侧：审核结果 */}
          <Col span={14}>
            <Card title="审核结果" size="small" style={{ borderTop: `3px solid ${SEA_BLUE}`, marginBottom: 16 }}>
              {!result ? (
                <Text type="secondary">录入左侧病历要素后点击「开始 AI 质控审核」。</Text>
              ) : (
                <>
                  <Space size="large" align="center" style={{ marginBottom: 16 }}>
                    <Progress type="dashboard" percent={result.score} size={120}
                      strokeColor={result.passed ? SEA_BLUE : '#cf1322'} />
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="结论">
                        {result.passed
                          ? <Tag color="success">通过</Tag>
                          : <Tag color="error">不通过</Tag>}
                      </Descriptions.Item>
                      <Descriptions.Item label="问题数">
                        <Tag color="red">致命 {result.criticalCount}</Tag>
                        <Tag color="orange">严重 {result.majorCount}</Tag>
                        <Tag color="blue">一般 {result.minorCount}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="审核时间">
                        {new Date(result.checkedAt).toLocaleString()}
                      </Descriptions.Item>
                    </Descriptions>
                    <Space direction="vertical">
                      <Button size="small" onClick={() => sendFeedback(false)}>确认 AI 判定正确</Button>
                      <Button size="small" danger onClick={() => sendFeedback(true)}>标记为 AI 误报</Button>
                    </Space>
                  </Space>
                  {feedbackMsg && <Alert type="success" showIcon style={{ marginBottom: 12 }} message={feedbackMsg} />}
                  <Table
                    size="small" rowKey="rule" pagination={false}
                    dataSource={result.issues}
                    columns={[
                      { title: '分级', dataIndex: 'severity', width: 90,
                        render: (s: QualityIssue['severity']) =>
                          <Tag color={SEVERITY_COLOR[s]}>{SEVERITY_LABEL[s]}</Tag> },
                      { title: '规则', dataIndex: 'rule', width: 220,
                        render: (r: string) => <Text code style={{ fontSize: 12 }}>{r}</Text> },
                      { title: '问题描述', dataIndex: 'message' },
                    ]}
                  />
                </>
              )}
            </Card>

            {/* 周期报告 */}
            <Card title="科室周期报告" size="small" style={{ borderTop: `3px solid ${SEA_BLUE_DARK}` }}>
              <Space style={{ marginBottom: 12 }}>
                <Input style={{ width: 140 }} value={dept} onChange={(e) => setDept(e.target.value)}
                  placeholder="科室" />
                <Input style={{ width: 140 }} value={period} onChange={(e) => setPeriod(e.target.value)}
                  placeholder="周期 如 2026-10" />
                <Button onClick={loadReport} style={{ background: SEA_BLUE, color: '#fff' }}>
                  生成报告
                </Button>
              </Space>
              {report && (
                <Descriptions column={3} size="small" bordered>
                  <Descriptions.Item label="审核总数">{report.totalChecked}</Descriptions.Item>
                  <Descriptions.Item label="合格率">{report.passRate}%</Descriptions.Item>
                  <Descriptions.Item label="平均分">{report.avgScore}</Descriptions.Item>
                  <Descriptions.Item label="致命问题">{report.criticalCount}</Descriptions.Item>
                  <Descriptions.Item label="严重问题">{report.majorCount}</Descriptions.Item>
                  <Descriptions.Item label="一般问题">{report.minorCount}</Descriptions.Item>
                </Descriptions>
              )}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
