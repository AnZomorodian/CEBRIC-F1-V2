import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { F1SessionResponse } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, LineChart, Line, Area, AreaChart } from 'recharts';

interface RaceInsightsProps {
  sessionData: F1SessionResponse | null;
  filters: { year: string; gp: string; session: string; drivers: string[] };
}

export default function RaceInsights({ sessionData, filters }: RaceInsightsProps) {
  const [insightsData, setInsightsData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'ai-analysis'>('overview');
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

  const radarData = insightsData?.topPerformers?.slice(0, 3).map((driver: any) => {
    const baseline = insightsData.topPerformers[0];
    const performanceScore = Math.min(100, driver.performanceScore || 0);
    const consistencyScore = Math.max(0, Math.min(100, 100 - (driver.consistency / baseline.consistency) * 50));
    const bestPaceScore = Math.max(0, Math.min(100, 100 - ((driver.bestLap - baseline.bestLap) / baseline.bestLap) * 500));
    const avgPaceScore = Math.max(0, Math.min(100, 100 - ((driver.avgLap - baseline.avgLap) / baseline.avgLap) * 500));
    
    return {
      driver: driver.driver,
      'Performance Score': performanceScore,
      'Consistency': consistencyScore,
      'Best Pace': bestPaceScore,
      'Avg Pace': avgPaceScore,
    };
  }) || [];

  return (
    <Card className="mt-6" data-testid="race-insights">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-lightbulb text-yellow-400"></i>
            Race Insights
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'overview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('overview')}
              >
                <i className="fas fa-chart-bar mr-2"></i>
                Overview
              </Button>
              <Button
                variant={viewMode === 'ai-analysis' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('ai-analysis')}
              >
                <i className="fas fa-brain mr-2"></i>
                AI Analysis
              </Button>
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
          </div>
        </CardTitle>
        <CardDescription>
          {viewMode === 'overview' 
            ? 'This section analyzes session performance data to show driver rankings based on their average lap times (not personal best laps), consistency metrics (variance from mean), and calculated performance scores.'
            : 'Deep AI-powered analysis of the top 3 drivers with detailed performance breakdowns, strength/weakness identification, and strategic insights.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!insightsData ? (
          <div className="text-center py-12">
            <i className="fas fa-brain text-6xl text-muted mb-4 block"></i>
            <p className="text-muted-foreground mb-4">Load session data and click "Generate Insights" to see performance analysis</p>
            <p className="text-xs text-muted-foreground">Includes top performers, consistency analysis, and AI-powered driver analysis</p>
          </div>
        ) : viewMode === 'overview' ? (
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
              <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <i className="fas fa-chart-radar text-primary"></i>
                    Top 3 Performance Radar
                  </CardTitle>
                  <CardDescription>Multi-dimensional comparison of leading drivers across key performance metrics (all scores normalized to 0-100 scale)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={450}>
                    <RadarChart data={[
                      { metric: 'Performance Score', [radarData[0]?.driver]: radarData[0]?.['Performance Score'], [radarData[1]?.driver]: radarData[1]?.['Performance Score'], [radarData[2]?.driver]: radarData[2]?.['Performance Score'] },
                      { metric: 'Consistency', [radarData[0]?.driver]: radarData[0]?.['Consistency'], [radarData[1]?.driver]: radarData[1]?.['Consistency'], [radarData[2]?.driver]: radarData[2]?.['Consistency'] },
                      { metric: 'Best Pace', [radarData[0]?.driver]: radarData[0]?.['Best Pace'], [radarData[1]?.driver]: radarData[1]?.['Best Pace'], [radarData[2]?.driver]: radarData[2]?.['Best Pace'] },
                      { metric: 'Avg Pace', [radarData[0]?.driver]: radarData[0]?.['Avg Pace'], [radarData[1]?.driver]: radarData[1]?.['Avg Pace'], [radarData[2]?.driver]: radarData[2]?.['Avg Pace'] },
                    ]}>
                      <PolarGrid 
                        gridType="polygon" 
                        stroke="rgba(0, 217, 255, 0.3)"
                        strokeWidth={1.5}
                      />
                      <PolarAngleAxis 
                        dataKey="metric" 
                        tick={{ fill: '#fff', fontSize: 13, fontWeight: 500 }}
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]} 
                        tick={{ fill: '#888', fontSize: 11 }}
                        tickCount={6}
                        stroke="rgba(255,255,255,0.2)"
                      />
                      {radarData.slice(0, 3).map((entry: any, idx: number) => (
                        <Radar
                          key={entry.driver}
                          name={entry.driver}
                          dataKey={entry.driver}
                          stroke={performanceColors[idx]}
                          fill={performanceColors[idx]}
                          fillOpacity={0.3}
                          strokeWidth={3}
                          dot={{ r: 5, fill: performanceColors[idx], strokeWidth: 2, stroke: '#fff' }}
                        />
                      ))}
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}`, 'Score']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(18, 18, 20, 0.98)', 
                          border: '2px solid #00d9ff',
                          borderRadius: '8px',
                          padding: '12px'
                        }}
                        labelStyle={{ color: '#00d9ff', fontWeight: 'bold', marginBottom: '8px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    {radarData.slice(0, 3).map((driver: any, idx: number) => (
                      <div key={driver.driver} className="p-4 bg-muted/30 rounded-lg border border-border text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: performanceColors[idx] }}
                          ></div>
                          <span className="font-bold">{driver.driver}</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Overall: <span className="text-primary font-semibold">{driver['Performance Score'].toFixed(1)}</span></p>
                          <p>Consistency: <span className="text-green-400 font-semibold">{driver['Consistency'].toFixed(1)}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          // AI Analysis Section
          <div className="space-y-6">
            {/* AI Analysis Header */}
            <Card className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-robot text-purple-400"></i>
                  AI-Powered Performance Analysis
                </CardTitle>
                <CardDescription>Advanced algorithmic breakdown of top 3 drivers' performance metrics and racing characteristics</CardDescription>
              </CardHeader>
            </Card>

            {/* Top 3 Drivers Detailed Analysis */}
            <div className="grid grid-cols-1 gap-6">
              {insightsData.topPerformers?.slice(0, 3).map((driver: any, idx: number) => {
                // Calculate additional AI metrics
                const paceAdvantage = idx === 0 ? 0 : ((driver.avgLap - insightsData.topPerformers[0].avgLap) / insightsData.topPerformers[0].avgLap * 100);
                const consistencyRating = driver.consistency < 0.3 ? 'Excellent' : driver.consistency < 0.6 ? 'Good' : driver.consistency < 1.0 ? 'Average' : 'Poor';
                const lapTimeDelta = driver.avgLap - driver.bestLap;
                const performanceGap = idx === 0 ? 0 : insightsData.topPerformers[0].performanceScore - driver.performanceScore;
                
                // Generate AI insights
                const strengths = [];
                const weaknesses = [];
                const recommendations = [];

                if (driver.consistency < 0.4) {
                  strengths.push("Exceptional consistency in lap times");
                } else if (driver.consistency > 0.8) {
                  weaknesses.push("Inconsistent pace throughout the session");
                }

                if (lapTimeDelta < 0.5) {
                  strengths.push("Minimal gap between best and average lap");
                } else if (lapTimeDelta > 1.5) {
                  weaknesses.push("Significant variance between peak and average performance");
                }

                if (driver.performanceScore > 85) {
                  strengths.push("Outstanding overall performance score");
                } else if (driver.performanceScore < 70) {
                  weaknesses.push("Room for improvement in overall performance");
                }

                // Recommendations based on analysis
                if (driver.consistency > 0.6) {
                  recommendations.push("Focus on consistency training and race simulation");
                }
                if (lapTimeDelta > 1.0) {
                  recommendations.push("Work on maintaining qualifying pace during race stints");
                }
                if (idx > 0 && paceAdvantage > 0.5) {
                  recommendations.push("Analyze setup differences with faster drivers");
                }

                return (
                  <Card key={driver.driver} className={`border-2 ${
                    idx === 0 ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/5' :
                    idx === 1 ? 'border-gray-400/50 bg-gradient-to-br from-gray-400/5 to-gray-600/5' :
                    'border-orange-600/50 bg-gradient-to-br from-orange-600/5 to-red-600/5'
                  }`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                            idx === 0 ? 'bg-yellow-500 text-black' :
                            idx === 1 ? 'bg-gray-400 text-black' :
                            'bg-orange-600 text-white'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <CardTitle className="text-2xl">{driver.driver}</CardTitle>
                            <CardDescription>AI Performance Analysis</CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">{driver.performanceScore.toFixed(1)}</div>
                          <p className="text-xs text-muted-foreground">Performance Score</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Performance Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Best Lap</p>
                          <p className="text-lg font-mono font-bold text-primary">{driver.bestLap.toFixed(3)}s</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Average Lap</p>
                          <p className="text-lg font-mono font-bold">{driver.avgLap.toFixed(3)}s</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Consistency</p>
                          <p className={`text-lg font-mono font-bold ${
                            driver.consistency < 0.4 ? 'text-green-400' : 
                            driver.consistency < 0.8 ? 'text-yellow-400' : 'text-red-400'
                          }`}>{driver.consistency.toFixed(3)}s</p>
                          <p className="text-xs text-muted-foreground mt-1">{consistencyRating}</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Total Laps</p>
                          <p className="text-lg font-bold text-accent">{driver.totalLaps}</p>
                        </div>
                      </div>

                      {/* Comparative Analysis */}
                      {idx > 0 && (
                        <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <i className="fas fa-balance-scale text-orange-400"></i>
                              Gap to Leader
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Pace Deficit</p>
                              <p className="text-xl font-bold text-red-400">+{paceAdvantage.toFixed(2)}%</p>
                              <p className="text-xs text-muted-foreground mt-1">vs. {insightsData.topPerformers[0].driver}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Performance Gap</p>
                              <p className="text-xl font-bold text-orange-400">{performanceGap.toFixed(1)} pts</p>
                              <p className="text-xs text-muted-foreground mt-1">Score difference</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* AI Insights - Strengths */}
                      {strengths.length > 0 && (
                        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-400">
                            <i className="fas fa-trophy"></i>
                            Key Strengths
                          </h4>
                          <ul className="space-y-2">
                            {strengths.map((strength, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <i className="fas fa-check-circle text-green-400 mt-0.5"></i>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* AI Insights - Weaknesses */}
                      {weaknesses.length > 0 && (
                        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-red-400">
                            <i className="fas fa-exclamation-triangle"></i>
                            Areas for Improvement
                          </h4>
                          <ul className="space-y-2">
                            {weaknesses.map((weakness, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <i className="fas fa-times-circle text-red-400 mt-0.5"></i>
                                <span>{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* AI Recommendations */}
                      {recommendations.length > 0 && (
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-400">
                            <i className="fas fa-lightbulb"></i>
                            AI Recommendations
                          </h4>
                          <ul className="space-y-2">
                            {recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <i className="fas fa-arrow-right text-blue-400 mt-0.5"></i>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Performance Distribution Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Lap Time Distribution Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={[
                              { metric: 'Best Lap', value: driver.bestLap, target: driver.bestLap },
                              { metric: 'Avg Lap', value: driver.avgLap, target: driver.bestLap },
                              { metric: 'Consistency', value: driver.avgLap + driver.consistency, target: driver.bestLap },
                            ]}>
                              <defs>
                                <linearGradient id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : '#f97316'} stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor={idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : '#f97316'} stopOpacity={0.1}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="metric" />
                              <YAxis domain={['auto', 'auto']} />
                              <Tooltip formatter={(value: any) => `${Number(value).toFixed(3)}s`} />
                              <Area type="monotone" dataKey="value" stroke={idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : '#f97316'} fill={`url(#gradient-${idx})`} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Comparative Summary */}
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-chart-line text-primary"></i>
                  Top 3 Comparative Summary
                </CardTitle>
                <CardDescription>Side-by-side comparison of key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={insightsData.topPerformers?.slice(0, 3).map((d: any) => ({
                    driver: d.driver,
                    'Performance Score': d.performanceScore,
                    'Consistency (inverted)': Math.max(0, 100 - d.consistency * 100),
                    'Pace Quality': ((d.bestLap / d.avgLap) * 100),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="driver" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Performance Score" fill="#00d9ff" />
                    <Bar dataKey="Consistency (inverted)" fill="#22c55e" />
                    <Bar dataKey="Pace Quality" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
