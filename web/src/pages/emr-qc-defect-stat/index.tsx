/**
 * 健澜科技 jlmedaios - 质控缺陷统计前端页（M500-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：缺陷统计柱状图（缺陷类型/数量）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Progress, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DefectStat {
  category: string;
  count: number;
}

interface Aggregate {
  total: number;
  categories: number;
}

export default function EmrQcDefectStatPage() {
  const [stats, setStats] = useState<DefectStat[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-defect-stat", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setStats(data?.data?.stats ?? []);
          setAggregate(data?.data?.aggregate ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const maxCount = Math.max(...stats.map((s) => s.count), 1);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>缺陷统计</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="统计概览">
            <Text strong>总缺陷数：</Text>
            <Tag color="red" style={{ marginLeft: 8 }}>{aggregate.total}</Tag>
            <Text strong style={{ marginLeft: 24 }}>分类数：</Text>
            <Tag color={VI.accent} style={{ marginLeft: 8 }}>{aggregate.categories}</Tag>
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="缺陷类型分布">
          <List
            dataSource={stats}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 120 }}>{item.category}</Text>
                <Progress
                  percent={Math.round((item.count / maxCount) * 100)}
                  strokeColor={VI.accent}
                  style={{ flex: 1, marginLeft: 16 }}
                  format={() => `${item.count} 例`}
                />
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
