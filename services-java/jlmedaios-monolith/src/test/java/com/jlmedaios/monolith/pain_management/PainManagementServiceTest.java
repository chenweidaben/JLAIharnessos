/*
 * 健澜科技 jlmedaios - 疼痛管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pain_management;

import com.jlmedaios.monolith.pain_management.entity.PainAssessment;
import com.jlmedaios.monolith.pain_management.entity.PainRecord;
import com.jlmedaios.monolith.pain_management.service.PainManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 疼痛管理 Service 测试。
 */
@SpringBootTest
public class PainManagementServiceTest {

    @Autowired
    private PainManagementService painManagementService;

    @Test
    void testAssess() {
        PainAssessment assessment = painManagementService.assess(
                "PAIN-2026-001", "P001", 5, "腹部", "胀痛", "布洛芬");
        assertNotNull(assessment.getId());
        assertEquals(5, assessment.getPainScore());
    }

    @Test
    void testHistory() {
        painManagementService.assess("PAIN-2026-002", "P002", 3, "头部", "钝痛", "对乙酰氨基酚");
        List<PainAssessment> list = painManagementService.history(2L);
        assertNotNull(list);
    }

    @Test
    void testSeverePainList() {
        painManagementService.assess("PAIN-2026-003", "P003", 8, "术后切口", "刺痛", "吗啡");
        List<PainAssessment> severeList = painManagementService.severePainList();
        assertNotNull(severeList);
        // 应包含 score>=7 的记录
    }

    // ==================== PainRecord 疼痛评估管理（深化） ====================

    @Test
    void testPendingFollowUp() {
        List<PainRecord> list = painManagementService.pendingFollowUp();
        assertNotNull(list);
    }

    @Test
    void testAssessRecord() {
        PainRecord record = painManagementService.assess(
                "PR-001", "P001", "腰痛", 6, "慢性");
        assertNotNull(record.getId());
    }

    @Test
    void testRecordTreatment() {
        PainRecord record = painManagementService.recordTreatment(
                "PR-001", "物理治疗", LocalDate.now().plusDays(14));
        assertNotNull(record);
    }

    @Test
    void testPainHistory() {
        List<PainRecord> history = painManagementService.painHistory(1L);
        assertNotNull(history);
    }
}
