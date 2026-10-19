/*
 * 健澜科技 jlmedaios - 医保结算 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.insurance_settlement;

import com.jlmedaios.monolith.insurance_settlement.entity.InsuranceClaim;
import com.jlmedaios.monolith.insurance_settlement.service.InsuranceSettlementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医保结算 Service 测试。
 */
@SpringBootTest
public class InsuranceSettlementServiceTest {

    @Autowired
    private InsuranceSettlementService service;

    @Test
    void testSubmitNormal() {
        InsuranceClaim claim = service.submit("CLM-001", "P001", "MRN-001",
                "职工医保", new BigDecimal("5000.00"), new BigDecimal("4000.00"), new BigDecimal("1000.00"));
        assertNotNull(claim.getId());
        assertEquals("SUBMITTED", claim.getClaimStatus());
    }

    @Test
    void testReviewNotFound() {
        Optional<InsuranceClaim> result = service.review(99999L, true);
        assertFalse(result.isPresent());
    }

    @Test
    void testStatsNotNull() {
        assertNotNull(service.stats());
    }
}
