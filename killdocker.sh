#!/bin/bash
# File: ~/tiedottaja/kill_docker.sh

echo "This script will stop all running Docker containers, remove all containers, images, and volumes."
read -p "Are you sure you want to proceed? This action is irreversible. Type 'y' to continue or 'n' to abort: " choice

if [[ "$choice" == "y" || "$choice" == "Y" ]]; then
    echo "Stopping all running Docker containers..."
    docker stop $(docker ps -aq)

    echo "Removing all Docker containers..."
    docker rm $(docker ps -aq)

    echo "Removing all Docker images..."
    docker rmi $(docker images -q)

    echo "Pruning Docker system (including volumes)..."
    docker system prune -af --volumes

    echo "Docker cleanup complete."
else
    echo "Operation aborted by the user."
fi