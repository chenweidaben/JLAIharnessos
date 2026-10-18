/**
 * 健澜科技 jlmedaios - 病历隐私脱敏展示前端页（M466-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：角色切换按钮（doctor/nurse/admin/public）+ 脱敏前后对比文本区。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Col, Divider, Layout, message, Row, Spin, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const ROLES = ["doctor", "nurse", "admin", "public"] as const;
type Role = typeof ROLES[number];

export default function EmrMaskingPage() {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>("doctor");
  const [original, setOriginal] = useState("");
  const [masked, setMasked] = useState("");

  const handleFetch = async (selectedRole: Role) => {
    setLoading(true);
    setRole(selectedRole);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch(`/api/v1/emr-masking/demo001?role=${selectedRole}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (resp.ok) {
        const data = await resp.json();
        setOriginal(data?.original ?? "");
        setMasked(data?.masked ?? "");
      } else {
        message.warning("获取失败（后端 route 未就绪）");
      }
    } catch {
      message.warning("获取失败（后端 route 未就绪）");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历隐私脱敏展示</Title>
        <Card style={{ marginBottom: 16 }}>
          <Text strong style={{ marginRight: 16 }}>选择角色：</Text>
          {ROLES.map((r) => (
            <Button
              key={r}
              type={role === r ? "primary" : "default"}
              style={{ marginRight: 8, background: role === r ? VI.accent : undefined }}
              onClick={() => handleFetch(r)}
            >
              {r}
            </Button>
          ))}
        </Card>
        <Spin spinning={loading}>
          <Row gutter={16}>
            <Col span={12}>
              <Card title="脱敏前" headStyle={{ background: VI.mid, color: "#fff" }}>
                <Text>{original || "点击上方角色按钮加载"}</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="脱敏后" headStyle={{ background: VI.deep, color: "#fff" }}>
                <Text>{masked || "—"}</Text>
              </Card>
            </Col>
          </Row>
          <Divider />
          <Text type="secondary">规则：doctor 全见 / nurse 脱敏姓名+手机号 / admin 只脱敏身份证 / public 全部脱敏</Text>
        </Spin>
      </Content>
    </Layout>
  );
}
