-- Add property preference columns to visitor_emails table
ALTER TABLE visitor_emails
ADD COLUMN budget_min INTEGER DEFAULT NULL,
ADD COLUMN bedrooms INTEGER DEFAULT NULL,
ADD COLUMN parish VARCHAR(255) DEFAULT NULL,
ADD COLUMN area VARCHAR(255) DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN visitor_emails.budget_min IS 'Minimum budget in JMD for property search';
COMMENT ON COLUMN visitor_emails.bedrooms IS 'Number of bedrooms desired';
COMMENT ON COLUMN visitor_emails.parish IS 'Parish where property is desired (Jamaica)';
COMMENT ON COLUMN visitor_emails.area IS 'Specific area within parish';

-- Create an index on parish for faster filtering
CREATE INDEX idx_visitor_emails_parish ON visitor_emails(parish);
CREATE INDEX idx_visitor_emails_budget ON visitor_emails(budget_min);
