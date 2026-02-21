# 🧱 BrickTally - Every Brick Counts

A web application to verify LEGO® set completeness by tracking every piece. Perfect for checking second-hand sets before buying or selling, or verifying your collection is complete.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://bricktally.app)

## ✨ Features

- **🔍 Set Verification** - Load any LEGO® set by number and see all required parts
- **✅ Piece Tracking** - Count each piece as you verify your set
- **🎨 Color Filtering** - Filter parts by color to make counting easier
- **📊 Progress Tracking** - Visual progress bar shows your completion status
- **🎉 Completion Celebration** - Fireworks animation when you complete a set
- **💾 Auto-Save** - Your progress is automatically saved to your browser
- **🌓 Dark Mode** - Toggle between light and dark themes
- **📱 Mobile Friendly** - Fully responsive design for tablets and phones
- **🔄 Set History** - Autocomplete with recently loaded sets
- **⛶ Fullscreen Mode** - Focus mode for easier counting
- **📤 Export Options**:
  - Generate verification badges
  - Export missing parts to BrickLink XML
  - Export to Pick a Brick CSV
  - Export to text list

## 🚀 Live Demo

Visit [bricktally.app](https://bricktally.app) to try it out!

## Tech Stack

- **Frontend**: Vanilla JavaScript (no frameworks!)
- **Styling**: Pure CSS with CSS Variables for theming
- **Backend**: Vercel Serverless Functions (Node.js)
- **API**: Rebrickable API for LEGO® parts data
- **Hosting**: Vercel
- **Animation**: Lottie for celebration effects

## Getting Started

### Prerequisites

- Node.js 18+ (for local development)
- A Rebrickable API key ([Get one here](https://rebrickable.com/api/))
- Vercel CLI (optional, for local development)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/bricktally.git
   cd bricktally
   ```

2. **Run setup script**

   ```bash
   ./setup.sh
   ```
   
   This installs git hooks for automatic cache version management.

3. **Set up environment variables**

   ```bash
   # Create .env file
   echo "REBRICKABLE_API_KEY=your_api_key_here" > .env
   ```

4. **Run locally with Vercel Dev**

   ```bash
   # Install Vercel CLI globally
   npm i -g vercel

   # Start dev server
   vercel dev
   ```

5. **Open in browser**

   ```
   http://localhost:3000
   ```

## API Key Setup

1. **Get Rebrickable API Key**:
   - Go to [rebrickable.com/api](https://rebrickable.com/api/)
   - Sign in or create an account
   - Generate an API key

2. **For Local Development**:
   - Add to `.env` file: `REBRICKABLE_API_KEY=your_key`

3. **For Production (Vercel)**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `REBRICKABLE_API_KEY` with your key
   - Apply to Production, Preview, and Development environments

## Project Structure

```
bricktally/
├── index.html           # Main application
├── api/
│   └── rebrickable.js   # Serverless API proxy
├── favicon.svg          # Favicon
├── bricktally-icon.png  # App icon
├── og-image.png         # Social media preview
├── vercel.json          # Vercel configuration (optional)
└── .env                 # Environment variables (local only)
```

## Deployment

Deploy to Vercel with one command:

```bash
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

**Don't forget to set the `REBRICKABLE_API_KEY` environment variable in Vercel!**

## Features in Detail

### Set Loading

- Enter any LEGO® set number
- Handles multiple versions of the same set
- Autocomplete shows recently loaded sets with images

### Part Tracking

- Large +/- buttons optimized for touch screens
- Visual checkmark when part count is complete
- Hide completed parts to focus on what's left
- Filter by color to organize your counting

### Progress & Completion

- Real-time progress bar
- Sticky header with progress when scrolling
- Fireworks celebration on 100% completion
- Persistent state across browser sessions

### Export Options

- **Badge**: Generate shareable verification image
- **BrickLink XML**: Import missing parts to your wanted list
- **Pick a Brick CSV**: Reference list for LEGO.com
- **Text List**: Simple text export of missing pieces

## Security

- API keys are stored server-side only (never exposed to client)
- CORS protection limits API access to authorized domains
- No user data is collected or stored on servers
- All data stays in your browser's localStorage

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- LEGO® parts data provided by [Rebrickable](https://rebrickable.com/)
- LEGO® is a trademark of the LEGO Group
- This project is not affiliated with or endorsed by the LEGO Group

---
Made with ❤️ for LEGO® enthusiasts
