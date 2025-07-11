-- Insert sample users (for testing)
INSERT INTO users (email, full_name, phone) VALUES
  ('john.doe@example.com', 'John Doe', '+1234567890'),
  ('jane.smith@example.com', 'Jane Smith', '+1987654321')
ON CONFLICT (email) DO NOTHING;

-- Insert sample transactions
INSERT INTO transactions (sender_id, recipient_email, recipient_name, amount, currency, status, reference_number, notes, recipient_user_id)
SELECT 
  u.id,
  'recipient@example.com',
  'Maria Garcia',
  250.00,
  'USD',
  'completed', -- This one is completed
  'TXN' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
  'Monthly support',
  (SELECT id FROM users WHERE email = 'jane.smith@example.com') -- Link to an existing user for demo
FROM users u WHERE u.email = 'john.doe@example.com'
ON CONFLICT (reference_number) DO NOTHING;

-- Add a transaction in pending_user_start status (recipient exists, ready for claim)
INSERT INTO transactions (sender_id, recipient_email, recipient_name, amount, currency, status, reference_number, notes, recipient_user_id)
SELECT 
  u.id,
  'jane.smith@example.com', -- Existing recipient
  'Jane Smith',
  100.00,
  'USD',
  'pending_user_start', -- Initial status for existing recipient
  'TXN' || LPAD(FLOOR(RANDOM() * 1000000 + 1000000)::TEXT, 6, '0'),
  'Ready for Jane to claim',
  (SELECT id FROM users WHERE email = 'jane.smith@example.com')
FROM users u WHERE u.email = 'john.doe@example.com'
ON CONFLICT (reference_number) DO NOTHING;

-- Add a transaction in pending_invite status (recipient not yet registered)
INSERT INTO transactions (sender_id, recipient_email, recipient_name, amount, currency, status, reference_number, notes)
SELECT 
  u.id,
  'unregistered@example.com',
  'Bob Builder',
  75.00,
  'USD',
  'pending_invite', -- This one is waiting for recipient to register
  'TXN' || LPAD(FLOOR(RANDOM() * 1000000 + 2000000)::TEXT, 6, '0'),
  'Invitation pending'
FROM users u WHERE u.email = 'john.doe@example.com'
ON CONFLICT (reference_number) DO NOTHING;
