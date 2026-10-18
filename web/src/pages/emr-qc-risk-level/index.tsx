/**
 * 健澜科技 jlmedaios - 质控风险等级评估前端页（M495-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：风险等级仪表盘（绿低/黄中/红高 Tag）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RiskAssessment {
  score: number;
  level: string;
}

interface RiskReport {
  level: string;
  score: number;
  suggestion: string;
}

const levelColor: Record<string, string> = {
  低风险: "green",
  中风险: "gold",
  高风险: "red",
};

export default function EmrQcRiskLevelPage() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [reports, setReports] = useState<RiskReport[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-risk-level", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setAssessments(data?.data?.assessments ?? []);
          setReports(data?.data?.reports ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控风险等级评估</Title>
        <Row gutter={16}>
          {assessments.map((a, index) => (
            <Col span={8} key={a.score}>
              <Card>
                <Statistic title={`评分 ${a.score}`} value={a.score} />
                <Tag color={levelColor[a.level] ?? "default"} style={{ marginTop: 16 }}>
                  {a.level}
                </Tag>
                {reports[index] && (
                  <Text style={{ display: "block", marginTop: 8 }}>
                    建议：{reports[index].suggestion}
                  </Text>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      </Content>
    </Layout>
  );
}
