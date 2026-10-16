/**
 * 健澜科技 jlmedaios - 患者体验 V3 页（M241-D）
 *
 * 预约到院分诊就诊检查取药离院随访全旅程/门诊住院急诊手术医技满意度/NPS净推荐/投诉闭环/便民服务/患者志愿者共同决策。深海蓝 VI。
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
  journey: { booking: number; consultation: number; discharge: number; followup: number };
  satisfaction: { opd: number; ipd: number; or: number; tech: number };
  nps: { promoters: number; detractors: number };
  complaint: { total: number; closed: number };
  suggestions: string[];
}

export default function PatientExperienceV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/patient-experience-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>患者体验 V3</Title>
        <Paragraph type="secondary">预约·到院·分诊·就诊·检查·取药·离院·随访全旅程 / 门诊·住院·急诊·手术·医技满意度 / NPS 净推荐 / 投诉闭环 / 便民服务·共同决策</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="预约量" value={data.journey.booking} /></Card></Col>
              <Col span={6}><Card><Statistic title="门诊满意度" value={`${data.satisfaction.opd}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="NPS 推荐者" value={data.nps.promoters} /></Card></Col>
              <Col span={6}><Card><Statistic title="投诉闭环率" value={`${Math.round((data.complaint.closed / data.complaint.total) * 100)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>体验明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "ipd", name: "住院满意度", value: `${data.satisfaction.ipd}%` },
                  { key: "or", name: "手术满意度", value: `${data.satisfaction.or}%` },
                  { key: "tech", name: "医技满意度", value: `${data.satisfaction.tech}%` },
                  { key: "followup", name: "随访量", value: data.journey.followup },
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
