/*
 * 健澜科技 jlmedaios - 患者主索引 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.empi.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.empi.entity.Patient;
import com.jlmedaios.monolith.empi.service.EmpiService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 患者主索引 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/empi")
public class EmpiController {

    private final EmpiService empiService;

    /**
     * 建档。
     *
     * @param body {name, gender, idCard, phone}
     * @return Result<Patient>
     */
    @PostMapping("/register")
    public Result<Patient> register(@RequestBody Map<String, String> body) {
        Patient patient = empiService.register(
                body.get("name"),
                body.get("gender"),
                body.get("idCard"),
                body.get("phone")
        );
        return Result.ok(patient);
    }

    /**
     * 按 EMPI ID 查询患者。
     *
     * @param empiId EMPI ID
     * @return Result<Patient>
     */
    @GetMapping("/{empiId}")
    public Result<Patient> getByEmpiId(@PathVariable Long empiId) {
        return empiService.getByEmpiId(empiId)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "患者不存在"));
    }

    /**
     * 按身份证号查询患者。
     *
     * @param idCard 身份证号
     * @return Result<Patient>
     */
    @GetMapping("/search")
    public Result<Patient> searchByIdCard(@RequestParam String idCard) {
        return empiService.searchByIdCard(idCard)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "患者不存在"));
    }
}
