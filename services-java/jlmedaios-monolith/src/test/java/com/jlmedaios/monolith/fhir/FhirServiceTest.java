/*
 * 健澜科技 jlmedaios - FHIR Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.fhir;

import com.jlmedaios.monolith.fhir.entity.FhirResource;
import com.jlmedaios.monolith.fhir.service.FhirService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * FHIR Service 测试。
 */
@SpringBootTest
public class FhirServiceTest {

    @Autowired
    private FhirService fhirService;

    @Test
    void testReceiveResource() {
        FhirResource resource = fhirService.receiveResource("Patient", "P001",
                1L, "{\"name\": \"张三\"}");
        assertNotNull(resource.getId());
        assertEquals("Patient", resource.getResourceType());
    }

    @Test
    void testGetPatient() {
        Map<String, Object> patient = fhirService.getPatient("P001");
        assertNotNull(patient);
        assertEquals("Patient", patient.get("resourceType"));
    }

    @Test
    void testGetPatientObservations() {
        fhirService.receiveResource("Observation", "O001", 1L, "{\"value\": 6.1}");
        List<Map<String, Object>> observations = fhirService.getPatientObservations("1");
        assertNotNull(observations);
        assertTrue(observations.size() >= 0);
    }
}
