'use client';

import { useState } from 'react';
import { runFindNearbyClinics } from '@/app/actions';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Search, Stethoscope, Hospital, HeartPulse, Loader2 } from 'lucide-react';

type Clinic = {
  name: string;
  type: 'Hospital' | 'Doctor' | 'Clinic';
  address: string;
};

const iconMap = {
    Hospital: <Hospital className="h-5 w-5 text-primary" />,
    Doctor: <Stethoscope className="h-5 w-5 text-primary" />,
    Clinic: <HeartPulse className="h-5 w-5 text-primary" />,
}

export default function FindDoctorPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Clinic[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await runFindNearbyClinics({ query: searchQuery });
      setResults(response.results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({
        title: 'Search Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Find a Doctor</h1>
        <p className="text-muted-foreground">
          Use our AI to search for doctors, clinics, and hospitals in Iloilo City.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Search Healthcare Providers</CardTitle>
          <CardDescription>
            Enter a location, address, or landmark to find the nearest facility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex w-full items-center space-x-2 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="e.g., hospital near Jaro Cathedral"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSearching}
              />
            </div>
            <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
              {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Search
            </Button>
          </form>

          <div className="space-y-4">
            {isSearching ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Our AI is searching for you...</p>
              </div>
            ) : hasSearched ? (
              results.length > 0 ? (
                results.map((clinic, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-secondary">
                          {iconMap[clinic.type]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{clinic.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {clinic.address}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    No results found for "{searchQuery}". Try a different search.
                  </p>
                </div>
              )
            ) : (
                 <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    Enter a search query to find nearby healthcare providers.
                  </p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
