import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/account/external
 * Returns account information for external clients (desktop app)
 * Requires Bearer token authentication
 */
export async function GET(request: NextRequest) {
  // Add CORS headers for desktop app
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };

  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401, headers }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '').trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401, headers }
      );
    }

    const supabase = createAdminClient();

    console.log('[account/external] Looking up API key:', apiKey.substring(0, 15) + '...');

    // Look up the API key in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('api_key', apiKey)
      .single();

    console.log('[account/external] Query result:', { profile, error: profileError });

    if (profileError || !profile) {
      console.log('[account/external] Invalid API key - profileError:', profileError);
      return NextResponse.json(
        { error: 'Invalid API key', debug: profileError?.message },
        { status: 401, headers }
      );
    }

    const userData = profile;

    // Get organization membership and subscription info
    let plan: string | null = null;
    let creditsTotal = 0;

    const { data: orgMember } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        organizations (
          id,
          name,
          subscription_plan,
          subscription_status,
          credits
        )
      `)
      .eq('user_id', userData.id)
      .eq('status', 'active')
      .single();

    if (orgMember?.organizations) {
      const org = orgMember.organizations as any;
      if (org.subscription_status === 'active' && org.subscription_plan) {
        plan = org.subscription_plan;
      }
      // Use organization credits if available
      if (org.credits !== null && org.credits !== undefined) {
        creditsTotal = org.credits;
      }
    }

    // Get user credits from users table
    const { data: userCredits } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userData.id)
      .single();

    // Calculate total credits (personal + any allocation)
    const creditsRemaining = userCredits?.credits || 0;
    if (!creditsTotal) {
      creditsTotal = creditsRemaining; // If no org, total = remaining
    }

    return NextResponse.json({
      email: userData.email,
      plan,
      creditsRemaining,
      creditsTotal,
    }, { headers });

  } catch (error) {
    console.error('Account external API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
