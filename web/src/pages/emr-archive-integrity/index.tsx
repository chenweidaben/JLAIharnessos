/**
 * 健澜科技 jlmedaios - 病历归档完整性校验前端页（M533-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历归档完整性校验（病历ID/归档日期/应有字段数/实有字段数/是否完整/缺失字段数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ArchiveIntegrity {
  recordId: string;
  archiveDate: string;
}

interface IntegrityResult {
  intact: boolean;
  missingFields: number;
}

interface IntegrityReport {
  intact: boolean;
  missingFields: number;
}

export default function EmrArchiveIntegrityPage() {
  const [integrity, setIntegrity] = useState<ArchiveIntegrity | null>(null);
  const [expectedFields, setExpectedFields] = useState(10);
  const [actualFields, setActualFields] = useState(10);
  const [result, setResult] = useState<IntegrityResult | null>(null);
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchIntegrity = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-archive-integrity", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setIntegrity(data?.data ?? null);
        }
      } catch {
        message.error("加载完整性校验基础数据失败");
      }
    };
    void fetchIntegrity();
  }, []);

  const doVerify = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-archive-integrity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ expectedFields, actualFields }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("校验完成");
      } else {
        message.error("校验失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历归档完整性校验</Title>
        {integrity && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{integrity.recordId}</Text>
              <Text strong>归档日期：</Text><Text>{integrity.archiveDate}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>应有字段数：</Text>
              <Input
                type="number"
                value={expectedFields}
                onChange={(e) => setExpectedFields(Number(e.target.value))}
                style={{ width: 160, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>实有字段数：</Text>
              <Input
                type="number"
                value={actualFields}
                onChange={(e) => setActualFields(Number(e.target.value))}
                style={{ width: 160, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doVerify}>
            执行校验
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="校验结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>是否完整：</Text>
                <Tag color={report.intact ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.intact ? "完整" : "不完整"}
                </Tag>
              </div>
              <Statistic title="缺失字段数" value={report.missingFields} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
