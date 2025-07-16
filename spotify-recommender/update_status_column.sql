-- SQL script to update the users table status column to include 'inactive'
-- This fixes the "Data truncated for column 'status'" error

USE your_database_name; -- Replace with your actual database name

-- First, let's see the current structure
DESCRIBE users;

-- Update the status column to include 'inactive' as a valid option
-- If the column is an ENUM, we need to alter it to include the new value
ALTER TABLE users MODIFY COLUMN status ENUM('active', 'inactive', 'pending_approval') DEFAULT 'active';

-- Alternative: If the column is VARCHAR, this should work without changes
-- But let's make sure it's long enough
-- ALTER TABLE users MODIFY COLUMN status VARCHAR(20) DEFAULT 'active';

-- Check the updated structure
DESCRIBE users;

-- Show current user statuses
SELECT status, COUNT(*) as count FROM users GROUP BY status;
