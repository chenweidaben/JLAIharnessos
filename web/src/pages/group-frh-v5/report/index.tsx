/**
 * 健澜科技 jlmedaios - 集团财务人力物资 V5 页（M273-B）
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
  timeRange: string;
  metrics: { centralizedProcurementRate: number; fundConcentration: number; unifiedRecruitmentRate: number; costReduction: number };
}

export default function GroupFRHV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/group-frh-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>集团财务人力物资 V5</Title>
        <Paragraph type="secondary">集团财务·合并报表·资金池 / 集团人力·统一人事·薪酬体系 / 集团物资·集中采购·SPD</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="集中采购率" value={`${data.metrics.centralizedProcurementRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="资金集中度" value={`${data.metrics.fundConcentration}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="统一招聘率" value={`${data.metrics.unifiedRecruitmentRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="成本下降" value={`${data.metrics.costReduction}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
