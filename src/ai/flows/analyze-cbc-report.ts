'use server';

import { ai, geminiActiveModel as gemini15Flash } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeCbcReportInputSchema = z.object({
  photoDataUri: z.string(),
});

const AnalyzeCbcReportOutputSchema = z.object({
  summary: z.string(),
  parameters: z.array(
    z.object({
      parameter: z.string(),
      value: z.string(),
      unit: z.string(),
      range: z.string(),
      isNormal: z.boolean(),
    })
  ),
});

export type AnalyzeCbcReportInput = z.infer<typeof AnalyzeCbcReportInputSchema>;
export type AnalyzeCbcReportOutput = z.infer<typeof AnalyzeCbcReportOutputSchema>;

/**
 * Analyze CBC report
 * Supports multiple image formats and PDFs
 * Generates summary including anemia status
 */
export const analyzeCbcReport = ai.defineFlow(
  {
    name: 'analyzeCbcReport',
    inputSchema: AnalyzeCbcReportInputSchema,
    outputSchema: AnalyzeCbcReportOutputSchema,
  },
  async (input: AnalyzeCbcReportInput) => {
    const validatedInput = AnalyzeCbcReportInputSchema.parse(input);

    let contentType = 'image/jpeg'; // default
    const uri = validatedInput.photoDataUri.toLowerCase();

    if (uri.startsWith('data:')) {
      const match = uri.match(/^data:(image\/[a-z+]+|application\/pdf);/);
      if (match) contentType = match[1];
    } else if (uri.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (uri.endsWith('.png')) {
      contentType = 'image/png';
    } else if (uri.endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (uri.endsWith('.bmp')) {
      contentType = 'image/bmp';
    } else if (uri.endsWith('.webp')) {
      contentType = 'image/webp';
    }

    try {
        const {output} = await ai.generate({
          model: gemini15Flash,
          config: {
            temperature: 0.0,
          },
      prompt: [
        {
          text: `
You are the Anemo AI CBC Report Intelligence Engine — an expert-level medical AI that performs precision OCR extraction and clinical interpretation of Complete Blood Count (CBC) laboratory reports.

═══════════════════════════════════════════════════════════════
PHASE 1: IMAGE VALIDATION (strict)
═══════════════════════════════════════════════════════════════

FIRST, determine if this image is a valid CBC lab report:

✅ VALID: Printed or handwritten lab report showing blood test results with parameter names, values, units, and reference ranges. May be from any Philippine hospital or clinic. May be slightly tilted, partially cropped, or imperfectly lit.

❌ INVALID — respond with specific rejection:
- NOT a lab report at all → summary: "The uploaded image does not appear to be a CBC laboratory report. Please upload a photo of your printed CBC/blood test results."
- Image is too blurry, too dark, too small to read → summary: "The CBC report image is too unclear to read accurately. Please retake the photo with better lighting, closer distance, and ensure the text is sharp."
- Only a partial report visible (less than 3 parameters readable) → summary: "Only a partial CBC report is visible. Please upload a complete, unobstructed photo of the full report."
- A prescription, doctor's note, or non-CBC medical document → summary: "This appears to be a medical document but not a CBC blood test report. Please upload the specific CBC/Complete Blood Count results page."

For any invalid image, set parameters: []

═══════════════════════════════════════════════════════════════
PHASE 2: PRECISION OCR EXTRACTION (if valid)
═══════════════════════════════════════════════════════════════

Extract ONLY these parameters if present on the report. For each, provide the EXACT value and unit as printed. Do NOT infer or estimate values.

**Primary Anemia Markers (HIGHEST PRIORITY):**
• Hemoglobin (HGB / Hb / Hgb) — the single most important anemia indicator
• Hematocrit (HCT / Hct / PCV)
• Red Blood Cell Count (RBC)

**Red Cell Indices (for anemia typing):**
• Mean Corpuscular Volume (MCV) — key for classifying microcytic vs macrocytic
• Mean Corpuscular Hemoglobin (MCH) — average hemoglobin per red cell
• Mean Corpuscular Hemoglobin Concentration (MCHC) — hemoglobin concentration per cell
• Red Cell Distribution Width (RDW / RDW-CV) — elevated in iron deficiency

**Additional Markers (if visible):**
• Platelet Count (PLT) — elevated platelets can indicate chronic iron deficiency
• White Blood Cell Count (WBC) — for general health context
• Reticulocyte Count — if available, indicates bone marrow response

For each parameter:
  - parameter: The standardized name (e.g., "Hemoglobin", "MCV")
  - value: The EXACT numeric value as printed (e.g., "10.2", "82.5")
  - unit: The EXACT unit as printed (e.g., "g/dL", "fL", "x10^12/L")
  - range: The reference range as printed on the report (e.g., "12.0-16.0", "80-100"). If no range is printed, use standard WHO ranges for Filipino adults.
  - isNormal: true if the value falls within the reference range, false if outside

═══════════════════════════════════════════════════════════════
PHASE 3: CLINICAL INTERPRETATION SUMMARY
═══════════════════════════════════════════════════════════════

Generate a precise clinical summary following this format:

**If anemia detected (Hgb below normal range):**
"ANEMIA POSITIVE: Hemoglobin is [value] g/dL (below the normal range of [range] g/dL), indicating [severity: mild/moderate/severe] anemia. [If MCV available: MCV of [value] fL suggests [microcytic/normocytic/macrocytic] anemia, most consistent with [likely type].] [If RDW elevated: Elevated RDW ([value]%) suggests [interpretation].] [Mention any other abnormal values briefly.] Recommend clinical consultation for iron studies and treatment plan."

**If borderline (Hgb at lower end of normal):**
"BORDERLINE: Hemoglobin is [value] g/dL, at the lower boundary of normal ([range]). While technically within range, this may indicate early-stage iron depletion, especially in the context of symptoms. Monitor closely with repeat CBC in 4-6 weeks."

**If normal:**
"ANEMIA NEGATIVE: All primary hemoglobin markers are within normal range. Hemoglobin is [value] g/dL (normal: [range]). [Mention any other findings.] No immediate clinical intervention for anemia is indicated."

**Severity classification in summary (WHO standards for Filipino adult females):**
- Hgb ≥ 12.0 g/dL: Normal
- Hgb 11.0-11.9 g/dL: Borderline / watch
- Hgb 10.0-10.9 g/dL: Mild anemia
- Hgb 7.0-9.9 g/dL: Moderate anemia
- Hgb < 7.0 g/dL: Severe anemia

CRITICAL RULES:
1. Do NOT guess missing values — only extract what is clearly visible
2. Do NOT fabricate reference ranges — use what's printed or WHO defaults
3. Include ALL visible parameters from the priority list above
4. Output MUST strictly match the schema
5. If you cannot read a specific value with >90% confidence, skip it rather than guess
          `.trim(),
        },
        {
          media: {
            url: validatedInput.photoDataUri,
            contentType: contentType,
          },
        },
      ],
      output: { schema: AnalyzeCbcReportOutputSchema },
    });

    return {
      summary:
        output?.summary ??
        'An unexpected error occurred while analyzing the CBC report.',
      parameters: output?.parameters ?? [],
    };
    } catch (err: any) {
        console.warn("⚠️ [Silent Fallback] CBC Analysis Gemini API Failed. Routing to Groq Llama 3.2 Vision...", err.message);
        
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
            throw new Error("Gemini quota exceeded and GROQ_API_KEY is not defined in your environment variables for fallback!");
        }

        const fallbackPrompt = `Extract CBC parameters from this lab report. Return ONLY a valid JSON object matching this schema:
{
  "summary": "Clinical interpretation string following Anemo AI standards",
  "parameters": [
    { "parameter": "Hemoglobin", "value": "10.2", "unit": "g/dL", "range": "12.0-16.0", "isNormal": false }
  ]
}

Classification Criteria:
- Hgb ≥ 12.0 g/dL: Normal
- Hgb 11.0-11.9 g/dL: Borderline
- Hgb < 11.0 g/dL: Anemia

If the image is not a report, return an empty parameters array and an error message in summary. Respond ONLY with JSON.`;

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.2-11b-vision-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: fallbackPrompt },
                            { type: "image_url", image_url: { url: validatedInput.photoDataUri } }
                        ]
                    }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Groq CBC fallback error:", errText);
            throw new Error(`Both Gemini and Groq fallback failed for CBC analysis. Groq error: ${errText}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(content);
        
        return parsed as AnalyzeCbcReportOutput;
    }
  }
);
