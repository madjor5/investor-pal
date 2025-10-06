import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

interface MetricCardProps {
  title: string;
  icon: LucideIcon;
  metrics: any;
  variant?: "performance" | "risk";
}

const MetricCard = ({title, icon: Icon, metrics, variant="performance" }: MetricCardProps) => {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className={`p-2 rounded-lg ${variant === "performance" ? "bg-primary/10" : "bg-destructive/10"}`}>
            <Icon className={`h-4 w-4 ${variant === "performance" ? "text-primary" : "text-destructive"}`} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((metric: any, index: number) => {
          const MetricIcon = metric.icon;

          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  metric.changeType === "positive" ? "bg-success/10" :
                  metric.changeType === "negative" ? "bg-destructive/10" :
                  "bg-muted"
                }`}>
                  <MetricIcon className={`h-4 w-4 ${
                    metric.changeType === "positive" ? "text-success" :
                    metric.changeType === "negative" ? "text-destructive" :
                    "text-muted-foreground"
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{metric.label} {metric.change}</p>
                  <p className="text-sm text-muted-foreground">{metric.subtitle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground">{metric.value}</p>
                {metric.change && (
                  <p className={`text-sm ${
                    metric.changeType === "positive" ? "text-success" :
                    metric.changeType === "negative" ? "text-destructive" :
                    "text-muted-foreground"
                  }`}>
                    {metric.change}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default MetricCard;