/*
 * 健澜科技 jlmedaios - 知情同意 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.consent_management;

import com.jlmedaios.monolith.consent_management.entity.ConsentForm;
import com.jlmedaios.monolith.consent_management.service.ConsentManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 知情同意 Service 测试。
 */
@SpringBootTest
public class ConsentManagementServiceTest {

    @Autowired
    private ConsentManagementService consentManagementService;

    @Test
    void testCreateForm() {
        ConsentForm form = consentManagementService.createForm(
                "CF-2026-001", "P001", "手术同意书", "腹腔镜阑尾切除术风险告知");
        assertNotNull(form.getId());
        assertEquals("DRAFT", form.getStatus());
    }

    @Test
    void testSign() {
        ConsentForm form = consentManagementService.createForm(
                "CF-2026-002", "P002", "麻醉同意书", "全麻风险告知");
        Optional<ConsentForm> signed = consentManagementService.sign(
                form.getId(), "patient_sig_001", "doctor_sig_001");
        assertTrue(signed.isPresent());
        assertEquals("SIGNED", signed.get().getStatus());
        assertNotNull(signed.get().getSignTime());
    }

    @Test
    void testPatientForms() {
        List<ConsentForm> list = consentManagementService.patientForms(1L);
        assertNotNull(list);
    }
}
