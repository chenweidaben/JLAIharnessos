/*
 * 健澜科技 jlmedaios - 药品相互作用 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_interaction;

import com.jlmedaios.monolith.drug_interaction.service.DrugInteractionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 药品相互作用 Service 测试。
 */
@SpringBootTest
public class DrugInteractionServiceTest {

    @Autowired
    private DrugInteractionService drugInteractionService;

    @Test
    void testMatch() {
        Map<String, Object> result = drugInteractionService.check(
                List.of("华法林", "阿司匹林"), 1L
        );
        assertEquals("match", result.get("result"));
    }

    @Test
    void testNoMatch() {
        Map<String, Object> result = drugInteractionService.check(
                List.of("阿莫西林", "布洛芬"), 2L
        );
        assertEquals("no_match", result.get("result"));
    }

    @Test
    void testAllRules() {
        assertNotNull(drugInteractionService.allRules());
    }

    @Test
    void testCheckLog() {
        drugInteractionService.check(List.of("华法林", "阿司匹林"), 3L);
        assertNotNull(drugInteractionService.checkLog(3L));
    }
}
