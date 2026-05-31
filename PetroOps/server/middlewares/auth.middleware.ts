import { Request, Response, NextFunction } from 'express';
import { adminAuth, adminDb } from '../utils/firebaseAdmin.js';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: string;
    organizationId?: string;
    pumpId?: string;
  };
}

export const authMiddleware = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      // Developer bypass / Staging bypass for seamless integration in AI Studio
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (!isProduction && (req.headers['x-demo-bypass'] === 'true' || !authHeader)) {
        console.log("Demo/Bypass active: Authenticating mock operator");
        req.user = {
          uid: "demo-operator-123",
          email: "operator@pumpai.com",
          role: "operator",
          organizationId: "demo-org",
          pumpId: "default-pump"
        };
        next();
        return;
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         res.status(401).json({ error: 'Unauthorized: No token provided' });
         return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
      } catch (err) {
        if (isProduction) {
          res.status(401).json({ error: 'Unauthorized: Invalid token session' });
          return;
        }
        // Fallback for developer builds
        console.warn("Invalid Firebase Token, using developer fallback context");
        req.user = {
          uid: "demo-operator-123",
          email: "operator@pumpai.com",
          role: "operator",
          organizationId: "demo-org",
          pumpId: "default-pump"
        };
        next();
        return;
      }
      
      // Fetch user role from Firestore
      let userRole = 'operator';
      let userData: any = {};
      try {
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        userData = userDoc.data() || {};
        userRole = userData.role || 'operator';
      } catch (dbErr) {
        console.warn("Could not query Firestore for user roles, using default operator assignment");
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
        return;
      }

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: userRole,
        organizationId: userData.organizationId,
        pumpId: userData.pumpId
      };

      next();
    } catch (error) {
      console.error('Auth Error:', error);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }
  };
};
