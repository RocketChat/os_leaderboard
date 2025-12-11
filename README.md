# GitRank - GitHub Leaderboard

A static, secure, and automated leaderboard for tracking GitHub contributions across repositories and organizations.

## Features
* **Git-Scraping**: Data is fetched securely via GitHub Actions. No tokens are exposed to the client.
* **Static Site**: Built with React + Vite, deployable anywhere (GitHub Pages, Netlify, S3).
* **Configurable**: Easily track specific repos, organizations, or users via a JSON config.
* **Automated**: Updates automatically on a schedule.

## Setup & Configuration

### 1. Configure Repositories
You have two options for configuration:

**Option A: File-based (Standard)**
Edit `leaderboard.config.json` in this repository.

**Option B: Issue-based (No Commits)**
To avoid polluting your commit history when adding users:
1. Create a new Issue in your repository.
2. Add the label `leaderboard-config` to it.
3. Paste your JSON config inside a code block in the issue body:
   ```json
   {
     "repos": ["facebook/react"],
     "orgs": [],
     "users": ["new-user-1", "new-user-2"]
   }
   ```
4. The workflow will automatically prefer this issue's content over the file.

### 2. Setup GitHub Token
1. Go to your Repository Settings > Secrets and variables > Actions.
2. Add a New Repository Secret named `GITHUB_TOKEN`.
   * Note: The default `GITHUB_TOKEN` provided by Actions might be sufficient for public repos, but for private repos or higher rate limits, use a Personal Access Token (PAT).

### 3. Run Locally
1. Install dependencies: `npm install`
2. Create a `.env` file with `GITHUB_TOKEN=your_token`
3. Fetch data: `npm run update-data`
4. Start app: `npm run dev`

## Deployment & Artifacts

The `.github/workflows/update-leaderboard.yml` workflow is a complete CI/CD pipeline that:
1. **Runs every 6 hours** (or manually).
2. **Fetches latest data** using your config and saves it to `public/data.json`.
3. **Commits the data** back to the repo (Git-Scraping history).
4. **Builds the static site** (React + Vite).
5. **Uploads Artifacts**:
   * `static-site`: The fully built website (HTML/CSS/JS), ready to host anywhere.
   * `data-backup-{run_id}`: A standalone copy of the fetched data.

You can download these artifacts from the "Actions" tab in your repository.
