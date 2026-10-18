/**
 * 健澜科技 jlmedaios - 质控规范库管理前端页（M505-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：规范库管理列表（规范名/分类/版本）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Norm {
  title: string;
  category: string;
  version: string;
}

export default function EmrQcNormLibraryPage() {
  const [norms, setNorms] = useState<Norm[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-norm-library", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNorms(data?.data?.norms ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const addNorm = async () => {
    if (!title.trim()) {
      message.warning("请输入规范名");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-norm-library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ title, category, version }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setNorms(data?.data?.norms ?? []);
        setTitle("");
        setCategory("");
        setVersion("");
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
        <Title level={3} style={{ color: VI.deep }}>规范库管理</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="添加规范">
          <Form layout="inline">
            <Form.Item label="规范名">
              <Input placeholder="规范名" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Form.Item>
            <Form.Item label="分类">
              <Input placeholder="分类" value={category} onChange={(e) => setCategory(e.target.value)} />
            </Form.Item>
            <Form.Item label="版本">
              <Input placeholder="版本" value={version} onChange={(e) => setVersion(e.target.value)} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={addNorm}>
                添加
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`规范列表（共 ${norms.length} 条）`}>
          <List
            dataSource={norms}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 200 }}>{item.title}</Text>
                <Tag color={VI.accent} style={{ width: 120 }}>{item.category}</Tag>
                <Tag color="blue">{item.version}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
