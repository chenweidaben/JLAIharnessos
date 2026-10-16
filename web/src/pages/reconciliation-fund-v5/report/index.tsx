/**
 * 健澜科技 jlmedaios - 对账清算与医保基金监管 V5 页（M271-D）
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
  metrics: { reconciliationSuccessRate: number; rejectionRate: number; fundRiskPoint: number; clearingCycle: number };
}

export default function ReconciliationFundV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/reconciliation-fund-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>对账清算与医保基金监管 V5</Title>
        <Paragraph type="secondary">医保对账·明细上传·返单·差异·拒付 / 基金监管·智能审核·疑点·违规·扣款</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="对账成功率" value={`${data.metrics.reconciliationSuccessRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="拒付率" value={`${data.metrics.rejectionRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="基金风险点" value={data.metrics.fundRiskPoint} /></Card></Col>
            <Col span={6}><Card><Statistic title="清算周期" value={`${data.metrics.clearingCycle}天`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
