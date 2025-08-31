# Photo Walk Map

Photo walk mapping app with AI missions - 散歩写真マップアプリ

## Features

- **Walk Planning**: Set start and end locations for your photo walk
- **AI Mission Generation**: Automatically generate photography missions based on location and season
- **Real-time GPS Tracking**: Record photo locations during your walk
- **Mission Progress Tracking**: Track completion of photography challenges
- **Photo Upload**: Upload and manage your photos from each walk
- **Personal Photo Map**: View all your photo locations on an interactive map
- **Walk History**: Browse your previous walks and achievements

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **Maps**: Mapbox GL JS
- **AI**: OpenAI API for mission generation
- **Deployment**: Vercel

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up your environment variables in `.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
OPENAI_API_KEY=your_openai_api_key
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Setup

Initialize the database:

```bash
npx prisma migrate dev --name init
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.