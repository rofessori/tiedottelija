#!/bin/bash
# File: ~/tiedottaja/setup_checker.sh

# Find the installation directory
SCRIPT_PATH=$(readlink -f "$0" 2>/dev/null || realpath "$0" 2>/dev/null || echo "$0")
INSTALL_DIR=$(dirname "$SCRIPT_PATH")
echo "Installation directory: $INSTALL_DIR"

# Store the installation directory in a file
echo "INSTALL_DIR=$INSTALL_DIR" > "$INSTALL_DIR/install_location.env"

check_and_install() {
    if ! command -v $1 &> /dev/null; then
        echo "$1 is not installed. Attempting to install..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y $1
        elif command -v yum &> /dev/null; then
            sudo yum install -y $1
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y $1
        elif command -v zypper &> /dev/null; then
            sudo zypper install -y $1
        elif command -v pacman &> /dev/null; then
            sudo pacman -S --noconfirm $1
        elif command -v brew &> /dev/null; then
            brew install $1
        else
            echo "Unable to install $1. Please install it manually."
            exit 1
        fi
    else
        echo "$1 is already installed."
    fi
}

# Check for package manager
if command -v apt-get &> /dev/null || command -v yum &> /dev/null || command -v dnf &> /dev/null || command -v zypper &> /dev/null || command -v pacman &> /dev/null; then
    echo "Package manager found."
elif [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v brew &> /dev/null; then
        echo "Homebrew is not installed. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
        echo "Homebrew is already installed."
    fi
else
    echo "No supported package manager found. Please install dependencies manually."
    exit 1
fi

# Check for Docker
check_and_install docker

# Check for Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose is already installed."
fi

# Check for Node.js and npm
check_and_install nodejs
check_and_install npm

echo "All dependencies are installed. You're ready to go!"

# Function to update other scripts with the installation directory
update_script() {
    local script=$1
    if [[ -f "$INSTALL_DIR/$script" ]]; then
        sed -i.bak "s|cd ~/tiedottaja|cd $INSTALL_DIR|g" "$INSTALL_DIR/$script"
        echo "Updated $script with the correct installation directory."
    else
        echo "Warning: $script not found in $INSTALL_DIR"
    fi
}

# Update other scripts
update_script "check.sh"
update_script "setup.sh"
update_script "setup2.sh"
update_script "reboot.sh"
update_script "reboot-new.sh"

echo "All scripts have been updated with the correct installation directory."