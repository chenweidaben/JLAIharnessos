/**
 * 健澜科技 jlmedaios - 患者体验监测与改进 V5 页（M270-D）
 *
 * 满意度监测（门诊/住院/急诊/医技/护理/后勤/整体/实时评价）/NPS净推荐（推荐者/被动者/贬损者/NPS趋势/分科室）/差评闭环（差评实时告警/原因/整改/回访/根因/PDCA）/体验旅程（关键触点/满意度/痛点/爽点/旅程地图/断点）/投诉管理（分类/分级/处理/时限/回访/根因/改进/通报）/服务标兵（好评/表扬/服务之星/案例分享/激励）/体验改进（改进项目/责任/进度/效果/投入产出/持续）/体验指标（满意度/NPS/投诉率/差评闭环/改进完成率）。深海蓝 VI。
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
  satisfaction: { outpatient: number; inpatient: number; er: number; medTech: number; nursing: number; logistics: number; overall: number; realtime: number };
  nps: { promoters: number; passives: number; detractors: number; trend: number; byDept: number };
  badReview: { realtimeAlert: number; reason: number; remediation: number; returnVisit: number; rootCause: number; pdca: number };
  journey: { keyTouchpoint: number; satisfaction: number; painPoint: number; delight: number; journeyMap: number; breakpoint: number };
  complaint: { classification: number; grading: number; processing: number; deadline: number; returnVisit: number; rootCause: number; improvement: number; notification: number };
  serviceStar: { praise: number; serviceStar: number; caseShare: number; incentive: number };
  improvement: { project: number; owner: number; progress: number; effect: number; roi: number; continuous: number };
  metrics: { satisfaction: number; nps: number; complaintRate: number; badReviewClosure: number; improvementCompletion: number };
  suggestions: string[];
}

export default function PatientExperienceV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/patient-experience-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>患者体验监测与改进 V5</Title>
        <Paragraph type="secondary">满意度监测·门诊·住院·急诊·医技·护理·后勤·整体·实时评价 / NPS净推荐·推荐者·被动者·贬损者·NPS趋势·分科室 / 差评闭环·差评实时告警·原因·整改·回访·根因·PDCA</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="NPS" value={data.metrics.nps} /></Card></Col>
              <Col span={6}><Card><Statistic title="投诉率" value={`${data.metrics.complaintRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="差评闭环" value={`${data.metrics.badReviewClosure}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>体验明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "out", name: "门诊", value: `${data.satisfaction.outpatient}%` },
                  { key: "in", name: "住院", value: `${data.satisfaction.inpatient}%` },
                  { key: "er", name: "急诊", value: `${data.satisfaction.er}%` },
                  { key: "nursing", name: "护理", value: `${data.satisfaction.nursing}%` },
                ]}
                columns={[
                  { title: "科室", dataIndex: "name", key: "name" },
                  { title: "满意度", dataIndex: "value", key: "value" },
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
