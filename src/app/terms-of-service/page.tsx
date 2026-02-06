'use client';

import { GlassSurface } from '@/components/ui/glass-surface';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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
            <CardTitle className="text-3xl font-bold tracking-tight text-center">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-zinc max-w-none dark:prose-invert space-y-4">
            <p>
              Welcome to Anemo Check, an AI-powered web application designed to help users detect
              possible signs of anemia through image analysis and health-related insights. By using
              our website, features, or services, you agree to comply with and be bound by the
              following Terms of Service. Please read them carefully before using Anemo Check.
            </p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Anemo Check, you confirm that you have read, understood, and
              agree to these Terms of Service and our Privacy Policy. If you do not agree, you may
              not access or use our services.
            </p>

            <h2>2. Purpose of the Service</h2>
            <p>
              Anemo Check is intended for informational and educational purposes only. The
              AI-generated results, insights, and reports are not a substitute for professional
              medical diagnosis, advice, or treatment. Always consult a qualified healthcare
              provider regarding any medical condition or concern.
            </p>

            <h2>3. User Accounts and Authentication</h2>
            <p>
              You may use Anemo Check as a guest or sign in through Google via Firebase
              Authentication.
            </p>
            <ul className="space-y-2">
              <li>
                You are responsible for maintaining the confidentiality of your account and ensuring
                that your login credentials are secure.
              </li>
              <li>
                You agree to provide accurate information when creating or managing your account.
              </li>
            </ul>

            <h2>4. Use of the Service</h2>
            <p>By using Anemo Check, you agree:</p>
            <ul className="space-y-2">
              <li>
                Not to misuse the platform or attempt unauthorized access to systems, data, or
                servers.
              </li>
              <li>Not to upload inappropriate, harmful, or misleading content.</li>
              <li>To use the app only for personal, lawful, and non-commercial purposes.</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate access for users who violate these terms.
            </p>

            <h2>5. Image and Data Usage</h2>
            <ul className="space-y-2">
              <li>
                Uploaded images are processed securely through Firebase Storage and analyzed by
                Gemini AI solely for anemia detection and related features.
              </li>
              <li>
                Your data may be temporarily stored for report generation, accuracy improvement,
                and troubleshooting but will not be shared with third parties without your
                consent.
              </li>
              <li>
                You can delete your account and associated data at any time by contacting our
                support team.
              </li>
            </ul>

            <h2>6. AI Limitations and Disclaimer</h2>
            <ul className="space-y-2">
              <li>
                While Anemo Check uses advanced AI models to detect possible signs of anemia, it
                may produce inaccurate or incomplete results.
              </li>
              <li>
                The AI’s conclusions are probabilistic and may not reflect your actual health
                condition.
              </li>
              <li>Anemo Check does not provide medical treatment or professional diagnosis.</li>
              <li>
                Use the results as guidance only and consult a medical professional for further
                evaluation.
              </li>
            </ul>

            <h2>7. Women’s Health Mode and Personal Data</h2>
            <ul className="space-y-2">
              <li>
                If you identify as female, the system may activate Gemini Women’s Health Mode,
                which includes menstrual data processing to refine anemia risk insights.
              </li>
              <li>You may choose to provide menstrual details voluntarily.</li>
              <li>
                All sensitive data is handled with privacy and security in mind and will not be
                shared externally.
              </li>
            </ul>

            <h2>8. Limitation of Liability</h2>
            <p>Anemo Check, its developers, and partners are not responsible for:</p>
            <ul className="space-y-2">
              <li>
                Any harm, loss, or damage resulting from reliance on AI-generated results.
              </li>
              <li>
                Service interruptions, data loss, or unauthorized access caused by third-party
                systems.
              </li>
              <li>Use of the app is at your own risk.</li>
            </ul>

            <h2>9. Updates and Modifications</h2>
            <p>
              We may update or modify these Terms of Service at any time. Continued use of Anemo
              Check after changes indicates your acceptance of the updated terms.
            </p>

            <h2>10. Contact Information</h2>
            <p>
              If you have questions or concerns about these Terms, please contact us at:
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
