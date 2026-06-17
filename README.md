# La Liga 2024 Statistics Backend

A production-ready Node.js + TypeScript backend system that integrates with the API-Football v3 API to aggregate and serve La Liga 2024 statistics (Average Yellow Cards and Total Corners).

## Architecture

This project follows **Clean Architecture** principles:
- **Controllers**: Handle HTTP requests (`src/api` and `src/modules/*/` controllers).
- **Services**: Contain business logic and caching layer (`src/modules/*/` services).
- **Jobs**: Background workers that perform synchronization (`src/jobs`).
- **Infrastructure**: Wrappers for external services (Redis, API-Football) (`src/infrastructure`).
- **Data Layer**: Prisma ORM with **MongoDB** (Replica Set) (`src/prisma`).

## Most Important Optimization

**First Run**:
- The application fetches all fixtures for La Liga 2024.
- It concurrently fetches statistics for all finished fixtures (using bottleneck to limit concurrency to 5 requests per second to avoid rate limiting).
- In a full season, this equates to ~380 matches, which means ~381 API calls.

**After Caching**:
- Once fetched, data is aggregated and stored securely in **MongoDB**.
- When clients request data via `GET /api/v1/statistics/...`, it is served directly from a **Redis** cache (with a 24h TTL) or from the database, resulting in **0 external API calls**.

**Future Updates**:
- Calling the `/sync` endpoint will only fetch new fixtures that haven't been processed yet. The `ProcessedFixture` table ensures we never query statistics for the same fixture twice.

## Setup Instructions

### 1. Environment Variables
Create a `.env` file based on the provided `.env.example`:
```bash
cp .env.example .env
```
Ensure you set your API-Football key:
```env
API_FOOTBALL_KEY=your_real_api_key_here
```

### 2. Run the Application in Docker (Recommended)
You can run the entire infrastructure (Node API, Redis, and MongoDB) effortlessly using Docker Compose:
```bash
DOCKER_API_VERSION=1.44 docker-compose up --build -d
```
*(The API will be available at http://localhost:3000)*

### 3. Run Locally for Development
If you prefer to run the Node.js API locally while using Docker for the databases:

1. Start only the databases:
```bash
docker-compose up -d mongodb redis
```

2. **Important**: Because MongoDB runs as a replica set inside Docker, your `.env` connection string must force a direct connection so your local machine doesn't try to look up the Docker-internal `mongodb` hostname:
```env
DATABASE_URL="mongodb://localhost:27018/statistics?directConnection=true"
```

3. Install dependencies and generate the Prisma Client:
```bash
npm ci
npx prisma generate
```

4. Run the development server (with hot-reload):
```bash
npm run dev
```

### 4. Managing Docker Containers

**To remove broken containers before building (Fixes ContainerConfig errors):**
```bash
docker-compose rm -fs
```

**To start or rebuild everything in the background:**
```bash
DOCKER_API_VERSION=1.44 docker-compose up --build -d
```

**To pause / stop the server (without deleting data):**
```bash
docker-compose stop
```

**To completely delete the containers (but keep the database safe):**
```bash
docker-compose down
```

**To completely delete EVERYTHING including your database (Danger!):**
```bash
docker-compose down -v
```

## API Usage

*(Note: Data synchronization from API-Football happens completely automatically in the background whenever a user requests statistics for a league that isn't cached yet).*

### 1. Get Statistics
Retrieve the aggregated statistics.
**Endpoint**: `GET /api/v1/statistics/la-liga/2024`

### 2. Export to Excel
You can download the statistics as an Excel file using either of these endpoints:
**Endpoint Option 1**: `GET /api/v1/statistics/la-liga/2024/export`
**Endpoint Option 2**: `GET /api/v1/statistics/la-liga/2024?format=excel`

## Testing

Run the unit test suite via Vitest:
```bash
npm test
```
