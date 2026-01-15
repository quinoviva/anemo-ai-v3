
export async function runLocalClinicalScreening(symptoms: string) {
  if (typeof window === 'undefined' || !('ai' in window)) {
    console.warn('Gemini Nano is not available in this browser.');
    return null;
  }
  try {
    // @ts-ignore
    const session = await window.ai.assistant.create();
    // @ts-ignore
    const result = await session.prompt(`You are a clinical assistant. Assess these anemia symptoms: ${symptoms}. Keep it very short and concise.`);
    return result;
  } catch (error) {
    console.error('Local AI failed:', error);
    return null;
  }
}
