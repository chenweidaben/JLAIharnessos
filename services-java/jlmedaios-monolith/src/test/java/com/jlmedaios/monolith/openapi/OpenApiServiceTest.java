/*
 * 健澜科技 jlmedaios - OpenAPI Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.openapi;

import com.jlmedaios.monolith.openapi.entity.ApiClient;
import com.jlmedaios.monolith.openapi.service.OpenApiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * OpenAPI Service 测试。
 */
@SpringBootTest
public class OpenApiServiceTest {

    @Autowired
    private OpenApiService openApiService;

    @Test
    void testRegister() {
        ApiClient client = openApiService.register("第三方系统A", "read,write", 60);
        assertNotNull(client.getId());
        assertTrue(client.getAppKey().startsWith("ak_"));
        assertTrue(client.getAppSecret().startsWith("sk_"));
    }

    @Test
    void testRotateSecret() {
        ApiClient client = openApiService.register("第三方系统B", "read", 30);
        String oldSecret = client.getAppSecret();
        Optional<ApiClient> rotated = openApiService.rotateSecret(client.getId());
        assertTrue(rotated.isPresent());
        assertNotEquals(oldSecret, rotated.get().getAppSecret());
    }

    @Test
    void testListClients() {
        openApiService.register("第三方系统C", "read", 100);
        List<ApiClient> list = openApiService.listClients();
        assertNotNull(list);
        assertTrue(list.size() >= 1);
        // 验证 appSecret 已脱敏
        ApiClient first = list.get(0);
        assertTrue(first.getAppSecret().endsWith("****"));
    }
}
