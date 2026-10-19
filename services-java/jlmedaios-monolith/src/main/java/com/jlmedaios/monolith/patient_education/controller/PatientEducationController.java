/*
 * 健澜科技 jlmedaios - 患者教育 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_education.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.patient_education.entity.EducationDelivery;
import com.jlmedaios.monolith.patient_education.entity.EducationMaterial;
import com.jlmedaios.monolith.patient_education.service.PatientEducationService;
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
 * 患者教育 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/education")
public class PatientEducationController {

    private final PatientEducationService patientEducationService;

    /**
     * 教育材料列表。
     *
     * @return Result<List<EducationMaterial>>
     */
    @GetMapping("/materials")
    public Result<List<EducationMaterial>> materials() {
        return Result.ok(patientEducationService.materials());
    }

    /**
     * 推送教育材料。
     *
     * @param body {materialCode, patientId, encounterId}
     * @return Result<EducationDelivery>
     */
    @PostMapping("/deliver")
    public Result<EducationDelivery> deliver(@RequestBody Map<String, Object> body) {
        EducationDelivery delivery = patientEducationService.deliver(
                String.valueOf(body.get("materialCode")),
                Long.valueOf(String.valueOf(body.get("patientId"))),
                Long.valueOf(String.valueOf(body.get("encounterId")))
        );
        return Result.ok(delivery);
    }

    /**
     * 患者已接收材料列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<EducationDelivery>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<EducationDelivery>> patientMaterials(@PathVariable Long patientId) {
        return Result.ok(patientEducationService.patientMaterials(patientId));
    }
}
