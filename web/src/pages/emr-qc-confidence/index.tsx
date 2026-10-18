/**
 * 健澜科技 jlmedaios - 质控知识置信度评估前端页（M489-D，M489 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：置信度评分列表 + 评估结果。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Progress, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ConfidenceScore {
  ruleName: string;
  score: number;
}

interface ConfidenceAggregate {
  count: number;
  avgScore: number;
  maxScore: number;
}

const scoreColor = (score: number): string => {
  if (score >= 90) return "green";
  if (score >= 75) return "blue";
  return "orange";
};

export default function EmrQcConfidencePage() {
  const [scores, setScores] = useState<ConfidenceScore[]>([]);
  const [aggregate, setAggregate] = useState<ConfidenceAggregate>({ count: 0, avgScore: 0, maxScore: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-confidence", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setScores(data?.data?.scores ?? []);
          setAggregate(data?.data?.aggregate ?? { count: 0, avgScore: 0, maxScore: 0 });
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
        <Title level={3} style={{ color: VI.deep }}>质控知识置信度评估</Title>
        <Card style={{ marginBottom: 16 }}>
          <Text strong>规则数：{aggregate.count}</Text>
          <Text style={{ marginLeft: 24 }}>平均分：{aggregate.avgScore}</Text>
          <Text style={{ marginLeft: 24 }}>最高分：{aggregate.maxScore}</Text>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="置信度评分列表">
          <List
            dataSource={scores}
            renderItem={(item) => (
              <List.Item>
                <Text style={{ width: 200 }}>{item.ruleName}</Text>
                <Progress
                  percent={item.score}
                  strokeColor={VI.accent}
                  style={{ width: 300, marginRight: 16 }}
                />
                <Tag color={scoreColor(item.score)}>{item.score}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
