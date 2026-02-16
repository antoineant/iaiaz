-- ANITI Demo Setup Script
-- Creates a complete demo environment for the meeting
-- Run in Supabase SQL Editor

-- ============================================================================
-- STEP 0: Cleanup any previous demo data
-- ============================================================================

DO $$
DECLARE
  v_org_id uuid;
  v_user_ids uuid[];
BEGIN
  -- Find existing demo org
  SELECT id INTO v_org_id FROM organizations WHERE name = 'ANITI Demo - Master IA';

  IF v_org_id IS NOT NULL THEN
    -- Get all user IDs associated with this org
    SELECT array_agg(user_id) INTO v_user_ids
    FROM organization_members
    WHERE organization_id = v_org_id;

    -- Delete in reverse dependency order
    DELETE FROM api_usage WHERE user_id = ANY(v_user_ids);
    DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ANY(v_user_ids));
    DELETE FROM conversations WHERE user_id = ANY(v_user_ids);
    DELETE FROM organization_transactions WHERE user_id = ANY(v_user_ids);
    DELETE FROM organization_transactions WHERE organization_id = v_org_id;
    DELETE FROM class_topics WHERE class_id IN (SELECT id FROM organization_classes WHERE organization_id = v_org_id);
    DELETE FROM organization_classes WHERE organization_id = v_org_id;
    DELETE FROM organization_members WHERE organization_id = v_org_id;
    DELETE FROM profiles WHERE id = ANY(v_user_ids);
    DELETE FROM auth.users WHERE id = ANY(v_user_ids);
    DELETE FROM organizations WHERE id = v_org_id;

    RAISE NOTICE 'Cleaned up previous demo data for org %', v_org_id;
  END IF;

  -- Also clean up any orphaned demo users
  DELETE FROM profiles WHERE email LIKE 'aniti.student.%@test.iaiaz.com';
  DELETE FROM profiles WHERE email = 'demo.aniti.owner@test.iaiaz.com';
  DELETE FROM auth.users WHERE email LIKE 'aniti.student.%@test.iaiaz.com';
  DELETE FROM auth.users WHERE email = 'demo.aniti.owner@test.iaiaz.com';

  RAISE NOTICE 'Cleanup complete';
END $$;

-- ============================================================================
-- STEP 1: Create Demo Organization (ANITI simulation)
-- ============================================================================

DO $$
DECLARE
  v_org_id uuid;
  v_owner_id uuid;
  v_class_id uuid;
  v_instance_id uuid;
BEGIN
  -- Get instance_id from existing user
  SELECT instance_id INTO v_instance_id FROM auth.users LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Check if demo org already exists
  SELECT id INTO v_org_id FROM organizations WHERE name = 'ANITI Demo - Master IA';

  IF v_org_id IS NULL THEN
    -- Create organization
    v_org_id := gen_random_uuid();
    INSERT INTO organizations (id, name, slug, type, contact_email, credit_balance, status, created_at)
    VALUES (
      v_org_id,
      'ANITI Demo - Master IA',
      'aniti-demo-' || extract(epoch from now())::bigint,
      'university',
      'demo@aniti.univ-toulouse.fr',
      500.00,
      'active',
      now()
    );
    RAISE NOTICE 'Created organization: %', v_org_id;
  ELSE
    RAISE NOTICE 'Using existing organization: %', v_org_id;
  END IF;

  -- Create owner account for demo (check if exists first)
  SELECT id INTO v_owner_id FROM auth.users WHERE email = 'demo.aniti.owner@test.iaiaz.com';

  IF v_owner_id IS NULL THEN
    v_owner_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      v_owner_id, v_instance_id, 'authenticated', 'authenticated',
      'demo.aniti.owner@test.iaiaz.com',
      crypt('DemoAniti2024!', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"display_name": "Prof. Martin Dupont", "account_type": "school"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    RAISE NOTICE 'Created owner user: %', v_owner_id;
  ELSE
    RAISE NOTICE 'Using existing owner user: %', v_owner_id;
  END IF;

  INSERT INTO profiles (id, email, display_name, account_type, created_at)
  VALUES (v_owner_id, 'demo.aniti.owner@test.iaiaz.com', 'Prof. Martin Dupont', 'school', now())
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

  -- Add owner to organization
  INSERT INTO organization_members (organization_id, user_id, role, status)
  VALUES (v_org_id, v_owner_id, 'owner', 'active')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- Create demo class
  v_class_id := gen_random_uuid();
  INSERT INTO organization_classes (id, organization_id, name, description, status, join_code, created_by, created_at)
  VALUES (
    v_class_id,
    v_org_id,
    'Introduction à l''Intelligence Artificielle',
    'Cours de Master 1 - Fondamentaux de l''IA, Machine Learning, Deep Learning et NLP',
    'active',
    'ANITI-' || substr(md5(random()::text), 1, 6),
    v_owner_id,
    now() - interval '45 days'
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Class created: %', v_class_id;

  -- Store IDs for next steps
  PERFORM set_config('aniti.org_id', v_org_id::text, false);
  PERFORM set_config('aniti.class_id', v_class_id::text, false);
  PERFORM set_config('aniti.owner_id', v_owner_id::text, false);
  PERFORM set_config('aniti.instance_id', v_instance_id::text, false);
END $$;

-- ============================================================================
-- STEP 2: Create AI/CS Course Topics
-- ============================================================================

DO $$
DECLARE
  v_class_id uuid := current_setting('aniti.class_id')::uuid;
  v_topic_ml uuid;
  v_topic_dl uuid;
  v_topic_nlp uuid;
  v_topic_ethics uuid;
  v_topic_practical uuid;
BEGIN
  -- Clear existing topics for this class
  DELETE FROM class_topics WHERE class_id = v_class_id;

  -- Main Topics
  INSERT INTO class_topics (id, class_id, title, description, keywords, sort_order)
  VALUES (gen_random_uuid(), v_class_id, 'Fondamentaux du Machine Learning',
    'Apprentissage supervisé, non supervisé, algorithmes classiques',
    ARRAY['machine learning', 'ML', 'apprentissage', 'supervisé', 'non supervisé', 'régression', 'classification', 'clustering', 'k-means', 'random forest', 'SVM', 'decision tree'],
    1) RETURNING id INTO v_topic_ml;

  INSERT INTO class_topics (id, class_id, title, description, keywords, sort_order)
  VALUES (gen_random_uuid(), v_class_id, 'Deep Learning & Réseaux de Neurones',
    'CNN, RNN, Transformers, architectures modernes',
    ARRAY['deep learning', 'neural network', 'réseau de neurones', 'CNN', 'RNN', 'transformer', 'attention', 'backpropagation', 'gradient', 'PyTorch', 'TensorFlow'],
    2) RETURNING id INTO v_topic_dl;

  INSERT INTO class_topics (id, class_id, title, description, keywords, sort_order)
  VALUES (gen_random_uuid(), v_class_id, 'Traitement du Langage Naturel (NLP)',
    'Embeddings, LLMs, génération de texte',
    ARRAY['NLP', 'langage naturel', 'embedding', 'word2vec', 'BERT', 'GPT', 'LLM', 'tokenization', 'sentiment', 'traduction', 'génération de texte'],
    3) RETURNING id INTO v_topic_nlp;

  INSERT INTO class_topics (id, class_id, title, description, keywords, sort_order)
  VALUES (gen_random_uuid(), v_class_id, 'Éthique & IA Responsable',
    'Biais, explicabilité, impact sociétal',
    ARRAY['éthique', 'biais', 'fairness', 'explicabilité', 'XAI', 'RGPD', 'vie privée', 'impact', 'responsable', 'transparence'],
    4) RETURNING id INTO v_topic_ethics;

  INSERT INTO class_topics (id, class_id, title, description, keywords, sort_order)
  VALUES (gen_random_uuid(), v_class_id, 'Mise en Production & MLOps',
    'Déploiement, monitoring, pipelines ML',
    ARRAY['MLOps', 'déploiement', 'production', 'API', 'Docker', 'Kubernetes', 'monitoring', 'pipeline', 'CI/CD', 'versioning'],
    5) RETURNING id INTO v_topic_practical;

  -- Store topic IDs
  PERFORM set_config('aniti.topic_ml', v_topic_ml::text, false);
  PERFORM set_config('aniti.topic_dl', v_topic_dl::text, false);
  PERFORM set_config('aniti.topic_nlp', v_topic_nlp::text, false);
  PERFORM set_config('aniti.topic_ethics', v_topic_ethics::text, false);
  PERFORM set_config('aniti.topic_practical', v_topic_practical::text, false);

  RAISE NOTICE 'Created 5 course topics for class %', v_class_id;
END $$;

-- ============================================================================
-- STEP 3: Create Mock Students with Diverse Profiles
-- ============================================================================

DO $$
DECLARE
  v_class_id uuid := current_setting('aniti.class_id')::uuid;
  v_org_id uuid := current_setting('aniti.org_id')::uuid;
  v_instance_id uuid := current_setting('aniti.instance_id')::uuid;

  v_user_id uuid;
  v_conv_id uuid;
  v_msg_id uuid;
  v_now timestamptz := now();

  -- Student profiles
  v_students jsonb := '[
    {"name": "Emma Bernard", "profile": "excellent", "ai_skill": "high", "engagement": "high"},
    {"name": "Lucas Moreau", "profile": "excellent", "ai_skill": "high", "engagement": "high"},
    {"name": "Chloé Dubois", "profile": "good", "ai_skill": "high", "engagement": "medium"},
    {"name": "Hugo Martin", "profile": "good", "ai_skill": "medium", "engagement": "high"},
    {"name": "Léa Petit", "profile": "average", "ai_skill": "medium", "engagement": "medium"},
    {"name": "Nathan Garcia", "profile": "average", "ai_skill": "medium", "engagement": "medium"},
    {"name": "Manon Thomas", "profile": "struggling", "ai_skill": "low", "engagement": "medium"},
    {"name": "Théo Robert", "profile": "struggling", "ai_skill": "low", "engagement": "low"},
    {"name": "Camille Richard", "profile": "at_risk", "ai_skill": "low", "engagement": "low"},
    {"name": "Alexandre Lefebvre", "profile": "disengaged", "ai_skill": "medium", "engagement": "very_low"}
  ]';

  v_student jsonb;
  v_num_convs int;
  v_num_msgs int;
  v_days_ago int;
  v_conv_date timestamptz;
  v_model text;
  v_provider text;
  v_prompt text;
  v_cost numeric;
  v_input_tokens int;
  v_output_tokens int;

  -- Model selection based on skill
  v_models_advanced text[] := ARRAY['claude-sonnet-4-20250514', 'gpt-4o', 'gemini-2.5-pro'];
  v_models_basic text[] := ARRAY['gpt-4o-mini', 'claude-haiku-3-5-20241022'];

  -- High quality prompts (AI-literate students)
  v_prompts_excellent text[] := ARRAY[
    'Peux-tu m''expliquer la différence entre l''apprentissage supervisé et non supervisé ? Donne-moi des exemples concrets d''application en entreprise pour chaque type.',
    'Je travaille sur un projet de classification d''images médicales. Quelle architecture de CNN serait la plus adaptée ? Compare ResNet, VGG et EfficientNet pour ce cas d''usage.',
    'Explique-moi le mécanisme d''attention dans les Transformers. Comment le self-attention permet-il de capturer les dépendances longue distance dans le texte ?',
    'Quels sont les principaux biais algorithmiques dans les modèles de NLP ? Comment peut-on les détecter et les atténuer de manière concrète ?',
    'Compare les approches de fine-tuning et de prompt engineering pour adapter un LLM à un domaine spécifique. Quels sont les avantages et inconvénients de chaque méthode ?',
    'Décris les étapes clés d''un pipeline MLOps complet, de l''entraînement au déploiement. Quels outils recommanderais-tu pour chaque étape ?',
    'Analyse les implications éthiques de l''utilisation de l''IA générative dans le domaine de l''éducation. Quels garde-fous devraient être mis en place ?'
  ];

  -- Medium quality prompts
  v_prompts_good text[] := ARRAY[
    'Comment fonctionne un réseau de neurones ? Explique-moi les bases.',
    'C''est quoi la différence entre machine learning et deep learning ?',
    'Peux-tu m''aider à comprendre le gradient descent ?',
    'Comment choisir entre différents algorithmes de classification ?',
    'Explique-moi ce qu''est un embedding en NLP.',
    'Quels sont les risques de biais dans l''IA ?'
  ];

  -- Low quality prompts (struggling students)
  v_prompts_basic text[] := ARRAY[
    'c''est quoi l''ia',
    'explique machine learning',
    'aide moi avec mon devoir',
    'cnn c''est quoi',
    'comment faire un modele'
  ];

BEGIN
  FOR i IN 0..jsonb_array_length(v_students)-1 LOOP
    v_student := v_students->i;
    v_user_id := gen_random_uuid();

    -- Create user
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      v_user_id, v_instance_id, 'authenticated', 'authenticated',
      'aniti.student.' || i || '.' || extract(epoch from now())::bigint || '@test.iaiaz.com',
      crypt('Student123!', gen_salt('bf')),
      v_now - interval '50 days',
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('display_name', v_student->>'name', 'account_type', 'student'),
      v_now - interval '50 days', v_now, '', '', '', ''
    );

    INSERT INTO profiles (id, email, display_name, account_type, created_at)
    VALUES (
      v_user_id,
      'aniti.student.' || i || '.' || extract(epoch from now())::bigint || '@test.iaiaz.com',
      v_student->>'name',
      'student',
      v_now - interval '50 days'
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      account_type = EXCLUDED.account_type;

    -- Add to organization as student
    INSERT INTO organization_members (organization_id, user_id, role, class_id, status, credit_allocated, credit_used)
    VALUES (v_org_id, v_user_id, 'student', v_class_id, 'active', 10.00, 0);

    -- Determine number of conversations based on engagement
    CASE v_student->>'engagement'
      WHEN 'high' THEN v_num_convs := 15 + floor(random() * 10)::int;
      WHEN 'medium' THEN v_num_convs := 8 + floor(random() * 7)::int;
      WHEN 'low' THEN v_num_convs := 3 + floor(random() * 4)::int;
      WHEN 'very_low' THEN v_num_convs := 1 + floor(random() * 2)::int;
      ELSE v_num_convs := 5;
    END CASE;

    -- Create conversations
    FOR c IN 1..v_num_convs LOOP
      v_days_ago := floor(random() * 40)::int;
      v_conv_date := v_now - (v_days_ago || ' days')::interval - (floor(random() * 12) || ' hours')::interval;

      -- Model selection based on AI skill
      IF v_student->>'ai_skill' = 'high' THEN
        v_model := v_models_advanced[1 + floor(random() * 3)::int];
      ELSE
        v_model := v_models_basic[1 + floor(random() * 2)::int];
      END IF;

      -- Determine provider from model name
      IF v_model LIKE 'claude%' THEN
        v_provider := 'anthropic';
      ELSIF v_model LIKE 'gpt%' THEN
        v_provider := 'openai';
      ELSIF v_model LIKE 'gemini%' THEN
        v_provider := 'google';
      ELSE
        v_provider := 'openai';
      END IF;

      INSERT INTO conversations (user_id, title, model, class_id, created_at, updated_at)
      VALUES (v_user_id, 'Session ' || c, v_model, v_class_id, v_conv_date, v_conv_date)
      RETURNING id INTO v_conv_id;

      -- Number of messages based on skill (follow-up behavior)
      IF v_student->>'ai_skill' = 'high' THEN
        v_num_msgs := 6 + floor(random() * 6)::int;
      ELSIF v_student->>'ai_skill' = 'medium' THEN
        v_num_msgs := 4 + floor(random() * 4)::int;
      ELSE
        v_num_msgs := 2 + floor(random() * 2)::int;
      END IF;

      FOR m IN 1..v_num_msgs LOOP
        IF m % 2 = 1 THEN
          -- User message
          CASE v_student->>'profile'
            WHEN 'excellent' THEN v_prompt := v_prompts_excellent[1 + floor(random() * 7)::int];
            WHEN 'good' THEN v_prompt := v_prompts_good[1 + floor(random() * 6)::int];
            ELSE v_prompt := v_prompts_basic[1 + floor(random() * 5)::int];
          END CASE;

          v_input_tokens := length(v_prompt) * 2;

          INSERT INTO messages (conversation_id, role, content, tokens_input, tokens_output, cost, created_at)
          VALUES (v_conv_id, 'user', v_prompt, v_input_tokens, 0, 0, v_conv_date + ((m-1) || ' minutes')::interval)
          RETURNING id INTO v_msg_id;
        ELSE
          -- Assistant response
          v_output_tokens := 200 + floor(random() * 400)::int;
          v_cost := (v_output_tokens * 0.000015)::numeric;

          INSERT INTO messages (conversation_id, role, content, tokens_input, tokens_output, cost, created_at)
          VALUES (
            v_conv_id, 'assistant',
            'Réponse détaillée de l''assistant sur le sujet demandé...',
            0, v_output_tokens, v_cost,
            v_conv_date + ((m-1) || ' minutes')::interval + interval '30 seconds'
          );

          -- Record API usage
          INSERT INTO api_usage (user_id, provider, model, tokens_input, tokens_output, cost_eur, co2_grams, created_at)
          VALUES (
            v_user_id, v_provider, v_model, v_input_tokens, v_output_tokens,
            v_cost * 1.5, -- with markup
            (v_input_tokens + v_output_tokens) * 0.0005,
            v_conv_date + ((m-1) || ' minutes')::interval
          );
        END IF;
      END LOOP;
    END LOOP;

    RAISE NOTICE 'Created student: % (%) with % conversations', v_student->>'name', v_student->>'profile', v_num_convs;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Summary
-- ============================================================================

SELECT 'Demo Setup Complete!' as status;

SELECT
  'Organization' as type,
  name,
  credit_balance::text as detail
FROM organizations
WHERE name LIKE 'ANITI Demo%'
UNION ALL
SELECT
  'Class' as type,
  c.name,
  COUNT(DISTINCT om.user_id)::text || ' students'
FROM organization_classes c
JOIN organization_members om ON om.class_id = c.id AND om.role = 'student'
WHERE c.name LIKE '%Intelligence Artificielle%'
GROUP BY c.id, c.name
UNION ALL
SELECT
  'Topics' as type,
  'Course Topics',
  COUNT(*)::text || ' topics defined'
FROM class_topics ct
JOIN organization_classes c ON c.id = ct.class_id
WHERE c.name LIKE '%Intelligence Artificielle%';

-- Show student distribution
SELECT
  p.display_name,
  COUNT(DISTINCT c.id) as conversations,
  COUNT(m.id) FILTER (WHERE m.role='user') as messages,
  ROUND(AVG(LENGTH(m.content)) FILTER (WHERE m.role='user')) as avg_prompt_length,
  ROUND(SUM(au.cost_eur)::numeric, 2) as total_cost
FROM profiles p
JOIN conversations c ON c.user_id = p.id
JOIN messages m ON m.conversation_id = c.id
LEFT JOIN api_usage au ON au.user_id = p.id
WHERE p.email LIKE 'aniti.student.%'
GROUP BY p.id, p.display_name
ORDER BY conversations DESC;
