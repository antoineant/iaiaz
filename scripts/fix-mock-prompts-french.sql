-- Fix Mock Prompts: Translate English to French
-- Run this in Supabase SQL Editor to update existing mock data

-- Update high quality prompts
UPDATE messages SET content = 'Peux-tu m''expliquer les principales différences entre l''apprentissage supervisé et non supervisé, en te concentrant sur leurs applications en traitement du langage naturel ?'
WHERE content = 'Can you explain the key differences between supervised and unsupervised learning, focusing on their applications in NLP?';

UPDATE messages SET content = 'Je travaille sur une stratégie marketing pour un produit SaaS B2B. Aide-moi à créer une carte du parcours client avec les points de contact.'
WHERE content = 'I am working on a marketing strategy for a B2B SaaS product. Help me create a customer journey map with touchpoints.';

UPDATE messages SET content = 'Compare les théories économiques de Keynes et Friedman concernant l''intervention gouvernementale pendant les récessions.'
WHERE content = 'Compare the economic theories of Keynes and Friedman regarding government intervention during recessions.';

UPDATE messages SET content = 'Analyse l''impact du changement climatique sur la logistique des chaînes d''approvisionnement. Quels sont les principaux risques et stratégies d''atténuation ?'
WHERE content = 'Analyze the impact of climate change on supply chain logistics. What are the main risks and mitigation strategies?';

UPDATE messages SET content = 'Explique les implications du RGPD pour une startup qui collecte des données utilisateurs. Quelles sont les exigences clés de conformité ?'
WHERE content = 'Explain GDPR implications for a startup collecting user data. What are the key compliance requirements?';

-- Update low quality prompts
UPDATE messages SET content = 'c''est quoi le marketing'
WHERE content = 'what is marketing';

UPDATE messages SET content = 'explique l''économie'
WHERE content = 'explain economics';

UPDATE messages SET content = 'aide pour les devoirs'
WHERE content = 'help with homework';

UPDATE messages SET content = 'c''est quoi l''IA'
WHERE content = 'what is AI';

UPDATE messages SET content = 'parle-moi du business'
WHERE content = 'tell me about business';

-- Also update the prompt_analysis table topics to French
UPDATE prompt_analysis SET topic = 'marketing' WHERE topic = 'marketing';
UPDATE prompt_analysis SET topic = 'apprentissage automatique' WHERE topic = 'machine learning';
UPDATE prompt_analysis SET topic = 'économie' WHERE topic = 'economics';
UPDATE prompt_analysis SET topic = 'devoirs' WHERE topic = 'homework';
UPDATE prompt_analysis SET topic = 'intelligence artificielle' WHERE topic = 'AI';
UPDATE prompt_analysis SET topic = 'affaires' WHERE topic = 'business';
UPDATE prompt_analysis SET topic = 'logistique' WHERE topic = 'logistics' OR topic = 'supply chain';
UPDATE prompt_analysis SET topic = 'conformité' WHERE topic = 'GDPR' OR topic = 'compliance';

-- Verify the updates
SELECT content, COUNT(*) FROM messages
WHERE role = 'user'
GROUP BY content
ORDER BY COUNT(*) DESC
LIMIT 15;
