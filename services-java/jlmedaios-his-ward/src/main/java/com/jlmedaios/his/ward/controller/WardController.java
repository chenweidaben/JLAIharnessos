/*
 * 健澜科技 jlmedaios - 住院床位 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.ward.controller;

import com.jlmedaios.his.ward.common.Result;
import com.jlmedaios.his.ward.entity.Bed;
import com.jlmedaios.his.ward.service.WardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 住院床位 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/his/ward")
public class WardController {

    private final WardService wardService;

    /**
     * 查询全部床位。
     *
     * @return Result<List<Bed>>
     */
    @GetMapping("/beds")
    public Result<List<Bed>> listBeds() {
        return Result.ok(wardService.listBeds());
    }

    /**
     * 入住。
     *
     * @param body {bedCode, patientId}
     * @return Result<Bed>
     */
    @PostMapping("/admit")
    public Result<Bed> admit(@RequestBody Map<String, Object> body) {
        String bedCode = String.valueOf(body.get("bedCode"));
        Long patientId = Long.valueOf(String.valueOf(body.get("patientId")));
        return wardService.admit(bedCode, patientId)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "床位不存在"));
    }

    /**
     * 出院。
     *
     * @param body {bedCode}
     * @return Result<Bed>
     */
    @PostMapping("/discharge")
    public Result<Bed> discharge(@RequestBody Map<String, String> body) {
        String bedCode = body.get("bedCode");
        return wardService.discharge(bedCode)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "床位不存在"));
    }
}
