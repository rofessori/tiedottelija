#!/bin/bash

# Source the installation directory
if [ -f "./install_location.env" ]; then
    source ./install_location.env
else
    echo "Error: install_location.env not found. Please run healthcheck.sh first."
    exit 1
fi

# Navigate to the installation directory
cd "$INSTALL_DIR" || exit 1

# Function to check if a process is running
is_running() {
    pgrep -f "$1" >/dev/null
}

# Function to get the OS type
get_os_type() {
    case "$(uname -s)" in
        Darwin*)    echo "macos" ;;
        Linux*)     echo "linux" ;;
        *)          echo "unknown" ;;
    esac
}

OS_TYPE=$(get_os_type)

# Stop the existing bot process
if is_running "node server.js"; then
    echo "Stopping existing bot process..."
    if [ "$OS_TYPE" = "macos" ]; then
        killall node
    else
        pkill -f "node server.js"
    fi
    sleep 5
fi

# Backup the database
if [ -f "messages.db" ]; then
    echo "Backing up the database..."
    cp messages.db "messages.db.backup-$(date +%Y%m%d-%H%M%S)"
fi

# Clear existing bot.log
echo "Clearing existing bot.log..."
echo "Bot restarted at $(date)" > bot.log

# Check if Docker is being used
if [ -f "docker-compose.yml" ]; then
    echo "Using Docker setup" | tee -a bot.log
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        echo "Error: Docker daemon is not running. Please start Docker and try again." | tee -a bot.log
        exit 1
    fi
    # If using Docker, restart the containers
    echo "Stopping Docker containers..." | tee -a bot.log
    docker-compose down >> bot.log 2>&1
    echo "Starting Docker containers..." | tee -a bot.log
    docker-compose up -d >> bot.log 2>&1
    
    # Wait for the containers to start
    echo "Waiting for containers to start..."
    sleep 15
    
    # Check if containers are running and capture logs
    RUNNING_CONTAINERS=$(docker-compose ps --services --filter "status=running" | wc -l)
    if [ "$RUNNING_CONTAINERS" -eq 0 ]; then
        echo "Error: No Docker containers are running." | tee -a bot.log
        echo "Docker Compose Logs:" | tee -a bot.log
        docker-compose logs >> bot.log 2>&1
        exit 1
    else
        echo "$RUNNING_CONTAINERS Docker containers are running." | tee -a bot.log
        echo "Capturing initial Docker logs:" | tee -a bot.log
        docker-compose logs --tail=50 >> bot.log 2>&1
    fi
else
    echo "Using non-Docker setup" | tee -a bot.log
    # If not using Docker, start the bot directly
    npm install >> bot.log 2>&1
    nohup node server.js >> bot.log 2>&1 &
    if [ "$OS_TYPE" != "macos" ]; then
        disown
    fi
fi

# Wait for the bot to start
echo "Waiting for the bot to start..." | tee -a bot.log
sleep 15

# Check if the bot is running
if is_running "node server.js" || [ "$RUNNING_CONTAINERS" -gt 0 ]; then
    echo "Bot has been successfully restarted." | tee -a bot.log
else
    echo "Error: Bot failed to start. Checking logs..." | tee -a bot.log
    tail -n 50 bot.log
    exit 1
fi

echo "Reboot process completed." | tee -a bot.log