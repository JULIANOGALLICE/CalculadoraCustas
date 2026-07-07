import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";

async function startServer() {
  const app = express();
  const PORT = 3007;

  app.use(express.json());

  // Path to persistent configuration JSON
  const configFilePath = path.join(process.cwd(), "config-store.json");

  // Helper to read configuration
  const readConfig = async () => {
    try {
      const data = await fs.readFile(configFilePath, "utf-8");
      return JSON.parse(data);
    } catch (err: any) {
      // If file doesn't exist or is corrupted, return default configuration
      const defaultConfig = {
        vrcRate: 0.277,
        funarpenPct: 0.0,
        fadepPct: 5.0,
        issPct: 4.0,
        funrejusPct: 0.2,
        tetoFunrejusReais: 8076.67,
        taxaSeloFixoReais: 16.0,
        taxaDistribReais: 12.62
      };
      // Write default config to file so it's initialized
      await fs.writeFile(configFilePath, JSON.stringify(defaultConfig, null, 2), "utf-8");
      return defaultConfig;
    }
  };

  // API Route to GET configuration
  app.get("/api/config", async (req, res) => {
    try {
      const currentConfig = await readConfig();
      res.json(currentConfig);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route to POST (save) configuration
  app.post("/api/config", async (req, res) => {
    try {
      const {
        vrcRate,
        funarpenPct,
        fadepPct,
        issPct,
        funrejusPct,
        tetoFunrejusReais,
        taxaSeloFixoReais,
        taxaDistribReais
      } = req.body;

      const newConfig = {
        vrcRate: vrcRate !== undefined ? vrcRate : 0.277,
        funarpenPct: funarpenPct !== undefined ? funarpenPct : 0.0,
        fadepPct: fadepPct !== undefined ? fadepPct : 5.0,
        issPct: issPct !== undefined ? issPct : 4.0,
        funrejusPct: funrejusPct !== undefined ? funrejusPct : 0.2,
        tetoFunrejusReais: tetoFunrejusReais !== undefined ? tetoFunrejusReais : 8076.67,
        taxaSeloFixoReais: taxaSeloFixoReais !== undefined ? taxaSeloFixoReais : 16.0,
        taxaDistribReais: taxaDistribReais !== undefined ? taxaDistribReais : 12.62,
        updatedAt: new Date().toISOString()
      };

      await fs.writeFile(configFilePath, JSON.stringify(newConfig, null, 2), "utf-8");

      res.json({ success: true, message: "Configurações atualizadas com sucesso para todos os usuários!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
