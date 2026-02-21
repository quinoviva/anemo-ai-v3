
import { config } from 'dotenv';
config();

import { providePersonalizedRecommendations } from '../src/ai/flows/provide-personalized-recommendations';

async function testAI() {
  console.log('Testing AI Recommendations Flow...');
  try {
    const result = await providePersonalizedRecommendations({
      imageAnalysis: 'Mild pallor detected in conjunctiva. Skin creases appear normal.',
      labReport: 'Hemoglobin: 11.5 g/dL (Slightly Low), RBC: 4.2 million/mcL',
      userProfile: 'Name: Test User, Sex: Female, Age: 28, Symptoms: Fatigue',
    });
    console.log('AI Flow Result:', JSON.stringify(result, null, 2));
    if (result.riskScore > 0) {
      console.log('✅ AI Analysis is working!');
    } else {
      console.log('⚠️ AI returned unexpected result.');
    }
  } catch (error) {
    console.error('❌ AI Analysis failed:', error);
  }
}

testAI();
