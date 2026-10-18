/**
 * 健澜科技 jlmedaios - 质控移动端审批前端页（M526-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质控移动端审批（缺陷ID/审批人/审批决定/审批意见/审批结果/操作动作）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Radio, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface MobileApproval {
  defectId: string;
  approver: string;
}

interface ApprovalResult {
  approved: boolean;
  action: string;
}

interface ApprovalReport {
  approved: boolean;
  action: string;
}

export default function EmrQcMobileApprovalPage() {
  const [approval, setApproval] = useState<MobileApproval | null>(null);
  const [decision, setDecision] = useState<"通过" | "驳回">("通过");
  const [comment, setComment] = useState("符合规范");
  const [result, setResult] = useState<ApprovalResult | null>(null);
  const [report, setReport] = useState<ApprovalReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchApproval = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-mobile-approval", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setApproval(data?.data ?? null);
        }
      } catch {
        message.error("加载移动端审批基础数据失败");
      }
    };
    void fetchApproval();
  }, []);

  const doApprove = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-mobile-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ defectId: "D020", decision, comment }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("审批完成");
      } else {
        message.error("审批失败");
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
        <Title level={3} style={{ color: VI.deep }}>质控移动端审批</Title>
        {approval && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="审批基础数据">
            <div>
              <Text strong>缺陷ID：</Text><Text style={{ marginRight: 24 }}>{approval.defectId}</Text>
              <Text strong>审批人：</Text><Text>{approval.approver}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="审批操作">
          <div style={{ marginBottom: 16 }}>
            <Text strong>审批决定：</Text>
            <Radio.Group
              value={decision}
              onChange={(e) => setDecision(e.target.value as "通过" | "驳回")}
              style={{ marginLeft: 12 }}
            >
              <Radio.Button value="通过">通过</Radio.Button>
              <Radio.Button value="驳回">驳回</Radio.Button>
            </Radio.Group>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>审批意见：</Text>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ marginTop: 8, maxWidth: 400 }}
            />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doApprove}>
            移动端提交审批
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审批结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>审批结果：</Text>
                <Tag
                  color={report.approved ? "green" : "red"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.approved ? "已通过" : "已驳回"}
                </Tag>
              </div>
              <div>
                <Text strong>操作动作：</Text>
                <Tag color={VI.accent} style={{ marginLeft: 8, fontSize: 16 }}>{report.action}</Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
