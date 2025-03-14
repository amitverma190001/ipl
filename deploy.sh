#!/bin/bash

# Simple deployment script for IPL Cricket 2025 game

echo "🏏 IPL Cricket 2025 Game Deployment 🏏"
echo "-------------------------------------"
echo "This script will help you deploy the game to GitHub Pages or Netlify."
echo ""

if [ ! -d ".git" ]; then
  echo "Initializing Git repository..."
  git init
  git add .
  git commit -m "Initial commit of IPL Cricket 2025 game"
  echo "Git repository initialized."
  echo ""
fi

echo "Choose deployment option:"
echo "1. GitHub Pages"
echo "2. Netlify"
echo "3. Exit"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
  1)
    echo "📦 Deploying to GitHub Pages..."
    echo ""
    read -p "Enter your GitHub username: " username
    read -p "Enter repository name (default: IPL-Cricket-2025): " repo_name
    
    if [ -z "$repo_name" ]; then
      repo_name="IPL-Cricket-2025"
    fi
    
    echo "Creating GitHub repository: $username/$repo_name"
    echo "Please follow these steps manually:"
    echo ""
    echo "1. Create a new repository on GitHub named '$repo_name'"
    echo "2. Run the following commands:"
    echo ""
    echo "   git remote add origin https://github.com/$username/$repo_name.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    echo "3. Enable GitHub Pages in repository settings:"
    echo "   - Go to Settings > Pages"
    echo "   - Select 'main' branch and '/ (root)' folder"
    echo "   - Click Save"
    echo ""
    echo "4. Your game will be available at: https://$username.github.io/$repo_name"
    ;;
    
  2)
    echo "📦 Deploying to Netlify..."
    echo ""
    echo "Please follow these steps to deploy to Netlify:"
    echo ""
    echo "1. Create a free Netlify account at https://app.netlify.com/signup"
    echo "2. Click 'New site from Git'"
    echo "3. Connect to your Git provider (GitHub, GitLab, etc.)"
    echo "4. Select the repository containing this game"
    echo "5. Configure the build settings (leave blank for static site)"
    echo "6. Click 'Deploy site'"
    echo ""
    echo "Your site will be deployed with a Netlify subdomain (e.g., your-site-name.netlify.app)"
    ;;
    
  3)
    echo "Exiting deployment script."
    exit 0
    ;;
    
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
echo "🎮 Thank you for deploying IPL Cricket 2025! 🎮"