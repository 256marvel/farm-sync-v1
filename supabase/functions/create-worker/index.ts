import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type WorkerPayload = {
  farmId: string;
  fullName: string;
  role: "caretaker" | "manager" | "assistant_manager" | "accountant" | "worker";
  gender: "male" | "female" | "other";
  age: number;
  contactPhone?: string | null;
  nin?: string | null;
  nextOfKinName: string;
  nextOfKinRelationship: "parent" | "sibling" | "spouse" | "child" | "relative" | "friend";
  nextOfKinPhone: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json({ error: "Backend configuration is missing." }, 500);
    }

    if (!authHeader) {
      return json({ error: "Missing authorization header." }, 401);
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return json({ error: "You must be signed in to create workers." }, 401);
    }

    const body = (await req.json()) as WorkerPayload;
    const {
      farmId,
      fullName,
      role,
      gender,
      age,
      contactPhone,
      nin,
      nextOfKinName,
      nextOfKinRelationship,
      nextOfKinPhone,
    } = body;

    if (!farmId || !fullName || !role || !gender || !age || !nextOfKinName || !nextOfKinRelationship || !nextOfKinPhone) {
      return json({ error: "Missing required worker details." }, 400);
    }

    const rolesRequiringNin = ["caretaker", "manager", "assistant_manager", "accountant"];
    if (rolesRequiringNin.includes(role) && !nin) {
      return json({ error: "NIN is required for this role." }, 400);
    }

    const { data: farm, error: farmError } = await client
      .from("farms")
      .select("id, name, owner_id")
      .eq("id", farmId)
      .maybeSingle();

    if (farmError) {
      return json({ error: farmError.message }, 400);
    }

    if (!farm || farm.owner_id !== user.id) {
      return json({ error: "You can only add workers to your own farm." }, 403);
    }

    const firstName = fullName.toLowerCase().trim().split(/\s+/)[0]?.replace(/[^a-z]/g, "") || "worker";
    const farmAbbr = farm.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 3) || "frm";
    const prefix = `${firstName}_${farmAbbr}`;

    const { data: existingWorkers, error: existingWorkersError } = await admin
      .from("workers")
      .select("auto_generated_username")
      .eq("farm_id", farmId)
      .like("auto_generated_username", `${prefix}%`);

    if (existingWorkersError) {
      return json({ error: existingWorkersError.message }, 400);
    }

    const existingNumbers = (existingWorkers ?? [])
      .map((worker) => {
        const username = worker.auto_generated_username ?? "";
        const match = username.match(/(\d+)$/);
        return match ? Number.parseInt(match[1], 10) : 0;
      })
      .filter((value) => value > 0);

    let idNumber = 1;
    while (existingNumbers.includes(idNumber)) idNumber += 1;

    const username = `${prefix}${String(idNumber).padStart(3, "0")}`;
    const password = `${firstName}${Math.floor(100000 + Math.random() * 900000)}`;
    const workerEmail = `${username}@farmsync.local`;

    const { data: listedUsers, error: listUsersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listUsersError) {
      return json({ error: listUsersError.message }, 500);
    }

    const existingAuthUser = listedUsers.users.find((listedUser) => listedUser.email?.toLowerCase() === workerEmail.toLowerCase());

    let workerUserId = existingAuthUser?.id;
    let createdNewUser = false;

    if (existingAuthUser) {
      const { error: updateUserError } = await admin.auth.admin.updateUserById(existingAuthUser.id, {
        password,
        user_metadata: {
          ...(existingAuthUser.user_metadata ?? {}),
          full_name: fullName,
          username,
          is_worker: true,
          role,
        },
        email_confirm: true,
      });

      if (updateUserError) {
        return json({ error: updateUserError.message }, 500);
      }
    } else {
      const { data: createdUserData, error: createUserError } = await admin.auth.admin.createUser({
        email: workerEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          username,
          is_worker: true,
          role,
        },
      });

      if (createUserError || !createdUserData.user) {
        return json({ error: createUserError?.message ?? "Failed to create worker account." }, 500);
      }

      workerUserId = createdUserData.user.id;
      createdNewUser = true;
    }

    if (!workerUserId) {
      return json({ error: "Failed to resolve worker account." }, 500);
    }

    const { data: existingWorkerRecord, error: existingWorkerRecordError } = await admin
      .from("workers")
      .select("id")
      .eq("user_id", workerUserId)
      .maybeSingle();

    if (existingWorkerRecordError) {
      return json({ error: existingWorkerRecordError.message }, 400);
    }

    if (existingWorkerRecord) {
      const { error: updateWorkerError } = await admin
        .from("workers")
        .update({
          farm_id: farmId,
          manager_id: user.id,
          full_name: fullName,
          role,
          gender,
          age,
          contact_phone: contactPhone || null,
          nin: nin || null,
          next_of_kin_name: nextOfKinName,
          next_of_kin_relationship: nextOfKinRelationship,
          next_of_kin_phone: nextOfKinPhone,
          auto_generated_username: username,
          auto_generated_password: password,
          is_active: true,
        })
        .eq("id", existingWorkerRecord.id);

      if (updateWorkerError) {
        return json({ error: updateWorkerError.message }, 400);
      }
    } else {
      const { error: insertWorkerError } = await admin.from("workers").insert({
        farm_id: farmId,
        manager_id: user.id,
        user_id: workerUserId,
        full_name: fullName,
        role,
        gender,
        age,
        contact_phone: contactPhone || null,
        nin: nin || null,
        next_of_kin_name: nextOfKinName,
        next_of_kin_relationship: nextOfKinRelationship,
        next_of_kin_phone: nextOfKinPhone,
        auto_generated_username: username,
        auto_generated_password: password,
        is_active: true,
      });

      if (insertWorkerError) {
        if (createdNewUser) {
          await admin.auth.admin.deleteUser(workerUserId);
        }
        return json({ error: insertWorkerError.message }, 400);
      }
    }

    return json({ username, password });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
