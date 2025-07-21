
'use client';

import { Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

type RecentActivityFeedProps = {
  activity?: any[];
};

const renderEvent = (event: any) => {
  switch (event.type) {
    case 'PushEvent':
      return `pushed ${event.payload.commits?.length || 0} commit(s)`;
    case 'PullRequestEvent':
      return `${event.payload.action} pull request #${event.payload.pull_request.number}`;
    case 'IssuesEvent':
      return `${event.payload.action} issue #${event.payload.issue.number}`;
    case 'CreateEvent':
      return `created ${event.payload.ref_type} ${event.payload.ref || ''}`;
    case 'DeleteEvent':
      return `deleted ${event.payload.ref_type} ${event.payload.ref}`;
    default:
      return event.type.replace('Event', ' event');
  }
};

export default function RecentActivityFeed({ activity = [] }: RecentActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" /> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length > 0 ? (
          <ScrollArea className="h-80">
            <div className="space-y-4">
              {activity.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={event.actor.avatar_url} alt={event.actor.display_login} />
                    <AvatarFallback>{event.actor.display_login.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold">{event.actor.display_login}</span> {renderEvent(event)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Activity className="w-8 h-8" />
            <p className="mt-2 text-sm">No recent activity found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
