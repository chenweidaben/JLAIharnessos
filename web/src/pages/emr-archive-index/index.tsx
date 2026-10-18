/**
 * 健澜科技 jlmedaios - 病历归档索引前端页（M533-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历归档索引（科室/年份/病历ID/患者姓名/归档日期/索引键/索引值）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ArchiveIndex {
  dept: string;
  year: number;
}

interface IndexEntry {
  indexKey: string;
  indexValue: string;
}

interface IndexReport {
  entryCount: number;
}

export default function EmrArchiveIndexPage() {
  const [index, setIndex] = useState<ArchiveIndex | null>(null);
  const [recordId, setRecordId] = useState("REC092");
  const [patientName, setPatientName] = useState("张三");
  const [archiveDate, setArchiveDate] = useState("2026-09-15");
  const [entry, setEntry] = useState<IndexEntry | null>(null);
  const [report, setReport] = useState<IndexReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchIndex = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-archive-index", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setIndex(data?.data ?? null);
        }
      } catch {
        message.error("加载归档索引基础数据失败");
      }
    };
    void fetchIndex();
  }, []);

  const doBuild = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-archive-index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordId, patientName, archiveDate }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setEntry(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("索引构建完成");
      } else {
        message.error("索引构建失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历归档索引</Title>
        {index && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{index.dept}</Text>
              <Text strong>年份：</Text><Text>{index.year}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>病历ID：</Text>
              <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>患者姓名：</Text>
              <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} style={{ width: 120, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>归档日期：</Text>
              <Input value={archiveDate} onChange={(e) => setArchiveDate(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doBuild}>
            构建索引
          </Button>
        </Card>
        {entry && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="索引结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
              <div>
                <Text strong>索引键：</Text>
                <Tag color="blue" style={{ marginLeft: 8, fontSize: 14 }}>{entry.indexKey}</Tag>
              </div>
              <div>
                <Text strong>索引值：</Text>
                <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 14 }}>{entry.indexValue}</Tag>
              </div>
              <Statistic title="索引条目数" value={report.entryCount} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
