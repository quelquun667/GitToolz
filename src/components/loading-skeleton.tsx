
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, Cpu, LineChart } from 'lucide-react';

const FeatureListSkeleton = ({ title, icon: TitleIcon, count }: { title: string, icon: React.ElementType, count: number }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <TitleIcon className="h-5 w-5 text-muted-foreground" />
            <Skeleton className="h-6 w-1/3" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-start gap-3">
            <Skeleton className="h-5 w-5 rounded-full mt-1 flex-shrink-0" />
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
);

export default function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-background text-foreground p-4 flex flex-col items-center justify-center animate-pulse">
        <header className="w-full max-w-7xl mx-auto">
            <div className="flex items-center justify-center relative mb-8 text-center">
                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                    <Skeleton className="h-10 w-10 rounded-md" />
                </div>
                <div className="flex items-center gap-3">
                    <GitBranch className="h-8 w-8 text-muted-foreground" />
                    <h1 className="text-3xl font-bold text-muted-foreground">GitToolz</h1>
                </div>
            </div>
        </header>
        <div className="w-full flex-grow flex justify-center items-center">
            <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-5/6" />
                    </div>
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Skeleton className="h-10 flex-grow" />
                                    <Skeleton className="h-10 w-28" />
                                </div>
                            </div>
                             <Skeleton className="h-20 w-full" />
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-8">
                   <FeatureListSkeleton title="AI Assistants" icon={Cpu} count={4} />
                   <FeatureListSkeleton title="Analysis & Visualization" icon={LineChart} count={4} />
                </div>
            </div>
        </div>
         <footer className="w-full max-w-7xl mx-auto pt-8 mt-auto text-center">
             <div className="flex flex-wrap justify-center items-center gap-4">
                 <Skeleton className="h-8 w-28" />
                 <Skeleton className="h-8 w-28" />
                 <Skeleton className="h-8 w-28" />
             </div>
              <Skeleton className="h-4 w-32 mt-4 mx-auto" />
        </footer>
    </main>
  );
}
