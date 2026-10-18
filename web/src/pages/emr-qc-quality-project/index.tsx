/**
 * 健澜科技 jlmedaios - 质控质量改进项目前端页（M504-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质量改进项目列表（项目名/负责人/状态）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QualityProject {
  name: string;
  owner: string;
  status: string;
}

const statusColor = (status: string) => {
  if (status === "已完成") return "green";
  if (status === "进行中") return "blue";
  return "default";
};

export default function EmrQcQualityProjectPage() {
  const [projects, setProjects] = useState<QualityProject[]>([]);
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<string>("进行中");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-quality-project", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setProjects(data?.data?.projects ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const addProject = async () => {
    if (!name.trim()) {
      message.warning("请输入项目名");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-quality-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ name, owner, status }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setProjects(data?.data?.projects ?? []);
        setName("");
        setOwner("");
        setStatus("进行中");
        message.success("添加成功");
      } else {
        message.error("添加失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质量改进项目</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="添加项目">
          <Form layout="inline">
            <Form.Item label="项目名">
              <Input placeholder="项目名" value={name} onChange={(e) => setName(e.target.value)} />
            </Form.Item>
            <Form.Item label="负责人">
              <Input placeholder="负责人" value={owner} onChange={(e) => setOwner(e.target.value)} />
            </Form.Item>
            <Form.Item label="状态">
              <Input
                placeholder="进行中/已完成/未开始"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={addProject}>
                添加
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`项目列表（共 ${projects.length} 个）`}>
          <List
            dataSource={projects}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 200 }}>{item.name}</Text>
                <Tag color={VI.accent} style={{ width: 100 }}>{item.owner}</Tag>
                <Tag color={statusColor(item.status)}>{item.status}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
