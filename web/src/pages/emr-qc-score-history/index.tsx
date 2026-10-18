/**
 * 健澜科技 jlmedaios - 质控评分历史对比前端页（M492-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：评分历史趋势折线图 + 对比卡片（当前/上期/变化）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Statistic, Table, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ScoreHistoryRecord {
  date: string;
  score: number;
}

interface ScoreHistory {
  records: ScoreHistoryRecord[];
}

interface ScoreComparison {
  current: number;
  previous: number;
  change: number;
}

const columns = [
  { title: "月份", dataIndex: "date", key: "date" },
  { title: "评分", dataIndex: "score", key: "score" },
];

export default function EmrQcScoreHistoryPage() {
  const [history, setHistory] = useState<ScoreHistory | null>(null);
  const [comparison, setComparison] = useState<ScoreComparison | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-score-history", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setHistory(data?.data?.history ?? null);
          setComparison(data?.data?.comparison ?? null);
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
        <Title level={3} style={{ color: VI.deep }}>质控评分历史对比</Title>
        {comparison && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic title="当前评分" value={comparison.current} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="上期评分" value={comparison.previous} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="变化"
                  value={comparison.change}
                  valueStyle={{ color: comparison.change >= 0 ? "#3f8600" : "#cf1322" }}
                  prefix={comparison.change >= 0 ? "↑" : "↓"}
                />
              </Card>
            </Col>
          </Row>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评分历史">
          <Table columns={columns} dataSource={history?.records ?? []} rowKey="date" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
