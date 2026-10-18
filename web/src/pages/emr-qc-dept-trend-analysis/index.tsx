/**
 * 健澜科技 jlmedaios - 质控科室趋势分析前端页（M501-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：科室趋势分析折线图（月度评分趋势）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Tag, Typography, message } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from "@ant-design/icons";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptTrend {
  dept: string;
  monthlyScores: number[];
}

interface Aggregate {
  improving: number;
  declining: number;
}

export default function EmrQcDeptTrendAnalysisPage() {
  const [trends, setTrends] = useState<DeptTrend[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-dept-trend-analysis", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setTrends(data?.data?.trends ?? []);
          setAggregate(data?.data?.aggregate ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const getTrendIcon = (scores: number[]) => {
    if (scores.length < 2) return <MinusOutlined />;
    const first = scores[0];
    const last = scores[scores.length - 1];
    if (last > first) return <ArrowUpOutlined style={{ color: "green" }} />;
    if (last < first) return <ArrowDownOutlined style={{ color: "red" }} />;
    return <MinusOutlined style={{ color: "gray" }} />;
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>科室趋势分析</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="趋势概览">
            <Text strong>上升科室：</Text>
            <Tag color="green" style={{ marginLeft: 8 }}>{aggregate.improving}</Tag>
            <Text strong style={{ marginLeft: 24 }}>下降科室：</Text>
            <Tag color="red" style={{ marginLeft: 8 }}>{aggregate.declining}</Tag>
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="月度评分趋势">
          <List
            dataSource={trends}
            renderItem={(item) => (
              <List.Item>
                {getTrendIcon(item.monthlyScores)}
                <Text strong style={{ width: 100, marginLeft: 8 }}>{item.dept}</Text>
                <Tag color={VI.accent}>{item.monthlyScores.join(" → ")}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
