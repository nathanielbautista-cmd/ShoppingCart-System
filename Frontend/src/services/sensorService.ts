/**
 * Sensor Service for iCart
 *
 * HARDWARE TARGET:
 * HX711 24-bit ADC amplifier module connected to four half-bridge load cells
 * (Wheatstone bridge configuration) on Raspberry Pi GPIO pins.
 *
 * NOTE:
 * Real hardware communication (HX711 reading / tare calibration)
 * will be hooked into this module in the hardware phase.
 */

export interface WeightReading {
  rawWeightGrams: number;
  stabilizedWeightGrams: number;
  isStable: boolean;
  timestamp: number;
}

export interface WeightVerificationResult {
  verified: boolean;
  expectedWeightGrams: number;
  detectedWeightGrams: number;
  differenceGrams: number;
  toleranceGrams: number;
}

/**
 * Placeholder for reading current weight from load cell ADC.
 */
export async function getCurrentWeight(): Promise<number> {
  // Mock weight reader placeholder
  // In hardware phase, this will poll HX711 via GPIO or local daemon
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(0);
    }, 100);
  });
}

/**
 * Placeholder for taring the cart scale (zeroing weight).
 */
export async function tareCartScale(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 200);
  });
}

/**
 * Simulates or verifies whether placed item weight matches expected weight
 * within user-configured tolerance.
 */
export async function verifyProductWeight(
  expectedWeightGrams: number,
  toleranceGrams: number = 15,
  simulateMismatch: boolean = false
): Promise<WeightVerificationResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate slight natural variance (+/- 1-5g) or deliberate failure
      const variance = simulateMismatch
        ? toleranceGrams + 45
        : (Math.random() * 4 - 2);

      const detectedWeightGrams = Math.max(0, Math.round(expectedWeightGrams + variance));
      const differenceGrams = Math.abs(detectedWeightGrams - expectedWeightGrams);
      const verified = differenceGrams <= toleranceGrams;

      resolve({
        verified,
        expectedWeightGrams,
        detectedWeightGrams,
        differenceGrams,
        toleranceGrams,
      });
    }, 1200);
  });
}
