import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface ActivityEvent {
  id: string;
  type: 'created' | 'uploaded' | 'verified' | 'generated';
  description: string;
  timestamp: string;
  user: string;
}

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

const getEventColor = (type: ActivityEvent['type']) => {
  switch (type) {
    case 'created':
      return 'bg-blue-500';
    case 'uploaded':
      return 'bg-green-500';
    case 'verified':
      return 'bg-yellow-500';
    case 'generated':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${getEventColor(event.type)}`} />
                {index < events.length - 1 && (
                  <div className="w-px h-8 bg-border mt-2" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {event.type}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {event.timestamp}
                  </span>
                </div>
                <p className="text-sm font-medium mb-1">{event.description}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{event.user}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
