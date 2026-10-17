/**
 * 健澜科技 jlmedaios - MUSE 主动提醒引擎 V5 页（M284-C）
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
  totalRules: number;
  totalLogs: number;
  suppressedCount: number;
}

export default function MuseReminderPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/muse-reminder/logs");
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
        <Title level={3} style={{ color: VI.deep }}>MUSE 主动提醒引擎</Title>
        <Paragraph type="secondary">规则触发·静音窗口·去重抑制</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}><Card><Statistic title="规则数" value={data.totalRules} /></Card></Col>
            <Col span={8}><Card><Statistic title="已发送" value={data.totalLogs} /></Card></Col>
            <Col span={8}><Card><Statistic title="被抑制" value={data.suppressedCount} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
