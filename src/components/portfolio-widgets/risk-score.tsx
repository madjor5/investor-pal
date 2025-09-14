import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const RiskScore = () => {
  return (
    <Card className="bg-gradient-to-br from-card to-card/80 shadow-card border-border/50 gap-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Risk Score</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold text-foreground">7.2</div>
        <Badge variant="secondary" className="text-xs">Moderate</Badge>
      </CardContent>
    </Card>
  )
}