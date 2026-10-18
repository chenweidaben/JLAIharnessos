/**
 * 健澜科技 jlmedaios - 质控评审意见汇总前端页（M502-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：评审意见汇总卡片（总评审数/平均分/好评数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Summary {
  total: number;
  avgScore: number;
  positive: number;
}

interface Report {
  total: number;
  avgScore: number;
  positive: number;
  positiveRate: number;
}

export default function EmrQcReviewSummaryPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-review-summary", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setSummary(data?.data?.summary ?? null);
          setReport(data?.data?.report ?? null);
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
        <Title level={3} style={{ color: VI.deep }}>评审意见汇总</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Card headStyle={{ background: VI.mid, color: "#fff" }} title="总评审数">
              <Statistic value={summary?.total ?? 0} suffix="条" />
            </Card>
          </Col>
          <Col span={8}>
            <Card headStyle={{ background: VI.mid, color: "#fff" }} title="平均分">
              <Statistic value={summary?.avgScore ?? 0} precision={1} suffix="分" />
            </Card>
          </Col>
          <Col span={8}>
            <Card headStyle={{ background: VI.mid, color: "#fff" }} title="好评数">
              <Statistic
                value={summary?.positive ?? 0}
                suffix="条"
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
        </Row>
        {report && (
          <Card style={{ marginTop: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="好评率">
            <Text strong>好评率：</Text>
            <Tag color={report.positiveRate >= 80 ? "green" : "orange"} style={{ marginLeft: 8 }}>
              {report.positiveRate}%
            </Tag>
            <Text type="secondary" style={{ marginLeft: 16, fontSize: 12 }}>
              好评标准：评分 ≥ 80 分
            </Text>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
