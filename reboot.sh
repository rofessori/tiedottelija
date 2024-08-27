#!/bin/bash

# File: ~/tiedottaja/reboot.sh

# Ensure we're in the correct directory
cd ~/tiedottaja

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker daemon is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Pull the latest Node.js image
echo "Pulling the latest Node.js image..."
docker pull node:16-alpine

# Build and start the containers
echo "Building and starting Docker containers..."
docker-compose up --build -d

echo "Application is now running."
echo "You can access the frontend at http://localhost:3000"
echo "The backend is running on http://localhost:3001"

# Wait for containers to be ready
echo "Waiting for containers to be ready..."
sleep 15

# Check if containers are running and provide more debug info
RUNNING_CONTAINERS=$(docker ps -q | wc -l)
if [ $RUNNING_CONTAINERS -ne 2 ]; then
    echo "Error: Not all containers are running. $RUNNING_CONTAINERS containers are running."
    echo "Docker Compose Logs:"
    docker-compose logs
    echo "Docker PS output:"
    docker ps -a
    exit 1
fi

echo "Containers are up and running!"