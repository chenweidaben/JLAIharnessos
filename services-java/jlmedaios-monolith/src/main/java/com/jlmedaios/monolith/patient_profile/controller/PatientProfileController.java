/*
 * 健澜科技 jlmedaios - 患者画像 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_profile.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.patient_profile.entity.PatientProfile;
import com.jlmedaios.monolith.patient_profile.service.PatientProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 患者画像 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/profile")
public class PatientProfileController {

    private final PatientProfileService patientProfileService;

    /**
     * 患者 360 度画像。
     *
     * @param patientId 患者 ID
     * @return Result<PatientProfile>
     */
    @GetMapping("/{patientId}")
    public Result<PatientProfile> profile360(@PathVariable Long patientId) {
        return Result.ok(patientProfileService.profile360(patientId));
    }

    /**
     * 高风险患者列表。
     *
     * @return Result<List<PatientProfile>>
     */
    @GetMapping("/risk")
    public Result<List<PatientProfile>> highRiskList() {
        return Result.ok(patientProfileService.highRiskList());
    }

    /**
     * 科室患者概览。
     *
     * @param deptCode 科室编码
     * @return Result<List<PatientProfile>>
     */
    @GetMapping("/department/{deptCode}")
    public Result<List<PatientProfile>> departmentOverview(@PathVariable String deptCode) {
        return Result.ok(patientProfileService.departmentOverview(deptCode));
    }
}
