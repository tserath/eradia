#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# GitHub Container Registry token
# Make sure to set this environment variable before running the script
# You can create a token at https://github.com/settings/tokens
# Token needs 'write:packages' scope
if [ -f .env ]; then
    source .env
fi

if [ -z "$CR_PAT" ]; then
    echo -e "${RED}Error: CR_PAT environment variable is not set${NC}"
    echo -e "${YELLOW}Please either:${NC}"
    echo "1. Create a .env file with: CR_PAT=your_token_here"
    echo "2. Or set it directly: export CR_PAT=your_token_here"
    echo -e "\n${YELLOW}To create a token:${NC}"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Generate new token (classic)"
    echo "3. Select 'write:packages' scope"
    exit 1
fi

# Configuration
IMAGE_NAME="eradia"
GITHUB_USERNAME="tserath"
REGISTRY="ghcr.io"
VERSION=$(date +%Y%m%d-%H%M%S)  # Using timestamp as version

# Full image name
FULL_IMAGE_NAME="${REGISTRY}/${GITHUB_USERNAME}/${IMAGE_NAME}"

# Login to GitHub Container Registry
echo -e "\n${YELLOW}Logging in to GitHub Container Registry...${NC}"
echo "$CR_PAT" | docker login ${REGISTRY} -u ${GITHUB_USERNAME} --password-stdin

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to login to ${REGISTRY}${NC}"
    exit 1
fi

# Build the frontend image
echo -e "\n${YELLOW}Building image: ${FULL_IMAGE_NAME}:${VERSION}${NC}"
docker build -t ${FULL_IMAGE_NAME}:${VERSION} .

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to build image${NC}"
    exit 1
fi

# Tag as latest
echo -e "\n${YELLOW}Tagging image as latest...${NC}"
docker tag ${FULL_IMAGE_NAME}:${VERSION} ${FULL_IMAGE_NAME}:latest

# Push both version and latest tags
echo -e "\n${YELLOW}Pushing image to registry...${NC}"
docker push ${FULL_IMAGE_NAME}:${VERSION}
docker push ${FULL_IMAGE_NAME}:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to push image${NC}"
    exit 1
fi

echo -e "\n${GREEN}Successfully built and pushed:${NC}"
echo "  ${FULL_IMAGE_NAME}:${VERSION}"
echo "  ${FULL_IMAGE_NAME}:latest"

# Deploy command reminder
echo -e "\n${YELLOW}To deploy the new version:${NC}"
echo "  docker pull ${FULL_IMAGE_NAME}:latest"
echo "  docker stop eradia"
echo "  docker rm eradia"
echo "  docker run -d --name eradia -p 80:80 ${FULL_IMAGE_NAME}:latest"
