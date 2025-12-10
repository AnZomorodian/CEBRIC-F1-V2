import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { f1Service } from "./services/f1-service";
import { z } from "zod";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pythonExecutable = path.resolve(__dirname, '../.pythonlibs/bin/python3');

export async function registerRoutes(app: Express): Promise<Server> {
  // Get available GPs for a year
  app.get("/api/f1/gps/:year", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      if (isNaN(year) || year < 2018 || year > 2025) {
        return res.status(400).json({ message: "Invalid year. Must be between 2018-2025" });
      }

      const gps = await f1Service.getAvailableGPs(year);
      res.json(gps);
    } catch (error) {
      console.error("Error fetching GPs:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch GPs" });
    }
  });

  // Get F1 session data
  app.post("/api/f1/session", async (req, res) => {
    try {
      const sessionSchema = z.object({
        year: z.number().min(2018).max(2025),
        gp: z.string().min(1),
        session: z.string().min(1),
        drivers: z.array(z.string()).optional()
      });

      const { year, gp, session, drivers } = sessionSchema.parse(req.body);

      // Check if we have cached data
      let cachedSession = await storage.getF1Session(year, gp, session);
      
      if (!cachedSession) {
        // Fetch from FastF1
        const sessionData = await f1Service.getSessionData(year, gp, session, drivers);
        
        // Store in cache
        cachedSession = await storage.createF1Session({
          year,
          gp,
          session,
          sessionData
        });

        // Store lap data
        for (const lapData of sessionData.laps) {
          await storage.createF1Lap({
            sessionId: cachedSession.id,
            driver: lapData.driver,
            lapNumber: lapData.lapNumber,
            lapTime: lapData.lapTime,
            sector1: lapData.sector1,
            sector2: lapData.sector2,
            sector3: lapData.sector3,
            compound: lapData.compound,
            isPersonalBest: lapData.isPersonalBest ? "true" : "false"
          });
        }

        res.json(sessionData);
      } else {
        // Return cached data
        res.json(cachedSession.sessionData);
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request parameters", errors: error.errors });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch session data" });
    }
  });

  // Get F1 telemetry data
  app.post("/api/f1/telemetry", async (req, res) => {
    try {
      const telemetrySchema = z.object({
        year: z.number().min(2018).max(2025),
        gp: z.string().min(1),
        session: z.string().min(1),
        driver1: z.string().min(1),
        lap1: z.number().min(1),
        driver2: z.string().optional(),
        lap2: z.number().optional()
      });

      const { year, gp, session, driver1, lap1, driver2, lap2 } = telemetrySchema.parse(req.body);

      const telemetryData = await f1Service.getTelemetryData(
        year, gp, session, driver1, lap1, driver2, lap2
      );

      res.json(telemetryData);
    } catch (error) {
      console.error("Error fetching telemetry data:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request parameters", errors: error.errors });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch telemetry data" });
    }
  });

  // Get available years
  app.get("/api/f1/years", async (req, res) => {
    try {
      const years = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
      res.json(years);
    } catch (error) {
      console.error("Error fetching years:", error);
      res.status(500).json({ message: "Failed to fetch available years" });
    }
  });

  // Get available sessions
  app.get("/api/f1/sessions", async (req, res) => {
    try {
      const sessions = [
        { key: 'FP1', name: 'Free Practice 1' },
        { key: 'FP2', name: 'Free Practice 2' },
        { key: 'FP3', name: 'Free Practice 3' },
        { key: 'Q', name: 'Qualifying' },
        { key: 'R', name: 'Race' }
      ];
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch available sessions" });
    }
  });

  // Get downforce analysis
  app.post("/api/f1/downforce-analysis", async (req, res) => {
    try {
      const { year, gp, session, driver, lap } = req.body;
      const pythonPath = path.resolve(__dirname, '../python/f1_data_fetcher.py');
      
      const result = execSync(
        `${pythonExecutable} ${pythonPath} downforce-analysis ${year} "${gp}" ${session} ${driver} ${lap}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
      
      res.json(JSON.parse(result));
    } catch (error) {
      console.error("Error fetching downforce analysis:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch downforce analysis" });
    }
  });

  // Get corner analysis
  app.post("/api/f1/corner-analysis", async (req, res) => {
    try {
      const { year, gp, session, driver, lap } = req.body;
      const pythonPath = path.resolve(__dirname, '../python/f1_data_fetcher.py');
      
      const result = execSync(
        `${pythonExecutable} ${pythonPath} corner-analysis ${year} "${gp}" ${session} ${driver} ${lap}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
      
      res.json(JSON.parse(result));
    } catch (error) {
      console.error("Error fetching corner analysis:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch corner analysis" });
    }
  });

  // Get brake analysis
  app.post("/api/f1/brake-analysis", async (req, res) => {
    try {
      const { year, gp, session, driver, lap } = req.body;
      const pythonPath = path.resolve(__dirname, '../python/f1_data_fetcher.py');
      
      const result = execSync(
        `${pythonExecutable} ${pythonPath} brake-analysis ${year} "${gp}" ${session} ${driver} ${lap}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
      
      res.json(JSON.parse(result));
    } catch (error) {
      console.error("Error fetching brake analysis:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch brake analysis" });
    }
  });

  // Get tire degradation analysis
  app.post("/api/f1/tire-analysis", async (req, res) => {
    try {
      const { year, gp, session, driver, lap } = req.body;
      const pythonPath = path.resolve(__dirname, '../python/f1_data_fetcher.py');
      
      const result = execSync(
        `${pythonExecutable} ${pythonPath} tire-analysis ${year} "${gp}" ${session} ${driver} ${lap}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
      
      res.json(JSON.parse(result));
    } catch (error) {
      console.error("Error fetching tire analysis:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch tire analysis" });
    }
  });

  // Get energy management analysis
  app.post("/api/f1/energy-analysis", async (req, res) => {
    try {
      const { year, gp, session, driver, lap } = req.body;
      const pythonPath = path.resolve(__dirname, '../python/f1_data_fetcher.py');
      
      const result = execSync(
        `${pythonExecutable} ${pythonPath} energy-analysis ${year} "${gp}" ${session} ${driver} ${lap}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
      
      res.json(JSON.parse(result));
    } catch (error) {
      console.error("Error fetching energy analysis:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch energy analysis" });
    }
  });

  // Get weather analysis
  app.post("/api/f1/weather-analysis", async (req, res) => {
    try {
      const { year, gp, session } = req.body;
      const pythonPath = path.resolve(__dirname, '../python/f1_data_fetcher.py');
      
      const result = execSync(
        `${pythonExecutable} ${pythonPath} weather-analysis ${year} "${gp}" ${session}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
      
      res.json(JSON.parse(result));
    } catch (error) {
      console.error("Error fetching weather analysis:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch weather analysis" });
    }
  });

  // Get pit stop analysis
  app.post("/api/f1/pitstop-analysis", async (req, res) => {
    try {
      const { year, gp, session } = req.body;
      const pythonPath = path.resolve(__dirname, '../python/f1_data_fetcher.py');
      
      const result = execSync(
        `${pythonExecutable} ${pythonPath} pitstop-analysis ${year} "${gp}" ${session}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
      
      res.json(JSON.parse(result));
    } catch (error) {
      console.error("Error fetching pitstop analysis:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch pitstop analysis" });
    }
  });

  // Get DRS zone analysis
  app.post("/api/f1/drs-analysis", async (req, res) => {
    try {
      const { year, gp, session, driver, lap } = req.body;
      const pythonPath = path.resolve(__dirname, '../python/f1_data_fetcher.py');
      
      const result = execSync(
        `${pythonExecutable} ${pythonPath} drs-analysis ${year} "${gp}" ${session} ${driver} ${lap}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
      
      res.json(JSON.parse(result));
    } catch (error) {
      console.error("Error fetching DRS analysis:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch DRS analysis" });
    }
  });

  // Get race strategy analysis
  app.post("/api/f1/strategy-analysis", async (req, res) => {
    try {
      const { year, gp, session } = req.body;
      const pythonPath = path.resolve(__dirname, '../python/f1_data_fetcher.py');
      
      const result = execSync(
        `${pythonExecutable} ${pythonPath} strategy-analysis ${year} "${gp}" ${session}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
      
      res.json(JSON.parse(result));
    } catch (error) {
      console.error("Error fetching strategy analysis:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch strategy analysis" });
    }
  });

  // Get race insights
  app.post("/api/f1/race-insights", async (req, res) => {
    try {
      const { year, gp, session } = req.body;
      const pythonPath = path.resolve(__dirname, '../python/f1_data_fetcher.py');
      
      const result = execSync(
        `${pythonExecutable} ${pythonPath} race-insights ${year} "${gp}" ${session}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
      
      res.json(JSON.parse(result));
    } catch (error) {
      console.error("Error fetching race insights:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch race insights" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
