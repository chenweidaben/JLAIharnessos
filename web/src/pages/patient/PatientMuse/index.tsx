/**
 * 健澜科技 jlmedaios - 【知识图谱与 Personal Agent】M175-D 患者个人智能体 Patient MUSE
 *
 * 患者智能体要「真帮患者」，而不是一块冷冰冰的看板。本页自上而下把「越用越懂我」的
 * 个人健康助手铺开：
 *   ① 健康画像：疾病 / 用药（含依从性）/ 检查 / 过敏 / 家族史；
 *   ② 就医偏好：就诊时段 / 偏好医生 / 缴费方式 / 提醒渠道；
 *   ③ 健康提醒：服药 / 复查 / 体检 / 疫苗（按优先级）；
 *   ④ 智能洞察：替患者发现的问题（漏服药、异常化验、家族史高危、过敏风险）+ 下一步；
 *   ⑤ 个性化服务推荐：下一步真正该做的事（挂号/随访/食谱/运动），按优先级；
 *   ⑥ 健康目标进度：减重/控糖的真实进度 vs 时间进度，on_track / at_risk / off_track。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调；适老化大字号、高对比。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  AlertOutlined,
  CalendarOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  RocketOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const PAGE_BG = '#f5f7fa';

/* ---- 与 BFF patientMuse agent 输出对齐的前端类型 ---- */
interface MuseDisease { name: string; since?: string; status: 'controlled' | 'monitoring' | 'unstable' }
interface ProfileMedication { drug: string; dose: string; frequency: string; adherence?: 'good' | 'partial' | 'poor' }
interface ProfileCheckup { item: string; date: string; result: 'normal' | 'abnormal' | 'pending'; note?: string }
interface ProfileAllergy { allergen: string; reaction: string }
interface ProfileFamilyHistory { relation: string; condition: string }
interface DeepHealthProfile {
  diseases: MuseDisease[];
  medications: ProfileMedication[];
  checkups: ProfileCheckup[];
  allergies: ProfileAllergy[];
  familyHistory: ProfileFamilyHistory[];
}
interface VisitPreferences {
  preferredTime: string;
  preferredDoctor?: string;
  preferredDept?: string;
  paymentMethod: string;
  reminderChannels: string[];
}
interface DeepHealthGoal {
  type: string; startValue: number; currentValue: number; targetValue: number; unit: string;
}
interface MuseReminder { type: string; title: string; dueDate: string; priority: 'high' | 'medium' | 'low' }
interface PatientInsight { kind: string; level: 'high' | 'medium' | 'low'; message: string; action: string }
interface PatientMUSE {
  patientId: string;
  profile: DeepHealthProfile;
  preferences: VisitPreferences;
  goals: DeepHealthGoal[];
  reminders: MuseReminder[];
  insights: PatientInsight[];
  riskScore: number;
  summary: string;
}
interface PatientServiceItem {
  type: string; title: string; reason: string; priority: 'high' | 'medium' | 'low'; action: string;
}
interface PatientServiceRecommendation { services: PatientServiceItem[]; summary: string }
interface HealthProgress {
  typeLabel: string; unit: string; startValue: number; currentValue: number; targetValue: number;
  progressPercent: number; timePercent: number; achieved: boolean;
  status: 'achieved' | 'on_track' | 'at_risk' | 'off_track';
  trend: 'improving' | 'stable' | 'worsening'; nextAction: string;
}
interface MuseAgent {
  muse: PatientMUSE;
  recommendation: PatientServiceRecommendation;
  progress: HealthProgress[];
}
interface MuseView { patientId: string; agent: MuseAgent }

const PRIORITY_COLOR: Record<string, string> = { high: 'red', medium: 'orange', low: 'blue' };
const LEVEL_COLOR: Record<string, string> = { high: '#cf1322', medium: '#d48806', low: '#52c41a' };
const STATUS_COLOR: Record<string, string> = {
  achieved: '#52c41a', on_track: '#52c41a', at_risk: '#d48806', off_track: '#cf1322',
};
const STATUS_LABEL: Record<string, string> = {
  achieved: '已达标', on_track: '节奏正常', at_risk: '略有落后', off_track: '明显落后',
};
const ADHERENCE_LABEL: Record<string, string> = { good: '依从好', partial: '偶尔漏服', poor: '经常漏服' };
const ADHERENCE_COLOR: Record<string, string> = { good: 'green', partial: 'orange', poor: 'red' };
const PAYMENT_LABEL: Record<string, string> = {
  cash: '现金', insurance: '医保', mobile: '移动支付', family_pay: '家属代缴',
};

export default function PatientMusePage() {
  const [patientId] = useState('P-2026101601');
  const [data, setData] = useState<MuseAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await fetch(`/api/v1/patient/muse/${patientId}`);
        const json = await resp.json();
        if (json.code !== 0) throw new Error(json.message || '加载失败');
        const d = json.data as MuseView;
        if (!cancelled) setData(d.agent);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '网络异常');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
        <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <Spin size="large" tip="正在为您整理个人健康助手…" />
        </Content>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
        <Content style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
          <Alert type="error" showIcon message="加载失败" description={error || '暂无数据'} />
        </Content>
      </Layout>
    );
  }

  const { muse, recommendation, progress } = data;
  const riskLevel = muse.riskScore >= 50 ? '高' : muse.riskScore >= 25 ? '中' : '低';

  return (
    <Layout style={{ minHeight: '100vh', background: PAGE_BG }}>
      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto', fontSize: 16 }}>
        {/* 头部：深海蓝横幅 */}
        <Card
          style={{ background: `linear-gradient(135deg, ${DEEP_BG} 0%, ${MID_BLUE} 100%)`, border: 'none', marginBottom: 16 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Title level={3} style={{ color: '#fff', margin: 0 }}>
                <UserOutlined /> 我的个人健康助手（Patient MUSE）
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 0', fontSize: 16 }}>
                {muse.summary}
              </Paragraph>
            </div>
            <Badge count="Personal Agent" style={{ background: ACCENT }} />
          </div>
        </Card>

        {/* 风险条 */}
        <Alert
          style={{ marginBottom: 16, fontSize: 16 }}
          type={muse.riskScore >= 50 ? 'warning' : 'success'}
          showIcon
          icon={<HeartOutlined />}
          message={`我的健康风险分：${muse.riskScore} / 100（${riskLevel}）`}
          description={
            <Progress
              percent={muse.riskScore}
              strokeColor={{ from: MID_BLUE, to: muse.riskScore >= 50 ? '#cf1322' : ACCENT }}
              style={{ maxWidth: 360, marginBottom: 0 }}
            />
          }
        />

        {/* ④ 智能洞察（真帮患者的核心，置顶） */}
        <Card
          title={<span style={{ color: MID_BLUE, fontSize: 18 }}><AlertOutlined /> 智能提醒（替您盯着）</span>}
          style={{ marginBottom: 16 }}
          size="small"
        >
          <List
            dataSource={muse.insights}
            renderItem={(ins) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <SpaceBetween>
                    <Text style={{ fontSize: 16 }}>{ins.message}</Text>
                    <Tag color={LEVEL_COLOR[ins.level]}>{ins.level === 'high' ? '重点' : ins.level === 'medium' ? '建议' : '了解'}</Tag>
                  </SpaceBetween>
                  <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 14 }}>→ {ins.action}</Paragraph>
                </div>
              </List.Item>
            )}
          />
        </Card>

        {/* ⑤ 个性化服务推荐 */}
        <Card
          title={<span style={{ color: MID_BLUE, fontSize: 18 }}><RocketOutlined /> 为您推荐的下一步</span>}
          style={{ marginBottom: 16 }}
          size="small"
          extra={<Text type="secondary">{recommendation.summary}</Text>}
        >
          <Row gutter={[12, 12]}>
            {recommendation.services.map((s) => (
              <Col xs={24} sm={12} key={s.title}>
                <Card size="small" style={{ borderTop: `3px solid ${PRIORITY_COLOR[s.priority]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong style={{ color: DEEP_BG, fontSize: 16 }}>{s.title}</Text>
                    <Tag color={PRIORITY_COLOR[s.priority]}>{s.priority === 'high' ? '优先' : s.priority === 'medium' ? '建议' : '可选'}</Tag>
                  </div>
                  <Paragraph type="secondary" style={{ margin: '6px 0', fontSize: 14 }}>为什么：{s.reason}</Paragraph>
                  <Text style={{ fontSize: 14, color: MID_BLUE }}>怎么做：{s.action}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* ⑥ 健康目标进度 */}
        <Card
          title={<span style={{ color: MID_BLUE, fontSize: 18 }}><CalendarOutlined /> 我的健康目标进度</span>}
          style={{ marginBottom: 16 }}
          size="small"
        >
          {progress.map((p) => (
            <div key={p.typeLabel} style={{ marginBottom: 16 }}>
              <SpaceBetween>
                <Text strong style={{ fontSize: 16 }}>{p.typeLabel}</Text>
                <Tag color={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status]}</Tag>
              </SpaceBetween>
              <Paragraph style={{ margin: '4px 0', fontSize: 14 }}>
                {p.startValue}{p.unit} → <Text strong>{p.currentValue}{p.unit}</Text>（目标 {p.targetValue}{p.unit}）
              </Paragraph>
              <Progress
                percent={p.progressPercent}
                strokeColor={STATUS_COLOR[p.status]}
                format={(percent) => `真实进度 ${percent}% · 时间 ${p.timePercent}%`}
              />
              <Text type="secondary" style={{ fontSize: 14 }}>{p.nextAction}</Text>
            </div>
          ))}
        </Card>

        <Row gutter={[16, 16]}>
          {/* ① 健康画像 */}
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ color: MID_BLUE, fontSize: 17 }}>① 我的健康画像</span>}
              size="small"
              style={{ marginBottom: 16 }}
            >
              <Paragraph strong style={{ marginBottom: 4 }}>疾病</Paragraph>
              {muse.profile.diseases.map((d) => (
                <Tag key={d.name} color={d.status === 'unstable' ? 'red' : d.status === 'monitoring' ? 'orange' : 'green'}>
                  {d.name}
                </Tag>
              ))}
              <Paragraph strong style={{ margin: '8px 0 4px' }}>在用药物（含依从性）</Paragraph>
              <List
                size="small"
                dataSource={muse.profile.medications}
                renderItem={(m) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Text style={{ fontSize: 15 }}>{m.drug} {m.dose} {m.frequency}</Text>
                    <Tag color={ADHERENCE_COLOR[m.adherence ?? 'good']}>{ADHERENCE_LABEL[m.adherence ?? 'good']}</Tag>
                  </List.Item>
                )}
              />
              <Paragraph strong style={{ margin: '8px 0 4px' }}>近期检查</Paragraph>
              {muse.profile.checkups.map((c) => (
                <Tag key={c.item} color={c.result === 'abnormal' ? 'red' : c.result === 'normal' ? 'green' : 'default'}>
                  {c.item}{c.note ? `（${c.note}）` : ''}
                </Tag>
              ))}
              <Paragraph strong style={{ margin: '8px 0 4px' }}>过敏史</Paragraph>
              {muse.profile.allergies.map((a) => (
                <Tag key={a.allergen} color="warning">{a.allergen}（{a.reaction}）</Tag>
              ))}
              <Paragraph strong style={{ margin: '8px 0 4px' }}>家族史</Paragraph>
              {muse.profile.familyHistory.map((f) => (
                <Tag key={`${f.relation}${f.condition}`}>{f.relation}：{f.condition}</Tag>
              ))}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            {/* ② 就医偏好 */}
            <Card
              title={<span style={{ color: MID_BLUE, fontSize: 17 }}>② 我的就医偏好</span>}
              size="small"
              style={{ marginBottom: 16 }}
            >
              <List size="small">
                <List.Item><Text>偏好时段</Text><Tag color={ACCENT}>{muse.preferences.preferredTime === 'forenoon' ? '上午' : muse.preferences.preferredTime}</Tag></List.Item>
                <List.Item><Text>偏好医生</Text><Text>{muse.preferences.preferredDoctor ?? '无'}</Text></List.Item>
                <List.Item><Text>偏好科室</Text><Text>{muse.preferences.preferredDept ?? '无'}</Text></List.Item>
                <List.Item><Text>缴费方式</Text><Tag>{PAYMENT_LABEL[muse.preferences.paymentMethod] ?? muse.preferences.paymentMethod}</Tag></List.Item>
                <List.Item><Text>提醒渠道</Text><Text>{muse.preferences.reminderChannels.join(' / ')}</Text></List.Item>
              </List>
            </Card>

            {/* ③ 健康提醒 */}
            <Card
              title={<span style={{ color: MID_BLUE, fontSize: 17 }}><MedicineBoxOutlined /> ③ 待办提醒</span>}
              size="small"
            >
              <List
                size="small"
                dataSource={muse.reminders}
                renderItem={(r) => (
                  <List.Item>
                    <Text style={{ fontSize: 15 }}>{r.title}</Text>
                    <Tag color={PRIORITY_COLOR[r.priority]}>{r.dueDate}</Tag>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        <Paragraph style={{ textAlign: 'center', color: '#bbb', fontSize: 13, marginTop: 24 }}>
          杭州健澜科技有限公司 · 【知识图谱与 Personal Agent】患者个人智能体 M175-D
        </Paragraph>
      </Content>
    </Layout>
  );
}

/** 左右布局小助手 */
function SpaceBetween({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      {children}
    </div>
  );
}
