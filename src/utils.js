export const LOG_LEVELS = {
  DEBUG: "DEBUG",
  INFO: "INFO",
};

export function log(message, logLevel = LOG_LEVELS.INFO) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const dateTimeStamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  if (logLevel === LOG_LEVELS.INFO) {
    console.log(`${dateTimeStamp} - ${message}`);
    return;
  }

  if (logLevel === process.env.LOG_LEVEL) {
    console.debug(`${dateTimeStamp} - 🪲 ${message}`);
  }
}

export function getTimeZone() {
  const now = new Date();
  return Intl.DateTimeFormat("en", { timeZoneName: "short" })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName").value;
}

export function validateEnv() {
  if (process.env.LOG_LEVEL == null) {
    process.env.LOG_LEVEL = "INFO";
  }

  if (process.env.OUTPUT_PATH == null) {
    log("'OUTPUT_PATH' environment variable is not set. Defaulting to '/' …");
    process.env.OUTPUT_PATH = "/";
  }

  if (process.env.DEFAULT_BITRATE == null) {
    log("'DEFAULT_BITRATE' environment variable is not set. Defaulting to '128' …");
    process.env.DEFAULT_BITRATE = "128";
  }

  if (process.env.TZ == null) {
    log("'TZ' environment variable is not set. Defaulting to 'UTC' …");
    process.env.TZ = "UTC";
  }

  if (process.env.HTTP_PORT == null) {
    log(
      "'HTTP_PORT' environment variable is not set. Setting to '3000' …",
      LOG_LEVELS.DEBUG
    );
    process.env.HTTP_PORT = "3000";
  }

  return process.env;
}
