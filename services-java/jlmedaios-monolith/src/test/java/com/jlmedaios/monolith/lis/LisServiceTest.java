/*
 * 健澜科技 jlmedaios - 检验对接 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lis;

import com.jlmedaios.monolith.lis.entity.LisRequest;
import com.jlmedaios.monolith.lis.service.LisService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 检验对接 Service 测试。
 * TODO: 对接 LIS 系统 HL7 v2.x / FHIR R4 接口。
 */
@SpringBootTest
class LisServiceTest {

    @Autowired
    private LisService lisService;

    @Test
    void testRequest() {
        LisRequest req = lisService.request(1L, "CBC", "血常规");
        assertTrue(req.getId() > 0);
        assertEquals("REQUESTED", req.getStatus());
    }

    @Test
    void testGetResult() {
        LisRequest req = lisService.request(2L, "BIO", "生化检查");
        Optional<LisRequest> found = lisService.getResult(req.getId());
        assertTrue(found.isPresent());
        assertEquals("BIO", found.get().getTestCode());
    }
}
