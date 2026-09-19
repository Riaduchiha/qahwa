"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type EmployeeInput = {
  name: string;
  position: string;
  phone: string;
  salary: number; // Ajout du salaire
  active: boolean;
};

export async function createEmployee(data: EmployeeInput) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("employees").insert(data);
  if (error) return { success: false, error: error.message };
  revalidatePath("/qahwa/employes");
  return { success: true };
}

export async function updateEmployee(id: string, data: EmployeeInput) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update(data)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/qahwa/employes");
  return { success: true };
}

export async function deleteEmployee(id: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/qahwa/employes");
}

export async function addSchedule(
  employeeId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("employee_schedules").insert({
    employee_id: employeeId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/qahwa/employes");
  return { success: true };
}

export async function deleteSchedule(id: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("employee_schedules")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/qahwa/employes");
}export async function addAdvance(
  employeeId: string,
  amount: number,
  note: string,
  advanceDate: string
) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("employee_advances").insert({
    employee_id: employeeId,
    amount,
    note,
    advance_date: advanceDate,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/qahwa/employes");
  return { success: true };
}

export async function deleteAdvance(id: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("employee_advances")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/qahwa/employes");
}