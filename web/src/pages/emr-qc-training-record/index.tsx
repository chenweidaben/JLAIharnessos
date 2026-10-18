/**
 * 健澜科技 jlmedaios - 质控培训记录前端页（M503-D，V14，EMR 深化四模块，M503 收官）
 *
 * 深海蓝VI：培训记录列表（参训人/课程/日期）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TrainingRecord {
  user: string;
  course: string;
  date: string;
}

interface Aggregate {
  total: number;
  users: number;
}

export default function EmrQcTrainingRecordPage() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-training-record", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setRecords(data?.data?.records ?? []);
          setAggregate(data?.data?.aggregate ?? null);
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
        <Title level={3} style={{ color: VI.deep }}>培训记录</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="培训概览">
            <Statistic
              title="总记录数"
              value={aggregate.total}
              suffix="条"
              style={{ display: "inline-block", marginRight: 48 }}
            />
            <Statistic
              title="参训人数"
              value={aggregate.users}
              suffix="人"
              valueStyle={{ color: VI.accent }}
              style={{ display: "inline-block" }}
            />
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="培训记录明细">
          <List
            dataSource={records}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 100 }}>{item.user}</Text>
                <Tag color={VI.accent} style={{ width: 200 }}>{item.course}</Tag>
                <Tag color="default">{item.date}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
