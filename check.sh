#!/bin/bash

# File: ~/tiedottaja/setup_checker.sh

check_and_install() {
    if ! command -v $1 &> /dev/null; then
        echo "$1 is not installed. Installing..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install $1
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update && sudo apt-get install -y $1
        else
            echo "Unsupported OS for automatic installation of $1"
            exit 1
        fi
    else
        echo "$1 is already installed."
    fi
}

# Check for Homebrew on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v brew &> /dev/null; then
        echo "Homebrew is not installed. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
        echo "Homebrew is already installed."
    fi
fi

# Check for Docker
check_and_install docker

# Check for Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install docker-compose
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    else
        echo "Unsupported OS for automatic installation of Docker Compose"
        exit 1
    fi
else
    echo "Docker Compose is already installed."
fi

# Check for Node.js and npm
check_and_install node
check_and_install npm

echo "All dependencies are installed. You're ready to go!"
