
'use client';

import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type TopContributorsProps = {
  contributors?: any[];
};

export default function TopContributors({ contributors = [] }: TopContributorsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" /> Top Contributors
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contributors.length > 0 ? (
          <div className="space-y-4">
            {contributors.map((c) => (
              <a href={c.html_url} key={c.login} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={c.avatar_url} alt={c.login} />
                  <AvatarFallback>{c.login.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold group-hover:text-primary">{c.login}</p>
                  <p className="text-xs text-muted-foreground">{c.contributions} commits</p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Users className="w-8 h-8" />
            <p className="mt-2 text-sm">No contributor data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
