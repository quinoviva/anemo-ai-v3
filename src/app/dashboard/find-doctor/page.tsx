'use client';

import { useState } from 'react';
import { runFindNearbyClinics } from '@/app/actions';
import {
  Card,
  CardHeader,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Stethoscope, Hospital, HeartPulse, Loader2, Phone, Clock, Globe, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Clinic = {
  name: string;
  type: 'Hospital' | 'Doctor' | 'Clinic';
  address: string;
  contact?: string;
  hours?: string;
  website?: string;
  notes?: string;
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
    if (!searchQuery.trim()) {
      toast({
        title: "Search query is empty",
        description: "Please enter a location to search.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await runFindNearbyClinics({ query: searchQuery });
      setResults(response.results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({
        title: "Search Error",
        description: `Could not fetch results. ${errorMessage}`,
        variant: "destructive",
      });
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nearby Healthcare Providers</h1>
        <p className="text-muted-foreground">
          Search for nearby hospitals, clinics, and doctors in Iloilo.
        </p>
      </div>

      <Card>
        <CardHeader>
           <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                type="text"
                placeholder="Enter a location, e.g., 'Pototan' or 'hospitals in Jaro'"
                className="pl-10 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Button type="submit" disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Search</span>
            </Button>
           </form>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isSearching ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">AI is searching...</p>
              </div>
            ) : hasSearched && results.length > 0 ? (
                results.map((clinic, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-4">
                       <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-secondary">
                          {iconMap[clinic.type]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{clinic.name}</p>
                        <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-1">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0"/> <span>{clinic.address}</span>
                        </p>
                        
                        <div className="mt-3 space-y-2 text-sm">
                           {clinic.contact && clinic.contact !== 'N/A' && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4 shrink-0" /> <span className="font-medium">{clinic.contact}</span>
                            </div>
                           )}
                           {clinic.hours && (
                             <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4 shrink-0" /> <span className="font-medium">{clinic.hours}</span>
                            </div>
                           )}
                           {clinic.website && clinic.website !== 'N/A' && (
                             <div className="flex items-center gap-2 text-muted-foreground">
                              <Globe className="h-4 w-4 shrink-0" />
                              <a href={clinic.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium break-all">
                                {clinic.website}
                              </a>
                            </div>
                           )}
                           {clinic.notes && (
                             <p className='text-xs text-muted-foreground pt-1 italic'>{clinic.notes}</p>
                           )}
                        </div>

                        <div className='mt-4 flex gap-2 flex-wrap'>
                           <Button variant="outline" size="sm" asChild>
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.name + ', ' + clinic.address)}`} target="_blank" rel="noopener noreferrer">
                                <MapPin />
                                View on Map
                              </a>
                           </Button>
                           {clinic.website && clinic.website !== 'N/A' && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={clinic.website} target="_blank" rel="noopener noreferrer">
                                  <Globe />
                                  Visit Website
                                </a>
                            </Button>
                           )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
            ) : hasSearched ? (
                 <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    No results found for "{searchQuery}". Please try another location or name.
                  </p>
                </div>
            ) : (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">
                        Enter a location to find nearby healthcare providers.
                    </p>
                </div>
            )
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
