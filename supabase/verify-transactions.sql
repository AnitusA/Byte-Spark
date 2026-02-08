-- Verify that points are being awarded correctly with captain/organizer IDs

-- 1. Check all transactions with who gave the points
SELECT 
    t.id as transaction_id,
    t.amount,
    t.description,
    t.created_at,
    rookie.name as rookie_name,
    rookie.github_username as rookie_github,
    giver.name as given_by_name,
    giver.github_username as given_by_github,
    giver.role as given_by_role
FROM transactions t
JOIN members rookie ON t.member_id = rookie.id
JOIN members giver ON t.given_by_id = giver.id
ORDER BY t.created_at DESC
LIMIT 20;

-- 2. Check total points given by each captain/organizer
SELECT 
    m.name,
    m.github_username,
    m.role,
    COUNT(t.id) as total_transactions,
    SUM(t.amount) as total_points_awarded
FROM members m
LEFT JOIN transactions t ON m.id = t.given_by_id
WHERE m.role IN ('captain', 'organizer')
GROUP BY m.id, m.name, m.github_username, m.role
ORDER BY total_points_awarded DESC;

-- 3. Check if any transactions have invalid given_by_id (shouldn't happen)
SELECT 
    t.*,
    CASE 
        WHEN t.given_by_id NOT IN (SELECT id FROM members WHERE role IN ('captain', 'organizer'))
        THEN 'INVALID - Not a captain/organizer'
        ELSE 'VALID'
    END as validation
FROM transactions t
ORDER BY t.created_at DESC;
