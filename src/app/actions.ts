'use server';

import {
  generateImageDescription,
  GenerateImageDescriptionInput,
  GenerateImageDescriptionOutput,
} from '@/ai/flows/generate-image-description';
import {
  conductDiagnosticInterview,
  ConductDiagnosticInterviewInput,
  ConductDiagnosticInterviewOutput,
} from '@/ai/flows/conduct-diagnostic-interview';
import {
  providePersonalizedRecommendations,
  PersonalizedRecommendationsInput,
  PersonalizedRecommendationsOutput,
} from '@/ai/flows/provide-personalized-recommendations';
import {
  answerAnemiaQuestion,
  AnswerAnemiaQuestionInput,
  AnswerAnemiaQuestionOutput,
} from '@/ai/flows/answer-anemia-related-questions';
import {
  findNearbyClinics,
  FindNearbyClinicsInput,
  FindNearbyClinicsOutput,
} from '@/ai/flows/find-nearby-clinics';
import { analyzeCbcReport } from '@/ai/flows/analyze-cbc-report';
import type {
  AnalyzeCbcReportInput,
  AnalyzeCbcReportOutput,
} from '@/ai/schemas/cbc-report';


export async function runGenerateImageDescription(
  input: GenerateImageDescriptionInput
): Promise<GenerateImageDescriptionOutput> {
  return await generateImageDescription(input);
}

export async function runConductDiagnosticInterview(
  input: ConductDiagnosticInterviewInput
): Promise<ConductDiagnosticInterviewOutput> {
  return await conductDiagnosticInterview(input);
}

export async function runProvidePersonalizedRecommendations(
  input: PersonalizedRecommendationsInput
): Promise<PersonalizedRecommendationsOutput> {
  return await providePersonalizedRecommendations(input);
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