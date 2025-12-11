import { spawn } from "child_process";
import path from "path";
import { F1SessionResponse, F1TelemetryResponse } from "@shared/schema";

class F1Service {
  private pythonPath: string;
  private pythonExecutable: string;

  constructor() {
    this.pythonPath = path.resolve(import.meta.dirname, "../../python/f1_data_fetcher.py");
    this.pythonExecutable = "python3";
  }

  async getSessionData(year: number, gp: string, session: string, drivers?: string[]): Promise<F1SessionResponse> {
    return new Promise((resolve, reject) => {
      const args = [this.pythonPath, "session", year.toString(), gp, session];
      if (drivers && drivers.length > 0) {
        args.push(...drivers);
      }

      const pythonProcess = spawn(this.pythonExecutable, args);
      let dataString = "";
      let errorString = "";

      pythonProcess.stdout.on("data", (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorString += data.toString();
      });

      pythonProcess.on("error", (error) => {
        console.error('Python process error:', error);
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          console.error('Python script error:', errorString);
          reject(new Error(`FastF1 process failed with code ${code}: ${errorString || 'Unknown error'}`));
          return;
        }

        try {
          if (!dataString || dataString.trim() === '') {
            reject(new Error('FastF1 script returned empty output'));
            return;
          }
          const result = JSON.parse(dataString);
          resolve(result);
        } catch (error) {
          console.error('JSON parse error:', error, 'Output:', dataString);
          reject(new Error(`Failed to parse FastF1 response: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
    });
  }

  async getTelemetryData(
    year: number,
    gp: string,
    session: string,
    driver1: string,
    lap1: number,
    driver2?: string,
    lap2?: number
  ): Promise<F1TelemetryResponse> {
    return new Promise((resolve, reject) => {
      const args = [
        this.pythonPath,
        "telemetry",
        year.toString(),
        gp,
        session,
        driver1,
        lap1.toString()
      ];

      if (driver2 && lap2) {
        args.push(driver2, lap2.toString());
      }

      const pythonProcess = spawn(this.pythonExecutable, args);
      let dataString = "";
      let errorString = "";

      pythonProcess.stdout.on("data", (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorString += data.toString();
      });

      pythonProcess.on("error", (error) => {
        console.error('Python process error:', error);
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          console.error('Python script error:', errorString);
          reject(new Error(`FastF1 telemetry process failed with code ${code}: ${errorString || 'Unknown error'}`));
          return;
        }

        try {
          if (!dataString || dataString.trim() === '') {
            reject(new Error('FastF1 telemetry script returned empty output'));
            return;
          }
          const result = JSON.parse(dataString);
          resolve(result);
        } catch (error) {
          console.error('JSON parse error:', error, 'Output:', dataString);
          reject(new Error(`Failed to parse FastF1 telemetry response: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
    });
  }

  async getAvailableGPs(year: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const args = [this.pythonPath, "gps", year.toString()];
      const pythonProcess = spawn(this.pythonExecutable, args);
      let dataString = "";
      let errorString = "";

      pythonProcess.stdout.on("data", (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorString += data.toString();
      });

      pythonProcess.on("error", (error) => {
        console.error('Python process error:', error);
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          console.error('Python script error:', errorString);
          reject(new Error(`FastF1 GP fetch failed with code ${code}: ${errorString || 'Unknown error'}`));
          return;
        }

        try {
          if (!dataString || dataString.trim() === '') {
            reject(new Error('FastF1 GP fetch script returned empty output'));
            return;
          }
          const result = JSON.parse(dataString);
          resolve(result);
        } catch (error) {
          console.error('JSON parse error:', error, 'Output:', dataString);
          reject(new Error(`Failed to parse FastF1 GP response: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
    });
  }
}

export const f1Service = new F1Service();