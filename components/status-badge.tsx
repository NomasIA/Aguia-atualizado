/**
 * Status Badge Component
 *
 * Displays a colored badge based on status
 */

import { Badge } from '@/components/ui/badge';
import { getStatusColor } from '@/lib/format-utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colorClass = getStatusColor(status);

  return (
    <Badge className={`${colorClass} ${className}`} variant="outline">
      {status}
    </Badge>
  );
}
