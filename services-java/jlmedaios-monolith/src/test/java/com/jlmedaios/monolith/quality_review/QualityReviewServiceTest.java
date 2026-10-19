/*
 * 健澜科技 jlmedaios - 等级评审 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.quality_review;

import com.jlmedaios.monolith.quality_review.service.QualityReviewService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 等级评审 Service 测试。
 */
@SpringBootTest
public class QualityReviewServiceTest {

    @Autowired
    private QualityReviewService qualityReviewService;

    @Test
    void testAllIndicators() {
        assertNotNull(qualityReviewService.allIndicators());
    }

    @Test
    void testByCategory() {
        assertNotNull(qualityReviewService.byCategory("医疗质量"));
    }

    @Test
    void testUpdateValue() {
        // mock：按编码查找（H2 内存库可能无数据，仅验证不抛异常）
        assertNotNull(qualityReviewService.updateValue("I001", new java.math.BigDecimal("95.00")));
    }
}
