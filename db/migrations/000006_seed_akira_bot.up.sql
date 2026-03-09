-- Seed akira-bot system user with suggested goal templates
-- Password: akira-bot@123 (bcrypt cost 10)
INSERT OR IGNORE INTO users (id, username, password_hash)
VALUES (0, 'akira-bot', '$2b$10$aZVS1/orqztUHHpvnGmoqOb6S6zLyz3ZNNSPG1iO80wGIPdIsZtWW');

-- 19 suggested goal templates — no goal_mappings (template goals have no linked assets)
INSERT OR IGNORE INTO goals (user_id, name, target_amount, status, priority, target_date, notes)
VALUES
  -- P1: Essential / Non-Negotiable
  ((SELECT id FROM users WHERE username = 'akira-bot'), 'Emergency Fund',                        0, 'active', 1, '2026-12-31', '6× monthly expenses in liquid savings'),
  ((SELECT id FROM users WHERE username = 'akira-bot'), 'Retirement Corpus',                     0, 'active', 2, '2050-01-01', '25–30× annual expenses via equity + NPS/EPF'),
  ((SELECT id FROM users WHERE username = 'akira-bot'), 'Loan Prepayment',                       0, 'active', 2, '2028-01-01', 'Reduce outstanding home/personal loan principal'),
  ((SELECT id FROM users WHERE username = 'akira-bot'), 'First ₹1 Crore',                        0, 'active', 2, '2032-01-01', 'First crore milestone across all investments'),
  -- P3: Moderate / Standard
  ((SELECT id FROM users WHERE username = 'akira-bot'), 'Car Purchase',                          0, 'active', 3, '2027-06-01', 'New car purchase corpus'),
  ((SELECT id FROM users WHERE username = 'akira-bot'), 'Gadgets / Electronics',                 0, 'active', 4, '2026-12-31', 'Phone, laptop, or gadget upgrade fund'),
  ((SELECT id FROM users WHERE username = 'akira-bot'), 'Vacation',                     0, 'active', 4, '2026-12-31', 'Travel budget');
  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'Hobby / Side Project Fund',              0, 'active', 4, '2027-12-31', 'Personal interest or side project capital'),
  -- P5: Aspirational / Optional
  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'Second Home',                           0, 'active', 5, '2040-01-01', 'Second property purchase or holiday home'),
  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'Children''s Marriage Fund',              0, 'active', 5, '2045-01-01', 'Long-horizon family milestone fund'),
  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'Business / Startup Fund',                0, 'active', 5, '2035-01-01', 'Capital for own venture or side business');

  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'Clear Credit Card Debt',                0, 'active', 1, '2026-06-30', 'Pay off outstanding credit card balance'),
  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'Term Life Insurance Premium Corpus',    0, 'active', 1, '2026-03-31', 'Set aside 1 year term insurance premium'),
  -- P2: Important / High Priority
  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'Home Renovation',                       0, 'active', 3, '2028-01-01', 'Interior renovation fund'),
  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'International Vacation',                0, 'active', 3, '2027-10-01', 'International trip savings'),
  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'Gold Purchase',                         0, 'active', 3, '2027-03-01', 'Physical gold / sovereign gold bonds'),
  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'PPF Maturity Corpus',                   0, 'active', 3, '2035-01-01', 'PPF 15-year maturity target'),
  -- P4: Flexible / Low Priority
  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'Home Down Payment',                     0, 'active', 2, '2030-01-01', '20% of target property value'),
  -- ((SELECT id FROM users WHERE username = 'akira-bot'), 'Child''s Education Fund',               0, 'active', 2, '2040-01-01', 'Higher education corpus via SSY/MF'),