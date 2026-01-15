import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { z } from 'zod';
import { ImageAnalysisReport } from '@/ai/schemas/image-analysis-report';
import { CbcAnalysis } from '@/ai/schemas/cbc-report';
import { ai } from '@/ai/genkit';

const ValidationResult = z.object({
  reliabilityScore: z.number().min(0).max(100),
  analysis: z.string(),
  discrepancyAlert: z.boolean(),
});

const ValidationInputSchema = z.object({
  sex: z.string(),
  fatigue: z.string(),
  cardiovascularStrain: z.string(),
  physicalIndicators: z.string(),
  conjunctiva: z.string(),
  fingernails: z.string(),
  skin: z.string(),
  hemoglobin: z.string(),
  rbc: z.string(),
});

const validationPrompt = ai.definePrompt({
    name: 'validationPrompt',
    input: { schema: ValidationInputSchema },
    output: { schema: ValidationResult },
    prompt: `
      **Objective:** Cross-verify visual anemia indicators with clinical lab data to provide a reliability score and analysis.

      **User Profile:**
      - **Sex:** {{{sex}}}
      - **Fatigue Level:** {{{fatigue}}}
      - **Cardiovascular Strain:** {{{cardiovascularStrain}}}
      - **Physical Indicators:** {{{physicalIndicators}}}

      **Visual Analysis (ImageAnalysisReport):**
      - **Conjunctiva:** {{{conjunctiva}}}
      - **Fingernails:** {{{fingernails}}}
      - **Skin:** {{{skin}}}

      **Clinical Data (CBC Report):**
      - **Hemoglobin:** {{{hemoglobin}}}
      - **RBC:** {{{rbc}}}

      **Task:**
      1.  **Analyze Consistency:** Compare the visual indicators with the CBC results and symptomatic context.
      2.  **Calculate Reliability Score:** Generate a score from 0-100 reflecting the alignment between the two data sources. A higher score means stronger correlation.
      3.  **Generate Analysis:** Provide a brief explanation of the findings, highlighting consistencies or discrepancies.
      4.  **Trigger Discrepancy Alert:** If there's a significant mismatch (e.g., visual signs of anemia but normal lab results), set discrepancyAlert to true.

      **Output Format (JSON):
      {
        "reliabilityScore": <number>,
        "analysis": "<string>",
        "discrepancyAlert": <boolean>
      }
    `,
});


export async function POST(req: NextRequest) {
  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)),
    });
  }

  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const firestore = getFirestore();

    const imageAnalysisSnapshot = await firestore
      .collection(`users/${uid}/image_analysis`)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (imageAnalysisSnapshot.empty) {
      return NextResponse.json({ error: 'No image analysis report found for this user.' }, { status: 404 });
    }

    const imageAnalysisReport = ImageAnalysisReport.parse(imageAnalysisSnapshot.docs[0].data());

    const cbcAnalysisSnapshot = await firestore
      .collection(`users/${uid}/cbc_analysis`)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (cbcAnalysisSnapshot.empty) {
      return NextResponse.json({ error: 'No CBC analysis report found for this user.' }, { status: 404 });
    }

    const cbcAnalysis = CbcAnalysis.parse(cbcAnalysisSnapshot.docs[0].data());

    const userDoc = await firestore.doc(`users/${uid}`).get();
    const medicalInfo = userDoc.data()?.medicalInfo || {};

    const input = {
      sex: medicalInfo.sex || 'Not specified',
      fatigue: medicalInfo.fatigue || 'Not specified',
      cardiovascularStrain: medicalInfo.cardiovascularStrain || 'Not specified',
      physicalIndicators: medicalInfo.physicalIndicators || 'Not specified',
      conjunctiva: imageAnalysisReport.conjunctiva,
      fingernails: imageAnalysisReport.fingernails,
      skin: imageAnalysisReport.skin,
      hemoglobin: cbcAnalysis.hemoglobin,
      rbc: cbcAnalysis.rbc,
    };

    const { output } = await validationPrompt(input);

    return NextResponse.json(output);
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json({ error: 'An error occurred during validation.' }, { status: 500 });
  }
}
