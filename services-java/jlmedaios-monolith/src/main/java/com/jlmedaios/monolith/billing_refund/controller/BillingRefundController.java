/*
 * 健澜科技 jlmedaios - 退费管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.billing_refund.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.billing_refund.entity.RefundRequest;
import com.jlmedaios.monolith.billing_refund.service.BillingRefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 退费管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/refund")
public class BillingRefundController {

    private final BillingRefundService billingRefundService;

    /**
     * 申请退费。
     *
     * @param body {refundNo, originalChargeNo, patientId, refundAmount, refundReason, appliedBy}
     * @return Result<RefundRequest>
     */
    @PostMapping("/apply")
    public Result<RefundRequest> apply(@RequestBody Map<String, Object> body) {
        RefundRequest request = billingRefundService.apply(
                String.valueOf(body.get("refundNo")),
                String.valueOf(body.get("originalChargeNo")),
                String.valueOf(body.get("patientId")),
                new BigDecimal(String.valueOf(body.get("refundAmount"))),
                String.valueOf(body.get("refundReason")),
                String.valueOf(body.get("appliedBy"))
        );
        return Result.ok(request);
    }

    /**
     * 审批退费。
     *
     * @param id   退费申请 ID
     * @param body {approvedBy, approved}
     * @return Result<RefundRequest>
     */
    @PutMapping("/{id}/approve")
    public Result<RefundRequest> approve(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return billingRefundService.approve(
                id,
                String.valueOf(body.get("approvedBy")),
                Boolean.parseBoolean(String.valueOf(body.get("approved")))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 待审批列表。
     *
     * @return Result<List<RefundRequest>>
     */
    @GetMapping("/pending")
    public Result<List<RefundRequest>> pendingList() {
        return Result.ok(billingRefundService.pendingList());
    }
}
