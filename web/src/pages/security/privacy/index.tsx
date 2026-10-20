/** 健澜科技 jlmedaios - 隐私保护（M246 占位，API 未上线） Copyright (c) 2026 杭州健澜科技有限公司 */
import { Card, Empty, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
export default function SecurityPrivacyPage() {
  usePageTitle('隐私保护');
  return (
    <PageContainer title="隐私保护">
      <Card>
        <Empty description={<span>对接 /api/v1/security/privacy <Tag color="orange">开发中</Tag></span>} />
      </Card>
    </PageContainer>
  );
}
