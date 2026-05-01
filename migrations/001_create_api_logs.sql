CREATE TABLE IF NOT EXISTS api_logs (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW (),
  user_id       VARCHAR(100),
  start_date    VARCHAR(20),
  end_date      VARCHAR(20),
  lang          VARCHAR(10),
  status_code   INTEGER NOT NULL,
  error_message TEXT,
  ip_address    VARCHAR(50),
  duration_ms   INTEGER NOT NULL
)