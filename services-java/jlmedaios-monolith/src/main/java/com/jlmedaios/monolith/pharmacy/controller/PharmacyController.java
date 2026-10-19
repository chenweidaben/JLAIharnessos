/*
 * 健澜科技 jlmedaios - 药房 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.pharmacy.entity.DrugStock;
import com.jlmedaios.monolith.pharmacy.service.PharmacyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 药房 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pharmacy")
public class PharmacyController {

    private final PharmacyService pharmacyService;

    /**
     * 查询全部药品。
     *
     * @return Result<List<DrugStock>>
     */
    @GetMapping("/drugs")
    public Result<List<DrugStock>> listDrugs() {
        return Result.ok(pharmacyService.listDrugs());
    }

    /**
     * 发药核对。
     *
     * @param body {orderId, drugCode, operator}
     * @return Result<DrugStock>
     */
    @PostMapping("/dispense")
    public Result<DrugStock> dispense(@RequestBody Map<String, Object> body) {
        String drugCode = String.valueOf(body.get("drugCode"));
        return Result.ok(pharmacyService.dispense(drugCode));
    }
}
