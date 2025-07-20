
'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

type Tab = {
  value: string;
  label: string;
  icon: React.ElementType;
};

type ResponsiveTabsProps = {
  defaultValue: string;
  tabs: Tab[];
  children: React.ReactNode;
};

const ResponsiveTabsComponent = ({ defaultValue, tabs, children }: ResponsiveTabsProps) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const ActiveIcon = tabs.find(tab => tab.value === activeTab)?.icon || React.Fragment;

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      {isMobile ? (
        <Select value={activeTab} onValueChange={handleTabChange}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                <div className="flex items-center gap-2">
                  <ActiveIcon className="h-4 w-4" />
                  {tabs.find(tab => tab.value === activeTab)?.label}
                </div>
              }
            />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                <div className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex justify-center">
            <TabsList>
            {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
                </TabsTrigger>
            ))}
            </TabsList>
        </div>
      )}
      {children}
    </Tabs>
  );
};

// Expose TabsContent as a static property of ResponsiveTabs for composition
ResponsiveTabsComponent.Content = function ResponsiveTabsContent({ value, children }: { value: string, children: React.ReactNode }) {
  return (
    <TabsContent value={value} className="mt-0">
      {children}
    </TabsContent>
  );
}

export const ResponsiveTabs = ResponsiveTabsComponent;
