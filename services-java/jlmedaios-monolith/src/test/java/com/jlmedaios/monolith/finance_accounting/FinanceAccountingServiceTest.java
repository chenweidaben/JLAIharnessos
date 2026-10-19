/*
 * 健澜科技 jlmedaios - 财务核算 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.finance_accounting;

import com.jlmedaios.monolith.finance_accounting.entity.FinanceVoucher;
import com.jlmedaios.monolith.finance_accounting.service.FinanceAccountingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 财务核算 Service 测试。
 */
@SpringBootTest
public class FinanceAccountingServiceTest {

    @Autowired
    private FinanceAccountingService service;

    @Test
    void testCreateVoucherNormal() {
        FinanceVoucher voucher = service.createVoucher("VCH-001", "门诊收费",
                "现金", "医疗收入", new BigDecimal("1000.00"), "门诊", "张三");
        assertNotNull(voucher.getId());
        assertEquals("UNPOSTED", voucher.getStatus());
    }

    @Test
    void testPostNotFound() {
        Optional<FinanceVoucher> result = service.post(99999L);
        assertFalse(result.isPresent());
    }

    @Test
    void testDailyReportNotNull() {
        assertNotNull(service.dailyReport());
    }
}
