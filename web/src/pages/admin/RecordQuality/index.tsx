/**
 * 健澜科技 jlmedaios - M130-A 病历质控智能审核页（核心业务深化，仅 admin）
 *
 * 【核心业务深化】
 *  - 录入病历五要素（主诉 / 现病史 / 鉴别诊断 / 诊疗计划 / 用药），
 *    点击「开始质控审核」调用 POST /api/v1/admin/records/audit；
 *  - 逐项展示五项规则结果：合格项绿色 Tag，**不合格项整行红色高亮**；
 *  - 展示综合评分与建议等级；审核结论为"建议"，须质控医师人工确认。
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Layout,
  List,
  message,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
  /** 不合格红色高亮 */
  dangerBg: '#fff1f0',
  dangerBorder: '#ffa39e',
  dangerText: '#cf1322',
};

/** 与 BFF 返回对齐的单项检查结果 */
interface CheckItem {
  key: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
}

interface AuditResponse {
  id: number;
  checks: CheckItem[];
  issues: Array<{ rule: string; severity: string; message: string; suggestion: string }>;
  score: number;
  max: number;
  passedCount: number;
  failedCount: number;
  grade: '合格' | '需整改' | '不合格';
  suggestion: string;
  needsManualReview: boolean;
  status: string;
  createdAt: string;
}

interface FormValues {
  recordId?: string;
  chiefComplaint: string;
  presentIllness: string;
  differentialDiagnosis: string;
  treatmentPlan: string;
  medicationsText?: string;
}

/** 把多行"药名:指征"文本解析成用药列表 */
function parseMedications(text: string) {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(/[:：]/);
      return { name: (name ?? '').trim(), indication: rest.join(':').trim() };
    });
}

const GRADE_COLOR: Record<string, string> = {
  合格: 'green',
  需整改: 'orange',
  不合格: 'red',
};

export default function RecordQualityAdminPage() {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AuditResponse | null>(null);

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const resp = await fetch('/api/v1/admin/records/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: values.recordId ?? '',
          recordContent: {
            chiefComplaint: values.chiefComplaint,
            presentIllness: values.presentIllness,
            differentialDiagnosis: values.differentialDiagnosis,
            treatmentPlan: values.treatmentPlan,
            medications: parseMedications(values.medicationsText ?? ''),
          },
        }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        message.error(json.message || '质控审核失败');
        return;
      }
      setResult(json.data as AuditResponse);
      message.success('质控审核完成');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '网络异常');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* 不合格行红色高亮（深海蓝 VI 下的警示色） */}
        <style>{`
          .record-quality-failed-row > td {
            background: ${VI.dangerBg} !important;
            border-left: 4px solid ${VI.dangerBorder};
          }
        `}</style>
        <div
          style={{
            borderLeft: `4px solid ${VI.deep}`,
            paddingLeft: 12,
            marginBottom: 16,
          }}
        >
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            病历质控智能审核
          </Title>
          <Paragraph type="secondary">
            核心业务深化：对主诉完整性、现病史时间线、鉴别诊断、诊疗计划、用药指征五项规则自动审核。
            <Text strong style={{ color: VI.accent }}>
              审核结果为"建议"，不自动判退，须质控医师人工确认。
            </Text>
          </Paragraph>
        </div>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="用药按每行一条填写，格式：药名:用药指征（例：头孢呋辛:社区获得性肺炎抗感染）。无用药可留空。"
        />

        <Card title="病历要素录入" headStyle={{ background: VI.deep, color: '#fff' }}>
          <Form form={form} layout="vertical">
            <Form.Item label="病历/就诊标识（可选）" name="recordId">
              <Input placeholder="例：MR-2026-10086" />
            </Form.Item>
            <Form.Item
              label="主诉"
              name="chiefComplaint"
              rules={[{ required: true, message: '请输入主诉' }]}
            >
              <TextArea rows={2} placeholder="例：反复咳嗽咳痰3天" />
            </Form.Item>
            <Form.Item
              label="现病史"
              name="presentIllness"
              rules={[{ required: true, message: '请输入现病史' }]}
            >
              <TextArea rows={4} placeholder="按时间顺序描述起病、诱因、症状特点与演变" />
            </Form.Item>
            <Form.Item
              label="鉴别诊断"
              name="differentialDiagnosis"
              rules={[{ required: true, message: '请输入鉴别诊断' }]}
            >
              <TextArea rows={3} placeholder="多个诊断用逗号/顿号分隔，例：社区获得性肺炎、肺结核、肺癌" />
            </Form.Item>
            <Form.Item
              label="诊疗计划"
              name="treatmentPlan"
              rules={[{ required: true, message: '请输入诊疗计划' }]}
            >
              <TextArea rows={3} placeholder="例：完善胸部CT、血常规；予抗感染、化痰对症治疗；监测体温" />
            </Form.Item>
            <Form.Item label="用药列表（每行：药名:指征）" name="medicationsText">
              <TextArea rows={3} placeholder={'头孢呋辛:社区获得性肺炎抗感染\n氨溴索:化痰止咳'} />
            </Form.Item>
            <Space>
              <Button
                type="primary"
                style={{ background: VI.accent, borderColor: VI.accent }}
                loading={submitting}
                onClick={() => void submit()}
              >
                开始质控审核
              </Button>
            </Space>
          </Form>
        </Card>

        {submitting && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin size="large" tip="质控规则审核中…" />
          </div>
        )}

        {!submitting && result && (
          <>
            <Card
              style={{ marginTop: 16 }}
              title={
                <Space>
                  <span style={{ color: '#fff' }}>审核结论</span>
                  <Tag color={GRADE_COLOR[result.grade] ?? 'default'}>{result.grade}</Tag>
                  <Tag color="blue">综合评分 {result.score}/{result.max}</Tag>
                </Space>
              }
              headStyle={{ background: VI.deep, color: '#fff' }}
            >
              <Paragraph style={{ marginBottom: 8 }}>
                通过 <Text strong style={{ color: '#389e0d' }}>{result.passedCount}</Text> 项，
                待整改 <Text strong style={{ color: VI.dangerText }}>{result.failedCount}</Text> 项。
              </Paragraph>
              <Alert
                type={result.failedCount > 0 ? 'warning' : 'success'}
                showIcon
                message={result.suggestion}
              />
            </Card>

            <Card
              style={{ marginTop: 16 }}
              title="逐项规则结果（不合格红色高亮）"
              headStyle={{ background: VI.deep, color: '#fff' }}
            >
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={result.checks}
                rowClassName={(row) => (row.passed ? '' : 'record-quality-failed-row')}
                columns={[
                  {
                    title: '检查项',
                    dataIndex: 'label',
                    width: 180,
                    render: (label: string, row: CheckItem) => (
                      <Text strong style={{ color: row.passed ? VI.deep : VI.dangerText }}>
                        {label}
                      </Text>
                    ),
                  },
                  {
                    title: '结果',
                    dataIndex: 'passed',
                    width: 100,
                    render: (passed: boolean) =>
                      passed ? <Tag color="green">通过</Tag> : <Tag color="red">不通过</Tag>,
                  },
                  {
                    title: '说明',
                    dataIndex: 'message',
                    render: (m: string, row: CheckItem) => (
                      <Text style={{ color: row.passed ? 'inherit' : VI.dangerText }}>{m}</Text>
                    ),
                  },
                  {
                    title: '整改建议',
                    dataIndex: 'suggestion',
                    render: (s: string, row: CheckItem) =>
                      row.passed ? (
                        <Text type="secondary">—</Text>
                      ) : (
                        <Text style={{ color: VI.dangerText }}>{s}</Text>
                      ),
                  },
                ]}
              />
            </Card>

            {result.issues.length > 0 && (
              <Card
                style={{ marginTop: 16 }}
                title={`待整改问题清单（${result.issues.length}）`}
                headStyle={{ background: VI.deep, color: '#fff' }}
              >
                <List
                  size="small"
                  dataSource={result.issues}
                  renderItem={(issue) => (
                    <List.Item>
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Text strong style={{ color: VI.dangerText }}>
                          [{issue.severity === 'error' ? '必改' : '建议'}] {issue.message}
                        </Text>
                        <Text type="secondary">{issue.suggestion}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </>
        )}
      </Content>
    </Layout>
  );
}
