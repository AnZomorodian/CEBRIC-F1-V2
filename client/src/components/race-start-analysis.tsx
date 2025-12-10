
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { F1SessionResponse } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RaceStartAnalysisProps {
  sessionData: F1SessionResponse | null;
  filters: { year: string; gp: string; session: string; drivers: string[] };
}

export default function RaceStartAnalysis({ sessionData, filters }: RaceStartAnalysisProps) {
  // Only show for Race sessions
  if (!sessionData || filters.session !== 'R') {
    return null;
  }

  // Calculate start analysis for each driver
  const startAnalysis = sessionData.drivers.map(driver => {
    const driverLaps = sessionData.laps.filter(l => l.driver === driver);
    
    // Get lap 1 time
    const lap1 = driverLaps.find(l => l.lapNumber === 1);
    const lap1Time = lap1?.lapTime || 0;
    
    // Get first 3 laps average (excluding lap 1)
    const firstLaps = driverLaps.filter(l => l.lapNumber >= 2 && l.lapNumber <= 4 && l.lapTime > 0);
    const avgFirstLaps = firstLaps.length > 0 
      ? firstLaps.reduce((sum, l) => sum + l.lapTime, 0) / firstLaps.length 
      : 0;
    
    // Reaction time estimate (lap 1 is typically slower due to formation lap and start)
    const reactionDelta = lap1Time > 0 && avgFirstLaps > 0 ? lap1Time - avgFirstLaps : 0;
    
    // Get sector 1 of lap 1 (best indicator of start performance)
    const lap1Sector1 = lap1?.sector1 || 0;
    
    return {
      driver,
      lap1Time,
      lap1Sector1,
      avgFirstLaps,
      reactionDelta,
      compound: lap1?.compound || 'UNKNOWN'
    };
  }).filter(d => d.lap1Time > 0).sort((a, b) => a.lap1Sector1 - b.lap1Sector1);

  if (startAnalysis.length === 0) {
    return null;
  }

  const performanceColors = ['#00d9ff', '#ff3853', '#fbbf24', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];

  // Find best sector 1
  const bestSector1 = Math.min(...startAnalysis.map(d => d.lap1Sector1));

  return (
    <Card className="mt-6 bg-gradient-to-br from-green-500/5 to-yellow-500/5 border-green-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <i className="fas fa-flag-checkered text-green-400"></i>
          Race Start Analysis
        </CardTitle>
        <CardDescription>
          Driver performance off the line - Lap 1 Sector 1 times and start reaction analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top 3 Start Performers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {startAnalysis.slice(0, 3).map((driver, idx) => (
            <Card key={driver.driver} className={`${
              idx === 0 ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/5' :
              idx === 1 ? 'border-gray-400/50 bg-gradient-to-br from-gray-400/10 to-gray-600/5' :
              'border-orange-600/50 bg-gradient-to-br from-orange-600/10 to-red-600/5'
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      'bg-orange-600 text-white'
                    }`}>
                      {idx + 1}
                    </span>
                    <CardTitle className="text-lg">{driver.driver}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Lap 1 Sector 1</span>
                    <span className="font-mono font-bold text-green-400">{driver.lap1Sector1.toFixed(3)}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Gap to Best</span>
                    <span className="font-mono text-sm">+{(driver.lap1Sector1 - bestSector1).toFixed(3)}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Start Compound</span>
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
                      driver.compound === 'SOFT' ? 'bg-red-500/20 text-red-400' :
                      driver.compound === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                      driver.compound === 'HARD' ? 'bg-gray-500/20 text-gray-300' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {driver.compound}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sector 1 Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lap 1 Sector 1 Performance - Start Reaction</CardTitle>
            <CardDescription>Lower times indicate better reactions and first corner performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={startAnalysis} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  type="number" 
                  tick={{ fill: '#A0A0A0', fontSize: 11 }}
                  stroke="rgba(255,255,255,0.2)"
                  tickFormatter={(value) => `${value.toFixed(2)}s`}
                />
                <YAxis 
                  type="category" 
                  dataKey="driver" 
                  width={50}
                  tick={{ fill: '#A0A0A0', fontSize: 11 }}
                  stroke="rgba(255,255,255,0.2)"
                />
                <Tooltip 
                  formatter={(value: any) => [`${Number(value).toFixed(3)}s`, 'Sector 1 Time']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(18, 18, 20, 0.95)', 
                    border: '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#00d9ff', fontWeight: 'bold' }}
                />
                <Legend />
                <Bar dataKey="lap1Sector1" name="Lap 1 Sector 1" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Start Analysis Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Complete Start Performance</CardTitle>
            <CardDescription>All drivers ranked by Lap 1 Sector 1 times</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {startAnalysis.map((driver, idx) => (
                <div 
                  key={driver.driver} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{driver.driver}</p>
                      <p className="text-xs text-muted-foreground">
                        Started on {driver.compound}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Sector 1</p>
                      <p className="font-mono font-semibold text-green-400">{driver.lap1Sector1.toFixed(3)}s</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Gap</p>
                      <p className="font-mono font-semibold">+{(driver.lap1Sector1 - bestSector1).toFixed(3)}s</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Lap 1 Total</p>
                      <p className="font-mono font-semibold">{driver.lap1Time.toFixed(3)}s</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Start Insights */}
        <Card className="bg-gradient-to-r from-green-500/10 to-yellow-500/10 border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <i className="fas fa-lightbulb text-yellow-400"></i>
              Start Analysis Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <i className="fas fa-check-circle text-green-400 mt-0.5"></i>
                <span>
                  <strong className="text-green-400">{startAnalysis[0].driver}</strong> had the best start with a Lap 1 Sector 1 time of {startAnalysis[0].lap1Sector1.toFixed(3)}s
                </span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-info-circle text-blue-400 mt-0.5"></i>
                <span>
                  The gap from best to slowest start in Sector 1 was {(startAnalysis[startAnalysis.length - 1].lap1Sector1 - bestSector1).toFixed(3)}s
                </span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-tire text-orange-400 mt-0.5"></i>
                <span>
                  {(() => {
                    const compoundCounts = startAnalysis.reduce((acc, d) => {
                      acc[d.compound] = (acc[d.compound] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const mostUsed = Object.entries(compoundCounts).sort((a, b) => b[1] - a[1])[0];
                    return `Most drivers started on ${mostUsed[0]} compound (${mostUsed[1]} drivers)`;
                  })()}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
