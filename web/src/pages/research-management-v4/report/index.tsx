/**
 * 健澜科技 jlmedaios - 科研管理 V4 页（M254-B）
 *
 * 国自然科技部省自然市科委横向院内立项中期结题/SCI中华核心影响因子被引分区投稿接收/发明专利实用新型外观软著转化转让许可奖励/重点实验室工程中心临床研究中心PI制样本库/PI团队人才梯队合作网络跨学科国际合作/伦理审查知情同意跟踪委员会快速复审/人均论文人均课题人均专利科研奖励考核/项目库成果库论文库伦理库经费库AI辅助。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  projects: { nsfc: number; most: number; provincial: number; municipal: number; horizontal: number; internal: number };
  papers: { sci: number; core: number; if: number; citation: number; quartile: number };
  patents: { invention: number; utility: number; design: number; software: number; transfer: number };
  platform: { keyLab: number; engineeringCenter: number; clinicalResearch: number; pi: number; biobank: number };
  team: { pi: number; talent: number; network: number; interdisciplinary: number; intlCollab: number };
  ethics: { review: number; consent: number; tracking: number; committee: number; fast: number };
  kpi: { perCapitaPaper: number; perCapitaProject: number; perCapitaPatent: number; award: number };
  system: { projectDb: number; resultDb: number; paperDb: number; ethicsDb: number; grantDb: number };
  suggestions: string[];
}

export default function ResearchManagementV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/research-management-v4/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>科研管理 V4</Title>
        <Paragraph type="secondary">国自然·科技部·省自然·市科委·横向·院内·立项·中期·结题 / SCI·中华核心·影响因子·被引·分区 / 发明专利·实用新型·外观·软著·转化 / 重点实验室·工程中心·临床研究中心·PI 制 / PI 团队·人才梯队·合作网络·跨学科·国际合作 / 伦理审查·知情同意·跟踪·委员会·快速复审 / 人均论文·人均课题·人均专利·科研奖励 / 项目库·成果库·论文库·伦理库·经费库</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="国自然" value={data.projects.nsfc} /></Card></Col>
              <Col span={6}><Card><Statistic title="SCI 论文" value={data.papers.sci} /></Card></Col>
              <Col span={6}><Card><Statistic title="发明专利" value={data.patents.invention} /></Card></Col>
              <Col span={6}><Card><Statistic title="重点实验室" value={data.platform.keyLab} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>科研明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "provincial", name: "省自然", value: data.projects.provincial },
                  { key: "citation", name: "被引", value: data.papers.citation },
                  { key: "transfer", name: "成果转化", value: data.patents.transfer },
                  { key: "ethicsReview", name: "伦理审查", value: data.ethics.review },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
