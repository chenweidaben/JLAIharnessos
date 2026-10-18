/**
 * 健澜科技 jlmedaios - 质控缺陷趋势图前端页（M506-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：缺陷趋势图（月份/缺陷数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TrendPoint {
  month: string;
  count: number;
}

interface Aggregate {
  total: number;
  avg: number;
  max: number;
  min: number;
}

export default function EmrQcDefectTrendChartPage() {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-defect-trend-chart", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const result = await resp.json();
          setData(result?.data?.data ?? []);
          setAggregate(result?.data?.aggregate ?? null);
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
        <Title level={3} style={{ color: VI.deep }}>缺陷趋势图</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="统计概览">
            <Statistic title="总缺陷数" value={aggregate.total} suffix="件" style={{ display: "inline-block", marginRight: 48 }} />
            <Statistic title="月均" value={aggregate.avg} suffix="件" style={{ display: "inline-block", marginRight: 48 }} />
            <Statistic title="峰值" value={aggregate.max} suffix="件" valueStyle={{ color: "#cf1322" }} style={{ display: "inline-block", marginRight: 48 }} />
            <Statistic title="谷值" value={aggregate.min} suffix="件" valueStyle={{ color: "#3f8600" }} style={{ display: "inline-block" }} />
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="月度趋势">
          <List
            dataSource={data}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 120, color: VI.deep }}>{item.month}</Text>
                <Tag color={item.count > 50 ? "red" : item.count > 30 ? "orange" : "green"} style={{ width: 80 }}>
                  {item.count} 件
                </Tag>
                <Text type="secondary">
                  {item.count > 50 ? "缺陷偏高" : item.count > 30 ? "缺陷适中" : "缺陷较低"}
                </Text>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
