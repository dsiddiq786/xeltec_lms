# UI Setup Guide

## Prerequisites
- Node.js 18+
- Python 3.9+ (for backend)

## Backend Setup
1. Standard FastAPI setup (see root README)
2. Ensure you are running `uvicorn app.main:app --reload`
3. Important: New endpoints for Editing and Static File serving are now active.

## Frontend Setup
1. `cd ui`
2. `npm install`
3. `npm run dev`

Access UI at http://localhost:5173

## Features
- **Generator**: Create new AI courses with progress tracking.
- **Courses List**: View all generated courses.
- **Course Detail**: 
  - **Editor Tab**: Tree view of course structure. Edit title, text, prompts. **Upload/Replace Images and Audio**.
  - **Preview Tab**: Immersive dark-mode player with audio narration and slide controls.

## Configuration
- `.env` file for VITE_API_URL (default: http://localhost:8000)
