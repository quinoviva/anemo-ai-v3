
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

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Calculates a SHA-256 hash of a data URI or base64 string.
 */
function calculateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Checks if an image has been processed before and returns its cached result.
 */
export async function checkImageConsistency(dataUri: string, bodyPart: string) {
  try {
    const hash = calculateHash(dataUri);
    // For now, we use a simple local filesystem cache to demonstrate consistency.
    // In a production app, this would be a Firestore lookup.
    const cacheDir = path.join(process.cwd(), '.cache', 'analysis_results');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cachePath = path.join(cacheDir, `${hash}_${bodyPart}.json`);
    if (fs.existsSync(cachePath)) {
      console.log(`Cache hit for image consistency: ${hash}`);
      const cachedResult = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      return { 
        isConsistent: true, 
        result: cachedResult as GenerateImageDescriptionOutput 
      };
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
export async function cacheAnalysisResult(dataUri: string, bodyPart: string, result: any) {
  try {
    const hash = calculateHash(dataUri);
    const cacheDir = path.join(process.cwd(), '.cache', 'analysis_results');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const cachePath = path.join(cacheDir, `${hash}_${bodyPart}.json`);
    fs.writeFileSync(cachePath, JSON.stringify(result));
  } catch (error) {
    console.error("Failed to cache result:", error);
  }
}

export async function runGenerateImageDescription(
  input: GenerateImageDescriptionInput
): Promise<GenerateImageDescriptionOutput> {
  try {
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
    console.error("Error in runGenerateImageDescription:", error);
    throw error;
  }
}

/**
 * Saves an image to the local filesystem for future model retraining.
 * Renames file with user's name, hash, and timestamp.
 */
export async function saveImageForTraining(
  dataUri: string, 
  bodyPart: string, 
  prediction: string,
  userName: string = 'Anonymous'
) {
  try {
    const hash = calculateHash(dataUri).substring(0, 12);
    const cleanUserName = userName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-').split('T');
    const dateStr = timestamp[0];
    const timeStr = timestamp[1].split('Z')[0];

    const baseDir = path.join(process.cwd(), 'dataset', 'user_contributions', bodyPart);
    const category = prediction.toLowerCase().includes('anemia') || prediction.toLowerCase().includes('pallor') 
      ? 'potential_anemia' 
      : 'potential_normal';
    
    const targetDir = path.join(baseDir, category);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const base64Data = dataUri.split(';base64,').pop();
    if (!base64Data) return;

    // Specific naming format: FullName_Hash_Date_Time
    const fileName = `${cleanUserName}_${hash}_${dateStr}_${timeStr}.png`;
    const filePath = path.join(targetDir, fileName);
    
    // Deduplication check: if file with same hash exists in this category, don't resave
    const files = fs.readdirSync(targetDir);
    if (files.some(f => f.includes(hash))) {
      console.log(`Image with hash ${hash} already exists in ${category}.`);
      return { success: true, duplicated: true };
    }

    fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
    return { success: true };
  } catch (error) {
    console.error("Failed to save image locally:", error);
    return { success: false };
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
  input: AnswerAnemiaQuestionInput
): Promise<AnswerAnemiaQuestionOutput> {
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
