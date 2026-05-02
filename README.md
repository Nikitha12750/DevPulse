# DevPulse Full-Stack Starter

A clean full-stack project structure with:

- `client`: React (Vite) + Tailwind CSS with dark GitHub-inspired palette
- `server`: Node.js + Express modular REST API

## Project Structure

```text
DevPulse/
  client/
    src/
      App.jsx
      index.css
      main.jsx
  server/
    src/
      config/
      controllers/
      middleware/
      routes/
      services/
      app.js
      server.js
```

## Run the Frontend

```bash
cd client
npm install
npm run dev
```

## Run the Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

## API Endpoint

- `GET /api/health` - health check response
- `GET /api/user/:username` - GitHub user profile and repository summary
  - Includes `analytics`:
    - `totalRepos`
    - `mostUsedLanguage`
    - `languageDistribution` (percentage by language)
    - `avgStars`
    - `mostPopularRepo`
    - `newestRepo`
    - `oldestRepo`
    - `activityScore`
    - `consistencyScore`
    - `languageDiversityScore`
    - `devScore` (weighted: activity 30%, consistency 25%, avg stars 20%, language diversity 25%)
