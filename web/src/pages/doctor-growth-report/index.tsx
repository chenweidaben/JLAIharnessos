/**
 * 健澜科技 jlmedaios - 医生个人月度成长报告 V13 页（M310-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Report {
  doctorId: string;
  month: string;
  tasksDone: number;
  suggestionsAdopted: number;
  sopReferences: number;
  badgeDelta: number;
}

interface Resp {
  report: Report;
  momGrowth: number;
  milestone: string;
}

export default function DoctorGrowthReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/doctor-growth-report?doctorId=d1&month=2026-10");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>医生月报</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card>
            <Tag color="blue" style={{ marginBottom: 16 }}>
              {data.report.doctorId} · {data.report.month} · 环比 {data.momGrowth}pp
            </Tag>
            <Tag color={data.milestone === "本月成长显著" ? "gold" : "default"} style={{ marginBottom: 16, marginLeft: 8 }}>
              {data.milestone}
            </Tag>
            <Row gutter={16}>
              <Col span={6}><Statistic title="任务完成" value={data.report.tasksDone} /></Col>
              <Col span={6}><Statistic title="建议采纳" value={data.report.suggestionsAdopted} /></Col>
              <Col span={6}><Statistic title="SOP引用" value={data.report.sopReferences} /></Col>
              <Col span={6}><Statistic title="徽章变化" value={data.report.badgeDelta} /></Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
