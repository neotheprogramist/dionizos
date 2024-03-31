#!/usr/bin/env bash

podman run --rm --pull always \
  --name surrealdb \
  -p 8000:8000 \
  docker.io/surrealdb/surrealdb:latest \
  start --log trace --user root --pass root memory
