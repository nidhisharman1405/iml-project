const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const FLASK_PORT = process.env.FLASK_PORT || 5000;
const publicDir = path.join(__dirname, 'public');

const featureNames = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'];

const presetProfiles = {
  'Eco Compact Home': {
    title: 'Eco Compact Home',
    description: 'Single-story residence optimized for passive thermal efficiency',
    features: { X1: 0.86, X2: 588.0, X3: 318.5, X4: 134.75, X5: 3.5, X6: 2, X7: 0.10, X8: 1 },
    context: { project_type: 'Residential', climate_zone: 'Temperate', insulation: 'High', glazing: 'Double' },
  },
  'Two-Story Modern Villa': {
    title: 'Two-Story Modern Villa',
    description: 'Multi-floor residential structure with balanced glazing',
    features: { X1: 0.76, X2: 661.5, X3: 416.5, X4: 122.5, X5: 7.0, X6: 3, X7: 0.25, X8: 2 },
    context: { project_type: 'Residential', climate_zone: 'Cold', insulation: 'High', glazing: 'Triple' },
  },
  'High-Exposure Office': {
    title: 'High-Exposure Office',
    description: 'Commercial building with large floor plate and substantial glazing',
    features: { X1: 0.62, X2: 808.5, X3: 367.5, X4: 220.5, X5: 7.0, X6: 4, X7: 0.40, X8: 4 },
    context: { project_type: 'Office', climate_zone: 'Hot', insulation: 'Medium', glazing: 'Double' },
  },
  'Minimal Glazing Warehouse': {
    title: 'Minimal Glazing Warehouse',
    description: 'Single-level industrial facility with low window-to-wall ratio',
    features: { X1: 0.90, X2: 563.5, X3: 269.5, X4: 147.0, X5: 3.5, X6: 5, X7: 0.00, X8: 0 },
    context: { project_type: 'Retail', climate_zone: 'Temperate', insulation: 'Medium', glazing: 'Single' },
  },
};

const linearModel = {
  intercept: [79.72697958, 100.59454263],
  coefficients: [
    [-61.873354, -0.060105, 0.037553, -0.048829, 4.123669, -0.032439, 20.143192, 0.211103],
    [-71.084528, -0.069220, 0.025423, -0.047322, 4.046160, 0.055210, 14.787587, 0.033740],
  ],
};

function computeRating(totalLoad) {
  if (totalLoad < 30.0) return { grade: 'A+', label: 'Ultra-Low Energy', badge_class: 'badge-a-plus', summary: 'Near-zero passive benchmark.' };
  if (totalLoad < 45.0) return { grade: 'A', label: 'High Efficiency', badge_class: 'badge-a', summary: 'Excellent energy economy.' };
  if (totalLoad < 60.0) return { grade: 'B', label: 'Standard Efficiency', badge_class: 'badge-b', summary: 'Typical modern performance.' };
  if (totalLoad < 75.0) return { grade: 'C', label: 'Moderate Consumption', badge_class: 'badge-c', summary: 'Upgrades advised.' };
  if (totalLoad < 90.0) return { grade: 'D', label: 'High Demand', badge_class: 'badge-d', summary: 'Retrofit strongly recommended.' };
  return { grade: 'E', label: 'Critical Consumption', badge_class: 'badge-e', summary: 'Severe envelope losses.' };
}

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
  };

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });

  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  stream.pipe(res);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Proxy API requests to Flask backend if running
function tryProxyToFlask(req, res, bodyBuffer) {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: FLASK_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${FLASK_PORT}`,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
      resolve(true);
    });

    proxyReq.on('error', () => {
      resolve(false);
    });

    if (bodyBuffer) {
      proxyReq.write(bodyBuffer);
    }
    proxyReq.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Handle API routes
  if (url.pathname.startsWith('/api/')) {
    let bodyBuffer = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      bodyBuffer = await new Promise((resolve) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      });
    }

    const proxied = await tryProxyToFlask(req, res, bodyBuffer);
    if (proxied) return;

    // Fallback standalone API responses if Flask is offline
    if (url.pathname === '/api/config') {
      return sendJson(res, {
        presets: presetProfiles,
        default_model: 'Linear Regression',
        available_models: ['Linear Regression'],
      });
    }

    if (url.pathname === '/api/predict' && req.method === 'POST') {
      try {
        const body = JSON.parse(bodyBuffer.toString() || '{}');
        const vals = featureNames.map((f) => Number(body[f] ?? presetProfiles['Eco Compact Home'].features[f]));
        const y1 = Math.max(0, linearModel.intercept[0] + linearModel.coefficients[0].reduce((s, c, i) => s + c * vals[i], 0));
        const y2 = Math.max(0, linearModel.intercept[1] + linearModel.coefficients[1].reduce((s, c, i) => s + c * vals[i], 0));
        const tot = y1 + y2;
        const avg = tot / 2;

        return sendJson(res, {
          heating_load: Number(y1.toFixed(2)),
          cooling_load: Number(y2.toFixed(2)),
          total_load: Number(tot.toFixed(2)),
          average_load: Number(avg.toFixed(2)),
          model_used: 'Linear Regression (Fallback)',
          rating: computeRating(tot),
          carbon_footprint_kg_m2: Number((tot * 0.21).toFixed(2)),
          estimated_annual_cost_usd_m2: Number((tot * 0.16).toFixed(2)),
          recommendations: ['Consider upgrading insulation and shading windows to optimize energy performance.'],
        });
      } catch (err) {
        return sendJson(res, { error: 'Invalid JSON body' }, 400);
      }
    }

    if (url.pathname === '/api/samples') {
      return sendJson(res, [
        { title: 'Sample 1', features: presetProfiles['Eco Compact Home'].features, actual: { heating_load: 16.47, cooling_load: 16.9 } },
      ]);
    }
  }

  // Serve static files from public/
  const relativePath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
  const safePath = path.normalize(path.join(publicDir, relativePath));

  if (!safePath.startsWith(publicDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(safePath, (error, stats) => {
    if (error || !stats.isFile()) {
      const fallback = path.join(publicDir, 'index.html');
      sendFile(res, fallback);
      return;
    }
    sendFile(res, safePath);
  });
});

server.listen(PORT, () => {
  console.log(`EnergySight AI Node Server running at http://localhost:${PORT} (Proxying to Flask on :${FLASK_PORT})`);
});
