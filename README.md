# 📻 racoder - OPUS, customizable bitrate and radio input stream at runtime

[![Docker Image](https://github.com/paulgalow/racoder/actions/workflows/docker-image.yml/badge.svg)](https://github.com/paulgalow/racoder/actions/workflows/docker-image.yml)
[![GitHub release (with filter)](https://img.shields.io/github/v/release/paulgalow/racoder)](https://hub.docker.com/r/paulgalow/racoder/tags)
[![Docker Image Size (tag)](https://img.shields.io/docker/image-size/paulgalow/racoder/latest)](https://hub.docker.com/r/paulgalow/racoder/tags)
[![GitHub](https://img.shields.io/github/license/paulgalow/racoder)](https://github.com/paulgalow/racoder/blob/main/LICENSE)

Racoder is a lightweight Node.js web server that leverages [FFmpeg](https://ffmpeg.org/) to transcode Internet radio and video streams into HTTP MP3 streams. It supports a variety of input stream formats, including HLS, MPEG-DASH, and RTMP – essentially, anything that FFmpeg can handle.

## Use cases

- Stream Internet radio streams using different audio codecs (like AAC) to devices that only support MP3 playback
- Play HLS and MPEG-DASH streams on devices that don't support those protocols
- Transcode live video streams into audio only versions

## Design goals and trade-offs

- Minimize server requirements
  - Racoder runs inside a container with 256 MB of RAM and consumes very little CPU
- Minimize traffic volume
  - Racoder will only pull from an upstream source during the time a stream is requested
- Aimed at small (private) deployments
  - Each request spawns a separate instance of FFmpeg which consumes additional memory (approx. 20 MB of RAM per active stream) and network bandwidth

## Configuration options

Configuration options are set using environment variables.

| Name            | Description                                                                  | Default value | Example        |
|-----------------|------------------------------------------------------------------------------|---------------|----------------|
| LOG_LEVEL       | Level of detail for log output                                               | `INFO`        | `DEBUG`        |
| OUTPUT_PATH     | URL path for output OPUS stream, please do not use `/`, always add some path | `/play`       | `/my-station`  |
| DEFAULT_BITRATE | Default transcoding bitrate for output OPUS stream in kilobytes              | `128`         | `32`           |
| TZ              | Timezone for log timestamps                                                  | `UTC`         | `Europe/Berlin` |

Then call OUTPUT_PATH with these query parameters:

| Name     | Description                                             | Example                                                                             |
|----------|---------------------------------------------------------|-------------------------------------------------------------------------------------|
| _radio   | ℹ️ Required. URL for incoming stream                    | `https://artesimulcast.akamaized.net/hls/live/2030993/artelive_de/master_v180.m3u8` |
| _bitrate | Transcoding bitrate for output OPUS stream in kilobytes | `32`                                                                                |

Full example url with default setup would then look like:
```
http://localhost:3000/play?_radio=https%3A%2F%2Fartesimulcast.akamaized.net%2Fhls%2Flive%2F2030993%2Fartelive_de%2Fmaster_v180.m3u8&_bitrate=32
```

## How to deploy

Pre-built Docker images for different architectures are available on [Docker Hub](https://hub.docker.com/r/paulgalow/racoder/) and the [GitHub Container Registry](https://github.com/paulgalow/racoder/pkgs/container/racoder/versions?filters%5Bversion_type%5D=tagged). Deploy using Docker Compose on a small home server like a Raspberry Pi or host it (for free) on fly.io.

### Using Docker Run

Let's use a simple example and deploy an instance on our local client machine:

```sh
docker run \
  --rm \
  --read-only \
  --cap-drop ALL \
  --name racoder \
  --publish 3000:3000/tcp \
  --env INPUT_STREAM="https://as-hls-ww-live.akamaized.net/pool_26173715/live/ww/bbc_radio_four_extra/bbc_radio_four_extra.isml/bbc_radio_four_extra-audio%3d96000.norewind.m3u8" \
  paulgalow/racoder:latest
```

Racoder will serve its output stream at `http://<hostname>:3000/`. So for this example open `http://localhost:3000/` in your browser or media player of choice (like VLC, QuickTime, …) to listen to the output stream.

Here we are using the [BBC Radio 4 Extra HLS AAC stream](https://gist.github.com/bpsib/67089b959e4fa898af69fea59ad74bc3) as input, but it does not have to be an audio HLS stream. Streams using MPEG-DASH are supported as well, as are video HLS/MPEG-DASH streams.

### Using Docker Compose

- [Simple Compose file example](https://github.com/paulgalow/racoder/blob/main/examples/docker-compose.simple.yml)
- [Extended Compose file example](https://github.com/paulgalow/racoder/blob/main/examples/docker-compose.extended.yml)

### Using fly.io

- [Simple Fly.io TOML example](https://github.com/paulgalow/racoder/blob/main/examples/fly.simple.toml)
- [Extended Fly.io TOML example](https://github.com/paulgalow/racoder/blob/main/examples/fly.extended.toml)
