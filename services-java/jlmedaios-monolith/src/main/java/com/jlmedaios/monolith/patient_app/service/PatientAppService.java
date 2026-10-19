/*
 * 健澜科技 jlmedaios - 患者 APP Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_app.service;

import com.jlmedaios.monolith.patient_app.repository.PatientAppSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 患者 APP Service。
 *
 * <p>append-only: 患者 APP 会话不可修改；患者端 BFF，生产接微信小程序/APP</p>
 */
@Service
@RequiredArgsConstructor
public class PatientAppService {

    private final PatientAppSessionRepository patientAppSessionRepository;

    /**
     * 患者 APP 功能菜单（预约挂号/报告查询/在线缴费/在线咨询/健康档案）。
     *
     * @return 功能菜单列表
     */
    public List<Map<String, Object>> menu() {
        List<Map<String, Object>> menu = new ArrayList<>();
        menu.add(buildMenuItem("appointment", "预约挂号", "/api/appointment"));
        menu.add(buildMenuItem("report", "报告查询", "/api/report"));
        menu.add(buildMenuItem("payment", "在线缴费", "/api/payment"));
        menu.add(buildMenuItem("consult", "在线咨询", "/api/consult"));
        menu.add(buildMenuItem("record", "健康档案", "/api/record"));
        return menu;
    }

    /**
     * 患者消息推送。
     *
     * @param patientId 患者 ID
     * @return 消息列表
     */
    public List<Map<String, Object>> notifications(String patientId) {
        List<Map<String, Object>> notifications = new ArrayList<>();
        Map<String, Object> n1 = new HashMap<>();
        n1.put("type", "appointment_reminder");
        n1.put("title", "预约提醒");
        n1.put("content", "您已预约明天上午9点心内科门诊");
        notifications.add(n1);
        return notifications;
    }

    /**
     * 设置偏好。
     *
     * @param patientId      患者 ID
     * @param preferenceJson 偏好 JSON
     * @return 设置结果
     */
    public Map<String, Object> preference(String patientId, String preferenceJson) {
        Map<String, Object> result = new HashMap<>();
        result.put("patientId", patientId);
        result.put("preference", preferenceJson);
        result.put("status", "saved");
        return result;
    }

    private Map<String, Object> buildMenuItem(String code, String name, String path) {
        Map<String, Object> item = new HashMap<>();
        item.put("code", code);
        item.put("name", name);
        item.put("path", path);
        return item;
    }
}
