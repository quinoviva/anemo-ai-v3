'use client';

import { SequentialImageAnalyzer } from "@/components/anemo/SequentialImageAnalyzer";
import { useRouter } from "next/navigation";

export default function MultimodalAnalysisPage() {
  const router = useRouter();

  return (
    <div className="relative w-full min-h-screen bg-background">
      {/* 
          We reuse the existing SequentialImageAnalyzer logic but we pass it 
          a custom onClose that navigates back.
          Since SequentialImageAnalyzer is currently a Dialog, we need to 
          ensure it's always 'open' in this page context.
      */}
      <SequentialImageAnalyzer 
        isPage={true}
        onClose={() => router.push('/dashboard/analysis')} 
      />
    </div>
  );
}
