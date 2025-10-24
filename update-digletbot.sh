#!/bin/bash

# update-digletbot.sh
# Script to be executed on the remote host to update the digletbot service
# This script pulls the latest docker images and restarts the digletbot container

set -e

echo "Starting digletbot update..."

# Navigate to the directory containing the docker-compose.yml
# Adjust this path as needed for your deployment
cd /path/to/digletbot || exit 1

echo "Pulling latest docker images..."
docker compose pull

echo "Starting digletbot service..."
docker compose up -d digletbot

echo "Digletbot update completed successfully!"

# Optional: Show the status of the container
docker compose ps digletbot
