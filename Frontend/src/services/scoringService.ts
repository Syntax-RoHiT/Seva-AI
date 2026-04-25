import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface UrgencyFactors {
  severity: number;      // S: 1-5
  unresolvedHours: number; // T: hours
  zoneDensity: number;    // Z: 1.0 (rural), 1.5 (urban), 2.0 (slum)
  repeatBonus: number;    // R: +1.0 per duplicate
  weatherBonus: number;   // W: +1.5 flood/cyclone, +1.0 heat, +0.5 rain
}

/**
 * Formula: U = S x (1 + T/12) x Z + R + W
 */
export const calculateUrgencyScore = (factors: UrgencyFactors): number => {
  const { severity, unresolvedHours, zoneDensity, repeatBonus, weatherBonus } = factors;
  
  const score = (severity * (1 + unresolvedHours / 12) * zoneDensity) + repeatBonus + weatherBonus;
  
  // Cap at 10.0 for UI purposes
  return Math.min(10, Math.max(0, parseFloat(score.toFixed(1))));
};

export const getStatusFromScore = (score: number): 'CRITICAL' | 'URGENT' | 'MEDIUM' | 'LOW' => {
  if (score >= 8.0) return 'CRITICAL';
  if (score >= 6.0) return 'URGENT';
  if (score >= 4.0) return 'MEDIUM';
  return 'LOW';
};
