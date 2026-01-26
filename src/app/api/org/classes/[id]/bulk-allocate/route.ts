import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageClass } from "@/lib/org";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/org/classes/[id]/bulk-allocate - Allocate credits to all students in a class
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: classId } = await params;

    // Check authorization
    if (!(await canManageClass(classId))) {
      return NextResponse.json(
        { error: "Unauthorized - cannot manage this class" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();
    const body = await request.json();

    const { amount_per_student, update_default } = body;

    // Validate amount
    if (
      amount_per_student === undefined ||
      isNaN(parseFloat(amount_per_student))
    ) {
      return NextResponse.json(
        { error: "Amount per student is required and must be a number" },
        { status: 400 }
      );
    }

    const creditAmount = parseFloat(amount_per_student);

    if (creditAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be positive" },
        { status: 400 }
      );
    }

    // Get class info with organization
    const { data: classData, error: classError } = await supabase
      .from("organization_classes")
      .select("id, organization_id, settings")
      .eq("id", classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const organizationId = classData.organization_id;

    // Get all active students in the class
    const { data: students, error: studentsError } = await adminClient
      .from("organization_members")
      .select("id, user_id, credit_allocated")
      .eq("class_id", classId)
      .eq("role", "student")
      .eq("status", "active");

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: "No students in this class" },
        { status: 400 }
      );
    }

    const totalAmountNeeded = creditAmount * students.length;

    // Check organization has enough credits
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("credit_balance, credit_allocated")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const availableCredits =
      (org.credit_balance || 0) - (org.credit_allocated || 0);

    if (totalAmountNeeded > availableCredits) {
      return NextResponse.json(
        {
          error: "Insufficient credits in organization pool",
          available: availableCredits,
          requested: totalAmountNeeded,
        },
        { status: 400 }
      );
    }

    // Update each student's allocation
    const results = {
      success: 0,
      failed: 0,
      totalAllocated: 0,
    };

    for (const student of students) {
      const newAllocation = (student.credit_allocated || 0) + creditAmount;

      const { error: updateError } = await adminClient
        .from("organization_members")
        .update({
          credit_allocated: newAllocation,
          updated_at: new Date().toISOString(),
        })
        .eq("id", student.id);

      if (updateError) {
        console.error(`Error updating student ${student.id}:`, updateError);
        results.failed++;
      } else {
        results.success++;
        results.totalAllocated += creditAmount;

        // Log the transaction
        await adminClient.from("organization_transactions").insert({
          organization_id: organizationId,
          member_id: student.id,
          user_id: student.user_id,
          type: "credit_allocated",
          amount: creditAmount,
          description: `Bulk allocation to class`,
        });
      }
    }

    // Update organization's allocated total
    const newOrgAllocated = (org.credit_allocated || 0) + results.totalAllocated;

    await supabase
      .from("organizations")
      .update({
        credit_allocated: newOrgAllocated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId);

    // Update class default credit if requested
    if (update_default) {
      const currentSettings = (classData.settings as Record<string, unknown>) || {};
      const updatedSettings = {
        ...currentSettings,
        default_credit_per_student: creditAmount,
      };

      await supabase
        .from("organization_classes")
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", classId);
    }

    return NextResponse.json({
      success: true,
      students_updated: results.success,
      students_failed: results.failed,
      total_allocated: results.totalAllocated,
      amount_per_student: creditAmount,
    });
  } catch (error) {
    console.error("Bulk allocation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
