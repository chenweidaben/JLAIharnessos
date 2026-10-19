/*
 * 健澜科技 jlmedaios - 在线咨询 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.online_consultation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.online_consultation.entity.OnlineConsultation;
import com.jlmedaios.monolith.online_consultation.service.OnlineConsultationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 在线咨询 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/online/consultation")
public class OnlineConsultationController {

    private final OnlineConsultationService onlineConsultationService;

    /**
     * 创建在线咨询。
     *
     * @param body {consultationNo, patientId, departmentCode, symptomDescription, fee}
     * @return Result<OnlineConsultation>
     */
    @PostMapping("/create")
    public Result<OnlineConsultation> create(@RequestBody Map<String, Object> body) {
        OnlineConsultation consultation = onlineConsultationService.create(
                String.valueOf(body.get("consultationNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("departmentCode")),
                String.valueOf(body.get("symptomDescription")),
                new BigDecimal(String.valueOf(body.get("fee")))
        );
        return Result.ok(consultation);
    }

    /**
     * 医生接诊。
     *
     * @param id   咨询 ID
     * @param body {doctorId}
     * @return Result<OnlineConsultation>
     */
    @PutMapping("/{id}/accept")
    public Result<OnlineConsultation> accept(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return onlineConsultationService.accept(id, String.valueOf(body.get("doctorId")))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 结束咨询。
     *
     * @param id   咨询 ID
     * @param body {prescriptionGenerated}
     * @return Result<OnlineConsultation>
     */
    @PutMapping("/{id}/finish")
    public Result<OnlineConsultation> finish(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return onlineConsultationService.finish(id, Boolean.parseBoolean(String.valueOf(body.get("prescriptionGenerated"))))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 待接诊列表。
     *
     * @return Result<List<OnlineConsultation>>
     */
    @GetMapping("/pending")
    public Result<List<OnlineConsultation>> pendingList() {
        return Result.ok(onlineConsultationService.pendingList());
    }
}
