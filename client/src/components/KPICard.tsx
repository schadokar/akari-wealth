import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/formatINR";

type KPICardProps = {
  title: string;
  value: number;
  trend: string;
  trendUp: boolean;
};

export function KPICard({ title, value, trend, trendUp }: KPICardProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{formatINR(value)}</CardTitle>
        <Badge variant={trendUp ? "default" : "secondary"} className="w-fit">
          {trendUp ? "↑" : "↓"} {trend}
        </Badge>
      </CardHeader>
    </Card>
  );
}
