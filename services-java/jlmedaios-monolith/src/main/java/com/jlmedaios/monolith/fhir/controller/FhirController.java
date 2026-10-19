/*
 * 健澜科技 jlmedaios - FHIR Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.fhir.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.fhir.entity.FhirResource;
import com.jlmedaios.monolith.fhir.service.FhirService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * FHIR Controller。
 *
 * <p>当前 mock 存储，生产接 HAPI FHIR Server</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/fhir")
public class FhirController {

    private final FhirService fhirService;

    /**
     * 接收 FHIR 资源。
     *
     * @param resourceType 资源类型
     * @param body {resourceId, patientId, jsonContent}
     * @return Result<FhirResource>
     */
    @PostMapping("/{resourceType}")
    public Result<FhirResource> receive(@PathVariable String resourceType,
                                        @RequestBody Map<String, Object> body) {
        FhirResource resource = fhirService.receiveResource(
                resourceType,
                String.valueOf(body.get("resourceId")),
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("jsonContent"))
        );
        return Result.ok(resource);
    }

    /**
     * 获取 Patient 资源。
     *
     * @param id 患者资源 ID
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/Patient/{id}")
    public Result<Map<String, Object>> getPatient(@PathVariable String id) {
        return Result.ok(fhirService.getPatient(id));
    }

    /**
     * 获取患者所有 Observation。
     *
     * @param id 患者资源 ID
     * @return Result<List<Map<String, Object>>>
     */
    @GetMapping("/Patient/{id}/Observation")
    public Result<List<Map<String, Object>>> getPatientObservations(@PathVariable String id) {
        return Result.ok(fhirService.getPatientObservations(id));
    }
}
