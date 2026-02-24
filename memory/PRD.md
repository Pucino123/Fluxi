# Flux — The AI Productivity OS

## Overview
Flux is a comprehensive productivity dashboard application that merges the structure of Notion, the scheduling of Motion, and the intelligence of a modern workspace into one ethereal interface.

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS, shadcn-ui, Framer Motion, Three.js
- **Backend**: FastAPI (Python), MongoDB
- **Data Persistence**: localStorage (mock Supabase client) for frontend state

## Features
1. **Home/Focus Dashboard** - Timer (Pomodoro, Stopwatch, Countdown), Today's Plan, Audio/Music controls, Goal input
2. **The Council** - AI persona system with 5 advisors (Violet, Leaf, Rose, Blue, Sunny) for decision-making
3. **Inbox** - Quick captures with tabs for Tasks, Mail, and Chat  
4. **Calendar View** - Full calendar with schedule blocks
5. **Analytics View** - Performance metrics and charts
6. **Projects Overview** - Kanban-style project management
7. **Documents View** - Rich document editor with toolbar
8. **Settings** - Theme, preferences, and customization
9. **Focus Page** - Full-screen distraction-free mode with timers and ambient audio
10. **Command Palette** - Quick actions via Cmd+K
11. **Global Search** - Search across all content via Cmd+/
12. **Folder System** - Hierarchical folder organization with CRUD
13. **Task Management** - Full task lifecycle with priority, tags, due dates
14. **Finance Dashboard** - Budget tracking and savings goals
15. **Fitness Tracker** - Workout logging and mood tracking
16. **Grid Dashboard** - Customizable widget-based dashboard with drag-and-drop
17. **Routine Builder Widget** - Build and track daily/weekly routines with streaks
18. **Individual Council Member Widget** - Baymax-style AI avatar with chat interaction
19. **Sticky Notes** - Resizable, colorful notes with Council feedback integration

## Architecture
- Frontend uses a mock Supabase client that persists to localStorage
- Auth is auto-authenticated with a mock user (no real auth required)
- Backend serves API endpoints but frontend operates independently for most features
- Dark mode by default with light mode support
- Mock `functions.invoke()` supports AI-powered features (council analysis, note feedback)

## Completed Work (Feb 2025)
- ✅ Full app replication from GitHub repo
- ✅ Mock Supabase client with localStorage persistence
- ✅ Council feedback on sticky notes (via mock functions.invoke)
- ✅ Slider drag isolation (stopPropagation fix)
- ✅ Chat modal duplicate close button fix
- ✅ Routine Builder Widget (fully functional)
- ✅ Individual Council Member Widget (Baymax-style with chat)
- ✅ Folder/Document context menus with label gap slider

## Upcoming Tasks (Priority Order)
### P1 - High Priority
- [ ] Folder Icon Redesign - Solid-filled, premium icons
- [ ] Folder Right-Click Context Menu (inside folder view)
- [ ] True Free Movement Widgets - Replace react-grid-layout with free-form drag

### P2 - Medium Priority  
- [ ] Today's Plan + Calendar System - Calendar modal with drag-drop scheduling
- [ ] Chat System Upgrade - Contact list, status indicators, email integration

### P3 - Future/Backlog
- [ ] Widgets true free movement (major architectural change)
- [ ] Additional AI persona customization
