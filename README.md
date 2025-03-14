# IPL Cricket 2025 Game: Kohli vs Rohit

A 3D cricket batting game where players can choose between Virat Kohli and Rohit Sharma to hit sixes with swipe controls.

## Features

- **Player Selection**: Choose between two legendary Indian batsmen: Virat Kohli and Rohit Sharma
- **3D Graphics**: Fully 3D cricket stadium with realistic physics using Three.js
- **Swipe Controls**: Intuitive swipe controls for batting (works on both mobile and desktop)
- **Realistic Gameplay**: Different players have different power, technique, and timing abilities
- **Dynamic Scoring**: Score runs based on shot direction and power with animated notifications

## How to Play

1. Select your favorite batsman
2. Swipe/drag to hit the ball
3. The direction and speed of your swipe determines shot direction and power
4. You get 6 balls to score as many runs as possible
5. Hit boundaries for 4 or 6 runs!

## Local Development

### Prerequisites

- A modern web browser
- Local web server (to avoid CORS issues with modules)

### Running Locally

The simplest way to run the game locally is to use a small web server. Here are a few options:

**Using Python:**
```bash
# If you have Python installed
cd /path/to/IPLGame
python -m http.server 8000

# Then open http://localhost:8000 in your browser
```

**Using Node.js:**
```bash
# If you have Node.js installed
npm install -g http-server
cd /path/to/IPLGame
http-server

# Then open http://localhost:8080 in your browser
```

## Deployment

### Deploying to GitHub Pages

1. Create a GitHub repository
2. Push this code to the repository
3. Enable GitHub Pages in the repository settings
4. The game will be available at `https://yourusername.github.io/repository-name`

### Deploying to Netlify

1. Sign up for a free Netlify account
2. Connect your GitHub repository
3. Select the IPLGame repository
4. Click Deploy
5. The game will be deployed with a Netlify subdomain (e.g., `your-site-name.netlify.app`)

## Technical Details

This game was built using:

- HTML5 & CSS3
- JavaScript (ES6+)
- Three.js for 3D rendering
- Custom physics implementation for ball movement

## License

This project is open source and available under the MIT License.

## Credits

Created for IPL Cricket 2025 promotional activities.