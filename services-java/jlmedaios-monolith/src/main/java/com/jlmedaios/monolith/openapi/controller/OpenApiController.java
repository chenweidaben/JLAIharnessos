/*
 * 健澜科技 jlmedaios - OpenAPI Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.openapi.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.openapi.entity.ApiClient;
import com.jlmedaios.monolith.openapi.service.OpenApiService;
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
 * OpenAPI Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/openapi/client")
public class OpenApiController {

    private final OpenApiService openApiService;

    /**
     * 注册 API 客户。
     *
     * @param body {clientName, allowedScopes, rateLimitPerMin}
     * @return Result<ApiClient>
     */
    @PostMapping("/register")
    public Result<ApiClient> register(@RequestBody Map<String, Object> body) {
        ApiClient client = openApiService.register(
                String.valueOf(body.get("clientName")),
                String.valueOf(body.get("allowedScopes")),
                Integer.valueOf(String.valueOf(body.get("rateLimitPerMin")))
        );
        return Result.ok(client);
    }

    /**
     * 轮换密钥。
     *
     * @param id 客户 ID
     * @return Result<ApiClient>
     */
    @PostMapping("/{id}/rotate-secret")
    public Result<ApiClient> rotateSecret(@PathVariable Long id) {
        return openApiService.rotateSecret(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "客户不存在"));
    }

    /**
     * 列出所有客户（appSecret 脱敏）。
     *
     * @return Result<List<ApiClient>>
     */
    @GetMapping("/list")
    public Result<List<ApiClient>> listClients() {
        return Result.ok(openApiService.listClients());
    }
}
