-- Update preset mifa colors to match the new unified palette names
UPDATE custom_assistants SET color = 'cobalt'  WHERE is_preset = true AND sort_order = 0;
UPDATE custom_assistants SET color = 'lavande' WHERE is_preset = true AND sort_order = 1;
UPDATE custom_assistants SET color = 'foret'   WHERE is_preset = true AND sort_order = 2;
UPDATE custom_assistants SET color = 'corail'  WHERE is_preset = true AND sort_order = 3;
UPDATE custom_assistants SET color = 'menthe'  WHERE is_preset = true AND sort_order = 4;
