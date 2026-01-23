import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const supabase = await createClient();

    // Look up the API key to find the user
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id, name')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401, headers }
      );
    }

    // Get user information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, credits')
      .eq('id', keyData.user_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers }
      );
    }

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

    // Calculate total credits (personal + any allocation)
    const creditsRemaining = userData.credits || 0;
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
