export default function HowToUsePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-4">How to Use Anemo Check</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Welcome to Anemo Check! This guide will help you understand how to best utilize our platform for your health monitoring needs.
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">1. Getting Started: Account Setup</h2>
        <p className="mb-2">
          If you are a new user, please <a href="/signup" className="text-primary hover:underline">Sign Up</a> to create your account.
          Returning users can <a href="/login" className="text-primary hover:underline">Log In</a> with their credentials.
        </p>
        <p>
          After logging in for the first time, you'll be prompted to complete your health profile. Providing accurate information will enable more personalized insights.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">2. Performing an Anemo Check Analysis</h2>
        <p className="mb-2">
          Anemo Check utilizes image analysis for early anemia detection.
        </p>
        <ol className="list-decimal list-inside pl-4 space-y-2">
          <li>Navigate to the <a href="/dashboard/analysis" className="text-primary hover:underline">New Scan</a> section from your dashboard.</li>
          <li>Follow the on-screen instructions to capture or upload an image for analysis. Ensure good lighting for best results.</li>
          <li>Our AI will process the image and provide a risk assessment along with recommendations.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">3. Exploring Your Health Data</h2>
        <p className="mb-2">
          Your dashboard provides an overview of your health and quick access to various features:
        </p>
        <ul className="list-disc list-inside pl-4 space-y-2">
          <li><strong>Latest Analysis:</strong> View your most recent anemia risk score and recommendations.</li>
          <li><strong>Health History:</strong> Track your past analyses and lab reports in the <a href="/dashboard/history" className="text-primary hover:underline">History</a> section.</li>
          <li><strong>AI Chat:</strong> Ask our AI assistant any health-related questions in the <a href="/dashboard/chatbot" className="text-primary hover:underline">AI Chat</a>.</li>
          <li><strong>Period Tracker:</strong> For female users, log your menstrual cycles and view correlations with your health data.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">4. Finding Healthcare Providers</h2>
        <p className="mb-2">
          If you need to consult a doctor, use our <a href="/dashboard/find-doctor" className="text-primary hover:underline">Find Doctor</a> feature to locate nearby healthcare professionals and clinics.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">5. Important Disclaimer</h2>
        <p className="text-red-500 font-medium">
          Anemo Check is a health-assistive tool, not a medical diagnostic service. Always consult a qualified healthcare provider for professional diagnosis and treatment.
        </p>
      </section>

      <p className="text-muted-foreground text-sm mt-8">
        We hope Anemo Check helps you on your health journey!
      </p>
    </div>
  );
}
