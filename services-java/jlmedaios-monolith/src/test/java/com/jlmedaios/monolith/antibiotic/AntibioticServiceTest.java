/*
 * 健澜科技 jlmedaios - 抗菌药物 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.antibiotic;

import com.jlmedaios.monolith.antibiotic.entity.AntibioticRecord;
import com.jlmedaios.monolith.antibiotic.service.AntibioticService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 抗菌药物 Service 测试。
 */
@SpringBootTest
public class AntibioticServiceTest {

    @Autowired
    private AntibioticService antibioticService;

    @Test
    void testOrderRestricted() {
        AntibioticRecord record = antibioticService.order(1L, "头孢呋辛", "1.5g q8h",
                "呼吸道感染", "RESTRICTED");
        assertNotNull(record.getId());
        assertEquals("PENDING", record.getReviewStatus());
        assertFalse(record.getConsultationRequired());
    }

    @Test
    void testOrderSpecial() {
        AntibioticRecord record = antibioticService.order(2L, "万古霉素", "500mg q6h",
                "MRSA 感染", "SPECIAL");
        assertNotNull(record.getId());
        assertTrue(record.getConsultationRequired());
    }

    @Test
    void testReview() {
        AntibioticRecord record = antibioticService.order(3L, "阿莫西林", "0.5g tid",
                "普通感染", "RESTRICTED");
        Optional<AntibioticRecord> reviewed = antibioticService.review(
                record.getId(), "药师张", true, "同意");
        assertTrue(reviewed.isPresent());
        assertEquals("APPROVED", reviewed.get().getReviewStatus());
        assertEquals("药师张", reviewed.get().getPharmacistName());
    }
}
