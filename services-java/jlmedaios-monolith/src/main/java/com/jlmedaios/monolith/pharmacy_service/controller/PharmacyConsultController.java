/*
 * 健澜科技 jlmedaios - 药学咨询 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy_service.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.pharmacy_service.entity.PharmacyConsult;
import com.jlmedaios.monolith.pharmacy_service.service.PharmacyService;
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
 * 药学咨询 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pharmacy-consult")
public class PharmacyConsultController {

    private final PharmacyService pharmacyService;

    /**
     * 创建药学咨询。
     *
     * @param body {patientId, drugName, consultType, questionText}
     * @return Result<PharmacyConsult>
     */
    @PostMapping("/create")
    public Result<PharmacyConsult> create(@RequestBody Map<String, Object> body) {
        PharmacyConsult consult = pharmacyService.create(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("drugName")),
                String.valueOf(body.get("consultType")),
                String.valueOf(body.get("questionText"))
        );
        return Result.ok(consult);
    }

    /**
     * 按患者 ID 查询药学咨询列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<PharmacyConsult>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<PharmacyConsult>> listByPatient(@PathVariable Long patientId) {
        return Result.ok(pharmacyService.listByPatient(patientId));
    }

    /**
     * 待回复队列。
     *
     * @return Result<List<PharmacyConsult>>
     */
    @GetMapping("/pending")
    public Result<List<PharmacyConsult>> pendingList() {
        return Result.ok(pharmacyService.pendingList());
    }
}
