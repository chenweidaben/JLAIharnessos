/**
 * 健澜科技 jlmedaios - 智慧医院三位一体评级 V5 页（M267-D）
 *
 * 三位一体（医疗服务智慧化/管理智慧化/患者服务智慧化）/患者服务智慧（互联网医院/自助服务/移动支付/信息推送/满意度）/医疗服务智慧（CDSS/移动医护/闭环/AI辅助/合理用药）/管理智慧（运营驾驶舱/HRP/绩效/质量安全/决策支持）/评级指标（智慧医院评价指标/得分/等级/差距/整改）/体验评价（患者体验/医护体验/管理者体验/NPS/反馈）/创新应用（5G/物联网/机器人/数字孪生/AI大脑/特色亮点）/持续改进（标杆/自评/年度复评/迭代规划/价值量化）。深海蓝 VI。
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
  triad: { patientSmart: number; careSmart: number; managementSmart: number };
  patientSmart: { internetHospital: number; selfService: number; mobilePayment: number; notification: number; satisfaction: number };
  careSmart: { cdss: number; mobileNurse: number; closedLoop: number; aiAssist: number; medRationale: number };
  managementSmart: { dashboard: number; hrp: number; performance: number; quality: number; decision: number };
  evaluation: { indicator: number; score: number; grade: string; gap: number; remediation: number };
  experience: { patient: number; staff: number; manager: number; nps: number; feedback: number };
  innovation: { g5: number; iot: number; robot: number; digitalTwin: number; aiBrain: number; showcase: number };
  postImprovement: { benchmark: number; selfReview: number; annualReview: number; iteration: number; value: number };
  metrics: { totalScore: number; grade: string; level: string; experienceScore: number; innovationCount: number };
  suggestions: string[];
}

export default function SmartHospitalV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/smart-hospital-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>智慧医院三位一体评级 V5</Title>
        <Paragraph type="secondary">三位一体·医疗服务智慧化·管理智慧化·患者服务智慧化 / 患者服务智慧·互联网医院·自助服务·移动支付·信息推送·满意度 / 医疗服务智慧·CDSS·移动医护·闭环·AI辅助·合理用药</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="总分" value={data.metrics.totalScore} suffix={`(${data.metrics.grade})`} /></Card></Col>
              <Col span={6}><Card><Statistic title="等级" value={data.metrics.level} /></Card></Col>
              <Col span={6}><Card><Statistic title="体验分" value={data.metrics.experienceScore} /></Card></Col>
              <Col span={6}><Card><Statistic title="创新应用" value={data.metrics.innovationCount} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>三位一体明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "patient", name: "患者服务智慧", value: `${data.triad.patientSmart}%` },
                  { key: "care", name: "医疗服务智慧", value: `${data.triad.careSmart}%` },
                  { key: "mgmt", name: "管理智慧", value: `${data.triad.managementSmart}%` },
                  { key: "cdss", name: "CDSS", value: `${data.careSmart.cdss}%` },
                ]}
                columns={[
                  { title: "维度", dataIndex: "name", key: "name" },
                  { title: "得分", dataIndex: "value", key: "value" },
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
