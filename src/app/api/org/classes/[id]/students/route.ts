import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageClass } from "@/lib/org";
import { sendClassInviteEmail } from "@/lib/email";

type RouteParams = { params: Promise<{ id: string }> };

interface AddStudentRequest {
  email: string;
  credit_amount?: number;
}

// GET /api/org/classes/[id]/students - List students in a class
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!await canManageClass(id)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Use admin client to bypass RLS - authorization is already checked via canManageClass
    const { data: students, error } = await adminClient
      .from("organization_members")
      .select(`
        id,
        user_id,
        display_name,
        credit_allocated,
        credit_used,
        status,
        created_at,
        updated_at
      `)
      .eq("class_id", id)
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching students:", error);
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    console.log(`[Students API] Class ${id}: Found ${students?.length || 0} students`);

    // Fetch profiles separately
    const userIds = students?.map((s) => s.user_id) || [];
    let profilesMap: Record<string, { email?: string; display_name?: string; avatar_url?: string }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, email, display_name, avatar_url")
        .in("id", userIds);

      if (profiles) {
        profilesMap = profiles.reduce((acc, p) => {
          acc[p.id] = { email: p.email, display_name: p.display_name, avatar_url: p.avatar_url };
          return acc;
        }, {} as Record<string, { email?: string; display_name?: string; avatar_url?: string }>);
      }
    }

    // Get recent activity for each student
    const studentIds = students?.map((s) => s.id) || [];
    let lastActivity: Record<string, string> = {};

    if (studentIds.length > 0) {
      const { data: activities } = await adminClient
        .from("organization_transactions")
        .select("member_id, created_at")
        .in("member_id", studentIds)
        .eq("type", "usage")
        .order("created_at", { ascending: false });

      if (activities) {
        // Get last activity for each student
        lastActivity = activities.reduce((acc, row) => {
          if (row.member_id && !acc[row.member_id]) {
            acc[row.member_id] = row.created_at;
          }
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Get analytics data for students (last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodStart = startDate.toISOString().split("T")[0];

    let analyticsMap: Record<string, {
      ai_literacy_score: number;
      domain_engagement_score: number;
      quadrant: string;
      total_messages: number;
    }> = {};

    if (userIds.length > 0) {
      const { data: analytics } = await adminClient
        .from("student_analytics")
        .select("user_id, ai_literacy_score, domain_engagement_score, quadrant, total_messages")
        .eq("class_id", id)
        .eq("period_start", periodStart)
        .in("user_id", userIds);

      if (analytics) {
        analyticsMap = analytics.reduce((acc, row) => {
          acc[row.user_id] = {
            ai_literacy_score: row.ai_literacy_score,
            domain_engagement_score: row.domain_engagement_score,
            quadrant: row.quadrant,
            total_messages: row.total_messages,
          };
          return acc;
        }, {} as Record<string, {
          ai_literacy_score: number;
          domain_engagement_score: number;
          quadrant: string;
          total_messages: number;
        }>);
      }
    }

    // Format response
    const formattedStudents = students?.map((s) => {
      const profile = profilesMap[s.user_id];
      const analytics = analyticsMap[s.user_id];
      return {
        id: s.id,
        user_id: s.user_id,
        display_name: s.display_name || profile?.display_name || null,
        email: profile?.email || null,
        avatar_url: profile?.avatar_url || null,
        credit_allocated: s.credit_allocated,
        credit_used: s.credit_used,
        credit_remaining: Number(s.credit_allocated) - Number(s.credit_used),
        status: s.status,
        joined_at: s.created_at,
        last_activity: lastActivity[s.id] || null,
        // Analytics data
        ai_literacy_score: analytics?.ai_literacy_score ?? null,
        domain_engagement_score: analytics?.domain_engagement_score ?? null,
        quadrant: analytics?.quadrant ?? null,
        total_messages: analytics?.total_messages ?? 0,
      };
    });

    return NextResponse.json(formattedStudents);
  } catch (error) {
    console.error("Students fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/org/classes/[id]/students - Add existing member to class by email
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: classId } = await params;

    if (!await canManageClass(classId)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: AddStudentRequest = await request.json();
    const { email, credit_amount } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required", code: "EMAIL_REQUIRED" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const supabase = await createClient();

    // Get current user (trainer) info
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    let trainerName = "Votre formateur";
    if (currentUser) {
      const { data: trainerProfile } = await adminClient
        .from("profiles")
        .select("display_name, email")
        .eq("id", currentUser.id)
        .single();
      trainerName = trainerProfile?.display_name || trainerProfile?.email || trainerName;
    }

    // Get the class to find the organization (with names for email)
    const { data: classData, error: classError } = await adminClient
      .from("organization_classes")
      .select("id, name, organization_id, settings, organizations(name)")
      .eq("id", classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: "Class not found", code: "CLASS_NOT_FOUND" },
        { status: 404 }
      );
    }

    const className = classData.name;
    const orgData = classData.organizations as unknown as { name: string } | null;
    const organizationName = orgData?.name || "Organisation";

    // Find the user by email
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, email, display_name")
      .eq("email", email.toLowerCase())
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User not found with this email", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check if user is already a member of the organization
    const { data: existingMember, error: memberError } = await adminClient
      .from("organization_members")
      .select("id, class_id, status, role")
      .eq("organization_id", classData.organization_id)
      .eq("user_id", profile.id)
      .single();

    // Determine credit amount
    let creditToAllocate = credit_amount ?? 0;
    if (creditToAllocate === 0) {
      // Use class default or org default
      const classSettings = classData.settings as { default_credit_per_student?: number } | null;
      if (classSettings?.default_credit_per_student) {
        creditToAllocate = classSettings.default_credit_per_student;
      } else {
        // Get org default
        const { data: org } = await adminClient
          .from("organizations")
          .select("settings")
          .eq("id", classData.organization_id)
          .single();
        const orgSettings = org?.settings as { default_credit_per_student?: number } | null;
        creditToAllocate = orgSettings?.default_credit_per_student ?? 5;
      }
    }

    if (existingMember) {
      // User is already in the organization
      if (existingMember.class_id === classId) {
        return NextResponse.json(
          { error: "Student is already in this class", code: "ALREADY_IN_CLASS" },
          { status: 400 }
        );
      }

      if (existingMember.role !== "student") {
        return NextResponse.json(
          { error: "Cannot add non-student members to a class", code: "NOT_A_STUDENT" },
          { status: 400 }
        );
      }

      // Update existing member to move them to this class
      const { error: updateError } = await adminClient
        .from("organization_members")
        .update({
          class_id: classId,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMember.id);

      if (updateError) {
        console.error("Error updating member:", updateError);
        return NextResponse.json(
          { error: "Failed to add student to class" },
          { status: 500 }
        );
      }

      // Send notification email (don't block on failure)
      sendClassInviteEmail(
        profile.email,
        profile.display_name || "",
        className,
        organizationName,
        trainerName,
        0 // No additional credits for existing members
      ).then((result) => {
        if (!result.success) {
          console.error("Failed to send class invite email:", result.error);
        }
      });

      return NextResponse.json({
        success: true,
        member_id: existingMember.id,
        message: "Student moved to this class",
        credit_allocated: 0, // No additional credit for existing members
      });
    }

    // User is not in the organization - create new membership
    // Check if org has enough balance
    const { data: org } = await adminClient
      .from("organizations")
      .select("credit_balance, credit_allocated")
      .eq("id", classData.organization_id)
      .single();

    const availableCredit = (org?.credit_balance ?? 0) - (org?.credit_allocated ?? 0);
    if (creditToAllocate > availableCredit) {
      creditToAllocate = Math.max(0, availableCredit); // Allocate what's available, or 0
    }

    const { data: newMember, error: insertError } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: classData.organization_id,
        user_id: profile.id,
        class_id: classId,
        role: "student",
        display_name: profile.display_name,
        credit_allocated: creditToAllocate,
        status: "active",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating member:", insertError);
      return NextResponse.json(
        { error: "Failed to add student to class" },
        { status: 500 }
      );
    }

    // Update org credit_allocated if credits were allocated
    if (creditToAllocate > 0) {
      await adminClient
        .from("organizations")
        .update({
          credit_allocated: (org?.credit_allocated ?? 0) + creditToAllocate,
        })
        .eq("id", classData.organization_id);

      // Log transaction
      await adminClient.from("organization_transactions").insert({
        organization_id: classData.organization_id,
        member_id: newMember.id,
        type: "allocation",
        amount: creditToAllocate,
        description: "Credit allocation from class invitation",
      });
    }

    // Send notification email (don't block on failure)
    sendClassInviteEmail(
      profile.email,
      profile.display_name || "",
      className,
      organizationName,
      trainerName,
      creditToAllocate
    ).then((result) => {
      if (!result.success) {
        console.error("Failed to send class invite email:", result.error);
      }
    });

    return NextResponse.json({
      success: true,
      member_id: newMember.id,
      message: "Student added to class",
      credit_allocated: creditToAllocate,
    });
  } catch (error) {
    console.error("Add student error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
