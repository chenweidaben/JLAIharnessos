/*
 * 健澜科技 jlmedaios - OpenAPI Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.openapi.service;

import com.jlmedaios.monolith.openapi.entity.ApiClient;
import com.jlmedaios.monolith.openapi.repository.ApiClientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * OpenAPI Service。
 */
@Service
@RequiredArgsConstructor
public class OpenApiService {

    private final ApiClientRepository apiClientRepository;

    /**
     * 注册 API 客户，生成随机 appKey + appSecret。
     *
     * @param clientName       客户名称
     * @param allowedScopes    允许的 scope（逗号分隔）
     * @param rateLimitPerMin  每分钟限流
     * @return 已持久化的客户（含完整 appSecret）
     */
    public ApiClient register(String clientName, String allowedScopes,
                               Integer rateLimitPerMin) {
        String appKey = "ak_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String appSecret = "sk_" + UUID.randomUUID().toString().replace("-", "").substring(0, 32);

        ApiClient client = ApiClient.builder()
                .clientName(clientName)
                .appKey(appKey)
                .appSecret(appSecret)
                .allowedScopes(allowedScopes)
                .rateLimitPerMin(rateLimitPerMin)
                .build();
        return apiClientRepository.save(client);
    }

    /**
     * 轮换密钥，生成新 appSecret。
     *
     * @param id 客户 ID
     * @return 更新后的客户
     */
    public Optional<ApiClient> rotateSecret(Long id) {
        Optional<ApiClient> opt = apiClientRepository.findById(id);
        opt.ifPresent(client -> {
            String newSecret = "sk_" + UUID.randomUUID().toString().replace("-", "").substring(0, 32);
            client.setAppSecret(newSecret);
            apiClientRepository.save(client);
        });
        return opt;
    }

    /**
     * 列出所有客户（appSecret 脱敏为 "****"）。
     *
     * @return 客户列表（脱敏）
     */
    public List<ApiClient> listClients() {
        List<ApiClient> all = apiClientRepository.findAll();
        // 脱敏：appSecret 只保留前 4 位 + ****
        return all.stream().peek(client -> {
            String secret = client.getAppSecret();
            if (secret != null && secret.length() > 4) {
                client.setAppSecret(secret.substring(0, 4) + "****");
            }
        }).collect(Collectors.toList());
    }
}
