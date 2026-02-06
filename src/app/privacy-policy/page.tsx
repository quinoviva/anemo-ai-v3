'use client';

import { GlassSurface } from '@/components/ui/glass-surface';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <GlassSurface intensity="medium">
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight text-center">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-zinc max-w-none dark:prose-invert space-y-4">
            <p>
              Welcome to Anemo Check — an AI-powered web application that helps detect possible
              signs of anemia through image and symptom analysis. Your privacy and data protection
              are important to us. This Privacy Policy explains how we collect, use, store, and
              protect your personal information when you use our app and services.
            </p>

            <h2>1. Information We Collect</h2>
            <p>
              We collect only the data necessary to deliver accurate and personalized anemia
              analysis.
            </p>
            <h3>a. Information You Provide</h3>
            <ul className="space-y-2">
              <li>
                <strong>Account Information:</strong> When you sign in using Google via Firebase
                Authentication, we may collect your name, email address, and profile photo.
              </li>
              <li>
                <strong>Uploaded Images:</strong> Images you upload (skin, fingernail, or under-eye
                photos) are securely stored in Firebase Storage for AI analysis.
              </li>
              <li>
                <strong>Health Inputs:</strong> You may provide optional details such as symptoms,
                menstrual data (for female users), or lifestyle information.
              </li>
              <li>
                <strong>Chat Inputs:</strong> Messages sent to the AI chatbot (Gemini) are processed
                to provide relevant responses but are not used for unrelated purposes.
              </li>
            </ul>

            <h3>b. Information Collected Automatically</h3>
            <ul className="space-y-2">
                <li><strong>Device Data:</strong> We may collect your device type, browser version, and operating system for performance optimization.</li>
                <li><strong>Usage Data:</strong> Includes pages visited, features used, timestamps, and actions within the app to improve user experience.</li>
                <li><strong>Location Data (Optional):</strong> If you use the “Search for Doctor” feature, your inputted location helps find nearby clinics or hospitals.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use your data to:</p>
            <ul className="space-y-2">
              <li>Analyze images and provide AI-based anemia insights.</li>
              <li>Generate and store personalized health reports in Firebase Firestore.</li>
              <li>Enable interactive chatbot features and multilingual responses.</li>
              <li>Improve app accuracy, reliability, and user experience.</li>
              <li>Provide local search results (e.g., nearby doctors or hospitals).</li>
              <li>
                Notify users of updates, service improvements, or relevant health tips (if
                enabled).
              </li>
            </ul>
            <p>We do not sell, trade, or rent your personal information to anyone.</p>

            <h2>3. Data Storage and Security</h2>
            <ul className="space-y-2">
              <li>
                Your data is stored securely using Google Firebase services, which comply with
                industry security standards.
              </li>
              <li>Images and reports are encrypted during upload, storage, and retrieval.</li>
              <li>Access to your data is limited to authorized system components and processes.</li>
              <li>
                You may request deletion of your account and all associated data at any time.
              </li>
            </ul>

            <h2>4. Women’s Health Data (For Female Users Only)</h2>
            <ul className="space-y-2">
                <li>If you identify as female, Gemini Women’s Health Mode may request optional menstrual information (e.g., last period date, flow intensity, duration) to improve the accuracy of anemia assessment.</li>
                <li>Providing this information is entirely optional.</li>
                <li>All menstrual data is stored securely and used only for health analysis purposes.</li>
            </ul>

            <h2>5. AI and Data Processing</h2>
            <ul className="space-y-2">
                <li>Anemo Check uses Gemini AI and a custom CNN (Convolutional Neural Network) model to process your images and responses.</li>
                <li>AI-generated outputs are probabilistic and may not always be medically accurate.</li>
                <li>Data processed by Gemini is used only to generate the diagnostic and conversational responses you see in-app.</li>
                <li>No personal data is shared externally or used for training unrelated models.</li>
            </ul>

            <h2>6. Third-Party Services</h2>
            <p>We rely on trusted third-party services to operate safely and efficiently:</p>
            <ul className="space-y-2">
                <li><strong>Firebase Authentication</strong> – for user login and identity management.</li>
                <li><strong>Firebase Storage</strong> – for image upload and secure storage.</li>
                <li><strong>Firebase Firestore</strong> – for storing user reports and history.</li>
                <li><strong>Google Maps API</strong> – for the “Search for Doctor” location feature.</li>
            </ul>
            <p>Each third-party provider follows its own privacy and security practices.</p>


            <h2>7. User Control and Data Rights</h2>
            <p>You have the right to:</p>
            <ul className="space-y-2">
              <li>Access, correct, or delete your personal data.</li>
              <li>
                Withdraw consent for optional data (e.g., menstrual info or chatbot use).
              </li>
              <li>Request deletion of all records associated with your account.</li>
            </ul>
            <p>
              To exercise your rights, contact us via support@anemocheck.app.
            </p>

            <h2>8. Data Retention</h2>
            <p>
              We retain data only as long as needed to provide our services and comply with legal
              obligations. When you delete your account, all stored images, reports, and personal
              information will be permanently removed from our systems.
            </p>

            <h2>9. Children’s Privacy</h2>
            <p>
              Anemo Check is intended for users aged 13 and above. We do not knowingly collect
              personal data from children under 13. If we discover such data, we will delete it
              immediately.
            </p>

            <h2>10. Updates to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect system improvements or
              legal requirements. Significant updates will be announced through the app or email
              notifications.
            </p>
            
            <h2>11. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or how your data is
              handled, contact us at:
              <br />
              📧 support@anemocheck.app
              <br />
              🌐 www.anemocheck.app
            </p>

          </CardContent>
        </GlassSurface>
      </div>
    </div>
  );
}
