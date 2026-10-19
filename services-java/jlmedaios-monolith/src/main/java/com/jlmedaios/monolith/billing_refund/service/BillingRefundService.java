/*
 * 健澜科技 jlmedaios - 退费管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.billing_refund.service;

import com.jlmedaios.monolith.billing_refund.entity.RefundRequest;
import com.jlmedaios.monolith.billing_refund.repository.RefundRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 退费管理 Service。
 *
 * <p>append-only: 退费申请不可修改，审核留痕</p>
 */
@Service
@RequiredArgsConstructor
public class BillingRefundService {

    private final RefundRequestRepository refundRequestRepository;

    /**
     * 申请退费。
     *
     * @param refundNo         退费编号
     * @param originalChargeNo 原收费编号
     * @param patientId        患者 ID
     * @param refundAmount     退费金额
     * @param refundReason     退费原因
     * @param appliedBy        申请人工号
     * @return 已持久化的退费申请
     */
    public RefundRequest apply(String refundNo, String originalChargeNo, String patientId,
                                BigDecimal refundAmount, String refundReason, String appliedBy) {
        RefundRequest request = RefundRequest.builder()
                .refundNo(refundNo)
                .originalChargeNo(originalChargeNo)
                .patientId(patientId)
                .refundAmount(refundAmount)
                .refundReason(refundReason)
                .appliedBy(appliedBy)
                .build();
        return refundRequestRepository.save(request);
    }

    /**
     * 审批退费（设 status + approveTime）。
     *
     * @param id         退费申请 ID
     * @param approvedBy 审批人工号
     * @param approved   是否通过
     * @return 已更新的退费申请
     */
    public Optional<RefundRequest> approve(Long id, String approvedBy, boolean approved) {
        Optional<RefundRequest> opt = refundRequestRepository.findById(id);
        if (opt.isPresent()) {
            RefundRequest request = opt.get();
            request.setStatus(approved ? "APPROVED" : "REJECTED");
            request.setApprovedBy(approvedBy);
            request.setApproveTime(LocalDateTime.now());
            refundRequestRepository.save(request);
        }
        return opt;
    }

    /**
     * 待审批列表（status=PENDING）。
     *
     * @return 退费申请列表
     */
    public List<RefundRequest> pendingList() {
        return refundRequestRepository.findByStatus("PENDING");
    }
}
