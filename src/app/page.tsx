'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCode2, History } from 'lucide-react';
import DocumentationGenerator from '@/components/documentation-generator';
import ChangelogGenerator from '@/components/changelog-generator';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <header className="flex items-center justify-center gap-3 mb-4">
        <FileCode2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">GitTools</h1>
      </header>
      <Tabs defaultValue="documentation" className="w-full max-w-7xl mx-auto">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="documentation">
              <FileCode2 className="mr-2 h-4 w-4" />
              Documentation
            </TabsTrigger>
            <TabsTrigger value="changelog">
              <History className="mr-2 h-4 w-4" />
              Changelog
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="documentation">
          <Card>
            <CardContent className="p-0">
              <DocumentationGenerator />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="changelog">
           <Card>
            <CardContent className="p-0">
              <ChangelogGenerator />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
