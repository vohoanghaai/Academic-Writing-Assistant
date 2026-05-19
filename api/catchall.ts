export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

let appModule: any;

export default async function handler(req: any, res: any) {
  try {
    if (!appModule) {
      appModule = await import('../app');
      // Resolve the default export if needed
      if (appModule.default && typeof appModule.default === 'function') {
        appModule = appModule.default;
      } else if (appModule.default && appModule.default.default) {
        appModule = appModule.default.default;
      }
    }

    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
    }
    
    return appModule(req, res);
  } catch (err: any) {
    console.error("Vercel Startup Error:", err);
    res.status(500).json({ error: "Function startup failed inside handler", details: err.message, stack: err.stack });
  }
}
