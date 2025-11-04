package com.sep490.backendclubmanagement.shared;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Realtime {
    /** Tên thực thể: "post", "request", "news", "draft", ... */
    String entity();

    /** Hành động: "CREATED", "UPDATED", "DELETED", "PUBLISHED", ... */
    String action();

    /** SpEL lấy id entity. VD: "#ret.id" hoặc "#arg0" (tham số đầu tiên) */
    String id() default "";

    /** SpEL lấy clubId. VD: "#ret.clubId" hoặc "#arg0.clubId" */
    String clubId() default "";

    /** SpEL lấy teamId (nếu có). VD: "#ret.teamId" hoặc "#arg0.teamId" */
    String teamId() default "";

    /** Key=SpEL gửi kèm delta nhỏ cho FE. VD: {"title=#ret.title","status=#ret.status"} */
    String[] data() default {};
}
