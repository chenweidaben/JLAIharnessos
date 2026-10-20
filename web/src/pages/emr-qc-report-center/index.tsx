/**
 * 健澜科技 jlmedaios - 病历质控报表中心前端页（M478-D，M478 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：报表目录卡片网格（日报/周报/月报/年报分类标签）+ 生成按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Spin, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ReportItem {
  id: string;
  name: string;
  category: string;
}

const categoryColor: Record<string, string> = {
  "日报": "blue",
  "周报": "cyan",
  "月报": "geekblue",
  "年报": "purple",
};

export default function EmrQcReportCenterPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-report-center", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setReports(data?.center?.reports ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const generate = async (reportId: string, name: string) => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-report-center/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ reportId, dept: "内科", period: "2026-10" }),
      });
      if (resp.ok) {
        message.success(`${name} 已生成`);
      }
    } catch {
      message.error("生成失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控报表中心</Title>
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            {reports.map((r) => (
              <Col span={6} key={r.id}>
                <Card hoverable>
                  <Tag color={categoryColor[r.category] ?? "default"} style={{ marginBottom: 12 }}>
                    {r.category}
                  </Tag>
                  <Title level={5} style={{ color: VI.deep, margin: 0 }}>{r.name}</Title>
                  <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                    ID: {r.id}
                  </Text>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => generate(r.id, r.name)}
                    style={{ background: VI.accent, marginTop: 12 }}
                  >
                    生成
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </Spin>
      </Content>
    </Layout>
  );
}
