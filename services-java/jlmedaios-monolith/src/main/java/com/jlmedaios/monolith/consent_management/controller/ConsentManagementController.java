/*
 * 健澜科技 jlmedaios - 知情同意管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.consent_management.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.consent_management.entity.ConsentForm;
import com.jlmedaios.monolith.consent_management.service.ConsentManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 知情同意管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/consent")
public class ConsentManagementController {

    private final ConsentManagementService consentManagementService;

    /**
     * 创建知情同意书。
     *
     * @param body {formNo, patientId, formType, content}
     * @return Result<ConsentForm>
     */
    @PostMapping("/create")
    public Result<ConsentForm> createForm(@RequestBody Map<String, Object> body) {
        ConsentForm form = consentManagementService.createForm(
                String.valueOf(body.get("formNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("formType")),
                String.valueOf(body.get("content"))
        );
        return Result.ok(form);
    }

    /**
     * 签署。
     *
     * @param id   表单 ID
     * @param body {patientSignature, doctorSignature}
     * @return Result<ConsentForm>
     */
    @PutMapping("/{id}/sign")
    public Result<ConsentForm> sign(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return consentManagementService.sign(
                id,
                String.valueOf(body.get("patientSignature")),
                String.valueOf(body.get("doctorSignature"))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 患者已签同意书列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<ConsentForm>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<ConsentForm>> patientForms(@PathVariable Long patientId) {
        return Result.ok(consentManagementService.patientForms(patientId));
    }
}
