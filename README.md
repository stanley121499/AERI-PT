# React TypeScript App with Supabase and Tailwind CSS

A modern React application built with TypeScript, Supabase for backend services, and Tailwind CSS for styling.

## 🚀 Features

- ⚛️ React 18 with TypeScript
- 🎨 Tailwind CSS for styling
- 🗄️ Supabase for database and authentication
- 📦 Create React App (no Vite)
- 🔧 Pre-configured and ready to use

## 📋 Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- A Supabase account and project

## 🛠️ Installation

1. **Clone and navigate to the project:**
   ```bash
   cd aeri-pt-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy `env.sample` to `.env`
   - Fill in your Supabase credentials:
     ```env
     REACT_APP_SUPABASE_URL=your_supabase_project_url
     REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Start the development server:**
   ```bash
   npm start
   ```

## 🔧 Supabase Setup

1. **Create a Supabase project:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Get your project URL and anon key from Settings > API

2. **Add your credentials to `.env`:**
   ```env
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 📁 Project Structure

```
src/
├── lib/
│   └── supabase.ts          # Supabase client configuration
├── App.tsx                  # Main application component
├── App.css                  # Application styles
├── index.tsx                # Application entry point
└── index.css                # Global styles with Tailwind
```

## 🎨 Tailwind CSS

The project is configured with Tailwind CSS. You can use all Tailwind utility classes in your components.

Example:
```tsx
<div className="bg-blue-500 text-white p-4 rounded-lg">
  Hello Tailwind!
</div>
```

## 🗄️ Supabase Usage

The Supabase client is pre-configured and ready to use:

```tsx
import { supabase } from './lib/supabase';

// Example: Fetch data
const { data, error } = await supabase
  .from('your_table')
  .select('*');
```

## 📝 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 🚀 Next Steps

1. Set up your Supabase database tables
2. Implement authentication if needed
3. Build your application features
4. Deploy to your preferred platform

## 📚 Documentation

- [React Documentation](https://reactjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

Happy coding! 🎉