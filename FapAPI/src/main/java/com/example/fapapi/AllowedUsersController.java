package com.example.fapapi;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/allowed-users")
public class AllowedUsersController {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping(path = "/verify", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> verify(@RequestBody Map<String, String> request) throws IOException {
        String email = Optional.ofNullable(request.get("email")).orElse("");
        if (email.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        var resource = new ClassPathResource("allowed-users.json");
        List<Map<String, Object>> users = objectMapper.readValue(
                resource.getInputStream(), new TypeReference<List<Map<String, Object>>>() {}
        );
        for (Map<String, Object> user : users) {
            Object e = user.get("email");
            if (e instanceof String s && s.equalsIgnoreCase(email)) {
                return ResponseEntity.ok(user);
            }
        }
        return ResponseEntity.status(404).build();
    }
}


