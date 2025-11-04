package com.sep490.backendclubmanagement.shared;

import java.time.Instant;
import java.util.Map;

/** Envelope sự kiện gửi ra FE. */
public record RealtimeEvent(
        String type,                 // POST_CREATED, REQUEST_UPDATED, ...
        String entity,               // "post", "request", ...
        Long id,                     // entity id
        Map<String, Object> scope,   // { "clubId": 10, "teamId": 5 }
        Map<String, Object> data,    // delta nhỏ
        Instant at                   // server time
) {}
