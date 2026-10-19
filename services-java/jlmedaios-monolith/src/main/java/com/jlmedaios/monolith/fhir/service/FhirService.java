/*
 * 健澜科技 jlmedaios - FHIR Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.fhir.service;

import com.jlmedaios.monolith.fhir.entity.FhirResource;
import com.jlmedaios.monolith.fhir.repository.FhirResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * FHIR Service。
 *
 * <p>当前 mock 存储，生产接 HAPI FHIR Server</p>
 */
@Service
@RequiredArgsConstructor
public class FhirService {

    private final FhirResourceRepository fhirResourceRepository;

    /**
     * 接收 FHIR 资源。
     *
     * @param resourceType  资源类型（Patient/Observation/Condition 等）
     * @param resourceId    资源 ID
     * @param patientId    患者 ID
     * @param jsonContent  资源 JSON
     * @return 已持久化的资源
     */
    public FhirResource receiveResource(String resourceType, String resourceId,
                                         Long patientId, String jsonContent) {
        FhirResource resource = FhirResource.builder()
                .resourceType(resourceType)
                .resourceId(resourceId)
                .patientId(patientId)
                .jsonContent(jsonContent)
                .build();
        return fhirResourceRepository.save(resource);
    }

    /**
     * 获取 Patient 资源（mock 返回 Map）。
     *
     * @param id 患者资源 ID
     * @return Patient 资源 Map
     */
    public Map<String, Object> getPatient(String id) {
        Map<String, Object> patient = new HashMap<>();
        patient.put("resourceType", "Patient");
        patient.put("id", id);
        patient.put("name", List.of(Map.of("family", "张", "given", List.of("三"))));
        patient.put("gender", "male");
        patient.put("birthDate", "1977-01-01");
        return patient;
    }

    /**
     * 获取某患者所有 Observation。
     *
     * @param patientId 患者 ID
     * @return Observation 资源列表
     */
    public List<Map<String, Object>> getPatientObservations(String patientId) {
        List<FhirResource> resources = fhirResourceRepository
                .findByResourceTypeAndPatientId("Observation", Long.valueOf(patientId));

        List<Map<String, Object>> observations = new ArrayList<>();
        for (FhirResource r : resources) {
            Map<String, Object> obs = new HashMap<>();
            obs.put("resourceType", "Observation");
            obs.put("id", r.getResourceId());
            obs.put("status", "final");
            observations.add(obs);
        }
        return observations;
    }
}
