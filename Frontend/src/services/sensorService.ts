import api from './api';


export interface WeightReading {
  grams: number;
  stable: boolean;
  spreadGrams: number;
  sampleCount: number;
  sensorCount: number;
  measuredAt: string;
  receivedAt: string;
}

export interface WeightVerificationResult {
  verified: boolean;
  expectedWeightGrams: number;
  detectedWeightGrams: number;
  differenceGrams: number;
  toleranceGrams: number;
  reason?: 'MISMATCH' | 'TIMEOUT' | 'HARDWARE_UNAVAILABLE';
}

type WeightDirection = 'increase' | 'decrease';

const POLL_INTERVAL_MS = 350;
const BASELINE_TIMEOUT_MS = 5000;
const CHANGE_TIMEOUT_MS = 15000;

const delay = (milliseconds: number) => new Promise((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

export async function getCurrentWeight(): Promise<WeightReading> {
  const response: any = await api.get('/hardware/weight');
  if (!response?.reading || !Number.isFinite(Number(response.reading.grams))) {
    throw new Error('The load-cell service returned an invalid reading.');
  }
  return {
    ...response.reading,
    grams: Number(response.reading.grams),
    stable: response.reading.stable === true,
  };
}

async function getStableBaseline(): Promise<WeightReading> {
  const deadline = Date.now() + BASELINE_TIMEOUT_MS;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    try {
      const reading = await getCurrentWeight();
      if (reading.stable) return reading;
    } catch (error) {
      lastError = error;
    }
    await delay(POLL_INTERVAL_MS);
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error('The load-cell reading did not become stable. Keep the basket still and try again.');
}





export async function verifyProductWeight(
  expectedWeightGrams: number,
  toleranceGrams: number = 15,
  simulateMismatch: boolean = false,
  direction: WeightDirection = 'increase',
  onBaselineCaptured?: () => void
): Promise<WeightVerificationResult> {
  if (expectedWeightGrams <= 0) {
    throw new Error('This product has no valid expected weight. Ask staff to update the product record.');
  }


  if (simulateMismatch) {
    onBaselineCaptured?.();
    await delay(600);
    const detectedWeightGrams = expectedWeightGrams + toleranceGrams + 45;
    return {
      verified: false,
      expectedWeightGrams,
      detectedWeightGrams,
      differenceGrams: Math.abs(detectedWeightGrams - expectedWeightGrams),
      toleranceGrams,
      reason: 'MISMATCH',
    };
  }

  let baseline: WeightReading;
  try {
    baseline = await getStableBaseline();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'HX711 load cells are unavailable.';
    throw new Error(`Load-cell verification unavailable: ${message}`);
  }
  onBaselineCaptured?.();

  const deadline = Date.now() + CHANGE_TIMEOUT_MS;
  const minimumChange = Math.max(2, Math.min(toleranceGrams, expectedWeightGrams * 0.1));
  let lastDetected = 0;

  while (Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    let reading: WeightReading;
    try {
      reading = await getCurrentWeight();
    } catch {

      continue;
    }
    if (!reading.stable || reading.receivedAt === baseline.receivedAt) continue;

    const rawDelta = direction === 'increase'
      ? reading.grams - baseline.grams
      : baseline.grams - reading.grams;
    lastDetected = Math.max(0, Number(rawDelta.toFixed(1)));


    if (lastDetected < minimumChange) continue;

    const differenceGrams = Number(Math.abs(lastDetected - expectedWeightGrams).toFixed(1));
    const verified = differenceGrams <= toleranceGrams;
    return {
      verified,
      expectedWeightGrams,
      detectedWeightGrams: lastDetected,
      differenceGrams,
      toleranceGrams,
      reason: verified ? undefined : 'MISMATCH',
    };
  }

  return {
    verified: false,
    expectedWeightGrams,
    detectedWeightGrams: lastDetected,
    differenceGrams: Number(Math.abs(lastDetected - expectedWeightGrams).toFixed(1)),
    toleranceGrams,
    reason: 'TIMEOUT',
  };
}

export async function tareCartScale(): Promise<boolean> {
  throw new Error('Taring must be performed locally on the Raspberry Pi with calibration.py.');
}
