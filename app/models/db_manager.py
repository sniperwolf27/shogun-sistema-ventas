"""
Database Connection Manager — PostgreSQL connection pool
"""
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager


class DatabaseManager:
    _pool = None

    @classmethod
    def initialize(cls, database_url):
        if cls._pool is None:
            try:
                cls._pool = psycopg2.pool.ThreadedConnectionPool(
                    minconn=1, maxconn=20, dsn=database_url
                )
                print("[DB] Connection pool initialized")
            except Exception as e:
                print(f"[DB] WARNING: Could not connect to database: {e}")
                print("[DB] App will retry on first request")
                cls._pending_url = database_url

    @classmethod
    def _ensure_pool(cls):
        """Lazy retry if initial connection failed"""
        if cls._pool is None and hasattr(cls, '_pending_url'):
            cls._pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=1, maxconn=20, dsn=cls._pending_url
            )

    @classmethod
    @contextmanager
    def get_connection(cls):
        cls._ensure_pool()
        if cls._pool is None:
            raise Exception("Database not available")
        conn = cls._pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cls._pool.putconn(conn)

    @classmethod
    @contextmanager
    def get_cursor(cls, dict_cursor=True):
        with cls.get_connection() as conn:
            cursor_factory = RealDictCursor if dict_cursor else None
            cursor = conn.cursor(cursor_factory=cursor_factory)
            try:
                yield cursor
            finally:
                cursor.close()

    @classmethod
    def close_all(cls):
        if cls._pool:
            cls._pool.closeall()
