import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { F1SessionResponse } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Eye, EyeOff, TrendingUp, Target, Zap, Clock, Award, BarChart3 } from "lucide-react";

interface FormulaAnalysisProps {
  sessionData: F1SessionResponse | null;
  filters: { year: string; gp: string; session: string; drivers: string[] };
}

export default function FormulaAnalysis({ sessionData, filters }: FormulaAnalysisProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!sessionData || !sessionData.laps || sessionData.laps.length === 0) {
    return null;
  }

  // Calculate driver performance metrics
  const driverMetrics = sessionData.drivers.map(driver => {
    const driverLaps = sessionData.laps.filter(l => l.driver === driver && l.lapTime > 0);
    
    if (driverLaps.length === 0) return null;

    const lapTimes = driverLaps.map(l => l.lapTime);
    const bestLap = Math.min(...lapTimes);
    const avgLap = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length;
    const consistency = Math.sqrt(lapTimes.reduce((sum, t) => sum + Math.pow(t - avgLap, 2), 0) / lapTimes.length);
    
    // Calculate pace evolution (first 5 laps vs last 5 laps)
    const firstLaps = driverLaps.slice(0, Math.min(5, driverLaps.length)).map(l => l.lapTime);
    const lastLaps = driverLaps.slice(-Math.min(5, driverLaps.length)).map(l => l.lapTime);
    const avgFirstLaps = firstLaps.reduce((a, b) => a + b, 0) / firstLaps.length;
    const avgLastLaps = lastLaps.reduce((a, b) => a + b, 0) / lastLaps.length;
    const paceEvolution = avgLastLaps - avgFirstLaps;

    // Calculate sector consistency
    const sector1Times = driverLaps.filter(l => l.sector1 > 0).map(l => l.sector1);
    const sector2Times = driverLaps.filter(l => l.sector2 > 0).map(l => l.sector2);
    const sector3Times = driverLaps.filter(l => l.sector3 > 0).map(l => l.sector3);
    
    const sector1Consistency = sector1Times.length > 1 ? Math.sqrt(sector1Times.reduce((sum, t) => sum + Math.pow(t - sector1Times.reduce((a, b) => a + b) / sector1Times.length, 2), 0) / sector1Times.length) : 0;
    const sector2Consistency = sector2Times.length > 1 ? Math.sqrt(sector2Times.reduce((sum, t) => sum + Math.pow(t - sector2Times.reduce((a, b) => a + b) / sector2Times.length, 2), 0) / sector2Times.length) : 0;
    const sector3Consistency = sector3Times.length > 1 ? Math.sqrt(sector3Times.reduce((sum, t) => sum + Math.pow(t - sector3Times.reduce((a, b) => a + b) / sector3Times.length, 2), 0) / sector3Times.length) : 0;

    return {
      driver,
      bestLap,
      avgLap,
      consistency,
      totalLaps: driverLaps.length,
      paceEvolution,
      sector1Consistency,
      sector2Consistency,
      sector3Consistency,
      performanceScore: (100 / (1 + consistency)) * (bestLap > 0 ? 100 / bestLap : 0),
    };
  }).filter(Boolean).sort((a, b) => a!.bestLap - b!.bestLap);

  const bestOverallLap = Math.min(...driverMetrics.map(d => d!.bestLap));

  // Calculate tire compound performance
  const compoundPerformance = Object.values(
    sessionData.laps.reduce((acc, lap) => {
      if (lap.lapTime > 0 && lap.compound) {
        if (!acc[lap.compound]) {
          acc[lap.compound] = { compound: lap.compound, times: [], count: 0 };
        }
        acc[lap.compound].times.push(lap.lapTime);
        acc[lap.compound].count++;
      }
      return acc;
    }, {} as Record<string, any>)
  ).map((data: any) => ({
    compound: data.compound,
    avgTime: data.times.reduce((a: number, b: number) => a + b, 0) / data.times.length,
    bestTime: Math.min(...data.times),
    count: data.count,
    consistency: Math.sqrt(data.times.reduce((sum: number, t: number) => sum + Math.pow(t - (data.times.reduce((a: number, b: number) => a + b, 0) / data.times.length), 2), 0) / data.times.length),
  }));

  // Calculate lap time distribution
  const lapTimeDistribution = driverMetrics.slice(0, 10).map(d => ({
    driver: d!.driver,
    best: d!.bestLap,
    avg: d!.avgLap,
    worst: Math.max(...sessionData.laps.filter(l => l.driver === d!.driver && l.lapTime > 0).map(l => l.lapTime)),
    range: Math.max(...sessionData.laps.filter(l => l.driver === d!.driver && l.lapTime > 0).map(l => l.lapTime)) - d!.bestLap,
  }));

  const performanceColors = ['#00d9ff', '#ff3853', '#fbbf24', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];

  // Calculate additional advanced metrics
  const advancedMetrics = {
    // Speed trap analysis (simulated from lap times)
    avgLapTimeAll: driverMetrics.reduce((sum, d) => sum + d!.avgLap, 0) / driverMetrics.length,
    fastestDriver: driverMetrics[0]!.driver,
    mostConsistent: [...driverMetrics].sort((a, b) => a!.consistency - b!.consistency)[0]!.driver,
    biggestImprover: [...driverMetrics].sort((a, b) => a!.paceEvolution - b!.paceEvolution)[0]!.driver,
    
    // Sector dominance for top 5 drivers
    sectorDominance: driverMetrics.slice(0, 5).map(d => {
      const driverLaps = sessionData.laps.filter(l => l.driver === d!.driver && l.sector1 > 0);
      const avgS1 = driverLaps.reduce((sum, l) => sum + l.sector1, 0) / (driverLaps.length || 1);
      const avgS2 = driverLaps.reduce((sum, l) => sum + l.sector2, 0) / (driverLaps.length || 1);
      const avgS3 = driverLaps.reduce((sum, l) => sum + l.sector3, 0) / (driverLaps.length || 1);
      const totalAvg = avgS1 + avgS2 + avgS3;
      return {
        driver: d!.driver,
        sector1: totalAvg > 0 ? ((1 - avgS1 / (totalAvg / 3)) * 100 + 100) : 50,
        sector2: totalAvg > 0 ? ((1 - avgS2 / (totalAvg / 3)) * 100 + 100) : 50,
        sector3: totalAvg > 0 ? ((1 - avgS3 / (totalAvg / 3)) * 100 + 100) : 50,
        consistency: 100 - (d!.consistency * 50),
        racePace: 100 - ((d!.avgLap - driverMetrics[0]!.avgLap) * 10),
      };
    }),
    
    // Lap time progression data
    lapProgression: driverMetrics.slice(0, 3).map(d => ({
      driver: d!.driver,
      laps: sessionData.laps
        .filter(l => l.driver === d!.driver && l.lapTime > 0)
        .slice(0, 15)
        .map((l, idx) => ({ lap: idx + 1, time: l.lapTime }))
    })),
  };

  return (
    <Card className="mt-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Formula Analysis - Advanced Performance Metrics
            </CardTitle>
            <CardDescription>
              Comprehensive analysis of driver performance, consistency, and tire strategy
            </CardDescription>
          </div>
          <Button
            variant={showDetails ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="gap-2"
            data-testid="button-toggle-analysis"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats - Always Visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-yellow-500" />
                <p className="text-[10px] text-muted-foreground">Session Leader</p>
              </div>
              <p className="text-lg font-bold text-yellow-500">{advancedMetrics.fastestDriver}</p>
              <p className="text-xs text-muted-foreground">{driverMetrics[0]!.bestLap.toFixed(3)}s</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-green-500" />
                <p className="text-[10px] text-muted-foreground">Most Consistent</p>
              </div>
              <p className="text-lg font-bold text-green-500">{advancedMetrics.mostConsistent}</p>
              <p className="text-xs text-muted-foreground">Low variance</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <p className="text-[10px] text-muted-foreground">Most Improved</p>
              </div>
              <p className="text-lg font-bold text-blue-500">{advancedMetrics.biggestImprover}</p>
              <p className="text-xs text-muted-foreground">Session progression</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-500" />
                <p className="text-[10px] text-muted-foreground">Avg Lap Time</p>
              </div>
              <p className="text-lg font-bold text-purple-500">{advancedMetrics.avgLapTimeAll.toFixed(2)}s</p>
              <p className="text-xs text-muted-foreground">Field average</p>
            </CardContent>
          </Card>
        </div>

        {showDetails && (
          <>
        {/* Top 3 Performance Leaders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {driverMetrics.slice(0, 3).map((driver, idx) => (
            <Card key={driver!.driver} className={`${
              idx === 0 ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/5' :
              idx === 1 ? 'border-gray-400/50 bg-gradient-to-br from-gray-400/10 to-gray-600/5' :
              'border-orange-600/50 bg-gradient-to-br from-orange-600/10 to-red-600/5'
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      'bg-orange-600 text-white'
                    }`}>
                      {idx + 1}
                    </span>
                    <CardTitle className="text-xl">{driver!.driver}</CardTitle>
                  </div>
                  <i className={`fas fa-trophy ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-orange-600'} text-2xl`}></i>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Best Lap</span>
                    <span className="font-mono font-bold text-primary">{driver!.bestLap.toFixed(3)}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Gap to P1</span>
                    <span className="font-mono text-sm">+{(driver!.bestLap - bestOverallLap).toFixed(3)}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Consistency</span>
                    <span className={`font-mono text-sm ${driver!.consistency < 0.5 ? 'text-green-400' : driver!.consistency < 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                      σ {driver!.consistency.toFixed(3)}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Performance Score</span>
                    <span className="font-mono text-sm font-bold">{driver!.performanceScore.toFixed(1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance vs Consistency Scatter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance vs Consistency Matrix</CardTitle>
            <CardDescription>Driver positioning based on best lap time and consistency</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  type="number" 
                  dataKey="consistency" 
                  name="Consistency" 
                  tick={{ fill: '#A0A0A0', fontSize: 11 }}
                  stroke="rgba(255,255,255,0.2)"
                  label={{ value: 'Consistency (σ seconds)', position: 'insideBottom', offset: -10, fill: '#A0A0A0' }}
                />
                <YAxis 
                  type="number" 
                  dataKey="bestLap" 
                  name="Best Lap" 
                  tick={{ fill: '#A0A0A0', fontSize: 11 }}
                  stroke="rgba(255,255,255,0.2)"
                  reversed
                  label={{ value: 'Best Lap Time (s)', angle: -90, position: 'insideLeft', fill: '#A0A0A0' }}
                />
                <ZAxis type="number" dataKey="totalLaps" range={[100, 1000]} name="Total Laps" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(18, 18, 20, 0.95)', 
                    border: '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'Best Lap') return [`${Number(value).toFixed(3)}s`, 'Best Lap'];
                    if (name === 'Consistency') return [`${Number(value).toFixed(3)}s`, 'Consistency'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Driver: ${label}`}
                />
                <Legend />
                <Scatter name="Drivers" data={driverMetrics} fill="#00d9ff">
                  {driverMetrics.map((entry, index) => (
                    <text
                      key={`label-${index}`}
                      x={0}
                      y={0}
                      textAnchor="middle"
                      fill="#00d9ff"
                      fontSize={10}
                    >
                      {entry!.driver}
                    </text>
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tire Compound Analysis */}
        {compoundPerformance.length > 0 && (
          <Card className="bg-gradient-to-r from-red-500/5 to-yellow-500/5 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <i className="fas fa-tire text-red-400"></i>
                Tire Compound Performance Analysis
              </CardTitle>
              <CardDescription>Comparative analysis of different tire compounds</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={compoundPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="compound" 
                    tick={{ fill: '#A0A0A0', fontSize: 11 }}
                    stroke="rgba(255,255,255,0.2)"
                  />
                  <YAxis 
                    tick={{ fill: '#A0A0A0', fontSize: 11 }}
                    stroke="rgba(255,255,255,0.2)"
                    tickFormatter={(value) => `${value.toFixed(2)}s`}
                  />
                  <Tooltip 
                    formatter={(value: any) => `${Number(value).toFixed(3)}s`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(18, 18, 20, 0.95)', 
                      border: '1px solid rgba(0, 217, 255, 0.3)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="bestTime" name="Best Time" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgTime" name="Avg Time" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {compoundPerformance.map((comp, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full ${
                        comp.compound === 'SOFT' ? 'bg-red-500' :
                        comp.compound === 'MEDIUM' ? 'bg-yellow-500' :
                        comp.compound === 'HARD' ? 'bg-gray-300' :
                        'bg-blue-500'
                      }`}></div>
                      <span className="font-semibold text-sm">{comp.compound}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Laps:</span>
                        <span className="font-mono">{comp.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Consistency:</span>
                        <span className={`font-mono ${comp.consistency < 0.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {comp.consistency.toFixed(3)}s
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pace Evolution Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <i className="fas fa-chart-line text-secondary"></i>
              Pace Evolution Throughout Session
            </CardTitle>
            <CardDescription>How driver pace changed from start to finish</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {driverMetrics.map((driver, idx) => (
                <div 
                  key={driver!.driver} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{driver!.driver}</p>
                      <p className="text-xs text-muted-foreground">{driver!.totalLaps} laps</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Best</p>
                      <p className="font-mono font-semibold text-primary">{driver!.bestLap.toFixed(3)}s</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Avg</p>
                      <p className="font-mono font-semibold">{driver!.avgLap.toFixed(3)}s</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Evolution</p>
                      <p className={`font-mono font-semibold ${driver!.paceEvolution < 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {driver!.paceEvolution > 0 ? '+' : ''}{driver!.paceEvolution.toFixed(3)}s
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="font-mono font-semibold text-accent">{driver!.performanceScore.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Session Insights */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <i className="fas fa-lightbulb text-yellow-400"></i>
              Formula Analysis Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <i className="fas fa-crown text-yellow-400 mt-0.5"></i>
                <span>
                  <strong className="text-primary">{driverMetrics[0]!.driver}</strong> leads with the fastest lap of {driverMetrics[0]!.bestLap.toFixed(3)}s and a performance score of {driverMetrics[0]!.performanceScore.toFixed(1)}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check-circle text-green-400 mt-0.5"></i>
                <span>
                  Most consistent driver: <strong className="text-green-400">
                    {driverMetrics.sort((a, b) => a!.consistency - b!.consistency)[0]!.driver}
                  </strong> with consistency of {driverMetrics.sort((a, b) => a!.consistency - b!.consistency)[0]!.consistency.toFixed(3)}s
                </span>
              </li>
              {compoundPerformance.length > 0 && (
                <li className="flex items-start gap-2">
                  <i className="fas fa-tire text-red-400 mt-0.5"></i>
                  <span>
                    Fastest compound: <strong className="text-red-400">
                      {compoundPerformance.sort((a, b) => a.bestTime - b.bestTime)[0].compound}
                    </strong> with best time of {compoundPerformance.sort((a, b) => a.bestTime - b.bestTime)[0].bestTime.toFixed(3)}s
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <i className="fas fa-chart-area text-blue-400 mt-0.5"></i>
                <span>
                  Performance spread from P1 to P10: {((driverMetrics[Math.min(9, driverMetrics.length - 1)]!.bestLap - driverMetrics[0]!.bestLap) / driverMetrics[0]!.bestLap * 100).toFixed(2)}%
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* NEW: Driver Performance Radar Chart */}
        {advancedMetrics.sectorDominance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Driver Performance Radar (Top 5)
              </CardTitle>
              <CardDescription>Multi-dimensional performance comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={[
                  { subject: 'Sector 1', ...Object.fromEntries(advancedMetrics.sectorDominance.map(d => [d.driver, d.sector1])) },
                  { subject: 'Sector 2', ...Object.fromEntries(advancedMetrics.sectorDominance.map(d => [d.driver, d.sector2])) },
                  { subject: 'Sector 3', ...Object.fromEntries(advancedMetrics.sectorDominance.map(d => [d.driver, d.sector3])) },
                  { subject: 'Consistency', ...Object.fromEntries(advancedMetrics.sectorDominance.map(d => [d.driver, d.consistency])) },
                  { subject: 'Race Pace', ...Object.fromEntries(advancedMetrics.sectorDominance.map(d => [d.driver, d.racePace])) },
                ]}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#A0A0A0', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} tick={{ fill: '#A0A0A0', fontSize: 9 }} />
                  {advancedMetrics.sectorDominance.map((d, idx) => (
                    <Radar
                      key={d.driver}
                      name={d.driver}
                      dataKey={d.driver}
                      stroke={performanceColors[idx % performanceColors.length]}
                      fill={performanceColors[idx % performanceColors.length]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(18, 18, 20, 0.95)', 
                      border: '1px solid rgba(0, 217, 255, 0.3)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* NEW: Head-to-Head Quick Stats */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Session Statistics Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total Drivers</p>
                <p className="text-2xl font-bold text-primary">{driverMetrics.length}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total Laps</p>
                <p className="text-2xl font-bold text-secondary">{sessionData.laps.filter(l => l.lapTime > 0).length}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Fastest Lap</p>
                <p className="text-2xl font-bold text-green-400">{bestOverallLap.toFixed(2)}s</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Gap P1-P10</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {((driverMetrics[Math.min(9, driverMetrics.length - 1)]!.bestLap - bestOverallLap)).toFixed(2)}s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
}
