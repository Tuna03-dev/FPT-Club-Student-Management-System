package com.sep490.backendclubmanagement.shared;

import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.core.ParameterNameDiscoverer;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Aspect
@Component
@RequiredArgsConstructor
public class RealtimeAspect {

    private final SimpMessagingTemplate template;

    private final ExpressionParser parser = new SpelExpressionParser();
    private final ParameterNameDiscoverer pnd = new DefaultParameterNameDiscoverer();

    @Around("@annotation(realtime)")
    public Object around(ProceedingJoinPoint pjp, Realtime realtime) throws Throwable {
        // Chạy business trước
        Object ret = pjp.proceed();

        // Chuẩn bị context đánh giá SpEL
        Method method = ((MethodSignature) pjp.getSignature()).getMethod();
        StandardEvaluationContext ctx = new StandardEvaluationContext();
        ctx.setVariable("ret", ret);

        String[] paramNames = pnd.getParameterNames(method);
        Object[] args = pjp.getArgs();
        if (paramNames != null) {
            for (int i = 0; i < paramNames.length; i++) {
                ctx.setVariable(paramNames[i], args[i]);
            }
        }

        Function<String, Object> eval = (expr) -> {
            if (expr == null || expr.isBlank()) return null;
            return parser.parseExpression(expr).getValue(ctx);
        };

        Long id     = toLong(eval.apply(realtime.id()));
        Long clubId = toLong(eval.apply(realtime.clubId()));
        Long teamId = toLong(eval.apply(realtime.teamId()));

        Map<String, Object> data = new HashMap<>();
        for (String kv : realtime.data()) {
            int i = kv.indexOf('=');
            if (i > 0) {
                String key = kv.substring(0, i).trim();
                String vExpr = kv.substring(i + 1).trim();
                Object v = eval.apply(vExpr);
                data.put(key, v);
            }
        }

        // Đăng ký gửi SAU KHI COMMIT để tránh thông báo "ảo"
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                var evt = new RealtimeEvent(
                        (realtime.entity().toUpperCase() + "_" + realtime.action().toUpperCase()),
                        realtime.entity(),
                        id,
                        Map.of("clubId", clubId, "teamId", teamId),
                        data,
                        Instant.now()
                );

                // Theo phạm vi: CLB và/hoặc TEAM
                if (clubId != null) {
                    template.convertAndSend("/topic/clubs." + clubId + "." + realtime.entity(), evt);
                }
                if (teamId != null) {
                    template.convertAndSend("/topic/teams." + teamId + "." + realtime.entity(), evt);
                }
            }
        });

        return ret;
    }

    private Long toLong(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        try { return Long.parseLong(String.valueOf(o)); } catch (Exception e) { return null; }
    }
}
