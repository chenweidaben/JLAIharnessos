/*
 * 健澜科技 jlmedaios - 医疗纠纷 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_dispute;

import com.jlmedaios.monolith.medical_dispute.entity.DisputeCase;
import com.jlmedaios.monolith.medical_dispute.service.MedicalDisputeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医疗纠纷 Service 测试。
 */
@SpringBootTest
public class MedicalDisputeServiceTest {

    @Autowired
    private MedicalDisputeService medicalDisputeService;

    @Test
    void testReport() {
        DisputeCase dispute = medicalDisputeService.report(
                "DISP-2026-001", "P001", "心内科", "诊疗争议", "患者对诊疗方案有异议");
        assertNotNull(dispute.getId());
        assertEquals("PENDING", dispute.getStatus());
    }

    @Test
    void testInvestigateAndClose() {
        DisputeCase dispute = medicalDisputeService.report(
                "DISP-2026-002", "P002", "普外科", "费用争议", "费用明细不清晰");
        Optional<DisputeCase> investigating = medicalDisputeService.startInvestigate(dispute.getId());
        assertTrue(investigating.isPresent());
        assertEquals("INVESTIGATING", investigating.get().getStatus());

        Optional<DisputeCase> closed = medicalDisputeService.close(dispute.getId(),
                new BigDecimal("5000.00"));
        assertTrue(closed.isPresent());
        assertEquals("CLOSED", closed.get().getStatus());
        assertEquals(0, new BigDecimal("5000.00").compareTo(closed.get().getCompensationAmount()));
    }

    @Test
    void testPendingListEmpty() {
        List<DisputeCase> list = medicalDisputeService.pendingList();
        assertNotNull(list);
    }
}
