/**
 * 健澜科技 jlmedaios - 病历质控智能报表前端页（M470-D，V14，EMR 深化四模块，M470 收官）
 *
 * 深海蓝VI：报表卡片（期间/总病历/通过率/缺陷率）+ 关键发现列表。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Col, Layout, List, Row, Statistic, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SmartReport {
  period: string;
  totalRecords: number;
  passCount: number;
  defectCount: number;
  passRate: number;
  defectRate: number;
  generatedAt: string;
}

export default function EmrSmartReportPage() {
  const [report, setReport] = useState<SmartReport | null>(null);
  const [findings, setFindings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-smart-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          period: "2026-10",
          totalRecords: 1000,
          passCount: 950,
          defectCount: 50,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setReport(data?.report ?? null);
        setFindings(data?.findings ?? []);
      }
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控智能报表</Title>
        <Card>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={handleGenerate}>
            生成本月报表
          </Button>
        </Card>
        {report && (
          <>
            <Card title={`报表期间：${report.period}`} headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="总病历数" value={report.totalRecords} />
                </Col>
                <Col span={6}>
                  <Statistic title="通过率" value={report.passRate} suffix="%" valueStyle={{ color: "#52c41a" }} />
                </Col>
                <Col span={6}>
                  <Statistic title="缺陷率" value={report.defectRate} suffix="%" valueStyle={{ color: "#cf1322" }} />
                </Col>
                <Col span={6}>
                  <Text type="secondary">生成时间：{report.generatedAt.slice(0, 10)}</Text>
                </Col>
              </Row>
            </Card>
            <Card title="关键发现" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginTop: 16 }}>
              <List
                dataSource={findings}
                renderItem={(item: string) => (
                  <List.Item>
                    <Tag color={item.includes("良好") ? "green" : item.includes("整改") ? "red" : "orange"}>
                      {item}
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
