import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";

export default function LiveAnalysisPage() {
  return (
    <div className="space-y-8 flex flex-col items-center justify-center text-center h-full">
        <Video className="w-24 h-24 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Live Camera Analysis</h1>
        <p className="text-muted-foreground max-w-md">
            This feature is coming soon. You'll be able to analyze your skin, under-eye, or fingernails in real-time using your device's camera.
        </p>
    </div>
  );
}
