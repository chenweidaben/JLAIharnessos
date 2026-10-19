/*
 * 健澜科技 jlmedaios - 医保 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.insurance;

import com.jlmedaios.monolith.insurance.entity.InsuranceClaim;
import com.jlmedaios.monolith.insurance.service.InsuranceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医保 Service 测试。
 */
@SpringBootTest
public class InsuranceServiceTest {

    @Autowired
    private InsuranceService insuranceService;

    @Test
    void testClaimPneumonia() {
        InsuranceClaim claim = insuranceService.claim(1L, 1001L, "社区获得性肺炎",
                "无", "抗感染治疗", new BigDecimal("5000"));
        assertNotNull(claim.getId());
        assertEquals("ES1", claim.getDrgGroup());
        assertEquals(new BigDecimal("3500.00"), claim.getEstimatedReimburse());
    }

    @Test
    void testClaimHeartAttack() {
        InsuranceClaim claim = insuranceService.claim(2L, 1002L, "急性心梗",
                "无", "PCI 术", new BigDecimal("30000"));
        assertNotNull(claim.getId());
        assertEquals("FM1", claim.getDrgGroup());
    }

    @Test
    void testDeptSummary() {
        Map<String, Object> summary = insuranceService.deptSummary("INTERNAL");
        assertNotNull(summary);
        assertEquals(12, summary.get("total_claims"));
    }
}
