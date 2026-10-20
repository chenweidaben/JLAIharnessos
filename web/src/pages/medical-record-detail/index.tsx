/**
 * 健澜科技 jlmedaios - 病案管理（细节）V13 页（M419-A，detail 避让旧版 medicalRecordMgmtV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Empty, Layout, Row, Spin, Statistic, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  medicalRecordCoverPassRate: number;
  medicalRecordCodingAccuracyRate: number;
  medicalRecordCopyTimelyRate: number;
}

export default function MedicalRecordDetailPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/medical-record-detail");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病案管理（细节）</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="病案首页合格率" value={data.medicalRecordCoverPassRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="病案编码准确率" value={data.medicalRecordCodingAccuracyRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="病案复印及时率" value={data.medicalRecordCopyTimelyRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
        {/* v5.0试点扩展（M208薄页补表）：病案详情 demo */}
        <Card style={{ marginTop: 16 }} title="病案详情检查项">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={[
              { id: 1, item: "首页诊断完整性", result: "通过", operator: "陈医生" },
              { id: 2, item: "手术记录签字", result: "通过", operator: "王医生" },
              { id: 3, item: "出院小结时限", result: "不通过", operator: "质控科" },
              { id: 4, item: "知情同意书扫描", result: "通过", operator: "李护士" },
              { id: 5, item: "ICD 编码准确性", result: "通过", operator: "编码员" },
            ]}
            columns={[
              { title: "检查项", dataIndex: "item" },
              { title: "结果", dataIndex: "result", render: (r: string) => <Tag color={r === "通过" ? "green" : "red"}>{r}</Tag> },
              { title: "检查人", dataIndex: "operator" },
            ]}
            locale={{ emptyText: <Empty description="暂无检查记录" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
