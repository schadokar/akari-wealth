-- Remove akira-bot system user (goals cascade-delete via FK)
DELETE FROM users WHERE username = 'akira-bot';
