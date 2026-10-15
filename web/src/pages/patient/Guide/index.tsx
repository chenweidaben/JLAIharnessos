/**
 * 健澜科技 jlmedaios - 患者智能导诊对话框（M122-A）
 *
 * 依据宪法第七章 7.7（患者 MUSE）：
 *   - 患者输入症状 → BFF 纯函数聚合 → 返回推荐科室/医生/就诊准备/紧急度；
 *   - 导诊结果为「就医建议」，不构成诊断；红旗症状强制提示急诊/120；
 *   - 患者端大字易读，三态：loading / error / empty。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Layout,
  List,
  Row,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  AimOutlined,
  AlertOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';

interface DepartmentHit {
  deptCode: string;
  deptName: string;
  score: number;
  matchedSymptoms: string[];
  reason: string;
}

interface RecommendedDoctor {
  id: string;
  name: string;
  title: string;
  deptName: string;
  matchScore: number;
  reason: string;
  scheduleTags: string[];
}

interface Urgency {
  level: 'routine' | 'urgent' | 'emergency';
  recommendER: boolean;
  message: string;
  redFlags: string[];
}

/** 与 BFF POST /api/v1/patient/guide 响应 data 对齐 */
interface PatientGuideData {
  topDepts: DepartmentHit[];
  recommendedDoctors: RecommendedDoctor[];
  prepAdvice: string[];
  urgency: Urgency;
}

const URGENCY_TAG: Record<Urgency['level'], { label: string; color: string }> = {
  emergency: { label: '急诊', color: '#cf1322' },
  urgent: { label: '尽快就诊', color: '#fa8c16' },
  routine: { label: '普通门诊', color: ACCENT },
};

/** 依据宪法：对话框气泡样式，患者右、AI 左，字号放大便于中老年阅读。 */
export default function PatientGuidePage() {
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<PatientGuideData | null>(null);

  const ask = useCallback(async (symptoms: string) => {
    const text = symptoms.trim();
    if (!text) return;
    setLoading(true);
    setError('');
    try {
      // 依据宪法：仅传症状文本，既往史由 BFF 从患者 MUSE 档案脱敏后注入
      const res = await post<PatientGuideData>('/patient/guide', { symptoms: text }, { silent: true });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '智能导诊暂时不可用，请稍后再试');
    } finally {
      setLoading(false);
    }
  }, []);

  const isEmpty = !loading && !error && !result;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: DEEP_BG,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          <RobotOutlined style={{ marginRight: 8 }} />
          智能导诊助手
        </Title>
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8', maxWidth: 960, margin: '0 auto' }}>
        {/* 说明横幅：依据宪法，导诊≠诊断 */}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16, fontSize: 16 }}
          message="请用一句话描述您的主要不适"
          description="例如：「头痛三天，伴头晕恶心」。导诊结果仅供就医路径参考，不构成诊断；出现胸痛、剧烈头痛、意识不清等情况请立即拨打 120。"
        />

        {/* 输入框：大字 */}
        <Card style={{ marginBottom: 16, borderRadius: 8 }}>
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="请描述您的症状，例如：咳嗽三天、发热 38.5℃、伴胸闷"
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{ fontSize: 18, padding: 12 }}
            disabled={loading}
          />
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              loading={loading}
              disabled={!input.trim()}
              onClick={() => void ask(input)}
              style={{ background: MID_BLUE, borderColor: MID_BLUE, fontSize: 16, height: 44 }}
            >
              开始导诊
            </Button>
          </div>
        </Card>

        {/* 错误态 */}
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16, fontSize: 16 }}
            message={error}
            action={
              <Button size="small" danger onClick={() => void ask(input)}>
                重试
              </Button>
            }
          />
        )}

        {/* 加载态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" tip="智能导诊正在分析您的症状…" />
          </div>
        )}

        {/* 空态 */}
        {isEmpty && (
          <Card>
            <Empty description="尚未开始导诊：请在上方输入框描述您的症状，系统将为您推荐科室与就诊准备事项" />
          </Card>
        )}

        {/* 结果态 */}
        {!loading && result && (
          <>
            {/* 紧急度 */}
            <Card
              style={{
                marginBottom: 16,
                borderRadius: 8,
                borderLeft: `6px solid ${URGENCY_TAG[result.urgency.level].color}`,
              }}
            >
              <Text style={{ fontSize: 18 }}>
                <Tag color={URGENCY_TAG[result.urgency.level].color} style={{ fontSize: 16, padding: '4px 12px' }}>
                  {result.urgency.recommendER ? <AlertOutlined /> : <ClockCircleOutlined />}
                  {' '}
                  {URGENCY_TAG[result.urgency.level].label}
                </Tag>
              </Text>
              <Paragraph style={{ marginTop: 12, fontSize: 17, marginBottom: 0 }}>
                {result.urgency.message}
              </Paragraph>
              {result.urgency.redFlags.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">识别到的高危关键词：</Text>
                  {result.urgency.redFlags.map((w) => (
                    <Tag key={w} color="red" style={{ marginLeft: 6 }}>
                      {w}
                    </Tag>
                  ))}
                </div>
              )}
            </Card>

            <Row gutter={[16, 16]}>
              {/* 推荐科室 */}
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <span style={{ color: '#fff', fontSize: 18 }}>
                      <AimOutlined style={{ marginRight: 8 }} />
                      推荐科室
                    </span>
                  }
                  style={{ background: DEEP_BG, borderRadius: 8 }}
                  bodyStyle={{ background: DEEP_BG }}
                >
                  {result.topDepts.length === 0 ? (
                    <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
                      未匹配到明确科室，建议到门诊大厅导诊台由护士人工分诊。
                    </Text>
                  ) : (
                    result.topDepts.map((d) => (
                      <div
                        key={d.deptCode}
                        style={{
                          padding: '12px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 18 }}>
                          {d.deptName}
                          <Tag color={ACCENT} style={{ marginLeft: 8 }}>
                            匹配度 {d.score}
                          </Tag>
                        </Text>
                        <div>
                          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15 }}>
                            {d.reason}
                          </Text>
                        </div>
                        <div>
                          {d.matchedSymptoms.map((s) => (
                            <Tag key={s} color={MID_BLUE} style={{ marginTop: 6 }}>
                              {s}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </Card>
              </Col>

              {/* 推荐医生 */}
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <span style={{ color: '#fff', fontSize: 18 }}>
                      <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                      推荐医生
                    </span>
                  }
                  style={{ background: DEEP_BG, borderRadius: 8 }}
                  bodyStyle={{ background: DEEP_BG }}
                >
                  {result.recommendedDoctors.length === 0 ? (
                    <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
                      当前时段暂无匹配医生排班，可先按推荐科室预约普通门诊。
                    </Text>
                  ) : (
                    <List
                      size="small"
                      dataSource={result.recommendedDoctors}
                      renderItem={(doc) => (
                        <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <div>
                            <Text style={{ color: '#fff', fontSize: 16 }}>
                              {doc.name} · {doc.title}（{doc.deptName}）
                            </Text>
                            <div>
                              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>
                                {doc.reason}
                              </Text>
                            </div>
                            <div>
                              {doc.scheduleTags.map((t) => (
                                <Tag key={t} color="green" style={{ marginTop: 4 }}>
                                  {t}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>

              {/* 就诊前准备 */}
              <Col span={24}>
                <Card
                  title={
                    <span style={{ fontSize: 18 }}>
                      <MedicineBoxOutlined style={{ marginRight: 8 }} />
                      就诊前准备
                    </span>
                  }
                  style={{ borderRadius: 8 }}
                >
                  <List
                    size="small"
                    dataSource={result.prepAdvice}
                    renderItem={(item, idx) => (
                      <List.Item>
                        <Text style={{ fontSize: 16 }}>
                          {idx + 1}. {item}
                        </Text>
                      </List.Item>
                    )}
                  />
                  <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    依据宪法：本导诊结果不构成诊断，最终诊疗方案以执业医师面诊为准。
                  </Text>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
