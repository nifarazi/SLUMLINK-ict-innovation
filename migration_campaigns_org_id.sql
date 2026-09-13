-- Migration: Make org_id nullable in campaigns table for local authority campaigns
-- This allows local authorities to create campaigns without an org_id foreign key reference

ALTER TABLE campaigns MODIFY COLUMN org_id BIGINT UNSIGNED NULL;
ALTER TABLE campaigns DROP FOREIGN KEY fk_campaign_org;

-- Campaigns can now be created without a foreign key to organizations table
-- This is useful for local authority campaigns that don't have an org record
