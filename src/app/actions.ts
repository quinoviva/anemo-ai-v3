
'use server';

import {
  generateImageDescription,
  GenerateImageDescriptionInput,
  GenerateImageDescriptionOutput,
} from '@/ai/flows/generate-image-description';
import {
  providePersonalizedRecommendations,
  PersonalizedRecommendationsInput,
  PersonalizedRecommendationsOutput,
} from '@/ai/flows/provide-personalized-recommendations';
import {
  findNearbyClinics,
  FindNearbyClinicsInput,
  FindNearbyClinicsOutput,
} from '@/ai/flows/find-nearby-clinics';
import {
  analyzeCbcReport,
  AnalyzeCbcReportInput,
  AnalyzeCbcReportOutput,
} from '@/ai/flows/analyze-cbc-report';
import {
  validateMultimodalResults,
  ValidateMultimodalResultsInput,
  ValidateMultimodalResultsOutput,
} from '@/ai/flows/validate-multimodal-results';
import {
  answerAnemiaQuestion,
  AnswerAnemiaQuestionInput,
  AnswerAnemiaQuestionOutput,
} from '@/ai/flows/answer-anemia-related-questions';

import { getAdminApp, getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Use Admin App for checking credentials presence
const adminApp = getAdminApp();

// ── Server-side rate limiting ──────────────────────────────────────────────
// In-memory store: userId → last call timestamp per action
const rateLimitStore = new Map<string, number>();
const RATE_LIMIT_MS = 3000; // 3s cooldown per user per action

function checkRateLimit(key: string): void {
  const now = Date.now();
  const last = rateLimitStore.get(key) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
  }
  rateLimitStore.set(key, now);
}

/**
 * Calculates a SHA-256 hash of a data URI or base64 string.
 */
function calculateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

const ALLOWED_BODY_PARTS = new Set(['skin', 'fingernails', 'under-eye', 'undereye', 'lab_reports']);

function safeBodyPart(bodyPart: string): string {
  const lower = bodyPart.toLowerCase().trim();
  if (!ALLOWED_BODY_PARTS.has(lower)) {
    throw new Error(`Invalid body part: ${bodyPart}`);
  }
  return lower;
}

/**
 * Checks if an image has been processed before and returns its cached result.
 */
export async function checkImageConsistency(dataUri: string, bodyPart: string) {
  const safePart = safeBodyPart(bodyPart);
  try {
    const hash = calculateHash(dataUri);
    const cacheDir = path.join(process.cwd(), '.cache', 'analysis_results');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cachePath = path.join(cacheDir, `${hash}_${safePart}.json`);
    if (fs.existsSync(cachePath)) {
      console.log(`Cache hit for image consistency: ${hash}`);
      try {
        const cachedResult = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        return { isConsistent: true, result: cachedResult as GenerateImageDescriptionOutput };
      } catch {
        // Cache corrupted — treat as miss
        fs.unlinkSync(cachePath);
        return { isConsistent: false, hash };
      }
    }

    return { isConsistent: false, hash };
  } catch (error) {
    console.error("Consistency check failed:", error);
    return { isConsistent: false };
  }
}

/**
 * Caches an analysis result to ensure consistency.
 */
export async function cacheAnalysisResult(dataUri: string, bodyPart: string, result: GenerateImageDescriptionOutput) {
  const safePart = safeBodyPart(bodyPart);
  try {
    const hash = calculateHash(dataUri);
    const cacheDir = path.join(process.cwd(), '.cache', 'analysis_results');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const cachePath = path.join(cacheDir, `${hash}_${safePart}.json`);
    fs.writeFileSync(cachePath, JSON.stringify(result));
  } catch (error) {
    console.error("Failed to cache result:", error);
  }
}

export async function runGenerateImageDescription(
  input: GenerateImageDescriptionInput & { userId?: string }
): Promise<GenerateImageDescriptionOutput> {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 2000; // 2s, 4s, 8s backoff

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (input.userId) checkRateLimit(`imgDesc:${input.userId}`);

      // 1. Check for consistency
      const consistency = await checkImageConsistency(input.photoDataUri, input.bodyPart);
      if (consistency.isConsistent && consistency.result) {
        return consistency.result;
      }

      // 2. Run fresh analysis
      const result = await generateImageDescription(input);

      // 3. Cache the result for next time
      if (result.isValid) {
        await cacheAnalysisResult(input.photoDataUri, input.bodyPart, result);
      }

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate');

      if (isRateLimit && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[AI] Rate limited on attempt ${attempt + 1}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.error("CRITICAL ERROR in runGenerateImageDescription:", error);
      if (error instanceof Error) {
        console.error("Error Message:", error.message);
        console.error("Stack Trace:", error.stack);
      }
      // Return a structured error instead of throwing — Next.js production
      // strips thrown error messages, causing the generic "server components render" error.
      let userMessage = 'Analysis temporarily unavailable. Please try again shortly.';
      if (isRateLimit) {
        userMessage = 'AI service is at capacity. Please wait a moment and try again.';
      } else if (msg.includes('API_KEY') || msg.includes('API key') || msg.includes('PERMISSION_DENIED')) {
        userMessage = 'AI service configuration error. Please contact support.';
      } else if (msg.includes('SAFETY') || msg.includes('blocked')) {
        userMessage = 'Image was blocked by safety filters. Please try a different image.';
      } else if (msg.includes('DEADLINE_EXCEEDED') || msg.includes('timeout')) {
        userMessage = 'Analysis timed out. Please try again.';
      }
      return {
        description: `${userMessage} [${msg.substring(0, 120)}]`,
        isValid: false,
        analysisResult: 'INCONCLUSIVE (Server Error)',
        confidenceScore: 0,
        recommendations: 'Please retry the analysis in a few seconds.',
      };
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    description: 'Analysis failed after multiple retries.',
    isValid: false,
    analysisResult: 'INCONCLUSIVE (Server Error)',
    confidenceScore: 0,
    recommendations: 'Please retry the analysis in a few seconds.',
  };
}

/**
 * Saves an image to the local filesystem for future model retraining (in development),
 * or to Firebase Cloud Storage and Firestore (in production).
 */
export async function saveImageForTraining(
  dataUri: string, 
  bodyPart: string, 
  prediction: string,
  userName: string = 'Anonymous'
) {
  const hash = calculateHash(dataUri).substring(0, 12);
  const cleanUserName = userName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-');

  const category = prediction.toLowerCase().includes('anemia') || prediction.toLowerCase().includes('pallor') 
    ? 'potential_anemia' 
    : 'potential_normal';

  const base64Data = dataUri.split(';base64,').pop();
  if (!base64Data) {
    console.error("Invalid Data URI provided to saveImageForTraining.");
    return { success: false, error: "Invalid Data URI." };
  }

  if (process.env.NODE_ENV === 'development') {
    // --- LOCAL DEVELOPMENT SAVE ---
    try {
      const safeBodyPart = path.basename(bodyPart).replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateOnly = date.toISOString().split('T')[0];
      const timeOnly = date.toTimeString().split(' ')[0].replace(/:/g, '-');
      const baseDir = path.join(process.cwd(), 'dataset', 'user_contributions', safeBodyPart);
      const targetDir = path.join(baseDir, category);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Specific naming format: FullName_Hash_Date_Time
      const fileName = `${cleanUserName}_${hash}_${dateOnly}_${timeOnly}.png`;
      const filePath = path.join(targetDir, fileName);
      
      // Deduplication check: if file with same hash exists in this category, don't resave
      const files = fs.readdirSync(targetDir);
      if (files.some(f => f.includes(hash))) {
        console.log(`[DEV] Image with hash ${hash} already exists in ${category}. Not saving.`);
        return { success: true, duplicated: true };
      }

      fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
      console.log(`[DEV] Successfully saved image locally to ${filePath}`);
      return { success: true };
    } catch (error) {
      console.error("[DEV] Failed to save image locally:", error);
      return { success: false, error: (error as Error).message };
    }
  } else {
    // --- PRODUCTION (FIREBASE) SAVE ---
    if (!getAdminApp()) {
        console.error("Firebase not initialized in production. Cannot save image for training.");
        return { success: false, error: "Firebase not initialized." };
    }
    
    try {
      const filePath = `user_contributions/${bodyPart}/${category}/${cleanUserName}_${hash}_${timestamp}.png`;
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Upload to Firebase Cloud Storage
      const storage = getAdminStorage();
      if (!storage) throw new Error("Storage not initialized.");
      const bucket = storage.bucket();
      const file = bucket.file(filePath);
      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000',
        },
      });

      // Create a job in Firestore
      const db = getAdminFirestore();
      if (!db) throw new Error("Firestore not initialized.");
      const trainingJobRef = db.collection('training_jobs').doc(`${hash}_${bodyPart}`);
      
      // Use `set` with `merge: true` to prevent duplicate jobs for the same image
      await trainingJobRef.set({
        storagePath: filePath,
        bodyPart,
        prediction,
        userName,
        createdAt: date,
        status: 'pending', // Status for the training service to update
      }, { merge: true });

      console.log(`[PROD] Successfully uploaded ${filePath} to Cloud Storage and created training job.`);
      return { success: true };
    } catch (error) {
      console.error("[PROD] Failed to save image to Cloud Storage:", error);
      return { success: false, error: (error as Error).message };
    }
  }
}

/**
 * Saves a lab report image to the local filesystem.
 */
export async function saveLabReportForTraining(
  dataUri: string,
  summary: string,
  userName: string = 'Anonymous'
) {
  try {
    const cleanUserName = userName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-').split('T');
    const dateStr = timestamp[0];
    const timeStr = timestamp[1].split('Z')[0];

    const baseDir = path.join(process.cwd(), 'dataset', 'user_contributions', 'lab_reports');
    const category = summary.toLowerCase().includes('anemia') ? 'potential_anemia' : 'potential_normal';
    const targetDir = path.join(baseDir, category);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const base64Data = dataUri.split(';base64,').pop();
    if (!base64Data) return;

    const fileName = `lab_${cleanUserName}_${dateStr}_${timeStr}.png`;
    const filePath = path.join(targetDir, fileName);
    
    fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
    return { success: true };
  } catch (error) {
    console.error("Failed to save lab report locally:", error);
    return { success: false };
  }
}

export async function runProvidePersonalizedRecommendations(
  input: PersonalizedRecommendationsInput
): Promise<PersonalizedRecommendationsOutput> {
  return providePersonalizedRecommendations(input);
}


export async function runAnswerAnemiaQuestion(
  input: AnswerAnemiaQuestionInput & { userId?: string }
): Promise<AnswerAnemiaQuestionOutput> {
  if (input.userId) checkRateLimit(`chat:${input.userId}`);
  return await answerAnemiaQuestion(input);
}

export async function runFindNearbyClinics(
  input: FindNearbyClinicsInput
): Promise<FindNearbyClinicsOutput> {
  return await findNearbyClinics(input);
}

export async function runAnalyzeCbcReport(
  input: AnalyzeCbcReportInput
): Promise<AnalyzeCbcReportOutput> {
  return await analyzeCbcReport(input);
}

export async function runValidateMultimodalResults(
  input: ValidateMultimodalResultsInput
): Promise<ValidateMultimodalResultsOutput> {
  return await validateMultimodalResults(input);
}
