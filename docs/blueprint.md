# **App Name**: AnemoCheck AI

## Core Features:

- Image Analysis with Gemini AI: Upload and analyze images of skin, under-eye, or fingernails. Gemini AI identifies the image content, and decides whether it is a valid input for the anemia detection module. The AI tool generates a description of the image and highlights relevant areas with a heatmap.
- CNN-Based Anemia Detection: Utilize a Convolutional Neural Network to analyze images for signs of anemia, providing an assessment and risk level.
- **AnemoCheck Multimodal Validation Engine and Clinical Diagnostic Interview**: An integrated verification system that correlates visual anemia indicators from the `LiveCameraAnalyzer` with clinical lab data (`AnalyzeCbcReportOutput`) to provide a more accurate and reliable outcome. A pre-upload screening flow acts as a virtual doctor, asking clinical questions regarding fatigue, cardiovascular strain, and physical indicators—storing these responses in the `medicalInfo` object within the Firestore user document. A specialized Genkit flow, `validate-multimodal-results.ts`, performs a cross-verification check, and the `AnalysisReportViewer.tsx` displays a "Reliability Score" and a high-priority `Alert` with a `ShieldAlert` icon if discrepancies are detected. The interface is conditionally rendered based on the user's `medicalInfo.sex` and `isAnonymous` status to ensure medical data privacy and precise, personalized health analysis.
- Interactive Diagnostic Interview: Conduct an AI-driven diagnostic interview via Gemini, personalized based on user responses, to gather additional context about the user's condition.
- Personalized Recommendations: Gemini provides tailored advice based on image analysis, interview responses, and user profile data. Women's Health Diagnostic Mode allows menstrual-related risk evaluation, offering tailored insights based on syncing with period tracker.
- Live Camera Analysis: Analyze live video feeds directly through the device camera, with real-time feedback and analysis.
- AI Chatbot Support: Provide 24/7 support via a Gemini AI chatbot, answering anemia-related questions in multiple Filipino languages and English.
- Secure Medical Report Storage: Store detailed medical reports securely in Firestore, including image results, Gemini explanations, heatmap visualizations, and AI recommendations, allowing users to access their history.

## Style Guidelines:

- Primary color: Light blue (#B0E2FF) to evoke a sense of calmness and health.
- Background color: Very light blue (#E6F7FF) to complement the primary color without overwhelming it.
- Accent color: Soft green (#C2FFB0) to highlight positive indicators and interactive elements.
- Body and headline font: 'Space Grotesk' for a modern, tech-forward, and readable feel.
- Use clean, minimalist icons to represent health indicators and app features.
- Employ a clean, responsive layout optimized for mobile and desktop use, ensuring accessibility and ease of navigation.
- Incorporate subtle animations for user feedback and transitions to enhance the user experience.