package com.sep490.backendclubmanagement.security;

import com.sep490.backendclubmanagement.service.AllowedUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AllowedUserDetailsService implements UserDetailsService {

    private final AllowedUserService allowedUserService;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var profileOpt = allowedUserService.findProfileByEmail(username);
        if (profileOpt.isEmpty()) {
            throw new UsernameNotFoundException("User not allowed: " + username);
        }
        var profile = profileOpt.get();
        String systemRole = String.valueOf(profile.getOrDefault("systemRole", "STUDENT"));
        return new User(username, "N/A", List.of(new SimpleGrantedAuthority("ROLE_" + systemRole)));
    }
}


