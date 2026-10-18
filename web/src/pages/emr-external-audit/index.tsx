/**
 * 健澜科技 jlmedaios - 病历外审申请前端页（M540-D，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历外审申请（病历ID/申请人/审核机构/申请用途/是否申请/审核编号）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ExternalAudit {
  recordId: string;
  applicant: string;
}

interface AuditResult {
  applied: boolean;
  auditNo: string;
}

interface AuditReport {
  applied: boolean;
  auditNo: string;
}

export default function EmrExternalAuditPage() {
  const [base, setBase] = useState<ExternalAudit | null>(null);
  const [recordId, setRecordId] = useState("REC704");
  const [auditOrg, setAuditOrg] = useState("卫健委");
  const [purpose, setPurpose] = useState("等级评审");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-external-audit", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载外审申请基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doApply = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-external-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordId, auditOrg, purpose }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("申请完成");
      } else {
        message.error("申请失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历外审申请</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>申请人：</Text><Tag color="blue">{base.applicant}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="申请输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>病历ID：</Text>
              <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} style={{ width: 140, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>审核机构：</Text>
              <Input value={auditOrg} onChange={(e) => setAuditOrg(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>申请用途：</Text>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doApply}>
            执行申请
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="申请结果">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Text strong>是否申请：</Text>
              <Tag color={report.applied ? "green" : "red"} style={{ fontSize: 16 }}>
                {report.applied ? "已申请" : "未申请"}
              </Tag>
              <Text strong>审核编号：</Text>
              <Tag color="blue" style={{ fontSize: 16 }}>{report.auditNo}</Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
