-- Block additional disposable email domains used by attackers
-- Also adds common disposable domain patterns

INSERT INTO public.blocked_email_domains (domain) VALUES
  -- Domains used in Feb 2026 attacks
  ('qqamm.xyz'),
  ('meteormail.me'),
  ('qq.com'),
  ('qemvbbi.shop'),
  -- Common disposable email services
  ('yopmail.com'),
  ('yopmail.fr'),
  ('sharklasers.com'),
  ('grr.la'),
  ('guerrillamail.info'),
  ('guerrillamail.net'),
  ('guerrillamail.de'),
  ('guerrillamail.biz'),
  ('emailondeck.com'),
  ('mohmal.com'),
  ('dispostable.com'),
  ('maildrop.cc'),
  ('mailnesia.com'),
  ('inboxbear.com'),
  ('harakirimail.com'),
  ('tmail.ws'),
  ('getnada.com'),
  ('nada.email'),
  ('burnermail.io'),
  ('temp-mail.org'),
  ('temp-mail.io'),
  ('tempail.com'),
  ('emailfake.com'),
  ('crazymailing.com'),
  ('armyspy.com'),
  ('dayrep.com'),
  ('fleckens.hu'),
  ('jourrapide.com'),
  ('rhyta.com'),
  ('superrito.com'),
  ('teleworm.us')
ON CONFLICT (domain) DO NOTHING;
