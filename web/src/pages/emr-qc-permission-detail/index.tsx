/**
 * 健澜科技 jlmedaios - 质控权限管理明细前端页（M507-D，V14，EMR 深化四模块，M507 收官，-detail 避让）
 *
 * 深海蓝VI：权限管理列表（角色/资源/操作）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Permission {
  role: string;
  resource: string;
  action: string;
}

const actionColor: Record<string, string> = {
  "read": "green",
  "write": "blue",
  "delete": "red",
};

export default function EmrQcPermissionDetailPage() {
  const [perms, setPerms] = useState<Permission[]>([]);
  const [role, setRole] = useState("");
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("read");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-permission-detail", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setPerms(data?.data?.perms ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const assignPerm = async () => {
    if (!role.trim() || !resource.trim()) {
      message.warning("请输入角色和资源");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-permission-detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ role, resource, action }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setPerms(data?.data?.perms ?? []);
        setRole("");
        setResource("");
        setAction("read");
        message.success("分配成功");
      } else {
        message.error("分配失败");
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
        <Title level={3} style={{ color: VI.deep }}>权限管理</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="分配权限">
          <Form layout="inline">
            <Form.Item label="角色">
              <Input placeholder="角色" value={role} onChange={(e) => setRole(e.target.value)} />
            </Form.Item>
            <Form.Item label="资源">
              <Input placeholder="资源" value={resource} onChange={(e) => setResource(e.target.value)} />
            </Form.Item>
            <Form.Item label="操作">
              <Input placeholder="read/write/delete" value={action} onChange={(e) => setAction(e.target.value)} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={assignPerm}>
                分配
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`权限列表（共 ${perms.length} 条）`}>
          <List
            dataSource={perms}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 120, color: VI.deep }}>{item.role}</Text>
                <Text style={{ width: 140 }}>{item.resource}</Text>
                <Tag color={actionColor[item.action] ?? "default"} style={{ width: 80 }}>{item.action}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
