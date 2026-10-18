/**
 * 健澜科技 jlmedaios - 病历质控权限管理前端页（M473-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：权限矩阵表格（角色行×权限列，checkbox 勾选）+ 角色切换。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Switch, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PermissionRow {
  role: string;
  permissions: Record<string, boolean>;
}

export default function EmrQcPermissionPage() {
  const [loading, setLoading] = useState(true);
  const [matrix, setMatrix] = useState<PermissionRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-permission", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setMatrix(data?.matrix ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const columns = [
    { title: "角色", dataIndex: "role", key: "role", render: (v: string) => <Tag color="blue">{v}</Tag> },
    {
      title: "查看病历",
      key: "查看病历",
      render: (_: unknown, row: PermissionRow) => (
        <Switch checked={row.permissions["查看病历"] ?? false} size="small" />
      ),
    },
    {
      title: "审核质控",
      key: "审核质控",
      render: (_: unknown, row: PermissionRow) => (
        <Switch checked={row.permissions["审核质控"] ?? false} size="small" />
      ),
    },
    {
      title: "导出数据",
      key: "导出数据",
      render: (_: unknown, row: PermissionRow) => (
        <Switch checked={row.permissions["导出数据"] ?? false} size="small" />
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控权限管理</Title>
        <Card title="角色×权限矩阵" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table dataSource={matrix} columns={columns} rowKey="role" pagination={false} />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
