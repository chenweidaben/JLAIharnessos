/**
 * 健澜科技 jlmedaios - 卫生健康统计与医改监测上报 V5 页（M278-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  totalTasks: number;
  draftCount: number;
  validatedCount: number;
  submittedCount: number;
  pendingValidation: number;
}

export default function ReportingStatsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/reporting-stats");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>卫生健康统计与医改监测上报 V5</Title>
        <Paragraph type="secondary">报表生成·缺项逻辑口径校验·上报·本地与已上报差异</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="任务总数" value={data.totalTasks} /></Card></Col>
            <Col span={6}><Card><Statistic title="已上报" value={data.submittedCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="已校验" value={data.validatedCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="待校验" value={data.pendingValidation} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
