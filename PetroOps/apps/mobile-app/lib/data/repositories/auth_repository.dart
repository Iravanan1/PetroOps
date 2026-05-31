import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/network/api_client.dart';

class UserProfile {
  final String userId;
  final String email;
  final String role;
  final String tenantId;

  UserProfile({
    required this.userId,
    required this.email,
    required this.role,
    required this.tenantId,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      userId: json['userId'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      tenantId: json['tenantId'] as String,
    );
  }
}

class AuthRepository {
  final ApiClient api;
  final SharedPreferences prefs;

  AuthRepository({required this.api, required this.prefs});

  /**
   * Submits user credentials to cloud central API, caching the session
   * token and user profile securely in local settings upon success.
   */
  Future<UserProfile?> authenticate(String email, String password) async {
    try {
      final response = await api.post(
        '/api/v1/auth/login',
        data: {
          'email': email,
          'passwordPlain': password,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        
        // Cache JWT Token and Refresh Token securely
        await prefs.setString('jwt_token', data['token'] as String);
        await prefs.setString('refresh_token', data['refreshToken'] as String);
        
        // Cache User Profile
        await prefs.setString('user_profile', jsonEncode(data));

        return UserProfile.fromJson(data);
      }
      return null;
    } catch (e) {
      print('[AuthRepository] Authentication failed: $e');
      return null;
    }
  }

  Future<void> logout() async {
    await prefs.remove('jwt_token');
    await prefs.remove('refresh_token');
    await prefs.remove('user_profile');
  }

  bool isAuthenticated() {
    return prefs.containsKey('jwt_token');
  }
}
