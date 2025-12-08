import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { F1SessionResponse } from "@shared/schema";

interface DriverComparisonProps {
  sessionData: F1SessionResponse | null;
  telemetryDrivers?: { driver1: string; driver2?: string } | null;
}

export default function DriverComparison({ sessionData, telemetryDrivers }: DriverComparisonProps) {
  const [driver1, setDriver1] = useState<string>("");
  const [driver2, setDriver2] = useState<string>("");
  const [showMiniSectors, setShowMiniSectors] = useState<boolean>(false);

  const syncWithTelemetry = () => {
    if (telemetryDrivers) {
      setDriver1(telemetryDrivers.driver1 || "");
      setDriver2(telemetryDrivers.driver2 || "");
    }
  };

  if (!sessionData?.drivers || sessionData.drivers.length === 0) {
    return null;
  }

  const availableDrivers = sessionData.drivers;

  const getDriverBestLap = (driver: string) => {
    const driverLaps = sessionData.laps.filter(lap => lap.driver === driver && lap.lapTime > 0);
    if (driverLaps.length === 0) return null;
    return driverLaps.reduce((best, current) => 
      current.lapTime < best.lapTime ? current : best
    );
  };

  const driver1BestLap = driver1 ? getDriverBestLap(driver1) : null;
  const driver2BestLap = driver2 ? getDriverBestLap(driver2) : null;

  const formatTime = (seconds: number | null | undefined) => {
    if (!seconds || seconds === 0) return "N/A";
    return `${seconds.toFixed(3)}s`;
  };

  const calculateDelta = (time1: number, time2: number) => {
    const delta = time1 - time2;
    if (delta === 0) return "0.000s";
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(3)}s`;
  };

  const getSectorDelta = (sector1: number | null | undefined, sector2: number | null | undefined) => {
    if (!sector1 || !sector2) return null;
    return sector1 - sector2;
  };

  const getDeltaColor = (delta: number | null) => {
    if (delta === null) return "text-muted-foreground";
    if (delta > 0) return "text-red-500";
    if (delta < 0) return "text-green-500";
    return "text-muted-foreground";
  };

  // Calculate mini sectors (split each sector into sub-sectors)
  const getMiniSectors = () => {
    if (!driver1BestLap || !driver2BestLap) return null;
    
    const calculateMiniSectors = (sector1: number | null | undefined, sector2: number | null | undefined, sector3: number | null | undefined) => {
      if (!sector1 || !sector2 || !sector3) return [];
      
      // Split each sector into 3 mini sectors (approximate)
      return [
        { name: 'S1.1', time: sector1 * 0.33 },
        { name: 'S1.2', time: sector1 * 0.33 },
        { name: 'S1.3', time: sector1 * 0.34 },
        { name: 'S2.1', time: sector2 * 0.33 },
        { name: 'S2.2', time: sector2 * 0.33 },
        { name: 'S2.3', time: sector2 * 0.34 },
        { name: 'S3.1', time: sector3 * 0.33 },
        { name: 'S3.2', time: sector3 * 0.33 },
        { name: 'S3.3', time: sector3 * 0.34 },
      ];
    };

    const driver1Mini = calculateMiniSectors(driver1BestLap.sector1, driver1BestLap.sector2, driver1BestLap.sector3);
    const driver2Mini = calculateMiniSectors(driver2BestLap.sector1, driver2BestLap.sector2, driver2BestLap.sector3);

    return driver1Mini.map((mini1, idx) => ({
      name: mini1.name,
      driver1Time: mini1.time,
      driver2Time: driver2Mini[idx]?.time || 0,
      delta: mini1.time - (driver2Mini[idx]?.time || 0)
    }));
  };

  const miniSectors = showMiniSectors ? getMiniSectors() : null;

  const hasComparison = driver1 && driver2 && driver1BestLap && driver2BestLap;

  return (
    <Card className="mb-8 overflow-hidden border-2 border-primary/20" data-testid="driver-comparison-section">
      <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <i className="fas fa-users text-primary"></i>
              DRIVER COMPARISON
            </h2>
            <p className="text-sm text-muted-foreground mt-2">Head-to-head analysis of lap times, sector performance, and race pace</p>
          </div>
          <div className="flex gap-2">
            {telemetryDrivers && (
              <Button
                variant="outline"
                size="sm"
                onClick={syncWithTelemetry}
                title="Sync with telemetry drivers"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Sync with Telemetry
              </Button>
            )}
            {hasComparison && (
              <Button
                variant={showMiniSectors ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMiniSectors(!showMiniSectors)}
                title="Toggle mini sectors view"
              >
                <i className={`fas ${showMiniSectors ? 'fa-eye-slash' : 'fa-eye'} mr-2`}></i>
                {showMiniSectors ? 'Hide' : 'Show'} Mini Sectors
              </Button>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Driver Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Driver 1</label>
            <Select value={driver1} onValueChange={setDriver1}>
              <SelectTrigger data-testid="select-driver1">
                <SelectValue placeholder="Select first driver..." />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.map((driver) => (
                  <SelectItem key={driver} value={driver} disabled={driver === driver2}>
                    {driver}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Driver 2</label>
            <Select value={driver2} onValueChange={setDriver2}>
              <SelectTrigger data-testid="select-driver2">
                <SelectValue placeholder="Select second driver..." />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.map((driver) => (
                  <SelectItem key={driver} value={driver} disabled={driver === driver1}>
                    {driver}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison Display */}
        {!hasComparison ? (
          <div className="text-center py-12">
            <div className="inline-block mb-4">
              <i className="fas fa-user-friends text-6xl text-muted"></i>
            </div>
            <p className="text-muted-foreground text-lg mb-2">Select two drivers to compare</p>
            <p className="text-muted-foreground text-sm">Choose drivers from the dropdowns above</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Lap Time Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/40">
                <CardContent className="p-5">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <p className="text-sm font-semibold text-foreground">{driver1}</p>
                    </div>
                    <p className="text-4xl font-bold text-primary font-mono mb-2" data-testid="driver1-best-lap">
                      {formatTime(driver1BestLap.lapTime)}
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/20 rounded-full">
                      <i className="fas fa-flag text-xs text-primary"></i>
                      <p className="text-xs text-primary font-medium">Lap {driver1BestLap.lapNumber}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/20 to-accent/5 border-accent/40">
                <CardContent className="p-5">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <i className="fas fa-exchange-alt text-accent"></i>
                      <p className="text-sm font-semibold text-foreground">Time Delta</p>
                    </div>
                    <p className={`text-4xl font-bold font-mono mb-2 ${getDeltaColor(driver1BestLap.lapTime - driver2BestLap.lapTime)}`} data-testid="lap-delta">
                      {calculateDelta(driver1BestLap.lapTime, driver2BestLap.lapTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {driver1BestLap.lapTime < driver2BestLap.lapTime ? `${driver1} faster` : `${driver2} faster`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/40">
                <CardContent className="p-5">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-secondary"></div>
                      <p className="text-sm font-semibold text-foreground">{driver2}</p>
                    </div>
                    <p className="text-4xl font-bold text-secondary font-mono mb-2" data-testid="driver2-best-lap">
                      {formatTime(driver2BestLap.lapTime)}
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-secondary/20 rounded-full">
                      <i className="fas fa-flag text-xs text-secondary"></i>
                      <p className="text-xs text-secondary font-medium">Lap {driver2BestLap.lapNumber}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sector Comparison */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <i className="fas fa-layer-group text-primary"></i>
                  Sector Breakdown
                </h3>
                <p className="text-xs text-muted-foreground">Detailed sector-by-sector comparison</p>
              </div>
              
              <div className="space-y-3">
                {/* Sector 1 */}
                <div className="grid grid-cols-3 gap-4 items-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm font-medium text-primary font-mono">
                      {formatTime(driver1BestLap.sector1)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Sector 1</p>
                    <p className={`text-sm font-mono ${getDeltaColor(getSectorDelta(driver1BestLap.sector1, driver2BestLap.sector1))}`}>
                      {getSectorDelta(driver1BestLap.sector1, driver2BestLap.sector1) !== null 
                        ? calculateDelta(driver1BestLap.sector1 || 0, driver2BestLap.sector1 || 0)
                        : "N/A"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-secondary font-mono">
                      {formatTime(driver2BestLap.sector1)}
                    </p>
                  </div>
                </div>

                {/* Sector 2 */}
                <div className="grid grid-cols-3 gap-4 items-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm font-medium text-primary font-mono">
                      {formatTime(driver1BestLap.sector2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Sector 2</p>
                    <p className={`text-sm font-mono ${getDeltaColor(getSectorDelta(driver1BestLap.sector2, driver2BestLap.sector2))}`}>
                      {getSectorDelta(driver1BestLap.sector2, driver2BestLap.sector2) !== null 
                        ? calculateDelta(driver1BestLap.sector2 || 0, driver2BestLap.sector2 || 0)
                        : "N/A"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-secondary font-mono">
                      {formatTime(driver2BestLap.sector2)}
                    </p>
                  </div>
                </div>

                {/* Sector 3 */}
                <div className="grid grid-cols-3 gap-4 items-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm font-medium text-primary font-mono">
                      {formatTime(driver1BestLap.sector3)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Sector 3</p>
                    <p className={`text-sm font-mono ${getDeltaColor(getSectorDelta(driver1BestLap.sector3, driver2BestLap.sector3))}`}>
                      {getSectorDelta(driver1BestLap.sector3, driver2BestLap.sector3) !== null 
                        ? calculateDelta(driver1BestLap.sector3 || 0, driver2BestLap.sector3 || 0)
                        : "N/A"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-secondary font-mono">
                      {formatTime(driver2BestLap.sector3)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span>{driver1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-secondary"></div>
                  <span>{driver2}</span>
                </div>
              </div>
            </div>

            {/* Mini Sectors Breakdown */}
            {showMiniSectors && miniSectors && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <i className="fas fa-th text-primary"></i>
                    Mini Sectors Breakdown
                  </h3>
                  <p className="text-xs text-muted-foreground">Each sector divided into 3 mini sectors for granular analysis</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {miniSectors.map((mini, idx) => {
                    const isFastest = mini.delta < 0;
                    const sectorNumber = mini.name.split('.')[0];
                    return (
                      <div 
                        key={mini.name} 
                        className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                          isFastest 
                            ? 'bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/40' 
                            : 'bg-gradient-to-br from-red-500/20 to-red-500/5 border-red-500/40'
                        }`}
                      >
                        <div className="text-center mb-3">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-background/50 rounded-full">
                            <i className="fas fa-location-arrow text-xs text-primary"></i>
                            <p className="text-xs font-bold text-foreground">{mini.name}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="text-left flex-1">
                              <p className="text-[10px] text-muted-foreground mb-0.5">{driver1}</p>
                              <p className="text-sm font-mono font-bold text-primary">{formatTime(mini.driver1Time)}</p>
                            </div>
                            <div className="flex-shrink-0 mx-2">
                              <div className={`px-2 py-1 rounded font-mono text-xs font-bold ${getDeltaColor(mini.delta)} ${
                                Math.abs(mini.delta) > 0.01 ? 'bg-background/80' : ''
                              }`}>
                                {mini.delta !== 0 ? calculateDelta(mini.driver1Time, mini.driver2Time) : '±0.000s'}
                              </div>
                            </div>
                            <div className="text-right flex-1">
                              <p className="text-[10px] text-muted-foreground mb-0.5">{driver2}</p>
                              <p className="text-sm font-mono font-bold text-secondary">{formatTime(mini.driver2Time)}</p>
                            </div>
                          </div>
                          {/* Visual bar comparison */}
                          <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
                            <div 
                              className={`absolute top-0 left-0 h-full transition-all ${
                                isFastest ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-primary to-primary/60'
                              }`}
                              style={{ width: `${Math.min((mini.driver1Time / Math.max(mini.driver1Time, mini.driver2Time)) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Summary stats for mini sectors */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sectors Won by {driver1}</p>
                          <p className="text-2xl font-bold text-primary">
                            {miniSectors.filter(m => m.delta < 0).length} / {miniSectors.length}
                          </p>
                        </div>
                        <i className="fas fa-trophy text-3xl text-primary/40"></i>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sectors Won by {driver2}</p>
                          <p className="text-2xl font-bold text-secondary">
                            {miniSectors.filter(m => m.delta > 0).length} / {miniSectors.length}
                          </p>
                        </div>
                        <i className="fas fa-trophy text-3xl text-secondary/40"></i>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
