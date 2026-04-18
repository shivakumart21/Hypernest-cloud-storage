require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const port = 3000;

// Supabase Credentials (loaded from .env for security)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);
  // Handle Proxy Upload to bypass RLS
  if (req.url === '/proxy-upload' && req.method === 'POST') {
    try {
      const fileName = req.headers['x-file-name'];
      const userId = req.headers['x-user-id'];
      const contentType = req.headers['content-type'];

      if (!fileName || !userId) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'Missing headers' }));
      }

      let chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        console.log(`Proxying upload for ${fileName} (${userId})...`);

        const { data, error } = await supabase.storage
          .from('user-files')
          .upload(`${userId}/${fileName}`, buffer, {
            contentType: contentType,
            upsert: true
          });

        if (error) {
          console.error("Proxy Upload Error:", error.message);
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        } else {
          console.log("Proxy Upload Success!");
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, path: data.path }));
        }
      });
      return;
    } catch (err) {
      console.error("Server Crash:", err);
      res.writeHead(500);
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // Handle Proxy List to bypass RLS
  if (req.url === '/proxy-list' && req.method === 'GET') {
    try {
      const userId = req.headers['x-user-id'];
      if (!userId) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'Missing userId header' }));
      }

      console.log(`Proxying list for user: ${userId}...`);
      const { data, error } = await supabase.storage
        .from('user-files')
        .list(userId);

      if (error) {
        console.error("Proxy List Error:", error.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      } else {
        res.writeHead(200);
        res.end(JSON.stringify(data));
      }
      return;
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // Handle Static Files
  let filePath = '.' + req.url.split('?')[0];
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        if (req.url.includes('proxy-')) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Proxy route not found. Did you restart the server?' }));
        }
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}/`);
  console.log('📁 RLS Proxy Active - Uploads will now work automatically!');
});
