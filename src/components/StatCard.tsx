import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReactNode } from 'react';

export function StatCard({
  title,
  value,
  icon,
  change,
}: {
  title: string;
  value: string;
  icon?: ReactNode;
  change?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change ? <p className="text-xs text-muted-foreground mt-1">{change}</p> : null}
      </CardContent>
    </Card>
  );
}
