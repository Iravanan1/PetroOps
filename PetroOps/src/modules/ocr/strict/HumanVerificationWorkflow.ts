import { OCRValidationStatus } from './OCRConfidenceMatrix';

export class HumanVerificationWorkflow {
  
  public static transitionState(current: OCRValidationStatus, action: 'REVIEW' | 'VERIFY' | 'APPROVE' | 'LOCK'): OCRValidationStatus {
    switch (current) {
      case 'AUTO_EXTRACTED':
        if (action === 'REVIEW') return 'REVIEW_REQUIRED';
        if (action === 'LOCK') return 'LOCKED';
        return current;
        
      case 'REVIEW_REQUIRED':
        if (action === 'VERIFY') return 'MANAGER_VERIFIED';
        return current;
        
      case 'MANAGER_VERIFIED':
        if (action === 'APPROVE') return 'AUDITOR_APPROVED';
        if (action === 'REVIEW') return 'REVIEW_REQUIRED'; // downgrade
        return current;
        
      case 'AUDITOR_APPROVED':
        if (action === 'LOCK') return 'LOCKED';
        if (action === 'REVIEW') return 'REVIEW_REQUIRED';
        return current;
        
      case 'LOCKED':
        // Cannot escape locked state easily
        return 'LOCKED';
        
      default:
        return current;
    }
  }
}
