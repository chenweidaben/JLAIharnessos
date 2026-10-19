/*
 * 健澜科技 jlmedaios - 互联互通评级 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.interconnection_rating.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.interconnection_rating.entity.InterconnectionItem;
import com.jlmedaios.monolith.interconnection_rating.service.InterconnectionRatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 互联互通评级 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/interconn")
public class InterconnectionRatingController {

    private final InterconnectionRatingService interconnectionRatingService;

    /**
     * 评级指标列表。
     *
     * @return Result<List<InterconnectionItem>>
     */
    @GetMapping("/items")
    public Result<List<InterconnectionItem>> itemList() {
        return Result.ok(interconnectionRatingService.itemList());
    }

    /**
     * 按类别查询。
     *
     * @param category 类别
     * @return Result<List<InterconnectionItem>>
     */
    @GetMapping("/category/{category}")
    public Result<List<InterconnectionItem>> byCategory(@PathVariable String category) {
        return Result.ok(interconnectionRatingService.byCategory(category));
    }

    /**
     * 更新得分。
     *
     * @param code 指标编码
     * @param body {score}
     * @return Result<InterconnectionItem>
     */
    @PutMapping("/item/{code}/update")
    public Result<InterconnectionItem> updateScore(@PathVariable String code,
                                                    @RequestBody Map<String, Object> body) {
        return Result.ok(interconnectionRatingService.updateScore(code,
                new BigDecimal(String.valueOf(body.get("score")))));
    }
}
