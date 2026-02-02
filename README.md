# 🎯 Online Bingo

A real-time, multiplayer online bingo game built with Next.js, Supabase, and modern web technologies. Perfect for hosting virtual bingo nights with friends, family, or large groups!

## ✨ Features

### 🎮 Game Master Features
- **Create Sessions**: Start new bingo games with custom titles
- **Real-time Draw Control**: Draw random bingo numbers with a single click
- **Participant Management**: See all connected players in real-time
- **Session States**: Automatic state management (Lobby → Live → Ended)
- **QR Code Generation**: Instant QR codes for easy player joining
- **Draw History**: Complete history of all drawn numbers with timestamps
- **Next Round Support**: Seamlessly transition to a new round, automatically migrating all players
- **Customizable Winning Rules**: Configure multiple winning patterns:
  - Single Line (Horizontal/Vertical)
  - Two Lines
  - Full House / Blackout
  - Four Corners
  - Diagonal
  - X Pattern
  - Plus / Cross Pattern
  - Custom Numbers
- **Visual Card Monitoring**: See thumbnail views of all player cards with their progress
- **Personalized Card**: Game Master gets their own bingo card with color selection

### 👥 Player Features
- **Easy Join**: Enter a 6-character session code or scan QR code
- **Random Card Generation**: Each player gets a unique 5×5 bingo card
- **Color Customization**: Choose from 4 card colors (Blue, Red, Orange, Black)
- **Manual Marking**: Tap cells to mark numbers on your card
- **Visual Feedback**: Clear indicators for drawn numbers (colored borders)
- **Live Updates**: Real-time number draws with animated popups
- **Winning Pattern Display**: Visual thumbnails showing active winning patterns
- **Session Transitions**: Automatic redirect when sessions end or transition to next round

### 🔄 Real-time Features
- **Live Number Draws**: Instant updates when Game Master draws a number
- **Session State Sync**: All players see state changes in real-time
- **Participant Tracking**: Live participant list updates
- **Automatic Redirects**: Players redirected to home when session ends
- **Round Transitions**: Seamless transitions to next rounds with preserved player data

### 🎨 User Experience
- **Tabbed Interface**: Clean home page with separate Create/Join tabs
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **3D Card Effects**: Modern card-based UI with depth and shadows
- **Animated Transitions**: Smooth animations for number draws and state changes
- **Color-Coded Cards**: Visual distinction between different player cards
- **Dark Mode Ready**: Built with Tailwind CSS theming support
- **Mobile Drawer**: Collapsible sidebar on mobile for better space utilization

### 🔐 Security & Auth
- **Anonymous Authentication**: Quick start with Supabase anonymous auth
- **Session-based Access**: Role-based permissions (GM vs Player)
- **Secure RPC Functions**: Database operations through secure Supabase RPC

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account and project
- npm, yarn, pnpm, or bun package manager

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd bingo
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the migrations in `supabase_migrations/` directory
   - Update your Supabase URL and anon key in your environment

4. **Configure environment variables**
Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

6. **Open in browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **Language**: TypeScript
- **Database & Auth**: [Supabase](https://supabase.com)
- **Real-time**: Supabase Realtime (Postgres CDC)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Icons**: [Lucide React](https://lucide.dev)

## 📁 Project Structure

```
bingo/
├── app/
│   ├── page.tsx              # Home page with tabs (Create/Join)
│   ├── gm/[code]/page.tsx    # Game Master dashboard
│   ├── join/[code]/page.tsx  # Player join & nickname entry
│   └── play/[code]/page.tsx  # Player bingo card view
├── components/ui/            # shadcn/ui components
├── lib/
│   ├── auth.ts              # Anonymous authentication
│   ├── bingoCard.ts         # Card generation & utilities
│   ├── realtime.ts          # Real-time subscriptions
│   ├── rpc.ts               # Supabase RPC functions
│   ├── transitions.ts       # Session transition handling
│   └── supabaseClient.ts    # Supabase client config
└── supabase_migrations/     # Database migrations
```

## 🎯 How to Play

### As Game Master:
1. Click "Create Session" tab on home page
2. Enter a session title and click "Create Session"
3. Share the QR code or 6-character code with players
4. Configure winning rules in the lobby
5. Click "Draw Next Number" to start the game
6. Continue drawing numbers until someone wins
7. End session or start a new round

### As Player:
1. Click "Join Session" tab on home page
2. Enter the 6-character session code
3. Choose your nickname and card color
4. Wait for Game Master to start drawing
5. Tap numbers on your card to mark them
6. Match the winning pattern to win!

## 🔧 Configuration

### Winning Patterns
Winning rules can be configured before the session starts:
- Multiple patterns can be active simultaneously
- Custom numbers allow for unique winning conditions
- Rules are locked once the first number is drawn

### Card Colors
Players can choose from 4 card themes:
- 🔵 Blue (default)
- 🔴 Red
- 🟠 Orange
- ⚫ Black

## 📱 Responsive Design

- **Desktop**: Full 3-column layout with sidebar, draw controls, and QR/card
- **Tablet**: Optimized 2-column layout
- **Mobile**: Single column with drawer navigation

## 🚢 Deployment

### Deploy on Vercel
1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Deploy on Other Platforms
This Next.js app can be deployed on any platform supporting Node.js:
- Netlify
- Railway
- Render
- AWS Amplify
- Self-hosted with Docker

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Real-time powered by [Supabase](https://supabase.com)
- QR codes via [QR Server API](https://goqr.me/api/)
