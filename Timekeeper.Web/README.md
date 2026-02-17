# Timekeeper.Web - Modern React Frontend

Modern, futuristic React-based UI for the Timekeeper time tracking application.

## Tech Stack

- **React 19** with TypeScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality, customizable components
- **Tanstack Query (React Query)** - Powerful data fetching and caching
- **Tanstack Table** - Headless table library for advanced data tables
- **React Router** - Client-side routing
- **Recharts** - Charts and data visualization
- **date-fns** - Date manipulation
- **cmdk** - Command palette
- **dnd-kit** - Drag and drop functionality
- **Lucide React** - Beautiful icon library

## Project Structure

```
src/
├── api/            # API client functions
├── components/     
│   ├── ui/         # shadcn/ui base components
│   ├── Layout/     # Layout components (Sidebar, TopBar, AppShell)
│   ├── Timer/      # Timer-specific components
│   ├── DataTable/  # Reusable table components
│   └── Dialogs/    # Modal/dialog components
├── hooks/          # Custom React hooks for data fetching
├── lib/            # Utility functions
├── pages/          # Page components (routes)
├── store/          # State management (if needed)
├── types/          # TypeScript type definitions
├── App.tsx         # Main app component with routing
├── main.tsx        # Application entry point
└── index.css       # Global styles and Tailwind directives
```

## Development

### Prerequisites

- Node.js 18+ and npm
- .NET 8 SDK (for backend API)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Start the backend API (from root directory):
   ```bash
   .\run-api.ps1
   ```

The app will be available at http://localhost:5173 and will proxy API requests to http://localhost:5000.

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (outputs to `../Timekeeper.Api/wwwroot`)
- `npm run preview` - Preview production build locally
- `npm run lint` - Type-check TypeScript files

## Features

### Completed
- ✅ Modern sidebar navigation with collapsible menu
- ✅ Live timer status in top bar
- ✅ Dark mode toggle
- ✅ Dashboard with quick timer controls
- ✅ TypeScript API client with full type safety
- ✅ React Query integration for data fetching
- ✅ Routing for all main pages

### In Progress
- 🔨 Advanced data tables with filtering, sorting, column management
- 🔨 Calendar view for time entries
- 🔨 Charts and analytics
- 🔨 Command palette (Ctrl+K)
- 🔨 Drag-and-drop interactions
- 🔨 Task selector with hierarchy display
- 🔨 Complete CRUD operations for all entities
- 🔨 Import/Export functionality
- 🔨 Settings page with preferences

### Planned
- ⏳ Keyboard shortcuts system
- ⏳ Mobile responsive design improvements
- ⏳ Browser notifications
- ⏳ Offline support with service workers

## Design System

The application uses a futuristic design with:
- **Primary Colors**: Purple gradient (from #667eea to #764ba2)
- **Dark Mode**: Full dark theme support with custom color schemes
- **Typography**: System font stack for optimal performance
- **Spacing**: Consistent spacing scale
- **Animations**: Smooth transitions and micro-interactions

## API Integration

The frontend communicates with the Timekeeper.Api backend through:
- RESTful API calls using `fetch`
- Type-safe API client in `src/api/`
- React Query for caching and optimistic updates
- Automatic cache invalidation on mutations

API Base URL: `/api` (proxied to http://localhost:5000 in development)

## Building for Production

```bash
npm run build
```

This builds the app to `../Timekeeper.Api/wwwroot`, where it will be served by the .NET API as static files.

## Contributing

When adding new features:
1. Create TypeScript types in `src/types/`
2. Add API functions in `src/api/`
3. Create React Query hooks in `src/hooks/`
4. Build UI components in `src/components/`
5. Use the existing design system and components

## License

ISC
