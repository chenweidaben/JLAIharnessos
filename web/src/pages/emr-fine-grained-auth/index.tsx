/**
 * 健澜科技 jlmedaios - 病历权限细粒度控制前端页（M528-D，V14，EMR 深化四模块，M528 收官）
 *
 * 深海蓝VI：病历权限细粒度控制（角色/科室/允许字段/请求字段/是否授权/拒绝字段数/拒绝列表）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface FineGrainedAuth {
  role: string;
  dept: string;
}

interface AuthResult {
  granted: boolean;
  deniedFields: string[];
}

interface AuthReport {
  granted: boolean;
  deniedCount: number;
}

const ALLOWED_FIELDS = ["姓名", "诊断", "用药"];
const REQUESTED_FIELDS = ["姓名", "身份证号"];

export default function EmrFineGrainedAuthPage() {
  const [auth, setAuth] = useState<FineGrainedAuth | null>(null);
  const [result, setResult] = useState<AuthResult | null>(null);
  const [report, setReport] = useState<AuthReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-fine-grained-auth", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setAuth(data?.data ?? null);
        }
      } catch {
        message.error("加载细粒度权限基础数据失败");
      }
    };
    void fetchAuth();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-fine-grained-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          role: "主治医师",
          allowedFields: ALLOWED_FIELDS,
          requestedFields: REQUESTED_FIELDS,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("权限检查完成");
      } else {
        message.error("权限检查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历权限细粒度控制</Title>
        {auth && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>角色：</Text><Text style={{ marginRight: 24 }}>{auth.role}</Text>
              <Text strong>科室：</Text><Text>{auth.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="权限配置">
          <div style={{ marginBottom: 12 }}>
            <Text strong>允许字段：</Text>
            <div style={{ marginTop: 8 }}>
              {ALLOWED_FIELDS.map((f) => (
                <Tag key={f} color="green" style={{ marginBottom: 4 }}>{f}</Tag>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <Text strong>请求字段：</Text>
            <div style={{ marginTop: 8 }}>
              {REQUESTED_FIELDS.map((f) => (
                <Tag key={f} color="blue" style={{ marginBottom: 4 }}>{f}</Tag>
              ))}
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent, marginTop: 8 }} loading={loading} onClick={doCheck}>
            检查字段级权限
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检查结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: 16 }}>
              <div>
                <Text strong>是否授权：</Text>
                <Tag color={report.granted ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.granted ? "已授权" : "未授权"}
                </Tag>
              </div>
              <Statistic title="拒绝字段数" value={report.deniedCount} />
            </div>
            {result.deniedFields.length > 0 && (
              <div>
                <Text strong>拒绝列表：</Text>
                <List
                  size="small"
                  dataSource={result.deniedFields}
                  renderItem={(item) => (
                    <List.Item>
                      <Tag color="red">{item}</Tag>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
