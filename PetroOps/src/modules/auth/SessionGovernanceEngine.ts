/**
 * SessionGovernanceEngine
 * Monitally tracks active user browser sessions, scores telemetry flags (concurrency, speed-impossible travel jumps),
 * and triggers immediate lockouts if security constraints are breached.
 */

export interface ActiveSession {
  sessionId: string;
  userId: string;
  tenantId: string;
  ipAddress: string;
  countryCode: string;
  regionName: string;
  loginTimestamp: number;
  lastActiveTimestamp: number;
  deviceFingerprint: string;
  riskScore: number; // 0 (Trusted) to 100 (Immediate Critical Lockout)
}

export interface SecurityGovernancePolicy {
  sessionTimeoutMs: number;
  maxConcurrentSessions: number;
  allowedCountryCodes: string[];
  maxRiskThreshold: number;
  impossibleTravelSpeedThresholdKmh: number; // Max virtual speed between logs
}

export class SessionGovernanceEngine {
  private static activeSessionsCacheKey = "pumpai_active_sessions_manifest";
  
  public static defaultPolicy: SecurityGovernancePolicy = {
    sessionTimeoutMs: 15 * 60 * 1000, // 15 Minutes idle limit
    maxConcurrentSessions: 2,
    allowedCountryCodes: ["IN", "AE", "SG"], // Primary regional corporate zones
    maxRiskThreshold: 75,
    impossibleTravelSpeedThresholdKmh: 800 // Commercial jetliner speed limit
  };

  /**
   * Retrieves all running sessions inside tenant bounds.
   */
  public static getActiveSessions(tenantId: string): ActiveSession[] {
    const defaultSessions: ActiveSession[] = [
      {
        sessionId: "sess_del_001",
        userId: "demo-operator-123",
        tenantId: "tenant-delhi-01",
        ipAddress: "103.45.192.12",
        countryCode: "IN",
        regionName: "Delhi",
        loginTimestamp: Date.now() - 30 * 60 * 1000,
        lastActiveTimestamp: Date.now() - 30 * 1000,
        deviceFingerprint: "a1b2c3d4e5f678901234567890abcdef",
        riskScore: 5
      }
    ];

    try {
      const stored = localStorage.getItem(`${this.activeSessionsCacheKey}_${tenantId}`);
      if (stored) {
        return JSON.parse(stored);
      }
      localStorage.setItem(`${this.activeSessionsCacheKey}_${tenantId}`, JSON.stringify(defaultSessions));
      return defaultSessions;
    } catch {
      return defaultSessions;
    }
  }

  /**
   * Updates/saves running session rows to the database cache.
   */
  public static saveActiveSessions(tenantId: string, sessions: ActiveSession[]) {
    try {
      localStorage.setItem(`${this.activeSessionsCacheKey}_${tenantId}`, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to commit Active Session registry", e);
    }
  }

  /**
   * Registers a new session, performing telemetry boundary evaluations instantly.
   */
  public static evaluateAndRegisterSession(
    userId: string,
    tenantId: string,
    ip: string,
    country: string,
    region: string,
    deviceFingerprint: string,
    policy = this.defaultPolicy
  ): { success: boolean; session: ActiveSession | null; reason?: string } {
    
    // 1. Geo-IP Lock checks
    if (!policy.allowedCountryCodes.includes(country.toUpperCase())) {
      return {
        success: false,
        session: null,
        reason: `GEOGRAPHIC_SECURITY_LOCKOUT: Region [${country}] is explicitly blocked from tenant operations.`
      };
    }

    const currentSessions = this.getActiveSessions(tenantId);
    
    // Prune stale/expired sessions first to prevent false concurrency flags
    const activeValidSessions = currentSessions.filter(s => {
      const isExpired = Date.now() - s.lastActiveTimestamp > policy.sessionTimeoutMs;
      return !isExpired;
    });

    const userActiveSessions = activeValidSessions.filter(s => s.userId === userId);

    // 2. Concurrency Checks
    if (userActiveSessions.length >= policy.maxConcurrentSessions) {
      // Flag high risk warning but don't hard lock immediately unless exceeding limit + 1
      if (userActiveSessions.length > policy.maxConcurrentSessions) {
        return {
          success: false,
          session: null,
          reason: `CONCURRENCY_VIOLATION: Max limits of [${policy.maxConcurrentSessions}] concurrent sessions exceeded.`
        };
      }
    }

    // 3. Evaluate Travel Velocity (Speed-Impossible location jumps)
    let computedRisk = 0;
    for (const pastSession of userActiveSessions) {
      if (pastSession.regionName !== region) {
        // Simple mock distance estimation (e.g. Delhi to Mumbai is ~1150km, Delhi to Bangalore is ~1700km)
        // In fully wired setups, this evaluates coordinates via latitude/longitude Haversine formulas
        const distanceKm = 1200; 
        const elapsedHours = (Date.now() - pastSession.lastActiveTimestamp) / 1000 / 3600;
        
        if (elapsedHours > 0) {
          const velocity = distanceKm / elapsedHours;
          if (velocity > policy.impossibleTravelSpeedThresholdKmh) {
            computedRisk += 60; // Flag severe risk jump
            console.warn(`Impossible travel identified: ${velocity.toFixed(0)} km/h speed registered between access nodes.`);
          }
        }
      }
    }

    if (computedRisk >= policy.maxRiskThreshold) {
      return {
        success: false,
        session: null,
        reason: `IMPOSSIBLE_TRAVEL_LOCKOUT: Telemetry alerts suspicious geolocation shifts. Lockout enforced.`
      };
    }

    // Initialize clean session
    const newSession: ActiveSession = {
      sessionId: `sess_${Math.floor(Math.random() * 9000000) + 1000000}`,
      userId,
      tenantId,
      ipAddress: ip,
      countryCode: country,
      regionName: region,
      loginTimestamp: Date.now(),
      lastActiveTimestamp: Date.now(),
      deviceFingerprint,
      riskScore: computedRisk
    };

    activeValidSessions.push(newSession);
    this.saveActiveSessions(tenantId, activeValidSessions);

    return {
      success: true,
      session: newSession
    };
  }

  /**
   * Heartbeat log indicating active session usage.
   * Forces lockouts dynamically if sessions expire during the check.
   */
  public static processHeartbeat(
    tenantId: string,
    sessionId: string,
    policy = this.defaultPolicy
  ): { alive: boolean; riskScore: number } {
    const sessions = this.getActiveSessions(tenantId);
    const index = sessions.findIndex(s => s.sessionId === sessionId);

    if (index === -1) {
      return { alive: false, riskScore: 100 };
    }

    const session = sessions[index];
    const idleDuration = Date.now() - session.lastActiveTimestamp;

    if (idleDuration > policy.sessionTimeoutMs) {
      // Prune expired
      sessions.splice(index, 1);
      this.saveActiveSessions(tenantId, sessions);
      return { alive: false, riskScore: 100 };
    }

    // Update timestamp
    session.lastActiveTimestamp = Date.now();
    this.saveActiveSessions(tenantId, sessions);

    return {
      alive: true,
      riskScore: session.riskScore
    };
  }

  /**
   * Instantly kills a session (forced logout).
   */
  public static terminateSession(tenantId: string, sessionId: string) {
    const sessions = this.getActiveSessions(tenantId);
    const filtered = sessions.filter(s => s.sessionId !== sessionId);
    this.saveActiveSessions(tenantId, filtered);
  }
}
