/**
 * 健澜科技 jlmedaios - 病历调阅日志审计前端页（M534-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历调阅日志审计（病历ID/操作人/操作类型/是否记录/事件类型）。
 * 命名空间与 M528-A emrAccessAuditV14 区分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Select, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AccessAuditLog {
  recordId: string;
  operator: string;
}

interface AuditResult {
  logged: boolean;
  eventType: string;
}

interface AuditReport {
  logged: boolean;
  eventType: string;
}

export default function EmrAccessAuditLogPage() {
  const [log, setLog] = useState<AccessAuditLog | null>(null);
  const [recordId, setRecordId] = useState("REC101");
  const [operator, setOperator] = useState("李医生");
  const [action, setAction] = useState<"查看" | "下载" | "打印">("查看");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-access-audit-log", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLog(data?.data ?? null);
        }
      } catch {
        message.error("加载调阅日志审计基础数据失败");
      }
    };
    void fetchLog();
  }, []);

  const doLog = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-access-audit-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordId, operator, action }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("日志记录完成");
      } else {
        message.error("日志记录失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历调阅日志审计</Title>
        {log && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{log.recordId}</Text>
              <Text strong>操作人：</Text><Text>{log.operator}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="审计输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>病历ID：</Text>
              <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>操作人：</Text>
              <Input value={operator} onChange={(e) => setOperator(e.target.value)} style={{ width: 120, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>操作类型：</Text>
              <Select
                value={action}
                onChange={(v) => setAction(v)}
                style={{ width: 120, marginLeft: 8 }}
                options={[
                  { value: "查看", label: "查看" },
                  { value: "下载", label: "下载" },
                  { value: "打印", label: "打印" },
                ]}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doLog}>
            记录日志
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审计结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>是否记录：</Text>
                <Tag color={report.logged ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.logged ? "已记录" : "未记录"}
                </Tag>
              </div>
              <div>
                <Text strong>事件类型：</Text>
                <Tag color="blue" style={{ marginLeft: 8, fontSize: 14 }}>{report.eventType}</Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
