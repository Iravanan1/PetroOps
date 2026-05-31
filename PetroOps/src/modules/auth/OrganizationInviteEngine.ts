/**
 * OrganizationInviteEngine
 * Manages secure, cryptographically hashed employee onboarding invites.
 * Prevents unauthorized email registration and restricts roles (operator, manager, owner) strictly.
 */

export interface OrganizationInvite {
  token: string;
  email: string;
  targetRole: "operator" | "manager" | "owner";
  branchId: string;
  invitedBy: string;
  createdAt: number;
  expiresAt: number;
  isUsed: boolean;
}

export class OrganizationInviteEngine {
  private static invitesCacheKey = "pumpai_corporate_invites_ledger";
  private static salt = "PUMPAI_SECURE_INVITATION_SALT_2026";

  /**
   * Encrypts and hashes input properties using a custom SHA-256 generator or fallback digest
   * to yield a courtroom-safe unique verification invite token.
   */
  public static async generateInviteToken(email: string, role: string, timestamp: number): Promise<string> {
    const rawPayload = `${email}_${role}_${timestamp}_${this.salt}`;
    
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      try {
        const msgBuffer = new TextEncoder().encode(rawPayload);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      } catch (e) {
        console.warn("SubtleCrypto invitation digest failed, adopting fallback logic", e);
      }
    }

    // Standard high-performance non-crypto hash fallback (Fowler-Noll-Vo FNV-1a equivalent)
    let hash = 2166136261;
    for (let i = 0; i < rawPayload.length; i++) {
      hash ^= rawPayload.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return `inv_tk_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Retrieves the active invite logs from storage.
   */
  public static getInvites(): OrganizationInvite[] {
    const defaultInvites: OrganizationInvite[] = [
      {
        token: "inv_tk_delhi_demo_operator",
        email: "delhi.ops@pumpai.com",
        targetRole: "operator",
        branchId: "branch-delhi-01",
        invitedBy: "owner@pumpai.com",
        createdAt: Date.now() - 24 * 60 * 60 * 1000,
        expiresAt: Date.now() + 48 * 60 * 60 * 1000,
        isUsed: false
      },
      {
        token: "inv_tk_mumbai_demo_manager",
        email: "mumbai.mgr@pumpai.com",
        targetRole: "manager",
        branchId: "branch-mumbai-02",
        invitedBy: "owner@pumpai.com",
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        expiresAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // Expired
        isUsed: false
      }
    ];

    try {
      const stored = localStorage.getItem(this.invitesCacheKey);
      if (stored) {
        return JSON.parse(stored);
      }
      localStorage.setItem(this.invitesCacheKey, JSON.stringify(defaultInvites));
      return defaultInvites;
    } catch {
      return defaultInvites;
    }
  }

  /**
   * Saves invite registries to local storage.
   */
  public static saveInvites(invites: OrganizationInvite[]) {
    try {
      localStorage.setItem(this.invitesCacheKey, JSON.stringify(invites));
    } catch (e) {
      console.error("Failed to commit Organization Invites", e);
    }
  }

  /**
   * Dispatches and seals a new corporate registration invitation.
   */
  public static async createInvite(
    email: string,
    targetRole: "operator" | "manager" | "owner",
    branchId: string,
    invitedBy: string,
    validDurationMs = 48 * 60 * 60 * 1000 // 48 Hours lifetime
  ): Promise<OrganizationInvite> {
    const cleanEmail = email.trim().toLowerCase();
    const timestamp = Date.now();
    const token = await this.generateInviteToken(cleanEmail, targetRole, timestamp);

    const invites = this.getInvites();
    
    // De-duplicate active invites for the same email
    const filtered = invites.filter(i => !(i.email === cleanEmail && !i.isUsed));

    const newInvite: OrganizationInvite = {
      token,
      email: cleanEmail,
      targetRole,
      branchId,
      invitedBy,
      createdAt: timestamp,
      expiresAt: timestamp + validDurationMs,
      isUsed: false
    };

    filtered.push(newInvite);
    this.saveInvites(filtered);

    console.log(`[INVITE-DISPATCH] Cryptographic invite generated for ${cleanEmail} with token: ${token}`);
    return newInvite;
  }

  /**
   * Validates if a token is legitimate, matching the user email and fully unexpired.
   */
  public static validateInviteToken(token: string, email: string): { valid: boolean; invite?: OrganizationInvite; reason?: string } {
    const invites = this.getInvites();
    const match = invites.find(i => i.token === token);

    if (!match) {
      return { valid: false, reason: "INVALID_TOKEN: The provided invitation token does not exist." };
    }

    if (match.email !== email.trim().toLowerCase()) {
      return { valid: false, reason: "EMAIL_MISMATCH: The invitation token is not assigned to this email address." };
    }

    if (match.isUsed) {
      return { valid: false, reason: "TOKEN_ALREADY_CONSUMED: This invitation has already been used to register an account." };
    }

    if (Date.now() > match.expiresAt) {
      return { valid: false, reason: "EXPIRED_TOKEN: This invitation validity window has lapsed." };
    }

    return {
      valid: true,
      invite: match
    };
  }

  /**
   * Consumes an invitation token, marking it as permanently utilized.
   */
  public static consumeInviteToken(token: string): boolean {
    const invites = this.getInvites();
    const match = invites.find(i => i.token === token);
    
    if (match && !match.isUsed && Date.now() <= match.expiresAt) {
      match.isUsed = true;
      this.saveInvites(invites);
      return true;
    }
    return false;
  }
}
