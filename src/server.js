import http from "node:http";
import https from "node:https";
import { spawn } from "node:child_process";

import { getTimeZone, log, LOG_LEVELS, validateEnv } from "./utils.js";

const { HTTP_PORT, OUTPUT_PATH, DEFAULT_BITRATE } = validateEnv();

function fetchIcyMetadata(radioUrl, rawHeaders, callback, redirectCount = 0) {
  if (redirectCount > 5) return callback(null);

  const client = radioUrl.startsWith("https") ? https : http;

  const headers = { ...rawHeaders };
  if (headers["host"]) delete headers["host"];

  const req = client.request(radioUrl, {
    method: "GET",
    headers,
  }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      const nextUrl = new URL(res.headers.location, radioUrl).href;
      res.destroy();
      return fetchIcyMetadata(nextUrl, rawHeaders, callback, redirectCount + 1);
    }

    callback(res.headers);
    res.destroy(); // no need to continue downloading
  });

  req.on("error", (error) => {
    log(error, LOG_LEVELS.DEBUG);
    callback(null);
  });

  req.end();
}


function handleStream(req, res) {
  log(`Incoming request for URL '${req.url}' with method '${req.method}'`);
  log(`Incoming request headers: ${req.rawHeaders}`, LOG_LEVELS.DEBUG);

  const url = new URL('http://dummy.com'+req.url)
  const bitrate = parseInt(url.searchParams.get('_bitrate') ?? DEFAULT_BITRATE)
  const radio = url.searchParams.get('_radio')

  fetchIcyMetadata(radio, req.headers, (headers) => {
    log('radio headers')
    log(headers)

    const responseHeaders = {
      "Content-Type": "audio/opus",
    }

    const transferableHeaders = [
        'icy-description',
        'icy-name',
        'icy-genre',
        'icy-name',
        'icy-pub',
        'icy-url',
    ]

    for(let i = 0; i < transferableHeaders.length; i++) {
      const header = transferableHeaders[i]

      if(headers && headers[header]) {
        responseHeaders[header] = headers[header]
      }
    }

    log('response headers')
    log(responseHeaders)

    res.writeHead(200, responseHeaders);

    const ffmpegProcess = spawn("ffmpeg", [
      "-nostdin",
      "-loglevel", "warning",
      "-thread_queue_size", "512",
      "-re",
      "-probesize", "7500000",
      "-i",
      radio,
      "-vn",
      "-c:a", "libopus",
      "-b:a", bitrate+"k",
      "-vbr", "constrained",
      "-flush_packets", "0",
      "-f", "opus",
      "pipe:1",
    ]);
    ffmpegProcess.stdout.pipe(res);

    log(`Spawned FFmpeg process with PID '${ffmpegProcess.pid}'`);

    ffmpegProcess.stderr.on("data", (data) => {
      log(`stdout: ${data}`, LOG_LEVELS.DEBUG);
    });

    ffmpegProcess.on("data", (error) => {
      log(
          `FFmpeg process with PID '${ffmpegProcess.pid} encountered an error: ${error}`
      );
    });

    ffmpegProcess.on("error", (error) => {
      log(
          `FFmpeg process with PID '${ffmpegProcess.pid} encountered an error: ${error}`
      );
    });

    ffmpegProcess.on("close", (code) => {
      log(
          `FFmpeg process with PID '${ffmpegProcess.pid}' exited with code ${code}`
      );
      res.end();
    });

    req.on("close", () => {
      log(
          `Quitting FFmpeg process with PID '${ffmpegProcess.pid}' …`,
          LOG_LEVELS.DEBUG
      );
      ffmpegProcess.kill();
    });
  });
}

function handleHealthcheck(req, res) {
  log("Healthcheck probed", LOG_LEVELS.DEBUG);
  res.writeHead(200);
  res.end();
}

function handleNotFound(req, res) {
  log(`404 Invalid URL: '${req.url}'`);
  res.writeHead(404);
  res.end();
}

function gracefulShutdown(signal) {
  log(`${signal} received. Stopping server …`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    log("Timeout reached. Shutting down server now …");
    process.exit(1);
  }, 5000);
}

const server = http.createServer(
  { keepAlive: true, keepAliveInitialDelay: 5000 },
  (req, res) => {
    if(req.url.startsWith(OUTPUT_PATH)) {
      handleStream(req, res)
      return
    }

    switch (req.url) {
      case "/healthcheck":
      case "/healthcheck/":
        handleHealthcheck(req, res);
        break;
      default:
        handleNotFound(req, res);
        break;
    }
  }
);

log(`Server timezone: ${getTimeZone()}`);
server.listen(HTTP_PORT);
log(`Server listening on TCP port ${HTTP_PORT} …`);
log(`Stream available at '${OUTPUT_PATH}'`);

process.on("SIGINT", (signal) => gracefulShutdown(signal));
process.on("SIGTERM", (signal) => gracefulShutdown(signal));
