/*
 * 健澜科技 jlmedaios - 退费管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.billing_refund;

import com.jlmedaios.monolith.billing_refund.entity.RefundRequest;
import com.jlmedaios.monolith.billing_refund.service.BillingRefundService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 退费管理 Service 测试。
 */
@SpringBootTest
public class BillingRefundServiceTest {

    @Autowired
    private BillingRefundService billingRefundService;

    @Test
    void testApply() {
        RefundRequest request = billingRefundService.apply(
                "RF20261019001", "CH20261018001", "P001",
                new BigDecimal("100.00"), "重复收费", "DOC001"
        );
        assertNotNull(request.getId());
        assertEquals("PENDING", request.getStatus());
    }

    @Test
    void testApprove() {
        RefundRequest request = billingRefundService.apply(
                "RF20261019002", "CH20261018002", "P002",
                new BigDecimal("200.00"), "检查取消", "DOC002"
        );
        Optional<RefundRequest> approved = billingRefundService.approve(request.getId(), "ADMIN001", true);
        assertTrue(approved.isPresent());
        assertEquals("APPROVED", approved.get().getStatus());
        assertNotNull(approved.get().getApproveTime());
    }

    @Test
    void testPendingList() {
        billingRefundService.apply(
                "RF20261019003", "CH20261018003", "P003",
                new BigDecimal("50.00"), "药品退药", "DOC003"
        );
        assertNotNull(billingRefundService.pendingList());
    }
}
