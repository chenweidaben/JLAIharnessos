/**
 * 健澜科技 jlmedaios - AI 患者陪伴 V5 页（M259-C）
 *
 * 高血压糖尿病冠心病用药提醒指标采集并发症预警/服药提醒依从性药物相互作用不良反应用药教育/情绪监测冥想认知行为心理咨询转介危机识别/AI外呼微信随访问卷异常转人工满意度/饮食运动睡眠戒烟限酒个性化推荐/图文视频动画互动问答学习进度健康素养/依从率指标达标随访完成情绪改善满意度。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  chronic: { htn: number; dm: number; chd: number; medReminder: number; metricCollection: number; complicationAlert: number };
  medication: { medReminder: number; adherence: number; interaction: number; adr: number; education: number };
  emotion: { monitoring: number; meditation: number; cbt: number; counseling: number; referral: number; crisis: number };
  followup: { aiCall: number; wechat: number; survey: number; anomaly: number; human: number; satisfaction: number };
  lifestyle: { diet: number; exercise: number; sleep: number; smoking: number; alcohol: number; personalized: number };
  learning: { infographic: number; video: number; animation: number; interactive: number; progress: number; literacy: number };
  aiMetrics: { adherence: number; metricTarget: number; followupComplete: number; emotionImprove: number; satisfaction: number };
  suggestions: string[];
}

export default function PatientCompanionV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/patient-companion-v5/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>AI 患者陪伴 V5</Title>
        <Paragraph type="secondary">高血压·糖尿病·冠心病·用药提醒·指标采集·并发症预警 / 服药提醒·依从性·相互作用·ADR·用药教育 / 情绪监测·冥想·CBT·心理咨询·转介·危机识别 / AI 外呼·微信随访·问卷·异常转人工·满意度 / 饮食·运动·睡眠·戒烟·限酒·个性化推荐</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="高血压患者" value={data.chronic.htn} /></Card></Col>
              <Col span={6}><Card><Statistic title="依从性" value={`${data.aiMetrics.adherence}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="随访完成率" value={`${data.aiMetrics.followupComplete}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.aiMetrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>陪伴明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "medReminder", name: "用药提醒", value: `${data.chronic.medReminder}%` },
                  { key: "emotion", name: "情绪监测", value: data.emotion.monitoring },
                  { key: "wechat", name: "微信随访", value: data.followup.wechat },
                  { key: "literacy", name: "健康素养", value: `${data.learning.literacy}%` },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
