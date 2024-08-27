#!/bin/bash
# File: ~/tiedottaja/kill_docker.sh

echo "Stopping all running Docker containers..."
docker stop $(docker ps -aq)

echo "Removing all Docker containers..."
docker rm $(docker ps -aq)

echo "Removing all Docker images..."
docker rmi $(docker images -q)

echo "Pruning Docker system..."
docker system prune -af --volumes

echo "Docker cleanup complete."