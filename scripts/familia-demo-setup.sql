-- ============================================================================
-- FAMILIA DEMO SETUP
-- Creates a family org with parent + 2 kids for showcase
-- Run in Supabase SQL Editor
-- ============================================================================

-- STEP 0: Cleanup previous demo data
DO $$
DECLARE
  v_org_id uuid;
  v_user_ids uuid[];
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Famille Dupont';

  IF v_org_id IS NOT NULL THEN
    SELECT array_agg(user_id) INTO v_user_ids
    FROM organization_members
    WHERE organization_id = v_org_id;

    IF v_user_ids IS NOT NULL THEN
      DELETE FROM conversation_activity WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ANY(v_user_ids));
      DELETE FROM api_usage WHERE user_id = ANY(v_user_ids);
      DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ANY(v_user_ids));
      DELETE FROM conversations WHERE user_id = ANY(v_user_ids);
      DELETE FROM custom_assistants WHERE user_id = ANY(v_user_ids);
      DELETE FROM conversation_flags WHERE organization_id = v_org_id;
      DELETE FROM parental_controls WHERE organization_id = v_org_id;
      DELETE FROM organization_transactions WHERE organization_id = v_org_id;
      DELETE FROM organization_members WHERE organization_id = v_org_id;
      DELETE FROM profiles WHERE id = ANY(v_user_ids);
      DELETE FROM auth.users WHERE id = ANY(v_user_ids);
    END IF;

    DELETE FROM organizations WHERE id = v_org_id;
    RAISE NOTICE 'Cleaned up previous Familia demo data';
  END IF;

  -- Also clean orphaned demo users
  DELETE FROM profiles WHERE email LIKE 'familia.demo.%@test.iaiaz.com';
  DELETE FROM auth.users WHERE email LIKE 'familia.demo.%@test.iaiaz.com';
END $$;

-- ============================================================================
-- STEP 1: Create family org + users
-- ============================================================================
DO $$
DECLARE
  v_org_id uuid;
  v_parent_id uuid;
  v_emma_id uuid;
  v_lucas_id uuid;
  v_instance_id uuid;
  v_conv_id uuid;
  v_msg_id uuid;
BEGIN
  -- Get instance_id
  SELECT instance_id INTO v_instance_id FROM auth.users LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- =====================
  -- Create family org
  -- =====================
  v_org_id := gen_random_uuid();
  INSERT INTO organizations (id, name, slug, type, contact_email, credit_balance, max_family_members, status)
  VALUES (
    v_org_id,
    'Famille Dupont',
    'famille-dupont-' || extract(epoch from now())::bigint,
    'family',
    'familia.demo.parent@test.iaiaz.com',
    8.50,
    4,
    'active'
  );
  RAISE NOTICE 'Created family org: %', v_org_id;

  -- =====================
  -- Parent: Sophie Dupont
  -- =====================
  v_parent_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    v_parent_id, v_instance_id, 'authenticated', 'authenticated',
    'familia.demo.parent@test.iaiaz.com',
    crypt('FamiliaDemo2026!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Sophie Dupont", "display_name": "Sophie Dupont"}'::jsonb,
    now() - interval '30 days', now(), '', '', '', ''
  );

  INSERT INTO profiles (id, email, display_name, account_type, terms_accepted_at, credits_balance)
  VALUES (v_parent_id, 'familia.demo.parent@test.iaiaz.com', 'Sophie Dupont', 'student', now(), 0)
  ON CONFLICT (id) DO UPDATE SET display_name = 'Sophie Dupont', account_type = 'student', terms_accepted_at = now();

  INSERT INTO organization_members (organization_id, user_id, role, status, display_name)
  VALUES (v_org_id, v_parent_id, 'owner', 'active', 'Sophie Dupont')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created parent Sophie: %', v_parent_id;

  -- =====================
  -- Kid 1: Emma Dupont (14 ans, mode guidé)
  -- =====================
  v_emma_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    v_emma_id, v_instance_id, 'authenticated', 'authenticated',
    'familia.demo.emma@test.iaiaz.com',
    crypt('FamiliaDemo2026!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Emma Dupont", "display_name": "Emma Dupont"}'::jsonb,
    now() - interval '25 days', now(), '', '', '', ''
  );

  INSERT INTO profiles (id, email, display_name, account_type, terms_accepted_at, credits_balance, birthdate, accent_color)
  VALUES (v_emma_id, 'familia.demo.emma@test.iaiaz.com', 'Emma Dupont', 'student', now(), 0, '2012-03-15', 'pink')
  ON CONFLICT (id) DO UPDATE SET display_name = 'Emma Dupont', account_type = 'student', terms_accepted_at = now(), birthdate = '2012-03-15', accent_color = 'pink';

  INSERT INTO organization_members (organization_id, user_id, role, status, supervision_mode, age_bracket, display_name)
  VALUES (v_org_id, v_emma_id, 'student', 'active', 'guided', '12-14', 'Emma Dupont');

  INSERT INTO parental_controls (organization_id, child_user_id, supervision_mode, content_filter_enabled, daily_credit_limit, quiet_hours_start, quiet_hours_end, notification_on_flagged_content)
  VALUES (v_org_id, v_emma_id, 'guided', true, 1.50, '22:00', '07:00', true);

  RAISE NOTICE 'Created Emma (14, guided): %', v_emma_id;

  -- =====================
  -- Kid 2: Lucas Dupont (16 ans, mode confiance)
  -- =====================
  v_lucas_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    v_lucas_id, v_instance_id, 'authenticated', 'authenticated',
    'familia.demo.lucas@test.iaiaz.com',
    crypt('FamiliaDemo2026!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Lucas Dupont", "display_name": "Lucas Dupont"}'::jsonb,
    now() - interval '25 days', now(), '', '', '', ''
  );

  INSERT INTO profiles (id, email, display_name, account_type, terms_accepted_at, credits_balance, birthdate, accent_color)
  VALUES (v_lucas_id, 'familia.demo.lucas@test.iaiaz.com', 'Lucas Dupont', 'student', now(), 0, '2010-07-22', 'green')
  ON CONFLICT (id) DO UPDATE SET display_name = 'Lucas Dupont', account_type = 'student', terms_accepted_at = now(), birthdate = '2010-07-22', accent_color = 'green';

  INSERT INTO organization_members (organization_id, user_id, role, status, supervision_mode, age_bracket, display_name)
  VALUES (v_org_id, v_lucas_id, 'student', 'active', 'trusted', '15-17', 'Lucas Dupont');

  INSERT INTO parental_controls (organization_id, child_user_id, supervision_mode, content_filter_enabled, daily_credit_limit, quiet_hours_start, quiet_hours_end, notification_on_flagged_content)
  VALUES (v_org_id, v_lucas_id, 'trusted', true, 2.00, '23:00', '07:00', true);

  RAISE NOTICE 'Created Lucas (16, trusted): %', v_lucas_id;

  -- =====================
  -- Seed preset assistants for Emma
  -- =====================
  INSERT INTO custom_assistants (user_id, name, avatar, system_prompt, purpose, color, is_preset, sort_order) VALUES
    (v_emma_id, 'Aide aux devoirs', '🎓', 'Tu es un tuteur patient. Aide l''élève à comprendre étape par étape. Ne donne jamais la réponse directement.', 'Accompagnement scolaire', 'blue', true, 0),
    (v_emma_id, 'Coach écriture', '✍️', 'Tu es un coach d''écriture. Aide à structurer les idées, améliorer les arguments, renforcer le style.', 'Rédaction et expression écrite', 'purple', true, 1),
    (v_emma_id, 'Maths', '🧮', 'Tu es un prof de maths sympa. Décompose les problèmes en étapes simples. Utilise des analogies.', 'Mathématiques', 'green', true, 2),
    (v_emma_id, 'Créatif', '🎨', 'Tu es un assistant créatif. Aide à trouver des idées originales, écrire des histoires, imaginer des projets.', 'Créativité et imagination', 'orange', true, 3),
    (v_emma_id, 'Culture G', '🌍', 'Tu es un compagnon de révision. Explique clairement, donne des exemples, adapte-toi au niveau.', 'Culture générale et révisions', 'teal', true, 4),
    (v_emma_id, 'Mon pote philo', '🦉', 'Tu es un ami qui adore la philo. Tu poses des questions qui font réfléchir et tu aides à développer des arguments.', 'Philosophie et réflexion', 'amber', false, 5);

  -- Seed preset assistants for Lucas
  INSERT INTO custom_assistants (user_id, name, avatar, system_prompt, purpose, color, is_preset, sort_order) VALUES
    (v_lucas_id, 'Aide aux devoirs', '🎓', 'Tu es un tuteur patient. Aide l''élève à comprendre étape par étape. Ne donne jamais la réponse directement.', 'Accompagnement scolaire', 'blue', true, 0),
    (v_lucas_id, 'Coach écriture', '✍️', 'Tu es un coach d''écriture. Aide à structurer les idées, améliorer les arguments, renforcer le style.', 'Rédaction et expression écrite', 'purple', true, 1),
    (v_lucas_id, 'Maths', '🧮', 'Tu es un prof de maths sympa. Décompose les problèmes en étapes simples. Utilise des analogies.', 'Mathématiques', 'green', true, 2),
    (v_lucas_id, 'Créatif', '🎨', 'Tu es un assistant créatif. Aide à trouver des idées originales, écrire des histoires, imaginer des projets.', 'Créativité et imagination', 'orange', true, 3),
    (v_lucas_id, 'Culture G', '🌍', 'Tu es un compagnon de révision. Explique clairement, donne des exemples, adapte-toi au niveau.', 'Culture générale et révisions', 'teal', true, 4);

  RAISE NOTICE 'Seeded assistants for both kids';

  -- =====================
  -- Sample conversations for Emma (maths struggles)
  -- =====================

  -- Conversation 1: Fractions (with assistant)
  v_conv_id := gen_random_uuid();
  INSERT INTO conversations (id, user_id, title, model, assistant_id, created_at, updated_at)
  VALUES (
    v_conv_id, v_emma_id, 'Les fractions, je comprends pas',
    'claude-sonnet-4-5-20250929',
    (SELECT id FROM custom_assistants WHERE user_id = v_emma_id AND name = 'Maths' LIMIT 1),
    now() - interval '2 hours', now() - interval '2 hours'
  );

  INSERT INTO messages (conversation_id, role, content, tokens_input, tokens_output, cost) VALUES
    (v_conv_id, 'user', 'Je comprends pas comment additionner des fractions avec des dénominateurs différents', 0, 0, 0),
    (v_conv_id, 'assistant', 'Pas de souci, on va y aller étape par étape ! 😊

Imagine que tu as des parts de pizza. Si une pizza est coupée en 4 et une autre en 3, les parts ne sont pas de la même taille, non ?

Pour additionner 1/4 + 1/3, il faut d''abord que les parts soient de la même taille. On cherche un **dénominateur commun**.

**Étape 1** : Trouve un nombre dans lequel 4 et 3 rentrent tous les deux → c''est 12 !
- 1/4 = 3/12 (on multiplie en haut et en bas par 3)
- 1/3 = 4/12 (on multiplie en haut et en bas par 4)

**Étape 2** : Maintenant qu''on a les mêmes parts, on additionne juste le haut :
- 3/12 + 4/12 = 7/12

Tu veux essayer avec 1/2 + 1/5 ?', 150, 280, 0.003);

  -- Activity metadata for this conversation
  INSERT INTO conversation_activity (conversation_id, subject, topic, activity_type, struggle, created_at) VALUES
    (v_conv_id, 'maths', 'fractions', 'homework', true, now() - interval '2 hours');

  -- Conversation 2: More fractions (struggle continues)
  v_conv_id := gen_random_uuid();
  INSERT INTO conversations (id, user_id, title, model, assistant_id, created_at, updated_at)
  VALUES (
    v_conv_id, v_emma_id, 'Multiplier des fractions',
    'claude-sonnet-4-5-20250929',
    (SELECT id FROM custom_assistants WHERE user_id = v_emma_id AND name = 'Maths' LIMIT 1),
    now() - interval '1 day', now() - interval '1 day'
  );

  INSERT INTO messages (conversation_id, role, content, tokens_input, tokens_output, cost) VALUES
    (v_conv_id, 'user', 'Et pour multiplier des fractions ?', 0, 0, 0),
    (v_conv_id, 'assistant', 'Bonne nouvelle : multiplier des fractions, c''est plus simple qu''additionner ! 🎉

**La règle** : on multiplie en haut ensemble, et en bas ensemble. C''est tout !

Exemple : 2/3 × 4/5
- En haut : 2 × 4 = 8
- En bas : 3 × 5 = 15
- Résultat : 8/15

Pas besoin de dénominateur commun cette fois-ci.

Tu veux essayer 3/4 × 2/7 ?', 120, 200, 0.002);

  INSERT INTO conversation_activity (conversation_id, subject, topic, activity_type, struggle, created_at) VALUES
    (v_conv_id, 'maths', 'fractions', 'homework', true, now() - interval '1 day');

  -- Conversation 3: French essay
  v_conv_id := gen_random_uuid();
  INSERT INTO conversations (id, user_id, title, model, created_at, updated_at)
  VALUES (
    v_conv_id, v_emma_id, 'Dissertation sur Le Petit Prince',
    'claude-sonnet-4-5-20250929',
    now() - interval '3 days', now() - interval '3 days'
  );

  INSERT INTO messages (conversation_id, role, content, tokens_input, tokens_output, cost) VALUES
    (v_conv_id, 'user', 'Je dois écrire une dissert sur le Petit Prince, tu peux m''aider ?', 0, 0, 0),
    (v_conv_id, 'assistant', 'Avec plaisir ! Le Petit Prince, c''est un super sujet. 📖

Mais attention : je vais t''aider à **construire** ta dissert, pas à l''écrire à ta place ! 😉

D''abord, c''est quoi exactement le sujet ? Tu as un intitulé précis ou c''est libre ?

En attendant, voici quelques **pistes** pour organiser tes idées :
1. **Les thèmes principaux** : l''amitié (le renard), la responsabilité ("tu es responsable de ta rose"), le regard des adultes vs celui des enfants
2. **Ce que l''auteur critique** : les grandes personnes qui ne voient que les chiffres, qui oublient l''essentiel
3. **Le message** : "on ne voit bien qu''avec le cœur, l''essentiel est invisible pour les yeux"

Quel angle t''intéresse le plus ?', 180, 320, 0.004);

  INSERT INTO conversation_activity (conversation_id, subject, topic, activity_type, struggle, created_at) VALUES
    (v_conv_id, 'francais', 'Le Petit Prince - dissertation', 'essay', false, now() - interval '3 days');

  RAISE NOTICE 'Created sample conversations for Emma';

  -- =====================
  -- Sample conversations for Lucas (philo + history)
  -- =====================

  -- Conversation 1: Philosophy
  v_conv_id := gen_random_uuid();
  INSERT INTO conversations (id, user_id, title, model, created_at, updated_at)
  VALUES (
    v_conv_id, v_lucas_id, 'Peut-on prouver que Dieu existe ?',
    'claude-sonnet-4-5-20250929',
    now() - interval '5 hours', now() - interval '5 hours'
  );

  INSERT INTO messages (conversation_id, role, content, tokens_input, tokens_output, cost) VALUES
    (v_conv_id, 'user', 'En philo on étudie les preuves de l''existence de Dieu, tu peux m''expliquer les arguments principaux ?', 0, 0, 0),
    (v_conv_id, 'assistant', 'Super question ! C''est un des grands débats en philosophie. Voici les 3 arguments classiques :

**1. L''argument cosmologique** (Thomas d''Aquin)
Tout a une cause. Si on remonte la chaîne des causes, il faut un "premier moteur" qui a tout lancé → Dieu.
*Critique* : Pourquoi ce premier moteur serait-il Dieu ? Et qui a causé Dieu ?

**2. L''argument ontologique** (Anselme)
Dieu = l''être le plus parfait imaginable. Or exister est plus parfait que ne pas exister. Donc Dieu existe.
*Critique* : Kant répond qu''on ne peut pas "prouver" l''existence par la définition. L''existence n''est pas une propriété.

**3. L''argument téléologique** (design)
L''univers est si bien organisé qu''il doit avoir un concepteur.
*Critique* : Darwin montre que l''ordre peut venir de la sélection naturelle, sans concepteur.

Le prof attend sûrement que tu **opposes** ces arguments et leurs critiques. Tu veux qu''on travaille un plan de dissert ?', 200, 400, 0.005);

  INSERT INTO conversation_activity (conversation_id, subject, topic, activity_type, struggle, created_at) VALUES
    (v_conv_id, 'philo', 'preuves existence de Dieu', 'revision', false, now() - interval '5 hours');

  -- Conversation 2: History
  v_conv_id := gen_random_uuid();
  INSERT INTO conversations (id, user_id, title, model, created_at, updated_at)
  VALUES (
    v_conv_id, v_lucas_id, 'La Guerre froide',
    'claude-sonnet-4-5-20250929',
    now() - interval '2 days', now() - interval '2 days'
  );

  INSERT INTO messages (conversation_id, role, content, tokens_input, tokens_output, cost) VALUES
    (v_conv_id, 'user', 'J''ai un contrôle sur la Guerre froide demain, tu peux me faire un résumé rapide ?', 0, 0, 0),
    (v_conv_id, 'assistant', 'Je vais plutôt t''aider à **retenir** les points clés ! C''est plus efficace qu''un résumé passif. 🧠

**Les 3 grandes phases** (retiens : Tension → Détente → Fin)

**1. 1947-1962 : Tensions maximales**
- 1947 : Doctrine Truman + Plan Marshall (les USA disent "on contient le communisme")
- 1948-49 : Blocus de Berlin → pont aérien
- 1950-53 : Guerre de Corée
- 1962 : Crise des missiles de Cuba (on frôle la guerre nucléaire)

**2. 1963-1979 : La Détente**
- Téléphone rouge Moscou-Washington
- Accords SALT (limiter les armes nucléaires)
- Mais en parallèle : guerre du Vietnam (1955-1975)

**3. 1980-1991 : Fin**
- Reagan relance la course aux armements
- Gorbatchev arrive (glasnost + perestroïka)
- 1989 : Chute du mur de Berlin
- 1991 : Dissolution de l''URSS → fin de la Guerre froide

Quel point tu veux approfondir pour ton contrôle ?', 250, 450, 0.006);

  INSERT INTO conversation_activity (conversation_id, subject, topic, activity_type, struggle, created_at) VALUES
    (v_conv_id, 'histoire', 'Guerre froide', 'revision', false, now() - interval '2 days');

  RAISE NOTICE 'Created sample conversations for Lucas';

  -- =====================
  -- Credit transactions (usage history)
  -- =====================
  INSERT INTO organization_transactions (organization_id, user_id, amount, type, description, created_at) VALUES
    (v_org_id, v_emma_id, -0.003, 'usage', 'Claude Sonnet: fractions', now() - interval '2 hours'),
    (v_org_id, v_emma_id, -0.002, 'usage', 'Claude Sonnet: multiplier fractions', now() - interval '1 day'),
    (v_org_id, v_emma_id, -0.004, 'usage', 'Claude Sonnet: dissertation', now() - interval '3 days'),
    (v_org_id, v_lucas_id, -0.005, 'usage', 'Claude Sonnet: philo', now() - interval '5 hours'),
    (v_org_id, v_lucas_id, -0.006, 'usage', 'Claude Sonnet: guerre froide', now() - interval '2 days');

  RAISE NOTICE '✅ Familia demo setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Accounts:';
  RAISE NOTICE '  Parent: familia.demo.parent@test.iaiaz.com / FamiliaDemo2026!';
  RAISE NOTICE '  Emma (14, guided): familia.demo.emma@test.iaiaz.com / FamiliaDemo2026!';
  RAISE NOTICE '  Lucas (16, trusted): familia.demo.lucas@test.iaiaz.com / FamiliaDemo2026!';
  RAISE NOTICE '';
  RAISE NOTICE '💰 Family credit balance: 8.50€';
  RAISE NOTICE '🏠 Org: Famille Dupont (%)', v_org_id;
END $$;
