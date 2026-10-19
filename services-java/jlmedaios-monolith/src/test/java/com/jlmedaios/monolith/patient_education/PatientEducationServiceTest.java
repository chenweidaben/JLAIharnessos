/*
 * 健澜科技 jlmedaios - 患者教育 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_education;

import com.jlmedaios.monolith.patient_education.entity.EducationDelivery;
import com.jlmedaios.monolith.patient_education.service.PatientEducationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 患者教育 Service 测试。
 */
@SpringBootTest
public class PatientEducationServiceTest {

    @Autowired
    private PatientEducationService patientEducationService;

    @Test
    void testMaterials() {
        assertNotNull(patientEducationService.materials());
    }

    @Test
    void testDeliver() {
        EducationDelivery delivery = patientEducationService.deliver("M001", 1L, 1L);
        assertNotNull(delivery.getId());
        assertEquals("UNREAD", delivery.getReadStatus());
    }

    @Test
    void testPatientMaterials() {
        patientEducationService.deliver("M002", 2L, 2L);
        List<EducationDelivery> list = patientEducationService.patientMaterials(2L);
        assertNotNull(list);
        assertFalse(list.isEmpty());
    }
}
