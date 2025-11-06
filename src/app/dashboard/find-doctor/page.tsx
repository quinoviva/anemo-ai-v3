import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Stethoscope } from "lucide-react";

export default function FindDoctorPage() {
  return (
    <div className="space-y-8 flex flex-col items-center justify-center text-center h-full">
        <Stethoscope className="w-24 h-24 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Find a Doctor</h1>
        <p className="text-muted-foreground max-w-md">
            This feature is coming soon. It will allow you to find and connect with healthcare professionals near you based on your analysis results.
        </p>
    </div>
  );
}
