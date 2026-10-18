/**
 * 健澜科技 jlmedaios - 病历访问审计日志前端页（M528-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历访问审计日志（病历ID/操作人/操作类型/是否敏感/是否记录/风险等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Layout, Select, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AccessAudit {
  recordId: string;
  operator: string;
}

interface AuditResult {
  logged: boolean;
  riskLevel: string;
}

interface AuditReport {
  logged: boolean;
  riskLevel: string;
}

const ACTION_OPTIONS = ["查看", "修改", "导出"];

export default function EmrAccessAuditPage() {
  const [audit, setAudit] = useState<AccessAudit | null>(null);
  const [action, setAction] = useState("查看");
  const [isSensitive, setIsSensitive] = useState(true);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-access-audit", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setAudit(data?.data ?? null);
        }
      } catch {
        message.error("加载访问审计基础数据失败");
      }
    };
    void fetchAudit();
  }, []);

  const doLog = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-access-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordId: "REC050", operator: "张医生", action, isSensitive }),
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
        <Title level={3} style={{ color: VI.deep }}>病历访问审计日志</Title>
        {audit && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{audit.recordId}</Text>
              <Text strong>操作人：</Text><Text>{audit.operator}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="访问事件">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <Text strong>操作类型：</Text>
              <Select
                value={action}
                onChange={setAction}
                options={ACTION_OPTIONS.map((a) => ({ value: a, label: a }))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <Checkbox checked={isSensitive} onChange={(e) => setIsSensitive(e.target.checked)}>
              敏感病历
            </Checkbox>
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doLog}>
              记录访问日志
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审计结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>是否记录：</Text>
                <Tag color={report.logged ? "green" : "default"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.logged ? "已记录" : "未记录"}
                </Tag>
              </div>
              <div>
                <Text strong>风险等级：</Text>
                <Tag
                  color={
                    report.riskLevel === "高风险" ? "red" :
                    report.riskLevel === "中风险" ? "orange" : "blue"
                  }
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.riskLevel}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
