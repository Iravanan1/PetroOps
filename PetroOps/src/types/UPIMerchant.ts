export type QRProvider = 
  | 'Paytm' 
  | 'PhonePe' 
  | 'BharatPe' 
  | 'Google Pay Business' 
  | 'SBI QR' 
  | 'ICICI QR' 
  | 'HDFC SmartHub' 
  | 'Custom UPI';

export interface UPIMerchant {
  id: string;
  provider: QRProvider;
  name: string;
  upiId: string;
  linkedBank: string;
  qrLabel: string;
  active: boolean;
  createdAt: string;
}
