/**
 * 健澜科技 jlmedaios - 质控科室整改跟踪前端页（M493-D，M493 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：科室整改进度跟踪表 + 完成率进度条。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Progress, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptRectify {
  dept: string;
  defect: string;
  status: string;
}

interface DeptRectifyTrack {
  total: number;
  completed: number;
  rate: number;
}

const statusColor: Record<string, string> = {
  已完成: "green",
  整改中: "orange",
  未开始: "default",
};

export default function EmrQcDeptRectifyPage() {
  const [records, setRecords] = useState<DeptRectify[]>([]);
  const [track, setTrack] = useState<DeptRectifyTrack>({ total: 0, completed: 0, rate: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-dept-rectify", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setRecords(data?.data?.records ?? []);
          setTrack(data?.data?.track ?? { total: 0, completed: 0, rate: 0 });
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
        <Title level={3} style={{ color: VI.deep }}>质控科室整改跟踪</Title>
        <Card style={{ marginBottom: 16 }}>
          <Text strong>总数：{track.total}</Text>
          <Text style={{ marginLeft: 24 }}>已完成：{track.completed}</Text>
          <Progress
            percent={track.rate}
            style={{ marginTop: 16 }}
            strokeColor={{ from: VI.accent, to: VI.mid }}
          />
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="整改记录">
          <List
            dataSource={records}
            renderItem={(item) => (
              <List.Item>
                <Text style={{ width: 100 }}>{item.dept}</Text>
                <Text style={{ flex: 1 }}>{item.defect}</Text>
                <Tag color={statusColor[item.status] ?? "default"}>{item.status}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
