/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * ReviewPanel：同意/修改/驳回 + 签名闭环提交 + 审计留痕 + 重复提交禁用
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';
import userEvent from '@testing-library/user-event';
import ReviewPanel from '@/components/imagingAi/ReviewPanel';
import type { RadarReviewReceipt, RadarReviewRequest } from '@/types/imagingAi';

const receipt: RadarReviewReceipt = {
  reviewed_at: '2026-09-21T15:00:00+08:00',
  signer_id: 'doc-001',
  audit_id: 'AUD-20260921-0001',
  verdict: 'approve',
};

function setup(overrides?: { canReview?: boolean; receipt?: RadarReviewReceipt | null }) {
  const onSubmit = vi.fn<(b: RadarReviewRequest) => Promise<RadarReviewReceipt>>().mockResolvedValue(receipt);
  const utils = render(
    <ReviewPanel
      jobId="job_test"
      canReview={overrides?.canReview ?? true}
      submitting={false}
      receipt={overrides?.receipt ?? null}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, ...utils };
}

describe('ReviewPanel', () => {
  it('无复核权限时提示且不渲染提交按钮', () => {
    setup({ canReview: false });
    expect(screen.getByText(/无 imaging:ai:review 复核权限/)).toBeInTheDocument();
    expect(screen.queryByTestId('review-submit')).not.toBeInTheDocument();
  });

  it('填写签名医师后提交，调用 onSubmit 并返回审计留痕', async () => {
    const user = userEvent.setup();
    const { onSubmit, rerender } = setup();

    await user.type(screen.getByTestId('signer-name'), '张医生');
    fireEvent.click(screen.getByTestId('review-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const body = onSubmit.mock.calls[0][0];
    expect(body.verdict).toBe('approve');
    expect(body.signer_name).toBe('张医生');
    expect(body.signer_id).toBe('demo-doctor');

    // 提交成功后传入 receipt → 展示审计留痕并禁用重复提交
    rerender(
      <ReviewPanel
        jobId="job_test"
        canReview
        submitting={false}
        receipt={receipt}
        onSubmit={onSubmit}
      />,
    );
    expect(await screen.findByTestId('review-receipt')).toBeInTheDocument();
    expect(screen.getByText('AUD-20260921-0001')).toBeInTheDocument();
    expect(screen.getByText('doc-001')).toBeInTheDocument();
    // 留痕展示后提交按钮被替换，无法重复提交
    expect(screen.queryByTestId('review-submit')).not.toBeInTheDocument();
  });

  it('未填写签名医师时本地校验拦截，不调用 onSubmit', async () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByTestId('review-submit'));
    await waitFor(() => expect(screen.getByText('请填写签名医师姓名')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('可切换为修改 / 驳回结论', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.click(screen.getByText('驳回'));
    await user.type(screen.getByTestId('signer-name'), '李医生');
    fireEvent.click(screen.getByTestId('review-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].verdict).toBe('reject');
  });
});
