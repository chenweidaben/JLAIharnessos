/**
 * 健澜科技 jlmedaios - 患者服务中心页（M142-C · 预防保健与患者服务）
 *
 * 【预防保健与患者服务】患者诉求限时处理，不能石沉大海：
 *   - 五类诉求一键提交：咨询电话 / 投诉建议 / 病历复印 / 诊断证明 / 转诊预约；
 *   - 提交后进入「我的诉求」列表，实时跟踪 已创建 → 已分派 → 已解决 → 已关闭；
 *   - 48 小时未处理自动升级提醒，超时件高亮，让患者看得见进度。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Input,
  Layout,
  List,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';

/** 五类诉求（与 BFF 纯函数 TYPE_META 口径一致） */
const SERVICE_TYPES = [
  { value: 'consultation_call', label: '咨询电话' },
  { value: 'complaint_suggestion', label: '投诉建议' },
  { value: 'medical_record_copy', label: '病历复印' },
  { value: 'diagnosis_proof', label: '诊断证明' },
  { value: 'referral_appointment', label: '转诊预约' },
];

/** 工单状态中文标签 */
const STATUS_LABEL: Record<string, string> = {
  created: '已创建',
  assigned: '已分派',
  resolved: '已解决',
  closed: '已关闭',
};

/** 工单形态（与 BFF ServiceTicket 对齐，驼峰） */
interface ServiceTicket {
  id: string;
  ticketNo: string;
  patientId: string;
  type: string;
  typeLabel: string;
  description: string;
  status: string;
  statusLabel: string;
  handlerName: string;
  resolution: string;
  satisfactionScore: number;
  escalationLevel: number;
  deadlineAt: string;
  createdAt: string;
}

export default function PatientServiceCenterPage() {
  const [type, setType] = useState<string>('consultation_call');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(false);

  /** 拉取「我的诉求」（patientId 由登录态在 BFF 侧兜底，这里传 self 占位） */
  const loadMine = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/v1/patient/service/my?patientId=self');
      const json = await resp.json();
      if (json.code === 0) setTickets((json.data?.tickets as ServiceTicket[]) ?? []);
    } catch {
      // 列表加载失败不阻断提交
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMine();
  }, []);

  /** 提交诉求 */
  const onSubmit = async () => {
    setError('');
    if (!description.trim()) {
      setError('请描述您的诉求内容');
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch('/api/v1/patient/service/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: 'self', type, description: description.trim() }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '提交失败，请稍后重试');
        return;
      }
      message.success('诉求已受理，我们将在 48 小时内处理');
      setDescription('');
      void loadMine();
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* 深海蓝顶栏 */}
      <div style={{ background: DEEP_BG, padding: '20px 0' }}>
        <Content style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            患者服务中心
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
            您的诉求限时 48 小时处理，超时自动升级督办，绝不石沉大海。
          </Paragraph>
        </Content>
      </div>

      <Content style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <Row gutter={[20, 20]}>
          {/* 左侧：提交诉求 */}
          <Col xs={24} md={10}>
            <Card>
              <Title level={4} style={{ color: MID_BLUE }}>
                提交诉求
              </Title>

              {error && (
                <Alert
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message={error}
                />
              )}

              <Text strong>诉求类型</Text>
              <Select
                style={{ width: '100%', marginTop: 8, marginBottom: 16 }}
                size="large"
                value={type}
                onChange={(v) => setType(v)}
                options={SERVICE_TYPES}
              />

              <Text strong>诉求描述</Text>
              <Input.TextArea
                style={{ marginTop: 8 }}
                rows={5}
                maxLength={1000}
                placeholder="请描述您遇到的问题或需要办理的事项，例如：病历复印如何预约？"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <Button
                type="primary"
                size="large"
                block
                loading={submitting}
                onClick={onSubmit}
                style={{ marginTop: 20, background: MID_BLUE, borderColor: MID_BLUE }}
              >
                {submitting ? '提交中…' : '提交诉求'}
              </Button>

              <Divider />
              <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
                五类诉求：咨询电话 / 投诉建议 / 病历复印 / 诊断证明 / 转诊预约。
                受理后请留意「我的诉求」进度。
              </Paragraph>
            </Card>
          </Col>

          {/* 右侧：我的诉求 */}
          <Col xs={24} md={14}>
            <Card title="我的诉求" loading={loading}>
              <List
                dataSource={tickets}
                locale={{ emptyText: '暂无诉求，欢迎提交您的第一条诉求' }}
                renderItem={(t) => (
                  <List.Item key={t.id}>
                    <List.Item.Meta
                      title={
                        <Space size={8} wrap>
                          <Tag color={ACCENT}>{t.typeLabel}</Tag>
                          <Tag color={MID_BLUE}>{t.statusLabel || STATUS_LABEL[t.status] || t.status}</Tag>
                          {t.escalationLevel > 0 && (
                            <Tag color="red">
                              {t.escalationLevel === 2 ? '二级升级·院级督办' : '超时升级·科室督办'}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <div>
                          <Paragraph style={{ margin: '8px 0', fontSize: 14 }}>
                            {t.description}
                          </Paragraph>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            工单号 {t.ticketNo} · 受理 {t.handlerName || '待分派'} · 应处理截止{' '}
                            {t.deadlineAt ? new Date(t.deadlineAt).toLocaleString('zh-CN') : '-'}
                          </Text>
                          {t.resolution && (
                            <Paragraph style={{ margin: '8px 0 0', fontSize: 13 }}>
                              <Text strong>处理结果：</Text>
                              {t.resolution}
                            </Paragraph>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
