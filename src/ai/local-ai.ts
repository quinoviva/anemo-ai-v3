
export async function runLocalClinicalScreening(symptoms: string) {
  if (typeof window === 'undefined' || !('ai' in window)) {
    console.warn('Gemini Nano is not available in this browser.');
    return null;
  }
  try {
    // @ts-ignore
    if (!window.ai.languageModel) {
      console.warn('Gemini Nano languageModel API not found.');
      return null;
    }
    // @ts-ignore
    const capabilities = await window.ai.languageModel.capabilities();
    if (capabilities.available === 'no') {
      console.warn('Gemini Nano is not available.');
      return null;
    }
    // @ts-ignore
    const session = await window.ai.languageModel.create();
    // @ts-ignore
    const result = await session.prompt(`You are a clinical assistant. Assess these anemia symptoms: ${symptoms}. Keep it very short and concise.`);
    return result;
  } catch (error) {
    console.error('Local AI failed:', error);
    return null;
  }
}

/**
 * Uses Gemini Nano (Local AI) to analyze CBC text extracted via OCR.
 * This is a fallback for when the cloud API quota is reached.
 */
export async function runLocalCbcAnalysis(extractedText: string) {
  if (typeof window === 'undefined' || !('ai' in window)) {
    return { error: 'Gemini Nano not supported' };
  }

  try {
    // @ts-ignore
    const capabilities = await window.ai.languageModel.capabilities();
    if (capabilities.available === 'no') return { error: 'Gemini Nano not enabled' };

    // @ts-ignore
    const session = await window.ai.languageModel.create({
      systemPrompt: `You are an expert medical AI. Analyze the following CBC report text. 
      Extract Hemoglobin, Hematocrit, and RBC count. 
      Determine if the patient has signs of anemia.
      Respond ONLY with a JSON object containing:
      { "summary": "...", "parameters": [{"parameter": "...", "value": "...", "unit": "...", "range": "...", "isNormal": true/false}] }`
    });

    const result = await session.prompt(`Analyze this CBC text: ${extractedText}`);
    
    // Attempt to parse JSON from the local AI response
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      return { summary: result, parameters: [] };
    }
    
    return { summary: result, parameters: [] };
  } catch (error) {
    console.error('Local CBC Analysis failed:', error);
    return { error: 'Local analysis failed' };
  }
}
