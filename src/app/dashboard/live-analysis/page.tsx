'use client';

import { useState } from 'react';
import { LiveCameraAnalyzer } from '@/components/anemo/LiveCameraAnalyzer';
import { ImageAnalyzer } from '@/components/anemo/ImageAnalyzer';

export default function LiveAnalysisPage() {
  const [capturedImage, setCapturedImage] = useState<{ file: File; dataUri: string } | null>(null);

  const handleCapture = (file: File, dataUri: string) => {
    setCapturedImage({ file, dataUri });
  };

  const handleReset = () => {
    setCapturedImage(null);
  };

  if (capturedImage) {
    // If an image is captured, we re-use the existing ImageAnalyzer component
    // We pass the captured image data and a function to reset the state
    return (
      <div className="space-y-6">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Captured Image</h2>
              <button onClick={handleReset} className="text-primary hover:underline">Retake</button>
          </div>
          <ImageAnalyzer initialCapture={capturedImage} />
      </div>
    );
  }

  // Otherwise, show the live camera view
  return <LiveCameraAnalyzer onCapture={handleCapture} />;
}
