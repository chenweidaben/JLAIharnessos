/**
 * 健澜科技 jlmedaios - 质控权限管理前端页（M498-D，V14，EMR 深化四模块）
 *
 * 深海蓝VI：权限管理列表（角色/权限 Tag）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RolePermission {
  role: string;
  permissions: string[];
}

export default function EmrQcPermissionManagePage() {
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-permission-manage", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setRoles(data?.data?.roles ?? []);
          setHasPermission(data?.data?.hasPermission ?? null);
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
        <Title level={3} style={{ color: VI.deep }}>质控权限管理</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="角色权限列表">
          <List
            dataSource={roles}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 120 }}>{item.role}</Text>
                <div>
                  {item.permissions.map((perm) => (
                    <Tag key={perm} color={VI.accent} style={{ marginBottom: 4 }}>
                      {perm}
                    </Tag>
                  ))}
                </div>
              </List.Item>
            )}
          />
        </Card>
        {hasPermission !== null && (
          <Card style={{ marginTop: 16 }} title="权限检查结果">
            <Text>当前角色权限检查结果：</Text>
            <Tag color={hasPermission ? "green" : "red"} style={{ marginLeft: 8 }}>
              {hasPermission ? "有权限" : "无权限"}
            </Tag>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
