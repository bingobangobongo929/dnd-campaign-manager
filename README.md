# D&D Campaign Manager

A modern web application for Dungeon Masters to organize their tabletop RPG campaigns. Built with Next.js, Supabase, and AI.

## Features

- **Campaign Canvas**: Miro-style infinite canvas with drag-and-drop character cards and smart-snap alignment
- **Character Management**: Create PCs and NPCs with detailed notes, summaries, and Discord-style tags
- **Session Notes**: Rich text editor with formatting, task lists, and AI-powered summarization
- **Campaign Timeline**: Visual timeline of important events with categories and character linking
- **Character Vault**: Store reusable characters that can be copied across campaigns
- **AI Assistant**: Campaign-aware AI helper powered by Claude or Gemini
- **Dark/Light Theme**: Beautiful UI with a "Subtle Warmth" design aesthetic

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: Tailwind CSS with CSS variables
- **Canvas**: React Flow (@xyflow/react)
- **Rich Text**: Tiptap
- **AI**: Vercel AI SDK (Claude & Gemini support)
- **State**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Anthropic API key (for Claude) and/or Google AI API key (for Gemini)

### Setup

1. **Clone and install dependencies**:
   ```bash
   cd dnd-campaign-manager
   npm install
   ```

2. **Set up Supabase**:
   - Create a new Supabase project at https://supabase.com
   - Go to SQL Editor and run the migration file: `supabase/migrations/001_initial_schema.sql`
   - Go to Authentication > Providers and enable Email provider

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ANTHROPIC_API_KEY=your-claude-api-key
   GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
  app/
    (auth)/           # Login/signup pages
    (dashboard)/      # Main app pages
      campaigns/      # Campaign list and canvas
      vault/          # Character vault
      settings/       # User settings
    api/
      ai/             # AI endpoints (expand, summarize, chat)
  components/
    ai/               # AI Assistant component
    canvas/           # React Flow canvas components
    character/        # Character panel
    editor/           # Tiptap rich text editor
    layout/           # Sidebar, header, dashboard layout
    ui/               # Reusable UI components
  hooks/              # Custom React hooks
  lib/
    ai/               # AI configuration
    supabase/         # Supabase client setup
    utils/            # Utility functions
  store/              # Zustand store
  types/              # TypeScript types
```

## Key Features Detail

### Smart Snap on Canvas
When dragging character cards, they automatically snap to align with other cards when edges are within 10px. Visual guide lines appear during alignment.

### Discord-Style Tags
Tags can be assigned to characters with colors and optional character relationships (e.g., "Friend of [Character Name]").

### AI Features
- **Expand**: Expand brief character notes into detailed descriptions
- **Summarize**: Create concise summaries from detailed session notes
- **Assistant**: Chat with an AI that knows your campaign context

### Theme System
Dark mode by default with a warm amber/purple accent palette. Light mode available in settings.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The app is optimized for Vercel's free tier.

## License

MIT
