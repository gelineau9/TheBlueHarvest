# Database Folder

The db/ folder contains database-related files for TheBlueHarvest:

- **Schema Definitions**: Files that define the structure of the database, including tables, relationships, and constraints.
- **Seed Data**: Scripts to populate the database with initial sample data for development and testing purposes.

These files will be used to set up and maintain the database for the project.

## Local Development Setup

### Prerequisites

- Ensure you have docker installed and working (`docker --version` should return properly)
- `psql` (for seed loading, assumption is you're on Linux/WSL)
  - Install: `sudo apt update && sudo apt install postgresql-client`
  - Verify: `psql --version` (e.g., 16.8).

### Steps to create local PostgreSQL DB

1. Navigate to the root folder:

   ```bash
   cd TheBlueHarvest/
   ```

2. Start PostgreSQL container

   ```bash
   docker compose up -d
   ```

3. Check container is healthy (takes a couple seconds):

   ```bash
   docker ps
   ```

4. Check schema populated:

   ```bash
   psql -h localhost -U merry -d bha_db -c "\dt"
   ```

   - Password: `secondbreakfast` (as see in docker compose file)

5. Update `.env` in `apps/backend`:

   ```text
   DB_HOST=localhost
   DB_USER=merry
   DB_PASSWORD=secondbreakfast
   DB_NAME=bha_db
   DB_PORT=5432
   . . .
   ```

Since we mounted the schema and seed data in `docker-compose.yml` to the proper folders, they will populate the database schema automatically.

### Loading Seed Data

Seed data (`db/seeds/*.sql`) is loaded manually after the schema. Again, this is assuming you're on Linux or WSL.

0. (Optional) For ease of use, feel free to store password in the "PGPASSWORD" environment variable so you don't need to type it out every loop.

   ```bash
   export PGPASSWORD="secondbreakfast"
   ```

1. Apply seeds

   ```bash
   for file in db/seeds/*.sql; do psql -h localhost -U merry -d bha_db -f "$file"; done
   ```

   - Password: `secondbreakfast`

2. Verify data:

   ```bash
    psql -h localhost -U merry -d bha_db
   ```

   - Run `\dt` (list tables) and `SELECT * FROM accounts;` (check sample users like `Deleted-Account`)

### Stopping the Container and Cleanup

1. Stop: `docker-compose down`
2. Reset (clears DB): `docker-compose down -v`
