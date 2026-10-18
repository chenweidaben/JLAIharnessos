/**
 * 健澜科技 jlmedaios - 质控科室对比雷达图前端页（M506-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：科室对比雷达图（维度/得分）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RadarDimension {
  name: string;
  score: number;
}

interface RadarChart {
  dept: string;
  dimensions: RadarDimension[];
}

interface Aggregate {
  dept: string;
  avgScore: number;
  totalDims: number;
}

export default function EmrQcDeptRadarChartPage() {
  const [charts, setCharts] = useState<RadarChart[]>([]);
  const [aggregates, setAggregates] = useState<Aggregate[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-dept-radar-chart", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const result = await resp.json();
          setCharts(result?.data?.charts ?? []);
          setAggregates(result?.data?.aggregates ?? []);
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
        <Title level={3} style={{ color: VI.deep }}>科室对比雷达图</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="科室汇总">
          {aggregates.map((a) => (
            <div key={a.dept} style={{ display: "inline-block", marginRight: 48 }}>
              <Statistic
                title={`${a.dept}（${a.totalDims} 维度）`}
                value={a.avgScore}
                suffix="分"
                valueStyle={{ color: a.avgScore >= 85 ? "#3f8600" : a.avgScore >= 75 ? "#faad14" : "#cf1322" }}
              />
            </div>
          ))}
        </Card>
        {charts.map((chart) => (
          <Card key={chart.dept} style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title={`${chart.dept}维度得分`}>
            <List
              dataSource={chart.dimensions}
              renderItem={(dim) => (
                <List.Item>
                  <Text strong style={{ width: 160, color: VI.deep }}>{dim.name}</Text>
                  <Tag color={dim.score >= 90 ? "green" : dim.score >= 80 ? "blue" : "orange"} style={{ width: 80 }}>
                    {dim.score} 分
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        ))}
      </Content>
    </Layout>
  );
}
