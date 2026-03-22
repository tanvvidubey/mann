# Database migrations (Alembic)

Mann uses **Alembic** for schema migrations. Manual SQL is no longer used.

## Setup

From the **backend** directory:

```bash
cd backend
pip install -r requirements.txt   # includes alembic
export DATABASE_URL="postgresql://user:pass@host:port/mann"   # or use .env
```

## Commands

- **Apply all pending migrations**
  ```bash
  alembic upgrade head
  ```

- **Create a new migration (after changing `database.py`)**
  ```bash
  alembic revision -m "describe_your_change"
  ```
  Then edit `alembic/versions/xxx_describe_your_change.py` with `upgrade()` and `downgrade()`.

- **Current revision**
  ```bash
  alembic current
  ```

- **History**
  ```bash
  alembic history
  ```

Migrations are idempotent where possible (e.g. `ADD COLUMN IF NOT EXISTS` on PostgreSQL) so you can run `alembic upgrade head` on existing DBs or after `init_db()`.
