/**
 * 健澜科技 jlmedaios - 质控专家库管理前端页（M502-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：专家库管理列表（专家姓名/科室/专业）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Expert {
  name: string;
  dept: string;
  specialty: string;
}

export default function EmrQcExpertLibraryPage() {
  const [library, setLibrary] = useState<Expert[]>([]);
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-expert-library", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLibrary(data?.data?.library ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const addExpert = async () => {
    if (!name.trim()) {
      message.warning("请输入专家姓名");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-expert-library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ name, dept, specialty }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setLibrary(data?.data?.library ?? []);
        setName("");
        setDept("");
        setSpecialty("");
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
        <Title level={3} style={{ color: VI.deep }}>专家库管理</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="添加专家">
          <Form layout="inline">
            <Form.Item label="姓名">
              <Input placeholder="专家姓名" value={name} onChange={(e) => setName(e.target.value)} />
            </Form.Item>
            <Form.Item label="科室">
              <Input placeholder="科室" value={dept} onChange={(e) => setDept(e.target.value)} />
            </Form.Item>
            <Form.Item label="专业">
              <Input placeholder="专业方向" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={addExpert}>
                添加
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`专家列表（共 ${library.length} 人）`}>
          <List
            dataSource={library}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 100 }}>{item.name}</Text>
                <Tag color={VI.accent} style={{ width: 80 }}>{item.dept}</Tag>
                <Tag color="blue">{item.specialty}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
