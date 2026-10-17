/**
 * 健澜科技 jlmedaios - 错误经验拦截与回滚 V13 页（M299-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Report {
  experienceId: string;
  reason: string;
  flaggedCount: number;
  summary: string;
}

export default function RollbackPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Report>("/api/v1/rollback-report");
        if (!cancelled) setReport(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>经验回滚中心</Title>
        <Button danger style={{ marginBottom: 16 }}>一键回滚下线</Button>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && report && (
          <Card title="最近回滚报告">
            <Paragraph>{report.summary}</Paragraph>
            <Statistic title="已拦截建议数" value={report.flaggedCount} />
            <Tag color="red" style={{ marginTop: 12 }}>原因：{report.reason}</Tag>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
