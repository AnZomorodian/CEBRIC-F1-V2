import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { F1SessionResponse } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

interface RaceInsightsProps {
  sessionData: F1SessionResponse | null;
  filters: { year: string; gp: string; session: string; drivers: string[] };
}

export default function RaceInsights({ sessionData, filters }: RaceInsightsProps) {
  const [insightsData, setInsightsData] = useState<any>(null);
  const { toast } = useToast();

  const loadInsightsMutation = useMutation({
    mutationFn: async (params: { year: number; gp: string; session: string }) => {
      const response = await apiRequest("POST", "/api/f1/race-insights", params);
      return response.json();
    },
    onSuccess: (data) => {
      setInsightsData(data);
      toast({
        title: "Race Insights Loaded",
        description: "Performance analysis and insights generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Loading Insights",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLoadInsights = () => {
    if (!filters.year || !filters.gp || !filters.session) {
      toast({
        title: "Missing Parameters",
        description: "Please load session data first",
        variant: "destructive",
      });
      return;
    }

    loadInsightsMutation.mutate({
      year: parseInt(filters.year),
      gp: filters.gp,
      session: filters.session,
    });
  };

  const performanceColors = ['#00d9ff', '#ff3853', '#fbbf24', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];

  const radarData = insightsData?.topPerformers?.map((driver: any, idx: number) => ({
    driver: driver.driver,
    'Performance Score': driver.performanceScore,
    'Consistency': Math.max(0, 100 - driver.consistency * 50),
    'Best Pace': Math.max(0, 100 - (driver.bestLap - (insightsData.topPerformers[0]?.bestLap || driver.bestLap)) * 10),
    'Avg Pace': Math.max(0, 100 - (driver.avgLap - (insightsData.topPerformers[0]?.avgLap || driver.avgLap)) * 10),
  })) || [];

  return (
    <Card className="mt-6" data-testid="race-insights">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-lightbulb text-yellow-400"></i>
            Race Insights
          </div>
          <Button 
            onClick={handleLoadInsights} 
            disabled={loadInsightsMutation.isPending || !sessionData}
            size="sm"
          >
            {loadInsightsMutation.isPending ? (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fas fa-sync-alt mr-2"></i>
            )}
            Generate Insights
          </Button>
        </CardTitle>
        <CardDescription>
          This section analyzes session performance data to show driver rankings based on their average lap times (not personal best laps), consistency metrics (variance from mean), and calculated performance scores. The "Best Lap" shown is each driver's fastest lap in the session, while rankings are based on nearest-to-average consistent pace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!insightsData ? (
          <div className="text-center py-12">
            <i className="fas fa-brain text-6xl text-muted mb-4 block"></i>
            <p className="text-muted-foreground mb-4">Load session data and click "Generate Insights" to see performance analysis</p>
            <p className="text-xs text-muted-foreground">Includes top performers, consistency analysis, and pace comparisons</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Insights Summary */}
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <i className="fas fa-star text-yellow-400"></i>
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insightsData.insights?.map((insight: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <i className="fas fa-check-circle text-green-400 mt-1"></i>
                      <span className="text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Top Performers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insightsData.topPerformers?.map((driver: any, idx: number) => (
                <Card key={driver.driver} className={`${idx === 0 ? 'border-yellow-500/50' : idx === 1 ? 'border-gray-400/50' : 'border-orange-600/50'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          idx === 0 ? 'bg-yellow-500 text-black' :
                          idx === 1 ? 'bg-gray-400 text-black' :
                          'bg-orange-600 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                        {driver.driver}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Performance Score</span>
                        <span className="text-lg font-bold text-primary">{driver.performanceScore?.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Best Lap</span>
                        <span className="font-mono font-semibold">{driver.bestLap?.toFixed(3)}s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Consistency</span>
                        <span className={`font-mono font-semibold ${driver.consistency < 0.5 ? 'text-green-400' : driver.consistency < 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {driver.consistency?.toFixed(3)}s
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Performance Score Chart */}
            {insightsData.allDrivers?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Score Distribution</CardTitle>
                  <CardDescription>Comparison of all drivers based on calculated performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={insightsData.allDrivers.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="driver" width={50} />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}`, 'Score']}
                        labelStyle={{ color: '#000' }}
                      />
                      <Bar dataKey="performanceScore" radius={[0, 4, 4, 0]}>
                        {insightsData.allDrivers.slice(0, 10).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={performanceColors[index % performanceColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Consistency Leaders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <i className="fas fa-bullseye text-green-400"></i>
                  Most Consistent Drivers
                </CardTitle>
                <CardDescription>Drivers with the lowest lap time variance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {insightsData.mostConsistent?.map((driver: any, idx: number) => (
                    <div key={driver.driver} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          idx === 0 ? 'bg-green-500 text-white' :
                          idx === 1 ? 'bg-green-400 text-white' :
                          'bg-green-300 text-black'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold">{driver.driver}</p>
                          <p className="text-xs text-muted-foreground">{driver.totalLaps} laps</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-bold text-green-400">{driver.consistency?.toFixed(3)}s</p>
                        <p className="text-xs text-muted-foreground">variance</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Session Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Session Avg Pace</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary font-mono">{insightsData.sessionAvgPace?.toFixed(3)}s</div>
                  <p className="text-xs text-muted-foreground mt-1">All drivers average</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Drivers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-secondary">{insightsData.totalDrivers}</div>
                  <p className="text-xs text-muted-foreground mt-1">Analyzed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">{insightsData.topPerformers?.[0]?.performanceScore?.toFixed(1) || 'N/A'}</div>
                  <p className="text-xs text-muted-foreground mt-1">{insightsData.topPerformers?.[0]?.driver || 'N/A'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pace Gap</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-400">
                    {insightsData.allDrivers?.length > 1 
                      ? `${(insightsData.allDrivers[insightsData.allDrivers.length - 1]?.avgLap - insightsData.allDrivers[0]?.avgLap).toFixed(3)}s`
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">First to last</p>
                </CardContent>
              </Card>
            </div>

            {/* Driver Performance Radar (for top 3) */}
            {radarData.length >= 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top 3 Performance Radar</CardTitle>
                  <CardDescription>Multi-dimensional comparison of leading drivers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={[
                      { metric: 'Performance Score', [radarData[0]?.driver]: radarData[0]?.['Performance Score'], [radarData[1]?.driver]: radarData[1]?.['Performance Score'], [radarData[2]?.driver]: radarData[2]?.['Performance Score'] },
                      { metric: 'Consistency', [radarData[0]?.driver]: radarData[0]?.['Consistency'], [radarData[1]?.driver]: radarData[1]?.['Consistency'], [radarData[2]?.driver]: radarData[2]?.['Consistency'] },
                      { metric: 'Best Pace', [radarData[0]?.driver]: radarData[0]?.['Best Pace'], [radarData[1]?.driver]: radarData[1]?.['Best Pace'], [radarData[2]?.driver]: radarData[2]?.['Best Pace'] },
                      { metric: 'Avg Pace', [radarData[0]?.driver]: radarData[0]?.['Avg Pace'], [radarData[1]?.driver]: radarData[1]?.['Avg Pace'], [radarData[2]?.driver]: radarData[2]?.['Avg Pace'] },
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      {radarData.slice(0, 3).map((entry: any, idx: number) => (
                        <Radar
                          key={entry.driver}
                          name={entry.driver}
                          dataKey={entry.driver}
                          stroke={performanceColors[idx]}
                          fill={performanceColors[idx]}
                          fillOpacity={0.3}
                        />
                      ))}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
