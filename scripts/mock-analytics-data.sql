-- Mock Analytics Data Generator
-- Run this in Supabase SQL Editor
-- Creates 9 mock students with different AI literacy and engagement profiles

DO $$
DECLARE
  v_class_id uuid := '20f8f8fd-a0f2-4797-8972-6eb335438807';
  v_org_id uuid := 'ef35ff98-47df-4071-a79f-78619905320b';

  v_user_id uuid;
  v_conv_id uuid;
  v_now timestamptz := now();
  v_conv_date timestamptz;
  v_msg_date timestamptz;
  v_num_convs int;
  v_num_msgs int;
  v_prompt text;
  v_model text;
  v_days_ago int;
  v_ai_skill text;
  v_engagement text;
  v_name text;
  v_email text;
  v_instance_id uuid;

  v_models text[] := ARRAY['gpt-4o', 'claude-sonnet-4-20250514', 'gemini-2.0-flash'];

  v_high_prompts text[] := ARRAY[
    'Peux-tu m''expliquer les principales différences entre l''apprentissage supervisé et non supervisé, en te concentrant sur leurs applications en traitement du langage naturel ?',
    'Je travaille sur une stratégie marketing pour un produit SaaS B2B. Aide-moi à créer une carte du parcours client avec les points de contact.',
    'Compare les théories économiques de Keynes et Friedman concernant l''intervention gouvernementale pendant les récessions.',
    'Analyse l''impact du changement climatique sur la logistique des chaînes d''approvisionnement. Quels sont les principaux risques et stratégies d''atténuation ?',
    'Explique les implications du RGPD pour une startup qui collecte des données utilisateurs. Quelles sont les exigences clés de conformité ?'
  ];

  v_low_prompts text[] := ARRAY[
    'c''est quoi le marketing',
    'explique l''économie',
    'aide pour les devoirs',
    'c''est quoi l''IA',
    'parle-moi du business'
  ];

BEGIN
  -- Get the instance_id from an existing user
  SELECT instance_id INTO v_instance_id FROM auth.users LIMIT 1;

  IF v_instance_id IS NULL THEN
    -- Default Supabase instance_id
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  RAISE NOTICE 'Starting mock data generation with instance_id: %', v_instance_id;

  -- Create 9 students with different profiles
  FOR i IN 1..9 LOOP
    -- Assign profile based on index
    CASE i
      WHEN 1,2,3 THEN v_ai_skill := 'high'; v_engagement := 'high'; v_name := 'Alice Martin ' || i;
      WHEN 4,5 THEN v_ai_skill := 'low'; v_engagement := 'high'; v_name := 'David Petit ' || i;
      WHEN 6,7,8 THEN v_ai_skill := 'low'; v_engagement := 'low'; v_name := 'Frank Leroy ' || i;
      WHEN 9 THEN v_ai_skill := 'high'; v_engagement := 'low'; v_name := 'Isabelle Laurent ' || i;
    END CASE;

    v_user_id := gen_random_uuid();
    v_email := 'mock.student.' || i || '.' || extract(epoch from now())::bigint || '@test.iaiaz.com';

    -- Insert into auth.users first
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      v_user_id,
      v_instance_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt('MockStudent123!', gen_salt('bf')),
      v_now,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('display_name', v_name, 'account_type', 'student'),
      v_now,
      v_now,
      '',
      '',
      '',
      ''
    );

    -- Insert into profiles (trigger might create this, but let's be explicit)
    INSERT INTO profiles (id, email, display_name, account_type, created_at)
    VALUES (v_user_id, v_email, v_name, 'student', v_now)
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

    -- Add to organization
    INSERT INTO organization_members (organization_id, user_id, role, class_id, status, credit_allocated, credit_used)
    VALUES (v_org_id, v_user_id, 'student', v_class_id, 'active', 5, 0);

    -- Number of conversations based on engagement
    IF v_engagement = 'high' THEN
      v_num_convs := 8 + floor(random() * 8)::int;
    ELSE
      v_num_convs := 1 + floor(random() * 3)::int;
    END IF;

    RAISE NOTICE '  Student %: % convs (AI: %, Eng: %)', v_name, v_num_convs, v_ai_skill, v_engagement;

    -- Create conversations
    FOR c IN 1..v_num_convs LOOP
      v_days_ago := floor(random() * 30)::int;
      v_conv_date := v_now - (v_days_ago || ' days')::interval;

      IF v_ai_skill = 'high' THEN
        v_model := v_models[1 + floor(random() * 3)::int];
      ELSE
        v_model := v_models[1];
      END IF;

      INSERT INTO conversations (user_id, title, model, created_at, updated_at)
      VALUES (v_user_id, 'Conv ' || c, v_model, v_conv_date, v_conv_date)
      RETURNING id INTO v_conv_id;

      IF v_ai_skill = 'high' AND random() < 0.7 THEN
        v_num_msgs := 4 + floor(random() * 5)::int;
      ELSE
        v_num_msgs := 2;
      END IF;

      FOR m IN 1..v_num_msgs LOOP
        v_msg_date := v_conv_date + ((m - 1) || ' minutes')::interval;

        IF m % 2 = 1 THEN
          IF v_ai_skill = 'high' THEN
            v_prompt := v_high_prompts[1 + floor(random() * 5)::int];
          ELSE
            v_prompt := v_low_prompts[1 + floor(random() * 5)::int];
          END IF;

          INSERT INTO messages (conversation_id, role, content, tokens_input, tokens_output, cost, created_at)
          VALUES (v_conv_id, 'user', v_prompt, length(v_prompt), 0, 0, v_msg_date);
        ELSE
          INSERT INTO messages (conversation_id, role, content, tokens_input, tokens_output, cost, created_at)
          VALUES (v_conv_id, 'assistant', 'Mock AI response for testing.', 0, 50, 0.005, v_msg_date);
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Done! Created 9 mock students.';
END $$;

-- Verify the data was created
SELECT
  p.display_name,
  COUNT(DISTINCT c.id) as conversations,
  COUNT(m.id) FILTER (WHERE m.role='user') as user_messages,
  ROUND(AVG(LENGTH(m.content)) FILTER (WHERE m.role='user')) as avg_prompt_length
FROM profiles p
JOIN conversations c ON c.user_id = p.id
JOIN messages m ON m.conversation_id = c.id
WHERE p.email LIKE 'mock.student.%'
GROUP BY p.id, p.display_name
ORDER BY conversations DESC;
