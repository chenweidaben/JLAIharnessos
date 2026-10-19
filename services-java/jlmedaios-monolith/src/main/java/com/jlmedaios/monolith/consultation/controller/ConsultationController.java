/*
 * 健澜科技 jlmedaios - 会诊管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.consultation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.consultation.entity.Consultation;
import com.jlmedaios.monolith.consultation.service.ConsultationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 会诊管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/consultation")
public class ConsultationController {

    private final ConsultationService consultationService;

    /**
     * 发起会诊申请。
     *
     * @param body {requestDept, targetDept, patientId, reason, requestDoctor}
     * @return Result<Consultation>
     */
    @PostMapping("/request")
    public Result<Consultation> request(@RequestBody Map<String, Object> body) {
        Consultation consultation = consultationService.request(
                String.valueOf(body.get("requestDept")),
                String.valueOf(body.get("targetDept")),
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("reason")),
                String.valueOf(body.get("requestDoctor"))
        );
        return Result.ok(consultation);
    }

    /**
     * 接受会诊。
     *
     * @param id   会诊 ID
     * @param body {consultDoctor}
     * @return Result<Consultation>
     */
    @PutMapping("/{id}/accept")
    public Result<Consultation> accept(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return consultationService.accept(id, String.valueOf(body.get("consultDoctor")))
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 完成会诊。
     *
     * @param id   会诊 ID
     * @param body {consultResult}
     * @return Result<Consultation>
     */
    @PutMapping("/{id}/complete")
    public Result<Consultation> complete(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return consultationService.complete(id, String.valueOf(body.get("consultResult")))
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 待会诊列表。
     *
     * @return Result<List<Consultation>>
     */
    @GetMapping("/pending")
    public Result<List<Consultation>> pendingList() {
        return Result.ok(consultationService.pendingList());
    }
}
