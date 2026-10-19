/*
 * 健澜科技 jlmedaios - 病案管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_record.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.medical_record.entity.MedicalRecord;
import com.jlmedaios.monolith.medical_record.service.MedicalRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 病案管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/medical-record")
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;

    /**
     * 创建病案。
     *
     * @param body {patientId, visitId, recordType, icdPrincipal, icdOther, operationCodes, admissionDate, dischargeDate, attendingDoctor}
     * @return Result<MedicalRecord>
     */
    @PostMapping("/create")
    public Result<MedicalRecord> create(@RequestBody Map<String, Object> body) {
        MedicalRecord record = medicalRecordService.create(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                Long.valueOf(String.valueOf(body.get("visitId"))),
                String.valueOf(body.get("recordType")),
                String.valueOf(body.get("icdPrincipal")),
                String.valueOf(body.get("icdOther")),
                String.valueOf(body.get("operationCodes")),
                LocalDate.parse(String.valueOf(body.get("admissionDate"))),
                LocalDate.parse(String.valueOf(body.get("dischargeDate"))),
                String.valueOf(body.get("attendingDoctor"))
        );
        return Result.ok(record);
    }

    /**
     * 病案质控。
     *
     * @param id   病案 ID
     * @param body {status}
     * @return Result<MedicalRecord>
     */
    @PutMapping("/{id}/quality-check")
    public Result<MedicalRecord> qualityCheck(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return medicalRecordService.qualityCheck(id, String.valueOf(body.get("status")))
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 病案归档。
     *
     * @param id 病案 ID
     * @return Result<MedicalRecord>
     */
    @PutMapping("/{id}/archive")
    public Result<MedicalRecord> archive(@PathVariable Long id) {
        return medicalRecordService.archive(id)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 按患者查询病案列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<MedicalRecord>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<MedicalRecord>> listByPatient(@PathVariable Long patientId) {
        return Result.ok(medicalRecordService.listByPatient(patientId));
    }
}
